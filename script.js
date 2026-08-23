const DATA_PATH = "./data/nightingale-info.json";
const CLIPS_DATA_PATH = "./data/nightingale-youtube-clips.json";

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
const clipsGrid = document.querySelector("#clips-grid");
const clipsList = document.querySelector("#clips-list");
const clipsSearchForm = document.querySelector("#clips-search-form");
const clipsKeywordSearch = document.querySelector("#clips-keyword-search");
const clipsSortSearch = document.querySelector("#clips-sort-search");
const clipsDateFrom = document.querySelector("#clips-date-from");
const clipsDateTo = document.querySelector("#clips-date-to");
const clipsResultCount = document.querySelector("#clips-result-count");
const clipChannelCheckboxes = Array.from(document.querySelectorAll("input[name='clip-channel']"));
const scheduleList = document.querySelector("#schedule-list");
const scheduleToggle = document.querySelector("#schedule-toggle");
const scheduleSearchForm = document.querySelector("#schedule-search-form");
const scheduleTitleSearch = document.querySelector("#schedule-title-search");
const scheduleCategorySearch = document.querySelector("#schedule-category-search");
const scheduleDateFrom = document.querySelector("#schedule-date-from");
const scheduleDateTo = document.querySelector("#schedule-date-to");
const videoModal = document.querySelector("#video-modal");
const videoModalFrame = document.querySelector("#video-modal-frame");
const pageLoader = document.querySelector("#page-loader");
let scheduleItems = [];
let showAllSchedules = document.body.dataset.scheduleMode === "all";
let scheduleFilters = {
  keyword: "",
  category: "",
  dateFrom: "",
  dateTo: ""
};
let clipItems = [];
let showAllClips = document.body.dataset.clipsMode === "all";
let clipFilters = {
  keyword: "",
  channelTypes: [],
  dateFrom: "",
  dateTo: "",
  sort: "updated-desc"
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

const fallbackClipItems = [
  {
    kind: "video",
    channelType: "combo_official",
    channelName: "ナイチンゲールダンスチャンネル",
    title: "【漫才】同窓会【ナイチンゲールダンス】",
    url: "https://www.youtube.com/watch?v=Z0mjkhTVWIc",
    viewCount: 0,
    uploadDate: "2022-12-30"
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

function formatClipDate(date = "") {
  return date ? formatNewsDate(date) : "";
}

function clipSearchText(item) {
  return [
    item.title,
    item.channelName,
    item.channelType,
    item.kind
  ].filter(Boolean).join(" ").toLowerCase();
}

function clipChannelLabel(type = "") {
  const labels = {
    combo_official: "ナイチンゲールダンスチャンネル",
    nakano_personal: "個人（中野）",
    yasu_personal: "個人（ヤス）"
  };
  return labels[type] || type || "YouTube";
}

function hasUploadDate(item) {
  return Boolean(normalizeDate(item.uploadDate));
}

function clipSortDate(item) {
  return normalizeDate(item.uploadDate) || "";
}

function shuffleItems(items = []) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function topClipsByViews(items = [], kind = "video", limit = 10) {
  return items
    .filter((item) => item.kind === kind)
    .sort((a, b) => (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0))
    .slice(0, limit);
}

function homeRecommendedClips(items = []) {
  const datedItems = items.filter(hasUploadDate);
  const videos = shuffleItems(topClipsByViews(datedItems, "video", 10)).slice(0, 3);
  const shorts = shuffleItems(topClipsByViews(datedItems, "shorts", 10)).slice(0, 3);
  return shuffleItems([...videos, ...shorts]);
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
  const category = scheduleFilters.category;
  const dateFrom = scheduleFilters.dateFrom;
  const dateTo = scheduleFilters.dateTo;
  const upcomingItems = items
    .filter((item) => !item.date || normalizeDate(item.date) >= today)
    .sort((a, b) => `${normalizeDate(a.date)} ${a.startTime || ""}`.localeCompare(`${normalizeDate(b.date)} ${b.startTime || ""}`));
  const visibleItems = upcomingItems
    .filter((item) => showAllSchedules || !item.date || normalizeDate(item.date) <= weekEnd)
    .filter((item) => !titleQuery || scheduleSearchText(item).includes(titleQuery))
    .filter((item) => !category || String(item.tag || "").toLowerCase() === category)
    .filter((item) => !dateFrom || !item.date || normalizeDate(item.date) >= dateFrom)
    .filter((item) => !dateTo || !item.date || normalizeDate(item.date) <= dateTo);

  if (scheduleToggle) {
    scheduleToggle.hidden = showAllSchedules || visibleItems.length === upcomingItems.length;
  }

  if (!visibleItems.length) {
    if (showAllSchedules) {
      scheduleList.innerHTML = `<p class="empty-count">0件</p>`;
      return;
    }

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

function renderClips(items = fallbackClipItems) {
  if (!clipsGrid && !clipsList) return;

  const clipItems = items
    .map((item) => ({ ...item, videoId: item.videoId || youtubeVideoId(item.url) }))
    .filter((item) => item.videoId && hasUploadDate(item));
  const fallbackItems = fallbackClipItems
    .map((item) => ({ ...item, videoId: item.videoId || youtubeVideoId(item.url) }))
    .filter((item) => item.videoId && hasUploadDate(item));
  const sourceItems = clipItems.length ? clipItems : fallbackItems;
  const selectedChannels = clipFilters.channelTypes;
  const keyword = clipFilters.keyword;
  const dateFrom = clipFilters.dateFrom;
  const dateTo = clipFilters.dateTo;
  const sortedItems = sourceItems
    .filter((item) => !selectedChannels.length || selectedChannels.includes(item.channelType || ""))
    .filter((item) => !keyword || clipSearchText(item).includes(keyword))
    .filter((item) => !dateFrom || clipSortDate(item) >= dateFrom)
    .filter((item) => !dateTo || clipSortDate(item) <= dateTo)
    .sort((a, b) => {
      if (clipFilters.sort === "updated-asc") {
        return clipSortDate(a).localeCompare(clipSortDate(b)) || (a.title || "").localeCompare(b.title || "");
      }
      if (clipFilters.sort === "updated-desc") {
        return clipSortDate(b).localeCompare(clipSortDate(a)) || (a.title || "").localeCompare(b.title || "");
      }
      return (Number(b.viewCount) || 0) - (Number(a.viewCount) || 0) || clipSortDate(b).localeCompare(clipSortDate(a));
    });
  const visibleItems = showAllClips ? sortedItems : homeRecommendedClips(sourceItems);
  if (clipsResultCount) {
    clipsResultCount.textContent = `${visibleItems.length}件`;
  }

  if (!visibleItems.length) {
    const empty = `
      <article class="schedule-row">
        <div class="schedule-date">--<small></small></div>
        <div class="schedule-main">
          <h3>動画が見つかりません</h3>
          <p>検索条件を変えて確認してください。</p>
        </div>
        <span class="schedule-arrow" aria-hidden="true">→</span>
      </article>
    `;
    if (clipsGrid) clipsGrid.innerHTML = empty;
    if (clipsList) clipsList.innerHTML = empty;
    return;
  }

  const cardHtml = visibleItems.map((item) => {
    const meta = formatClipDate(item.uploadDate);
    return `
      <button class="clip-card" type="button" data-video-id="${escapeHtml(item.videoId)}" data-video-title="${escapeHtml(item.title)}">
        <span class="clip-thumb">
          <img src="https://img.youtube.com/vi/${escapeHtml(item.videoId)}/hqdefault.jpg" alt="${escapeHtml(item.title)}" loading="lazy">
        </span>
        <span>
          <strong>${escapeHtml(item.title)}</strong>
          ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
        </span>
      </button>
    `;
  }).join("");

  if (clipsGrid) clipsGrid.innerHTML = cardHtml;

  if (clipsList) {
    clipsList.innerHTML = visibleItems.map((item) => {
      const meta = [
        formatClipDate(item.uploadDate),
        clipChannelLabel(item.channelType)
      ].filter(Boolean).join(" / ");
      return `
        <button class="clip-list-card" type="button" data-video-id="${escapeHtml(item.videoId)}" data-video-title="${escapeHtml(item.title)}">
          <span class="clip-list-thumb">
            <img src="https://img.youtube.com/vi/${escapeHtml(item.videoId)}/hqdefault.jpg" alt="${escapeHtml(item.title)}" loading="lazy">
          </span>
          <span class="clip-list-main">
            <span class="news-tag">${escapeHtml(item.kind === "shorts" ? "Shorts" : "YouTube")}</span>
            <strong>${escapeHtml(item.title)}</strong>
            <small>${escapeHtml(meta)}</small>
          </span>
          <span class="schedule-arrow" aria-hidden="true">→</span>
        </button>
      `;
    }).join("");
  }
}

function waitForImage(img) {
  if (!img || img.complete) return Promise.resolve();
  return new Promise((resolve) => {
    img.addEventListener("load", resolve, { once: true });
    img.addEventListener("error", resolve, { once: true });
  });
}

function waitForPageImages(timeout = 4500) {
  const images = Array.from(document.images);
  const imageLoad = Promise.all(images.map(waitForImage));
  const fallbackTimer = new Promise((resolve) => window.setTimeout(resolve, timeout));
  return Promise.race([imageLoad, fallbackTimer]);
}

function hidePageLoader() {
  if (!pageLoader) return;
  pageLoader.classList.add("is-hidden");
  document.body.classList.remove("is-loading");
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

async function loadClips() {
  try {
    const response = await fetch(CLIPS_DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${CLIPS_DATA_PATH}`);
    const data = await response.json();
    clipItems = Array.isArray(data.clips) ? data.clips : fallbackClipItems;
    renderClips(clipItems);
  } catch (error) {
    console.warn(error);
    clipItems = fallbackClipItems;
    renderClips(clipItems);
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
    category: (scheduleCategorySearch?.value || "").trim().toLowerCase(),
    dateFrom: scheduleDateFrom?.value || "",
    dateTo: scheduleDateTo?.value || ""
  };
  renderSchedule(scheduleItems);
}

function normalizeScheduleDateRange() {
  if (!scheduleDateFrom || !scheduleDateTo) return;
  const from = scheduleDateFrom.value;
  const to = scheduleDateTo.value;
  if (!from || !to || from <= to) return;
  scheduleDateFrom.value = to;
  scheduleDateTo.value = from;
}

if (scheduleSearchForm) {
  scheduleSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateScheduleFilters();
  });
}

[scheduleTitleSearch, scheduleCategorySearch, scheduleDateFrom, scheduleDateTo].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", () => {
    normalizeScheduleDateRange();
    updateScheduleFilters();
  });
  control.addEventListener("change", () => {
    normalizeScheduleDateRange();
    updateScheduleFilters();
  });
});

function updateClipFilters() {
  clipFilters = {
    keyword: (clipsKeywordSearch?.value || "").trim().toLowerCase(),
    channelTypes: clipChannelCheckboxes.filter((control) => control.checked).map((control) => control.value),
    dateFrom: clipsDateFrom?.value || "",
    dateTo: clipsDateTo?.value || "",
    sort: clipsSortSearch?.value || "updated-desc"
  };
  renderClips(clipItems);
}

function normalizeClipDateRange() {
  if (!clipsDateFrom || !clipsDateTo) return;
  const from = clipsDateFrom.value;
  const to = clipsDateTo.value;
  if (!from || !to || from <= to) return;
  clipsDateFrom.value = to;
  clipsDateTo.value = from;
}

if (clipsSearchForm) {
  clipsSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateClipFilters();
  });
}

[clipsKeywordSearch, clipsDateFrom, clipsDateTo, clipsSortSearch, ...clipChannelCheckboxes].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", () => {
    normalizeClipDateRange();
    updateClipFilters();
  });
  control.addEventListener("change", () => {
    normalizeClipDateRange();
    updateClipFilters();
  });
});

if (clipsDateFrom && clipsDateTo) {
  clipsDateFrom.addEventListener("change", () => {
    if (!clipsDateFrom.value) return;
    if (!clipsDateTo.value) {
      window.setTimeout(() => {
        clipsDateTo.focus();
        if (typeof clipsDateTo.showPicker === "function") {
          clipsDateTo.showPicker();
        }
      }, 0);
    }
  });
}

if (scheduleDateFrom && scheduleDateTo) {
  scheduleDateFrom.addEventListener("change", () => {
    if (!scheduleDateFrom.value) return;
    if (!scheduleDateTo.value) {
      window.setTimeout(() => {
        scheduleDateTo.focus();
        if (typeof scheduleDateTo.showPicker === "function") {
          scheduleDateTo.showPicker();
        }
      }, 120);
    }
  });
}

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

async function initPage() {
  renderRegular();
  await Promise.allSettled([loadInfo(), loadClips()]);
  await waitForPageImages();
  hidePageLoader();
}

initPage();
