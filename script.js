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
        yAxisID: "yV",
        tension: 0.3,
        fill: false
      },
      {
        label: "Arus (A)",
        data: [],
        borderColor: "#ff5252",
        yAxisID: "yI",
        tension: 0.3,
        fill: false
      },
      {
        label: "Daya (W)",
        data: [],
        borderColor: "#ffa726",
        yAxisID: "yP",
        tension: 0.3,
        fill: false
      }
    ]
  },
  options: {
    responsive: true,
    animation: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      yV: { position: "left", title: { display: true, text: "Tegangan (V)" }},
      yI: { position: "right", title: { display: true, text: "Arus (A)" }},
      yP: { position: "right", title: { display: true, text: "Daya (W)" }}
    }
  }
});

// =====================================================
// ===== BATTERY CONFIG (12V 20Ah) =====
// =====================================================
const BATTERY_VOLTAGE = 12;
const BATTERY_CAPACITY = 20;
const BATTERY_WH = BATTERY_VOLTAGE * BATTERY_CAPACITY; // 240 Wh
const SCC_EFFICIENCY = 0.9;
const INTERVAL_SECONDS = 30; // SAMAKAN dengan interval ESP32

let totalEnergyWh = 0;

// ================= HITUNG SOC =================
function updateBatterySOC(power) {
  if (power <= 0) return;

  const energy = power * (INTERVAL_SECONDS / 3600) * SCC_EFFICIENCY;
  totalEnergyWh += energy;

  if (totalEnergyWh > BATTERY_WH) {
    totalEnergyWh = BATTERY_WH;
  }

  const soc = (totalEnergyWh / BATTERY_WH) * 100;

  const socEl = document.getElementById("soc");
  if (socEl) socEl.innerText = soc.toFixed(1);
}

// ================= STATUS DAYA =================
const POWER_NORMAL = 12.5;
const POWER_WARNING = 11.25;

function updatePowerStatus(power) {
  const statusBox = document.getElementById("statusBox");
  const statusText = document.getElementById("statusText");

  if (power < POWER_WARNING) {
    statusBox.className = "status danger";
    statusText.innerText = "⚠️ PERINGATAN: DAYA PANEL TURUN";
  } else if (power < POWER_NORMAL) {
    statusBox.className = "status warning";
    statusText.innerText = "WASPADA: DAYA MENURUN";
  }
}

// ================= REALTIME DATA =================
monitoringRef.on("value", snap => {
  if (!snap.exists()) return;

  let d = snap.val();

  if (typeof d === "object" && !d.pv_voltage) {
    const keys = Object.keys(d);
    if (keys.length === 0) return;
    d = d[keys[keys.length - 1]];
  }

  if (!d) return;

  const V = parseFloat(d.pv_voltage);
  const I = parseFloat(d.pv_current);
  const P = parseFloat(d.pv_power);

  if (isNaN(V) || isNaN(I) || isNaN(P)) return;

  // UPDATE TEXT
  document.getElementById("voltage").innerText = V.toFixed(2);
  document.getElementById("current").innerText = I.toFixed(2);
  document.getElementById("power").innerText = P.toFixed(2);

  // HITUNG SOC DARI DAYA
  updateBatterySOC(P);

  // STATUS TEGANGAN (kode lama)
  const statusBox = document.getElementById("statusBox");
  const statusText = document.getElementById("statusText");

  if (V < 41.10) {
    statusBox.className = "status warning";
    statusText.innerText = "WARNING - TEGANGAN RENDAH";
  } else {
    statusBox.className = "status normal";
    statusText.innerText = "NORMAL";
  }

  // STATUS DAYA
  updatePowerStatus(P);

  const time = new Date().toLocaleTimeString();

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
