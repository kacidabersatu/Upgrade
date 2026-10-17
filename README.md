# 🚀 KACIDA BERSATU — Portal Performa & Operasional Retail

> **Slogan:** *Bersama Kita Kuat*  
> **Target:** 100% Fidelity Visual & Functional PWA Retail System (Desktop PC & Smartphone).

---

## 📁 Struktur Berkas Proyek

```
kacida-bersatu/
├── Code.gs             # Backend Google Apps Script (Engine Spreadsheet, DB Migration, RBAC, LockService)
├── AiService.gs        # Layanan AI Groq API dengan Llama-3.3-70b & Store Isolation
├── index.html          # Antarmuka Single Page Application (15 Menu, Modals Fullscreen, Desktop/Mobile)
├── styles.css          # Design System, Responsif Desktop/HP, Tema Siang/Malam/Default, Watermark
├── app.js              # Business logic, state management, SweetAlert, formula perhitungannya
├── api.js              # Lapisan transport AJAX lintas origin ke Web App Apps Script
├── config.json         # Konfigurasi publik client-side
├── manifest.json       # PWA Application Manifest
├── sw.js               # Service Worker & Offline Fallback Caching
└── README.md           # Dokumentasi Pemasangan & Pengujian
