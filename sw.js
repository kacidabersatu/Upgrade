/**
 * ==============================================================================
 * SERVICE WORKER — KACIDA BERSATU PWA
 * Versi Cache: v1.0.1
 * ==============================================================================
 */

const CACHE_NAME = 'kacida-bersatu-cache-v1';

// Asset statis inti yang dicache untuk penggunaan offline dasar
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// 1. INSTALASI: Cache asset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// 2. AKTIVASI: Bersihkan cache versi lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: Strategi Cerdas & Penjaga Keamanan Request API
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // ============================================================================
  // ATURAN KRUSIAL: JANGAN PERNAH MENCEGAT REQUEST BERIKUT!
  // ============================================================================
  
  // 1. Service Worker HANYA boleh mencache request GET.
  // Request POST/PUT/DELETE akan error jika dicegat oleh Cache API.
  if (req.method !== 'GET') {
    return; // Biarkan browser fetch langsung ke internet
  }

  // 2. JANGAN CEGAT endpoint Google Apps Script (/exec)
  // Ini penyebab error TypeError: Failed to fetch di sw.js:45!
  if (url.hostname.includes('script.google.com') || url.hostname.includes('script.googleusercontent.com')) {
    return;
  }

  // 3. JANGAN CEGAT Firebase Realtime Database
  if (url.hostname.includes('firebasedatabase.app') || url.hostname.includes('firebaseio.com')) {
    return;
  }

  // 4. JANGAN CEGAT Google Drive / LH3 / Groq API
  if (url.hostname.includes('drive.google.com') || url.hostname.includes('api.groq.com')) {
    return;
  }

  // ============================================================================
  // STRATEGI CACHE: Network-First dengan Fallback ke Cache untuk Asset Lainnya
  // ============================================================================
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Jika respon valid, salin ke cache untuk offline mode
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Jika internet terputus (offline), ambil dari cache
        const cachedResponse = await caches.match(req);
        if (cachedResponse) {
          return cachedResponse;
        }

        // Jika halaman utama HTML yang gagal dibuka saat offline
        if (req.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
