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

// 🔹 INISIALISASI FIREBASE
firebase.initializeApp(firebaseConfig);

// 🔹 AMBIL DATABASE
const database = firebase.database();

// 🔹 REFERENSI DATA
const dataRef = database.ref("sensor");

// 🔹 BACA DATA REALTIME
dataRef.on("value", (snapshot) => {
    const data = snapshot.val();

    document.getElementById("suhu").innerText = data.suhu;
    document.getElementById("kelembaban").innerText = data.kelembaban;
});
