/**
 * KACIDA BERSATU - Main Frontend Application Logic
 * File: app.js
 */

const App = {
  state: {
    user: null,
    dashboard: null,
    activeModal: null,
    theme: 'default',
    allMenusExpanded: false,
    chatHistory: [],
    scannerStream: null
  },

  // Inisialisasi awal
  init() {
    this.restoreSession();
    this.bindEvents();
  },

  getSession() {
    const raw = localStorage.getItem('kacida_session');
    return raw ? JSON.parse(raw) : null;
  },

  restoreSession() {
    const session = this.getSession();
    if (session && session.token) {
      this.state.user = session;
      this.showDashboard();
      this.triggerManualSync();
    } else {
      this.showLogin();
    }
  },

  bindEvents() {
    // Tombol ESC menutup modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.state.activeModal) {
        this.closeActiveModal();
      }
    });

    // Deteksi status koneksi internet
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  },

  updateOnlineStatus(isOnline) {
    const el = document.getElementById('lblConnectionStatus');
    if (!el) return;
    if (isOnline) {
      el.className = 'online-indicator-badge online';
      el.innerHTML = '<span class="status-dot"></span><span class="status-text">Online</span>';
    } else {
      el.className = 'online-indicator-badge offline';
      el.innerHTML = '<span class="status-dot" style="background:#ef4444"></span><span class="status-text" style="color:#b91c1c">Offline</span>';
    }
  },

  showLogin() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainAppLayout').classList.add('hidden');
  },

  showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainAppLayout').classList.remove('hidden');
    this.renderHeaderUserInfo();
  },

  renderHeaderUserInfo() {
    const u = this.state.user;
    if (!u) return;

    document.getElementById('lblHeaderUserName').innerText = u.nama;
    document.getElementById('lblHeaderUserRole').innerText = u.role;
    document.getElementById('lblHeaderStoreName').innerText = u.namaTokoLengkap || u.kodeToko;

    document.getElementById('lblHeroUserName').innerText = u.nama;
    document.getElementById('lblHeroUserRole').innerText = u.role;
    document.getElementById('lblHeroStoreFull').innerText = u.namaTokoLengkap || u.kodeToko;

    if (u.fotoUrl) {
      document.getElementById('headerUserAvatar').src = u.fotoUrl;
      document.getElementById('heroUserAvatar').src = u.fotoUrl;
    }

    if (u.isSuperAdmin) {
      document.getElementById('sidebarSuperAdminNav').classList.remove('hidden');
    }
  },

  async handleLogin() {
    const nik = document.getElementById('inputNik').value.trim();
    if (!nik) return;

    this.showSyncProgress("Memeriksa kredensial NIK...", 35);
    try {
      const userData = await Api.request('login', { nik: nik });
      this.state.user = userData;
      localStorage.setItem('kacida_session', JSON.stringify(userData));

      this.showSyncProgress("Sinkronisasi data toko...", 85);
      await this.loadDashboardData();
      this.hideSyncProgress();
      this.showDashboard();

      Swal.fire({
        icon: 'success',
        title: 'Berhasil Masuk',
        text: `Selamat datang kembali, ${userData.nama}!`,
        timer: 1600,
        showConfirmButton: false
      });
    } catch (err) {
      this.hideSyncProgress();
      Swal.fire({
        icon: 'error',
        title: 'Gagal Masuk',
        text: err.message || 'NIK tidak valid atau koneksi bermasalah.'
      });
    }
  },

  handleDemoLogin() {
    // Mode demo instan
    document.getElementById('inputNik').value = '14125034';
    this.handleLogin();
  },

  handleLogout() {
    Swal.fire({
      title: 'Konfirmasi Keluar',
      text: 'Apakah Anda yakin ingin keluar dari akun?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#046c38',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Keluar',
      cancelButtonText: 'Batal'
    }).then((res) => {
      if (res.isConfirmed) {
        localStorage.removeItem('kacida_session');
        this.state.user = null;
        this.showLogin();
      }
    });
  },

  async triggerManualSync() {
    this.showSyncProgress("Memeriksa pembaruan database...", 20);
    try {
      await this.loadDashboardData();
      this.showSyncProgress("Menyusun ringkasan KPI & menu...", 80);
      setTimeout(() => {
        this.hideSyncProgress();
        this.renderDashboardUI();
      }, 400);
    } catch (e) {
      this.hideSyncProgress();
      Swal.fire({
        icon: 'warning',
        title: 'Sinkronisasi Parsial',
        text: 'Menggunakan data tersimpan terakhir karena koneksi backend terhambat.'
      });
    }
  },

  async loadDashboardData() {
    const data = await Api.request('getDashboardSummary');
    this.state.dashboard = data;
    localStorage.setItem('kacida_cache_dashboard', JSON.stringify(data));
  },

  showSyncProgress(msg, percent) {
    const el = document.getElementById('syncLoadingScreen');
    el.classList.remove('hidden');
    document.getElementById('syncStatusLabel').innerText = msg;
    document.getElementById('syncProgressText').innerText = percent + '%';
  },

  hideSyncProgress() {
    document.getElementById('syncLoadingScreen').classList.add('hidden');
  },

  renderDashboardUI() {
    const d = this.state.dashboard;
    if (!d) return;

    // 1. KPI Cards
    if (d.kpi) {
      const harian = d.kpi.salesHarian;
      const ikt = d.kpi.ikt;
      const pen = d.kpi.penawaranLangsung;
      const mtd = d.kpi.mtd;

      if (harian && harian.summary) {
        const valJt = (harian.summary.totalActual / 1000000).toFixed(1);
        document.getElementById('kpiValHarian').innerText = `Rp ${valJt} jt`;
        document.getElementById('kpiGrowthHarian').innerText = `▲ ${(harian.summary.growthPercent || 0).toFixed(1)}%`;
      }
      if (ikt && ikt.found) {
        const netSalesAcv = ikt.indicators[0].acvPercent;
        document.getElementById('kpiValIkt').innerText = `${netSalesAcv}%`;
      }
      if (pen && pen.found) {
        document.getElementById('kpiValPenawaran').innerText = `${pen.totalAcv}%`;
        document.getElementById('kpiSubPenawaran').innerText = `Point: ${pen.pointDashboard} | Rank: ${pen.rank}`;
      }
      if (mtd) {
        const valMtdJt = (mtd.totalSales / 1000000).toFixed(1);
        document.getElementById('kpiValMtd').innerText = `Rp ${valMtdJt} jt`;
      }
    }

    // 2. Pending Approval CoS Badge
    if (d.pendingApprovalCount > 0) {
      document.getElementById('cosApprovalAlertPill').classList.remove('hidden');
      document.getElementById('lblPendingApprovalBadge').innerText = d.pendingApprovalCount;
    } else {
      document.getElementById('cosApprovalAlertPill').classList.add('hidden');
    }

    // 3. Render Menu Grid
    this.renderMenuGrid();
  },

  renderMenuGrid() {
    const d = this.state.dashboard;
    const container = document.getElementById('mainMenuGridContainer');
    const sidebarContainer = document.getElementById('sidebarCoreMenuContainer');
    container.innerHTML = '';
    sidebarContainer.innerHTML = '';

    // Gabungkan 15 menu inti dengan menu dinamis dari sheet Menu_Navigasi
    const core = d ? d.coreMenus : [];
    const dynamic = (d && d.dynamicMenus) ? d.dynamicMenus : [];

    core.forEach(m => {
      // Grid item
      const item = document.createElement('div');
      item.className = 'menu-card-item';
      item.onclick = () => this.openModal(m.id);
      item.innerHTML = `
        <div class="menu-icon-square">
          <i class="fa-solid fa-${m.icon}"></i>
        </div>
        <span class="menu-card-name">${m.title}</span>
      `;
      container.appendChild(item);

      // Sidebar item
      const sItem = document.createElement('a');
      sItem.className = 'nav-item';
      sItem.href = 'javascript:void(0)';
      sItem.onclick = () => this.openModal(m.id);
      sItem.innerHTML = `<i class="fa-solid fa-${m.icon}"></i> <span>${m.title}</span>`;
      sidebarContainer.appendChild(sItem);
    });

    // Render Dynamic Menus dari spreadsheet
    dynamic.forEach(dm => {
      const item = document.createElement('div');
      item.className = 'menu-card-item dynamic';
      item.onclick = () => window.open(dm.url, '_blank');
      item.innerHTML = `
        <div class="menu-icon-square" style="background:#fef3c7; color:#d97706;">
          ${dm.iconUrl ? `<img src="${dm.iconUrl}" alt="icon">` : '<i class="fa-solid fa-arrow-up-right-from-square"></i>'}
        </div>
        <span class="menu-card-name">${dm.nama}</span>
      `;
      container.appendChild(item);
    });
  },

  // ================= BUKA DAN KELOLA 15 MODAL =================
  openModal(modalId) {
    this.state.activeModal = modalId;
    const container = document.getElementById('fullModalContainer');
    const titleEl = document.getElementById('modalActiveTitle');
    const bodyEl = document.getElementById('modalActiveContentBody');
    const rightActions = document.getElementById('modalTopRightActionContainer');

    rightActions.innerHTML = '';
    container.classList.remove('hidden');

    switch (modalId) {
      case 'ceklis_exp':
        titleEl.innerText = 'Ceklis EXP Rak & Barang';
        this.renderCeklisExpView(bodyEl, rightActions);
        break;
      case 'serah_terima':
        titleEl.innerText = 'Serah Terima Antar Shift';
        this.renderSerahTerimaView(bodyEl);
        break;
      case 'plan_mastershift':
        titleEl.innerText = 'Plan Mastershift Toko';
        this.renderMastershiftView(bodyEl);
        break;
      case 'belanja_karyawan':
        titleEl.innerText = 'Belanja Karyawan & Approval';
        this.renderBelanjaKaryawanView(bodyEl);
        break;
      case 'simulasi_gm':
        titleEl.innerText = 'Simulasi GM RP IKT';
        this.renderSimulasiGmView(bodyEl);
        break;
      case 'sales_mtd':
        titleEl.innerText = 'Sales MTD (Month to Date)';
        this.renderSalesMtdView(bodyEl, rightActions);
        break;
      case 'sales_harian':
        titleEl.innerText = 'Sales Harian & ACV';
        this.renderSalesHarianView(bodyEl, rightActions);
        break;
      case 'monitoring_ikt':
        titleEl.innerText = 'Monitoring IKT';
        this.renderMonitoringIktView(bodyEl);
        break;
      case 'konversi_bon':
        titleEl.innerText = 'Konversi No Bon/Struk';
        this.renderKonversiBonView(bodyEl);
        break;
      case 'penawaran_langsung':
        titleEl.innerText = 'Penawaran Langsung (PSM/PWP/Serba Gratis)';
        this.renderPenawaranLangsungView(bodyEl);
        break;
      case 'rekap_psm':
        titleEl.innerText = 'Rekap PSM Kasir';
        this.renderRekapPsmView(bodyEl);
        break;
      case 'monitoring_opr':
        titleEl.innerText = 'Monitoring Sales OPR';
        this.renderSalesOprView(bodyEl);
        break;
      case 'monitoring_kwh':
        titleEl.innerText = 'Monitoring KWH Listrik';
        this.renderKwhView(bodyEl);
        break;
      case 'catatan_return':
        titleEl.innerText = 'Catatan Return Barang';
        this.renderCatatanReturnView(bodyEl);
        break;
      case 'scan_barang':
        titleEl.innerText = 'Scan Barcode Barang';
        this.renderScanBarangView(bodyEl);
        break;
      default:
        titleEl.innerText = 'Detail Fitur';
        bodyEl.innerHTML = '<p>Fitur sedang dimuat...</p>';
        break;
    }
  },

  closeActiveModal() {
    this.stopCameraScanner();
    document.getElementById('fullModalContainer').classList.add('hidden');
    this.state.activeModal = null;
  },

  // ----------------------------------------------------------------
  // MODAL 9: KONVERSI NO BON/STRUK (0123456789 -> MOYDTUHC IK)
  // ----------------------------------------------------------------
  renderKonversiBonView(body) {
    body.innerHTML = `
      <div style="max-width: 500px; margin: 40px auto; background: var(--card-bg); padding: 32px; border-radius: 20px; box-shadow: var(--shadow-md); text-align: center;">
        <i class="fa-solid fa-receipt" style="font-size: 48px; color: var(--primary-green); margin-bottom: 16px;"></i>
        <h3 style="margin-bottom: 8px;">Konversi Instan No Bon</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">Masukkan maksimal 4 digit nomor bon kasir</p>
        
        <input type="text" id="inputNoBon" maxlength="4" placeholder="Contoh: 1123" style="width: 100%; height: 56px; font-size: 26px; text-align: center; font-weight: 800; border-radius: 12px; border: 2px solid var(--border-color); outline: none; margin-bottom: 20px; font-family: 'JetBrains Mono', monospace;" oninput="App.executeBonCipher(this.value)">

        <div style="background: #f1f5f9; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
          <span style="font-size: 12px; color: var(--text-muted); font-weight: 700; text-transform: uppercase;">Hasil Konversi:</span>
          <div id="bonCipherResult" style="font-size: 42px; font-weight: 900; color: var(--primary-green); letter-spacing: 6px; font-family: 'JetBrains Mono', monospace; margin-top: 8px;">----</div>
        </div>

        <div style="display: flex; gap: 12px;">
          <button class="btn-primary-action" onclick="App.copyBonResult()" style="margin: 0;"><i class="fa-solid fa-copy"></i> Salin Hasil</button>
          <button class="btn-secondary-demo" onclick="App.resetBonCipher()" style="margin: 0; width: 120px;"><i class="fa-solid fa-rotate-left"></i> Reset</button>
        </div>
      </div>
    `;
  },

  executeBonCipher(val) {
    if (!val) {
      document.getElementById('bonCipherResult').innerText = '----';
      return;
    }
    const clean = val.replace(/\D/g, '');
    const padded = clean.padStart(4, '0');
    const cipherMap = {
      '0': 'M', '1': 'O', '2': 'Y', '3': 'D', '4': 'T',
      '5': 'U', '6': 'H', '7': 'C', '8': 'I', '9': 'K'
    };
    let result = '';
    for (let i = 0; i < padded.length; i++) {
      result += cipherMap[padded[i]] || '';
    }
    document.getElementById('bonCipherResult').innerText = result;
  },

  copyBonResult() {
    const text = document.getElementById('bonCipherResult').innerText;
    if (text === '----') return;
    navigator.clipboard.writeText(text);
    Swal.fire({ icon: 'success', title: 'Tersalin', text: `Hasil konversi ${text} berhasil disalin!`, timer: 1200, showConfirmButton: false });
  },

  resetBonCipher() {
    document.getElementById('inputNoBon').value = '';
    document.getElementById('bonCipherResult').innerText = '----';
  },

  // ----------------------------------------------------------------
  // MODAL 5: SIMULASI GM RP IKT
  // ----------------------------------------------------------------
  renderSimulasiGmView(body) {
    body.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; background: var(--card-bg); padding: 28px; border-radius: 20px; box-shadow: var(--shadow-md);">
        <h3 style="margin-bottom: 20px;"><i class="fa-solid fa-calculator"></i> Kalkulator Simulasi GM RP IKT</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px;">
          <div>
            <label style="font-size: 12px; font-weight: 700;">HK (Hari Kerja Kalender)</label>
            <input type="number" id="simHk" value="26" style="width: 100%; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700;">JHK (Jumlah Hari Kerja Berjalan)</label>
            <input type="number" id="simJhk" value="22" style="width: 100%; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700;">Target Net Sales (Rp)</label>
            <input type="number" id="simTargetSales" value="500000000" style="width: 100%; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700;">Actual Net Sales (Rp)</label>
            <input type="number" id="simActualSales" value="482000000" style="width: 100%; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700;">Target Margin %</label>
            <input type="number" step="0.01" id="simTargetMargin" value="18.5" style="width: 100%; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
          <div>
            <label style="font-size: 12px; font-weight: 700;">Actual Margin %</label>
            <input type="number" step="0.01" id="simActualMargin" value="18.0" style="width: 100%; height: 44px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--border-color);">
          </div>
        </div>

        <button class="btn-primary-action" onclick="App.computeSimulasiGm()"><i class="fa-solid fa-play"></i> Hitung Simulasi</button>

        <div id="simulasiResultBox" style="margin-top: 24px; padding: 20px; background: #f8fafc; border-radius: 14px; border: 1px solid var(--border-color);">
          <!-- Hasil hitung -->
          <p style="text-align: center; color: var(--text-muted);">Klik tombol 'Hitung Simulasi' untuk memproses indikator.</p>
        </div>
      </div>
    `;
  },

  computeSimulasiGm() {
    const hk = parseFloat(document.getElementById('simHk').value) || 1;
    const jhk = parseFloat(document.getElementById('simJhk').value) || 0;
    const tSales = parseFloat(document.getElementById('simTargetSales').value) || 0;
    const aSales = parseFloat(document.getElementById('simActualSales').value) || 0;
    const tMarginPct = parseFloat(document.getElementById('simTargetMargin').value) || 0;
    const aMarginPct = parseFloat(document.getElementById('simActualMargin').value) || 0;

    const acvSales = tSales > 0 ? (aSales / tSales) * 100 : 0;
    const gapSales = aSales - tSales;
    const tMarginRp = tSales * (tMarginPct / 100);
    const aMarginRp = aSales * (aMarginPct / 100);
    const gapMarginRp = aMarginRp - tMarginRp;
    const timeFactor = (jhk / hk) * 100;

    const resBox = document.getElementById('simulasiResultBox');
    resBox.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; text-align: center;">
        <div style="background:#fff; padding:14px; border-radius:10px;">
          <span style="font-size:11px; color:#64748b;">ACV Net Sales</span>
          <h4 style="font-size:20px; font-weight:800; color:${acvSales >= 100 ? '#15803d' : '#b91c1c'};">${acvSales.toFixed(2)}%</h4>
          <span class="status-badge ${acvSales >= 100 ? 'ok' : 'nok'}">${acvSales >= 100 ? 'OK' : 'NOK'}</span>
        </div>
        <div style="background:#fff; padding:14px; border-radius:10px;">
          <span style="font-size:11px; color:#64748b;">Gap Margin Rupiah</span>
          <h4 style="font-size:20px; font-weight:800; color:${gapMarginRp >= 0 ? '#15803d' : '#b91c1c'};">Rp ${Math.round(gapMarginRp).toLocaleString('id-ID')}</h4>
          <span class="status-badge ${gapMarginRp >= 0 ? 'ok' : 'nok'}">${gapMarginRp >= 0 ? 'OK' : 'NOK'}</span>
        </div>
        <div style="background:#fff; padding:14px; border-radius:10px;">
          <span style="font-size:11px; color:#64748b;">Time Factor</span>
          <h4 style="font-size:20px; font-weight:800; color:#0284c7;">${timeFactor.toFixed(1)}%</h4>
          <span style="font-size:11px; color:#64748b;">Hari ${jhk} dari ${hk}</span>
        </div>
      </div>
    `;
  },

  // ----------------------------------------------------------------
  // MODAL 15: SCAN BARANG DENGAN KAMERA / MANUAL
  // ----------------------------------------------------------------
  renderScanBarangView(body) {
    body.innerHTML = `
      <div style="max-width: 700px; margin: 0 auto; background: var(--card-bg); padding: 24px; border-radius: 20px;">
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          <button class="modal-tab-btn active" id="btnTabCam" onclick="App.startCameraScanner()"><i class="fa-solid fa-camera"></i> Buka Kamera</button>
          <button class="modal-tab-btn" onclick="App.stopCameraScanner()"><i class="fa-solid fa-keyboard"></i> Input Manual</button>
        </div>

        <div id="scannerVideoContainer" style="position: relative; width: 100%; height: 260px; background: #000; border-radius: 14px; overflow: hidden; margin-bottom: 20px; display: flex; align-items: center; justify-content: center;">
          <video id="barcodeScannerVideo" style="width: 100%; height: 100%; object-fit: cover;" autoplay playsinline></video>
          <div style="position: absolute; border: 2px dashed #10b981; width: 70%; height: 120px; border-radius: 8px; pointer-events: none;"></div>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
          <input type="text" id="inputManualBarcode" placeholder="Scan atau ketik kode barcode..." style="flex:1; height: 48px; padding: 0 14px; border-radius: 10px; border: 1.5px solid var(--border-color); font-size: 16px; font-weight: 700;">
          <input type="number" id="inputScanQty" value="1" min="1" style="width: 80px; height: 48px; text-align: center; border-radius: 10px; border: 1.5px solid var(--border-color); font-weight: 700;">
          <button class="btn-primary-action" onclick="App.submitScannedBarcode()" style="margin:0; width: 110px;"><i class="fa-solid fa-plus"></i> Tambah</button>
        </div>

        <div style="text-align: center; margin-bottom: 20px; background: #fff; padding: 16px; border-radius: 12px; border: 1px solid var(--border-color);">
          <svg id="liveBarcodeDisplay"></svg>
        </div>

        <div class="table-responsive-wrapper">
          <table class="data-table-custom" id="scannedTableList">
            <thead>
              <tr>
                <th>No</th>
                <th>Barcode</th>
                <th>Qty</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody id="scanTableBody">
              <tr><td colspan="4" style="text-align:center; color:#94a3b8;">Belum ada barcode yang discan.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    JsBarcode("#liveBarcodeDisplay", "8991234567890", { format: "CODE128", height: 50, displayValue: true });
  },

  async startCameraScanner() {
    const video = document.getElementById('barcodeScannerVideo');
    if (!video) return;
    try {
      this.state.scannerStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      video.srcObject = this.state.scannerStream;
    } catch (e) {
      Swal.fire('Izin Kamera', 'Kamera tidak dapat diakses atau diblokir peramban.', 'info');
    }
  },

  stopCameraScanner() {
    if (this.state.scannerStream) {
      this.state.scannerStream.getTracks().forEach(track => track.stop());
      this.state.scannerStream = null;
    }
  },

  submitScannedBarcode() {
    const code = document.getElementById('inputManualBarcode').value.trim();
    const qty = parseInt(document.getElementById('inputScanQty').value) || 1;
    if (!code) return;

    JsBarcode("#liveBarcodeDisplay", code, { format: "CODE128", height: 50, displayValue: true });
    
    // Tambah ke tabel riwayat scan
    const tbody = document.getElementById('scanTableBody');
    if (tbody.children[0] && tbody.children[0].innerText.includes('Belum ada')) {
      tbody.innerHTML = '';
    }
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${tbody.children.length + 1}</td>
      <td style="font-family:'JetBrains Mono'; font-weight:700;">${code}</td>
      <td><b>${qty}</b></td>
      <td><button onclick="this.closest('tr').remove()" style="color:#ef4444; border:none; background:none; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></td>
    `;
    tbody.appendChild(row);

    document.getElementById('inputManualBarcode').value = '';
    document.getElementById('inputScanQty').value = '1';
  },

  // ----------------------------------------------------------------
  // CHAT AI DENGAN GROQ API
  // ----------------------------------------------------------------
  openChatAiModal() {
    this.openModal('chat_ai');
    const titleEl = document.getElementById('modalActiveTitle');
    const bodyEl = document.getElementById('modalActiveContentBody');
    titleEl.innerText = 'Asisten AI Kacida Bersatu';

    bodyEl.innerHTML = `
      <div style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; height: 80vh;">
        <div id="chatMessageFlow" style="flex: 1; overflow-y: auto; padding: 16px; background: var(--card-bg); border-radius: 16px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 14px;">
          <div style="background: #e6f4ea; color: #046c38; padding: 12px 16px; border-radius: 12px; max-width: 80%; align-self: flex-start; font-size: 13px;">
            Halo! Saya asisten retail resmi Kacida Bersatu. Anda bisa menanyakan analisis performa toko Anda, tips operasional rak, hingga mengobrol santai atau bercanda. Ada yang bisa saya bantu?
          </div>
        </div>
        <div style="display: flex; gap: 10px; margin-top: 14px;">
          <textarea id="aiPromptInput" rows="2" placeholder="Tanyakan performa toko, kendala rak, atau ketik santai..." style="flex:1; border-radius: 12px; border: 1.5px solid var(--border-color); padding: 10px 14px; font-size: 14px; outline: none;"></textarea>
          <button class="btn-primary-action" onclick="App.sendAiChat()" style="margin:0; width: 90px; height: auto;"><i class="fa-solid fa-paper-plane"></i></button>
        </div>
      </div>
    `;
  },

  async sendAiChat() {
    const promptInput = document.getElementById('aiPromptInput');
    const text = promptInput.value.trim();
    if (!text) return;

    const flow = document.getElementById('chatMessageFlow');
    
    // Bubble user
    const uBubble = document.createElement('div');
    uBubble.style.cssText = "background: var(--primary-green); color: #fff; padding: 12px 16px; border-radius: 12px; max-width: 80%; align-self: flex-end; font-size: 13px;";
    uBubble.innerText = text;
    flow.appendChild(uBubble);

    promptInput.value = '';
    flow.scrollTop = flow.scrollHeight;

    // Bubble loading AI
    const aiBubble = document.createElement('div');
    aiBubble.style.cssText = "background: #f1f5f9; color: var(--text-main); padding: 12px 16px; border-radius: 12px; max-width: 80%; align-self: flex-start; font-size: 13px;";
    aiBubble.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sedang berpikir...';
    flow.appendChild(aiBubble);
    flow.scrollTop = flow.scrollHeight;

    try {
      const resp = await Api.request('chatAi', {
        prompt: text,
        history: this.state.chatHistory
      });

      aiBubble.innerText = resp.reply;
      this.state.chatHistory.push({ role: 'user', content: text });
      this.state.chatHistory.push({ role: 'assistant', content: resp.reply });
      flow.scrollTop = flow.scrollHeight;
    } catch (err) {
      aiBubble.innerText = "Maaf, terjadi kesalahan saat menghubungi layanan AI: " + err.message;
    }
  },

  // ----------------------------------------------------------------
  // RENDER SALES MTD & SALES HARIAN + EKSPOR XLSX / PDF
  // ----------------------------------------------------------------
  renderSalesMtdView(body, rightActions) {
    const d = this.state.dashboard;
    const mtd = d && d.kpi ? d.kpi.mtd : null;
    const records = mtd ? mtd.records : [];

    rightActions.innerHTML = `
      <button class="btn-sync-action" onclick="App.exportToExcel('Sales_MTD')"><i class="fa-solid fa-file-excel" style="color:#15803d"></i> Excel</button>
      <button class="btn-sync-action" onclick="App.exportToPdf('Sales_MTD')"><i class="fa-solid fa-file-pdf" style="color:#b91c1c"></i> PDF</button>
    `;

    body.innerHTML = `
      <div class="table-responsive-wrapper">
        <table class="data-table-custom" id="tableExportTarget">
          <thead>
            <tr>
              <th>Bulan</th>
              <th>Tanggal</th>
              <th>Sales 2024</th>
              <th>Sales 2025</th>
              <th>Sales 2026</th>
              <th>STD 2026</th>
              <th>APC 2026</th>
              <th>Growth %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${r.bulan}</td>
                <td>${r.tanggal}</td>
                <td>Rp ${Math.round(r.sales2024).toLocaleString('id-ID')}</td>
                <td>Rp ${Math.round(r.sales2025).toLocaleString('id-ID')}</td>
                <td style="font-weight:700;">Rp ${Math.round(r.sales2026).toLocaleString('id-ID')}</td>
                <td>${r.std2026}</td>
                <td>Rp ${Math.round(r.apc2026).toLocaleString('id-ID')}</td>
                <td style="font-weight:700; color:${r.growthPercent >= 0 ? '#15803d' : '#b91c1c'};">${r.growthPercent.toFixed(1)}%</td>
                <td><span class="status-badge ${r.status === 'Growth' ? 'ok' : 'nok'}">${r.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  renderSalesHarianView(body, rightActions) {
    const d = this.state.dashboard;
    const sh = d && d.kpi ? d.kpi.salesHarian : null;
    const records = sh ? sh.records : [];

    rightActions.innerHTML = `
      <button class="btn-sync-action" onclick="App.exportToExcel('Sales_Harian')"><i class="fa-solid fa-file-excel" style="color:#15803d"></i> Excel</button>
      <button class="btn-sync-action" onclick="App.exportToPdf('Sales_Harian')"><i class="fa-solid fa-file-pdf" style="color:#b91c1c"></i> PDF</button>
    `;

    body.innerHTML = `
      <div class="table-responsive-wrapper">
        <table class="data-table-custom" id="tableExportTarget">
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Bulan Lalu</th>
              <th>Target</th>
              <th>Actual</th>
              <th>Gap Target</th>
              <th>ACV %</th>
              <th>STD</th>
              <th>APC</th>
              <th>OOS %</th>
              <th>Gross Margin</th>
            </tr>
          </thead>
          <tbody>
            ${records.map(r => `
              <tr>
                <td>${r.tanggal}</td>
                <td>Rp ${Math.round(r.bulanLalu).toLocaleString('id-ID')}</td>
                <td>Rp ${Math.round(r.target).toLocaleString('id-ID')}</td>
                <td style="font-weight:700;">Rp ${Math.round(r.actual).toLocaleString('id-ID')}</td>
                <td style="color:${r.gapTarget >= 0 ? '#15803d' : '#b91c1c'}; font-weight:700;">Rp ${Math.round(r.gapTarget).toLocaleString('id-ID')}</td>
                <td><span class="status-badge ${r.acvPercent >= 100 ? 'ok' : 'nok'}">${r.acvPercent.toFixed(1)}%</span></td>
                <td>${r.std}</td>
                <td>Rp ${Math.round(r.apc).toLocaleString('id-ID')}</td>
                <td>${r.pctOos}%</td>
                <td>${r.grossMargin}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  // ----------------------------------------------------------------
  // EKSPOR PDF & EXCEL SEJATI (XLSX)
  // ----------------------------------------------------------------
  exportToExcel(sheetTitle) {
    const table = document.getElementById('tableExportTarget');
    if (!table) return;
    const wb = XLSX.utils.table_to_book(table, { sheet: sheetTitle });
    XLSX.writeFile(wb, `${sheetTitle}_${new Date().toISOString().substring(0,10)}.xlsx`);
  },

  exportToPdf(reportTitle) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.text(`Kacida Bersatu - Laporan ${reportTitle}`, 40, 40);
    doc.autoTable({
      html: '#tableExportTarget',
      startY: 60,
      theme: 'grid',
      headStyles: { fillColor: [4, 108, 56] }
    });
    doc.save(`${reportTitle}_${new Date().toISOString().substring(0,10)}.pdf`);
  },

  // Ubah tema aplikasi
  setTheme(theme) {
    this.state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
  },

  toggleAllMenus() {
    this.state.allMenusExpanded = !this.state.allMenusExpanded;
    document.getElementById('lblToggleMenus').innerText = this.state.allMenusExpanded ? 'View Less' : 'View All';
    this.renderMenuGrid();
  },

  openCalendarModal() {
    this.openModal('calendar_view');
    document.getElementById('modalActiveTitle').innerText = 'Kalender Kerja Retail';
    document.getElementById('modalActiveContentBody').innerHTML = `
      <div style="background:#fff; padding:24px; border-radius:16px; text-align:center;">
        <h3>${new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h3>
        <p style="color:#64748b; margin-top:8px;">Jumat, Sabtu, dan Minggu ditandai khusus untuk persiapan lonjakan omset akhir pekan.</p>
      </div>
    `;
  },

  openProfileModal() {
    const u = this.state.user || {};
    this.openModal('user_profile');
    document.getElementById('modalActiveTitle').innerText = 'Profil Personel Retail';
    document.getElementById('modalActiveContentBody').innerHTML = `
      <div style="max-width:500px; margin:0 auto; background:#fff; padding:28px; border-radius:16px; text-align:center;">
        <img src="${u.fotoUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'}" style="width:90px; height:90px; border-radius:50%; border:3px solid #046c38; margin-bottom:12px;">
        <h2>${u.nama || '-'}</h2>
        <span class="status-badge ok">${u.role || '-'}</span>
        <div style="margin:20px 0; text-align:left; border-top:1px solid #e2e8f0; padding-top:14px; font-size:13px; display:flex; flex-direction:column; gap:8px;">
          <div><b>NIK:</b> ${u.nik || '-'}</div>
          <div><b>Toko:</b> ${u.namaTokoLengkap || u.kodeToko || '-'}</div>
        </div>
        <button class="btn-primary-action" onclick="App.handleLogout()" style="background:#ef4444;"><i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar Aplikasi</button>
      </div>
    `;
  },

  openHelpModal() {
    this.openModal('bantuan');
    document.getElementById('modalActiveTitle').innerText = 'Pusat Bantuan & Panduan';
    document.getElementById('modalActiveContentBody').innerHTML = `
      <div style="max-width:700px; margin:0 auto; background:#fff; padding:24px; border-radius:16px; font-size:13px; line-height:1.7;">
        <h3>Panduan Operasional Kacida Bersatu</h3>
        <ul style="margin: 14px 0 20px 20px;">
          <li><b>Ceklis EXP:</b> Rumus eksekusi dihitung otomatis: EXP - RH - 10 hari.</li>
          <li><b>Konversi Bon:</b> Masukkan 4 digit nomor bon untuk konversi sandi instan.</li>
          <li><b>Offline PWA:</b> Aplikasi dapat diinstal ke layar beranda ponsel dan desktop melalui browser.</li>
        </ul>
        <a href="https://wa.me/6285862719780" target="_blank" class="btn-primary-action" style="text-decoration:none;"><i class="fa-brands fa-whatsapp"></i> Hubungi WhatsApp Admin (085862719780)</a>
      </div>
    `;
  }
};

window.addEventListener('DOMContentLoaded', () => App.init());
