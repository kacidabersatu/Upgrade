# KACIDA BERSATU — Portal Performa & Operasional Retail

Aplikasi portal web operasional retail berbasis Progressive Web App (PWA) yang terhubung langsung dengan Google Apps Script dan Google Spreadsheet.

## Struktur Direktori (GitHub)
- `index.html` : Struktur visual utama (Mockup 100% cocok untuk Desktop & Mobile)
- `styles.css` : Tema hijau Alfamart, responsif, dan modal layar penuh
- `app.js` : Logika interaksi, Chart.js, kamera scanner, dan AI
- `api.js` : Komunikasi fetch ke endpoint Web App Google Apps Script
- `sw.js` : Service worker PWA untuk akses offline ringan
- `manifest.json` : Konfigurasi instalasi aplikasi di HP Android/iOS/Desktop

## Langkah Aktivasi
1. Buka file `api.js`.
2. Ganti `PASTE_LINK_EXEC_ANDA_DI_SINI` dengan URL Web App dari Google Apps Script Anda.
3. Commit dan Push seluruh file ini ke repositori GitHub Anda.
4. Buka menu **Settings** > **Pages** di repositori GitHub, pilih branch `main`, lalu klik **Save**.
5. Akses website melalui link GitHub Pages yang disediakan.
