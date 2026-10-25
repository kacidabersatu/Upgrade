/**
 * KACIDA BERSATU - Frontend Engine
 * File: app.js (FIXED)
 */

const AppState = {
  config: null,
  user: null,
  tokoConfig: null,
  activeTab: 'beranda',
  menus: [],
  dashboardData: {}
};

document.addEventListener('DOMContentLoaded', async () => {
  AppState.config = await loadConfig();
  initPwa();
  initTheme();
  checkAuthAndConfig();
  bindGlobalEvents();
});

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration failed:', err);
    });
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('kacida_theme') || 'default';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'malam') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  localStorage.setItem('kacida_theme', theme);
}

function checkAuthAndConfig() {
  const savedToko = localStorage.getItem('kacida_toko_config');
  const savedUser = localStorage.getItem('user_login');

  if (savedToko) {
    AppState.tokoConfig = JSON.parse(savedToko);
    const tokoEl = document.getElementById('headerTokoName');
    if (tokoEl) tokoEl.textContent = AppState.tokoConfig.namaToko || AppState.tokoConfig.kode;
    const badgeEl = document.getElementById('oceanBadge');
    if (badgeEl) badgeEl.classList.remove('hidden');
  }

  if (savedUser) {
    AppState.user = JSON.parse(savedUser);
    renderAppDashboard();
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('mainApp').classList.add('hidden');
}

function renderAppDashboard() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('mainApp').classList.remove('hidden');

  document.getElementById('heroUserName').textContent = AppState.user.nama;
  document.getElementById('heroUserRole').textContent = `${AppState.user.jabatan} - ${AppState.user.namaToko}`;
  if (AppState.user.fotoProfil) {
    document.getElementById('userAvatarHeader').src = AppState.user.fotoProfil;
    document.getElementById('heroUserAvatar').src = AppState.user.fotoProfil;
  }

  const hour = new Date().getHours();
  let greeting = 'Selamat Pagi';
  if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
  else if (hour >= 18) greeting = 'Selamat Malam';
  document.getElementById('greetingText').textContent = greeting;

  logUserActivity('Akses Dashboard Beranda');

  loadDynamicMenus();
  loadDashboardData();
  startCarouselAutoScroll();
  if (window.Modules && typeof Modules.checkShiftReminders === 'function') {
    Modules.checkShiftReminders();
  }
}

// PERBAIKAN: Mengirim payload log tanpa menimpa action 'logActivity'
function logUserActivity(activityDescription) {
  if (!AppState.user) return;
  const isPwa = window.matchMedia('(display-mode: standalone)').matches;
  callApi('logActivity', {
    nik: AppState.user.nik,
    nama: AppState.user.nama,
    jabatan: AppState.user.jabatan,
    kodeToko: AppState.user.kodeToko,
    deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile HP' : 'Desktop PC',
    browser: navigator.userAgent.substring(0, 40),
    isPwa: isPwa,
    resolusi: `${window.innerWidth}x${window.innerHeight}`,
    userAction: activityDescription
  }, 'POST').catch(() => {});
}

async function loadDynamicMenus() {
  try {
    const res = await callApi('getMenus');
    AppState.menus = res.data || [];
    renderMenuGrid(AppState.menus);
  } catch (e) {
    console.error('Menu load error:', e);
  }
}

