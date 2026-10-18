/**
 * KACIDA BERSATU - Portal Performa & Operasional Retail
 * File: app.js
 * Deskripsi: Interaksi UI, Manajemen State, 15 Modal, Groq AI, & Renderer
 */

let CURRENT_USER = null;
let STORE_SUMMARY = null;
let DYNAMIC_MENUS = [];
let CHART_SALES_HARIAN = null;
let SCANNER_STREAM = null;
let CHAT_HISTORY = [];

// =================== INIT & AUTH ===================
window.addEventListener("DOMContentLoaded", () => {
  checkSessionState();
  initOnlineWatcher();
});

function initOnlineWatcher() {
  const pill = document.getElementById("badgeOnlineStatus");
  const updateStatus = () => {
    if (navigator.onLine) {
      pill.textContent = "● Online";
      pill.className = "status-pill online";
    } else {
      pill.textContent = "● Offline";
      pill.className = "status-pill offline";
    }
  };
  window.addEventListener("online", updateStatus);
  window.addEventListener("offline", updateStatus);
  updateStatus();
}

function checkSessionState() {
  const token = ApiService.getToken();
  const user = ApiService.getUserData();
  if (token && user) {
    CURRENT_USER = user;
    renderAppLayout();
    triggerManualSync();
  } else {
    showScreen("loginScreen");
  }
}

