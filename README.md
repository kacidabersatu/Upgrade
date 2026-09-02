# 🚀 Kacida Bersatu Pro - Progressive Web App (PWA)

**Kacida Bersatu Pro** adalah aplikasi web berbasis *Progressive Web App* (PWA) yang dirancang untuk menyediakan layanan terpadu, penyampaian informasi/banner dinamis, sistem notifikasi push, serta pencatatan log pengguna secara *realtime* terintegrasi dengan Google Apps Script (Google Sheets).

---

## 🌟 Fitur Utama

- **📱 Full PWA & Support Offline**: Dapat diinstal di layar utama (Android/iOS/Desktop) dan dapat berjalan secara offline untuk halaman statis menggunakan *Service Worker*.
- **🔐 Keamanan & Otentikasi NIK**: Validasi NIK pengguna yang tersimpan secara lokal di `localStorage` dan terverifikasi dengan server backend.
- **🎨 Dynamic UI & Custom Banner**: Carousel banner promo/pemberitahuan otomatis dan grid menu dinamis yang terhubung ke backend.
- **🔔 Sistem Notifikasi Ganda**:
  - *Push Notification* tingkat sistem (dapat diterima meskipun aplikasi ditutup).
  - *In-App Pop-Up* interaktif dengan animasi pengguna.
- **📊 Laporan & Log Otomatis**: Melaporkan status instalasi PWA dan izin notifikasi perangkat secara otomatis ke Google Apps Script.
- **⭐ Survei Kepuasan**: Modal penilai rating bintang (1–5) dan masukan saran berbasis frekuensi penggunaan aplikasi.

---

## 📁 Struktur Proyek

```text
.
├── index.html        # Antarmuka utama (UI), CSS Styling, dan logika JS
├── manifest.json     # Konfigurasi identitas PWA, warna tema, dan ikon
├── sw.js             # Service Worker untuk Caching, Offline, dan Push Notification
└── README.md         # Dokumentasi proyek
