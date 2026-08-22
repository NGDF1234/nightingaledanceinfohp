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
const regularGrid = document.querySelector("#regular-grid");
const scheduleList = document.querySelector("#schedule-list");
const scheduleToggle = document.querySelector("#schedule-toggle");
const scheduleSearchForm = document.querySelector("#schedule-search-form");
const scheduleTitleSearch = document.querySelector("#schedule-title-search");
const scheduleDateFrom = document.querySelector("#schedule-date-from");
const scheduleDateTo = document.querySelector("#schedule-date-to");
const videoModal = document.querySelector("#video-modal");
const videoModalFrame = document.querySelector("#video-modal-frame");
let scheduleItems = [];
let showAllSchedules = document.body.dataset.scheduleMode === "all";
let scheduleFilters = {
  keyword: "",
  dateFrom: "",
  dateTo: ""
};

const regularPrograms = [
  {
    tag: "TV",
    title: "Vタイムズ",
    time: "毎週土曜 9:25〜10:15",
    url: "https://www.nib.jp/tv/vtimes/",
    linkText: "NIB「Vタイムズ」公式"
  },
  {
    tag: "RADIO",
    title: "文化シヤッターpresents ナイチンゲールダンスのもうきてるラジオ",
    time: "毎週金曜 24:00〜24:30",
    url: "https://hicbc.com/radio/nightin/",
    linkText: "CBCラジオ公式"
  },
  {
    tag: "RADIO",
    title: "ヤスマロティン",
    time: "毎週金曜 18:00頃 配信",
    url: "https://artistspoken.com/lp/",
    linkText: "Artistspoken公式"
  },
  {
    tag: "TV",
    title: "東西南北よしもと麻雀リーグ season7",
    note: "※毎週出演ではありません",
    time: "毎週土曜 22:00〜23:00",
    url: "https://bsy.co.jp/programs/by0000018915",
    linkText: "BSよしもと公式"
  },
  {
    tag: "WEB",
    title: "ヤスのコラム",
    time: "毎月第1金曜日頃 更新予定",
    url: "https://www.walkerplus.com/article_list/tags/%E3%83%8A%E3%82%A4%E3%83%81%E3%83%B3%E3%82%B2%E3%83%BC%E3%83%AB%E3%83%80%E3%83%B3%E3%82%B9/",
    linkText: "ウォーカープラス「ヤスのコラム」"
  }
];

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

function youtubeVideoId(url = "") {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return parsedUrl.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com" || host === "m.youtube.com") {
      const parts = parsedUrl.pathname.split("/").filter(Boolean);
      if (parts[0] === "watch") return parsedUrl.searchParams.get("v") || "";
      if (parts[0] === "shorts" || parts[0] === "embed") return parts[1] || "";
    }
  } catch (error) {
    return "";
  }
  return "";
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

function scheduleSearchText(item) {
  const categoryWords = {
    TV: "テレビ tv",
    RADIO: "ラジオ radio",
    LIVE: "ライブ live",
    YouTube: "youtube ユーチューブ 動画",
    WEB: "web ウェブ",
    EVENT: "イベント event"
  };
  const tag = item.tag || "";
  return [
    item.title,
    item.place,
    item.note,
    tag,
    categoryWords[tag] || ""
  ].filter(Boolean).join(" ").toLowerCase();
}

function todayKey() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

function addDaysKey(dateKey, days) {
  const date = new Date(`${dateKey}T00:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function addMonthsKey(dateKey, months) {
  const date = new Date(`${dateKey}T00:00:00+09:00`);
  date.setMonth(date.getMonth() + months);
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(date);
}

function quarterFor(dateKey) {
  const [year, month] = dateKey.split("-").map(Number);
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const nextStart = addMonthsKey(start, 3);
  const end = addDaysKey(nextStart, -1);
  return { start, end, nextStart };
}

function regularDisplayQuarter(dateKey = todayKey()) {
  const current = quarterFor(dateKey);
  return dateKey >= addDaysKey(current.nextStart, -7) ? quarterFor(current.nextStart) : current;
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

    const videoId = item.tag === "YouTube" ? youtubeVideoId(item.url) : "";
    if (videoId) {
      return `
        <button class="news-card news-card-link video-news-card" type="button" data-video-id="${escapeHtml(videoId)}" data-video-title="${escapeHtml(item.title)}">
          ${body}
        </button>
      `;
    }

    return `
      <a class="news-card news-card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
        ${body}
      </a>
    `;
  }).join("");
}

function renderRegular(items = regularPrograms) {
  if (!regularGrid) return;

  regularGrid.innerHTML = items.map((item) => `
    <article class="news-card regular-card">
      <span class="news-tag">${escapeHtml(item.tag || "INFO")}</span>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.note ? `<p class="regular-note">${escapeHtml(item.note)}</p>` : ""}
      <p class="regular-label">日時</p>
      <p class="regular-time">${escapeHtml(item.time)}</p>
      <a class="regular-link" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">${escapeHtml(item.linkText)} →</a>
    </article>
  `).join("");
}

function renderSchedule(items = []) {
  if (!scheduleList) return;

  const today = todayKey();
  const weekEnd = addDaysKey(today, 6);
  const titleQuery = scheduleFilters.keyword;
  const dateFrom = scheduleFilters.dateFrom;
  const dateTo = scheduleFilters.dateTo;
  const upcomingItems = items
    .filter((item) => !item.date || normalizeDate(item.date) >= today)
    .sort((a, b) => `${normalizeDate(a.date)} ${a.startTime || ""}`.localeCompare(`${normalizeDate(b.date)} ${b.startTime || ""}`));
  const visibleItems = upcomingItems
    .filter((item) => showAllSchedules || !item.date || normalizeDate(item.date) <= weekEnd)
    .filter((item) => !titleQuery || scheduleSearchText(item).includes(titleQuery))
    .filter((item) => !dateFrom || !item.date || normalizeDate(item.date) >= dateFrom)
    .filter((item) => !dateTo || !item.date || normalizeDate(item.date) <= dateTo);

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
    const rowClass = normalizeDate(item.date) === today ? "schedule-row today" : "schedule-row";
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
      return `<article class="${rowClass}">${body}</article>`;
    }

    return `
      <a class="${rowClass}" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
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

function updateScheduleFilters() {
  showAllSchedules = true;
  scheduleFilters = {
    keyword: (scheduleTitleSearch?.value || "").trim().toLowerCase(),
    dateFrom: scheduleDateFrom?.value || "",
    dateTo: scheduleDateTo?.value || ""
  };
  renderSchedule(scheduleItems);
}

if (scheduleSearchForm) {
  scheduleSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateScheduleFilters();
  });
}

[scheduleTitleSearch, scheduleDateFrom, scheduleDateTo].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", updateScheduleFilters);
  control.addEventListener("change", updateScheduleFilters);
});

function closeVideoModal() {
  if (!videoModal || !videoModalFrame) return;
  videoModal.hidden = true;
  videoModalFrame.innerHTML = "";
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-video-id]");
  if (!button || !videoModal || !videoModalFrame) return;
  const videoId = button.dataset.videoId;
  const title = button.dataset.videoTitle || "YouTube動画";
  videoModalFrame.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${escapeHtml(videoId)}?autoplay=1"
      title="${escapeHtml(title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen></iframe>
  `;
  videoModal.hidden = false;
});

document.querySelectorAll("[data-video-close]").forEach((button) => {
  button.addEventListener("click", closeVideoModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeVideoModal();
});

loadInfo();
renderRegular();
