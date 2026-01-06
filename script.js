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

// ================= SMOOTHING =================
const alpha = 0.3;
let sV = null, sI = null, sP = null;

function smooth(prev, curr) {
  if (prev === null) return curr;
  return alpha * curr + (1 - alpha) * prev;
}

// ================= CHART =================
const ctx = document.getElementById("pvChart").getContext("2d");

const pvChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "V Asli",
        data: [],
        borderColor: "#4fc3f7",
        tension: 0.4,
        showLine: true,
        spanGaps: true,
        pointRadius: 2
      },
      {
        label: "V Smooth",
        data: [],
        borderColor: "#ff6384",
        borderDash: [5, 5],
        tension: 0.4,
        showLine: true,
        spanGaps: true,
        pointRadius: 0
      },
      {
        label: "I Asli",
        data: [],
        borderColor: "#ff9800",
        tension: 0.4,
        showLine: true,
        spanGaps: true,
        pointRadius: 2
      },
      {
        label: "I Smooth",
        data: [],
        borderColor: "#ffd54f",
        borderDash: [5, 5],
        tension: 0.4,
        showLine: true,
        spanGaps: true,
        pointRadius: 0
      },
      {
        label: "P Asli",
        data: [],
        borderColor: "#4db6ac",
        tension: 0.4,
        showLine: true,
        spanGaps: true,
        pointRadius: 2
      },
      {
        label: "P Smooth",
        data: [],
        borderColor: "#b388ff",
        borderDash: [5, 5],
        tension: 0.4,
        showLine: true,
        spanGaps: true,
        pointRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    scales: {
      x: { ticks: { maxRotation: 0 } }
    }
  }
});

// ================= CSV =================
let csvData = [];

// ================= REALTIME (ANTI 0 & NaN & HP SAFE) =================
let lastV = null, lastI = null, lastP = null;

monitoringRef.on("value", snap => {
  if (!snap.exists()) return;

  let d = snap.val();

  // 🔥 JIKA DATA BENTUK PUSH (OBJECT)
  if (typeof d === "object" && d.pv_voltage === undefined) {
    const keys = Object.keys(d);
    if (keys.length === 0) return;
    d = d[keys[keys.length - 1]];
  }

  if (!d) return;

  const V = parseFloat(d.pv_voltage);
  const I = parseFloat(d.pv_current);
  const P = parseFloat(d.pv_power);

  if (!isNaN(V)) lastV = V;
  if (!isNaN(I)) lastI = I;
  if (!isNaN(P)) lastP = P;

  // ⛔ STOP JIKA BELUM ADA DATA VALID
  if (lastV === null || lastI === null || lastP === null) return;

  // ================= UI =================
  document.getElementById("voltage").innerText = lastV.toFixed(2);
  document.getElementById("current").innerText = lastI.toFixed(2);
  document.getElementById("power").innerText = lastP.toFixed(2);

  // ================= STATUS =================
  const statusBox = document.getElementById("statusBox");
  const statusText = document.getElementById("statusText");

  if (lastV < 41.1) {
    statusBox.className = "status warning";
    statusText.innerText = "WARNING - TEGANGAN RENDAH";
  } else {
    statusBox.className = "status normal";
    statusText.innerText = "NORMAL";
  }

  // ================= SMOOTH =================
  sV = smooth(sV, lastV);
  sI = smooth(sI, lastI);
  sP = smooth(sP, lastP);

  const time = new Date().toLocaleTimeString();

  if (pvChart.data.labels.length > 30) {
    pvChart.data.labels.shift();
    pvChart.data.datasets.forEach(ds => ds.data.shift());
  }

  pvChart.data.labels.push(time);
  pvChart.data.datasets[0].data.push(lastV);
  pvChart.data.datasets[1].data.push(sV);
  pvChart.data.datasets[2].data.push(lastI);
  pvChart.data.datasets[3].data.push(sI);
  pvChart.data.datasets[4].data.push(lastP);
  pvChart.data.datasets[5].data.push(sP);

  pvChart.update();

  csvData.push({
    time,
    V: lastV,
    I: lastI,
    P: lastP,
    sV,
    sI,
    sP
  });
});