function showScreen(screenId) {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("appLayout").classList.add("hidden");

  if (screenId === "loginScreen") {
    document.getElementById("loginScreen").classList.add("active");
  } else if (screenId === "appLayout") {
    document.getElementById("appLayout").classList.remove("hidden");
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const nik = document.getElementById("inputNik").value.trim();
  if (!nik) return;

  showLoading(true, "Memvalidasi NIK Pengguna...");
  try {
    const res = await ApiService.login(nik);
    CURRENT_USER = res.user;
    showLoading(false);
    Swal.fire({
      icon: "success",
      title: "Login Berhasil",
      text: `Selamat datang, ${CURRENT_USER.nama}!`,
      timer: 1500,
      showConfirmButton: false
    });
    renderAppLayout();
    triggerManualSync();
  } catch (error) {
    showLoading(false);
    Swal.fire({
      icon: "error",
      title: "Gagal Masuk",
      text: error.message,
      footer: '<a href="https://wa.me/6285862719780" target="_blank">Hubungi Admin di WhatsApp</a>'
    });
  }
}

function fillDemoNik() {
  document.getElementById("inputNik").value = "14125034";
}

function handleLogout() {
  Swal.fire({
    title: "Konfirmasi Logout",
    text: "Apakah Anda yakin ingin keluar dari akun ini?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Ya, Keluar",
    cancelButtonText: "Batal"
  }).then((res) => {
    if (res.isConfirmed) {
      ApiService.clearToken();
      location.reload();
    }
  });
}

// =================== SYNC & DATA RENDER ===================
async function triggerManualSync() {
  showLoading(true, "Menyelaraskan Data Toko Real-Time...");
  try {
    const data = await ApiService.getInitialData();
    STORE_SUMMARY = data.summary;
    DYNAMIC_MENUS = data.dynamicMenus;

    // Render Hero Card & Topbar
    renderStoreSummaryUI();
    renderDynamicMenus();
    updateBadges(data.pendingApprovals);
    renderChartHarianPreview();

    showLoading(false);
  } catch (error) {
    showLoading(false);
    Swal.fire("Sinkronisasi Kendala", error.message, "warning");
  }
}

function renderAppLayout() {
  showScreen("appLayout");

  document.getElementById("txtTopUserName").textContent = CURRENT_USER.nama;
  document.getElementById("txtTopUserRole").textContent = CURRENT_USER.jabatan;
  document.getElementById("txtTopStoreName").textContent = CURRENT_USER.namaToko;

  if (CURRENT_USER.fotoProfil) {
    document.getElementById("topUserAvatar").src = CURRENT_USER.fotoProfil;
    document.getElementById("profImg").src = CURRENT_USER.fotoProfil;
  }

  // Profile Modal
  document.getElementById("profNama").textContent = CURRENT_USER.nama;
  document.getElementById("profRole").textContent = CURRENT_USER.jabatan;
  document.getElementById("profNik").textContent = CURRENT_USER.nik;
  document.getElementById("profToko").textContent = CURRENT_USER.namaToko;

  // Super Admin Check
  if (CURRENT_USER.nik === "14125034") {
    document.getElementById("btnSideAudit").classList.remove("hidden");
  }
}

function renderStoreSummaryUI() {
  if (!STORE_SUMMARY) return;

  document.getElementById("txtHeroUserName").textContent = CURRENT_USER.nama;
  document.getElementById("txtHeroRoleStore").textContent = `${CURRENT_USER.jabatan} • ${CURRENT_USER.namaToko}`;
  document.getElementById("txtHeroSalesH1").textContent = STORE_SUMMARY.salesH1Formatted;
  
  const gapEl = document.getElementById("txtHeroGapH1");
  if (STORE_SUMMARY.gapH1 >= 0) {
    gapEl.textContent = `+Rp ${STORE_SUMMARY.gapH1.toLocaleString("id-ID")} vs Target`;
    gapEl.className = "kpi-badge positive";
  } else {
    gapEl.textContent = `-Rp ${Math.abs(STORE_SUMMARY.gapH1).toLocaleString("id-ID")} vs Target`;
    gapEl.className = "kpi-badge negative";
  }

  document.getElementById("cardIktAcv").textContent = STORE_SUMMARY.iktAcvSales;
  document.getElementById("cardIktStatus").textContent = STORE_SUMMARY.iktStatus;
  document.getElementById("cardMtdSales").textContent = STORE_SUMMARY.salesMtdFormatted;
  document.getElementById("cardMtdStd").textContent = `STD: ${STORE_SUMMARY.avgStd}`;
  document.getElementById("cardPlAcv").textContent = STORE_SUMMARY.penawaranTotalAcv;
  document.getElementById("cardPlPoint").textContent = `${STORE_SUMMARY.penawaranPoint} Pt`;
  document.getElementById("cardHarianSales").textContent = STORE_SUMMARY.salesH1Formatted;
}

function renderDynamicMenus() {
  const container = document.getElementById("dynamicMenuContainer");
  container.innerHTML = "";

  if (!DYNAMIC_MENUS || DYNAMIC_MENUS.length === 0) {
    container.innerHTML = "<p style='font-size:12px;color:var(--text-muted);'>Tidak ada tautan tambahan aktif di sheet Menu_Navigasi.</p>";
    return;
  }

  DYNAMIC_MENUS.forEach((menu) => {
    const a = document.createElement("a");
    a.href = menu.linkTujuan;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "dynamic-link-card";
    a.innerHTML = `
      <img src="${menu.iconUrl}" alt="${menu.namaMenu}">
      <span class="dynamic-link-title">${menu.namaMenu}</span>
    `;
    container.appendChild(a);
  });
}

function updateBadges(pendingCount) {
  const badgeRak = document.getElementById("badgeRak");
  const badgeBelanja = document.getElementById("badgeBelanja");
  if (pendingCount > 0) {
    badgeRak.textContent = pendingCount;
    badgeRak.classList.remove("hidden");
    badgeBelanja.textContent = pendingCount;
    badgeBelanja.classList.remove("hidden");
  } else {
    badgeRak.classList.add("hidden");
    badgeBelanja.classList.add("hidden");
  }
}

async function renderChartHarianPreview() {
  try {
    const res = await ApiService.getSalesHarian();
    const list = res.data.slice(-7); // 7 hari terakhir
    const labels = list.map(item => item.tanggal);
    const actualData = list.map(item => item.actual);
    const targetData = list.map(item => item.target);

    const ctx = document.getElementById("chartSalesHarianPreview").getContext("2d");
    if (CHART_SALES_HARIAN) CHART_SALES_HARIAN.destroy();

    CHART_SALES_HARIAN = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Actual (Rp)",
            data: actualData,
            backgroundColor: "#2E7D32"
          },
          {
            label: "Target (Rp)",
            data: targetData,
            backgroundColor: "#A5D6A7",
            type: "line",
            borderColor: "#1E5631",
            borderWidth: 2,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              callback: value => "Rp " + (value / 1000000).toFixed(1) + "M"
            }
          }
        }
      }
    });
  } catch (e) {
    console.error("Chart preview error:", e);
  }
}

