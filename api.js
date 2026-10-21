/**
 * ==========================================================================
 * KACIDA BERSATU — Portal Performa & Operasional Retail
 * Frontend API Gateway & Transport Layer (api.js)
 * Version: 1.0.0 Production Enterprise
 * ==========================================================================
 */

const API_CONFIG = {
  // Ganti URL di bawah ini dengan URL Deployment Web App Google Apps Script Anda:
  DEFAULT_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbzkft_AD8Kesf2uPcl_YdnX40szjuQyd5pFixRxdpO97gHnJnq32y39laiXt5ws23jh_g/exec",
  STORAGE_KEYS: {
    WEBAPP_URL: "kacida_webapp_url",
    SESSION_TOKEN: "kacida_session_token",
    USER_PROFILE: "kacida_user_profile",
    DASHBOARD_CACHE: "kacida_dashboard_cache",
    ACTIVE_STORE: "kacida_active_store",
    OFFLINE_QUEUE: "kacida_offline_queue"
  },
  TIMEOUT_MS: 30000
};

class KacidaApiClient {
  constructor() {
    this.baseUrl = localStorage.getItem(API_CONFIG.STORAGE_KEYS.WEBAPP_URL) || API_CONFIG.DEFAULT_WEBAPP_URL;
    this.token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.SESSION_TOKEN) || "";
    this.currentUser = null;
    this.isOnline = navigator.onLine;

    // Inisialisasi pendengar status jaringan
    window.addEventListener("online", () => {
      this.isOnline = true;
      if (typeof updateNetworkBadgeUI === "function") updateNetworkBadgeUI(true);
      this.processOfflineQueue();
    });

    window.addEventListener("offline", () => {
      this.isOnline = false;
      if (typeof updateNetworkBadgeUI === "function") updateNetworkBadgeUI(false);
    });

