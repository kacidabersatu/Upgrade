/**
 * ============================================================================
 * KACIDA BERSATU — app.js
 * Engine Penggabungan 15 Menu Inti + Dynamic Menu dari Sheet "Menu_Navigasi"
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  await KacidaAPI.init();
  KacidaApp.init();
});

const KacidaApp = {
  currentUser: null,
  charts: {},
  scannerStream: null,
  dynamicMenus: [],
  isViewAllMenus: false,

  // Definisi 15 Menu Inti Operasional (Wajib & Permanen)
  CORE_MENUS: [
    { id: 'exp', title: 'Ceklis EXP', icon: '📦', icon3d: 'https://img.icons8.com/3d-fluency/94/box.png', modalId: 'modal-menu-exp', badgeId: 'badge-approval-count' },
    { id: 'serah', title: 'Serah Terima', icon: '🤝', icon3d: 'https://img.icons8.com/3d-fluency/94/handshake.png', modalId: 'modal-menu-serah' },
    { id: 'mastershift', title: 'Plan Mastershift', icon: '📅', icon3d: 'https://img.icons8.com/3d-fluency/94/calendar.png', modalId: 'modal-menu-mastershift' },
    { id: 'belanja', title: 'Belanja Karyawan', icon: '🛒', icon3d: 'https://img.icons8.com/3d-fluency/94/shopping-cart.png', modalId: 'modal-menu-belanja' },
    { id: 'simulasi', title: 'Simulasi GM RP', icon: '🧮', icon3d: 'https://img.icons8.com/3d-fluency/94/calculator.png', modalId: 'modal-menu-simulasi' },
    { id: 'mtd', title: 'Sales MTD', icon: '📈', icon3d: 'https://img.icons8.com/3d-fluency/94/bar-chart.png', modalId: 'modal-menu-mtd' },
    { id: 'sales_harian', title: 'Sales Harian', icon: '🏪', icon3d: 'https://img.icons8.com/3d-fluency/94/shop.png', modalId: 'modal-menu-sales-harian' },
    { id: 'ikt', title: 'Monitoring IKT', icon: '🎯', icon3d: 'https://img.icons8.com/3d-fluency/94/bullseye.png', modalId: 'modal-menu-ikt' },
    { id: 'bon', title: 'Konversi Bon', icon: '🔒', icon3d: 'https://img.icons8.com/3d-fluency/94/key.png', modalId: 'modal-menu-bon' },
    { id: 'penawaran', title: 'Penawaran Langsung', icon: '⭐', icon3d: 'https://img.icons8.com/3d-fluency/94/star.png', modalId: 'modal-menu-penawaran' },
    { id: 'psm', title: 'Rekap PSM Kasir', icon: '📝', icon3d: 'https://img.icons8.com/3d-fluency/94/cash-register.png', modalId: 'modal-menu-psm' },
    { id: 'sales_opr', title: 'Sales OPR', icon: '⏰', icon3d: 'https://img.icons8.com/3d-fluency/94/clock.png', modalId: 'modal-menu-sales-opr' },
    { id: 'kwh', title: 'Monitoring KWH', icon: '⚡', icon3d: 'https://img.icons8.com/3d-fluency/94/flash-on.png', modalId: 'modal-menu-kwh' },
    { id: 'return', title: 'Catatan Return', icon: '🚚', icon3d: 'https://img.icons8.com/3d-fluency/94/delivery.png', modalId: 'modal-menu-return' },
    { id: 'scan', title: 'Scan Barang', icon: '📷', icon3d: 'https://img.icons8.com/3d-fluency/94/barcode-scanner.png', modalId: 'modal-menu-scan' }
  ],

  async init() {
    this.setupListeners();
    this.applyTheme(localStorage.getItem('kacida_theme') || 'default');

    const auth = KacidaAPI.getAuth();
    if (auth && auth.user) {
      this.currentUser = auth.user;
      this.showScreen('dashboard');
      this.renderUserInfo();
      this.loadDashboardData();
    } else {
      this.showScreen('login');
    }
  },

  setupListeners() {
    // Form Login
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    // Login Demo
    document.getElementById('btn-login-demo').addEventListener('click', () => {
      document.getElementById('input-nik').value = '14125034';
      this.handleLogin();
    });

    // Sync Manual
    document.getElementById('btn-sync-manual').addEventListener('click', () => this.handleSyncManual());

    // Toggle View All Menus
    const btnToggleAll = document.getElementById('btn-toggle-view-all');
    if (btnToggleAll) {
      btnToggleAll.addEventListener('click', () => {
        this.isViewAllMenus = !this.isViewAllMenus;
        this.renderAllMenusGrid();
        btnToggleAll.innerText = this.isViewAllMenus ? 'Tampilkan Ringkas ▴' : 'Lihat Semua (' + (this.CORE_MENUS.length + this.dynamicMenus.length) + ') ▾';
      });
    }

    // Filter Pencarian Menu
    const searchMenu = document.getElementById('input-search-menu');
    if (searchMenu) {
      searchMenu.addEventListener('input', (e) => {
        this.filterMenus(e.target.value.trim().toLowerCase());
      });
    }

    // Tema
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.applyTheme(e.target.getAttribute('data-theme'));
      });
    });

    // Bon Converter
    const bonInput = document.getElementById('input-bon-converter');
    if (bonInput) {
      bonInput.addEventListener('input', (e) => this.handleBonConverter(e.target.value));
    }

    // Simulasi GM RP IKT
    ['sim-hk', 'sim-jhk', 'sim-t-sales', 'sim-a-sales', 'sim-t-gm', 'sim-a-gm'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => this.calculateSimulasiGM());
    });
  },

  showScreen(screen) {
    document.getElementById('login-screen').style.display = screen === 'login' ? 'flex' : 'none';
    document.getElementById('loading-screen').style.display = screen === 'loading' ? 'flex' : 'none';
    document.getElementById('app-main-layout').style.display = screen === 'dashboard' ? 'flex' : 'none';
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kacida_theme', theme);
    document.querySelectorAll('.theme-opt-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
  },

  async handleLogin() {
    const nik = document.getElementById('input-nik').value.trim();
    if (!nik) {
      Swal.fire('Perhatian', 'Silakan masukkan NIK Anda!', 'warning');
      return;
    }

    this.showScreen('loading');
    document.getElementById('loading-status-text').innerText = 'Memverifikasi NIK Pengguna...';
    document.getElementById('loading-bar-fill').style.width = '50%';

    try {
      const res = await KacidaAPI.login(nik);
      document.getElementById('loading-bar-fill').style.width = '100%';

      if (res && res.success) {
        KacidaAPI.setAuth(res);
        this.currentUser = res.user;
        setTimeout(() => {
          this.showScreen('dashboard');
          this.renderUserInfo();
          this.loadDashboardData();
        }, 400);
      } else {
        this.showScreen('login');
        Swal.fire({
          icon: 'error',
          title: 'Gagal Masuk',
          text: res.message || 'NIK tidak ditemukan di database.',
          footer: '<a href="' + KacidaAPI.config.adminWaUrl + nik + '" target="_blank" style="color:#25d366; font-weight:700;">Hubungi Admin via WhatsApp (085862719780)</a>'
        });
      }
    } catch (err) {
      this.showScreen('login');
      Swal.fire('Koneksi Gagal', 'Pastikan URL Apps Script aktif atau hubungi admin.', 'error');
    }
  },

  renderUserInfo() {
    if (!this.currentUser) return;
    document.getElementById('header-user-name').innerText = this.currentUser.name;
    document.getElementById('header-user-role').innerText = this.currentUser.role;
    document.getElementById('header-store-badge').innerText = this.currentUser.storeName;
    document.getElementById('hero-greeting').innerText = 'Selamat Pagi, ' + this.currentUser.name;

    if (this.currentUser.photoUrl) {
      document.getElementById('header-avatar-img').src = this.currentUser.photoUrl;
    }
  },

  async loadDashboardData() {
    // Render awal menu inti agar UI responsif seketika
    this.renderAllMenusGrid();

    try {
      const res = await KacidaAPI.getInitialData();
      if (res && res.success) {
        const d = res.data;
        this.dynamicMenus = d.dynamicMenus || [];
        this.pendingApprovalCount = d.pendingApprovalCount || 0;

        // Render ulang grid menu dengan integrasi Menu_Navigasi yang masuk
        this.renderAllMenusGrid();
        this.renderKPIs(d);
        this.renderCharts(d);

        // Update tombol count
        const btnToggleAll = document.getElementById('btn-toggle-view-all');
        if (btnToggleAll && !this.isViewAllMenus) {
          btnToggleAll.innerText = 'Lihat Semua (' + (this.CORE_MENUS.length + this.dynamicMenus.length) + ') ▾';
        }
      }
    } catch (e) {
      console.warn("Gagal memuat data dinamis, menggunakan cache lokal:", e);
    }
  },

  /**
   * Render Menggabungkan 15 Menu Inti + Dynamic Menus dari Sheet "Menu_Navigasi"
   */
  renderAllMenusGrid() {
    const gridContainer = document.getElementById('main-menu-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    // Siapkan list item yang akan ditampilkan
    const mergedList = [];

    // 1. Masukkan 15 Core Menu
    this.CORE_MENUS.forEach(menu => {
      mergedList.push({
        type: 'core',
        title: menu.title,
        icon: menu.icon,
        iconUrl: menu.icon3d,
        modalId: menu.modalId,
        badgeId: menu.badgeId || null
      });
    });

    // 2. Masukkan Dynamic Menus dari spreadsheet
    this.dynamicMenus.forEach(dMenu => {
      // Lewati jika nama persis dengan menu inti untuk menghindari duplikasi
      const isDuplicate = this.CORE_MENUS.some(c => c.title.toLowerCase() === dMenu.nama.toLowerCase());
      if (!isDuplicate && dMenu.nama) {
        mergedList.push({
          type: 'dynamic',
          title: dMenu.nama,
          icon: '🔗',
          iconUrl: dMenu.iconUrl,
          link: dMenu.link,
          urutan: dMenu.urutan
        });
      }
    });

    // Batasi 8-12 item jika mode ringkas (tidak view all), atau tampilkan semua
    const itemsToDisplay = this.isViewAllMenus ? mergedList : mergedList.slice(0, 8);

    itemsToDisplay.forEach(item => {
      const card = document.createElement('div');
      card.className = 'menu-item-tile';
      card.setAttribute('data-title', item.title.toLowerCase());

      // Ikon visual (URL gambar dari spreadsheet/icons8 atau fallback emoji)
      const iconHtml = item.iconUrl
        ? `<img src="${item.iconUrl}" class="menu-icon-img" alt="${item.title}" onerror="this.onerror=null; this.src='https://img.icons8.com/3d-fluency/94/link.png';" />`
        : `<div class="menu-icon-wrapper">${item.icon}</div>`;

      // Badge Approval untuk Ceklis EXP
      let badgeHtml = '';
      if (item.badgeId && this.pendingApprovalCount > 0) {
        badgeHtml = `<span class="approval-badge-dot">${this.pendingApprovalCount}</span>`;
      }

      // External link indicator
      const extTag = item.type === 'dynamic' ? `<span class="menu-ext-indicator">↗</span>` : '';

      card.innerHTML = `
        ${badgeHtml}
        ${extTag}
        ${iconHtml}
        <span class="menu-title-text">${item.title}</span>
      `;

      card.addEventListener('click', () => {
        if (item.type === 'core') {
          KacidaApp.openModal(item.modalId);
        } else if (item.type === 'dynamic' && item.link) {
          KacidaApp.openExternalMenu(item.title, item.link);
        }
      });

      gridContainer.appendChild(card);
    });
  },

  filterMenus(keyword) {
    const tiles = document.querySelectorAll('.menu-item-tile');
    tiles.forEach(tile => {
      const title = tile.getAttribute('data-title') || '';
      if (title.includes(keyword)) {
        tile.style.display = 'flex';
      } else {
        tile.style.display = 'none';
      }
    });
  },

  openExternalMenu(title, url) {
    Swal.fire({
      title: title,
      text: 'Membuka portal resmi retail: ' + url.substring(0, 50) + '...',
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#0e6935',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Buka Link ↗',
      cancelButtonText: 'Kembali'
    }).then((result) => {
      if (result.isConfirmed) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  },

  renderKPIs(data) {
    if (data.ikt && data.ikt.indicators && data.ikt.indicators[0]) {
      document.getElementById('kpi-val-ikt').innerText = data.ikt.indicators[0].acv + '%';
    }
    if (data.salesHarian && data.salesHarian.summary) {
      const s = data.salesHarian.summary;
      document.getElementById('kpi-val-sales-mtd').innerText = 'Rp ' + (s.totalActual / 1000000).toFixed(1) + ' Jt';
      document.getElementById('kpi-val-sales-harian').innerText = 'Rp ' + (s.totalActual / 30 / 1000000).toFixed(1) + ' Jt';
    }
    if (data.penawaranLangsung) {
      document.getElementById('kpi-val-penawaran').innerText = data.penawaranLangsung.totalAcv + '%';
    }
  },

  renderCharts(data) {
    const ctxGM = document.getElementById('chart-gauge-gm');
    if (ctxGM) {
      if (this.charts.gm) this.charts.gm.destroy();
      this.charts.gm = new Chart(ctxGM, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [68, 32],
            backgroundColor: ['#107c41', '#e2e8f0'],
            borderWidth: 0
          }]
        },
        options: {
          cutout: '75%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } }
        }
      });
    }
  },

  async handleSyncManual() {
    Swal.fire({
      title: 'Sinkronisasi...',
      text: 'Mengambil performa retail & konfigurasi menu terbaru.',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const res = await KacidaAPI.syncManual();
      Swal.close();
      if (res && res.success) {
        this.dynamicMenus = res.data.dynamicMenus || [];
        this.renderAllMenusGrid();
        this.renderKPIs(res.data);
        Swal.fire({ icon: 'success', title: 'Sinkronisasi Selesai', timer: 1200, showConfirmButton: false });
      }
    } catch (e) {
      Swal.fire('Gagal Sync', e.message, 'error');
    }
  },

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
      if (modalId === 'modal-menu-scan' && this.scannerStream) {
        this.scannerStream.getTracks().forEach(t => t.stop());
      }
    }
  },

  handleBonConverter(val) {
    const map = { '0': 'M', '1': 'O', '2': 'Y', '3': 'D', '4': 'T', '5': 'U', '6': 'H', '7': 'C', '8': 'I', '9': 'K' };
    let clean = String(val).replace(/\D/g, '');
    if (clean.length > 4) clean = clean.substring(clean.length - 4);
    while (clean.length < 4 && clean.length > 0) {
      clean = '0' + clean;
    }
    let res = '';
    for (let char of clean) {
      res += map[char] || char;
    }
    document.getElementById('bon-result-display').innerText = res || '----';
  },

  copyBonResult() {
    const text = document.getElementById('bon-result-display').innerText;
    if (text && text !== '----') {
      navigator.clipboard.writeText(text);
      Swal.fire({ icon: 'success', title: 'Berhasil Disalin!', timer: 900, showConfirmButton: false });
    }
  },

  calculateSimulasiGM() {
    const hk = parseFloat(document.getElementById('sim-hk').value) || 1;
    const jhk = parseFloat(document.getElementById('sim-jhk').value) || 1;
    const tSales = parseFloat(document.getElementById('sim-t-sales').value) || 0;
    const aSales = parseFloat(document.getElementById('sim-a-sales').value) || 0;
    const tGM = (parseFloat(document.getElementById('sim-t-gm').value) || 0) / 100;
    const aGM = (parseFloat(document.getElementById('sim-a-gm').value) || 0) / 100;

    const tGMRp = tSales * tGM;
    const aGMRp = aSales * aGM;
    const gapSales = aSales - tSales;
    const gapGMRp = aGMRp - tGMRp;

    document.getElementById('res-sim-gap-sales').innerText = 'Rp ' + gapSales.toLocaleString('id-ID');
    document.getElementById('res-sim-gap-sales').style.color = gapSales >= 0 ? '#16a34a' : '#dc2626';

    document.getElementById('res-sim-gap-gm').innerText = 'Rp ' + Math.round(gapGMRp).toLocaleString('id-ID');
    document.getElementById('res-sim-gap-gm').style.color = gapGMRp >= 0 ? '#16a34a' : '#dc2626';

    document.getElementById('res-sim-tf').innerText = ((jhk / hk) * 100).toFixed(1) + '%';
  },

  async startBarcodeScanner() {
    const video = document.getElementById('scanner-video');
    try {
      this.scannerStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      video.srcObject = this.scannerStream;
    } catch (e) {
      Swal.fire('Kamera Tidak Terdeteksi', 'Silakan gunakan input nomor barcode manual di bawah.', 'info');
    }
  },

  addBarcodeManual() {
    const code = document.getElementById('input-barcode-manual').value.trim();
    if (!code) return;

    const list = document.getElementById('scanned-items-list');
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${code}</strong></td>
      <td><svg id="bc-${code}"></svg></td>
      <td><input type="number" value="1" min="1" style="width: 60px; padding: 4px;" class="form-control-kacida" /></td>
      <td><button onclick="this.closest('tr').remove()" style="color:red; background:none; border:none; cursor:pointer;">Hapus</button></td>
    `;
    list.prepend(row);
    JsBarcode("#bc-" + code, code, { format: "CODE128", width: 1.5, height: 35, displayValue: false });
    document.getElementById('input-barcode-manual').value = '';
  },

  async sendChatMessage() {
    const input = document.getElementById('ai-chat-input');
    const text = input.value.trim();
    if (!text) return;

    const container = document.getElementById('ai-messages-flow');
    container.innerHTML += `<div style="align-self:flex-end; background:#0e6935; color:#fff; padding:10px 14px; border-radius:12px; margin-bottom:8px; max-width:80%; font-size:14px;">${text}</div>`;
    input.value = '';
    container.scrollTop = container.scrollHeight;

    const typingIndicator = document.createElement('div');
    typingIndicator.innerText = 'Kacida AI sedang memproses...';
    typingIndicator.style.fontSize = '12px';
    typingIndicator.style.color = '#64748b';
    container.appendChild(typingIndicator);

    try {
      const res = await KacidaAPI.askAI(text, []);
      typingIndicator.remove();
      container.innerHTML += `<div style="align-self:flex-start; background:#fff; border:1px solid #e2e8f0; padding:12px 16px; border-radius:12px; margin-bottom:8px; max-width:85%; line-height:1.5; font-size:14px;">${res.answer}</div>`;
      container.scrollTop = container.scrollHeight;
    } catch (e) {
      typingIndicator.remove();
      container.innerHTML += `<div style="color:red; font-size:12px;">Gagal terhubung ke AI.</div>`;
    }
  },

  logout() {
    Swal.fire({
      title: 'Keluar Aplikasi?',
      text: 'Anda harus memasukkan NIK kembali untuk login.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0e6935',
      confirmButtonText: 'Ya, Keluar'
    }).then((res) => {
      if (res.isConfirmed) {
        KacidaAPI.clearAuth();
        location.reload();
      }
    });
  }
};
