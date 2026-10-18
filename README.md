# KACIDA BERSATU — Portal Performa & Operasional Retail

Aplikasi Web App & PWA profesional untuk pengelolaan performa, analitik KPI ritel, dan operasional toko Alfamart.

## 🚀 Panduan Instalasi & Deployment

### 1. Backend: Google Apps Script
1. Buka spreadsheet database Anda.
2. Klik menu **Extensions > Apps Script**.
3. Buat file script berikut sesuai kode yang telah disediakan:
   - `Config.gs`
   - `Security.gs`
   - `SpreadsheetService.gs`
   - `ReportService.gs`
   - `AiService.gs`
   - `Code.gs`
4. Masukkan Script Properties jika diperlukan:
   - `SPREADSHEET_ID`: (Opsional jika script terikat langsung dengan Spreadsheet)
   - `GROQ_API_KEY`: `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`
5. Lakukan deploy:
   - Klik **Deploy > New Deployment**.
   - Pilih jenis: **Web App**.
   - Execute as: **Me**.
   - Who has access: **Anyone** *(Wajib agar GitHub Pages dapat terhubung)*.
   - Salin URL Web App yang dihasilkan (akhiran `/exec`).

### 2. Frontend: GitHub Pages
1. Clone / buat repositori baru di GitHub.
2. Masukkan file:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `api.js`
   - `manifest.json`
   - `sw.js`
3. Buka `api.js`, ganti konstanta `BASE_URL` dengan URL Deployment Apps Script Anda:
   ```javascript
   BASE_URL: "https://script.google.com/macros/s/AKfycb.../exec"
