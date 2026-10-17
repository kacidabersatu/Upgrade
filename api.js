/**
 * ============================================================================
 * KACIDA BERSATU — API CLIENT LAYER
 * File: api.js
 * ============================================================================
 */

const Api = {
  config: null,

  async init() {
    try {
      const res = await fetch("./config.json");
      this.config = await res.json();
    } catch (e) {
      console.warn("Fallback local config:", e);
      this.config = {
        apiUrl: "https://script.google.com/macros/s/AKfycbx_DEMO/exec",
        superAdminNik: "14125034"
      };
    }
  },

  async call(action, payload = {}) {
    // 1. Cek Mode Demo
    if (localStorage.getItem("kacida_demo_mode") === "true") {
      return this.mockDemoResponse(action, payload);
    }

    const url = this.config ? this.config.apiUrl : "";
    const requestData = {
      action: action,
      ...payload
    };

    try {
      // POST ke Google Apps Script Web App
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8" // Mengakomodasi CORS Apps Script
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
      // Fallback response offline
      return {
        status: "error",
        message: "Koneksi ke server terputus atau offline. Menampilkan data lokal terakhir."
      };
    }
  },

  // Mock data demo jika user menekan "Login Demo"
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
          default:
            resolve({ status: "success", message: "Aksi demo tersimulasi.", data: [] });
        }
      }, 400);
    });
  }
};
