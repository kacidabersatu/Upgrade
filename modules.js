/**
 * KACIDA BERSATU - Frontend Engine
 * File: modules.js
 * Deskripsi: Logika interaktif modul ritel: Ceklis EXP, Serah Terima, Simulasi IKT, Cipher Bon, & KWH
 */

const Modules = {
  // ==========================================
  // MODUL 1: CEKLIS EXP (MANAJEMEN RAK)
  // ==========================================
  openCeklisExp: function() {
    const modal = document.getElementById('ceklisExpModal');
    modal.classList.remove('hidden');
    this.switchExpSubTab('tabRak');
  },

  switchExpSubTab: function(tabId) {
    document.querySelectorAll('.exp-subtab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.exp-tab-btn').forEach(el => el.classList.remove('border-emerald-600', 'text-emerald-600'));

    document.getElementById(tabId).classList.remove('hidden');
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) activeBtn.classList.add('border-emerald-600', 'text-emerald-600');
  },

  // Modal Step 1: 6 Checkbox SOP (Hanya State Frontend Lokal, Non-Database)
  openSopChecklistModal: function(rakId, rakName) {
    const modal = document.getElementById('sopCheckModal');
    modal.classList.remove('hidden');
    document.getElementById('sopRakNameTitle').textContent = `${rakId} - ${rakName}`;

    const checkboxes = document.querySelectorAll('.sop-checkbox');
    const continueBtn = document.getElementById('sopContinueBtn');

    checkboxes.forEach(cb => {
      cb.checked = false;
      cb.addEventListener('change', () => {
        const allChecked = Array.from(checkboxes).every(c => c.checked);
        continueBtn.disabled = !allChecked;
        if (allChecked) {
          continueBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        } else {
          continueBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
      });
    });

    continueBtn.onclick = () => {
      modal.classList.add('hidden');
      this.openUploadBuktiRakModal(rakId);
    };
  },

  openUploadBuktiRakModal: function(rakId) {
    Swal.fire({
      title: `Foto Bukti Rak ${rakId}`,
      html: `
        <p class="text-xs text-slate-500 mb-3">Ambil 1 foto bukti bahwa rak telah selesai dicek & rapi.</p>
        <input type="file" id="rakPhotoInput" accept="image/*" class="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-emerald-50 file:text-emerald-700">
        <div id="photoPreviewContainer" class="mt-3 hidden"><img id="photoPreviewImg" class="w-full h-40 object-cover rounded-xl border"></div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Kirim Bukti',
      confirmButtonColor: '#059669',
      didOpen: () => {
        const input = document.getElementById('rakPhotoInput');
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              document.getElementById('photoPreviewContainer').classList.remove('hidden');
              document.getElementById('photoPreviewImg').src = event.target.result;
            };
            reader.readAsDataURL(file);
          }
        };
      },
      preConfirm: () => {
        const file = document.getElementById('rakPhotoInput').files[0];
        if (!file) {
          Swal.showValidationMessage('Foto bukti wajib dipilih!');
          return false;
        }
        return file;
      }
    }).then(result => {
      if (result.isConfirmed) {
        Swal.fire('Terkirim!', 'Status rak diperbarui menjadi Menunggu Verifikasi.', 'success');
      }
    });
  },

  // Perhitungan Tanggal Alert Otomatis: Tgl_Exp - RH - 10 Hari Spare
  calculateAlertDate: function(expDateStr, rhDays) {
    const expDate = new Date(expDateStr);
    const offset = (Number(rhDays) || 30) + 10;
    expDate.setDate(expDate.getDate() - offset);
    return expDate.toISOString().split('T')[0];
  },

  // ==========================================
  // MODUL 2: SERAH TERIMA SHIFT & SMART REMINDER
  // ==========================================
  openSerahTerima: function() {
    document.getElementById('serahTerimaModal').classList.remove('hidden');
  },

  checkShiftReminders: function() {
    const lastDismissed = localStorage.getItem('kacida_shift_popup_dismissed');
    const now = new Date();
    const currentHour = now.getHours();

    // Popup reminder Shift 1 -> Shift 2: Jam 15:00 s.d 23:00
    if (currentHour >= 15 && currentHour <= 23 && lastDismissed !== 'shift1_ok') {
      Swal.fire({
        title: 'Pengingat Serah Terima!',
        html: '<p class="text-sm">Personil Shift 1 telah selesai? Pastikan data brankas, sales, dan kendala operasional sudah diserahterimakan ke Shift 2.</p>',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'OKE (Sudah Terima)',
        cancelButtonText: 'X (Nanti)',
        confirmButtonColor: '#059669',
        cancelButtonColor: '#94a3b8'
      }).then(res => {
        if (res.isConfirmed) {
          localStorage.setItem('kacida_shift_popup_dismissed', 'shift1_ok');
        }
      });
    }
  },

  // ==========================================
  // MODUL 6: SIMULASI GM RP IKT (KALKULATOR INSTAN)
  // ==========================================
  openSimulasiIkt: function() {
    document.getElementById('simulasiIktModal').classList.remove('hidden');
    this.calculateIktSimulasi();
  },

  calculateIktSimulasi: function() {
    const hk = Number(document.getElementById('simHkInput').value) || 26;
    const jhk = Number(document.getElementById('simJhkInput').value) || 1;
    const targetNetSales = Number(document.getElementById('simTargetSalesInput').value) || 0;
    const actualNetSales = Number(document.getElementById('simActualSalesInput').value) || 0;
    const targetGmPct = Number(document.getElementById('simTargetGmInput').value) || 0;
    const actualGmPct = Number(document.getElementById('simActualGmInput').value) || 0;

    // 1. Time Faktor
    const timeFaktor = hk > 0 ? (jhk / hk) : 0;
    document.getElementById('simTfResult').textContent = `${(timeFaktor * 100).toFixed(1)}%`;

    // 2. Target Sales s/d JHK & Gap
    const targetSdJhk = timeFaktor * targetNetSales;
    const gapSales = actualNetSales - targetSdJhk;
    const salesStatusEl = document.getElementById('simSalesStatus');
    document.getElementById('simTargetSdJhkText').textContent = `Rp ${Math.round(targetSdJhk).toLocaleString('id-ID')}`;
    document.getElementById('simGapSalesText').textContent = `Rp ${Math.round(gapSales).toLocaleString('id-ID')}`;

    if (gapSales >= 0) {
      salesStatusEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700';
      salesStatusEl.textContent = 'OKE';
    } else {
      salesStatusEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700';
      salesStatusEl.textContent = 'NOK';
    }

    // 3. Margin Rupiah & Gap
    const targetGmRp = targetNetSales * (targetGmPct / 100);
    const actualGmRp = actualNetSales * (actualGmPct / 100);
    const targetGmRpSdJhk = timeFaktor * targetGmRp;
    const gapGmRp = targetGmRpSdJhk - actualGmRp;
    const gmStatusEl = document.getElementById('simGmStatus');

    document.getElementById('simTargetGmRpText').textContent = `Rp ${Math.round(targetGmRpSdJhk).toLocaleString('id-ID')}`;
    document.getElementById('simActualGmRpText').textContent = `Rp ${Math.round(actualGmRp).toLocaleString('id-ID')}`;
    document.getElementById('simGapGmRpText').textContent = `Rp ${Math.round(gapGmRp).toLocaleString('id-ID')}`;

    if (gapGmRp <= 0) {
      gmStatusEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700';
      gmStatusEl.textContent = 'OKE';
    } else {
      gmStatusEl.className = 'px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700';
      gmStatusEl.textContent = 'NOK';
    }
  },

  // ==========================================
  // MODUL 10: CIPHER NO BON / STRUK KASIR
  // ==========================================
  openCipherStruk: function() {
    document.getElementById('cipherStrukModal').classList.remove('hidden');
    document.getElementById('cipherBonInput').focus();
  },

  convertBonNumber: function(rawVal) {
    const cipherMap = {
      '0': 'M', '1': 'O', '2': 'Y', '3': 'D', '4': 'T',
      '5': 'U', '6': 'H', '7': 'C', '8': 'I', '9': 'K'
    };

    let cleaned = rawVal.replace(/\D/g, '');
    if (cleaned.length > 4) cleaned = cleaned.substring(cleaned.length - 4);

    // Auto padStart 4 digit
    const padded = cleaned.padStart(4, '0');
    let converted = '';
    for (let char of padded) {
      converted += cipherMap[char] || '';
    }

    const outputEl = document.getElementById('cipherResultDisplay');
    outputEl.textContent = converted;

    // Animasi breakdown per karakter
    const breakdownEl = document.getElementById('cipherBreakdown');
    breakdownEl.innerHTML = '';
    for (let i = 0; i < padded.length; i++) {
      const chip = document.createElement('div');
      chip.className = 'flex flex-col items-center bg-slate-100 dark:bg-slate-800 p-2 rounded-xl text-center';
      chip.innerHTML = `<span class="text-xs text-slate-400">${padded[i]}</span><span class="text-lg font-bold text-emerald-600">${converted[i]}</span>`;
      breakdownEl.appendChild(chip);
    }
  },

  // ==========================================
  // MODUL 14: MONITORING KWH LISTRIK TOKO
  // ==========================================
  openMonitoringKwh: function() {
    document.getElementById('monitoringKwhModal').classList.remove('hidden');
  },

  calculateKwhUsage: function() {
    const jenis = document.getElementById('kwhJenisSelect').value;
    const awal = Number(document.getElementById('kwhAwalInput').value) || 0;
    const akhir = Number(document.getElementById('kwhAkhirInput').value) || 0;
    const tarif = Number(document.getElementById('kwhTarifInput').value) || 1444;

    let pemakaian = 0;
    const errorEl = document.getElementById('kwhCalcError');
    errorEl.classList.add('hidden');

    if (jenis === 'PREPAID') {
      // PREPAID TOKEN: Pemakaian = Awal - Akhir
      if (akhir > awal) {
        errorEl.textContent = 'Pada PREPAID, Sisa Akhir tidak boleh lebih besar dari Sisa Awal!';
        errorEl.classList.remove('hidden');
        return;
      }
      pemakaian = awal - akhir;
    } else {
      // POSTPAID TAGIHAN: Pemakaian = Akhir - Awal
      if (akhir < awal) {
        errorEl.textContent = 'Pada POSTPAID, Angka Akhir tidak boleh lebih kecil dari Angka Awal!';
        errorEl.classList.remove('hidden');
        return;
      }
      pemakaian = akhir - awal;
    }

    const totalBiaya = pemakaian * tarif;
    document.getElementById('kwhUsageResult').textContent = `${pemakaian.toFixed(1)} kWh`;
    document.getElementById('kwhCostResult').textContent = `Rp ${Math.round(totalBiaya).toLocaleString('id-ID')}`;
  },

  // Modul Pembuka Tambahan
  openTabunganku: function() {
    document.getElementById('tabungankuModal').classList.remove('hidden');
  },

  openKasArea: function() {
    if (!AppState.user) return;
    if (AppState.user.jabatan !== 'Chief Of Store' && AppState.user.jabatan !== 'AREA COORDINATOR') {
      Swal.fire({
        icon: 'error',
        title: 'Akses Ditolak (403)',
        text: `Menu Kas Area khusus Chief Of Store & Area Coordinator. Jabatan Anda: ${AppState.user.jabatan}`
      });
      return;
    }
    document.getElementById('kasAreaModal').classList.remove('hidden');
  },

  openDonasiArea: function() {
    document.getElementById('donasiAreaModal').classList.remove('hidden');
  }
};
