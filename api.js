/**
 * ============================================================================
 * KACIDA BERSATU — API CLIENT LAYER (TERINTEGRASI & FIX)
 * File: api.js
 * ============================================================================
 */

const Api = {
  // Gunakan URL deployment asli Anda sebagai default utama
  config: {
    apiUrl: "https://script.google.com/macros/s/AKfycbwMrq1R3L8MXT0TH_BG_ZN8MrtQTfq6SxVEV5Vj0DmLDu1qT7UYWQaGeqbVTIA8VaafhA/exec",
    superAdminNik: "14125034"
  },

  async init() {
    try {
      const res = await fetch("./config.json?v=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        // Hanya ganti jika URL di config.json valid dan bukan teks placeholder
        if (json.apiUrl && !json.apiUrl.includes("GANTI_DENGAN")) {
          this.config.apiUrl = json.apiUrl;
        }
        if (json.superAdminNik) {
          this.config.superAdminNik = json.superAdminNik;
        }
      }
    } catch (e) {
      console.warn("Memakai konfigurasi default internal:", e);
    }
  },

  async call(action, payload = {}) {
    // 1. CEK MODE DEMO DULU (Jalankan instan tanpa request server)
    if (localStorage.getItem("kacida_demo_mode") === "true") {
      return this.mockDemoResponse(action, payload);
    }

    const url = this.config.apiUrl;

    const requestData = {
      action: action,
      ...payload
    };

    try {
      // Gunakan text/plain agar Google Apps Script tidak menolak CORS
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error(`API Call failed [${action}]:`, error);
      return {
        status: "error",
        message: "Gagal terhubung ke Google Apps Script. Pastikan setelan deployment 'Who has access' adalah 'Anyone'."
      };
    }
  },

  // Mock data responsif untuk Mode Demo
  mockDemoResponse(action, payload) {
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (action) {
          case "login":
            resolve({
              status: "success",
              message: "Login Demo Berhasil",
              user: {
                nik: "12345678",
                nama: "Budi Santoso (Demo)",
                jabatan: "Chief Of Store",
                role: "Chief of Store",
                namaToko: "2J16 - CARINGIN KULON",
                kodeToko: "2J16",
                fotoProfil: "",
                poinTotal: 120,
                rankArea: "#5",
                pendingApprovals: 2,
                isSuperAdmin: false
              }
            });
            break;
          case "syncDashboard":
            resolve({
              status: "success",
              timestamp: new Date().toLocaleTimeString("id-ID"),
              data: {
                salesHMin1: 15830750,
                iktSummary: { acvSales: "92%", acvGm: "88%", acvNetProfit: "80%" },
                penawaranSummary: { pointDashboard: "1.250", rank: "5", totalAcv: "76%" },
                pendingApprovals: 2
              }
            });
            break;
          case "chatAi":
            resolve({
              status: "success",
              reply: "Halo Budi! Ini adalah simulasi asisten AI Kacida Bersatu pada Mode Demo. Data toko 2J16 menunjukkan sales harian H-1 mencapai Rp 15,8 Jt. Ada yang ingin dianalisis lebih lanjut?"
            });
            break;
          default:
            resolve({ status: "success", message: "Aksi demo tersimulasi.", data: [] });
        }
      }, 250);
    });
  }
};
