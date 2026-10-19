const CACHE_NAME = 'kacida-bersatu-cache-v1.0.0';

// Daftar Aset Kritis yang disimpan di Cache lokal
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  // Gambar & Aset Visual Utama
  'https://lh3.googleusercontent.com/d/15CaPCEZgcdzO_xf7r2HSimuW5I1KnJIR', // Logo
  'https://lh3.googleusercontent.com/d/1xAINOGLsjRaFc1CVc8ZonDzgwlL6Lt5i', // Watermark
  'https://lh3.googleusercontent.com/d/16LWQVS2khktL1miWFSAzMnHU_tf0blDa', // Hero BG
  'https://lh3.googleusercontent.com/d/1T-e5lMua-WeSj7VhHy7BE1m8-ukONs4J', // Identitas Toko
  'https://lh3.googleusercontent.com/d/13s7CfV9C0h6NXGZQzA79AdbuycKiFRc9'  // BG Login
];

// 1. Event: Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Menyiapkan cache aset Kacida Bersatu...');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Event: Activate (Bersihkan cache versi lawas)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Menghapus cache usang:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Event: Fetch
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Jangan pernah cache permintaan POST (misal ke Google Apps Script)
  if (request.method !== 'GET') {
    return;
  }

  // Permintaan ke Google Apps Script / Groq API: Network Only
  if (url.hostname.includes('script.google.com') || url.hostname.includes('api.groq.com')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          JSON.stringify({
            status: 'offline',
            message: 'Perangkat Anda sedang offline. Mohon periksa kembali sambungan internet.'
          }),
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
      })
    );
    return;
  }

  // Aset Statis & Font: Cache First, fallback ke Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        // Simpan salinan ke cache jika respons valid
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback jika file HTML diminta saat offline
        if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// 4. Sinkronisasi Background & Push Notif Fallback
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
