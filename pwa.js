const PUSH_API_URL = "https://nightingaledanceinfo-push.ngdf1234.workers.dev";

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
}

async function enableNotifications(button) {
  if (PUSH_API_URL.startsWith("__")) throw new Error("通知サーバーは準備中です");
  const registration = await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした");
  const { publicKey } = await fetch(`${PUSH_API_URL}/vapid-public-key`).then((response) => response.json());
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(publicKey)
  });
  const response = await fetch(`${PUSH_API_URL}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription)
  });
  if (!response.ok) throw new Error("通知の登録に失敗しました");
  button.textContent = "通知ON";
  button.disabled = true;
}

function addNotificationButton() {
  if (!("Notification" in window) || !("PushManager" in window)) return;
  const button = document.createElement("button");
  button.className = "push-notification-button";
  button.type = "button";
  button.textContent = Notification.permission === "granted" ? "通知ON" : "通知を受け取る";
  button.disabled = Notification.permission === "granted";
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
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then(addNotificationButton)
      .catch((error) => console.warn("Service Worker registration failed:", error));
  });
}