    // Pulihkan profil pengguna jika ada
    const savedUser = localStorage.getItem(API_CONFIG.STORAGE_KEYS.USER_PROFILE);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = null;
      }
    }
  }

  setWebappUrl(url) {
    if (!url) return;
    this.baseUrl = url.trim();
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.WEBAPP_URL, this.baseUrl);
  }

  saveSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.SESSION_TOKEN, token);
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
    if (user.storeCode) {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACTIVE_STORE, user.storeCode);
    }
  }

  clearSession() {
    this.token = "";
    this.currentUser = null;
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.DASHBOARD_CACHE);
  }

  getActiveStoreCode() {
    return localStorage.getItem(API_CONFIG.STORAGE_KEYS.ACTIVE_STORE) || (this.currentUser ? this.currentUser.storeCode : "");
  }

  setActiveStoreCode(storeCode) {
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.ACTIVE_STORE, storeCode);
  }

  /**
   * Inti Pengiriman Permintaan POST ke Google Apps Script
   */
  async request(action, payload = {}, options = { useCacheFallback: false }) {
    if (!this.baseUrl || this.baseUrl.includes("EXAMPLE_DEPLOYMENT_ID")) {
      console.warn("Kacida API: URL Web App Google Apps Script belum dikonfigurasi.");
    }

    const requestBody = {
      action: action,
      token: this.token,
      nik: this.currentUser ? this.currentUser.nik : (payload.nik || ""),
      storeCode: payload.storeCode || this.getActiveStoreCode(),
      ...payload
    };

    // Jika sedang offline dan diizinkan menggunakan cache lokal
    if (!this.isOnline && options.useCacheFallback) {
      const cached = localStorage.getItem(API_CONFIG.STORAGE_KEYS.DASHBOARD_CACHE);
      if (cached) {
        return { status: "success", isOfflineCache: true, data: JSON.parse(cached) };
      }
      throw new Error("Koneksi perangkat offline dan cache tidak ditemukan.");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // Kompatibel dengan redirect CORS Apps Script
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.status === "unauthorized") {
        this.clearSession();
        if (typeof showSessionExpiredNotification === "function") {
          showSessionExpiredNotification();
        }
        throw new Error(result.message || "Sesi login kedaluwarsa.");
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        throw new Error("Permintaan server melebihi batas waktu (Timeout 30 detik). Silakan periksa jaringan Anda.");
      }

      // Simpan mutasi ke antrean offline jika jaringan terputus
      if (!this.isOnline && !action.startsWith("get") && action !== "login") {
        this.enqueueOfflineMutation(action, requestBody);
        return { status: "queued", message: "Perangkat offline. Transaksi tersimpan dan akan disinkronkan otomatis saat online." };
      }

      throw error;
    }
  }

  // Antrean Offline Sync
  enqueueOfflineMutation(action, data) {
    const queue = JSON.parse(localStorage.getItem(API_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE) || "[]");
    queue.push({ action, data, timestamp: new Date().toISOString() });
    localStorage.setItem(API_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  async processOfflineQueue() {
    const rawQueue = localStorage.getItem(API_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE);
    if (!rawQueue) return;

    const queue = JSON.parse(rawQueue);
    if (queue.length === 0) return;

    console.log(`Memproses ${queue.length} transaksi tertunda saat kembali online...`);
    const remainingQueue = [];

    for (const item of queue) {
      try {
        await this.request(item.action, item.data);
      } catch (e) {
        console.error("Gagal sinkronisasi antrean offline:", item, e);
        remainingQueue.push(item);
      }
    }

    localStorage.setItem(API_CONFIG.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(remainingQueue));
    if (remainingQueue.length === 0 && typeof Swal !== "undefined") {
      Swal.fire({
        icon: "success",
        title: "Sinkronisasi Berhasil",
        text: "Seluruh data transaksi offline berhasil tersimpan ke Google Spreadsheet.",
        timer: 3000,
        showConfirmButton: false
      });
    }
  }

  // ========================================================================
  // 1. ENDPOINTS: AUTHENTIKASI & INITIAL DATA
  // ========================================================================

  async login(nik) {
    const res = await this.request("login", { nik: String(nik).trim() });
    if (res.status === "success") {
      this.saveSession(res.token, res.user);
    }
    return res;
  }

  async getInitialDashboardData(storeCode) {
    const activeCode = storeCode || this.getActiveStoreCode();
    const res = await this.request("getInitialDashboardData", { storeCode: activeCode }, { useCacheFallback: true });
    if (res.status === "success" && !res.isOfflineCache) {
      localStorage.setItem(API_CONFIG.STORAGE_KEYS.DASHBOARD_CACHE, JSON.stringify(res));
    }
    return res;
  }

  async syncManual() {
    return await this.request("syncManual");
  }

  // ========================================================================
  // 2. ENDPOINTS: MENU 1 CEKLIS EXP
  // ========================================================================

  async getCeklisExpData(storeCode) {
    return await this.request("getCeklisExpData", { storeCode });
  }

  async saveCeklisExpRak(rakData) {
    return await this.request("saveCeklisExpRak", { data: rakData });
  }

  async submitChecklistRak(data) {
    return await this.request("submitChecklistRak", { data });
  }

  async approveCeklisExpRak(rakId, decision) {
    return await this.request("approveCeklisExpRak", { rakId, decision });
  }

  async deleteCeklisExpRak(rakId) {
    return await this.request("deleteCeklisExpRak", { rakId });
  }

  async saveCeklisExpItem(itemData) {
    return await this.request("saveCeklisExpItem", { data: itemData });
  }

  async markExpExecuted(itemId) {
    return await this.request("markExpExecuted", { itemId });
  }

  async deleteCeklisExpItem(itemId) {
    return await this.request("deleteCeklisExpItem", { itemId });
  }

  // ========================================================================
  // 3. ENDPOINTS: MENU 2 SERAH TERIMA
  // ========================================================================

  async getSerahTerima(storeCode) {
    return await this.request("getSerahTerima", { storeCode });
  }

  async saveSerahTerima(data) {
    return await this.request("saveSerahTerima", { data });
  }

  async deleteSerahTerima(id) {
    return await this.request("deleteSerahTerima", { id });
  }

  // ========================================================================
  // 4. ENDPOINTS: MENU 3 PLAN MASTERSHIFT
  // ========================================================================

  async getMasterShift(storeCode, month, year) {
    return await this.request("getMasterShift", { storeCode, month, year });
  }

  async saveMasterShift(storeCode, month, year, schedule) {
    return await this.request("saveMasterShift", { storeCode, month, year, schedule });
  }

  // ========================================================================
  // 5. ENDPOINTS: MENU 4 BELANJA KARYAWAN
  // ========================================================================

  async getBelanjaKaryawan(storeCode) {
    return await this.request("getBelanjaKaryawan", { storeCode });
  }

  async saveBelanjaKaryawan(data) {
    return await this.request("saveBelanjaKaryawan", { data });
  }

  async approveBelanjaKaryawan(id, decision, reason) {
    return await this.request("approveBelanjaKaryawan", { id, decision, reason });
  }

  async deleteBelanjaKaryawan(id) {
    return await this.request("deleteBelanjaKaryawan", { id });
  }

  // ========================================================================
  // 6. ENDPOINTS: MENU 6 & 7 (SALES MTD & SALES HARIAN)
  // ========================================================================

  async getSalesMTDDetail(storeCode, month) {
    return await this.request("getSalesMTDDetail", { storeCode, month });
  }

  async getSalesHarianDetail(storeCode, startDate, endDate) {
    return await this.request("getSalesHarianDetail", { storeCode, startDate, endDate });
  }

  // ========================================================================
  // 7. ENDPOINTS: MENU 11 REKAP PSM KASIR
  // ========================================================================

  async getRekapPSMKasir(storeCode, month) {
    return await this.request("getRekapPSMKasir", { storeCode, month });
  }

  async saveRekapPSMKasir(data) {
    return await this.request("saveRekapPSMKasir", { data });
  }

  async deleteRekapPSMKasir(id) {
    return await this.request("deleteRekapPSMKasir", { id });
  }

  // ========================================================================
  // 8. ENDPOINTS: MENU 12 SALES OPR (0607 & 2223)
  // ========================================================================

  async getSalesOpr(storeCode, shiftType) {
    return await this.request("getSalesOpr", { storeCode, shiftType });
  }

  async saveSalesOpr(data) {
    return await this.request("saveSalesOpr", { data });
  }

  async deleteSalesOpr(id) {
    return await this.request("deleteSalesOpr", { id });
  }

  // ========================================================================
  // 9. ENDPOINTS: MENU 13 MONITORING KWH
  // ========================================================================

  async getMonitoringKWH(storeCode) {
    return await this.request("getMonitoringKWH", { storeCode });
  }

  async saveMonitoringKWH(data) {
    return await this.request("saveMonitoringKWH", { data });
  }

  async deleteMonitoringKWH(id) {
    return await this.request("deleteMonitoringKWH", { id });
  }

  // ========================================================================
  // 10. ENDPOINTS: MENU 14 CATATAN RETURN
  // ========================================================================

  async getCatatanReturn(storeCode, subTab) {
    return await this.request("getCatatanReturn", { storeCode, subTab });
  }

  async saveCatatanReturn(data) {
    return await this.request("saveCatatanReturn", { data });
  }

  async deleteCatatanReturn(id) {
    return await this.request("deleteCatatanReturn", { id });
  }

  // ========================================================================
  // 11. ENDPOINTS: MENU 15 SCAN BARANG
  // ========================================================================

  async getScanBarang(storeCode) {
    return await this.request("getScanBarang", { storeCode });
  }

  async saveScanBarang(data) {
    return await this.request("saveScanBarang", { data });
  }

  async deleteScanBarang(id) {
    return await this.request("deleteScanBarang", { id });
  }

  // ========================================================================
  // 12. ENDPOINTS: KALENDER AGENDA
  // ========================================================================

  async getAgendaKalender(storeCode, month, year) {
    return await this.request("getAgendaKalender", { storeCode, month, year });
  }

  async saveAgendaKalender(data) {
    return await this.request("saveAgendaKalender", { data });
  }

  async deleteAgendaKalender(id) {
    return await this.request("deleteAgendaKalender", { id });
  }

  // ========================================================================
  // 13. ENDPOINTS: CHAT AI GROQ & GOOGLE DRIVE PHOTO UPLOAD
  // ========================================================================

  async chatGroqAI(prompt, history = []) {
    return await this.request("chatGroqAI", { prompt, history });
  }

  async uploadPhotoFile(file) {
    if (!file) throw new Error("File foto tidak boleh kosong.");
    const base64Data = await this.fileToBase64(file);
    return await this.request("uploadFotoDrive", {
      base64Data: base64Data,
      fileName: file.name,
      mimeType: file.type
    });
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // ========================================================================
  // 14. ENDPOINTS: AUDIT LOG SUPER ADMIN
  // ========================================================================

  async getAuditLogs(filterDate) {
    return await this.request("getAuditLogs", { filterDate });
  }
}

// Inisialisasi Instance Tunggal API Gateway Global
const api = new KacidaApiClient();