// =================== MODAL & NAVIGATION ===================
function openModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // Dispatch data loader spesifik modal
  if (modalId === "modalCeklisRak") loadCeklisRakData();
  if (modalId === "modalSerahTerima") loadSerahTerimaData();
  if (modalId === "modalPlanMastershift") loadPlanMastershift();
  if (modalId === "modalBelanjaKaryawan") loadBelanjaKaryawan();
  if (modalId === "modalSalesMtd") loadSalesMtdData();
  if (modalId === "modalSalesHarian") loadSalesHarianModalData();
  if (modalId === "modalIkt") loadIktModalData();
  if (modalId === "modalPenawaranLangsung") loadPenawaranLangsungModalData();
  if (modalId === "modalRekapPsmKasir") loadRekapPsmData();
  if (modalId === "modalSalesOpr") loadSalesOprData();
  if (modalId === "modalMonitoringKwh") loadMonitoringKwhData();
  if (modalId === "modalCatatanReturn") loadCatatanReturnData();
  if (modalId === "modalAuditSuperAdmin") loadAuditLogsData();
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
  document.body.style.overflow = "auto";
}

function switchSubTab(btnElement, targetTabId) {
  const parent = btnElement.closest(".full-modal");
  parent.querySelectorAll(".sub-tab").forEach(tab => tab.classList.remove("active"));
  parent.querySelectorAll(".tab-content").forEach(tc => tc.classList.remove("active"));

  btnElement.classList.add("active");
  document.getElementById(targetTabId).classList.add("active");
}

function switchNavTab(tabName) {
  if (tabName === "beranda") {
    document.querySelectorAll(".full-modal").forEach(m => m.classList.add("hidden"));
    document.body.style.overflow = "auto";
  }
}

function setAppTheme(themeName) {
  document.body.setAttribute("data-theme", themeName);
  document.querySelectorAll(".btn-theme").forEach(btn => {
    btn.classList.toggle("active", btn.textContent.toLowerCase() === themeName);
  });
}

