/**
 * ============================================================================
 * KACIDA BERSATU — JAVASCRIPT LOGIC UTAMA (DESKTOP & HP ENGINE)
 * ============================================================================
 */

// State Global Aplikasi
let currentUser = null;
let currentStoreCode = "2J16";
let chartDonutGM = null;
let chartBarSales = null;
let chartBarIKT = null;
let chartBarPL = null;
let chartMtdTrend = null;
let html5QrScanner = null;

document.addEventListener("DOMContentLoaded", function () {
  initNetworkStatus();
  checkExistingSession();
  initBarcodeVisualDefault();
});

/* 1. KONEKSI & STATUS JARINGAN */
function initNetworkStatus() {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    const badge = document.getElementById("networkStatusBadge");
    const text = document.getElementById("networkStatusText");
    if (badge && text) {
      badge.className = isOnline ? "status-pill online" : "status-pill offline";
      text.innerText = isOnline ? "Online" : "Offline";
    }
  };
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();
}

/* 2. SESI & AUTENTIKASI */
function checkExistingSession() {
  const savedToken = sessionStorage.getItem("kacida_session_token");
  const savedUser = sessionStorage.getItem("kacida_user_data");
  if (savedToken && savedUser) {
    currentUser = JSON.parse(savedUser);
    currentStoreCode = currentUser.kodeToko || "2J16";
    launchAppDashboard();
  }
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const nik = document.getElementById("inputNik").value.trim();
  if (!nik) return;

  showLoadingScreen(true, "Memverifikasi NIK...");
  try {
    const res = await ApiService.login(nik);
    if (res.success) {
      sessionStorage.setItem("kacida_session_token", res.token);
      sessionStorage.setItem("kacida_user_data", JSON.stringify(res.user));
      currentUser = res.user;
      currentStoreCode = res.user.kodeToko || "2J16";
      launchAppDashboard();
    } else {
      showLoadingScreen(false);
      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: res.message || "NIK tidak terdaftar.",
        confirmButtonColor: "#0c4a34"
      });
    }
  } catch (err) {
    showLoadingScreen(false);
    Swal.fire({
      icon: "warning",
      title: "Mode Offline Aktif",
      text: "Tidak dapat terhubung ke server. Masuk via Demo?",
      showCancelButton: true,
      confirmButtonText: "Masuk Demo",
      confirmButtonColor: "#0c4a34"
    }).then((result) => {
      if (result.isConfirmed) handleDemoLogin();
    });
  }
}

function handleDemoLogin() {
  currentUser = {
    nik: "17060061",
    nama: "Budi Santoso (DEMO)",
    jabatan: "Chief Of Store",
    effectiveRole: "Chief Of Store",
    namaToko: "2J16 - CARINGIN KULON",
    kodeToko: "2J16",
    fotoUrl: "https://lh3.googleusercontent.com/d/1TQmADZlb7Gv6JupdThBSBfG7_S1Qn",
    isSuperAdmin: false
  };
  sessionStorage.setItem("kacida_session_token", "DEMO_TOKEN_ACTIVE");
  sessionStorage.setItem("kacida_user_data", JSON.stringify(currentUser));
  launchAppDashboard();
}

function launchAppDashboard() {
  document.getElementById("loginScreen").classList.remove("active");
  document.getElementById("appContainer").style.display = "flex";
  applyUserIdentityToUI();
  triggerManualSync();
}

function handleLogout() {
  Swal.fire({
    title: "Keluar Sesi?",
    text: "Anda harus memasukkan NIK kembali untuk masuk.",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#0c4a34",
    confirmButtonText: "Ya, Keluar"
  }).then((res) => {
    if (res.isConfirmed) {
      sessionStorage.clear();
      window.location.reload();
    }
  });
}