// Render Menu dengan Dukungan Icon Gambar / URL & FontAwesome
function renderMenuGrid(menus) {
  const container = document.getElementById('menuGridContainer');
  if (!container) return;
  container.innerHTML = '';

  const maxDisplay = 15;
  const visibleMenus = menus.slice(0, maxDisplay);

  visibleMenus.forEach(menu => {
    const btn = document.createElement('div');
    btn.className = 'flex flex-col items-center justify-center p-2.5 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition active:scale-95 cursor-pointer text-center group min-h-[92px]';
    
    // PERBAIKAN: Cek apakah iconUrl berupa URL gambar (http/https) atau class FontAwesome
    const isUrlIcon = menu.iconUrl && (menu.iconUrl.startsWith('http://') || menu.iconUrl.startsWith('https://'));
    const iconHtml = isUrlIcon
      ? `<img src="${menu.iconUrl}" alt="${menu.namaMenu}" class="w-7 h-7 object-contain group-hover:scale-110 transition">`
      : `<i class="${menu.iconUrl || 'fa-solid fa-cube'} text-xl group-hover:scale-110 transition"></i>`;

    btn.innerHTML = `
      <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:bg-emerald-600 group-hover:text-white transition overflow-hidden">
        ${iconHtml}
      </div>
      <span class="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2">${menu.namaMenu}</span>
    `;

    btn.addEventListener('click', () => {
      handleMenuAction(menu);
    });

    container.appendChild(btn);
  });

  // Tombol 16: "Lihat Semua"
  const viewAllBtn = document.createElement('div');
  viewAllBtn.className = 'flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100 transition active:scale-95 cursor-pointer text-center min-h-[92px]';
  viewAllBtn.innerHTML = `
    <div class="w-11 h-11 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center mb-1.5">
      <i class="fa-solid fa-table-cells text-xl"></i>
    </div>
    <span class="text-[11px] font-bold text-slate-600">Lihat Semua</span>
  `;
  viewAllBtn.addEventListener('click', () => {
    showAllMenusModal(menus);
  });
  container.appendChild(viewAllBtn);
}

// PERBAIKAN: Implementasi fungsi showAllMenusModal yang sebelumnya menyebabkan ReferenceError
function showAllMenusModal(menus) {
  let modal = document.getElementById('allMenusModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'allMenusModal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl">
        <div class="flex items-center justify-between border-b pb-3 mb-4">
          <div class="flex items-center gap-2">
            <i class="fa-solid fa-grid-2 text-emerald-600 text-lg"></i>
            <h3 class="text-base font-black text-slate-800">Seluruh Menu Navigasi</h3>
          </div>
          <button onclick="document.getElementById('allMenusModal').classList.add('hidden')" class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div class="mb-3">
          <input type="text" id="searchAllMenuInput" placeholder="Cari nama menu..." class="w-full px-4 py-2.5 bg-slate-50 border rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500">
        </div>
        <div id="allMenusGrid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 overflow-y-auto flex-1 p-1">
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('searchAllMenuInput').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      renderAllMenusList(AppState.menus.filter(m => m.namaMenu.toLowerCase().includes(q)));
    });
  }

  renderAllMenusList(menus);
  modal.classList.remove('hidden');
}

function renderAllMenusList(menus) {
  const grid = document.getElementById('allMenusGrid');
  if (!grid) return;
  grid.innerHTML = '';

  menus.forEach(menu => {
    const isUrlIcon = menu.iconUrl && (menu.iconUrl.startsWith('http://') || menu.iconUrl.startsWith('https://'));
    const iconHtml = isUrlIcon
      ? `<img src="${menu.iconUrl}" alt="${menu.namaMenu}" class="w-6 h-6 object-contain">`
      : `<i class="${menu.iconUrl || 'fa-solid fa-cube'} text-lg"></i>`;

    const item = document.createElement('div');
    item.className = 'flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer text-center transition';
    item.innerHTML = `
      <div class="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center mb-2 shadow-sm">
        ${iconHtml}
      </div>
      <span class="text-[11px] font-bold text-slate-700 leading-tight">${menu.namaMenu}</span>
    `;
    item.addEventListener('click', () => {
      document.getElementById('allMenusModal').classList.add('hidden');
      handleMenuAction(menu);
    });
    grid.appendChild(item);
  });
}

