/**
 * KACIDA BERSATU Service Worker - v3.0 Auto Update
 */
const CACHE_NAME = 'kacida-static-v3.0';

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

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Langsung aktif tanpa menunggu browser ditutup
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const url of STATIC_ASSETS) {
        try {
          const req = new Request(url, { mode: url.startsWith('http') ? 'no-cors' : 'cors' });
          const res = await fetch(req);
          await cache.put(req, res);
        } catch (err) {
          console.warn('Lewati asset:', url);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Hapus seluruh cache lama secara otomatis
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const reqUrl = event.request.url;
  // Jangan halangi panggilan ke backend Google Apps Script & Google Drive
  if (reqUrl.includes('script.google.com') || reqUrl.includes('googleusercontent.com')) {
    return;
  }

  // Network First untuk index.html agar perubahan kode selalu termuat langsung
  if (reqUrl.includes('index.html') || reqUrl.endsWith('/Upgrade/') || reqUrl.endsWith('/')) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        const resClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      });
    }).catch(() => caches.match('./index.html'))
  );
});
