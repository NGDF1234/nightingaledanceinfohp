const newsItems = [
  {
    date: "2026.07.05",
    tag: "LIVE",
    icon: "🎙",
    title: "単独ライブ情報",
    text: "FANY掲載情報を公式ページで確認。",
    category: "live"
  },
  {
    date: "2026.06.17",
    tag: "LIVE",
    icon: "🎤",
    title: "ピンネタライブ",
    text: "劇場・配信の公開情報メモ。",
    category: "live"
  },
  {
    date: "2026.05.25",
    tag: "YouTube",
    icon: "▶",
    title: "YouTube更新",
    text: "公式チャンネルや関連動画を検索。",
    category: "media"
  },
  {
    date: "2026.05.24",
    tag: "SNS",
    icon: "▣",
    title: "SNS更新",
    text: "Xで最新投稿をチェック。",
    category: "media"
  },
  {
    date: "2026.05.24",
    tag: "TICKET",
    icon: "🎟",
    title: "チケット情報",
    text: "FANYチケット検索へ移動。",
    category: "live"
  }
];

const grid = document.querySelector("#news-grid");
const buttons = document.querySelectorAll(".filters button");

function renderNews(filter = "all") {
  const items = filter === "all" ? newsItems : newsItems.filter((item) => item.category === filter);
  grid.innerHTML = items.map((item) => `
    <article class="news-card">
      <span class="news-tag">${item.tag}</span>
      <div class="news-icon" aria-hidden="true">${item.icon}</div>
      <p>${item.date}</p>
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    </article>
  `).join("");
}

buttons.forEach((button) => {
  button.addEventListener("click", () => {
    buttons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    renderNews(button.dataset.filter);
  });
});

renderNews();
