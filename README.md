# KACIDA BERSATU — Portal Performa & Operasional Retail

> **Slogan:** *Bersama Kita Kuat*  
> **Identitas Visual:** Hijau Tua `#022A18`, Hijau Segar `#0A8A4B`, Latar `#F0FDF4`, Sudut Membulat 16px, Tipografi Poppins.

Aplikasi web berbasis Progressive Web App (PWA) dan serverless backend Google Apps Script yang mengintegrasikan performa ritel harian, monitoring indikator bisnis (IKT), kontrol operasional gerai, pemindai barcode kamera, serta kecerdasan buatan (*Groq AI*) langsung terhubung ke database Google Spreadsheet.

---

## 1. STRUKTUR ARSITEKTUR FILE PROYEK
kacida-bersatu/
├── Code.gs # Backend Google Apps Script (Spreadsheet API, Auth, Groq AI, Drive Upload)
├── index.html # Markup Antarmuka Desktop & Mobile + 15 Modal Fitur Layar Penuh
├── Styles.css # Desain Visual 100% Persis Mockup (Palet Hijau Retail, Responsive Breakpoint)
├── api.js # Frontend Network Gateway (CORS, Offline Cache, Request Dispatcher)
├── app.js # Controller Logika Bisnis, Perhitungan Ritel, Chart.js & Barcode Scanner
├── manifest.json # Konfigurasi PWA Standalone (Android / iOS / Desktop)
├── sw.js # Service Worker & Strategi Caching Offline
├── README.md # Panduan Instalasi, Konfigurasi, Deployment & Pengujian
└── LICENSE # Lisensi Perangkat Lunak MIT
---

## 2. SPESIFIKASI DATABASE GOOGLE SPREADSHEET

Sistem membaca langsung struktur asli dari 6 sheet database utama:

1. **`Master_User`**:
   - Kolom: `NIK`, `NAMA`, `JABATAN`, `NAMA TOKO`, `FOTO PROFIL (Url)`
   - Ekstraksi kode toko menggunakan ekspresi reguler `\b[A-Z0-9]{4}\b` (contoh: `2J16`, `X041`, `2J7K`).
2. **`Menu_Navigasi`**:
   - Kolom: `Nama Menu`, `Link Tujuan`, `Status Tampil`, `Urutan`, `Icon URL`
   - Berfungsi menyuntikkan menu pintasan dinamis ke dalam antarmuka.
3. **`Ikt`**:
   - Kolom: `NAMA TOKO`, `TARGET PROFIT`, `ACTUAL PROFIT`, `ACV PROFIT`, `KET PROFIT`, `TARGET NET SALES`, `ACTUAL NET SALES`, `ACV SALES`, `KET SALES`, `TARGET GM%`, `ACTUAL GM%`, `ACV GM`, `KET GM`, `TARGET GM RP`, `ACT GM RP`, `ACV GM RP`, `KET`
4. **`YTD_Sales`**:
   - Kolom: `BULAN`, `TANGGAL`, `NAMA TOKO`, `SALES 2024`, `STD 2024`, `APC 2024`, `SALES 2025`, `STD 2025`, `APC 2025`, `SALES 2026`, `STD 2026`, `APC 2026`
5. **`Sales_Harian`**:
   - Kolom: `TANGGAL`, `NAMA TOKO`, `BULAN LALU`, `TARGET`, `ACTUAL`, `ACTUAL STD`, `ACTUAL APC`, `GAP TARGET`, `NSB`, `% NSB`, `OOS %`, `GROSS MARGIN`
6. **`Penawaran_Langsung`**:
   - Kolom: `RANK`, `KODE`, `STORE NAME`, `TARGET PSM`, `TARGET PWP`, `TARGET SERBA GRATIS`, `TARGET APC`, `AKTUAL PSM`, `AKTUAL PWP`, `AKTUAL SERBA GRATIS`, `AKTUAL APC`, `ACV PSM`, `ACV PWP`, `ACV SERBA GRATIS`, `ACV APC`, `TOTAL ACV`, `POINT DASHBOARD`

> **Sheet Operasional Otomatis:** Sheet pendukung seperti `CeklisExp_Rak`, `CeklisExp_Input`, `Serah_Terima`, `Plan_MasterShift`, `Belanja_Karyawan`, `Sales_Opr_0607`, `Sales_Opr_2223`, `Monitoring_KWH`, `Rekap_PSM_Kasir`, `Catatan_Return`, `Scan_Barang`, `Kalender_Agenda`, `Session_Log`, dan `Audit_Log` dibuat otomatis oleh backend jika belum ada di spreadsheet.

---

## 3. LANGKAH DEPLOYMENT & PEMASANGAN

### A. Konfigurasi Backend (Google Apps Script)
1. Buka spreadsheet database Anda di browser.
2. Klik menu **Ekstensi** > **Apps Script**.
3. Hapus kode default, lalu salin dan tempel seluruh isi file **`Code.gs`**.
4. Buka menu **Setelan Proyek** (ikon gerigi) di bilah kiri Apps Script.
5. Pada bagian **Properti Skrip**, klik **Tambahkan properti skrip**:
   - Properti: `GROQ_API_KEY`
   - Nilai: `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`
6. Klik tombol **Terapkan (Deploy)** di pojok kanan atas > **Penerapan Baru (New Deployment)**:
   - Pilih jenis penerapan: **Aplikasi Web (Web App)**.
   - Deskripsi: `Kacida Bersatu v1.0.0 Production`.
   - Jalankan sebagai: **Saya (Email pemilik skrip)**.
   - Siapa yang memiliki akses: **Siapa saja (Anyone)** *(Wajib agar GitHub Pages dapat berkomunikasi tanpa kendala CORS)*.
7. Klik **Terapkan** dan salin **URL Aplikasi Web** yang dihasilkan (format: `https://script.google.com/macros/s/.../exec`).

### B. Konfigurasi Frontend (GitHub Pages)
1. Buat repositori baru di GitHub (contoh: `kacida-bersatu`).
2. Unggah file-file frontend berikut ke branch utama (`main`):
   - `index.html`
   - `Styles.css`
   - `api.js`
   - `app.js`
   - `manifest.json`
   - `sw.js`
   - `README.md`
   - `LICENSE`
3. Buka file **`api.js`**, perbarui konstanta `DEFAULT_WEBAPP_URL` dengan URL Web App Apps Script yang Anda peroleh dari langkah A.7:
   ```javascript
   DEFAULT_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbwPq.../exec"
