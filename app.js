/**
 * KACIDA BERSATU - App.js
 * Logika Utama Antarmuka UI, Navigasi, Form, Chart.js, Modal, dan Event Handlers.
 */

let currentUser = null;
let currentToken = null;

// INISIALISASI SAAT APPS DIBUKA
document.addEventListener("DOMContentLoaded", () => {
  checkStoredSession();
  initCharts();
  renderCalendar(new Date());
});

// MEMERIKSA SESI TERSIMPAN DI LOCALSTORAGE
function checkStoredSession() {
  const token = localStorage.getItem("kb_token");
  const user = localStorage.getItem("kb_user");
  if (token && user) {
    currentToken = token;
    currentUser = JSON.parse(user);
    showMainApp();
  } else {
    showLoginScreen();
  }
}

// HANDLE LOGIN FORM
async function handleLogin(e) {
  e.preventDefault();
  const nik = document.getElementById("nikInput").value.trim();
  if (!nik) return;

  showLoading("Memverifikasi NIK...", 30);
  const res = await ApiService.login(nik);
  hideLoading();

  if (res.success) {
    currentToken = res.token;
    currentUser = res.user;
    localStorage.setItem("kb_token", res.token);
    localStorage.setItem("kb_user", JSON.stringify(res.user));
    
    Swal.fire({
      icon: 'success',
      title: 'Login Berhasil',
      text: `Selamat Datang, ${currentUser.nama}`,
      timer: 1500,
      showConfirmButton: false
    });
    showMainApp();
  } else {
    Swal.fire('Login Gagal', res.message || 'NIK tidak valid.', 'error');
  }
}

// TAMPILKAN MAIN APP & SET UI USER DATA
function showMainApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  document.getElementById("mainApp").classList.remove("hidden");

  // Update Header UI
  document.getElementById("topUserName").innerText = currentUser.nama;
  document.getElementById("topUserRole").innerText = currentUser.jabatan;
  document.getElementById("topStoreBadge").innerText = currentUser.toko || "Store";
  document.getElementById("heroGreeting").innerText = `Selamat Datang, ${currentUser.nama}`;
  document.getElementById("heroRoleBadge").innerText = currentUser.jabatan;
  document.getElementById("heroStoreInfo").innerText = `Toko: ${currentUser.toko}`;

  if (currentUser.foto) {
    document.getElementById("topUserAvatar").src = currentUser.foto;
    document.getElementById("profileAvatar").src = currentUser.foto;
  }

  // Tampilkan menu Super Admin jika NIK matched
  if (currentUser.isSuperAdmin) {
    document.getElementById("superAdminMenu").classList.remove("hidden");
  }

  // Sync Data Awal
  triggerManualSync();
}

function showLoginScreen() {
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
}

function handleLogout() {
  Swal.fire({
    title: 'Konfirmasi Keluar',
    text: "Apakah Anda yakin ingin logout?",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Ya, Logout',
    cancelButtonText: 'Batal'
  }).then((result) => {
    if (result.isConfirmed) {
      localStorage.removeItem("kb_token");
      localStorage.removeItem("kb_user");
      location.reload();
    }
  });
}

// SYNC MANUAL & REFRESH DATA
async function triggerManualSync() {
  showLoading("Menyinkronkan Data Spreadsheet...", 50);
  const res = await ApiService.getDashboardData();
  hideLoading();

  if (res.success) {
    // Update Badges
    if (res.pendingBadges > 0) {
      document.getElementById("badgeCeklisExp").innerText = res.pendingBadges;
      document.getElementById("badgeCeklisExp").classList.remove("hidden");
      document.getElementById("badgeBelanjaKaryawan").innerText = res.pendingBadges;
      document.getElementById("badgeBelanjaKaryawan").classList.remove("hidden");
    }
    
    // Render Dynamic Menus jika ada dari sheet Menu_Navigasi
    if (res.menus && res.menus.length > 0) {
      renderDynamicMenus(res.menus);
    }
    
    document.getElementById("syncTimeStatus").innerText = `Terakhir Sinkronisasi: ${new Date().toLocaleTimeString('id-ID')}`;
  }
}

function renderDynamicMenus(menus) {
  const container = document.getElementById("dynamicMenuGrid");
  const section = document.getElementById("dynamicMenuSection");
  container.innerHTML = "";
  
  let hasActive = false;
  menus.forEach(m => {
    if (String(m.Status_Tampil || m.Status).toLowerCase() === "aktif") {
      hasActive = true;
      const card = document.createElement("div");
      card.className = "menu-item";
      card.onclick = () => window.open(m.Link_Tujuan || m.Link, "_blank");
      card.innerHTML = `
        <div class="icon-box"><i class="fa-solid fa-link"></i></div>
        <span>${m.Nama_Menu || m.Nama}</span>
      `;
      container.appendChild(card);
    }
  });

  if (hasActive) section.classList.remove("hidden");
}

// MODAL CONTROLLERS
function openModal(modalId) {
  document.getElementById(modalId).classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add("hidden");
  document.body.style.overflow = "auto";
}

