from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path
from typing import Any


INFO_PATH = Path("data/nightingale-info.json")
HISTORY_PATH = Path("data/schedule-history.json")


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def clean(value: Any) -> str:
    return " ".join(str(value or "").strip().replace("/", "-").lower().split())


def schedule_key(item: dict[str, Any]) -> str:
    return "|".join(
        clean(value)
        for value in (
            item.get("date"),
            item.get("startTime"),
            item.get("title"),
            item.get("place") or item.get("media"),
        )
    )


def merge_links(previous: Any, current: Any) -> list[dict[str, Any]]:
    links: dict[str, dict[str, Any]] = {}
    for link in [*(previous or []), *(current or [])]:
        if isinstance(link, dict) and link.get("url"):
            links[str(link["url"])] = link
    return list(links.values())


def merge_schedules(groups: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    rows: dict[str, dict[str, Any]] = {}
    for group in groups:
        for item in group:
            if not isinstance(item, dict) or not item.get("date") or not item.get("title"):
                continue
            key = schedule_key(item)
            previous = rows.get(key)
            if not previous:
                rows[key] = item
                continue
            merged = {**previous, **item}
            links = merge_links(previous.get("links"), item.get("links"))
            if links:
                merged["links"] = links
            rows[key] = merged
    return sorted(
        rows.values(),
        key=lambda item: (
            clean(item.get("date")),
            clean(item.get("startTime")),
            clean(item.get("title")),
        ),
    )


def schedules_from_git() -> list[list[dict[str, Any]]]:
    log = subprocess.run(
        ["git", "log", "--format=%H", "--", str(INFO_PATH).replace("\\", "/")],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    ).stdout
    groups: list[list[dict[str, Any]]] = []
    for commit in reversed(log.split()):
        result = subprocess.run(
            ["git", "show", f"{commit}:{str(INFO_PATH).replace(chr(92), '/')}"],
            capture_output=True,
            text=True,
            encoding="utf-8",
        )
        if result.returncode:
            continue
        try:
            payload = json.loads(result.stdout)
        except json.JSONDecodeError:
            continue
        schedule = payload.get("schedule") if isinstance(payload, dict) else None
        if isinstance(schedule, list):
            groups.append(schedule)
    return groups


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--from-git", action="store_true")
    args = parser.parse_args()

    current = load_json(INFO_PATH)
    history = load_json(HISTORY_PATH)
    groups = schedules_from_git() if args.from_git else []
    groups.extend(
        [
            history.get("schedule", []) if isinstance(history.get("schedule"), list) else [],
            current.get("schedule", []) if isinstance(current.get("schedule"), list) else [],
        ]
    )
    schedule = merge_schedules(groups)
    HISTORY_PATH.write_text(
        json.dumps({"schedule": schedule}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"schedule history: {len(schedule)} items")


if __name__ == "__main__":
    main()
