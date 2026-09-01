const CACHE_VERSION = "ngd-info-pwa-v37";
const APP_SHELL = [
  "./",
  "./index.html",
  "./news.html",
  "./schedule.html",
  "./clips.html",
  "./styles.css?v=180",
  "./script.js?v=147",
  "./pwa.js?v=7",
  "./manifest.webmanifest",
  "./data/nightingale-info.json",
  "./data/nightingale-youtube-clips.json",
  "./assets/app-icon-v3.jpg",
  "./assets/header-logo-v3.jpg",
  "./assets/page-bg-v26.jpg",
  "./assets/bg-footer.jpg",
  "./assets/hero-bg-v5.jpg",
  "./assets/hero-left-v9.png",
  "./assets/hero-right-v9.png",
  "./assets/hero-logo-frames/comic-pop-10.png",
  "./assets/heading-news-v20.png",
  "./assets/heading-profile-v20.png",
  "./assets/heading-regular-v39.png",
  "./assets/heading-schedule-v86.png",
  "./assets/heading-clips-v20.png",
  "./assets/tab-home-v2.png",
  "./assets/tab-news-v2.png",
  "./assets/tab-schedule-v2.png",
  "./assets/tab-clips-v2.png",
  "./assets/section-bg-news-v30.jpg",
  "./assets/section-bg-profile-v30.jpg",
  "./assets/section-cycle-1-v49.jpg",
  "./assets/section-cycle-2-v49.jpg",
  "./assets/section-cycle-3-v49.jpg",
  "./assets/loader-frames/loader-frame-v112-1.png",
  "./assets/loader-frames/loader-frame-v112-2.png",
  "./assets/loader-frames/loader-frame-v112-3.png",
  "./assets/loader-frames/loader-frame-v112-4.png",
  "./assets/loader-frames/loader-frame-v112-5.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    return (await cache.match(request)) || Promise.reject(error);
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_VERSION);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request).catch(() => caches.match("./index.html")));
    return;
  }

  if (url.pathname.endsWith(".json") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {};
  const title = payload.title || "NightingaleDanceInfo";
  event.waitUntil(self.registration.showNotification(title, {
    body: payload.body || "新しい情報があります",
    icon: "./assets/app-icon-v3.jpg",
    badge: "./assets/app-icon-v3.jpg",
    data: { url: payload.url || "./index.html" },
    tag: payload.tag
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./index.html", self.location.origin).href;
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const existing = windows.find((client) => {
      try {
        return new URL(client.url).origin === self.location.origin;
      } catch (error) {
        return false;
      }
    });
    if (!existing) return clients.openWindow(target);
    if ("navigate" in existing) {
      return existing.navigate(target)
        .then((client) => (client || existing).focus())
        .catch(() => clients.openWindow(target));
    }
    existing.postMessage({ type: "NGDINFO_NOTIFICATION_NAVIGATE", url: target });
    return existing.focus();
  }));
});
