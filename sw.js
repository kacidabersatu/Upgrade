/**
 * ==============================================================================
 * KACIDA BERSATU — Service Worker (sw.js)
 * Versi Cache: v1.0.0
 * Strategi: Stale-While-Revalidate untuk Aset Statis, Network-Only untuk API Data
 * ==============================================================================
 */

const CACHE_NAME = 'kacida-static-v1.0.0';

// Aset lokal & library CDN pihak ketiga yang dicache untuk akses cepat & offline shell
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://lh3.googleusercontent.com/d/15CaPCEZgcdzO_xf7r2HSimuW5I1KnJIR', // Logo
  'https://lh3.googleusercontent.com/d/13s7CfV9C0h6NXGZQzA79AdbuycKiFRc9', // Background Login
  'https://lh3.googleusercontent.com/d/1xAINOGLsjRaFc1CVc8ZonDzgwlL6Lt5i'  // Watermark
];

/**
 * Tahap Install: Caching Core Assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Menggunakan pendekatan per-item agar satu kegagalan cache CDN tidak membatalkan install
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => {
          return fetch(url, { mode: 'no-cors' }).then((response) => {
            return cache.put(url, response);
          }).catch((err) => {
            console.warn('[ServiceWorker] Gagal cache aset opsional:', url, err);
          });
        })
      );
    }).then(() => self.skipWaiting())
  );
});

/**
 * Tahap Aktivasi: Hapus Cache Versi Lama
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Menghapus Cache Lama:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Tahap Fetch Interceptor
 */
self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  // Jangan pernah cache permintaan API ke Google Apps Script atau layanan AI luar
  if (
    reqUrl.hostname.includes('script.google.com') ||
    reqUrl.hostname.includes('script.googleusercontent.com') ||
    reqUrl.hostname.includes('groq.com') ||
    event.request.method !== 'GET'
  ) {
    return; // Dibiarkan langsung menuju jaringan
  }

  // Strategi Cache First dengan Network Fallback untuk Aset Statis
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Ambil pembaruan di latar belakang (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Abaikan jika offline */});

        return cachedResponse;
      }

      // Jika belum ada di cache, unduh dari jaringan
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback jika pengguna membuka root navigasi saat offline total
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
