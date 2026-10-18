/**
 * KACIDA BERSATU - Portal Performa & Operasional Retail
 * File: api.js
 * Deskripsi: Lapisan komunikasi client-server ke Google Apps Script Web App
 */

const API_CONFIG = {
  // Ganti dengan URL exec hasil Deploy Apps Script Anda:
  BASE_URL: "https://script.google.com/macros/s/AKfycbyzV0gXFdu0NF2itiGtSeuofRXgLNaNMgyA19afL_8b0APJz4HIGNvQXFumQYwxIumWZQ/exec",
  TIMEOUT_MS: 30000
};

const ApiService = {
  getToken() {
    return sessionStorage.getItem("KB_SESSION_TOKEN") || localStorage.getItem("KB_SESSION_TOKEN") || "";
  },

  setToken(token) {
    sessionStorage.setItem("KB_SESSION_TOKEN", token);
    localStorage.setItem("KB_SESSION_TOKEN", token);
  },

  clearToken() {
    sessionStorage.removeItem("KB_SESSION_TOKEN");
    localStorage.removeItem("KB_SESSION_TOKEN");
    sessionStorage.removeItem("KB_USER_DATA");
  },

  getUserData() {
    try {
      return JSON.parse(sessionStorage.getItem("KB_USER_DATA")) || null;
    } catch (e) {
      return null;
    }
  },

  setUserData(user) {
    sessionStorage.setItem("KB_USER_DATA", JSON.stringify(user));
  },

  /**
   * Mengirim request ke Apps Script dengan metode CORS-friendly
   * Menggunakan text/plain POST payload untuk menghindari CORS Preflight issue di GAS
   */
  async request(action, params = {}) {
    if (!navigator.onLine) {
      throw new Error("Perangkat dalam mode Offline. Periksa koneksi internet Anda.");
    }

    const payload = {
      action: action,
      token: this.getToken(),
      ...params
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(API_CONFIG.BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP Error status: ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || "Terjadi kendala saat memproses permintaan.");
      }

      return resJson;
    } catch (error) {
      clearTimeout(timer);
      if (error.name === "AbortError") {
        throw new Error("Koneksi time out. Server Apps Script membutuhkan waktu lebih lama.");
      }
      throw error;
    }
  },

  // Auth
  async login(nik) {
    const res = await this.request("LOGIN", { nik: nik });
    if (res.token) {
      this.setToken(res.token);
      this.setUserData(res.user);
    }
    return res;
  },

  // Master initial sync
  async getInitialData() {
    return await this.request("GET_INITIAL_DATA");
  },

  // Operasional Modals
  async getCeklisRak() { return await this.request("GET_CEKLIS_RAK"); },
  async submitCeklisRak(data) { return await this.request("SUBMIT_CEKLIS_RAK", data); },
  async validateCeklisRak(id, status) { return await this.request("VALIDATE_CEKLIS_RAK", { id, status }); },

  async getAlertExp() { return await this.request("GET_ALERT_EXP"); },
  async submitInputExp(data) { return await this.request("SUBMIT_INPUT_EXP", data); },
  async executeAlertExp(id) { return await this.request("EXECUTE_ALERT_EXP", { id }); },

  async getSerahTerima() { return await this.request("GET_SERAH_TERIMA"); },
  async submitSerahTerima(data) { return await this.request("SUBMIT_SERAH_TERIMA", data); },

  async getPlanMastershift(bulanTahun) { return await this.request("GET_PLAN_MASTERSHIFT", { bulanTahun }); },
  async savePlanMastershift(data) { return await this.request("SAVE_PLAN_MASTERSHIFT", data); },

  async getBelanjaKaryawan() { return await this.request("GET_BELANJA_KARYAWAN"); },
  async submitBelanjaKaryawan(data) { return await this.request("SUBMIT_BELANJA_KARYAWAN", data); },
  async approveBelanjaKaryawan(id, status, alasanReject) { 
    return await this.request("APPROVE_BELANJA_KARYAWAN", { id, status, alasanReject }); 
  },

  async getSalesMtd() { return await this.request("GET_SALES_MTD"); },
  async getSalesHarian() { return await this.request("GET_SALES_HARIAN"); },
  async getIkt() { return await this.request("GET_IKT"); },
  async getPenawaranLangsung() { return await this.request("GET_PENAWARAN_LANGSUNG"); },

  async getRekapPsmKasir() { return await this.request("GET_REKAP_PSM_KASIR"); },
  async saveRekapPsmKasir(data) { return await this.request("SAVE_REKAP_PSM_KASIR", data); },

  async getSalesOpr() { return await this.request("GET_SALES_OPR"); },
  async submitSalesOpr(data) { return await this.request("SUBMIT_SALES_OPR", data); },

  async getMonitoringKwh() { return await this.request("GET_MONITORING_KWH"); },
  async submitMonitoringKwh(data) { return await this.request("SUBMIT_MONITORING_KWH", data); },

  async getCatatanReturn() { return await this.request("GET_CATATAN_RETURN"); },
  async submitCatatanReturn(data) { return await this.request("SUBMIT_CATATAN_RETURN", data); },

  async submitScanBarang(data) { return await this.request("SUBMIT_SCAN_BARANG", data); },

  // Chat AI Groq
  async chatAi(message, history) {
    return await this.request("CHAT_AI", { message, history });
  },

  // Audit Super Admin
  async getAuditLogs() {
    return await this.request("GET_AUDIT_LOGS");
  }
};
