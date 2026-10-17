# Kacida Bersatu — Portal Performa & Operasional Retail

Aplikasi Progressive Web App (PWA) terpadu operasional retail yang menghubungkan spreadsheet Google Sheets sebagai basis data real-time dengan antarmuka pengguna responsif (PC dan ponsel).

## Fitur Utama
1. **15 Menu Inti Lengkap**: Ceklis EXP, Serah Terima, Plan Mastershift, Belanja Karyawan, Simulasi GM RP IKT, Sales MTD, Sales Harian, Monitoring IKT, Konversi No Bon/Struk, Penawaran Langsung, Rekap PSM Kasir, Monitoring Sales OPR, Monitoring KWH, Catatan Return, dan Scan Barcode.
2. **Navigasi Dinamis**: Menu tambahan dari sheet `Menu_Navigasi` otomatis digabung dengan menu bawaan.
3. **Chat AI Groq**: Integrasi model AI `llama-3.3-70b-versatile` dengan konteks data toko pengguna.
4. **Ekspor Sejati**: Ekspor data ke format `.xlsx` (Excel) dan `.pdf`.
5. **Mode PWA**: Dapat dipasang di Android, iOS, Windows, dan macOS dengan dukungan offline cache.

## Langkah Pemasangan

### 1. Backend Apps Script
1. Buka Google Sheets database Anda.
2. Pilih menu **Extensions > Apps Script**.
3. Buat berkas-berkas `.gs` (`Config.gs`, `Security.gs`, `SpreadsheetService.gs`, `ReportService.gs`, `AiService.gs`, dan `Code.gs`) lalu rekatkan kode yang disediakan sebelumnya.
4. Simpan dan klik **Deploy > New Deployment**.
5. Pilih **Web App**, set *Execute as* ke **Me**, dan *Who has access* ke **Anyone**.
6. Salin URL Web App yang dihasilkan.

### 2. Frontend GitHub Pages
1. Unggah seluruh berkas frontend (`index.html`, `styles.css`, `app.js`, `api.js`, `manifest.json`, `sw.js`) ke repositori GitHub.
2. Buka `api.js` dan ganti nilai `WEB_APP_URL` dengan URL Apps Script Anda.
3. Aktifkan **GitHub Pages** melalui **Settings > Pages > Branch: main / root**.
4. Aplikasi siap digunakan secara daring.
