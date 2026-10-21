/**
 * ==========================================================================
 * KACIDA BERSATU — Portal Performa & Operasional Retail
 * Application Engine & Controller (app.js)
 * Version: 1.0.0 Production Enterprise
 * ==========================================================================
 */

// STATE MANAJEMEN GLOBAL APLIKASI
const AppState = {
  currentUser: null,
  dashboardData: null,
  activeStoreCode: "",
  activeMainTab: "beranda",
  currentCalendarDate: new Date(),
  selectedCalendarDay: new Date().getDate(),
  chatHistory: [],
  kpiSliderInterval: null,
  currentKpiSlideIndex: 0,
  scannerInstance: null,
  scannedItemsList: [],
  currentPreviewBarcodeIdx: 0,
  charts: {
    salesHarian: null,
    gmMiniTrend: null
  },
  ceklisData: {
    rakList: [],
    expItems: [],
    alertExp: [],
    riwayat: []
  },
  currentValRakId: null,
  favoriteMenus: JSON.parse(localStorage.getItem("kacida_fav_menus") || "{}")
};

// ==========================================================================
// 1. BOOTSTRAP & INISIALISASI APLIKASI
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  checkAuthenticationState();
  initCalendarView();
});

function initTheme() {
  const savedTheme = localStorage.getItem("kacida_theme") || "default";
  setTheme(savedTheme);
}

function setTheme(theme) {
  document.body.className = "";
  document.body.classList.add(`theme-${theme}`);
  localStorage.setItem("kacida_theme", theme);

  document.querySelectorAll(".theme-btn").forEach(btn => btn.classList.remove("active"));
  if (theme === "default") document.getElementById("btnThemeDefault")?.classList.add("active");
  if (theme === "light") document.getElementById("btnThemeLight")?.classList.add("active");
  if (theme === "dark") document.getElementById("btnThemeDark")?.classList.add("active");
}

function updateNetworkBadgeUI(isOnline) {
  const badge = document.getElementById("networkStatusBadge");
  const text = document.getElementById("networkStatusText");
  if (!badge || !text) return;

  if (isOnline) {
    badge.className = "status-badge-online";
    text.innerText = "Online";
  } else {
    badge.className = "status-badge-online status-badge-offline";
    text.innerText = "Offline";
  }
}

// ==========================================================================
// 2. OTENTIKASI & MANAJEMEN SESI
// ==========================================================================
async function checkAuthenticationState() {
  const token = localStorage.getItem(API_CONFIG.STORAGE_KEYS.SESSION_TOKEN);
  const user = api.currentUser;

  if (token && user) {
    AppState.currentUser = user;
    AppState.activeStoreCode = api.getActiveStoreCode();
    hideLoginScreen();
    await loadInitialDashboard();
  } else {
    showLoginScreen();
  }
}

/* UBAH MENJADI: */
function showLoginScreen() {
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginScreen").classList.add("active");
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("appRoot").classList.add("hidden");
}

function hideLoginScreen() {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("appRoot").classList.remove("hidden");
}

