/**
 * KACIDA BERSATU - Frontend Engine
 * File: api.js
 * Deskripsi: API Client Layer via fetch() text/plain ke Google Apps Script Web App
 */

let APP_CONFIG = null;

async function loadConfig() {
  if (APP_CONFIG) return APP_CONFIG;
  try {
    const response = await fetch('./config.json');
    APP_CONFIG = await response.json();
    return APP_CONFIG;
  } catch (error) {
    console.error('Gagal memuat config.json:', error);
    // Fallback default
    APP_CONFIG = {
      apiUrl: 'https://script.google.com/macros/s/AKfycbxYOUR_DEPLOYMENT_ID/exec',
      assets: {
        loginBackground: '13s7CfV9C0h6NXGZQzA79AdbuycKiFRc9',
        logoLoading: '1gLnfmRQsyrHAmuo1xiyulHEKfg1iYk0-',
        watermark: '1dROWFJnnEIzxJeEJlpmsMkih9ppnGy7V',
        storeHeader: '1T-e5lMua-WeSj7VhHy7BE1m8-ukONs4J',
        heroBackground: '16LWQVS2khktL1miWFSAzMnHU_tf0blDa'
      }
    };
    return APP_CONFIG;
  }
}

function getLh3Url(fileId) {
  if (!fileId) return '';
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

/**
 * Panggilan API Universal ke Google Apps Script Web App
 */
async function callApi(action, data = {}, method = 'GET', showLoading = false) {
  const cfg = await loadConfig();

  if (showLoading) {
    Swal.fire({
      title: 'Memproses Data...',
      html: '<div class="flex justify-center my-4"><i class="fa-solid fa-spinner fa-spin text-4xl text-emerald-600"></i></div><p class="text-xs text-slate-500">Menghubungkan ke server cloud Kacida...</p>',
      showConfirmButton: false,
      allowOutsideClick: false
    });
  }

  try {
    let url = cfg.apiUrl;
    let options = {};

    if (method.toUpperCase() === 'GET') {
      const queryParams = new URLSearchParams({ action, ...data }).toString();
      url += (url.includes('?') ? '&' : '?') + queryParams;
      options = { method: 'GET' };
    } else {
      // POST dengan text/plain payload untuk bypass preflight CORS GAS
      options = {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({ action, ...data })
      };
    }

    const res = await fetch(url, options);
    const result = await res.json();

    if (showLoading) Swal.close();

    if (!result.success) {
      throw new Error(result.error || 'Terjadi kesalahan sistem backend.');
    }

    return result;
  } catch (err) {
    if (showLoading) Swal.close();
    console.error(`API Error [${action}]:`, err);
    Swal.fire({
      icon: 'error',
      title: 'Kendala Sistem',
      text: err.message || 'Tidak dapat terhubung ke server.',
      confirmButtonColor: '#059669'
    });
    throw err;
  }
}