function switchNav(navName) {
  document.querySelectorAll(".view-panel").forEach(el => el.classList.add("hidden"));
  document.querySelectorAll(".bottom-nav .nav-item").forEach(el => el.classList.remove("active"));
  
  if (navName === 'beranda') {
    document.getElementById("viewBeranda").classList.remove("hidden");
    document.getElementById("bnavBeranda").classList.add("active");
  } else if (navName === 'chatai') {
    document.getElementById("viewChatai").classList.remove("hidden");
    document.getElementById("bnavChatai").classList.add("active");
  } else if (navName === 'kalender') {
    document.getElementById("viewKalender").classList.remove("hidden");
    document.getElementById("bnavKalender").classList.add("active");
  } else if (navName === 'profil') {
    document.getElementById("viewProfil").classList.remove("hidden");
    document.getElementById("bnavProfil").classList.add("active");
  }
}

function switchTab(group, tabId) {
  const parent = document.getElementById(tabId).parentElement;
  parent.querySelectorAll(".tab-content").forEach(el => el.classList.add("hidden"));
  document.getElementById(tabId).classList.remove("hidden");
}

// KONVERSI BON LOGIC (MENU 9)
function convertBonCode() {
  const input = document.getElementById("inputBon").value.trim();
  const map = ['M', 'O', 'Y', 'D', 'T', 'U', 'H', 'C', 'I', 'K'];
  
  let padded = input.padStart(4, '0');
  if (padded.length > 4) padded = padded.substring(padded.length - 4);

  let result = "";
  for (let i = 0; i < padded.length; i++) {
    let digit = parseInt(padded[i]);
    result += isNaN(digit) ? '?' : map[digit];
  }
  document.getElementById("outputKonversi").innerText = result;
}

function copyKonversi() {
  const text = document.getElementById("outputKonversi").innerText;
  navigator.clipboard.writeText(text);
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Hasil disalin', showConfirmButton: false, timer: 1500 });
}

// SIMULASI GM LOGIC (MENU 5)
async function runSimulasiGm() {
  const params = {
    hk: document.getElementById("simHk").value,
    jhk: document.getElementById("simJhk").value,
    targetNetSales: document.getElementById("simTargetSales").value,
    actualNetSales: document.getElementById("simActualSales").value,
    targetMarginPct: document.getElementById("simTargetMargin").value,
    actualMarginPct: document.getElementById("simActualMargin").value
  };

  showLoading("Kalkulasi Simulasi...", 70);
  const res = await ApiService.calculateSimulasiGm(params);
  hideLoading();

  if (res.success && res.data) {
    const d = res.data;
    document.getElementById("resAcvSales").innerText = d.acvNetSales + "%";
    document.getElementById("resGapSales").innerText = "Rp " + Number(d.gapNetSales).toLocaleString('id-ID');
    document.getElementById("resTargetRp").innerText = "Rp " + Number(d.targetMarginRp).toLocaleString('id-ID');
    document.getElementById("resActualRp").innerText = "Rp " + Number(d.actualMarginRp).toLocaleString('id-ID');
    document.getElementById("resGapRp").innerText = "Rp " + Number(d.gapMarginRp).toLocaleString('id-ID');
    
    const badge = document.getElementById("resStatusBadge");
    badge.innerText = d.status;
    badge.className = d.status === "OK" ? "badge badge-success" : "badge badge-danger";
  }
}

// CHAT AI LOGIC
async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const box = document.getElementById("chatMessages");
  box.innerHTML += `<div class="msg msg-user" style="text-align:right; margin:8px 0; font-weight:600;">${text}</div>`;
  input.value = "";

  const loadingMsg = document.createElement("div");
  loadingMsg.className = "msg msg-ai";
  loadingMsg.innerText = "Sedang mengetik...";
  box.appendChild(loadingMsg);

  const res = await ApiService.askAi(text);
  box.removeChild(loadingMsg);

  if (res.success) {
    box.innerHTML += `<div class="msg msg-ai" style="background:#e0f2fe; padding:10px; border-radius:8px; margin:8px 0;">${res.reply}</div>`;
  } else {
    box.innerHTML += `<div class="msg msg-ai text-danger">${res.message || 'Gagal tersambung ke AI.'}</div>`;
  }
  box.scrollTop = box.scrollHeight;
}

// SET THEME
function setTheme(theme) {
  document.body.className = `theme-${theme}`;
}

// CHART.JS INITIALIZATION
function initCharts() {
  const ctx = document.getElementById("gaugeGm");
  if (ctx) {
    new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [68, 32],
          backgroundColor: ['#15803d', '#e5e7eb']
        }]
      },
      options: { cutout: '80%', responsive: true, plugins: { legend: { display: false } } }
    });
  }
}

// CALENDAR RENDER
function renderCalendar(date) {
  const grid = document.getElementById("calendarGrid");
  if (!grid) return;
  grid.innerHTML = "";
  
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayEl = document.createElement("div");
    dayEl.className = "cal-day";
    dayEl.innerText = day;
    
    const curDate = new Date(year, month, day);
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) { // Fri, Sat, Sun
      dayEl.style.color = "red";
      dayEl.style.fontWeight = "bold";
    }
    grid.appendChild(dayEl);
  }
}

// LOADING UTILITY
function showLoading(title, percent) {
  document.getElementById("loadingTitle").innerText = title;
  document.getElementById("progressBar").style.width = percent + "%";
  document.getElementById("globalLoading").classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("globalLoading").classList.add("hidden");
}

// EXPORT PDF / EXCEL STUB
function exportData(type, title) {
  Swal.fire('Ekspor Laporan', `Laporan ${title} berhasil diekspor ke format ${type.toUpperCase()}`, 'success');
}
