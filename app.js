/**
 * ============================================================================
 * KACIDA BERSATU — MAIN APPLICATION CONTROLLER (FIXED & FULL PRODUCTION)
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
    const inputNik = document.getElementById("loginNik");
    const nik = inputNik ? inputNik.value.trim() : "";

    if (!nik) {
      Swal.fire({
        icon: "warning",
        title: "NIK Wajib Diisi",
        text: "Silakan masukkan NIK terdaftar Anda.",
        confirmButtonColor: "#006C4E"
      });
      return;
    }

    // Matikan flag demo karena user ingin login riil
    localStorage.removeItem("kacida_demo_mode");
    this.showSyncLoading("Memverifikasi NIK ke Database Google Spreadsheet...", 35);

    const res = await Api.call("login", { nik: nik });
    this.hideSyncLoading();

    if (res.status === "success" && res.user) {
      this.currentUser = res.user;
      localStorage.setItem("kacida_session", JSON.stringify(res.user));
      this.renderDashboard();
      
      Swal.fire({
        icon: "success",
        title: "Login Berhasil!",
        text: `Selamat datang, ${res.user.nama} (${res.user.role}).`,
        timer: 1800,
        showConfirmButton: false
      });
    } else {
      Swal.fire({
        icon: "error",
        title: "Login Gagal",
        text: res.message || "NIK tidak ditemukan pada database Master_User.",
        confirmButtonColor: "#006C4E"
      });
    }
  },

  loginDemo() {
    // 1. Tutup modal/alert yang mungkin sedang aktif
    if (typeof Swal !== "undefined") Swal.close();
    this.hideSyncLoading();

    // 2. Set status demo dan profil default
    localStorage.setItem("kacida_demo_mode", "true");
    this.currentUser = {
      nik: "12345678",
      nama: "Bung Rocky (DEMO)",
      jabatan: "Chief Of Store",
      role: "Chief of Store",
      namaToko: "2J16 - CARINGIN KULON",
      kodeToko: "2J16",
      fotoProfil: "",
      poinTotal: 120,
      rankArea: "#5",
      pendingApprovals: 2,
      isSuperAdmin: false
    };

    // 3. Simpan sesi agar tidak hilang saat reload halaman
    localStorage.setItem("kacida_session", JSON.stringify(this.currentUser));

    // 4. Buka Dashboard
    this.renderDashboard();

    Swal.fire({
      icon: "success",
      title: "Mode Demo Aktif",
      text: "Anda masuk menggunakan akun simulasi Bung Rocky (Toko 2J16 - CARINGIN KULON).",
      timer: 1600,
      showConfirmButton: false
    });
  },

  logout() {
    localStorage.removeItem("kacida_session");
    localStorage.removeItem("kacida_demo_mode");
    this.currentUser = null;

    const appLayout = document.getElementById("dashboardApp");
    const loginScreen = document.getElementById("loginScreen");

    if (appLayout) appLayout.style.display = "none";
    if (loginScreen) loginScreen.classList.add("active");

    const inputNik = document.getElementById("loginNik");
    if (inputNik) inputNik.value = "";
  },

  // --- RENDER DASHBOARD ---
  renderDashboard() {
    const loginScreen = document.getElementById("loginScreen");
    const appLayout = document.getElementById("dashboardApp");

    if (loginScreen) loginScreen.classList.remove("active");
    if (appLayout) appLayout.style.display = "flex";

    const u = this.currentUser;
    if (!u) return;

    // Pasang identitas pengguna pada header dan hero card
    const elHeaderName = document.getElementById("headerUserName");
    const elHeaderRole = document.getElementById("headerUserRole");
    const elHeaderStore = document.getElementById("headerStoreName");
    const elHeroGreeting = document.getElementById("heroGreeting");
    const elHeroRoleBadge = document.getElementById("heroRoleBadge");
    const elHeroStoreBadge = document.getElementById("heroStoreBadge");

    if (elHeaderName) elHeaderName.innerText = u.nama;
    if (elHeaderRole) elHeaderRole.innerText = u.jabatan;
    if (elHeaderStore) elHeaderStore.innerText = u.namaToko || "2J16 - CARINGIN KULON";
    if (elHeroGreeting) elHeroGreeting.innerHTML = `Selamat Pagi, ${u.nama} <span class="wave">👋</span>`;
    if (elHeroRoleBadge) elHeroRoleBadge.innerText = u.role;
    if (elHeroStoreBadge) elHeroStoreBadge.innerText = `Toko ${u.kodeToko || '2J16'}`;

    // Badge approval tertunda khusus Chief of Store / Super Admin
    const badgeApproval = document.getElementById("badgePendingApproval");
    if (badgeApproval) {
      if (u.pendingApprovals > 0) {
        badgeApproval.style.display = "flex";
        badgeApproval.innerText = u.pendingApprovals;
      } else {
        badgeApproval.style.display = "none";
      }
    }

    // Menu khusus Super Admin
    const menuAudit = document.getElementById("menuAuditLog");
    if (menuAudit) {
      menuAudit.style.display = u.isSuperAdmin ? "flex" : "none";
    }

    // Trigger sync otomatis saat dashboard dimuat
    this.triggerManualSync();
  },

  // --- SYNC MANUAL ---
  async triggerManualSync() {
    const isDemo = localStorage.getItem("kacida_demo_mode") === "true";
    this.showSyncLoading(isDemo ? "Sinkronisasi data Mode Demo..." : "Menghubungkan ke Google Spreadsheet...", 35);

    const res = await Api.call("syncDashboard", {
      kodeToko: this.currentUser ? this.currentUser.kodeToko : "2J16",
      nik: this.currentUser ? this.currentUser.nik : ""
    });

    this.updateSyncProgress("Memperbarui KPI & Kartu Performa...", 80);

    setTimeout(() => {
      this.updateSyncProgress("Selesai!", 100);
      setTimeout(() => {
        this.hideSyncLoading();
        if (res.status === "success" && res.data) {
          const d = res.data;
          const elHMin1 = document.getElementById("heroSalesHMin1Value");
          const elIkt = document.getElementById("kpiIktAcv");
          const elPenawaran = document.getElementById("kpiPenawaranAcv");
          const elLastSync = document.getElementById("lastSyncTag");

          if (elHMin1 && d.salesHMin1 !== undefined) {
            elHMin1.innerText = "Rp " + Number(d.salesHMin1).toLocaleString("id-ID");
          }
          if (elIkt && d.iktSummary) {
            elIkt.innerText = d.iktSummary.acvSales || "0%";
          }
          if (elPenawaran && d.penawaranSummary) {
            elPenawaran.innerText = d.penawaranSummary.totalAcv || "0%";
          }
          if (elLastSync) {
            elLastSync.innerText = "Synced " + (res.timestamp || "Barusan");
          }
        }
      }, 300);
    }, 400);
  },

  showSyncLoading(text, pct = 20) {
    const s = document.getElementById("syncLoadingScreen");
    if (s) {
      s.classList.add("active");
      this.updateSyncProgress(text, pct);
    }
  },

  updateSyncProgress(text, pct) {
    const elText = document.getElementById("loadingStatusText");
    const elBar = document.getElementById("loadingProgressBar");
    const elPct = document.getElementById("loadingPercentage");

    if (elText) elText.innerText = text;
    if (elBar) elBar.style.width = pct + "%";
    if (elPct) elPct.innerText = pct + "%";
  },

  hideSyncLoading() {
    const s = document.getElementById("syncLoadingScreen");
    if (s) s.classList.remove("active");
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
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Memuat data rak...</td></tr>`;
    
    const res = await Api.call("getRakData", {
      kodeToko: this.currentUser ? this.currentUser.kodeToko : "2J16"
    });

    if (res.status === "success" && res.raks && res.raks.length > 0) {
      tbody.innerHTML = res.raks.map(r => `
        <tr>
          <td><strong>${r.NO_RAK}</strong></td>
          <td>${r.KATEGORI}</td>
          <td>${r.PJ_NAMA || '-'}</td>
          <td><span class="badge-status ${r.STATUS === 'SELESAI' ? 'ok' : 'nok'}">${r.STATUS}</span></td>
          <td>
            ${r.STATUS === 'MENUNGGU_VALIDASI' ? 
              `<button class="btn btn-sm btn-secondary" onclick="App.validasiRak('${r.ID}')">Validasi</button>` : 
              `<button class="btn btn-sm btn-primary" onclick="App.selesaikanRak('${r.NO_RAK}')">Upload Bukti</button>`}
          </td>
        </tr>
      `).join('');
    } else {
      // Mock data awal jika sheet masih kosong
      tbody.innerHTML = `
        <tr><td><strong>A01</strong></td><td>Makanan</td><td>Rina Nur</td><td><span class="badge-status ok">Selesai</span></td><td><span class="text-muted">Tervalidasi</span></td></tr>
        <tr><td><strong>A02</strong></td><td>Minuman</td><td>Andi Saputra</td><td><span class="badge-status nok">Belum</span></td><td><button class="btn btn-sm btn-primary" onclick="App.selesaikanRak('A02')">Upload Bukti</button></td></tr>
        <tr><td><strong>A03</strong></td><td>Snack</td><td>Siti Aisyah</td><td><span class="badge-status nok">Proses</span></td><td><button class="btn btn-sm btn-primary" onclick="App.selesaikanRak('A03')">Upload Bukti</button></td></tr>
      `;
    }
  },

  switchCeklisTab(tabId) {
    document.querySelectorAll("#modalCeklisExp .subtab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll("#modalCeklisExp .subtab-pane").forEach(p => p.classList.remove("active"));
    
    if (event && event.target) event.target.classList.add("active");
    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add("active");
  },

  selesaikanRak(noRak) {
    Swal.fire({
      title: `Penyelesaian Rak ${noRak}`,
      text: "Apakah rak ini sudah selesai dicek dan dibersihkan?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#006C4E",
      confirmButtonText: "Ya, Selesai",
      cancelButtonText: "Batal"
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: "success",
          title: "Terkirim!",
          text: `Pekerjaan Rak ${noRak} berhasil dilaporkan untuk divalidasi Chief of Store.`,
          timer: 1600,
          showConfirmButton: false
        });
      }
    });
  },

  // --- MENU 5: SIMULASI GM RP IKT (Kalkulasi Instan) ---
  calculateSimulasiGm() {
    const hk = Number(document.getElementById("simHk")?.value) || 1;
    const jhk = Number(document.getElementById("simJhk")?.value) || 0;
    const tSales = Number(document.getElementById("simTargetSales")?.value) || 0;
    const aSales = Number(document.getElementById("simActualSales")?.value) || 0;
    const tMargin = Number(document.getElementById("simTargetMargin")?.value) || 0;
    const aMargin = Number(document.getElementById("simActualMargin")?.value) || 0;

    const tf = (jhk / hk) * 100;
    const acvSales = tSales > 0 ? (aSales / tSales) * 100 : 0;
    const gapSales = aSales - tSales;
    const tGmRp = tSales * (tMargin / 100);
    const aGmRp = aSales * (aMargin / 100);
    const gapGmRp = aGmRp - tGmRp;

    const elTf = document.getElementById("simResultTf");
    const elAcvSales = document.getElementById("simResultAcvSales");
    const elGapSales = document.getElementById("simResultGapSales");
    const elTGmRp = document.getElementById("simResultTargetGmRp");
    const elAGmRp = document.getElementById("simResultActualGmRp");
    const elGapGmRp = document.getElementById("simResultGapGmRp");
    const statusBadge = document.getElementById("simResultStatus");

    if (elTf) elTf.innerText = tf.toFixed(1) + "%";
    if (elAcvSales) elAcvSales.innerText = acvSales.toFixed(1) + "%";
    if (elGapSales) elGapSales.innerText = (gapSales >= 0 ? "+" : "") + "Rp " + Math.round(gapSales).toLocaleString("id-ID");
    if (elTGmRp) elTGmRp.innerText = "Rp " + Math.round(tGmRp).toLocaleString("id-ID");
    if (elAGmRp) elAGmRp.innerText = "Rp " + Math.round(aGmRp).toLocaleString("id-ID");
    if (elGapGmRp) elGapGmRp.innerText = (gapGmRp >= 0 ? "+" : "") + "Rp " + Math.round(gapGmRp).toLocaleString("id-ID");

    if (statusBadge) {
      if (acvSales >= 100 && gapGmRp >= 0) {
        statusBadge.className = "badge-status ok";
        statusBadge.innerText = "OK";
      } else {
        statusBadge.className = "badge-status nok";
        statusBadge.innerText = "NOK";
      }
    }
  },

  resetSimulasiGm() {
    document.getElementById("simTargetSales").value = 500000000;
    document.getElementById("simActualSales").value = 482000000;
    document.getElementById("simTargetMargin").value = 18;
    document.getElementById("simActualMargin").value = 18;
    this.calculateSimulasiGm();
  },

  // --- MENU 9: KONVERSI NO BON/STRUK (0-9 -> MOYDTUHCIIK) ---
  convertBonNumber(val) {
    const map = {
      '0': 'M', '1': 'O', '2': 'Y', '3': 'D', '4': 'T',
      '5': 'U', '6': 'H', '7': 'C', '8': 'I', '9': 'K'
    };

    const out = document.getElementById("bonConvertedResult");
    if (!out) return;

    if (!val) {
      out.innerText = "----";
      return;
    }

    const cleanDigits = val.replace(/\D/g, '').padStart(4, '0').slice(-4);
    const converted = cleanDigits.split('').map(d => map[d] || d).join('');
    out.innerText = converted;
  },

  copyBonResult() {
    const el = document.getElementById("bonConvertedResult");
    const text = el ? el.innerText : "";
    if (text && text !== "----") {
      navigator.clipboard.writeText(text);
      Swal.fire({
        icon: "success",
        title: "Tersalin!",
        text: `Sandi ${text} berhasil disalin ke clipboard.`,
        timer: 1300,
        showConfirmButton: false
      });
    }
  },

  resetBonInput() {
    const input = document.getElementById("bonInputDigits");
    const out = document.getElementById("bonConvertedResult");
    if (input) input.value = "";
    if (out) out.innerText = "----";
  },

  // --- MENU 13: MONITORING KWH LISTRIK ---
  calcKwhPreview() {
    const awal = Number(document.getElementById("kwhAwal")?.value) || 0;
    const akhir = Number(document.getElementById("kwhAkhir")?.value) || 0;
    const tarif = Number(document.getElementById("kwhTarif")?.value) || 1500;

    const pemakaian = Math.max(0, akhir - awal);
    const biaya = pemakaian * tarif;

    const elUsage = document.getElementById("kwhPreviewUsage");
    const elCost = document.getElementById("kwhPreviewCost");

    if (elUsage) elUsage.innerText = pemakaian.toFixed(1) + " KWH";
    if (elCost) elCost.innerText = "Rp " + Math.round(biaya).toLocaleString("id-ID");
  },

  // --- MENU 15: BARCODE SCANNER ---
  startBarcodeScanner() {
    const video = document.getElementById("barcodeVideo");
    const placeholder = document.getElementById("cameraPlaceholder");
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(stream => {
          if (placeholder) placeholder.style.display = "none";
          if (video) {
            video.style.display = "block";
            video.srcObject = stream;
            video.play();
          }
          Swal.fire({ icon: "info", title: "Kamera Aktif", text: "Arahkan kamera ke barcode produk fisik.", timer: 2000, showConfirmButton: false });
        })
        .catch(err => {
          Swal.fire({ icon: "warning", title: "Kamera Tidak Terdeteksi", text: "Silakan gunakan input nomor barcode manual." });
        });
    }
  },

  addManualBarcode() {
    const input = document.getElementById("manualBarcodeInput");
    const code = input ? input.value.trim() : "";
    if (!code) return;

    const list = document.getElementById("scannedItemsList");
    if (!list) return;

    const itemCard = document.createElement("div");
    itemCard.className = "scanned-item-row";
    itemCard.style.cssText = "padding: 10px 14px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;";

    itemCard.innerHTML = `
      <div>
        <strong style="font-family: monospace; font-size: 15px; color: #006C4E;">${code}</strong>
        <p style="font-size: 11px; color: #64748B;">Item Kasir Siap Input</p>
      </div>
      <div>
        <button class="btn btn-sm btn-secondary" onclick="this.parentElement.parentElement.remove()">Hapus</button>
      </div>
    `;
    list.prepend(itemCard);
    input.value = "";
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
    const msg = input ? input.value.trim() : "";
    if (!msg) return;

    const box = document.getElementById("chatAiMessages");
    if (!box) return;
    
    // Bubble pertanyaan user
    const userDiv = document.createElement("div");
    userDiv.className = "chat-message user";
    userDiv.style.cssText = "display: flex; justify-content: flex-end; margin-bottom: 12px;";
    userDiv.innerHTML = `<div style="background: #006C4E; color: #FFFFFF; padding: 10px 16px; border-radius: 14px; max-width: 80%; line-height: 1.4;">${msg}</div>`;
    box.appendChild(userDiv);

    input.value = "";
    box.scrollTop = box.scrollHeight;

    // Loading indicator bot
    const botDiv = document.createElement("div");
    botDiv.className = "chat-message bot";
    botDiv.style.cssText = "display: flex; gap: 8px; margin-bottom: 12px;";
    botDiv.innerHTML = `<div style="background: #E2E8F0; padding: 10px 14px; border-radius: 12px; font-size: 13px;"><em>Kacida AI sedang berpikir...</em></div>`;
    box.appendChild(botDiv);
    box.scrollTop = box.scrollHeight;

    const res = await Api.call("chatAi", {
      prompt: msg,
      kodeToko: this.currentUser ? this.currentUser.kodeToko : "2J16",
      userNik: this.currentUser ? this.currentUser.nik : "",
      userNama: this.currentUser ? this.currentUser.nama : "Bung Rocky"
    });

    if (res.status === "success") {
      botDiv.innerHTML = `<div style="background: #F8FAF9; border: 1px solid #E2E8F0; color: #1E293B; padding: 12px 16px; border-radius: 14px; max-width: 85%; line-height: 1.5;">${res.reply.replace(/\n/g, '<br>')}</div>`;
    } else {
      botDiv.innerHTML = `<div style="background: #FEE2E2; color: #B91C1C; padding: 10px 14px; border-radius: 12px;">${res.message}</div>`;
    }
    box.scrollTop = box.scrollHeight;
  },

  clearChatAi() {
    const box = document.getElementById("chatAiMessages");
    if (box) {
      box.innerHTML = `
        <div class="chat-message bot">
          <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
          <div class="msg-bubble">
            Halo Bung Rocky! Ada yang bisa saya bantu terkait performa toko atau operasional kasir hari ini?
          </div>
        </div>
      `;
    }
  },

  // --- THEMES & EXPORT ---
  setTheme(themeName) {
    document.body.className = themeName;
    localStorage.setItem("kacida_theme", themeName);
  },

  exportTableToExcel(tableId, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;
    if (typeof XLSX === "undefined") {
      Swal.fire({ icon: "error", title: "Ekspor Gagal", text: "Pustaka XLSX belum termuat sempurna." });
      return;
    }
    const wb = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
  },

  initMiniCharts() {
    const ctxHarian = document.getElementById("chartMiniSalesHarian");
    if (ctxHarian && typeof Chart !== "undefined") {
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

// Mulai aplikasi saat DOM telah siap
window.addEventListener("DOMContentLoaded", () => App.init());