function showLoading(show, message = "Memuat...") {
  const overlay = document.getElementById("syncLoadingOverlay");
  const txt = document.getElementById("loadingText");
  if (show) {
    txt.textContent = message;
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

// =================== MENU 1: CEKLIS EXP & RAK ===================
async function loadCeklisRakData() {
  try {
    const res = await ApiService.getCeklisRak();
    const rows = res.data;
    const tbody = document.getElementById("tblBodyRak");
    tbody.innerHTML = "";

    let total = rows.length;
    let selesai = 0;
    let validasi = 0;

    rows.forEach((r) => {
      if (r.Status === "Selesai") selesai++;
      if (r.Status === "Butuh Validasi") validasi++;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${r.NoRak}</b></td>
        <td>${r.Kategori}</td>
        <td>${r.PIC_Nama}</td>
        <td><span class="pill ${r.Status === 'Selesai' ? 'pill-green' : 'pill-gold'}">${r.Status}</span></td>
        <td>${r.FotoBuktiUrl ? `<a href="${r.FotoBuktiUrl}" target="_blank">Lihat Bukti</a>` : '-'}</td>
        <td>
          ${CURRENT_USER.jabatan === "Chief Of Store" && r.Status === "Butuh Validasi" ? 
            `<button class="btn-primary" onclick="validateRakAction('${r.ID}')">Validasi</button>` : '-'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById("statTotalRak").textContent = total;
    document.getElementById("statRakSelesai").textContent = selesai;
    document.getElementById("statRakValidasi").textContent = validasi;
    document.getElementById("statRakBelum").textContent = total - selesai;
  } catch (e) {
    console.error(e);
  }
}

async function handleSubmitRak(e) {
  e.preventDefault();
  const fileInput = document.getElementById("rakFoto");
  if (!fileInput.files[0]) {
    Swal.fire("Wajib Foto", "Ambil foto bukti penataan rak terlebih dahulu.", "warning");
    return;
  }

  showLoading(true, "Mengunggah foto bukti ke Google Drive...");
  const base64 = await fileToBase64(fileInput.files[0]);
  try {
    await ApiService.submitCeklisRak({
      noRak: document.getElementById("rakNo").value,
      kategori: document.getElementById("rakKategori").value,
      fotoBase64: base64
    });
    showLoading(false);
    Swal.fire("Berhasil", "Laporan rak tersimpan dan menunggu validasi COS.", "success");
    e.target.reset();
    loadCeklisRakData();
  } catch (err) {
    showLoading(false);
    Swal.fire("Gagal", err.message, "error");
  }
}

async function validateRakAction(rakId) {
  Swal.fire({
    title: "Validasi Rak",
    text: "Konfirmasi bahwa rak telah ditata sesuai standar?",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Ya, Validasi"
  }).then(async (res) => {
    if (res.isConfirmed) {
      showLoading(true, "Menyimpan validasi...");
      await ApiService.validateCeklisRak(rakId, "Selesai");
      showLoading(false);
      loadCeklisRakData();
    }
  });
}

// =================== MENU 5: SIMULASI GM RP ===================
function calculateSimulasiGm() {
  const hk = parseFloat(document.getElementById("simHk").value) || 31;
  const jhk = parseFloat(document.getElementById("simJhk").value) || 1;
  const targetSales = parseFloat(document.getElementById("simTargetSales").value) || 0;
  const actualSales = parseFloat(document.getElementById("simActualSales").value) || 0;
  const targetGm = parseFloat(document.getElementById("simTargetGm").value) || 0;
  const actualGm = parseFloat(document.getElementById("simActualGm").value) || 0;

  const acvSales = targetSales > 0 ? (actualSales / targetSales) * 100 : 0;
  const gapSales = actualSales - targetSales;
  const targetGmRp = (targetSales * targetGm) / 100;
  const actualGmRp = (actualSales * actualGm) / 100;
  const gapGmRp = actualGmRp - targetGmRp;
  const timeFactor = (jhk / hk) * 100;

  document.getElementById("resSimAcvSales").textContent = acvSales.toFixed(2) + "%";
  document.getElementById("resSimGapSales").textContent = "Rp " + gapSales.toLocaleString("id-ID");
  document.getElementById("resSimTargetGmRp").textContent = "Rp " + targetGmRp.toLocaleString("id-ID");
  document.getElementById("resSimActualGmRp").textContent = "Rp " + actualGmRp.toLocaleString("id-ID");
  document.getElementById("resSimGapGmRp").textContent = "Rp " + gapGmRp.toLocaleString("id-ID");
  document.getElementById("resSimTf").textContent = timeFactor.toFixed(1) + "%";

  const box = document.getElementById("resSimStatusBox");
  if (gapSales >= 0 && gapGmRp >= 0) {
    box.className = "status-summary-box ok";
    box.textContent = "Status: OK (Memenuhi Target Net Sales & GM Rp)";
  } else {
    box.className = "status-summary-box nok";
    box.textContent = "Status: NOK (Belum Capai Target, Genjot Penjualan Margin Tinggi!)";
  }
}

// =================== MENU 6: SALES MTD ===================
let RAW_SALES_MTD = [];
async function loadSalesMtdData() {
  showLoading(true, "Mengambil Data Sales MTD Toko...");
  try {
    const res = await ApiService.getSalesMtd();
    RAW_SALES_MTD = res.data;
    renderSalesMtdTable(RAW_SALES_MTD);
    showLoading(false);
  } catch (e) {
    showLoading(false);
  }
}

function renderSalesMtdTable(list) {
  const tbody = document.getElementById("tblBodySalesMtd");
  tbody.innerHTML = "";
  list.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.tanggal}</td>
      <td>Rp ${r.sales2024.toLocaleString("id-ID")}</td>
      <td>Rp ${r.sales2025.toLocaleString("id-ID")}</td>
      <td><b>Rp ${r.sales2026.toLocaleString("id-ID")}</b></td>
      <td>${r.std2026}</td>
      <td>Rp ${r.apc2026.toLocaleString("id-ID")}</td>
      <td><span class="pill ${r.growthStatus === 'Growth' ? 'pill-green' : 'pill-gold'}">${r.growthStatus}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function filterSalesMtd(type) {
  document.querySelectorAll(".btn-filter-tag").forEach(b => b.classList.toggle("active", b.textContent.includes(type)));
  if (type === "All") {
    renderSalesMtdTable(RAW_SALES_MTD);
  } else {
    renderSalesMtdTable(RAW_SALES_MTD.filter(r => r.growthStatus === type));
  }
}

// =================== MENU 7: SALES HARIAN ===================
async function loadSalesHarianModalData() {
  const res = await ApiService.getSalesHarian();
  const tbody = document.getElementById("tblBodySalesHarian");
  tbody.innerHTML = "";
  res.data.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.tanggal}</td>
      <td>Rp ${r.target.toLocaleString("id-ID")}</td>
      <td>Rp ${r.actual.toLocaleString("id-ID")}</td>
      <td style="color:${r.gapTarget >= 0 ? '#2E7D32':'#D32F2F'}">Rp ${r.gapTarget.toLocaleString("id-ID")}</td>
      <td><b>${r.acvPct}</b></td>
      <td>${r.actualStd}</td>
      <td>Rp ${r.actualApc.toLocaleString("id-ID")}</td>
      <td>${r.oosPct}</td>
      <td>${r.grossMargin}</td>
    `;
    tbody.appendChild(tr);
  });
}

// =================== MENU 8: IKT ===================
async function loadIktModalData() {
  const res = await ApiService.getIkt();
  const tbody = document.getElementById("tblBodyIkt");
  tbody.innerHTML = "";
  if (res.data.length > 0) {
    const ik = res.data[0];
    const items = [
      { name: "Net Sales", target: ik.targetNetSales, actual: ik.actualNetSales, acv: ik.acvSales, ket: ik.ketSales },
      { name: "Gross Margin %", target: ik.targetGmPct, actual: ik.actualGmPct, acv: ik.acvGm, ket: ik.ketGm },
      { name: "Gross Margin (Rp)", target: ik.targetGmRp, actual: ik.actGmRp, acv: ik.acvGmRp, ket: ik.ket },
      { name: "Net Profit", target: ik.targetProfit, actual: ik.actualProfit, acv: ik.acvProfit, ket: ik.ketProfit }
    ];
    items.forEach(it => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${it.name}</b></td>
        <td>${typeof it.target === 'number' ? 'Rp ' + it.target.toLocaleString('id-ID') : it.target}</td>
        <td>${typeof it.actual === 'number' ? 'Rp ' + it.actual.toLocaleString('id-ID') : it.actual}</td>
        <td><b>${it.acv}</b></td>
        <td><span class="pill ${it.ket === 'OK' ? 'pill-green':'pill-gold'}">${it.ket}</span></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// =================== MENU 9: KONVERSI NO BON ===================
const BON_CODE_MAP = {
  '0': 'M', '1': 'O', '2': 'Y', '3': 'D', '4': 'T',
  '5': 'U', '6': 'H', '7': 'C', '8': 'I', '9': 'K'
};

function handleConvertBon(rawVal) {
  let val = rawVal.replace(/[^0-9]/g, "");
  if (!val) {
    document.getElementById("txtConvertedCode").textContent = "----";
    return;
  }
  // Normalisasi maksimal 4 digit dengan leading zero jika < 4
  val = val.substring(0, 4);
  const padded = val.padStart(4, "0");
  let converted = "";
  for (let ch of padded) {
    converted += BON_CODE_MAP[ch] || "";
  }
  document.getElementById("txtConvertedCode").textContent = converted;
}

function copyConvertedCode() {
  const code = document.getElementById("txtConvertedCode").textContent;
  if (code === "----") return;
  navigator.clipboard.writeText(code);
  Swal.fire({
    icon: "success",
    title: "Disalin!",
    text: `Kode konversi ${code} telah disalin.`,
    timer: 1200,
    showConfirmButton: false
  });
}

function resetBonConverter() {
  document.getElementById("inputBonRaw").value = "";
  document.getElementById("txtConvertedCode").textContent = "----";
}

// =================== MENU 10: PENAWARAN LANGSUNG ===================
async function loadPenawaranLangsungModalData() {
  const res = await ApiService.getPenawaranLangsung();
  const tbody = document.getElementById("tblBodyPl");
  tbody.innerHTML = "";
  if (res.data.length > 0) {
    const pl = res.data[0];
    const rows = [
      { name: "PSM", t: pl.targetPsm, a: pl.aktualPsm, acv: pl.acvPsm },
      { name: "PWP", t: pl.targetPwp, a: pl.aktualPwp, acv: pl.acvPwp },
      { name: "Serba Gratis", t: pl.targetSerbaGratis, a: pl.aktualSerbaGratis, acv: pl.acvSerbaGratis },
      { name: "APC", t: pl.targetApc, a: pl.aktualApc, acv: pl.acvApc }
    ];
    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${r.name}</b></td>
        <td>${r.t.toLocaleString("id-ID")}</td>
        <td>${r.a.toLocaleString("id-ID")}</td>
        <td><b>${r.acv}</b></td>
      `;
      tbody.appendChild(tr);
    });
  }
}

// =================== MENU 15: SCAN BARANG CAMERA ===================
async function startCameraScanner() {
  const video = document.getElementById("scannerVideo");
  try {
    SCANNER_STREAM = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    video.srcObject = SCANNER_STREAM;
    video.play();
  } catch (err) {
    Swal.fire("Kamera Tidak Tersedia", "Izinkan akses kamera browser atau gunakan input manual.", "info");
  }
}

function stopScanner() {
  if (SCANNER_STREAM) {
    SCANNER_STREAM.getTracks().forEach(track => track.stop());
    SCANNER_STREAM = null;
  }
}

function handleManualBarcode() {
  const input = document.getElementById("scanManualBarcode");
  const barcode = input.value.trim();
  if (!barcode) return;

  const tbody = document.getElementById("tblBodyScanList");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><b>${barcode}</b></td>
    <td>1</td>
    <td><button class="btn-secondary" onclick="this.closest('tr').remove()">Hapus</button></td>
  `;
  tbody.prepend(tr);
  input.value = "";
}

// =================== CHAT AI GROQ ===================
async function sendChatMessage() {
  const input = document.getElementById("inputChatMsg");
  const msg = input.value.trim();
  if (!msg) return;

  input.value = "";
  const list = document.getElementById("chatMessageList");

  // Append User Bubble
  const userDiv = document.createElement("div");
  userDiv.className = "chat-bubble user";
  userDiv.innerHTML = `<p>${escapeHtml(msg).replace(/\n/g, '<br>')}</p>`;
  list.appendChild(userDiv);
  list.scrollTop = list.scrollHeight;

  // Append AI Placeholder
  const aiDiv = document.createElement("div");
  aiDiv.className = "chat-bubble ai";
  aiDiv.innerHTML = `<p><i>Sedang menganalisis performa toko Anda...</i></p>`;
  list.appendChild(aiDiv);
  list.scrollTop = list.scrollHeight;

  try {
    const res = await ApiService.chatAi(msg, CHAT_HISTORY);
    aiDiv.innerHTML = `<p>${formatMarkdown(res.answer)}</p>`;
    CHAT_HISTORY.push({ role: "user", content: msg });
    CHAT_HISTORY.push({ role: "assistant", content: res.answer });
  } catch (err) {
    aiDiv.innerHTML = `<p style="color:#C62828;">Maaf, terjadi kendala: ${err.message}</p>`;
  }
  list.scrollTop = list.scrollHeight;
}

function handleChatKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
}

// =================== EKSPOR EXCEL & PDF ===================
function exportTableToExcel(tableId, filename) {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
  XLSX.writeFile(wb, `${filename}_${CURRENT_USER.storeCode || 'Toko'}.xlsx`);
}

function exportTableToPdf(tableId, title) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "pt", "a4");

  doc.setFontSize(14);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.text(`Toko: ${CURRENT_USER.namaToko} | Cetak: ${new Date().toLocaleDateString('id-ID')}`, 40, 58);

  doc.autoTable({
    html: `#${tableId}`,
    startY: 70,
    theme: 'grid',
    styles: { fontSize: 8, font: 'helvetica' },
    headStyles: { fillColor: [30, 86, 49] }
  });

  doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
}

// =================== UTILITIES ===================
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>')
    .replace(/\n/g, '<br>');
}
