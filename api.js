/**
 * ============================================================================
 * KACIDA BERSATU — API Layer (api.js)
 * Jembatan Komunikasi Frontend GitHub Pages dengan Google Apps Script Backend
 * ============================================================================
 */

const KacidaAPI = {
  config: null,

  async init() {
    try {
      const res = await fetch('./config.json');
      this.config = await res.json();
    } catch (e) {
      console.warn("Gagal memuat config.json, menggunakan fallback internal:", e);
      this.config = {
        gasApiUrl: "",
        adminWaUrl: "https://wa.me/6285862719780?text=Halo%20Admin%20Kacida%20Bersatu"
      };
    }
  },

  getAuth() {
    const raw = localStorage.getItem('kacida_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  setAuth(data) {
    localStorage.setItem('kacida_session', JSON.stringify(data));
  },

  clearAuth() {
    localStorage.removeItem('kacida_session');
    localStorage.removeItem('kacida_cached_dashboard');
  },

  /**
   * Mengirim request ke Web App Google Apps Script
   */
  async request(action, payload = {}) {
    if (!this.config) await this.init();

    const auth = this.getAuth();
    const requestBody = {
      action: action,
      auth: auth ? { nik: auth.user.nik, token: auth.token } : {},
      payload: payload
    };

    // Jika offline dan bukan login, ambil dari cache lokal
    if (!navigator.onLine && action !== 'LOGIN') {
      const cached = localStorage.getItem('kacida_cache_' + action);
      if (cached) {
        return JSON.parse(cached);
      }
      throw new Error("Perangkat Anda sedang offline dan data belum tersimpan di cache.");
    }

    try {
      // Gunakan mode text/plain untuk melewati preflight CORS GAS yang ketat
      const response = await fetch(this.config.gasApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error("Server merespon dengan status: " + response.status);
      }

      const json = await response.json();

      // Simpan cache sukses lokal untuk dukungan PWA offline
      if (json && json.success) {
        localStorage.setItem('kacida_cache_' + action, JSON.stringify(json));
      }

      return json;
    } catch (err) {
      console.error("API Request Error:", err);
      // Fallback cache saat fetch gagal
      const cached = localStorage.getItem('kacida_cache_' + action);
      if (cached) return JSON.parse(cached);
      throw err;
    }
  },

  // Helper Aksi Spesifik
  async login(nik) {
    if (!this.config) await this.init();
    const res = await fetch(this.config.gasApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'LOGIN', nik: String(nik).trim() })
    });
    return await res.json();
  },

  async getInitialData() {
    return await this.request('GET_INITIAL_DATA');
  },

  async syncManual() {
    return await this.request('SYNC_ALL');
  },

  async askAI(prompt, history) {
    return await this.request('AI_CHAT', { prompt, history });
  }
};
