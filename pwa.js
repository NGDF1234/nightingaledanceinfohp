const PUSH_API_URL = "https://nightingaledanceinfo-push.ngdf1234.workers.dev";

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

function isSafariBrowserTab() {
  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(ua);
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  return isSafari && !isStandalone;
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
}

async function sendTestNotification(button) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) throw new Error("この端末の通知登録が見つかりません");
  const response = await fetch(`${PUSH_API_URL}/test-current-device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription)
  });
  if (!response.ok) throw new Error("テスト通知の送信に失敗しました");
  button.textContent = "送信しました";
  setTimeout(() => {
    button.disabled = false;
    button.textContent = "通知テスト";
  }, 2000);
}

function addTestNotificationButton() {
  if (!("Notification" in window) || !("PushManager" in window)) return;
  if (!isStandaloneApp() || Notification.permission !== "granted") return;
  if (document.querySelector(".push-test-button")) return;
  const button = document.createElement("button");
  button.className = "push-notification-button push-test-button";
  button.type = "button";
  button.textContent = "通知テスト";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "送信中…";
    try {
      await sendTestNotification(button);
    } catch (error) {
      button.disabled = false;
      button.textContent = "通知テスト";
      alert(error.message);
    }
  });
  document.body.append(button);
}

async function enableNotifications(button) {
  if (PUSH_API_URL.startsWith("__")) throw new Error("通知サーバーは準備中です");
  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission === "denied") {
    throw new Error("通知がブロックされています。ブラウザのサイト設定から通知を許可してください");
  }
  if (permission !== "granted") throw new Error("通知が許可されませんでした");
  const { publicKey } = await fetch(`${PUSH_API_URL}/vapid-public-key`).then((response) => response.json());
  const subscription = (await registration.pushManager.getSubscription()) || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey)
  });
  const response = await fetch(`${PUSH_API_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription)
  });
  if (!response.ok) throw new Error("通知の登録に失敗しました");
  button.remove();
  addTestNotificationButton();
}

function addNotificationButton() {
  if (isSafariBrowserTab()) return;
  if (!("Notification" in window) || !("PushManager" in window)) return;
  if (Notification.permission === "granted") return;
  const button = document.createElement("button");
  button.className = "push-notification-button";
  button.type = "button";
  button.textContent = "通知ON";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "設定中…";
    try {
      await enableNotifications(button);
    } catch (error) {
      button.disabled = false;
      button.textContent = "通知ON";
      alert(error.message);
    }
  });
  document.body.append(button);
}

if ("serviceWorker" in navigator) {
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "NGDINFO_NOTIFICATION_NAVIGATE") return;
    const target = new URL(event.data?.url || "./index.html", window.location.href).href;
    if (target === window.location.href) {
      window.location.reload();
      return;
    }
    window.location.href = target;
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then((registration) => {
        registration.update();
        addNotificationButton();
        addTestNotificationButton();
      })
      .catch(() => {});
  });
}
