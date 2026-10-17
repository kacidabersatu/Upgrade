/**
 * ============================================================================
 * KACIDA BERSATU - Service Worker PWA (sw.js)
 * Cache-First untuk Aset Visual, Network-Only untuk API Google Apps Script
 * ============================================================================
 */

const CACHE_NAME = "kacida-bersatu-pwa-v2";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11.10.5/dist/sweetalert2.all.min.js",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11.10.5/dist/sweetalert2.min.css",
  "https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js",
  "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
  "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
];

// 1. Install Service Worker & Simpan Cache Awal
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// 2. Aktivasi Service Worker & Bersihkan Cache Versi Usang
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Strategi Pengambilan Data (Network vs Cache)
self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  // JANGAN cache request yang mengarah ke script.google.com atau Google API
  // agar data transaksi dan autentikasi selalu real-time persisten
  if (
    requestUrl.includes("script.google.com") ||
    requestUrl.includes("script.googleusercontent.com") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Simpan salinan aset statis baru ke cache
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === "basic"
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback jika offline total
        return caches.match("./index.html");
      });
    })
  );
});
