const DATA_PATH = "./data/nightingale-info.json";

const fallbackNewsItems = [
  {
    date: "2026-07-05",
    tag: "LIVE",
    title: "単独ライブ情報",
    text: "FANY掲載情報を公式ページで確認。",
    url: ""
  },
  {
    date: "2026-06-17",
    tag: "LIVE",
    title: "ピンネタライブ出演情報",
    text: "劇場・配信の詳細を更新しました。",
    url: ""
  },
  {
    date: "2026-05-25",
    tag: "YouTube",
    title: "YouTube更新",
    text: "公式チャンネルや関連動画を検索。",
    url: ""
  }
];

const newsGrid = document.querySelector("#news-grid");
const scheduleList = document.querySelector("#schedule-list");
const scheduleToggle = document.querySelector("#schedule-toggle");
const scheduleTitleSearch = document.querySelector("#schedule-title-search");
const scheduleDateSearch = document.querySelector("#schedule-date-search");
const schedulePeriodSearch = document.querySelector("#schedule-period-search");
let scheduleItems = [];
let showAllSchedules = document.body.dataset.scheduleMode === "all";

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeDate(date = "") {
  return String(date).replaceAll(".", "-").replaceAll("/", "-");
}

function formatNewsDate(date = "") {
  return normalizeDate(date).replaceAll("-", ".");
}

function formatScheduleDate(item) {
  const date = normalizeDate(item.date);
  const [, month = "", day = ""] = date.split("-");
  const label = month && day ? `${month}/${day}` : date;
  return `${label}<small>${escapeHtml(item.day || "")}</small>`;
}

function formatTime(item) {
  const start = item.startTime || "";
  const end = item.endTime || "";
  return end ? `${start}-${end}` : start;
}

function todayKey() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function addDaysKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function renderNews(items = fallbackNewsItems) {
  if (!newsGrid) return;

  const visibleItems = items.slice(0, 12);

  newsGrid.innerHTML = visibleItems.map((item) => {
    const text = item.text || item.note || "";
    const body = `
      <span class="news-tag">${escapeHtml(item.tag || "INFO")}</span>
      <p>${escapeHtml(formatNewsDate(item.date))}</p>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(text)}</p>
    `;

    if (!item.url) {
      return `<article class="news-card">${body}</article>`;
    }

    return `
      <a class="news-card news-card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
        ${body}
      </a>
    `;
  }).join("");
}

function renderSchedule(items = []) {
  if (!scheduleList) return;

  const today = todayKey();
  const weekEnd = addDaysKey(today, 6);
  const titleQuery = (scheduleTitleSearch?.value || "").trim().toLowerCase();
  const dateQuery = scheduleDateSearch?.value || "";
  const periodValue = schedulePeriodSearch?.value || "";
  const periodEnd = periodValue && periodValue !== "all" ? addDaysKey(today, Number(periodValue) - 1) : "";
  const upcomingItems = items
    .filter((item) => !item.date || normalizeDate(item.date) >= today)
    .sort((a, b) => `${normalizeDate(a.date)} ${a.startTime || ""}`.localeCompare(`${normalizeDate(b.date)} ${b.startTime || ""}`));
  const visibleItems = upcomingItems
    .filter((item) => showAllSchedules || !item.date || normalizeDate(item.date) <= weekEnd)
    .filter((item) => !titleQuery || `${item.title || ""} ${item.place || ""} ${item.note || ""}`.toLowerCase().includes(titleQuery))
    .filter((item) => !dateQuery || normalizeDate(item.date) === dateQuery)
    .filter((item) => !periodEnd || !item.date || normalizeDate(item.date) <= periodEnd);

  if (scheduleToggle) {
    scheduleToggle.hidden = showAllSchedules || visibleItems.length === upcomingItems.length;
  }

  if (!visibleItems.length) {
    scheduleList.innerHTML = `
      <article class="schedule-row">
        <div class="schedule-date">--<small></small></div>
        <div class="schedule-main">
          <h3>スケジュール準備中</h3>
          <p>データ更新後に表示されます。</p>
        </div>
        <span class="schedule-arrow" aria-hidden="true">→</span>
      </article>
    `;
    return;
  }

  scheduleList.innerHTML = visibleItems.map((item) => {
    const detail = [formatTime(item), item.place, item.note].filter(Boolean).join(" / ");
    const body = `
      <div class="schedule-date">${formatScheduleDate(item)}</div>
      <div class="schedule-main">
        <span class="news-tag">${escapeHtml(item.tag || "INFO")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(detail)}</p>
      </div>
      <span class="schedule-arrow" aria-hidden="true">→</span>
    `;

    if (!item.url) {
      return `<article class="schedule-row">${body}</article>`;
    }

    return `
      <a class="schedule-row" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
        ${body}
      </a>
    `;
  }).join("");
}

async function loadInfo() {
  try {
    const response = await fetch(DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${DATA_PATH}`);
    const data = await response.json();
    renderNews(Array.isArray(data.news) ? data.news : fallbackNewsItems);
    scheduleItems = Array.isArray(data.schedule) ? data.schedule : [];
    renderSchedule(scheduleItems);
  } catch (error) {
    console.warn(error);
    renderNews(fallbackNewsItems);
    scheduleItems = [];
    renderSchedule([]);
  }
}

if (scheduleToggle) {
  scheduleToggle.addEventListener("click", () => {
    showAllSchedules = true;
    renderSchedule(scheduleItems);
  });
}

[scheduleTitleSearch, scheduleDateSearch, schedulePeriodSearch].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", () => renderSchedule(scheduleItems));
  control.addEventListener("change", () => renderSchedule(scheduleItems));
});

loadInfo();
