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
}

function addNotificationButton() {
  if (isSafariBrowserTab()) return;
  if (!("Notification" in window) || !("PushManager" in window)) return;
  if (Notification.permission === "granted") return;
  const button = document.createElement("button");
  button.className = "push-notification-button";
  button.type = "button";
  button.textContent = "通知を受け取る";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "設定中…";
    try {
      await enableNotifications(button);
    } catch (error) {
      button.disabled = false;
      button.textContent = "通知を受け取る";
      alert(error.message);
    }
  });
  document.body.append(button);
}

if ("serviceWorker" in navigator) {
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
      .then(addNotificationButton)
      .catch((error) => console.warn("Service Worker registration failed:", error));
  });
}
