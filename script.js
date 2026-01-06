// 🔹 KONFIGURASI FIREBASE
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
const db = firebase.database();
const monitoringRef = db.ref("monitoring");

// ===== SMOOTHING =====
const alpha = 0.3;
let sV = null, sI = null, sP = null;

function smooth(prev, curr) {
    if (prev === null) return curr;
    return alpha * curr + (1 - alpha) * prev;
}

// ===== DATA TABLE =====
let tableData = [];

// ===== CHART =====
const ctx = document.getElementById("pvChart").getContext("2d");
const pvChart = new Chart(ctx, {
    type: "line",
    data: {
        labels: [],
        datasets: [
            { label: "V Asli", data: [], borderColor: "#4fc3f7", tension: 0.4 },
            { label: "V Smooth", data: [], borderDash: [5,5], borderColor: "#81d4fa", tension: 0.4 },

            { label: "I Asli", data: [], borderColor: "#ff9800", tension: 0.4 },
            { label: "I Smooth", data: [], borderDash: [5,5], borderColor: "#ffb74d", tension: 0.4 },

            { label: "P Asli", data: [], borderColor: "#4db6ac", tension: 0.4 },
            { label: "P Smooth", data: [], borderDash: [5,5], borderColor: "#80cbc4", tension: 0.4 }
        ]
    }
});

// ===== REALTIME =====
const tableBody = document.getElementById("dataTable");

monitoringRef.limitToLast(50).on("child_added", snap => {
    const d = snap.val();
    if (!d) return;

    const V = Number(d.pv_voltage);
    const I = Number(d.pv_current);
    const P = Number(d.pv_power);

    // tampil nilai utama
    document.getElementById("voltage").innerText = V;
    document.getElementById("current").innerText = I;
    document.getElementById("power").innerText = P;

    // WARNING TEGANGAN
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

    // ===== CHART UPDATE =====
    pvChart.data.labels.push(d.time);

    pvChart.data.datasets[0].data.push(V);
    pvChart.data.datasets[1].data.push(sV);

    pvChart.data.datasets[2].data.push(I);
    pvChart.data.datasets[3].data.push(sI);

    pvChart.data.datasets[4].data.push(P);
    pvChart.data.datasets[5].data.push(sP);

    if (pvChart.data.labels.length > 20) {
        pvChart.data.labels.shift();
        pvChart.data.datasets.forEach(ds => ds.data.shift());
    }

    pvChart.update();

    // ===== TABLE (DATA ASLI SAJA) =====
    tableData.push({
        time: d.time,
        voltage: V,
        current: I,
        power: P
    });

    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${d.time}</td>
        <td>${V}</td>
        <td>${I}</td>
        <td>${P}</td>
    `;
    tableBody.prepend(row);
});

// ===== EXPORT CSV DARI TABEL =====
function exportTableCSV() {
    if (tableData.length === 0) {
        alert("Data masih kosong");
        return;
    }

    let csv = "Waktu,Tegangan(V),Arus(A),Daya(W)\n";
    tableData.forEach(d => {
        csv += `${d.time},${d.voltage},${d.current},${d.power}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data_monitoring.csv";
    a.click();
}

 