// PERBAIKAN: Menangani pembukaan modul internal & Link Tujuan Eksternal
async function handleMenuAction(menu) {
  const menuName = typeof menu === 'string' ? menu : menu.namaMenu;
  const linkTujuan = typeof menu === 'object' ? (menu.linkTujuan || '') : '';

  // 1. Kirim hitungan klik ke backend agar menu otomatis bergeser ke posisi awal
  callApi('trackMenuClick', { menuName }, 'POST').catch(() => {});
  logUserActivity(`Membuka: ${menuName}`);

  // 2. Jika menu memiliki link eksternal (Google Sheets, Link Web, Portal, dll)
  if (linkTujuan && (linkTujuan.startsWith('http://') || linkTujuan.startsWith('https://'))) {
    window.open(linkTujuan, '_blank');
    return;
  }

  // 3. Routing ke modul modal internal yang sesuai
  const lower = menuName.toLowerCase();

  if (lower.includes('exp') || lower.includes('ceklis green')) {
    Modules.openCeklisExp();
  } else if (lower.includes('serah terima') || lower.includes('akhir shift')) {
    Modules.openSerahTerima();
  } else if (lower.includes('simulasi ikt') || lower.includes('monitoring ikt') || lower.includes('acv psm')) {
    Modules.openSimulasiIkt();
  } else if (lower.includes('bon') || lower.includes('struk') || lower.includes('konversi')) {
    Modules.openCipherStruk();
  } else if (lower.includes('kwh')) {
    Modules.openMonitoringKwh();
  } else if (lower.includes('tabungan')) {
    Modules.openTabunganku();
  } else if (lower.includes('kas area')) {
    Modules.openKasArea();
  } else if (lower.includes('donasi')) {
    Modules.openDonasiArea();
  } else {
    Swal.fire({
      icon: 'info',
      title: menuName,
      text: 'Menu ini aktif. Jika ini link dokumen atau spreadsheet, pastikan kolom Link Tujuan di Sheet Menu_Navigasi sudah diisi dengan link URL lengkap (https://...).',
      confirmButtonColor: '#059669'
    });
  }
}

async function runManualSync() {
  const modal = document.getElementById('syncModal');
  const bar = document.getElementById('syncProgressBar');
  const percentText = document.getElementById('syncPercent');
  const statusText = document.getElementById('syncStatusText');

  modal.classList.remove('hidden');

  const steps = [
    { p: 20, msg: 'Memeriksa otentikasi & koneksi cloud...' },
    { p: 45, msg: 'Membaca pembaruan data spreadsheet master...' },
    { p: 70, msg: 'Memperbarui cache lokal & kalkulasi IKT...' },
    { p: 90, msg: 'Menyusun ulang posisi menu terpopuler...' },
    { p: 100, msg: 'Sinkronisasi berhasil diselesaikan!' }
  ];

  for (let step of steps) {
    bar.style.width = `${step.p}%`;
    percentText.textContent = `${step.p}%`;
    statusText.textContent = step.msg;
    await new Promise(r => setTimeout(r, 380));
  }

  await loadDashboardData();
  await loadDynamicMenus();

  setTimeout(() => {
    modal.classList.add('hidden');
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Data Berhasil Disinkronkan!',
      showConfirmButton: false,
      timer: 2000
    });
  }, 500);
}

async function loadDashboardData() {
  if (!AppState.tokoConfig) return;
  const store = AppState.tokoConfig.kode;
  const role = AppState.user ? AppState.user.jabatan : '';

  try {
    const [harianRes, iktRes] = await Promise.all([
      callApi('getSalesHarian', { storeCode: store, userRole: role }),
      callApi('getIKT', { storeCode: store, userRole: role })
    ]);

    renderSalesChart(harianRes.data);
    renderIktGauge(iktRes.data);
  } catch (err) {
    console.log('Error dashboard metrics:', err);
  }
}

function renderSalesChart(harian) {
  const ctx = document.getElementById('salesHarianChart');
  if (!ctx || !harian || !harian.list) return;

  const labels = harian.list.slice(-7).map(item => String(item.tanggal).substring(0, 5));
  const actuals = harian.list.slice(-7).map(item => item.actual / 1000000);
  const targets = harian.list.slice(-7).map(item => item.target / 1000000);

  if (window.salesChartInstance) window.salesChartInstance.destroy();

  window.salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Aktual (Juta Rp)',
          data: actuals,
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2
        },
        {
          label: 'Target (Juta Rp)',
          data: targets,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 1.5,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: { y: { beginAtZero: false } }
    }
  });
}

function renderIktGauge(ikt) {
  if (!ikt) return;
  const tfVal = Math.round((ikt.timeFaktor || 0) * 100);
  const acvVal = Math.round(ikt.indicators?.netSales?.acv || 0);
  document.getElementById('kpiIktVal').textContent = `${acvVal}%`;
  document.getElementById('kpiIktStatus').textContent = ikt.indicators?.netSales?.status || 'OK';
  document.getElementById('timeFaktorVal').textContent = `${tfVal}%`;
}

