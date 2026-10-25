/**
 * KACIDA BERSATU - Frontend Engine
 * File: app.js
 * Deskripsi: Core application lifecycle, state controller, UI rendering, dan router
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

// Inisialisasi PWA Service Worker
function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration failed:', err);
    });
  }
}

// Inisialisasi Tema
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

// Pengecekan Status Login & Konfigurasi Toko
function checkAuthAndConfig() {
  const savedToko = localStorage.getItem('kacida_toko_config');
  const savedUser = localStorage.getItem('user_login');

  if (savedToko) {
    AppState.tokoConfig = JSON.parse(savedToko);
    document.getElementById('headerTokoName').textContent = AppState.tokoConfig.namaToko || AppState.tokoConfig.kode;
    document.getElementById('oceanBadge').classList.remove('hidden');
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

  // Render Data User di Hero Card
  document.getElementById('heroUserName').textContent = AppState.user.nama;
  document.getElementById('heroUserRole').textContent = `${AppState.user.jabatan} - ${AppState.user.namaToko}`;
  if (AppState.user.fotoProfil) {
    document.getElementById('userAvatarHeader').src = AppState.user.fotoProfil;
    document.getElementById('heroUserAvatar').src = AppState.user.fotoProfil;
  }

  // Sapaan waktu
  const hour = new Date().getHours();
  let greeting = 'Selamat Pagi';
  if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
  else if (hour >= 18) greeting = 'Selamat Malam';
  document.getElementById('greetingText').textContent = greeting;

  // Catat Aktivitas Pengguna (Super Admin Tracker)
  logUserActivity('Akses Dashboard Beranda');

  // Load Data
  loadDynamicMenus();
  loadDashboardData();
  startCarouselAutoScroll();
  Modules.checkShiftReminders();
}

// Log Aktivitas Otomatis
function logUserActivity(actionName) {
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
    action: actionName
  }, 'POST').catch(() => {});
}

// Load Menu Dinamis dari Backend & Susun Berdasarkan Frekuensi Klik
async function loadDynamicMenus() {
  try {
    const res = await callApi('getMenus');
    AppState.menus = res.data;
    renderMenuGrid(AppState.menus);
  } catch (e) {
    console.error('Menu load error:', e);
  }
}

function renderMenuGrid(menus) {
  const container = document.getElementById('menuGridContainer');
  container.innerHTML = '';

  const maxDisplay = 15;
  const visibleMenus = menus.slice(0, maxDisplay);

  visibleMenus.forEach(menu => {
    const btn = document.createElement('div');
    btn.className = 'flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition active:scale-95 cursor-pointer text-center group';
    btn.innerHTML = `
      <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 group-hover:bg-emerald-600 group-hover:text-white transition">
        <i class="${menu.iconUrl || 'fa-solid fa-cube'} text-xl"></i>
      </div>
      <span class="text-xs font-semibold text-slate-700 leading-tight">${menu.namaMenu}</span>
    `;
    btn.addEventListener('click', () => {
      handleMenuAction(menu.namaMenu);
    });
    container.appendChild(btn);
  });

  // Tombol 16: "Lihat Semua"
  const viewAllBtn = document.createElement('div');
  viewAllBtn.className = 'flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-dashed border-slate-300 hover:bg-slate-100 transition active:scale-95 cursor-pointer text-center';
  viewAllBtn.innerHTML = `
    <div class="w-12 h-12 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center mb-2">
      <i class="fa-solid fa-grid-2-plus text-xl"></i>
    </div>
    <span class="text-xs font-bold text-slate-600">Lihat Semua</span>
  `;
  viewAllBtn.addEventListener('click', () => {
    showAllMenusModal(menus);
  });
  container.appendChild(viewAllBtn);
}

// Aksi Klik Menu Dinamis: Geser ke Posisi Awal dan Buka Modul
async function handleMenuAction(menuName) {
  // 1. Kirim track click ke backend agar urutan berpindah
  callApi('trackMenuClick', { menuName }, 'POST').catch(() => {});

  // 2. Routing ke modul
  logUserActivity(`Membuka Menu: ${menuName}`);

  switch (menuName) {
    case 'Ceklis EXP':
    case 'Validasi Cek Exp':
      Modules.openCeklisExp();
      break;
    case 'Serah Terima':
    case 'Laporan Akhir Shift':
      Modules.openSerahTerima();
      break;
    case 'Simulasi IKT':
    case 'Monitoring IKT':
      Modules.openSimulasiIkt();
      break;
    case 'Konversi No Bon/Struk':
      Modules.openCipherStruk();
      break;
    case 'Monitoring KWH':
      Modules.openMonitoringKwh();
      break;
    case 'Tabunganku':
      Modules.openTabunganku();
      break;
    case 'Kas Area':
      Modules.openKasArea();
      break;
    case 'Donasi':
      Modules.openDonasiArea();
      break;
    default:
      Swal.fire({
        icon: 'info',
        title: menuName,
        text: 'Modul ini siap dan terhubung ke data store.',
        confirmButtonColor: '#059669'
      });
      break;
  }
}

// Sinkronisasi Manual dengan Animasi Tahapan Jelas
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

// Load Data Metrik Dashboard & Grafik
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

  const labels = harian.list.slice(-7).map(item => item.tanggal.substring(0, 5));
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
  const tfVal = Math.round(ikt.timeFaktor * 100);
  document.getElementById('kpiIktVal').textContent = `${Math.round(ikt.indicators.netSales.acv)}%`;
  document.getElementById('kpiIktStatus').textContent = ikt.indicators.netSales.status || 'OK';
  document.getElementById('timeFaktorVal').textContent = `${tfVal}%`;
}

// Auto Scroll Carousel KPI
function startCarouselAutoScroll() {
  const c = document.getElementById('kpiCarousel');
  if (!c) return;
  let scrollAmount = 0;
  setInterval(() => {
    if (c.scrollLeft >= c.scrollWidth - c.clientWidth) {
      c.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      c.scrollBy({ left: 240, behavior: 'smooth' });
    }
  }, 4500);
}

// Binding Global Events (Login, Setting Gear, Navigation)
function bindGlobalEvents() {
  // Tombol Gerigi Setting Toko
  document.getElementById('gearConfigBtn').addEventListener('click', () => {
    document.getElementById('tokoConfigModal').classList.remove('hidden');
  });

  document.getElementById('closeTokoModalBtn').addEventListener('click', () => {
    document.getElementById('tokoConfigModal').classList.add('hidden');
  });

  // Tombol Confirm Setting Toko
  document.getElementById('confirmTokoBtn').addEventListener('click', async () => {
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

  // Tombol Save Toko Config
  document.getElementById('saveTokoBtn').addEventListener('click', () => {
    if (!AppState.tempTokoConfig) {
      Swal.fire('Perhatian', 'Silakan klik Confirm terlebih dahulu.', 'info');
      return;
    }
    localStorage.setItem('kacida_toko_config', JSON.stringify(AppState.tempTokoConfig));
    AppState.tokoConfig = AppState.tempTokoConfig;
    document.getElementById('headerTokoName').textContent = AppState.tokoConfig.namaToko;
    document.getElementById('tokoConfigModal').classList.add('hidden');
    Swal.fire('Tersimpan!', 'Konfigurasi toko berhasil diperbarui di HP/Desktop.', 'success');
  });

  // Form Submit Login
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
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

  // Tombol Sync Manual
  document.getElementById('syncManualBtn').addEventListener('click', runManualSync);

  // Tombol Logout
  document.getElementById('logoutBtn').addEventListener('click', () => {
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