async function handleAuthLogin() {
  const inputNik = document.getElementById("inputNik").value.trim();
  if (!inputNik) {
    Swal.fire({ icon: "warning", title: "NIK Wajib Diisi", text: "Silakan masukkan NIK Anda." });
    return;
  }

  Swal.fire({
    title: "Memverifikasi NIK...",
    text: "Menghubungkan ke database Master_User Google Spreadsheet",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await api.login(inputNik);
    if (res.status === "success") {
      AppState.currentUser = res.user;
      AppState.activeStoreCode = res.user.storeCode;

      Swal.fire({
        icon: "success",
        title: "Login Berhasil",
        text: res.message,
        timer: 1500,
        showConfirmButton: false
      });

      hideLoginScreen();
      await loadInitialDashboard();
    } else {
      Swal.fire({ icon: "error", title: "Akses Ditolak", text: res.message });
    }
  } catch (err) {
    Swal.fire({
      icon: "error",
      title: "Gagal Terhubung",
      text: err.message || "Pastikan URL Google Apps Script telah disiapkan dan periksa jaringan internet Anda."
    });
  }
}

function confirmLogout() {
  Swal.fire({
    title: "Keluar dari Akun?",
    text: "Sesi login Anda akan diakhiri.",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#DC2626",
    cancelButtonColor: "#64748B",
    confirmButtonText: "Ya, Keluar",
    cancelButtonText: "Batal"
  }).then(result => {
    if (result.isConfirmed) {
      api.clearSession();
      showLoginScreen();
    }
  });
}

function showSessionExpiredNotification() {
  Swal.fire({
    icon: "info",
    title: "Sesi Berakhir",
    text: "Masa aktif login telah habis. Silakan masukkan NIK kembali.",
    confirmButtonText: "Login Ulang"
  }).then(() => {
    showLoginScreen();
  });
}

// ==========================================================================
// 3. DASHBOARD UTAMA & SINKRONISASI
// ==========================================================================
async function loadInitialDashboard() {
  renderUserInfoHeader();

  try {
    const res = await api.getInitialDashboardData(AppState.activeStoreCode);
    if (res.status === "success") {
      AppState.dashboardData = res;
      renderDashboardUI(res);
      startKpiAutoCarousel();
    }
  } catch (e) {
    console.error("Gagal memuat dashboard:", e);
  }
}

function renderUserInfoHeader() {
  const user = AppState.currentUser;
  if (!user) return;

  document.getElementById("userHeaderName").innerText = user.nama;
  document.getElementById("userHeaderRole").innerText = user.jabatan;
  document.getElementById("heroUserMetaText").innerText = `${user.jabatan} • Toko ${user.namaToko}`;
  document.getElementById("profileBioName").innerText = user.nama;
  document.getElementById("profileBioRole").innerText = user.jabatan;
  document.getElementById("profileBioStore").innerText = user.namaToko;
  document.getElementById("profileBioNik").innerText = user.nik;
  document.getElementById("profileBioLoginTime").innerText = formatDateTimeIndo(new Date());

  const defaultAvatar = "https://lh3.googleusercontent.com/d/15CaPCEZgcdzO_xf7r2HSimuW5I1KnJIR";
  const userAvatar = user.fotoUrl || defaultAvatar;
  document.getElementById("userHeaderAvatar").src = userAvatar;
  document.getElementById("heroUserPhoto").src = userAvatar;
  document.getElementById("profileBigAvatar").src = userAvatar;

  // Sapaan Waktu Hero
  const hour = new Date().getHours();
  let greeting = "Selamat Malam";
  if (hour >= 4 && hour < 11) greeting = "Selamat Pagi";
  else if (hour >= 11 && hour < 15) greeting = "Selamat Siang";
  else if (hour >= 15 && hour < 19) greeting = "Selamat Sore";
  document.getElementById("heroGreetingText").innerText = `${greeting}, ${user.nama.split(" ")[0]}!`;

  // Struktur Toko Selector (Khusus Area Coordinator / Super Admin)
  renderStoreSelectorUI();

  // Super Admin Option
  if (user.isSuperAdmin) {
    document.getElementById("adminSidebarSection").style.display = "block";
    document.getElementById("btnSidebarAdmin").style.display = "flex";
  }
}

function renderStoreSelectorUI() {
  const user = AppState.currentUser;
  const wrapper = document.getElementById("storeSelectWrapper");
  wrapper.innerHTML = "";

  const isAcOrAdmin = user.jabatan.toLowerCase().includes("area coordinator") || user.isSuperAdmin;

  if (isAcOrAdmin && user.permittedStores && user.permittedStores.length > 1) {
    const select = document.createElement("select");
    select.className = "store-badge-header";
    select.style.border = "none";
    select.style.cursor = "pointer";

    user.permittedStores.forEach(s => {
      const opt = document.createElement("option");
      opt.value = s.code;
      opt.innerText = s.fullName;
      if (s.code === AppState.activeStoreCode) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener("change", async (e) => {
      AppState.activeStoreCode = e.target.value;
      api.setActiveStoreCode(e.target.value);
      Swal.fire({
        title: "Mengalihkan Toko...",
        text: `Memuat data untuk toko ${e.target.value}`,
        timer: 1000,
        didOpen: () => Swal.showLoading()
      });
      await loadInitialDashboard();
    });

    wrapper.appendChild(select);
  } else {
    const span = document.createElement("span");
    span.className = "store-badge-header";
    span.id = "currentStoreBadge";
    span.innerText = user.namaToko;
    wrapper.appendChild(span);
  }
}

function renderDashboardUI(data) {
  const kpis = data.kpis;

  // 1. Hero Sales H-1
  const harian = kpis.salesHarian;
  document.getElementById("heroSalesValue").innerText = formatRupiah(harian.hMin1Sales);
  const growthSign = harian.growthVsLastMonth >= 0 ? "+" : "";
  document.getElementById("heroSalesGrowth").innerHTML = `
    <i class="fa-solid fa-arrow-trend-${harian.growthVsLastMonth >= 0 ? 'up' : 'down'}"></i>
    <span>${growthSign}${Math.round(harian.growthVsLastMonth)}% dari Bulan Lalu</span>
  `;

  // 2. Carousel KPI Cards
  // IKT
  document.getElementById("kpiIktAcvVal").innerText = `${Math.round(kpis.ikt.netSalesAcv)}%`;
  document.getElementById("kpiIktTargetVal").innerText = formatRupiah(kpis.ikt.targetSales);
  document.getElementById("kpiIktTfVal").innerText = `${Math.round(kpis.ikt.timeFactor)}%`;
  const badgeIkt = document.getElementById("kpiIktStatusBadge");
  badgeIkt.className = kpis.ikt.statusSales === "OK" ? "status-pill-ok" : "status-pill-nok";
  badgeIkt.innerText = kpis.ikt.statusSales;

  // Sales MTD
  document.getElementById("kpiMtdTotalVal").innerText = formatRupiah(kpis.salesMtd.totalSales);
  document.getElementById("kpiMtdAvgSpd").innerText = formatRupiah(kpis.salesMtd.avgStd > 0 ? (kpis.salesMtd.totalSales / 30) : 0);
  document.getElementById("kpiMtdAvgApc").innerText = formatRupiah(kpis.salesMtd.avgApc);
  const mtdGrowthSign = kpis.salesMtd.growth >= 0 ? "+" : "";
  document.getElementById("kpiMtdGrowthBadge").innerText = `${mtdGrowthSign}${Math.round(kpis.salesMtd.growth)}%`;

  // Penawaran Langsung
  document.getElementById("kpiPlPointVal").innerText = kpis.penawaranLangsung.pointDashboard;
  document.getElementById("kpiPlPointText").innerText = kpis.penawaranLangsung.pointDashboard;
  document.getElementById("kpiPlAcvVal").innerText = kpis.penawaranLangsung.totalAcv;
  document.getElementById("kpiPlRankBadge").innerText = `Rank #${kpis.penawaranLangsung.rank}`;

  // Sales Harian
  document.getElementById("kpiHarianActualVal").innerText = formatRupiah(harian.hMin1Sales);
  document.getElementById("kpiHarianTargetVal").innerText = formatRupiah(harian.hMin1Target);
  document.getElementById("kpiHarianAcvVal").innerText = `${Math.round(harian.hMin1Acv)}%`;
  const badgeHarian = document.getElementById("kpiHarianStatusBadge");
  badgeHarian.className = harian.hMin1Acv >= 100 ? "status-pill-ok" : "status-pill-nok";
  badgeHarian.innerText = harian.hMin1Acv >= 100 ? "OK" : "NOK";

  // 3. Render Menus (15 Inti + Dinamis Navigasi)
  renderMainMenusGrid(data.dynamicMenus || []);

  // 4. Render Pending Approvals Badge (Khusus COS)
  const notifBadge = document.getElementById("notifBadgeCount");
  if (data.pendingApprovalsCount > 0) {
    notifBadge.innerText = data.pendingApprovalsCount;
    notifBadge.classList.remove("hidden");
  } else {
    notifBadge.classList.add("hidden");
  }

  // 5. Render Grafik Tren Sales Harian & GM%
  renderSalesHarianChart(harian.chart7Days || []);
  renderGmMiniTrendChart(kpis.ikt);

  // 6. Render Profil & Struktur Personil Toko
  renderStorePersonnelStructure(data.teamMembers || []);
}

// ==========================================================================
// 4. SISTEM 15 MENU UTAMA & DINAMIS SPREADSHEET
// ==========================================================================
const CORE_MENUS = [
  { id: 1, name: "Ceklis EXP", icon: "fa-solid fa-boxes-packing" },
  { id: 2, name: "Serah Terima", icon: "fa-solid fa-handshake" },
  { id: 3, name: "Plan Mastershift", icon: "fa-solid fa-calendar-check" },
  { id: 4, name: "Belanja Karyawan", icon: "fa-solid fa-cart-shopping" },
  { id: 5, name: "Simulasi GM RP IKT", icon: "fa-solid fa-calculator" },
  { id: 6, name: "Sales MTD", icon: "fa-solid fa-chart-line" },
  { id: 7, name: "Sales Harian", icon: "fa-solid fa-receipt" },
  { id: 8, name: "Monitoring IKT", icon: "fa-solid fa-bullseye" },
  { id: 9, name: "Konversi No Bon/Struk", icon: "fa-solid fa-barcode" },
  { id: 10, name: "Penawaran Langsung", icon: "fa-solid fa-tags" },
  { id: 11, name: "Rekap PSM Kasir", icon: "fa-solid fa-cash-register" },
  { id: 12, name: "Monitoring Sales OPR", icon: "fa-solid fa-clock" },
  { id: 13, name: "Monitoring KWH", icon: "fa-solid fa-bolt" },
  { id: 14, name: "Catatan Return", icon: "fa-solid fa-truck-ramp-box" },
  { id: 15, name: "Scan Barang", icon: "fa-solid fa-qrcode" }
];

function renderMainMenusGrid(dynamicMenus) {
  const container = document.getElementById("mainMenuGridContainer");
  const sidebarList = document.getElementById("desktopSidebarMenuList");
  const allMenuGrid = document.getElementById("allMenuContainerGrid");

  container.innerHTML = "";
  sidebarList.innerHTML = "";
  allMenuGrid.innerHTML = "";

  // Gabungkan 15 menu inti dengan menu dinamis sheet Menu_Navigasi
  let combinedMenus = [...CORE_MENUS];

  dynamicMenus.forEach(dMenu => {
    combinedMenus.push({
      id: `dyn_${dMenu.urutan}`,
      name: dMenu.namaMenu,
      icon: "fa-solid fa-link",
      isDynamic: true,
      url: dMenu.linkTujuan
    });
  });

  // Urutkan menu berdasarkan frekuensi favorit
  combinedMenus.sort((a, b) => {
    const scoreA = AppState.favoriteMenus[a.name] || 0;
    const scoreB = AppState.favoriteMenus[b.name] || 0;
    return scoreB - scoreA;
  });

  // Tampilkan 12 prioritas di Beranda
  combinedMenus.forEach((menu, index) => {
    const card = createMenuCardElement(menu);
    if (index < 12) {
      container.appendChild(card);
    }
    // Masukkan semua menu ke modal All Menus
    allMenuGrid.appendChild(createMenuCardElement(menu));

    // Render ke Desktop Sidebar Menu
    const sideItem = document.createElement("a");
    sideItem.href = "javascript:void(0)";
    sideItem.className = "nav-item";
    sideItem.innerHTML = `<i class="${menu.icon}"></i> ${menu.name}`;
    sideItem.onclick = () => handleMenuClick(menu);
    sidebarList.appendChild(sideItem);
  });
}

function createMenuCardElement(menu) {
  const card = document.createElement("div");
  card.className = "menu-card-item";
  card.innerHTML = `
    <div class="menu-icon-circle"><i class="${menu.icon}"></i></div>
    <div class="menu-title">${menu.name}</div>
  `;
  card.onclick = () => handleMenuClick(menu);
  return card;
}

function handleMenuClick(menu) {
  // Rekam frekuensi klik untuk auto-reordering menu favorit
  AppState.favoriteMenus[menu.name] = (AppState.favoriteMenus[menu.name] || 0) + 1;
  localStorage.setItem("kacida_fav_menus", JSON.stringify(AppState.favoriteMenus));

  if (menu.isDynamic && menu.url) {
    window.open(menu.url, "_blank");
    return;
  }

  openMenuModal(menu.id);
}

// ==========================================================================
// 5. PENANGANAN MODAL 15 FITUR UTAMA
// ==========================================================================
function openMenuModal(menuNumber) {
  closeAllFeatureModals();
  const targetModal = document.getElementById(`modalMenu${menuNumber}`);
  if (!targetModal) return;

  targetModal.classList.add("active");

  // Panggilan spesifik pemuatan data saat tab modal dibuka
  switch (Number(menuNumber)) {
    case 1: loadCeklisExpData(); break;
    case 2: loadSerahTerimaData(); break;
    case 3: loadMasterShiftTable(); break;
    case 4: loadBelanjaKaryawanData(); break;
    case 5: resetFormSimulasiGm(); break;
    case 6: loadSalesMtdTable(); break;
    case 7: loadSalesHarianTable(); break;
    case 8: loadMonitoringIktData(); break;
    case 9: resetBonConversion(); break;
    case 10: loadPenawaranLangsungTable(); break;
    case 11: loadRekapPsmKasirTable(); break;
    case 12: loadSalesOprTable("0607"); break;
    case 13: loadMonitoringKwhTable(); break;
    case 14: loadCatatanReturnTable("DCREG"); break;
    case 15: initScanBarangView(); break;
  }
}

function closeAllFeatureModals() {
  document.querySelectorAll(".fullscreen-feature-modal").forEach(m => m.classList.remove("active"));
  if (AppState.scannerInstance) {
    AppState.scannerInstance.stop().catch(() => {});
    AppState.scannerInstance = null;
  }
}

function openViewAllMenuModal() {
  document.getElementById("modalAllMenu").classList.add("active");
}

function openAdminDashboardModal() {
  closeAllFeatureModals();
  document.getElementById("modalAdminDashboard").classList.add("active");
  loadAdminAuditLogs();
}

// ==========================================================================
// 6. MENU 1: CEKLIS EXP CONTROLLER
// ==========================================================================
async function loadCeklisExpData() {
  try {
    const res = await api.getCeklisExpData(AppState.activeStoreCode);
    if (res.status === "success") {
      AppState.ceklisData = res;
      renderCeklisRakTable(res.rakList);
      renderExpItemsTable(res.expItems);
      renderAlertExpTable(res.alertExp);
      renderRiwayatExpTable();
    }
  } catch (e) {
    console.error(e);
  }
}

function switchCeklisSubTab(tabName) {
  document.querySelectorAll("#modalMenu1 .subtab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#modalMenu1 .ceklis-subview").forEach(v => v.classList.remove("active"));

  if (tabName === "dataRak") {
    document.querySelectorAll("#modalMenu1 .subtab-btn")[0].classList.add("active");
    document.getElementById("subTabCeklisDataRak").classList.add("active");
  } else if (tabName === "inputExp") {
    document.querySelectorAll("#modalMenu1 .subtab-btn")[1].classList.add("active");
    document.getElementById("subTabCeklisInputExp").classList.add("active");
  } else if (tabName === "alertExp") {
    document.querySelectorAll("#modalMenu1 .subtab-btn")[2].classList.add("active");
    document.getElementById("subTabCeklisAlertExp").classList.add("active");
  } else if (tabName === "riwayatExp") {
    document.querySelectorAll("#modalMenu1 .subtab-btn")[3].classList.add("active");
    document.getElementById("subTabCeklisRiwayatExp").classList.add("active");
  }
}

function renderCeklisRakTable(rakList) {
  const tbody = document.getElementById("tableBodyRak");
  tbody.innerHTML = "";

  let total = rakList.length;
  let selesai = 0, belum = 0, validasi = 0;

  const isCos = AppState.currentUser.jabatan.toLowerCase().includes("chief of store") || AppState.currentUser.isSuperAdmin;

  rakList.forEach(rak => {
    if (rak.status === "Selesai") selesai++;
    else if (rak.status === "Butuh Validasi") validasi++;
    else belum++;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${rak.nomorRak}</strong></td>
      <td>${rak.kategori}</td>
      <td>${rak.pic}</td>
      <td><span class="status-pill-${rak.status === 'Selesai' ? 'ok' : (rak.status === 'Butuh Validasi' ? 'rank' : 'nok')}">${rak.status}</span></td>
      <td>${rak.fotoBukti ? `<a href="${rak.fotoBukti}" target="_blank" class="btn-primary-sm"><i class="fa-solid fa-image"></i> Lihat</a>` : '<span class="text-muted">Belum ada</span>'}</td>
      <td>
        <div class="d-flex gap-2">
          ${rak.status !== 'Selesai' ? `<button type="button" class="btn-primary-sm" onclick="openChecklistValidation('${rak.id}', '${rak.nomorRak}')"><i class="fa-solid fa-clipboard-check"></i> Ceklis</button>` : '<span class="badge-status-ok"><i class="fa-solid fa-lock"></i> Terkunci</span>'}
          ${isCos && rak.status === 'Butuh Validasi' ? `<button type="button" class="btn-primary-sm" onclick="approveRak('${rak.id}', 'APPROVE')"><i class="fa-solid fa-check"></i> Setujui</button>` : ''}
          ${isCos ? `<button type="button" class="btn-secondary-sm text-danger" onclick="deleteRak('${rak.id}')"><i class="fa-solid fa-trash"></i></button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById("cntTotalRak").innerText = total;
  document.getElementById("cntRakSelesai").innerText = selesai;
  document.getElementById("cntRakBelum").innerText = belum;
  document.getElementById("cntRakValidasi").innerText = validasi;

  // Sembunyikan FAB Tambah Rak jika bukan COS/ACOS
  const canAddRak = AppState.currentUser.jabatan.toLowerCase().includes("chief") || AppState.currentUser.isSuperAdmin;
  document.getElementById("btnFloatingAddRak").style.display = canAddRak ? "flex" : "none";
}

function openChecklistValidation(rakId, nomorRak) {
  AppState.currentValRakId = rakId;
  document.getElementById("txtValRakNo").innerText = nomorRak;
  document.querySelectorAll("#modalChecklistValidation input[type='checkbox']").forEach(c => c.checked = false);
  document.getElementById("fileBuktiRak").value = "";
  document.getElementById("modalChecklistValidation").classList.add("active");
}

function closeChecklistValidation() {
  document.getElementById("modalChecklistValidation").classList.remove("active");
}

async function submitChecklistRakData() {
  const chks = document.querySelectorAll("#modalChecklistValidation input[type='checkbox']");
  for (let c of chks) {
    if (!c.checked) {
      Swal.fire({ icon: "warning", title: "Poin Ceklis Belum Lengkap", text: "Seluruh 6 poin kesiapan rak wajib dicentang sebelum menyelesaikan checklist." });
      return;
    }
  }

  const fileInput = document.getElementById("fileBuktiRak");
  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({ icon: "warning", title: "Foto Bukti Wajib", text: "Harap unggah foto bukti kesiapan rak." });
    return;
  }

  Swal.fire({ title: "Mengunggah Bukti...", text: "Menyimpan foto ke Google Drive", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    const uploadRes = await api.uploadPhotoFile(fileInput.files[0]);
    if (uploadRes.status !== "success") throw new Error(uploadRes.message);

    const submitRes = await api.submitChecklistRak({
      rakId: AppState.currentValRakId,
      fotoUrl: uploadRes.url
    });

    closeChecklistValidation();
    Swal.fire({ icon: "success", title: "Berhasil", text: submitRes.message });
    await loadCeklisExpData();
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal Menyimpan", text: err.message });
  }
}

function openFormAddRakModal() {
  const select = document.getElementById("addRakPic");
  select.innerHTML = "";
  if (AppState.dashboardData && AppState.dashboardData.teamMembers) {
    AppState.dashboardData.teamMembers.forEach(m => {
      const opt = document.createElement("option");
      opt.value = m.nama;
      opt.innerText = `${m.nama} (${m.jabatan})`;
      select.appendChild(opt);
    });
  }
  document.getElementById("modalFormAddRak").classList.add("active");
}

function closeFormAddRakModal() {
  document.getElementById("modalFormAddRak").classList.remove("active");
}

async function submitAddRak() {
  const nomorRak = document.getElementById("addRakNomor").value.trim();
  const kategori = document.getElementById("addRakKategori").value.trim();
  const pic = document.getElementById("addRakPic").value;

  Swal.fire({ title: "Menyimpan Rak...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await api.saveCeklisExpRak({ nomorRak, kategori, pic });
    closeFormAddRakModal();
    document.getElementById("formAddRak").reset();
    Swal.fire({ icon: "success", title: "Tersimpan", text: res.message, timer: 1500, showConfirmButton: false });
    await loadCeklisExpData();
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

function openFormAddExpItemModal() {
  const select = document.getElementById("addExpPosisiRak");
  select.innerHTML = "";
  AppState.ceklisData.rakList.forEach(r => {
    const opt = document.createElement("option");
    opt.value = `${r.nomorRak} - ${r.kategori}`;
    opt.innerText = `${r.nomorRak} - ${r.kategori}`;
    select.appendChild(opt);
  });
  document.getElementById("modalFormAddExpItem").classList.add("active");
}

function closeFormAddExpItemModal() {
  document.getElementById("modalFormAddExpItem").classList.remove("active");
}

async function submitAddExpItem() {
  const item = {
    namaItem: document.getElementById("addExpNama").value.trim(),
    posisiRak: document.getElementById("addExpPosisiRak").value,
    qty: document.getElementById("addExpQty").value,
    rh: document.getElementById("addExpRh").value,
    tglExp: document.getElementById("addExpTanggal").value
  };

  Swal.fire({ title: "Menyimpan Item...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await api.saveCeklisExpItem(item);
    document.getElementById("formAddExpItem").reset();
    Swal.fire({ icon: "success", title: "Tersimpan", text: res.message, timer: 1500, showConfirmButton: false });
    await loadCeklisExpData();
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

function renderExpItemsTable(items) {
  const tbody = document.getElementById("tableBodyExpItems");
  tbody.innerHTML = "";
  items.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${it.namaItem}</strong></td>
      <td>${it.posisiRak}</td>
      <td>${it.qty}</td>
      <td>${it.tglExp}</td>
      <td>${it.rh} Hari</td>
      <td><span class="text-danger font-weight-bold">${it.tglEstimasiEksekusi}</span></td>
      <td>
        <button type="button" class="btn-secondary-sm text-danger" onclick="deleteExpItem('${it.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderAlertExpTable(alertList) {
  const tbody = document.getElementById("tableBodyAlertExp");
  tbody.innerHTML = "";
  document.getElementById("badgeCountAlertExp").innerText = alertList.length;

  alertList.forEach(it => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${it.namaItem}</strong></td>
      <td>${it.posisiRak}</td>
      <td>${it.qty}</td>
      <td>${it.tglExp}</td>
      <td><strong class="text-danger">${it.tglEstimasiEksekusi}</strong></td>
      <td><span class="status-pill-nok">Mendekati / Lewat</span></td>
      <td>
        <button type="button" class="btn-primary-sm" onclick="markExecutedExp('${it.id}')"><i class="fa-solid fa-box-archive"></i> Tandai Dieksekusi</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function markExecutedExp(itemId) {
  Swal.fire({
    title: "Konfirmasi Eksekusi",
    text: "Tandai bahwa item ini telah ditarik / diretur dari rak penjualan?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Sudah Ditarik"
  }).then(async res => {
    if (res.isConfirmed) {
      await api.markExpExecuted(itemId);
      Swal.fire({ icon: "success", title: "Berhasil", text: "Item dipindahkan ke riwayat eksekusi.", timer: 1500, showConfirmButton: false });
      await loadCeklisExpData();
    }
  });
}

function renderRiwayatExpTable() {
  const filter = document.getElementById("selectFilterRiwayatExp").value;
  const tbody = document.getElementById("tableBodyRiwayatExp");
  tbody.innerHTML = "";

  const items = AppState.ceklisData.expItems || [];
  items.forEach(it => {
    if (filter !== "ALL" && it.statusEksekusi !== filter) return;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${it.tglInput ? it.tglInput.substring(0, 10) : '-'}</td>
      <td>${it.namaPenginput || '-'}</td>
      <td><strong>${it.namaItem}</strong></td>
      <td>${it.posisiRak}</td>
      <td>${it.qty}</td>
      <td>${it.tglExp}</td>
      <td><span class="status-pill-${it.statusEksekusi === 'SUDAH DIEKSEKUSI' ? 'ok' : 'nok'}">${it.statusEksekusi}</span></td>
      <td>
        <button type="button" class="btn-secondary-sm text-danger" onclick="deleteExpItem('${it.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// ==========================================================================
// 7. MENU 2: SERAH TERIMA OPERASIONAL & POPUP
// ==========================================================================
async function loadSerahTerimaData() {
  try {
    const res = await api.getSerahTerima(AppState.activeStoreCode);
    if (res.status === "success") {
      renderSerahTerimaTable(res.list);
      if (res.reminderPopup) {
        showSerahTerimaReminderModal(res.reminderPopup);
      }
    }
  } catch (e) {
    console.error(e);
  }
}

function switchSerahTerimaTab(tabName) {
  document.querySelectorAll("#modalMenu2 .subtab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#modalMenu2 .serah-terima-view").forEach(v => v.classList.remove("active"));

  if (tabName === "input") {
    document.querySelectorAll("#modalMenu2 .subtab-btn")[0].classList.add("active");
    document.getElementById("subTabStInput").classList.add("active");
  } else {
    document.querySelectorAll("#modalMenu2 .subtab-btn")[1].classList.add("active");
    document.getElementById("subTabStRiwayat").classList.add("active");
  }
}

function renderSerahTerimaTable(list) {
  const tbody = document.getElementById("tableBodySerahTerima");
  tbody.innerHTML = "";

  list.forEach(st => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${st.tanggal}</td>
      <td><span class="status-pill-ok">Shift ${st.shift}</span></td>
      <td><strong>${formatRupiah(st.sales)}</strong></td>
      <td>${st.qtyPsm}</td>
      <td>${st.redeemSerbaGratis}</td>
      <td>${st.redeemPwp}</td>
      <td>${st.newMember}</td>
      <td>${Math.round(st.contributionStruk)}%</td>
      <td>${st.namaPenginput}</td>
      <td>
        <button type="button" class="btn-secondary-sm text-danger" onclick="deleteSerahTerimaItem('${st.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function submitSerahTerimaData() {
  const data = {
    tanggal: document.getElementById("stTanggal").value,
    shift: document.getElementById("stShift").value,
    sales: document.getElementById("stSales").value,
    qtyPsm: document.getElementById("stQtyPsm").value,
    redeemSerbaGratis: document.getElementById("stRedeemSg").value,
    redeemPwp: document.getElementById("stRedeemPwp").value,
    newMember: document.getElementById("stNewMember").value,
    contributionStruk: document.getElementById("stContribStruk").value,
    catatanKendala: document.getElementById("stCatatan").value
  };

  Swal.fire({ title: "Menyimpan Serah Terima...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await api.saveSerahTerima(data);
    document.getElementById("formSerahTerima").reset();
    Swal.fire({ icon: "success", title: "Tersimpan", text: res.message });
    await loadSerahTerimaData();
    switchSerahTerimaTab("riwayat");
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

function showSerahTerimaReminderModal(st) {
  document.getElementById("popStPenginput").innerText = st.namaPenginput;
  document.getElementById("popStShift").innerText = `Shift ${st.shift}`;
  document.getElementById("popStSales").innerText = formatRupiah(st.sales);
  document.getElementById("popStPsm").innerText = st.qtyPsm;
  document.getElementById("popStCatatan").innerText = st.catatanKendala || "-";
  document.getElementById("modalPopupSerahTerimaReminder").classList.add("active");
}

function closeSerahTerimaReminder(isDone) {
  document.getElementById("modalPopupSerahTerimaReminder").classList.remove("active");
  if (isDone) {
    localStorage.setItem("kacida_read_st_id", "read");
  }
}

// ==========================================================================
// 8. MENU 3: PLAN MASTERSHIFT ENGINE
// ==========================================================================
async function loadMasterShiftTable() {
  const month = document.getElementById("selectShiftBulan").value;
  const year = document.getElementById("selectShiftTahun").value;
  const headerRow = document.getElementById("headerRowMasterShift");
  const body = document.getElementById("bodyMasterShift");

  // Buat header tanggal 1 s/d hari terakhir bulan tersebut
  headerRow.innerHTML = "<th>No</th><th>Nama Personil</th><th>Jabatan</th>";
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const th = document.createElement("th");
    th.innerText = d;
    headerRow.appendChild(th);
  }

  body.innerHTML = `<tr><td colspan="${daysInMonth + 3}" class="text-center py-4">Memuat data jadwal Mastershift...</td></tr>`;

  try {
    const res = await api.getMasterShift(AppState.activeStoreCode, month, year);
    if (res.status === "success") {
      body.innerHTML = "";
      const isAllowedEdit = AppState.currentUser.jabatan.toLowerCase().includes("chief") || AppState.currentUser.isSuperAdmin;

      res.team.forEach((person, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td>${idx + 1}</td><td><strong>${person.nama}</strong></td><td>${person.jabatan}</td>`;

        for (let d = 1; d <= daysInMonth; d++) {
          const td = document.createElement("td");
          const shiftCode = (res.schedules[person.nik] && res.schedules[person.nik][d]) ? res.schedules[person.nik][d] : "P";

          if (isAllowedEdit) {
            td.innerHTML = `
              <select class="shift-select-cell" data-nik="${person.nik}" data-day="${d}">
                <option value="P" ${shiftCode === 'P' ? 'selected' : ''}>P</option>
                <option value="S" ${shiftCode === 'S' ? 'selected' : ''}>S</option>
                <option value="M" ${shiftCode === 'M' ? 'selected' : ''}>M</option>
                <option value="OFF" ${shiftCode === 'OFF' ? 'selected' : ''}>OFF</option>
                <option value="AO" ${shiftCode === 'AO' ? 'selected' : ''}>AO</option>
                <option value="CT" ${shiftCode === 'CT' ? 'selected' : ''}>CT</option>
                <option value="SAKIT" ${shiftCode === 'SAKIT' ? 'selected' : ''}>SAKIT</option>
              </select>
            `;
          } else {
            td.innerHTML = `<span class="badge-shift-${shiftCode}">${shiftCode}</span>`;
          }
          tr.appendChild(td);
        }
        body.appendChild(tr);
      });
    }
  } catch (e) {
    console.error(e);
  }
}

async function submitMasterShiftSchedule() {
  const month = document.getElementById("selectShiftBulan").value;
  const year = document.getElementById("selectShiftTahun").value;
  const selects = document.querySelectorAll(".shift-select-cell");

  const scheduleList = [];
  selects.forEach(sel => {
    scheduleList.push({
      nik: sel.getAttribute("data-nik"),
      day: sel.getAttribute("data-day"),
      code: sel.value
    });
  });

  Swal.fire({ title: "Menyimpan Jadwal...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await api.saveMasterShift(AppState.activeStoreCode, month, year, scheduleList);
    Swal.fire({ icon: "success", title: "Berhasil Disimpan", text: res.message });
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

// ==========================================================================
// 9. MENU 4: BELANJA KARYAWAN & APPROVAL
// ==========================================================================
async function loadBelanjaKaryawanData() {
  try {
    const res = await api.getBelanjaKaryawan(AppState.activeStoreCode);
    if (res.status === "success") {
      renderBelanjaTables(res.list);
    }
  } catch (e) {
    console.error(e);
  }
}

function switchBelanjaTab(tabName) {
  document.querySelectorAll("#modalMenu4 .subtab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll("#modalMenu4 .belanja-view").forEach(v => v.classList.remove("active"));

  if (tabName === "input") {
    document.querySelectorAll("#modalMenu4 .subtab-btn")[0].classList.add("active");
    document.getElementById("subTabBkInput").classList.add("active");
  } else if (tabName === "approval") {
    document.querySelectorAll("#modalMenu4 .subtab-btn")[1].classList.add("active");
    document.getElementById("subTabBkApproval").classList.add("active");
  } else {
    document.querySelectorAll("#modalMenu4 .subtab-btn")[2].classList.add("active");
    document.getElementById("subTabBkRiwayat").classList.add("active");
  }
}

function renderBelanjaTables(list) {
  const approvalTbody = document.getElementById("tableBodyApprovalBelanja");
  const riwayatTbody = document.getElementById("tableBodyRiwayatBelanja");
  approvalTbody.innerHTML = "";
  riwayatTbody.innerHTML = "";

  let pendingCount = 0;
  const isCos = AppState.currentUser.jabatan.toLowerCase().includes("chief of store") || AppState.currentUser.isSuperAdmin;

  list.forEach(bk => {
    if (bk.status === "PENDING") {
      pendingCount++;
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${bk.timestamp}</td>
        <td><strong>${bk.nama}</strong><br><small class="text-muted">Member: ${bk.nomorMember}</small></td>
        <td>${bk.nomorBon}</td>
        <td><strong>${formatRupiah(bk.nominal)}</strong></td>
        <td><a href="${bk.fotoStrukUrl}" target="_blank" class="btn-primary-sm"><i class="fa-solid fa-receipt"></i> Struk</a></td>
        <td>
          ${isCos ? `
            <div class="d-flex gap-2">
              <button type="button" class="btn-primary-sm" onclick="decideBelanja('${bk.id}', 'DISETUJUI')"><i class="fa-solid fa-check"></i> Setujui</button>
              <button type="button" class="btn-secondary-sm text-danger" onclick="decideBelanja('${bk.id}', 'DITOLAK')"><i class="fa-solid fa-xmark"></i> Tolak</button>
            </div>
          ` : '<span class="status-pill-rank">Menunggu COS</span>'}
        </td>
      `;
      approvalTbody.appendChild(tr);
    }

    const trR = document.createElement("tr");
    trR.innerHTML = `
      <td>${bk.timestamp ? bk.timestamp.substring(0, 10) : '-'}</td>
      <td><strong>${bk.nama}</strong></td>
      <td>${bk.nomorBon}</td>
      <td>${formatRupiah(bk.nominal)}</td>
      <td><span class="status-pill-${bk.status === 'DISETUJUI' ? 'ok' : (bk.status === 'DITOLAK' ? 'nok' : 'rank')}">${bk.status}</span></td>
      <td>${bk.validator || '-'}</td>
      <td><a href="${bk.fotoStrukUrl}" target="_blank" class="btn-secondary-sm"><i class="fa-solid fa-image"></i></a></td>
      <td>
        ${isCos ? `<button type="button" class="btn-secondary-sm text-danger" onclick="deleteBelanjaItem('${bk.id}')"><i class="fa-solid fa-trash"></i></button>` : '-'}
      </td>
    `;
    riwayatTbody.appendChild(trR);
  });

  document.getElementById("badgeApprovalBelanja").innerText = pendingCount;
}

async function submitPengajuanBelanja() {
  const fileInput = document.getElementById("bkFotoStruk");
  if (!fileInput.files || fileInput.files.length === 0) {
    Swal.fire({ icon: "warning", title: "Foto Struk Wajib", text: "Silakan unggah foto bukti struk belanja." });
    return;
  }

  Swal.fire({ title: "Mengunggah Struk...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const uploadRes = await api.uploadPhotoFile(fileInput.files[0]);
    if (uploadRes.status !== "success") throw new Error(uploadRes.message);

    const payload = {
      nomorMember: document.getElementById("bkNomorMember").value.trim(),
      nomorBon: document.getElementById("bkNomorBon").value.trim(),
      nominal: document.getElementById("bkNominal").value,
      fotoStrukUrl: uploadRes.url
    };

    const res = await api.saveBelanjaKaryawan(payload);
    document.getElementById("formBelanjaKaryawan").reset();
    Swal.fire({ icon: "success", title: "Pengajuan Terkirim", text: res.message });
    await loadBelanjaKaryawanData();
    switchBelanjaTab("riwayat");
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

async function decideBelanja(id, decision) {
  let reason = "";
  if (decision === "DITOLAK") {
    const { value: text } = await Swal.fire({
      title: "Alasan Penolakan",
      input: "textarea",
      inputPlaceholder: "Tuliskan alasan penolakan pengajuan belanja...",
      showCancelButton: true
    });
    if (!text) return;
    reason = text;
  }

  Swal.fire({ title: "Memproses Keputusan...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await api.approveBelanjaKaryawan(id, decision, reason);
    Swal.fire({ icon: "success", title: "Berhasil", text: res.message, timer: 1500, showConfirmButton: false });
    await loadBelanjaKaryawanData();
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

// ==========================================================================
// 10. MENU 5: SIMULASI GM RP IKT (INSTAN)
// ==========================================================================
function calculateSimulasiGm() {
  const hk = Number(document.getElementById("simHk").value) || 30;
  const jhk = Number(document.getElementById("simJhk").value) || 1;
  const targetSales = Number(document.getElementById("simTargetSales").value) || 0;
  const actualSales = Number(document.getElementById("simActualSales").value) || 0;
  const targetMarginPct = Number(document.getElementById("simTargetMarginPct").value) || 0;
  const actualMarginPct = Number(document.getElementById("simActualMarginPct").value) || 0;

  // Rumus Bisnis Retail
  const tf = Math.round((jhk / hk) * 100);
  const acvSales = targetSales > 0 ? Math.round((actualSales / targetSales) * 100) : 0;
  const gapSales = actualSales - targetSales;

  const targetGmRp = Math.round(targetSales * (targetMarginPct / 100));
  const actualGmRp = Math.round(actualSales * (actualMarginPct / 100));
  const gapGmRp = actualGmRp - targetGmRp;

  document.getElementById("resTimeFactor").innerText = `${tf}%`;
  document.getElementById("resAcvSales").innerText = `${acvSales}%`;
  document.getElementById("resGapSales").innerText = formatRupiah(gapSales);
  document.getElementById("resTargetGmRp").innerText = formatRupiah(targetGmRp);
  document.getElementById("resActualGmRp").innerText = formatRupiah(actualGmRp);
  document.getElementById("resGapGmRp").innerText = formatRupiah(gapGmRp);

  const isOk = acvSales >= tf && gapGmRp >= 0;
  const badge = document.getElementById("resStatusBadge");
  badge.className = isOk ? "status-pill-ok" : "status-pill-nok";
  badge.innerText = isOk ? "OK (Target Tercapai)" : "NOK (Perlu Peningkatan)";

  document.getElementById("resAnalysisText").innerHTML = `
    Realisasi Net Sales mencapai <strong>${acvSales}%</strong> dibanding Time Factor <strong>${tf}%</strong>. 
    ${gapGmRp >= 0 ? 'Margin rupiah toko surplus dan mendukung pencapaian IKT.' : 'Margin rupiah berada di bawah target. Tingkatkan penjualan item-item Gross Margin tinggi.'}
  `;
}

function resetFormSimulasiGm() {
  document.getElementById("formSimulasiGm").reset();
  document.getElementById("resTimeFactor").innerText = "0%";
  document.getElementById("resAcvSales").innerText = "0%";
  document.getElementById("resGapSales").innerText = "Rp 0";
  document.getElementById("resTargetGmRp").innerText = "Rp 0";
  document.getElementById("resActualGmRp").innerText = "Rp 0";
  document.getElementById("resGapGmRp").innerText = "Rp 0";
}

function openSimulasiGmDirect() {
  openMenuModal(5);
}

// ==========================================================================
// 11. MENU 6 & 7: SALES MTD & SALES HARIAN DETAIL + EXPORT
// ==========================================================================
async function loadSalesMtdTable() {
  const month = document.getElementById("selectMonthMtd").value;
  const tbody = document.getElementById("tableBodySalesMtd");
  tbody.innerHTML = `<tr><td colspan="9" class="text-center py-4">Memuat data YTD_Sales...</td></tr>`;

  try {
    const res = await api.getSalesMTDDetail(AppState.activeStoreCode, month);
    if (res.status === "success") {
      tbody.innerHTML = "";
      let total26 = 0, sumStd = 0, sumApc = 0, count = 0, total25 = 0;

      res.rows.forEach(r => {
        total26 += r.sales2026;
        total25 += r.sales2025;
        if (r.sales2026 > 0) {
          sumStd += r.std2026;
          sumApc += r.apc2026;
          count++;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${r.tanggal}</td>
          <td><strong>${formatRupiah(r.sales2026)}</strong></td>
          <td>${r.std2026}</td>
          <td>${formatRupiah(r.apc2026)}</td>
          <td>${formatRupiah(r.sales2025)}</td>
          <td>${formatRupiah(r.sales2024)}</td>
          <td><strong class="${r.growthVs2025 >= 0 ? 'text-success' : 'text-danger'}">${r.growthVs2025 >= 0 ? '+' : ''}${Math.round(r.growthVs2025)}%</strong></td>
          <td><span class="status-pill-${r.statusGrowth === 'Growth' ? 'ok' : 'nok'}">${r.statusGrowth}</span></td>
          <td><button type="button" class="btn-primary-sm" onclick='openCompareYearsModal(${JSON.stringify(r)})'><i class="fa-solid fa-code-compare"></i> Bandingkan</button></td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("txtMtdTotalSales").innerText = formatRupiah(total26);
      document.getElementById("txtMtdAvgSpdBox").innerText = formatRupiah(count > 0 ? total26 / count : 0);
      document.getElementById("txtMtdAvgStdBox").innerText = count > 0 ? Math.round(sumStd / count) : 0;
      document.getElementById("txtMtdAvgApcBox").innerText = formatRupiah(count > 0 ? sumApc / count : 0);
      const growthTot = total25 > 0 ? Math.round(((total26 - total25) / total25) * 100) : 0;
      document.getElementById("txtMtdGrowthBox").innerText = `${growthTot >= 0 ? '+' : ''}${growthTot}%`;
    }
  } catch (e) {
    console.error(e);
  }
}

function openCompareYearsModal(r) {
  document.getElementById("compTanggalTitle").innerText = r.tanggal;
  document.getElementById("cmpSales24").innerText = formatRupiah(r.sales2024);
  document.getElementById("cmpSales25").innerText = formatRupiah(r.sales2025);
  document.getElementById("cmpSales26").innerText = formatRupiah(r.sales2026);
  document.getElementById("cmpGrowthSales").innerText = `${r.growthVs2025 >= 0 ? '+' : ''}${Math.round(r.growthVs2025)}%`;

  document.getElementById("cmpStd24").innerText = r.std2024;
  document.getElementById("cmpStd25").innerText = r.std2025;
  document.getElementById("cmpStd26").innerText = r.std2026;
  const gStd = r.std2025 > 0 ? Math.round(((r.std2026 - r.std2025) / r.std2025) * 100) : 0;
  document.getElementById("cmpGrowthStd").innerText = `${gStd >= 0 ? '+' : ''}${gStd}%`;

  document.getElementById("cmpApc24").innerText = formatRupiah(r.apc2024);
  document.getElementById("cmpApc25").innerText = formatRupiah(r.apc2025);
  document.getElementById("cmpApc26").innerText = formatRupiah(r.apc2026);
  const gApc = r.apc2025 > 0 ? Math.round(((r.apc2026 - r.apc2025) / r.apc2025) * 100) : 0;
  document.getElementById("cmpGrowthApc").innerText = `${gApc >= 0 ? '+' : ''}${gApc}%`;

  document.getElementById("modalCompareYears").classList.add("active");
}

function closeCompareModal() {
  document.getElementById("modalCompareYears").classList.remove("active");
}

async function loadSalesHarianTable() {
  const tbody = document.getElementById("tableBodySalesHarian");
  tbody.innerHTML = `<tr><td colspan="11" class="text-center py-4">Memuat data Sales_Harian...</td></tr>`;

  try {
    const res = await api.getSalesHarianDetail(AppState.activeStoreCode);
    if (res.status === "success") {
      tbody.innerHTML = "";
      let totBlnLalu = 0, totTarget = 0, totActual = 0;

      res.list.forEach(sh => {
        totBlnLalu += sh.bulanLalu;
        totTarget += sh.target;
        totActual += sh.actual;

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${sh.tanggal}</td>
          <td>${formatRupiah(sh.bulanLalu)}</td>
          <td>${formatRupiah(sh.target)}</td>
          <td><strong>${formatRupiah(sh.actual)}</strong></td>
          <td>${sh.actualStd}</td>
          <td>${formatRupiah(sh.actualApc)}</td>
          <td>${formatRupiah(sh.gapTarget)}</td>
          <td><strong class="${sh.acvSales >= 100 ? 'text-success' : 'text-danger'}">${Math.round(sh.acvSales)}%</strong></td>
          <td>${Math.round(sh.nsbPct)}%</td>
          <td>${Math.round(sh.oosPct)}%</td>
          <td>${Math.round(sh.grossMargin)}%</td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("shTotalBulanLalu").innerText = formatRupiah(totBlnLalu);
      document.getElementById("shTotalTarget").innerText = formatRupiah(totTarget);
      document.getElementById("shTotalActual").innerText = formatRupiah(totActual);
      const acv = totTarget > 0 ? Math.round((totActual / totTarget) * 100) : 0;
      document.getElementById("shAcvSales").innerText = `${acv}%`;
      const growth = totBlnLalu > 0 ? Math.round(((totActual - totBlnLalu) / totBlnLalu) * 100) : 0;
      document.getElementById("shGrowthMom").innerText = `${growth >= 0 ? '+' : ''}${growth}%`;
    }
  } catch (e) {
    console.error(e);
  }
}

// EKSPOR LAPORAN XLSX & PDF
function exportMtdToExcel() {
  const table = document.querySelector("#modalMenu6 table");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Sales_MTD" });
  XLSX.writeFile(wb, `Sales_MTD_${AppState.activeStoreCode}.xlsx`);
}

function exportMtdToPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4");
  doc.text(`Laporan Sales MTD Toko ${AppState.activeStoreCode}`, 40, 40);
  doc.autoTable({ html: "#modalMenu6 table", startY: 60 });
  doc.save(`Sales_MTD_${AppState.activeStoreCode}.pdf`);
}

function exportHarianToExcel() {
  const table = document.querySelector("#modalMenu7 table");
  const wb = XLSX.utils.table_to_book(table, { sheet: "Sales_Harian" });
  XLSX.writeFile(wb, `Sales_Harian_${AppState.activeStoreCode}.xlsx`);
}

function exportHarianToPdf() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("l", "pt", "a4");
  doc.text(`Laporan Sales Harian Toko ${AppState.activeStoreCode}`, 40, 40);
  doc.autoTable({ html: "#modalMenu7 table", startY: 60 });
  doc.save(`Sales_Harian_${AppState.activeStoreCode}.pdf`);
}

// ==========================================================================
// 12. MENU 9: KONVERSI NO BON / STRUK (INSTAN)
// ==========================================================================
const MAP_BON = { "0": "M", "1": "O", "2": "Y", "3": "D", "4": "T", "5": "U", "6": "H", "7": "C", "8": "I", "9": "K" };

function executeBonConversion() {
  const raw = document.getElementById("inputNomorBonRaw").value.replace(/\D/g, "");
  if (!raw) {
    resetBonConversion();
    return;
  }

  // Normalisasi 4 digit (isi 0 di depan jika kurang)
  const normalized = raw.padStart(4, "0").slice(-4);
  const digits = normalized.split("");
  const letters = digits.map(d => MAP_BON[d] || "-");

  const boxes = document.querySelectorAll("#containerKodeBonResult .digit-box");
  letters.forEach((l, idx) => {
    if (boxes[idx]) boxes[idx].innerText = l;
  });

  const finalCode = letters.join("");
  document.getElementById("txtHasilKonversiFinal").innerText = finalCode;
}

function resetBonConversion() {
  document.getElementById("inputNomorBonRaw").value = "";
  document.querySelectorAll("#containerKodeBonResult .digit-box").forEach(b => b.innerText = "-");
  document.getElementById("txtHasilKonversiFinal").innerText = "-";
}

function copyBonResult() {
  const code = document.getElementById("txtHasilKonversiFinal").innerText;
  if (!code || code === "-") return;
  navigator.clipboard.writeText(code);
  Swal.fire({ icon: "success", title: "Disalin!", text: `Kode ${code} berhasil disalin ke clipboard.`, timer: 1200, showConfirmButton: false });
}

// ==========================================================================
// 13. MENU 15: SCAN BARANG CAMERA & JSBARCODE PREVIEW
// ==========================================================================
function initScanBarangView() {
  renderScannedItemsTable();
}

function toggleCameraScanner() {
  const previewDiv = document.getElementById("scannerCameraView");
  const btn = document.getElementById("btnToggleCamera");

  if (AppState.scannerInstance) {
    AppState.scannerInstance.stop().then(() => {
      AppState.scannerInstance = null;
      btn.innerHTML = `<i class="fa-solid fa-camera"></i> Mulai Scan Kamera`;
    });
    return;
  }

  AppState.scannerInstance = new Html5Qrcode("scannerCameraView");
  AppState.scannerInstance.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 120 } },
    (decodedText) => {
      triggerScanConfirmModal(decodedText);
    },
    () => {}
  ).then(() => {
    btn.innerHTML = `<i class="fa-solid fa-stop"></i> Matikan Kamera`;
  }).catch(err => {
    Swal.fire({ icon: "error", title: "Kamera Tidak Tersedia", text: "Izinkan akses kamera di browser Anda untuk menggunakan fitur pemindai." });
  });
}

function handleManualBarcodeEntered() {
  const input = document.getElementById("inputManualBarcode");
  const code = input.value.trim();
  if (!code) return;
  triggerScanConfirmModal(code);
  input.value = "";
}

function triggerScanConfirmModal(barcode) {
  document.getElementById("txtScannedBarcodeCode").innerText = barcode;
  document.getElementById("numScanQuantity").value = 1;
  document.getElementById("modalConfirmScanQty").classList.add("active");
}

function closeScanQtyModal() {
  document.getElementById("modalConfirmScanQty").classList.remove("active");
}

function stepScanQty(delta) {
  const input = document.getElementById("numScanQuantity");
  let val = Number(input.value) + delta;
  if (val < 1) val = 1;
  input.value = val;
}

async function saveConfirmedScannedItem() {
  const barcode = document.getElementById("txtScannedBarcodeCode").innerText;
  const qty = Number(document.getElementById("numScanQuantity").value) || 1;

  closeScanQtyModal();

  Swal.fire({ title: "Menyimpan...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const res = await api.saveScanBarang({ barcode, qty });
    Swal.fire({ icon: "success", title: "Tersimpan", text: res.message, timer: 1200, showConfirmButton: false });

    // Tambahkan ke preview lokal
    AppState.scannedItemsList.unshift({
      barcode: barcode,
      namaBarang: `Item-${barcode}`,
      qty: qty,
      waktu: formatDateTimeIndo(new Date())
    });

    renderScannedItemsTable();
    renderBarcodePreview(barcode);
  } catch (err) {
    Swal.fire({ icon: "error", title: "Gagal", text: err.message });
  }
}

function renderScannedItemsTable() {
  const tbody = document.getElementById("tableBodyScanBarang");
  tbody.innerHTML = "";
  document.getElementById("cntScannedItems").innerText = `${AppState.scannedItemsList.length} Item`;

  AppState.scannedItemsList.forEach((it, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${it.barcode}</strong></td>
      <td>${it.namaBarang}</td>
      <td>${it.qty}</td>
      <td>${it.waktu}</td>
      <td><button type="button" class="btn-primary-sm" onclick="renderBarcodePreview('${it.barcode}')"><i class="fa-solid fa-eye"></i></button></td>
    `;
    tbody.appendChild(tr);
  });
}

function renderBarcodePreview(barcode) {
  try {
    JsBarcode("#svgBarcodePreview", barcode, {
      format: "CODE128",
      width: 2,
      height: 60,
      displayValue: false
    });
    document.getElementById("txtBarcodeNumberDisplay").innerText = barcode;
  } catch (e) {
    console.error("Gagal merender barcode:", e);
  }
}

// ==========================================================================
// 14. CHAT AI GROQ & KALENDER INTERAKTIF
// ==========================================================================
async function submitUserChat() {
  const input = document.getElementById("txtChatInput");
  const prompt = input.value.trim();
  if (!prompt) return;

  appendChatBubble(prompt, "user");
  input.value = "";
  AppState.chatHistory.push({ role: "user", content: prompt });

  // Tampilkan loading bubble AI
  const loadingBubble = appendChatBubble("Sedang menganalisa data toko...", "ai loading");

  try {
    const res = await api.chatGroqAI(prompt, AppState.chatHistory);
    loadingBubble.remove();
    if (res.status === "success") {
      appendChatBubble(res.reply, "ai");
      AppState.chatHistory.push({ role: "assistant", content: res.reply });
    } else {
      appendChatBubble(`Maaf, terjadi kendala: ${res.message}`, "ai");
    }
  } catch (err) {
    loadingBubble.remove();
    appendChatBubble("Gagal menghubungi Groq AI. Silakan periksa jaringan Anda.", "ai");
  }
}

function appendChatBubble(text, sender) {
  const box = document.getElementById("chatMessagesBox");
  const div = document.createElement("div");
  div.className = sender.includes("user") ? "chat-bubble-user" : "chat-bubble-ai";
  div.innerHTML = `<p>${text.replace(/\n/g, '<br>')}</p>`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
  return div;
}

function handleChatKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    submitUserChat();
  }
}

function applyQuickPrompt(prompt) {
  document.getElementById("txtChatInput").value = prompt;
  submitUserChat();
}

function clearChatHistory() {
  AppState.chatHistory = [];
  document.getElementById("chatMessagesBox").innerHTML = `
    <div class="chat-bubble-ai">
      <div class="bubble-sender">Al Kacida AI</div>
      <p>Riwayat percakapan telah dibersihkan. Silakan ajukan pertanyaan baru!</p>
    </div>
  `;
}

// KALENDER BULANAN
function initCalendarView() {
  renderCalendarDays();
}

function changeCalendarMonth(delta) {
  AppState.currentCalendarDate.setMonth(AppState.currentCalendarDate.getMonth() + delta);
  renderCalendarDays();
}

function renderCalendarDays() {
  const cal = AppState.currentCalendarDate;
  const year = cal.getFullYear();
  const month = cal.getMonth();

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  document.getElementById("calendarCurrentMonthTitle").innerText = `${monthNames[month]} ${year}`;

  const daysGrid = document.getElementById("calendarDaysGrid");
  daysGrid.innerHTML = "";

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Minggu
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Geser hari agar Senin di kolom pertama
  const offset = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);

  for (let i = 0; i < offset; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-day-cell blank";
    daysGrid.appendChild(blank);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    cell.className = "cal-day-cell";
    if (d === AppState.selectedCalendarDay) cell.classList.add("selected");

    const curDayOfWeek = new Date(year, month, d).getDay();
    if (curDayOfWeek === 5) cell.classList.add("day-highlight-fri"); // Jumat
    if (curDayOfWeek === 6) cell.classList.add("day-highlight-sat"); // Sabtu
    if (curDayOfWeek === 0) cell.classList.add("day-highlight-sun"); // Minggu

    cell.innerHTML = `<span>${d}</span>`;
    cell.onclick = () => {
      AppState.selectedCalendarDay = d;
      renderCalendarDays();
      document.getElementById("selectedCalendarDateText").innerText = `Tanggal: ${d} ${monthNames[month]} ${year}`;
    };
    daysGrid.appendChild(cell);
  }
}

// ==========================================================================
// 15. GRAFIK CHART.JS (TREN SALES HARIAN & GM% MINI TREND)
// ==========================================================================
function renderSalesHarianChart(chartData) {
  const ctx = document.getElementById("chartTrenSalesHarian");
  if (!ctx) return;

  if (AppState.charts.salesHarian) {
    AppState.charts.salesHarian.destroy();
  }

  const labels = chartData.map(d => d.date);
  const actuals = chartData.map(d => d.actual);
  const targets = chartData.map(d => d.target);

  AppState.charts.salesHarian = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Actual Sales (Rp)",
          data: actuals,
          backgroundColor: "#0A8A4B",
          borderRadius: 6
        },
        {
          type: "line",
          label: "Target Sales (Rp)",
          data: targets,
          borderColor: "#F59E0B",
          borderWidth: 2,
          fill: false,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { font: { family: "Poppins", size: 11 } } }
      },
      scales: {
        y: {
          ticks: {
            callback: (val) => `${Math.round(val / 1000000)} Jt`,
            font: { family: "Poppins", size: 10 }
          }
        },
        x: { ticks: { font: { family: "Poppins", size: 10 } } }
      }
    }
  });
}

