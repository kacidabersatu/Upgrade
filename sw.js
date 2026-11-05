/**
 * KACIDA BERSATU Service Worker
 * Offline Fast Cache & Asset Proxy (CORS-Safe)
 */
const CACHE_NAME = 'kacida-static-v2.0';

// Seluruh aset inti & CDN eksternal tetap dimasukkan lengkap
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js'
];

// Tahap Install: Cache semua aset secara aman tanpa crash CORS
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of STATIC_ASSETS) {
        try {
          // Gunakan no-cors untuk URL pihak ketiga agar tidak diblokir CORS policy
          const isExternal = url.startsWith('http');
          const request = new Request(url, { mode: isExternal ? 'no-cors' : 'cors' });
          const response = await fetch(request);
          await cache.put(request, response);
        } catch (err) {
          // Melewati aset jika jaringan saat build sedang timeout tanpa menggagalkan install SW
          console.warn('Lewati precache untuk:', url);
        }
      }
    })
  );
  self.skipWaiting();
});

// Tahap Aktivasi: Hapus cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Tahap Fetch: Sajikan langsung dari Cache Storage untuk kecepatan 0.1 detik
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Jangan cache panggilan API ke backend Google Apps Script & Google Drive
  const reqUrl = event.request.url;
  if (reqUrl.includes('script.google.com') || reqUrl.includes('googleusercontent.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Izinkan caching untuk respon normal (status 200) maupun opaque response (CDN luar)
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match('./index.html');
      });
    })
  );
});
