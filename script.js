const DATA_PATH = "./data/nightingale-info.json";
const CLIPS_DATA_PATH = "./data/nightingale-youtube-clips.json";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

window.scrollTo(0, 0);

const fallbackNewsItems = [
  {
    date: "2026-07-05",
    tag: "公演情報",
    title: "単独ライブ情報",
    text: "FANY掲載情報を公式ページで確認。",
    url: ""
  },
  {
    date: "2026-06-17",
    tag: "公演情報",
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
const newsList = document.querySelector("#news-list");
const newsSearchForm = document.querySelector("#news-search-form");
const newsKeywordSearch = document.querySelector("#news-keyword-search");
const newsCategorySearch = document.querySelector("#news-category-search");
const newsDateFrom = document.querySelector("#news-date-from");
const newsDateTo = document.querySelector("#news-date-to");
const regularGrid = document.querySelector("#regular-grid");
const clipsGrid = document.querySelector("#clips-grid");
const clipsList = document.querySelector("#clips-list");
const clipsSearchForm = document.querySelector("#clips-search-form");
const clipsKeywordSearch = document.querySelector("#clips-keyword-search");
const clipsSortSearch = document.querySelector("#clips-sort-search");
const clipsDateFrom = document.querySelector("#clips-date-from");
const clipsDateTo = document.querySelector("#clips-date-to");
const clipsKindSearch = document.querySelector("#clips-kind-search");
const clipsDurationMin = document.querySelector("#clips-duration-min");
const clipsDurationMax = document.querySelector("#clips-duration-max");
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
let newsItems = [];
let ticketReminderItems = [];
let newsFilters = {
  keyword: "",
  category: "",
  dateFrom: "",
  dateTo: ""
};
let showAllSchedules = document.body.dataset.scheduleMode === "all";
let scheduleFilters = {
  keyword: "",
  category: "",
  dateFrom: "",
  dateTo: ""
};
let clipItems = [];
let clipsByVideoId = new Map();
let showAllClips = document.body.dataset.clipsMode === "all";
let clipFilters = {
  keyword: "",
  channelTypes: [],
  dateFrom: "",
  dateTo: "",
  kind: "",
  durationMin: "",
  durationMax: "",
  sort: "updated-desc"
};

const fallbackRegularItems = [
  {
    title: "Vタイムズ",
    tag: "テレビ",
    media: "長崎国際テレビ",
    comment: "",
    time: "毎週土曜 9:25〜10:15",
    period: { startDate: "2026-08-25" },
    url: "https://www.nib.jp/tv/vtimes/"
  },
  {
    title: "文化シヤッターpresents ナイチンゲールダンスのもうきてるラジオ",
    tag: "ラジオ",
    media: "CBCラジオ",
    comment: "",
    time: "毎週金曜 24:00〜24:30",
    period: { startDate: "2026-08-25" },
    url: "https://hicbc.com/radio/nightin/"
  },
  {
    title: "ヤスマロティン",
    tag: "ラジオ",
    media: "Artistspoken",
    comment: "",
    time: "毎週金曜 18:00頃 配信",
    period: { startDate: "2026-08-25" },
    url: "https://artistspoken.com/lp/"
  },
  {
    title: "東西南北よしもと麻雀リーグ season7",
    tag: "テレビ",
    media: "BSよしもと",
    comment: "※毎週出演ではありません",
    time: "毎週土曜 22:00〜23:00",
    period: { startDate: "2026-08-25" },
    url: "https://bsy.co.jp/programs/by0000018915"
  },
  {
    title: "ヤスのコラム",
    tag: "連載・コラム",
    media: "ウォーカープラス",
    comment: "",
    time: "毎月第1金曜日頃 更新予定",
    period: { startDate: "2026-08-25" },
    url: "https://www.walkerplus.com/article_list/tags/%E3%83%8A%E3%82%A4%E3%83%81%E3%83%B3%E3%82%B2%E3%83%BC%E3%83%AB%E3%83%80%E3%83%B3%E3%82%B9/"
  }
];

const fallbackClipItems = [
  {
    kind: "video",
    channelType: "combi_official",
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

function newsCategory(item = {}) {
  if (item.category) return item.category;

  const tag = String(item.tag || "").trim();
  const upperTag = tag.toUpperCase();
  const title = String(item.title || "");
  const url = String(item.url || "");
  const text = `${tag} ${title} ${url}`.toLowerCase();

  if (upperTag === "LIVE" || tag === "ライブ" || tag === "公演情報") return "公演情報";
  if (upperTag === "EVENT" || tag === "イベント") return "イベント";
  if (upperTag === "TV" || tag === "テレビ") return "テレビ";
  if (upperTag === "RADIO" || tag === "ラジオ") return "ラジオ";
  if (upperTag === "YOUTUBE" || tag === "YouTube") {
    return text.includes("/shorts/") || item.kind === "shorts" ? "YouTube Shorts" : "YouTube";
  }
  if (tag === "YouTube Shorts" || tag === "Shorts") return "YouTube Shorts";
  if (upperTag === "AWARD" || tag === "賞レース") return "賞レース";
  if (upperTag === "MAGAZINE" || tag === "雑誌・書籍") return "雑誌・書籍";
  if (upperTag === "COLUMN" || upperTag === "WEB" || tag === "連載・コラム") return "連載・コラム";
  if (upperTag === "INFO" || tag === "公式情報") return "公式情報";
  return tag || "その他";
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

function youtubeThumbnailUrl(videoId = "", size = "hqdefault") {
  return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${size}.jpg`;
}

function fallbackThumbnail(img) {
  if (!img) return;
  const steps = ["hqdefault", "mqdefault", "default"];
  const currentStep = img.dataset.thumbStep || steps[0];
  const nextStep = steps[steps.indexOf(currentStep) + 1];

  if (nextStep) {
    img.dataset.thumbStep = nextStep;
    img.src = youtubeThumbnailUrl(img.dataset.videoId || "", nextStep);
    return;
  }

  const frame = img.closest(".clip-thumb, .clip-list-thumb");
  if (frame) frame.classList.add("is-missing-thumb");
  img.removeAttribute("src");
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

function normalizeClipChannelType(type = "") {
  return type === "combo_official" ? "combi_official" : type;
}

function clipChannelFilterType(type = "") {
  const normalizedType = normalizeClipChannelType(type);
  const knownTypes = ["combi_official", "nakano_personal", "yasu_personal"];
  return knownTypes.includes(normalizedType) ? normalizedType : "other";
}

function clipChannelLabel(item = {}) {
  const type = item.channelType || "";
  const filterType = clipChannelFilterType(type);
  if (item.channelName) return item.channelName;

  const labels = {
    combi_official: "ナイチンゲールダンスチャンネル",
    nakano_personal: "個人（中野）",
    yasu_personal: "個人（ヤス）",
    other: "その他"
  };
  return labels[filterType];
}

function newsYoutubeChannelName(item = {}) {
  const videoId = youtubeVideoId(item.url || "");
  const clip = videoId ? clipsByVideoId.get(videoId) : null;
  return item.channelName || clip?.channelName || "";
}

function newsSecondaryText(item = {}) {
  return item.text || item.note || "";
}

function siteTitleFromUrl(url = "") {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const titles = {
      "youtube.com": "YouTube",
      "m.youtube.com": "YouTube",
      "youtu.be": "YouTube",
      "instagram.com": "Instagram",
      "x.com": "X",
      "twitter.com": "X",
      "ticket.fany.lol": "FANYチケット",
      "online-ticket.yoshimoto.co.jp": "配信チケット",
      "live.yoshimoto.co.jp": "公演一覧",
      "profile.yoshimoto.co.jp": "公式プロフィール",
      "shibuya-manzaigekijyo.yoshimoto.co.jp": "渋谷よしもと漫才劇場",
      "tv-asahi.co.jp": "テレビ朝日",
      "bsy.co.jp": "BSよしもと",
      "hicbc.com": "CBCラジオ",
      "nib.jp": "NIB"
    };
    if (titles[host]) return titles[host];
    if (host.includes("yoshimoto.co.jp")) return "吉本興業";
    if (host.includes("fany.lol")) return "FANY";
    if (host.includes("tv") || host.includes("tver")) return "テレビ公式サイト";
    if (host.includes("radio") || host.includes("fm")) return "ラジオ公式サイト";
    return "外部サイト";
  } catch (error) {
    return "リンク";
  }
}

function linkTitlePriority(title = "") {
  const normalizedTitle = String(title || "").trim();
  if (!normalizedTitle) return 0;
  if (["外部サイト", "リンク", "FANY", "FANYチケット"].includes(normalizedTitle)) return 1;
  if (["公演詳細", "チケット受付", "販売中のチケット"].includes(normalizedTitle)) return 2;
  return 3;
}

function normalizedTitleKey(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/[「」『』"'“”‘’\s　・:：]/g, "")
    .toLowerCase();
}

function ticketRemindersForItem(item = {}) {
  const itemKey = normalizedTitleKey(item.title);
  if (!itemKey) return [];
  return ticketReminderItems.filter((ticket) => normalizedTitleKey(ticket.title) === itemKey);
}

function ticketReminderLinks(item = {}) {
  return ticketRemindersForItem(item).map((ticket) => ({
    url: ticket.url || "",
    title: ticket.ticketLabel ? `FANYチケット（${ticket.ticketLabel}）` : "FANYチケット"
  }));
}

function itemLinks(item = {}, limit = 3) {
  const rawLinks = Array.isArray(item.links)
    ? item.links
    : Array.isArray(item.urls)
      ? item.urls
      : [];
  const links = rawLinks.map((link) => (typeof link === "string" ? { url: link } : link || {}));

  if (item.url) {
    links.unshift({
      url: item.url,
      title: item.linkTitle || item.siteTitle || item.sourceTitle || item.source || item.media || item.station || item.broadcaster
    });
  }

  links.push(...ticketReminderLinks(item));

  const seen = new Map();
  const result = links
    .map((link) => ({
      url: String(link.url || "").trim(),
      title: String(link.title || link.label || link.siteTitle || link.name || link.media || link.station || link.broadcaster || "").trim()
    }))
    .filter((link) => link.url)
    .map((link) => ({ ...link, title: link.title || siteTitleFromUrl(link.url) }))
    .filter((link) => {
      const current = seen.get(link.url);
      if (!current) {
        seen.set(link.url, link);
        return true;
      }
      if (linkTitlePriority(link.title) > linkTitlePriority(current.title)) {
        current.title = link.title;
      }
      return false;
    });

  return Number.isFinite(limit) ? result.slice(0, limit) : result;
}

function renderCardLinks(item = {}) {
  const links = itemLinks(item);
  if (!links.length) return "";

  return `
    <div class="card-resource-links">
      ${links.map((link) => `
        <a class="card-resource-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.title)} →</a>
      `).join("")}
    </div>
  `;
}

function detailAttributes(detail = {}) {
  return `role="button" tabindex="0" data-detail-card="${escapeHtml(JSON.stringify(detail))}"`;
}

function newsDetail(item = {}) {
  const category = newsCategory(item);
  const isYoutube = category.startsWith("YouTube");
  const snsDetails = newsSnsDetails(item);
  const text = snsDetails.comment || newsSecondaryText(item);
  const details = [
    isYoutube ? newsYoutubeChannelName(item) : "",
    text,
    snsDetails.accountName
  ].filter(Boolean);

  return {
    tag: category,
    date: formatNewsDate(item.date),
    title: item.title || "",
    details: [...details, ...ticketReminderDetails(item)],
    links: itemLinks(item, Infinity)
  };
}

function scheduleDetail(item = {}) {
  return {
    tag: scheduleCategory(item) || "INFO",
    date: formatNewsDate(item.date),
    title: item.title || "",
    details: [
      formatTime(item),
      item.place,
      item.note,
      ...ticketReminderDetails(item)
    ].filter(Boolean),
    links: itemLinks(item, Infinity)
  };
}

function regularDetail(item = {}) {
  return {
    tag: item.tag || item.category || "REGULAR",
    title: item.title || "",
    details: [
      item.comment,
      regularMedia(item),
      regularTime(item)
    ].filter(Boolean),
    links: itemLinks(item, Infinity)
  };
}

function formatTicketDateTime(value = "") {
  if (!value) return "";
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return value;
  return `${match[1]}.${match[2]}.${match[3]} ${match[4]}:${match[5]}`;
}

function ticketReminderDetails(item = {}) {
  return ticketRemindersForItem(item).map((ticket) => {
    const dates = [
      ticket.startAt ? `開始 ${formatTicketDateTime(ticket.startAt)}` : "",
      ticket.endAt ? `終了 ${formatTicketDateTime(ticket.endAt)}` : ""
    ].filter(Boolean).join(" / ");
    return [
      ticket.ticketLabel || ticket.ticketKind || "チケット",
      ticket.reminderLabel,
      dates
    ].filter(Boolean).join("：");
  });
}

function isInstagramNews(item = {}) {
  const title = String(item.title || "").toLowerCase();
  const url = String(item.url || "").toLowerCase();
  return newsCategory(item) === "SNS" && (title.includes("instagram") || url.includes("instagram.com"));
}

function newsSnsDetails(item = {}) {
  if (!isInstagramNews(item)) {
    return { comment: newsSecondaryText(item), accountName: "" };
  }

  const note = newsSecondaryText(item);
  const accountMatch = note.match(/(?:アカウント名|アカウント)\s*[:：]\s*(.+)$/);
  const accountName = accountMatch ? accountMatch[1].trim() : "";
  const comment = accountMatch ? note.slice(0, accountMatch.index).trim() : note.trim();
  return { comment, accountName };
}

function hasUploadDate(item) {
  return Boolean(normalizeDate(item.uploadDate));
}

function clipSortDate(item) {
  return normalizeDate(item.uploadDate) || "";
}

function clipDurationSeconds(item) {
  const raw = item.durationSeconds ?? item.durationSec ?? item.lengthSeconds ?? item.duration;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;

  const text = String(raw).trim();
  if (/^\d+$/.test(text)) return Number(text);

  const isoMatch = text.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (isoMatch) {
    const [, hours = "0", minutes = "0", seconds = "0"] = isoMatch;
    return (Number(hours) * 3600) + (Number(minutes) * 60) + Number(seconds);
  }

  if (text.includes(":")) {
    const parts = text.split(":").map((part) => Number(part));
    if (parts.every((part) => Number.isFinite(part))) {
      return parts.reduce((total, part) => (total * 60) + part, 0);
    }
  }

  return null;
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
  const datedItems = items.filter((item) => (
    hasUploadDate(item) && normalizeClipChannelType(item.channelType || "") === "combi_official"
  ));
  const videos = shuffleItems(topClipsByViews(datedItems, "video", 30)).slice(0, 3);
  const shorts = shuffleItems(topClipsByViews(datedItems, "shorts", 30)).slice(0, 2);
  return shuffleItems([...videos, ...shorts]);
}

function scheduleCategory(item = {}) {
  const tag = String(item.tag || "").trim();
  const upperTag = tag.toUpperCase();
  if (upperTag === "TV" || tag === "テレビ") return "テレビ";
  if (upperTag === "RADIO" || tag === "ラジオ") return "ラジオ";
  if (upperTag === "LIVE" || tag === "ライブ" || tag === "公演情報") return "公演情報";
  if (upperTag === "YOUTUBE" || tag === "YouTube" || tag === "配信") return "配信";
  return tag;
}

function scheduleSearchText(item) {
  const categoryWords = {
    "テレビ": "テレビ tv",
    "ラジオ": "ラジオ radio",
    "公演情報": "公演情報 ライブ live",
    "配信": "配信 youtube ユーチューブ 動画",
    WEB: "web ウェブ",
    EVENT: "イベント event"
  };
  const tag = scheduleCategory(item);
  return [
    item.title,
    item.place,
    item.note,
    tag,
    categoryWords[tag] || ""
  ].filter(Boolean).join(" ").toLowerCase();
}

function newsSearchText(item) {
  const category = newsCategory(item);
  const snsDetails = newsSnsDetails(item);
  return [
    item.title,
    snsDetails.comment,
    snsDetails.accountName,
    newsSecondaryText(item),
    newsYoutubeChannelName(item),
    item.tag,
    category
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

function renderNews(items = fallbackNewsItems) {
  if (!newsGrid) return;

  const today = todayKey();
  const visibleItems = items.slice(0, 12);

  newsGrid.innerHTML = visibleItems.map((item) => {
    const category = newsCategory(item);
    const isYoutube = category.startsWith("YouTube");
    const snsDetails = newsSnsDetails(item);
    const text = snsDetails.comment || newsSecondaryText(item);
    const snsAccountName = snsDetails.accountName;
    const channelName = isYoutube ? newsYoutubeChannelName(item) : "";
    const cardClass = normalizeDate(item.date) === today ? "news-card today" : "news-card";
    const body = `
      <span class="news-tag">${escapeHtml(category)}</span>
      <p>${escapeHtml(formatNewsDate(item.date))}</p>
      <h3>${escapeHtml(item.title)}</h3>
      ${isYoutube && channelName ? `<p class="news-meta-line">${escapeHtml(channelName)}</p>` : ""}
      ${text ? `<p class="${isYoutube ? "news-meta-line" : ""}">${escapeHtml(text)}</p>` : ""}
      ${snsAccountName ? `<p class="news-meta-line">${escapeHtml(snsAccountName)}</p>` : ""}
      ${renderCardLinks(item)}
    `;

    const videoId = category.startsWith("YouTube") ? youtubeVideoId(item.url) : "";
    if (videoId) {
      return `
        <article class="${cardClass} news-card-link video-news-card" role="button" tabindex="0" data-video-id="${escapeHtml(videoId)}" data-video-title="${escapeHtml(item.title)}">
          ${body}
        </article>
      `;
    }

    return `<article class="${cardClass}" ${detailAttributes(newsDetail(item))}>${body}</article>`;
  }).join("");
}

function renderNewsList(items = fallbackNewsItems) {
  if (!newsList) return;

  const today = todayKey();
  const keyword = newsFilters.keyword;
  const category = newsFilters.category;
  const dateFrom = newsFilters.dateFrom;
  const dateTo = newsFilters.dateTo;
  const visibleItems = [...items]
    .sort((a, b) => normalizeDate(b.date).localeCompare(normalizeDate(a.date)))
    .filter((item) => !keyword || newsSearchText(item).includes(keyword))
    .filter((item) => !category || newsCategory(item) === category)
    .filter((item) => !dateFrom || !item.date || normalizeDate(item.date) >= dateFrom)
    .filter((item) => !dateTo || !item.date || normalizeDate(item.date) <= dateTo);

  if (!visibleItems.length) {
    newsList.innerHTML = `<p class="empty-count">0件</p>`;
    return;
  }

  newsList.innerHTML = visibleItems.map((item) => {
    const category = newsCategory(item);
    const isYoutube = category.startsWith("YouTube");
    const snsDetails = newsSnsDetails(item);
    const text = snsDetails.comment || newsSecondaryText(item);
    const snsAccountName = snsDetails.accountName;
    const channelName = isYoutube ? newsYoutubeChannelName(item) : "";
    const rowClass = normalizeDate(item.date) === today ? "schedule-row today" : "schedule-row";
    const body = `
      <div class="schedule-date">${formatScheduleDate(item)}</div>
      <div class="schedule-main">
        <span class="news-tag">${escapeHtml(category)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        ${isYoutube && channelName ? `<p class="news-meta-line">${escapeHtml(channelName)}</p>` : ""}
        ${text ? `<p class="${isYoutube ? "news-meta-line" : ""}">${escapeHtml(text)}</p>` : ""}
        ${snsAccountName ? `<p class="news-meta-line">${escapeHtml(snsAccountName)}</p>` : ""}
        ${renderCardLinks(item)}
      </div>
    `;

    const videoId = category.startsWith("YouTube") ? youtubeVideoId(item.url) : "";
    if (videoId) {
      return `
        <article class="${rowClass} schedule-row-button" role="button" tabindex="0" data-video-id="${escapeHtml(videoId)}" data-video-title="${escapeHtml(item.title)}">
          ${body}
        </article>
      `;
    }

    return `<article class="${rowClass}" ${detailAttributes(newsDetail(item))}>${body}</article>`;
  }).join("");
}

function regularPeriodStart(item) {
  return normalizeDate(item?.period?.startDate || item?.startDate || "");
}

function regularPeriodEnd(item) {
  return normalizeDate(item?.period?.endDate || item?.endDate || "");
}

function regularMedia(item = {}) {
  return item.media || item.medium || item.station || item.broadcaster || "";
}

function regularTime(item = {}) {
  return item.time || item.datetime || item.schedule || "";
}

function regularKey(value = "") {
  return String(value).replace(/\s+/g, "").toLowerCase();
}

function hydrateRegularItem(item = {}) {
  const fallback = fallbackRegularItems.find((fallbackItem) => {
    const itemTitle = regularKey(item.title);
    const fallbackTitle = regularKey(fallbackItem.title);
    return itemTitle === fallbackTitle || itemTitle.includes(fallbackTitle) || fallbackTitle.includes(itemTitle);
  });

  if (!fallback) return item;

  return {
    ...fallback,
    ...item,
    tag: item.tag || item.category || fallback.tag,
    media: regularMedia(item) || fallback.media,
    time: regularTime(item) || fallback.time,
    comment: item.comment || fallback.comment,
    period: item.period || fallback.period,
    url: item.url || fallback.url
  };
}

function activeRegularItems(items = []) {
  const today = todayKey();
  return items.map(hydrateRegularItem).filter((item) => {
    const startDate = regularPeriodStart(item);
    const endDate = regularPeriodEnd(item);
    if (startDate && startDate > today) return false;
    if (endDate && endDate < today) return false;
    return true;
  });
}

function renderRegular(items = fallbackRegularItems) {
  if (!regularGrid) return;

  const visibleItems = activeRegularItems(items);
  const sourceItems = visibleItems.length ? visibleItems : (items.length ? [] : fallbackRegularItems);

  if (!sourceItems.length) {
    regularGrid.innerHTML = `
      <article class="news-card regular-card">
        <span class="news-tag">REGULAR</span>
        <h3>レギュラー番組準備中</h3>
        <p class="regular-note">データ更新後に表示されます。</p>
      </article>
    `;
    return;
  }

  regularGrid.innerHTML = sourceItems.map((item) => `
    <article class="news-card regular-card" ${detailAttributes(regularDetail(item))}>
      <span class="news-tag">${escapeHtml(item.tag || item.category || "REGULAR")}</span>
      <h3>${escapeHtml(item.title)}</h3>
      ${item.comment ? `<p class="regular-note">${escapeHtml(item.comment)}</p>` : ""}
      ${regularMedia(item) ? `<div class="regular-detail">${escapeHtml(regularMedia(item))}</div>` : ""}
      ${regularTime(item) ? `<div class="regular-detail">${escapeHtml(regularTime(item))}</div>` : ""}
      ${renderCardLinks(item)}
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
    .filter((item) => !category || scheduleCategory(item).toLowerCase() === category)
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
        <span class="news-tag">${escapeHtml(scheduleCategory(item) || "INFO")}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(detail)}</p>
        ${renderCardLinks(item)}
      </div>
    `;

    return `<article class="${rowClass}" ${detailAttributes(scheduleDetail(item))}>${body}</article>`;
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
  const kind = clipFilters.kind;
  const durationMin = clipFilters.durationMin ? Number(clipFilters.durationMin) * 60 : 0;
  const durationMax = clipFilters.durationMax ? Number(clipFilters.durationMax) * 60 : 0;
  const sortedItems = sourceItems
    .filter((item) => !selectedChannels.length || selectedChannels.includes(clipChannelFilterType(item.channelType || "")))
    .filter((item) => !keyword || clipSearchText(item).includes(keyword))
    .filter((item) => !dateFrom || clipSortDate(item) >= dateFrom)
    .filter((item) => !dateTo || clipSortDate(item) <= dateTo)
    .filter((item) => !kind || item.kind === kind)
    .filter((item) => {
      if (!durationMin && !durationMax) return true;
      const seconds = clipDurationSeconds(item);
      if (seconds === null) return false;
      if (durationMin && seconds < durationMin) return false;
      if (durationMax && seconds > durationMax) return false;
      return true;
    })
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
          <img src="${escapeHtml(youtubeThumbnailUrl(item.videoId))}" data-video-id="${escapeHtml(item.videoId)}" data-thumb-step="hqdefault" alt="${escapeHtml(item.title)}" loading="lazy">
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
        clipChannelLabel(item)
      ].filter(Boolean).join(" / ");
      return `
        <button class="clip-list-card" type="button" data-video-id="${escapeHtml(item.videoId)}" data-video-title="${escapeHtml(item.title)}">
          <span class="clip-list-thumb">
            <img src="${escapeHtml(youtubeThumbnailUrl(item.videoId))}" data-video-id="${escapeHtml(item.videoId)}" data-thumb-step="hqdefault" alt="${escapeHtml(item.title)}" loading="lazy">
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
  const isHomePage = document.body.classList.contains("home-page");
  if (isHomePage) document.body.classList.add("home-reveal-pending");
  if (pageLoader) pageLoader.classList.add("is-hidden");
  document.body.classList.remove("is-loading");
  if (isHomePage) {
    window.setTimeout(() => {
      document.body.classList.remove("home-reveal-pending");
      document.body.classList.add("home-reveal-start");
    }, 320);
  }
}

async function loadInfo() {
  try {
    const response = await fetch(DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${DATA_PATH}`);
    const data = await response.json();
    ticketReminderItems = Array.isArray(data.ticketReminders) ? data.ticketReminders : [];
    newsItems = Array.isArray(data.news) ? data.news : fallbackNewsItems;
    renderNews(newsItems);
    renderNewsList(newsItems);
    renderRegular(Array.isArray(data.regular) ? data.regular : fallbackRegularItems);
    scheduleItems = Array.isArray(data.schedule) ? data.schedule : [];
    renderSchedule(scheduleItems);
  } catch {
    ticketReminderItems = [];
    newsItems = fallbackNewsItems;
    renderNews(fallbackNewsItems);
    renderNewsList(fallbackNewsItems);
    renderRegular(fallbackRegularItems);
    scheduleItems = [];
    renderSchedule([]);
  }
}

function updateNewsFilters() {
  newsFilters = {
    keyword: (newsKeywordSearch?.value || "").trim().toLowerCase(),
    category: newsCategorySearch?.value || "",
    dateFrom: newsDateFrom?.value || "",
    dateTo: newsDateTo?.value || ""
  };
  renderNewsList(newsItems);
}

if (newsSearchForm) {
  newsSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateNewsFilters();
  });
}

[newsKeywordSearch, newsCategorySearch].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", updateNewsFilters);
  control.addEventListener("change", updateNewsFilters);
});

async function loadClips() {
  try {
    const response = await fetch(CLIPS_DATA_PATH, { cache: "no-store" });
    if (!response.ok) throw new Error(`Failed to load ${CLIPS_DATA_PATH}`);
    const data = await response.json();
    clipItems = Array.isArray(data.clips) ? data.clips : fallbackClipItems;
    clipsByVideoId = new Map(clipItems.map((item) => [item.videoId || youtubeVideoId(item.url), item]));
    renderClips(clipItems);
    renderNews(newsItems);
    renderNewsList(newsItems);
  } catch {
    clipItems = fallbackClipItems;
    clipsByVideoId = new Map(clipItems.map((item) => [item.videoId || youtubeVideoId(item.url), item]));
    renderClips(clipItems);
    renderNews(newsItems);
    renderNewsList(newsItems);
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

if (scheduleSearchForm) {
  scheduleSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateScheduleFilters();
  });
}

[scheduleTitleSearch, scheduleCategorySearch].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", updateScheduleFilters);
  control.addEventListener("change", updateScheduleFilters);
});

function updateClipFilters() {
  clipFilters = {
    keyword: (clipsKeywordSearch?.value || "").trim().toLowerCase(),
    channelTypes: clipChannelCheckboxes.filter((control) => control.checked).map((control) => control.value),
    dateFrom: clipsDateFrom?.value || "",
    dateTo: clipsDateTo?.value || "",
    kind: clipsKindSearch?.value || "",
    durationMin: clipsDurationMin?.value || "",
    durationMax: clipsDurationMax?.value || "",
    sort: clipsSortSearch?.value || "updated-desc"
  };
  renderClips(clipItems);
}

function normalizeClipDurationRange() {
  if (!clipsDurationMin || !clipsDurationMax) return;
  const min = clipsDurationMin.value;
  const max = clipsDurationMax.value;
  if (!min || !max || Number(min) <= Number(max)) return;
  clipsDurationMin.value = max;
  clipsDurationMax.value = min;
}

function updateDateRangeVisual(fromControl, toControl) {
  if (!fromControl || !toControl) return;
  const isRangeSelected = Boolean(fromControl.value && toControl.value);
  fromControl.closest(".schedule-date-range")?.classList.toggle("is-range-selected", isRangeSelected);
}

function setupDateRangeInputs(fromControl, toControl, onUpdate) {
  if (!fromControl || !toControl) return;
  [fromControl, toControl].forEach((control) => {
    control.addEventListener("input", () => {
      updateDateRangeVisual(fromControl, toControl);
      onUpdate();
    });
    control.addEventListener("change", () => {
      updateDateRangeVisual(fromControl, toControl);
      onUpdate();
    });
  });

  updateDateRangeVisual(fromControl, toControl);
}

if (clipsSearchForm) {
  clipsSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateClipFilters();
  });
}

[clipsKeywordSearch, clipsKindSearch, clipsDurationMin, clipsDurationMax, clipsSortSearch, ...clipChannelCheckboxes].forEach((control) => {
  if (!control) return;
  control.addEventListener("input", () => {
    normalizeClipDurationRange();
    updateClipFilters();
  });
  control.addEventListener("change", () => {
    normalizeClipDurationRange();
    updateClipFilters();
  });
});

setupDateRangeInputs(clipsDateFrom, clipsDateTo, updateClipFilters);
setupDateRangeInputs(scheduleDateFrom, scheduleDateTo, updateScheduleFilters);
setupDateRangeInputs(newsDateFrom, newsDateTo, updateNewsFilters);

function closeVideoModal() {
  if (!videoModal || !videoModalFrame) return;
  videoModal.hidden = true;
  videoModalFrame.innerHTML = "";
}

function detailModalElement() {
  let modal = document.querySelector("#card-detail-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.className = "video-modal card-detail-modal";
  modal.id = "card-detail-modal";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="video-modal-backdrop" data-detail-close></div>
    <div class="video-modal-panel card-detail-panel" role="dialog" aria-modal="true" aria-label="詳細">
      <button class="video-modal-close" type="button" data-detail-close aria-label="閉じる">×</button>
      <div class="card-detail-body" id="card-detail-body"></div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeCardDetailModal() {
  const modal = document.querySelector("#card-detail-modal");
  if (!modal) return;
  modal.hidden = true;
}

function openCardDetailModal(rawDetail = "") {
  let detail;
  try {
    detail = JSON.parse(rawDetail);
  } catch (error) {
    return;
  }

  const modal = detailModalElement();
  const body = modal.querySelector("#card-detail-body");
  if (!body) return;

  const links = Array.isArray(detail.links) ? detail.links : [];
  body.innerHTML = `
    ${detail.tag ? `<span class="news-tag">${escapeHtml(detail.tag)}</span>` : ""}
    ${detail.date ? `<p class="card-detail-date">${escapeHtml(detail.date)}</p>` : ""}
    <h2>${escapeHtml(detail.title || "")}</h2>
    ${Array.isArray(detail.details) ? detail.details.map((line) => `<p>${escapeHtml(line)}</p>`).join("") : ""}
    ${links.length ? `
      <div class="card-resource-links card-detail-links">
        ${links.map((link) => `<a class="card-resource-link" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.title || siteTitleFromUrl(link.url))} →</a>`).join("")}
      </div>
    ` : ""}
  `;
  modal.hidden = false;
}

document.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;
  const button = event.target.closest("[data-video-id]");
  if (!button || !videoModal || !videoModalFrame) return;
  openVideoModal(button.dataset.videoId, button.dataset.videoTitle || "YouTube動画");
});

document.addEventListener("click", (event) => {
  if (event.target.closest("a")) return;
  if (event.target.closest("[data-detail-close]")) {
    closeCardDetailModal();
    return;
  }
  const card = event.target.closest("[data-detail-card]");
  if (!card) return;
  openCardDetailModal(card.dataset.detailCard || "");
});

function openVideoModal(videoId, title = "YouTube動画") {
  if (!videoModal || !videoModalFrame || !videoId) return;
  videoModalFrame.innerHTML = `
    <iframe
      src="https://www.youtube.com/embed/${escapeHtml(videoId)}?autoplay=1"
      title="${escapeHtml(title)}"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen></iframe>
  `;
  videoModal.hidden = false;
}

document.addEventListener("error", (event) => {
  const img = event.target.closest?.(".clip-thumb img, .clip-list-thumb img");
  if (!img) return;
  fallbackThumbnail(img);
}, true);

document.addEventListener("load", (event) => {
  const img = event.target.closest?.(".clip-thumb img, .clip-list-thumb img");
  if (!img) return;
  if (img.naturalWidth <= 130 && img.naturalHeight <= 100) fallbackThumbnail(img);
}, true);

document.querySelectorAll("[data-video-close]").forEach((button) => {
  button.addEventListener("click", closeVideoModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeVideoModal();
    closeCardDetailModal();
  }
  if (event.key !== "Enter" && event.key !== " ") return;
  const button = event.target.closest("[data-video-id]");
  if (button) {
    event.preventDefault();
    openVideoModal(button.dataset.videoId, button.dataset.videoTitle || "YouTube動画");
    return;
  }
  const card = event.target.closest("[data-detail-card]");
  if (!card) return;
  event.preventDefault();
  openCardDetailModal(card.dataset.detailCard || "");
});

async function initPage() {
  window.scrollTo(0, 0);
  await Promise.allSettled([loadInfo(), loadClips()]);
  await waitForPageImages();
  window.scrollTo(0, 0);
  hidePageLoader();
}

initPage();