function renderGmMiniTrendChart(iktKpi) {
  const ctx = document.getElementById("chartGmMiniTrend");
  if (!ctx) return;

  if (AppState.charts.gmMiniTrend) {
    AppState.charts.gmMiniTrend.destroy();
  }

  document.getElementById("txtGmTarget").innerText = `22%`;
  document.getElementById("txtGmActual").innerText = `21%`;
  document.getElementById("txtGmAcv").innerText = `${iktKpi.gmAcv}%`;

  AppState.charts.gmMiniTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["W1", "W2", "W3", "W4"],
      datasets: [{
        data: [20, 21, 21.5, 21.8],
        borderColor: "#10B981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });
}

function renderStorePersonnelStructure(team) {
  const container = document.getElementById("personnelListContainer");
  container.innerHTML = "";
  document.getElementById("badgeTeamCount").innerText = `${team.length} Anggota`;
  document.getElementById("profileStoreTotalPersonel").innerText = `${team.length} Orang`;

  team.forEach(m => {
    const div = document.createElement("div");
    div.className = "personnel-item";
    div.innerHTML = `
      <img src="${m.fotoUrl || 'https://lh3.googleusercontent.com/d/15CaPCEZgcdzO_xf7r2HSimuW5I1KnJIR'}" alt="${m.nama}">
      <div>
        <div class="personnel-name">${m.nama}</div>
        <div class="personnel-role">${m.jabatan}</div>
      </div>
    `;
    container.appendChild(div);
  });
}

// ==========================================================================
// 16. SYNC MANUAL DENGAN ANIMASI REAL TAHAPAN
// ==========================================================================
async function startManualSync() {
  const modal = document.getElementById("syncModal");
  const bar = document.getElementById("syncProgressBar");
  const pVal = document.getElementById("syncPercentValue");
  const statusTxt = document.getElementById("syncStatusText");

  modal.classList.add("active");
  bar.style.width = "0%";
  pVal.innerText = "0";

  document.getElementById("stepConn").className = "";
  document.getElementById("stepSheet").className = "";
  document.getElementById("stepCache").className = "";
  document.getElementById("stepKpi").className = "";

  // Tahap 1: Koneksi Backend (25%)
  bar.style.width = "25%";
  pVal.innerText = "25";
  statusTxt.innerText = "Memverifikasi token dan koneksi backend...";
  document.getElementById("stepConn").className = "done";

  await new Promise(r => setTimeout(r, 600));

  // Tahap 2: Pembacaan Sheet (50%)
  bar.style.width = "50%";
  pVal.innerText = "50";
  statusTxt.innerText = "Membaca data 6 database Google Spreadsheet...";
  document.getElementById("stepSheet").className = "done";

  try {
    const res = await api.syncManual();
    // Tahap 3: Cache (75%)
    bar.style.width = "75%";
    pVal.innerText = "75";
    statusTxt.innerText = "Memperbarui cache lokal & antrean offline...";
    document.getElementById("stepCache").className = "done";

    await new Promise(r => setTimeout(r, 500));

    // Tahap 4: Finalisasi (100%)
    bar.style.width = "100%";
    pVal.innerText = "100";
    statusTxt.innerText = "Sinkronisasi selesai dengan sukses!";
    document.getElementById("stepKpi").className = "done";

    document.getElementById("lastSyncTimeText").innerText = `Sinkronisasi Terakhir: ${res.syncTime}`;
    document.getElementById("heroSyncTimeText").innerText = `Sinkronisasi: ${res.syncTime}`;

    if (res.data) {
      AppState.dashboardData = res.data;
      renderDashboardUI(res.data);
    }
  } catch (err) {
    statusTxt.innerText = `Gagal: ${err.message}`;
  }
}

function closeSyncModal() {
  document.getElementById("syncModal").classList.remove("active");
}

function startKpiAutoCarousel() {
  if (AppState.kpiSliderInterval) clearInterval(AppState.kpiSliderInterval);
  AppState.kpiSliderInterval = setInterval(() => {
    moveKpiSlide(1);
  }, 4500);
}

function moveKpiSlide(direction) {
  const track = document.getElementById("kpiCardsTrack");
  if (!track) return;
  const cards = track.children;
  if (cards.length === 0) return;

  AppState.currentKpiSlideIndex = (AppState.currentKpiSlideIndex + direction + cards.length) % cards.length;
}

// ==========================================================================
// 17. TAB SWITCHER (BOTTOM NAV & DESKTOP SIDEBAR)
// ==========================================================================
function switchMainTab(tabName) {
  AppState.activeMainTab = tabName;

  document.querySelectorAll(".tab-view-content").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".sidebar-nav .nav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".mobile-bottom-navbar .nav-bottom-item").forEach(b => b.classList.remove("active"));

  if (tabName === "beranda") {
    document.getElementById("viewTabBeranda").classList.add("active");
    document.getElementById("btnNavBottomBeranda")?.classList.add("active");
  } else if (tabName === "chatAi") {
    document.getElementById("viewTabChatAi").classList.add("active");
    document.getElementById("btnNavBottomChat")?.classList.add("active");
  } else if (tabName === "kalender") {
    document.getElementById("viewTabKalender").classList.add("active");
    document.getElementById("btnNavBottomKalender")?.classList.add("active");
  } else if (tabName === "profil") {
    document.getElementById("viewTabProfil").classList.add("active");
    document.getElementById("btnNavBottomProfil")?.classList.add("active");
  }
}

// ==========================================================================
// 18. UTILITAS FORMAT ANGKA & TANGGAL INDONESIA
// ==========================================================================
function formatRupiah(num) {
  if (!num || isNaN(num)) return "Rp 0";
  return "Rp " + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatDateTimeIndo(d) {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then((reg) => {
        console.log("PWA Service Worker terdaftar dengan scope:", reg.scope);
      })
      .catch((err) => {
        console.warn("Registrasi Service Worker gagal:", err);
      });
  });
}
