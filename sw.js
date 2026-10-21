/**
 * ==========================================================================
 * KACIDA BERSATU — Portal Performa & Operasional Retail
 * Progressive Web App Service Worker (sw.js)
 * Version: 1.0.0 Production Enterprise
 * ==========================================================================
 */

const CACHE_NAME = "kacida-bersatu-cache-v1.0.0";

// Aset statis inti yang dicache saat instalasi service worker
const STATIC_ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./Styles.css",
  "./api.js",
  "./app.js",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/sweetalert2@11",
  "https://cdn.jsdelivr.net/npm/chart.js",
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js",
  "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
  "https://unpkg.com/html5-qrcode",
  "https://lh3.googleusercontent.com/d/15CaPCEZgcdzO_xf7r2HSimuW5I1KnJIR",
  "https://lh3.googleusercontent.com/d/1xAINOGLsjRaFc1CVc8ZonDzgwlL6Lt5i",
  "https://lh3.googleusercontent.com/d/16LWQVS2khktL1miWFSAzMnHU_tf0blDa",
  "https://lh3.googleusercontent.com/d/1T-e5lMua-WeSj7VhHy7BE1m8-ukONs4J",
  "https://lh3.googleusercontent.com/d/13s7CfV9C0h6NXGZQzA79AdbuycKiFRc9"
];

/**
 * 1. Siklus Hidup: Install (Pre-caching Static Core Assets)
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching file statis Kacida Bersatu...");
      return cache.addAll(STATIC_ASSETS_TO_CACHE).catch((err) => {
        console.warn("[ServiceWorker] Sebagian aset eksternal gagal dicache saat install:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

/**
 * 2. Siklus Hidup: Activate (Pembersihan Cache Versi Lama)
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Menghapus cache usang:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * 3. Siklus Hidup: Fetch (Network-First untuk Google Apps Script API, Stale-While-Revalidate untuk Statis)
 */
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // A. Permintaan ke Google Apps Script (POST / API Data) TIDAK BOLEH dicache oleh Service Worker HTTP Cache
  if (event.request.method === "POST" || requestUrl.hostname.includes("script.google.com")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Jika offline, api.js menangani fallback via localStorage
        return new Response(JSON.stringify({
          status: "offline",
          message: "Koneksi offline terdeteksi. Membaca data cadangan lokal."
        }), {
          headers: { "Content-Type": "application/json" }
        });
      })
    );
    return;
  }

  // B. Stale-While-Revalidate untuk file statis lokal & CDN gambar/font
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback jika network error dan cache tidak tersedia
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});

/**
 * Registrasi Service Worker Otomatis dari Halaman Frontend
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
