// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyAhWcjyyjzd1dUAZEJ2fvGlFt1iCKCkYuE",
  authDomain: "panelmonitoring-9fda2.firebaseapp.com",
  databaseURL: "https://panelmonitoring-9fda2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "panelmonitoring-9fda2",
  storageBucket: "panelmonitoring-9fda2.firebasestorage.app",
  messagingSenderId: "536143725994",
  appId: "1:536143725994:web:eb2c422612fe3804a5d7d3"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const monitoringRef = database.ref("monitoring");

// ================= CHART =================
const ctx = document.getElementById("pvChart").getContext("2d");

const pvChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Tegangan (V)",
        data: [],
        borderColor: "#42a5f5",
        backgroundColor: "#42a5f5",
        yAxisID: "yV",
        tension: 0.3,
        pointRadius: 4,
        fill: false
      },
      {
        label: "Arus (A)",
        data: [],
        borderColor: "#ff5252",
        backgroundColor: "#ff5252",
        yAxisID: "yI",
        tension: 0.3,
        pointRadius: 4,
        fill: false
      },
      {
        label: "Daya (W)",
        data: [],
        borderColor: "#ffa726",
        backgroundColor: "#ffa726",
        yAxisID: "yP",
        tension: 0.3,
        pointRadius: 4,
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      legend: {
        position: "top"
      }
    },
    scales: {
      yV: {
        type: "linear",
        position: "left",
        title: {
          display: true,
          text: "Tegangan (V)"
        }
      },
      yI: {
        type: "linear",
        position: "right",
        title: {
          display: true,
          text: "Arus (A)"
        },
        grid: {
          drawOnChartArea: false
        }
      },
      yP: {
        type: "linear",
        position: "right",
        title: {
          display: true,
          text: "Daya (W)"
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  }
});

// ================= REALTIME DATA =================
monitoringRef.on("value", snap => {
  if (!snap.exists()) return;

  let d = snap.val();

  // Jika data hasil push ESP32
  if (typeof d === "object" && !d.pv_voltage) {
    const keys = Object.keys(d);
    if (keys.length === 0) return;
    d = d[keys[keys.length - 1]];
  }

  if (!d) return;

  const V = parseFloat(d.pv_voltage);
  const I = parseFloat(d.pv_current);
  const P = parseFloat(d.pv_power);

  // STOP jika data tidak valid
  if (isNaN(V) || isNaN(I) || isNaN(P)) return;

  // UPDATE NILAI TEKS
  document.getElementById("voltage").innerText = V.toFixed(2);
  document.getElementById("current").innerText = I.toFixed(2);
  document.getElementById("power").innerText = P.toFixed(2);

  // STATUS TEGANGAN
  const statusBox = document.getElementById("statusBox");
  const statusText = document.getElementById("statusText");

  if (V < 41.10) {
    statusBox.className = "status warning";
    statusText.innerText = "WARNING - TEGANGAN RENDAH";
  } else {
    statusBox.className = "status normal";
    statusText.innerText = "NORMAL";
  }

  const time = new Date().toLocaleTimeString();

  // BATASI DATA (AGAR RINGAN DI HP)
  if (pvChart.data.labels.length > 20) {
    pvChart.data.labels.shift();
    pvChart.data.datasets.forEach(ds => ds.data.shift());
  }

  pvChart.data.labels.push(time);
  pvChart.data.datasets[0].data.push(V);
  pvChart.data.datasets[1].data.push(I);
  pvChart.data.datasets[2].data.push(P);

  pvChart.update();
});
// =====================================================
// ===== TAMBAHAN: MONITORING BATERAI 12V 20Ah =====
// =====================================================

// PARAMETER BATERAI
const BATTERY_VOLTAGE = 12;      // Volt
const BATTERY_CAPACITY = 20;     // Ah
const BATTERY_ENERGY = BATTERY_VOLTAGE * BATTERY_CAPACITY; // 240 Wh
const SCC_EFFICIENCY = 0.9;      // 90% (MPPT asumsi)

// THRESHOLD DAYA (berdasarkan analisis sebelumnya)
const POWER_NORMAL = 12.5;   // W
const POWER_WARNING = 11.25; // W (−10%)

// HITUNG SOC BATERAI (per interval)
function calculateBatterySOC(power, intervalMinutes = 30) {
  const powerToBattery = power * SCC_EFFICIENCY;
  const energyIn = powerToBattery * (intervalMinutes / 60); // Wh
  const soc = (energyIn / BATTERY_ENERGY) * 100;
  return soc.toFixed(2);
}

// STATUS BERDASARKAN DAYA PANEL
function updatePowerStatus(power) {
  const statusBox = document.getElementById("statusBox");
  const statusText = document.getElementById("statusText");

  if (power < POWER_WARNING) {
    statusBox.className = "status danger";
    statusText.innerText = "⚠️ PERINGATAN: DAYA PANEL TURUN";
  } 
  else if (power < POWER_NORMAL) {
    statusBox.className = "status warning";
    statusText.innerText = "WASPADA: DAYA MENDEKATI BATAS";
  }
  // jika >= POWER_NORMAL → TIDAK override NORMAL dari kode lama
}

// =====================================================
// ===== INTEGRASI KE DATA REALTIME (TANPA UBAH LOGIKA) =====
// =====================================================

// Listener tambahan (tidak mengganggu listener lama)
monitoringRef.on("value", snap => {
  if (!snap.exists()) return;

  let d = snap.val();

  if (typeof d === "object" && !d.pv_voltage) {
    const keys = Object.keys(d);
    if (keys.length === 0) return;
    d = d[keys[keys.length - 1]];
  }

  if (!d) return;

  const P = parseFloat(d.pv_power);
  if (isNaN(P)) return;

  // HITUNG SOC BATERAI
  const soc = calculateBatterySOC(P);

  // Jika di HTML ada elemen SoC
  const socEl = document.getElementById("soc");
  if (socEl) {
    socEl.innerText = soc;
  }

  // CEK PENURUNAN DAYA PANEL
  updatePowerStatus(P);

  // DEBUG (opsional, bisa dihapus)
  console.log("SoC Baterai:", soc + "%");
});

