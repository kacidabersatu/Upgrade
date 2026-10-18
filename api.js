/**
 * KACIDA BERSATU - Api.js
 * Lapisan komunikasi HTTP Client untuk menghubungkan Frontend GitHub Pages dengan Backend Google Apps Script.
 */

const CONFIG_PUBLIC = {
  // Masukkan URL Google Apps Script Web App Deployment Anda
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxYOUR_DEPLOYED_SCRIPT_ID/exec"
};

class ApiService {
  static async request(action, payload = {}) {
    const token = localStorage.getItem("kb_token") || "";
    
    const bodyData = {
      action: action,
      token: token,
      payload: payload
    };

    try {
      const response = await fetch(CONFIG_PUBLIC.APPS_SCRIPT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(bodyData)
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status}`);
      }

      const jsonResult = await response.json();
      return jsonResult;
    } catch (error) {
      console.error(`API Error on action [${action}]:`, error);
      return {
        success: false,
        message: "Gagal terhubung ke server Google Apps Script. Periksa koneksi internet Anda."
      };
    }
  }

  static async login(nik) {
    return await this.request("login", { nik: nik });
  }

  static async getDashboardData() {
    return await this.request("get_dashboard_data");
  }

  static async calculateSimulasiGm(params) {
    return await this.request("calculate_simulasi_gm", params);
  }

  static async submitSerahTerima(data) {
    return await this.request("submit_serah_terima", data);
  }

  static async askAi(userMessage) {
    return await this.request("ask_ai", { message: userMessage });
  }
}