function applyUserIdentityToUI() {
  if (!currentUser) return;
  document.getElementById("topbarUserName").innerText = currentUser.nama;
  document.getElementById("topbarUserRole").innerText = currentUser.effectiveRole;
  document.getElementById("topbarStoreName").innerText = currentUser.namaToko;
  document.getElementById("heroGreetingText").innerText = `Selamat Datang, ${currentUser.nama}`;
  document.getElementById("heroRoleBadge").innerText = currentUser.effectiveRole;
  document.getElementById("heroStoreBadge").innerText = currentUser.namaToko;

  if (currentUser.fotoUrl) {
    document.getElementById("topbarUserPhoto").src = currentUser.fotoUrl;
    document.getElementById("heroUserPhoto").src = currentUser.fotoUrl;
    document.getElementById("profileCardAvatar").src = currentUser.fotoUrl;
  }
  document.getElementById("profileCardName").innerText = currentUser.nama;
  document.getElementById("profileCardRole").innerText = currentUser.effectiveRole;
  document.getElementById("profileCardNik").innerText = currentUser.nik;
  document.getElementById("profileCardStore").innerText = currentUser.namaToko;

  if (currentUser.isSuperAdmin || currentUser.nik === "14125034") {
    document.getElementById("sidebarSuperAdminBtn").style.display = "flex";
  }
}

/* 3. SINKRONISASI DATA UTAMA */
async function triggerManualSync() {
  showLoadingScreen(true, "Menyinkronkan data performa toko...");
  setLoadingProgress(45);

  try {
    const res = await ApiService.syncAll(currentStoreCode);
    setLoadingProgress(85);

    if (res.success) {
      if (res.summary) renderDashboardSummary(res.summary);
      if (res.pendingApprovals > 0) {
        const badge = document.getElementById("badgeBelanjaKaryawan");
        if (badge) {
          badge.style.display = "inline-block";
          badge.innerText = res.pendingApprovals;
        }
      }
    }
  } catch (e) {
    console.warn("Gagal sync online, menggunakan data simulasi lokal.");
  } finally {
    setLoadingProgress(100);
    setTimeout(() => {
      showLoadingScreen(false);
      renderAllCharts();
    }, 400);
  }
}

function renderDashboardSummary(summary) {
  if (summary.kpi) {
    document.getElementById("kpiIktValue").innerText = `${summary.kpi.ikt}%`;
    document.getElementById("kpiMtdSalesValue").innerText = `Rp ${(summary.kpi.salesMTD / 1000000).toFixed(1)} Jt`;
    document.getElementById("kpiPlValue").innerText = `${summary.kpi.penawaranLangsung}`;
    document.getElementById("kpiSalesHarianValue").innerText = `Rp ${(summary.kpi.salesHarian / 1000000).toFixed(1)} Jt`;
  }
}

