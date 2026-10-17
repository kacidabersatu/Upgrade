
const CACHE_NAME = "kacida-bersatu-v1.0.0";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./api.js",
  "./config.json",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // Hanya tangani GET requests untuk asset statis
  if (e.request.method !== "GET") return;

  // Abaikan request ke Apps Script API dari cache (agar data selalu segar)
  if (e.request.url.includes("script.google.com") || e.request.url.includes("api.groq.com")) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        if (e.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
