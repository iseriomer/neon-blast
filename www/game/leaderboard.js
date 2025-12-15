// game/leaderboard.js

// Firebase kütüphanelerini CDN üzerinden import ediyoruz
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// game/leaderboard.js

// 2. EKSİK OLAN KISIM BURASIYDI: Firestore (Veritabanı) Kütüphanesini Ekledik
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCNqCeXDbc04vuqj8VX0i34NebvcClqUes",
    authDomain: "neon-blast-8a945.firebaseapp.com",
    databaseURL: "https://neon-blast-8a945-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "neon-blast-8a945",
    storageBucket: "neon-blast-8a945.firebasestorage.app",
    messagingSenderId: "313551328820",
    appId: "1:313551328820:web:d565525e8b0d5ae26e1c61",
    measurementId: "G-YCGD0Z8GDM"
};

// Firebase'i Başlat
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const scoresCollection = collection(db, "scores");

// DOM Elementleri
const nameInput = document.getElementById('player-name-input');
const submitBtn = document.getElementById('submit-score-btn');
const listElement = document.getElementById('leaderboard-list'); // Keeping for reference if needed, though loadLeaderboard handles it.

// NEW: Main Menu Leaderboard Elements
const leaderboardScreen = document.getElementById('leaderboard-screen');
const openLeaderboardBtn = document.getElementById('leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');

// Skoru Veritabanına Kaydet
async function saveScoreToDB(name, score, level) {
    if (!name.trim()) return alert("Lütfen bir isim gir!");

    submitBtn.disabled = true;
    submitBtn.innerText = "Kaydediliyor...";

    try {
        await addDoc(scoresCollection, {
            name: name,
            score: score,
            level: level,
            date: new Date()
        });

        // Kaydettikten sonra listeyi yenile ve butonu gizle
        await loadLeaderboard();
        submitBtn.style.display = 'none';
        nameInput.style.display = 'none';
        alert("Skor kaydedildi!");
    } catch (e) {
        console.error("Hata:", e);
        submitBtn.innerText = "Hata!";
        submitBtn.disabled = false;
    }
}

// Skorları Getir ve Listele
async function loadLeaderboard() {
    const listElements = [
        document.getElementById('leaderboard-list'),
        document.getElementById('main-leaderboard-list')
    ];

    // Yükleniyor yazısı
    listElements.forEach(el => {
        if (el) el.innerHTML = '<li>Yükleniyor...</li>';
    });

    // Skora göre azalan sırala, ilk 10'u al
    const q = query(scoresCollection, orderBy("score", "desc"), limit(10));

    try {
        const querySnapshot = await getDocs(q);
        const scores = [];
        querySnapshot.forEach((doc) => {
            scores.push(doc.data());
        });

        listElements.forEach(el => {
            if (!el) return;
            el.innerHTML = '';

            if (scores.length === 0) {
                el.innerHTML = '<li>Henüz skor yok. İlk sen ol!</li>';
                return;
            }

            scores.forEach((data, index) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span>#${index + 1} ${data.name}</span>
                    <span>${data.score}</span>
                `;
                el.appendChild(li);
            });
        });

    } catch (e) {
        console.error("Liste çekilemedi:", e);
        listElements.forEach(el => {
            if (el) el.innerHTML = '<li>Bağlantı hatası!</li>';
        });
    }
}

// Olay Dinleyicileri
// Olay Dinleyicileri
if (submitBtn) {
    submitBtn.addEventListener('click', () => {
        const currentScore = window.lastGameScore || 0;
        const currentLevel = window.lastGameLevel || 1;
        saveScoreToDB(nameInput.value, currentScore, currentLevel);
    });
}

// NEW: Main Menu Button Logic
if (openLeaderboardBtn) {
    openLeaderboardBtn.addEventListener('click', () => {
        if (leaderboardScreen) {
            leaderboardScreen.classList.remove('hidden');
            leaderboardScreen.style.display = 'flex';
            leaderboardScreen.style.zIndex = '100'; // Force on top
            loadLeaderboard();
        }
    });
}

if (closeLeaderboardBtn) {
    closeLeaderboardBtn.addEventListener('click', () => {
        if (leaderboardScreen) {
            leaderboardScreen.style.display = 'none';
            leaderboardScreen.classList.add('hidden');
        }
    });
}

// Fonksiyonu dışarıdan tetiklenebilir yapmak için window'a ata
window.fetchLeaderboard = loadLeaderboard;