// =====================================================
// =============== LOKASI PANEL SURYA ==================
// =====================================================
const LATITUDE  = 1.0811121649669915;
const LONGITUDE = 103.9484806101133;


// =====================================================
// ================= FIREBASE (KODE LAMA) ===============
// =====================================================
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


// =====================================================
// ============ EXPONENTIAL SMOOTHING ==================
// =====================================================
const ALPHA = 0.3;

function exponentialSmoothing(data, alpha = ALPHA) {
  if (data.length === 0) return [];
  let result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}


// =====================================================
// ================= CHART (FIX) =======================
// =====================================================
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
      },

      // ===== DATA SMOOTHING =====
      {
        label: "Tegangan Smoothed (V)",
        data: [],
        borderColor: "#90caf9",
        borderDash: [5,5],
        yAxisID: "yV",
        tension: 0.3,
        fill: false
      },
      {
        label: "Arus Smoothed (A)",
        data: [],
        borderColor: "#ef9a9a",
        borderDash: [5,5],
        yAxisID: "yI",
        tension: 0.3,
        fill: false
      },
      {
        label: "Daya Smoothed (W)",
        data: [],
        borderColor: "#ffcc80",
        borderDash: [5,5],
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
      yV: {
        position: "left",
        min: 86.8,
        max: 87.8,
        title: { display: true, text: "Tegangan (V)" }
      },
      yI: {
        position: "right",
        min: 0.28,
        max: 0.31,
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Arus (A)" }
      },
      yP: {
        position: "right",
        offset: true,
        min: 24,
        max: 26.5,
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Daya (W)" }
      }
    }
  }
});


// =====================================================
// =============== KONFIGURASI BATERAI =================
// =====================================================
const BATTERY_VOLTAGE = 12;
const BATTERY_CAPACITY = 20;
const BATTERY_WH = BATTERY_VOLTAGE * BATTERY_CAPACITY;
const SCC_EFFICIENCY = 0.9;
const INTERVAL_SECONDS = 30;

let totalEnergyWh = 0;

function updateBatterySOC(power) {
  if (power <= 0) return;
  const energy = power * (INTERVAL_SECONDS / 3600) * SCC_EFFICIENCY;
  totalEnergyWh += energy;
  if (totalEnergyWh > BATTERY_WH) totalEnergyWh = BATTERY_WH;
  document.getElementById("soc").innerText =
    ((totalEnergyWh / BATTERY_WH) * 100).toFixed(1);
}


// =====================================================
// ================= STATUS DAYA PANEL =================
// =====================================================
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


// =====================================================
// ================= REALTIME DATA =====================
// =====================================================
monitoringRef.on("value", snap => {
  if (!snap.exists()) return;

  let d = snap.val();
  if (typeof d === "object" && !d.pv_voltage) {
    const keys = Object.keys(d);
    d = d[keys[keys.length - 1]];
  }
  if (!d) return;

  const V = parseFloat(d.pv_voltage);
  const I = parseFloat(d.pv_current);
  const P = parseFloat(d.pv_power);
  if (isNaN(V) || isNaN(I) || isNaN(P)) return;

  document.getElementById("voltage").innerText = V.toFixed(2);
  document.getElementById("current").innerText = I.toFixed(2);
  document.getElementById("power").innerText = P.toFixed(2);

  updateBatterySOC(P);
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

  // === UPDATE SMOOTHING ===
  pvChart.data.datasets[3].data =
    exponentialSmoothing(pvChart.data.datasets[0].data);
  pvChart.data.datasets[4].data =
    exponentialSmoothing(pvChart.data.datasets[1].data);
  pvChart.data.datasets[5].data =
    exponentialSmoothing(pvChart.data.datasets[2].data);

  pvChart.update();
});


// =====================================================
// ================= CUACA PANEL =======================
// =====================================================
function getWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}&current_weather=true`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (!data.current_weather) return;
      document.getElementById("weatherTemp").innerText =
        data.current_weather.temperature + " °C";
      document.getElementById("weatherDesc").innerText =
        "Angin: " + data.current_weather.windspeed + " km/jam";
      document.getElementById("weatherCity").innerText =
        "Lokasi Panel Surya";
    })
    .catch(err => console.error("Weather error:", err));
}

getWeather();
setInterval(getWeather, 600000);
