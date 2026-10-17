/**
 * ============================================================================
 * KACIDA BERSATU — MAIN APPLICATION CONTROLLER
 * File: app.js
 * ============================================================================
 */

const App = {
  currentUser: null,
  charts: {},

  async init() {
    await Api.init();
    this.checkSession();
    this.initMiniCharts();
  },

  checkSession() {
    const saved = localStorage.getItem("kacida_session");
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
        this.renderDashboard();
      } catch (e) {
        this.logout();
      }
    }
  },

  // --- AUTENTIKASI ---
  async handleLogin() {
    const nik = document.getElementById("loginNik").value.trim();
    if (!nik) return;

    this.showSyncLoading("Memverifikasi NIK...");
    const res = await Api.call("login", { nik });
    this.hideSyncLoading();

    if (res.status === "success") {
      this.currentUser = res.user;
      localStorage.setItem("kacida_session", JSON.stringify(res.user));
      localStorage.removeItem("kacida_demo_mode");
      this.renderDashboard();
      Swal.fire({
        icon: "success",
        title: "Selamat Datang!",
        text: `Halo ${res.user.nama}, Anda masuk sebagai ${res.user.role}.`,
        timer: 1800,
        showConfirmButton: false
      });
    } else {
      Swal.fire({ icon: "error", title: "Login Gagal", text: res.message });
    }
  },

  loginDemo() {
    localStorage.setItem("kacida_demo_mode", "true");
    this.currentUser = {
      nik: "12345678",
      nama: "Bung Rocky (DEMO)",
      jabatan: "Chief Of Store",
      role: "Chief of Store",
      namaToko: "2J16 - CARINGIN KULON",
      kodeToko: "2J16",
      pendingApprovals: 2,
      isSuperAdmin: false
    };
    this.renderDashboard();
  },

  logout() {
    localStorage.removeItem("kacida_session");
    localStorage.removeItem("kacida_demo_mode");
    this.currentUser = null;
    document.getElementById("dashboardApp").style.display = "none";
    document.getElementById("loginScreen").classList.add("active");
  },

  // --- RENDER DASHBOARD ---
  renderDashboard() {
    document.getElementById("loginScreen").classList.remove("active");
    document.getElementById("dashboardApp").style.display = "flex";

    const u = this.currentUser;
    document.getElementById("headerUserName").innerText = u.nama;
    document.getElementById("headerUserRole").innerText = u.jabatan;
    document.getElementById("headerStoreName").innerText = u.namaToko || "2J16 - CARINGIN KULON";
    document.getElementById("heroGreeting").innerHTML = `Selamat Pagi, ${u.nama} <span class="wave">👋</span>`;
    document.getElementById("heroRoleBadge").innerText = u.role;
    document.getElementById("heroStoreBadge").innerText = `Toko ${u.kodeToko || '2J16'}`;

    if (u.pendingApprovals > 0) {
      const b = document.getElementById("badgePendingApproval");
      b.style.display = "flex";
      b.innerText = u.pendingApprovals;
    }

    if (u.isSuperAdmin) {
      document.getElementById("menuAuditLog").style.display = "flex";
    }

    this.triggerManualSync();
  },

  // --- SYNC MANUAL ---
  async triggerManualSync() {
    this.showSyncLoading("Menghubungkan ke Google Spreadsheet...", 30);
    const res = await Api.call("syncDashboard", {
      kodeToko: this.currentUser ? this.currentUser.kodeToko : "2J16",
      nik: this.currentUser ? this.currentUser.nik : ""
    });

    this.updateSyncProgress("Memperbarui KPI & Kartu Performa...", 75);

    setTimeout(() => {
      this.updateSyncProgress("Selesai!", 100);
      setTimeout(() => {
        this.hideSyncLoading();
        if (res.status === "success" && res.data) {
          const d = res.data;
          document.getElementById("heroSalesHMin1Value").innerText = "Rp " + Number(d.salesHMin1).toLocaleString("id-ID");
          document.getElementById("kpiIktAcv").innerText = d.iktSummary.acvSales;
          document.getElementById("kpiPenawaranAcv").innerText = d.penawaranSummary.totalAcv;
          document.getElementById("lastSyncTag").innerText = "Synced " + res.timestamp;
        }
      }, 400);
    }, 600);
  },

  showSyncLoading(text, pct = 20) {
    const s = document.getElementById("syncLoadingScreen");
    s.classList.add("active");
    this.updateSyncProgress(text, pct);
  },

  updateSyncProgress(text, pct) {
    document.getElementById("loadingStatusText").innerText = text;
    document.getElementById("loadingProgressBar").style.width = pct + "%";
    document.getElementById("loadingPercentage").innerText = pct + "%";
  },

  hideSyncLoading() {
    document.getElementById("syncLoadingScreen").classList.remove("active");
  },

  // --- MODAL CONTROLLERS ---
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      this.loadModalData(modalId);
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "auto";
    }
  },

  loadModalData(modalId) {
    switch (modalId) {
      case "modalCeklisExp":
        this.loadRakData();
        break;
      case "modalSalesMtd":
        this.loadMtdChart();
        break;
      case "modalMastershift":
        this.loadMastershiftData();
        break;
    }
  },

  // --- MENU 1: CEKLIS EXP & RAK ---
  async loadRakData() {
    const tbody = document.getElementById("tbodyDataRak");
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Memuat data rak...</td></tr>`;
    
    const res = await Api.call("getRakData", { kodeToko: this.currentUser.kodeToko });
    if (res.status === "success" && res.raks) {
      if (res.raks.length === 0) {
        tbody.innerHTML = `
          <tr><td>A01</td><td>Makanan</td><td>Rina Nur</td><td><span class="badge-status ok">Selesai</span></td><td><button class="btn btn-sm btn-secondary" onclick="App.validasiRak('RAK-01')">Validasi</button></td></tr>
          <tr><td>A02</td><td>Minuman</td><td>Andi Saputra</td><td><span class="badge-status nok">Proses</span></td><td><button class="btn btn-sm btn-primary" onclick="App.selesaikanRak('RAK-02')">Selesai</button></td></tr>
        `;
      }
    }
  },

  switchCeklisTab(tabId) {
    document.querySelectorAll("#modalCeklisExp .subtab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#modalCeklisExp .subtab-pane").forEach(p => p.classList.remove("active"));
    
    event.target.classList.add("active");
    if (tabId === 'tabRak') document.getElementById("subtabRak").classList.add("active");
    if (tabId === 'tabInputExp') document.getElementById("subtabInputExp").classList.add("active");
    if (tabId === 'tabAlertExp') document.getElementById("subtabAlertExp").classList.add("active");
    if (tabId === 'tabRiwayatExp') document.getElementById("subtabRiwayatExp").classList.add("active");
  },

  // --- MENU 5: SIMULASI GM RP IKT (Kalkulasi Instan) ---
  calculateSimulasiGm() {
    const hk = Number(document.getElementById("simHk").value) || 1;
    const jhk = Number(document.getElementById("simJhk").value) || 0;
    const tSales = Number(document.getElementById("simTargetSales").value) || 0;
    const aSales = Number(document.getElementById("simActualSales").value) || 0;
    const tMargin = Number(document.getElementById("simTargetMargin").value) || 0;
    const aMargin = Number(document.getElementById("simActualMargin").value) || 0;

    const tf = (jhk / hk) * 100;
    const acvSales = tSales > 0 ? (aSales / tSales) * 100 : 0;
    const gapSales = aSales - tSales;
    const tGmRp = tSales * (tMargin / 100);
    const aGmRp = aSales * (aMargin / 100);
    const gapGmRp = aGmRp - tGmRp;

    document.getElementById("simResultTf").innerText = tf.toFixed(1) + "%";
    document.getElementById("simResultAcvSales").innerText = acvSales.toFixed(1) + "%";
    document.getElementById("simResultGapSales").innerText = (gapSales >= 0 ? "+" : "") + "Rp " + Math.round(gapSales).toLocaleString("id-ID");
    document.getElementById("simResultTargetGmRp").innerText = "Rp " + Math.round(tGmRp).toLocaleString("id-ID");
    document.getElementById("simResultActualGmRp").innerText = "Rp " + Math.round(aGmRp).toLocaleString("id-ID");
    document.getElementById("simResultGapGmRp").innerText = (gapGmRp >= 0 ? "+" : "") + "Rp " + Math.round(gapGmRp).toLocaleString("id-ID");

    const statusBadge = document.getElementById("simResultStatus");
    if (acvSales >= 100 && gapGmRp >= 0) {
      statusBadge.className = "badge-status ok";
      statusBadge.innerText = "OK";
    } else {
      statusBadge.className = "badge-status nok";
      statusBadge.innerText = "NOK";
    }
  },

  // --- MENU 9: KONVERSI NO BON/STRUK (0-9 -> MOYDTUHCIIK) ---
  convertBonNumber(val) {
    const map = {
      '0': 'M', '1': 'O', '2': 'Y', '3': 'D', '4': 'T',
      '5': 'U', '6': 'H', '7': 'C', '8': 'I', '9': 'K'
    };
    if (!val) {
      document.getElementById("bonConvertedResult").innerText = "----";
      return;
    }
    const cleanDigits = val.replace(/\D/g, '').padStart(4, '0').slice(-4);
    const converted = cleanDigits.split('').map(d => map[d] || d).join('');
    document.getElementById("bonConvertedResult").innerText = converted;
  },

  copyBonResult() {
    const text = document.getElementById("bonConvertedResult").innerText;
    if (text !== "----") {
      navigator.clipboard.writeText(text);
      Swal.fire({ icon: "success", title: "Tersalin!", text: `Sandi ${text} disalin ke clipboard.`, timer: 1200, showConfirmButton: false });
    }
  },

  resetBonInput() {
    document.getElementById("bonInputDigits").value = "";
    document.getElementById("bonConvertedResult").innerText = "----";
  },

  // --- MENU 13: MONITORING KWH LISTRIK ---
  calcKwhPreview() {
    const awal = Number(document.getElementById("kwhAwal").value) || 0;
    const akhir = Number(document.getElementById("kwhAkhir").value) || 0;
    const tarif = Number(document.getElementById("kwhTarif").value) || 1500;

    const pemakaian = Math.max(0, akhir - awal);
    const biaya = pemakaian * tarif;

    document.getElementById("kwhPreviewUsage").innerText = pemakaian.toFixed(1) + " KWH";
    document.getElementById("kwhPreviewCost").innerText = "Rp " + Math.round(biaya).toLocaleString("id-ID");
  },

  // --- MENU 15: BARCODE SCANNER ---
  startBarcodeScanner() {
    const video = document.getElementById("barcodeVideo");
    const placeholder = document.getElementById("cameraPlaceholder");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          placeholder.style.display = "none";
          video.style.display = "block";
          video.srcObject = stream;
          video.play();
          Swal.fire({ icon: "info", title: "Kamera Aktif", text: "Arahkan kamera ke barcode produk.", timer: 2000, showConfirmButton: false });
        })
        .catch(err => {
          Swal.fire({ icon: "warning", title: "Kamera Tidak Tersedia", text: "Gunakan input barcode manual di bawah." });
        });
    }
  },

  addManualBarcode() {
    const code = document.getElementById("manualBarcodeInput").value.trim();
    if (!code) return;

    const list = document.getElementById("scannedItemsList");
    const itemCard = document.createElement("div");
    itemCard.className = "scanned-item-row";
    itemCard.style.padding = "10px";
    itemCard.style.background = "#FFFFFF";
    itemCard.style.border = "1px solid #E2E8F0";
    itemCard.style.borderRadius = "8px";
    itemCard.style.marginBottom = "8px";
    itemCard.style.display = "flex";
    itemCard.style.justifyContent = "space-between";
    itemCard.style.alignItems = "center";

    itemCard.innerHTML = `
      <div>
        <strong style="font-family: monospace; font-size: 15px;">${code}</strong>
        <p style="font-size: 11px; color: #64748B;">Item Terdaftar</p>
      </div>
      <div>
        <button class="btn btn-sm btn-primary" onclick="this.parentElement.parentElement.remove()">Hapus</button>
      </div>
    `;
    list.prepend(itemCard);
    document.getElementById("manualBarcodeInput").value = "";
  },

  // --- CHAT AI GROQ ---
  openChatAiModal() {
    this.openModal("modalChatAi");
  },

  handleChatKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      this.sendChatAi();
    }
  },

  async sendChatAi() {
    const input = document.getElementById("chatAiInput");
    const msg = input.value.trim();
    if (!msg) return;

    const box = document.getElementById("chatAiMessages");
    
    // User bubble
    const userDiv = document.createElement("div");
    userDiv.className = "chat-message user";
    userDiv.style.display = "flex";
    userDiv.style.justifyContent = "flex-end";
    userDiv.style.marginBottom = "10px";
    userDiv.innerHTML = `<div style="background: #006C4E; color:#FFF; padding: 10px 14px; border-radius: 12px; max-width: 80%;">${msg}</div>`;
    box.appendChild(userDiv);

    input.value = "";
    box.scrollTop = box.scrollHeight;

    // Loading indicator
    const botDiv = document.createElement("div");
    botDiv.className = "chat-message bot";
    botDiv.style.display = "flex";
    botDiv.style.gap = "8px";
    botDiv.style.marginBottom = "10px";
    botDiv.innerHTML = `<div style="background: #E2E8F0; padding: 10px 14px; border-radius: 12px;"><em>Kacida AI sedang berpikir...</em></div>`;
    box.appendChild(botDiv);
    box.scrollTop = box.scrollHeight;

    const res = await Api.call("chatAi", {
      prompt: msg,
      kodeToko: this.currentUser ? this.currentUser.kodeToko : "2J16",
      userNik: this.currentUser ? this.currentUser.nik : "",
      userNama: this.currentUser ? this.currentUser.nama : "Rekan Retail"
    });

    if (res.status === "success") {
      botDiv.innerHTML = `<div style="background: #F1F5F9; color:#1E293B; padding: 12px 16px; border-radius: 12px; max-width: 85%; line-height: 1.5;">${res.reply.replace(/\n/g, '<br>')}</div>`;
    } else {
      botDiv.innerHTML = `<div style="background: #FEE2E2; color:#B91C1C; padding: 10px 14px; border-radius: 12px;">${res.message}</div>`;
    }
    box.scrollTop = box.scrollHeight;
  },

  clearChatAi() {
    document.getElementById("chatAiMessages").innerHTML = "";
  },

  // --- THEMES & UTILS ---
  setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem("kacida_theme", themeName);
  },

  exportTableToExcel(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
  },

  initMiniCharts() {
    // Mini Chart Sales Harian
    const ctxHarian = document.getElementById("chartMiniSalesHarian");
    if (ctxHarian) {
      new Chart(ctxHarian, {
        type: 'bar',
        data: {
          labels: ['1','2','3','4','5','6','7'],
          datasets: [{ data: [12, 14, 18, 16, 17, 19, 18.1], backgroundColor: '#0284C7', borderRadius: 4 }]
        },
        options: { plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { display: false } } }
      });
    }
  },

  openCalendarModal() { this.openModal("modalCalendar"); },
  openProfileModal() { this.openModal("modalProfile"); },
  openHelpModal() { this.openModal("modalHelp"); },
  toggleAllMenus() {
    window.scrollTo({ top: 380, behavior: 'smooth' });
  }
};

// Start application
window.addEventListener("DOMContentLoaded", () => App.init());
