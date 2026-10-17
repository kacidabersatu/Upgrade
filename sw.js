/**
 * ============================================================================
 * KACIDA BERSATU — PWA SERVICE WORKER
 * File: sw.js
 * Strategi: Stale-While-Revalidate untuk Aset Statis, Network-First untuk API
 * ============================================================================
 */

const CACHE_NAME = 'kacida-bersatu-cache-v2.5';

// Daftar Aset Kritis yang Dicache untuk Penggunaan Offline
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://lh3.googleusercontent.com/d/1gLnfmRQsyrHAmuo1xiyulHEKfg1iYk0-',
  'https://lh3.googleusercontent.com/d/1dROWFJnnEIzxJeEJlpmsMkih9ppnGy7V',
  'https://lh3.googleusercontent.com/d/13s7CfV9C0h6NXGZQzA79AdbuycKiFRc9'
];

// Event Install: Pre-cache aset utama
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mengunduh & mencache aset aplikasi...');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[Service Worker] Beberapa aset eksternal gagal dicache saat install:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Event Activate: Bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache versi lama:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Event Fetch: Network interceptor
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jangan cache permintaan POST atau request ke endpoint Google Apps Script / AI
  if (event.request.method !== 'GET' || requestUrl.hostname.includes('script.google.com') || requestUrl.hostname.includes('api.groq.com')) {
    return; // Serahkan langsung ke jaringan internet
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Ambil dari cache jika tersedia, sambil memvalidasi ke jaringan (Stale-While-Revalidate)
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Jika offline dan aset tidak ada di cache, kirim fallback sederhana jika halaman html
        if (event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });

      return cachedResponse || fetchPromise;
    })
  );
});