/* 4. GRAFIK-GRAFIK (CHART.JS) */
function renderAllCharts() {
  // Donut Gauge GM%
  const ctxDonut = document.getElementById("chartDonutGM");
  if (ctxDonut) {
    if (chartDonutGM) chartDonutGM.destroy();
    chartDonutGM = new Chart(ctxDonut, {
      type: "doughnut",
      data: {
        datasets: [{
          data: [68, 32],
          backgroundColor: ["#10b981", "#e5e7eb"],
          borderWidth: 0
        }]
      },
      options: {
        cutout: "78%",
        responsive: false,
        plugins: { tooltip: { enabled: false } }
      }
    });
  }

  // Mini Bar Sales Harian
  const ctxSales = document.getElementById("chartBarSalesHarian");
  if (ctxSales) {
    if (chartBarSales) chartBarSales.destroy();
    chartBarSales = new Chart(ctxSales, {
      type: "bar",
      data: {
        labels: ["S","S","R","K","J","S","M"],
        datasets: [{
          data: [12, 14, 11, 16, 15, 18, 17],
          backgroundColor: "#10b981",
          borderRadius: 4
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

  // Mini Bar IKT
  const ctxIKT = document.getElementById("chartBarIKT");
  if (ctxIKT) {
    if (chartBarIKT) chartBarIKT.destroy();
    chartBarIKT = new Chart(ctxIKT, {
      type: "bar",
      data: {
        labels: ["NS", "GM", "GMR", "NP"],
        datasets: [{
          data: [92, 88, 85, 80],
          backgroundColor: "#059669",
          borderRadius: 4
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

  // Mini Bar Penawaran Langsung
  const ctxPL = document.getElementById("chartBarPL");
  if (ctxPL) {
    if (chartBarPL) chartBarPL.destroy();
    chartBarPL = new Chart(ctxPL, {
      type: "bar",
      data: {
        labels: ["PSM", "PWP", "SG", "APC"],
        datasets: [{
          data: [85, 76, 69, 82],
          backgroundColor: "#3b82f6",
          borderRadius: 4
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
}

/* 5. NAVIGASI MODAL & SUBTAB */
function openMenuModal(menuNumber) {
  const modalId = `modalMenu${menuNumber}`;
  const targetModal = document.getElementById(modalId);
  if (targetModal) {
    targetModal.classList.add("active");
    loadFeatureData(menuNumber);
  }
}

function closeModal(modalId) {
  const targetModal = document.getElementById(modalId);
  if (targetModal) {
    targetModal.classList.remove("active");
  }
  if (html5QrScanner) {
    stopCameraScanner();
  }
}

function switchModalSubtab(prefix, tabName) {
  const modal = event.target.closest(".fullscreen-modal");
  modal.querySelectorAll(".modal-tab-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  modal.querySelectorAll(".subtab-pane").forEach(pane => pane.classList.remove("active"));
  const targetPane = document.getElementById(`${prefix}_subtab_${tabName}`);
  if (targetPane) targetPane.classList.add("active");
}

/* 6. KONVERSI NOMOR BON KASIR (Menu 9) */
function handleConvertBonInput(val) {
  const mapTable = {
    "0": "M", "1": "O", "2": "Y", "3": "D", "4": "T",
    "5": "U", "6": "H", "7": "C", "8": "I", "9": "K"
  };
  let clean = val.replace(/\D/g, "");
  if (clean.length > 4) clean = clean.substring(0, 4);

  // Normalisasi 4 digit
  let padded = clean.padStart(4, "0");
  let converted = "";
  for (let ch of padded) {
    converted += mapTable[ch] || "M";
  }
  document.getElementById("convertBonResult").innerText = converted;
}

function copyConvertedBon() {
  const code = document.getElementById("convertBonResult").innerText;
  navigator.clipboard.writeText(code).then(() => {
    Swal.fire({
      icon: "success",
      title: "Tersalin!",
      text: `Kode ${code} siap ditempel di kasir.`,
      timer: 1500,
      showConfirmButton: false
    });
  });
}

function resetConvertedBon() {
  document.getElementById("inputNoBonConvert").value = "";
  document.getElementById("convertBonResult").innerText = "MMMM";
}

/* 7. SIMULASI GM RP IKT (Menu 5) */
function calculateSimulationGMRp() {
  const hk = parseFloat(document.getElementById("simHk").value) || 26;
  const jhk = parseFloat(document.getElementById("simJhk").value) || 22;
  const targetSales = parseFloat(document.getElementById("simTargetSales").value) || 0;
  const actualSales = parseFloat(document.getElementById("simActualSales").value) || 0;
  const targetMarginPct = (parseFloat(document.getElementById("simTargetGmPct").value) || 0) / 100;
  const actualMarginPct = (parseFloat(document.getElementById("simActualGmPct").value) || 0) / 100;

  const gapSales = actualSales - targetSales;
  const tgtGmRp = targetSales * targetMarginPct;
  const actGmRp = actualSales * actualMarginPct;
  const gapGmRp = actGmRp - tgtGmRp;
  const timeFactor = (jhk / hk) * 100;

  document.getElementById("resSimNetSales").innerText = formatRupiah(actualSales);
  document.getElementById("resSimGapSales").innerText = formatRupiah(gapSales);
  document.getElementById("resSimTgtGmRp").innerText = formatRupiah(tgtGmRp);
  document.getElementById("resSimActGmRp").innerText = formatRupiah(actGmRp);
  document.getElementById("resSimGapGmRp").innerText = formatRupiah(gapGmRp);
  document.getElementById("resSimTimeFactor").innerText = `${timeFactor.toFixed(1)}%`;

  const statusPill = document.getElementById("resSimStatusPill");
  if (gapGmRp >= 0) {
    statusPill.className = "badge-status-ok";
    statusPill.innerText = "STATUS: OK";
  } else {
    statusPill.className = "badge-status-nok";
    statusPill.innerText = "STATUS: NOK";
  }
}

/* 8. BARCODE GENERATOR & CAMERA SCANNER (Menu 15) */
function initBarcodeVisualDefault() {
  try {
    JsBarcode("#barcodeVisualSvg", "8991234567890", {
      format: "CODE128",
      lineColor: "#0c4a34",
      width: 2.2,
      height: 80,
      displayValue: false
    });
  } catch (e) {}
}

function startCameraScanner() {
  const box = document.getElementById("cameraScannerBox");
  box.style.display = "block";
  html5QrScanner = new Html5Qrcode("interactiveScannerArea");
  html5QrScanner.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 150 } },
    (decodedText) => {
      document.getElementById("barcodeNumberDisplay").innerText = decodedText;
      JsBarcode("#barcodeVisualSvg", decodedText, { format: "CODE128", displayValue: false });
      stopCameraScanner();
      Swal.fire({ icon: "success", title: "Barcode Terpindai!", text: decodedText, timer: 1500 });
    },
    () => {}
  );
}

function stopCameraScanner() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      document.getElementById("cameraScannerBox").style.display = "none";
    }).catch(() => {});
  }
}

/* 9. CHATBOT AI (GROQ) */
async function sendChatMessage() {
  const input = document.getElementById("chatInputMessage");
  const msg = input.value.trim();
  if (!msg) return;

  const box = document.getElementById("chatMessagesBox");
  box.innerHTML += `
    <div class="chat-bubble user">
      <div class="bubble-text">${escapeHtml(msg)}</div>
    </div>`;
  input.value = "";
  box.scrollTop = box.scrollHeight;

  const res = await ApiService.chatAI(msg);
  const reply = res.success ? res.reply : "Maaf, terjadi gangguan saat menghubungi asisten AI.";
  box.innerHTML += `
    <div class="chat-bubble bot">
      <div class="bubble-sender"><i class="fa-solid fa-robot"></i> Kacida AI</div>
      <div class="bubble-text">${escapeHtml(reply)}</div>
    </div>`;
  box.scrollTop = box.scrollHeight;
}

function handleChatKeyDown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

/* 10. MODAL CHAT & KALENDER */
function openChatAiModal() { openModal("modalChatAi"); }
function openKalenderModal() { openModal("modalKalender"); renderCalendarGrid(); }
function openProfilModal() { openModal("modalProfil"); }
function openBantuanModal() { openModal("modalBantuan"); }
function openSuperAdminModal() { openModal("modalSuperAdmin"); }

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) m.classList.add("active");
}

function renderCalendarGrid() {
  const grid = document.getElementById("interactiveCalendarGrid");
  if (!grid) return;
  grid.innerHTML = "";
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  days.forEach(d => {
    grid.innerHTML += `<div class="cal-head">${d}</div>`;
  });
  for (let i = 1; i <= 30; i++) {
    const isWeekend = (i % 7 === 5 || i % 7 === 6 || i % 7 === 0);
    grid.innerHTML += `<div class="cal-cell ${isWeekend ? 'weekend' : ''}">${i}</div>`;
  }
}

/* HELPER PROGRESS & FORMATTING */
function showLoadingScreen(show, text = "Sedang memproses...") {
  const screen = document.getElementById("loadingScreen");
  document.getElementById("loadingStatusText").innerText = text;
  if (show) screen.classList.add("active");
  else screen.classList.remove("active");
}

function setLoadingProgress(pct) {
  const circle = document.getElementById("loadingRingProgress");
  const label = document.getElementById("loadingPercentText");
  const radius = circle.r.baseVal.value;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
  label.innerText = `${pct}%`;
}

function formatRupiah(num) {
  return "Rp " + Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