function startCarouselAutoScroll() {
  const c = document.getElementById('kpiCarousel');
  if (!c) return;
  setInterval(() => {
    if (c.scrollLeft >= c.scrollWidth - c.clientWidth - 10) {
      c.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      c.scrollBy({ left: 240, behavior: 'smooth' });
    }
  }, 4500);
}

function bindGlobalEvents() {
  const gearBtn = document.getElementById('gearConfigBtn');
  if (gearBtn) {
    gearBtn.addEventListener('click', () => {
      document.getElementById('tokoConfigModal').classList.remove('hidden');
    });
  }

  const closeTokoBtn = document.getElementById('closeTokoModalBtn');
  if (closeTokoBtn) {
    closeTokoBtn.addEventListener('click', () => {
      document.getElementById('tokoConfigModal').classList.add('hidden');
    });
  }

  const confirmBtn = document.getElementById('confirmTokoBtn');
  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const inputKode = document.getElementById('inputTokoCode').value.trim().toUpperCase();
      if (!inputKode) return;

      try {
        const res = await callApi('getMasterUser', {}, 'GET', true);
        const matched = res.data.find(u => String(u['KODE']).trim().toUpperCase() === inputKode);

        if (matched) {
          document.getElementById('tokoPreviewCard').classList.remove('hidden');
          document.getElementById('prevNamaToko').textContent = matched['NAMA TOKO'];
          document.getElementById('prevWilayah').textContent = matched['WILAYAH'];
          document.getElementById('prevJamOpr').textContent = matched['JAM OPR'];
          AppState.tempTokoConfig = {
            kode: matched['KODE'],
            namaToko: matched['NAMA TOKO'],
            wilayah: matched['WILAYAH'],
            jamOpr: matched['JAM OPR']
          };
        } else {
          Swal.fire('Tidak Ditemukan', 'Kode Toko tidak terdaftar di Master_User.', 'warning');
        }
      } catch (e) {}
    });
  }

  const saveTokoBtn = document.getElementById('saveTokoBtn');
  if (saveTokoBtn) {
    saveTokoBtn.addEventListener('click', () => {
      if (!AppState.tempTokoConfig) {
        Swal.fire('Perhatian', 'Silakan klik Confirm terlebih dahulu.', 'info');
        return;
      }
      localStorage.setItem('kacida_toko_config', JSON.stringify(AppState.tempTokoConfig));
      AppState.tokoConfig = AppState.tempTokoConfig;
      const headerToko = document.getElementById('headerTokoName');
      if (headerToko) headerToko.textContent = AppState.tokoConfig.namaToko;
      document.getElementById('tokoConfigModal').classList.add('hidden');
      Swal.fire('Tersimpan!', 'Konfigurasi toko berhasil diperbarui di HP/Desktop.', 'success');
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const nik = document.getElementById('loginNikInput').value.trim();
      if (!AppState.tokoConfig) {
        Swal.fire('Konfigurasi Toko Kosong', 'Silakan klik icon Gerigi di pojok kanan atas untuk setting Kode Toko terlebih dahulu.', 'warning');
        return;
      }

      try {
        const res = await callApi('login', { nik, storeCode: AppState.tokoConfig.kode }, 'POST', true);
        AppState.user = res.session;
        localStorage.setItem('user_login', JSON.stringify(res.session));
        renderAppDashboard();
      } catch (err) {}
    });
  }

  const syncBtn = document.getElementById('syncManualBtn');
  if (syncBtn) syncBtn.addEventListener('click', runManualSync);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Swal.fire({
        title: 'Konfirmasi Keluar',
        text: 'Apakah Anda yakin ingin logout dari sesi ini?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#e11d48',
        confirmButtonText: 'Ya, Keluar'
      }).then(res => {
        if (res.isConfirmed) {
          localStorage.removeItem('user_login');
          AppState.user = null;
          showLoginScreen();
        }
      });
    });
  }
}
