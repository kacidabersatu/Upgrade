/**
 * KACIDA BERSATU - Client-Side API Layer
 * File: api.js
 */

const Api = {
  // Ganti dengan URL Google Apps Script Web App hasil deployment Anda
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbyLDGtG7gWb5lfZh9bB5aEz4LoM5mlnHP7BY7q7XntIiIVAd4FBnfjgKvBPm0gF_AjsIg/exec",

  /**
   * Mengirim permintaan aman ke backend Web App
   */
  async request(action, params = {}) {
    const session = App.getSession();
    const token = session ? session.token : null;

    const payload = {
      action: action,
      token: token,
      storeCode: session ? session.kodeToko : null,
      ...params
    };

    try {
      const response = await fetch(this.WEB_APP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const json = await response.json();
      if (!json.success) {
        throw new Error(json.error || "Terjadi kesalahan pada backend Apps Script.");
      }
      return json.data;
    } catch (error) {
      console.warn(`[Api.request] Gagal eksekusi '${action}':`, error.message);
      throw error;
    }
  }
};
