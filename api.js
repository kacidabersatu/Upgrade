/**
 * ============================================================================
 * KACIDA BERSATU - Portal Performa & Operasional Retail
 * File: api.js (REVISI LENGKAP - ANTI CORS & DUAL GET/POST ENGINE)
 * ============================================================================
 */

// LINK EXEC WEB APP GOOGLE APPS SCRIPT ANDA
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw9Z-RkOouVfhVgJ-j5aixfgnNAkjUtE-FRLnx8CwCNO_G1S6o___szxaUsh-AnRf5y2Q/exec";

// ASET ASLI GOOGLE DRIVE DENGAN DIRECT HIGH-SPEED CDN (ANTI ERROR 400)
const APP_ASSETS = {
  BACKGROUND_LOGIN: "https://lh3.googleusercontent.com/d/13s7CfV9C0h6NXGZQzA79AdbuycKiFRc9",
  LOGO_LOADING: "https://lh3.googleusercontent.com/d/1gLnfmRQsyrHAmuo1xiyulHEKfg1iYk0-",
  WATERMARK: "https://lh3.googleusercontent.com/d/1dROWFJnnEIzxJeEJlpmsMkih9ppnGy7V"
};

const ApiService = {
  /**
   * Helper request GET dengan penanganan Redirect otomatis
   */
  async get(action, params = {}) {
    try {
      const url = new URL(SCRIPT_URL);
      url.searchParams.append("action", action);
      
      // Ambil token sesi aktif jika tersedia
      const sessionToken = sessionStorage.getItem("kacida_session_token");
      if (sessionToken) {
        url.searchParams.append("token", sessionToken);
      }

      for (const key in params) {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      }

      const response = await fetch(url.toString(), {
        method: "GET",
        mode: "cors",
        redirect: "follow"
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API GET ERROR] Action: ${action}`, error);
      return { success: false, message: error.message };
    }
  },

  /**
   * Helper request POST dengan Content-Type text/plain (Anti Preflight CORS Blokir)
   */
  async post(action, payload = {}) {
    try {
      const sessionToken = sessionStorage.getItem("kacida_session_token");
      const bodyData = {
        action: action,
        token: sessionToken || "",
        ...payload
      };

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API POST ERROR] Action: ${action}`, error);
      return { success: false, message: error.message };
    }
  },

  // 1. Autentikasi Login NIK (Menggunakan GET agar kebal blokir CORS pada HP)
  async login(nik) {
    const cleanNik = String(nik).replace(/[^0-9]/g, "").trim();
    return await this.get("login", { nik: cleanNik });
  },

  // 2. Sinkronisasi Keseluruhan Data Beranda & Ringkasan Performa
  async syncAll(storeCode) {
    return await this.get("syncAll", { storeCode: storeCode });
  },

  // 3. Ambil Data MTD Sales
  async getSalesMTD(storeCode) {
    return await this.get("getSalesMTD", { storeCode: storeCode });
  },

  // 4. Ambil Data Sales Harian
  async getSalesHarian(storeCode) {
    return await this.get("getSalesHarian", { storeCode: storeCode });
  },

  // 5. Ambil Data IKT
  async getIKT(storeCode) {
    return await this.get("getIKT", { storeCode: storeCode });
  },

  // 6. Ambil Data Penawaran Langsung
  async getPenawaranLangsung(storeCode) {
    return await this.get("getPenawaranLangsung", { storeCode: storeCode });
  },

  // 7. Ambil Personel Toko
  async getStorePersonnel(storeCode) {
    return await this.get("getStorePersonnel", { storeCode: storeCode });
  },

  // 8. Ambil Data Operasional Berdasarkan Sheet
  async getOperationalData(sheetName) {
    return await this.get("getOperationalData", { sheetName: sheetName });
  },

  // 9. Upload Foto ke Google Drive (Base64)
  async uploadPhoto(base64Data, mimeType, prefix = "BUKTI") {
    return await this.post("uploadPhoto", {
      base64Data: base64Data,
      mimeType: mimeType,
      prefix: prefix
    });
  },

  // 10. Kirim Percakapan ke Groq AI via Backend
  async chatAI(message, history = []) {
    return await this.post("chatAI", {
      message: message,
      history: history
    });
  },

  // 11. Super Admin: Ambil Audit Log
  async getAuditLogs() {
    return await this.get("getAuditLogs");
  }
};
