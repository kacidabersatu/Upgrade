/**
 * KACIDA BERSATU - Service Worker PWA
 * File: sw.js
 */

const CACHE_NAME = "kacida-bersatu-cache-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./api.js",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js"
];

// Install Event
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network First, Cache Fallback)
self.addEventListener("fetch", (e) => {
  // Hanya cache GET requests statis (jangan intercept POST Google Script)
  if (e.request.method !== "GET" || e.request.url.includes("script.google.com")) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => caches.match(e.request))
  );
});
