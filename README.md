# KACIDA BERSATU — Portal Performa & Operasional Retail

Aplikasi Progressive Web App (PWA) profesional berbasis Google Apps Script & Google Spreadsheet sebagai backend database, serta GitHub Pages sebagai frontend hosting.

---

## 🛠️ Langkah Deployment & Pemasangan

### 1. Deployment Backend (Google Apps Script)
1. Buka [Google Apps Script](https://script.google.com/).
2. Buat Proyek Baru dengan nama `Kacida Bersatu Backend`.
3. Buat file script berikut sesuai dengan kode yang ada di dokumentasi:
   - `Code.gs`
   - `Config.gs`
   - `Security.gs`
   - `SpreadsheetService.gs`
   - `ReportService.gs`
   - `AiService.gs`
4. Klik **Deploy** > **New Deployment**.
5. Pilih **Select type** > **Web app**.
6. Konfigurasi Deployment:
   - **Execute as**: `Me (Email Anda)`
   - **Who has access**: `Anyone` (Siapa Saja)
7. Klik **Deploy**, beri izin otorisasi Google.
8. Salin **Web App URL** yang dihasilkan.

### 2. Pengaturan Rahasia (Script Properties)
1. Di Google Apps Script, buka **Project Settings** (ikon roda gigi).
2. Di bagian **Script Properties**, tambahkan properti:
   - `Property`: `GROQ_API_KEY`
   - `Value`: `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`

### 3. Deployment Frontend (GitHub Pages)
1. Buka file `api.js` pada repositori GitHub Anda.
2. Ganti nilai `CONFIG_PUBLIC.APPS_SCRIPT_URL` dengan **Web App URL** yang Anda salin pada langkah 1.
3. Commit dan Push seluruh file (`index.html`, `styles.css`, `app.js`, `api.js`, `manifest.json`, `sw.js`, `README.md`).
4. Buka **Settings** repositori GitHub > **Pages**.
5. Pada bagian **Branch**, pilih `main` atau `master` dan simpan.
6. Aplikasi Web Anda kini aktif dan siap dipasang sebagai PWA!

---

## 🔐 Keamanan & Hak Akses Role

1. **Area Coordinator**: Mengakses seluruh toko binaan.
2. **Chief of Store**: Mengakses toko sendiri, melakukan approval belanja & validasi rak.
3. **Assistant Chief of Store**: Mengakses fitur operasional toko.
4. **Crew**: Mengisi operasional harian & laporan shift.
5. **Super Admin (NIK: 14125034)**: Mengakses Audit Log dan pemantauan sistem secara penuh.

---

## 📞 Kontak Bantuan Admin
Apabila terdapat kendala teknis atau kebutuhan reset login, hubungi Admin melalui WhatsApp:
[085862719780](https://wa.me/6285862719780)
