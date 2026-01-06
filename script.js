// ===== FIREBASE CONFIG =====
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

// ===== SAFE NUMBER (ANTI NaN) =====
function safeNumber(v) {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

// ===== SMOOTHING =====
const alpha = 0.3;
let sV = null, sI = null, sP = null;

function smooth(prev, curr) {
  if (prev === null) return curr;
  return alpha * curr + (1 - alpha) * prev;
}

// ===== CSV =====
let csvData = [];

// ===== CHART =====
const ctx = document.getElementById("pvChart").getContext("2d");

const pvChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      { label: "V Asli", data: [], borderColor: "#4fc3f7", tension: 0.4 },
      { label: "V Smooth", data: [], borderColor: "#ff6384", borderDash: [5,5], tension: 0.4 },

      { label: "I Asli", data: [], borderColor: "#ff9800", tension: 0.4 },
      { label: "I Smooth", data: [], borderColor: "#ffd54f", borderDash: [5,5], tension: 0.4 },

      { label: "P Asli", data: [], borderColor: "#4db6ac", tension: 0.4 },
      { label: "P Smooth", data: [], borderColor: "#b388ff", borderDash: [5,5], tension: 0.4 }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false
  }
});

// ===== REALTIME (AMBIL DATA TERAKHIR) =====
monitoringRef.limitToLast(1).on("value", snap => {
  if (!snap.exists()) return;

  let d;
  snap.forEach(child => {
    d = child.val();
  });
  if (!d) return;

  const V = safeNumber(d.pv_voltage);
  const I = safeNumber(d.pv_current);
  const P = safeNumber(d.pv_power);

  document.getElementById("voltage").innerText = V.toFixed(2);
  document.getElementById("current").innerText = I.toFixed(2);
  document.getElementById("power").innerText = P.toFixed(2);

  const statusBox = document.getElementById("statusBox");
  const statusText = document.getElementById("statusText");

  if (V < 41.10) {
    statusBox.className = "status warning";
    statusText.innerText = "WARNING - TEGANGAN RENDAH";
  } else {
    statusBox.className = "status normal";
    statusText.innerText = "NORMAL";
  }

  // ===== SMOOTHING =====
  sV = smooth(sV, V);
  sI = smooth(sI, I);
  sP = smooth(sP, P);

  const time = new Date().toLocaleTimeString();

  if (pvChart.data.labels.length > 20) {
    pvChart.data.labels.shift();
    pvChart.data.datasets.forEach(ds => ds.data.shift());
  }

  pvChart.data.labels.push(time);
  pvChart.data.datasets[0].data.push(V);
  pvChart.data.datasets[1].data.push(sV);
  pvChart.data.datasets[2].data.push(I);
  pvChart.data.datasets[3].data.push(sI);
  pvChart.data.datasets[4].data.push(P);
  pvChart.data.datasets[5].data.push(sP);

  pvChart.update();

  csvData.push({ time, V, sV, I, sI, P, sP });
});

// ===== EXPORT CSV =====
function exportCSV() {
  if (csvData.length === 0) {
    alert("Data masih kosong");
    return;
  }

  let csv = "Waktu,V,V_smooth,I,I_smooth,P,P_smooth\n";
  csvData.forEach(r => {
    csv += `${r.time},${r.V},${r.sV},${r.I},${r.sI},${r.P},${r.sP}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "monitoring_pv.csv";
  a.click();
}
