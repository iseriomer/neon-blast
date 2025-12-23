// game/leaderboard.js

// Firebase kütüphanelerini CDN üzerinden import ediyoruz
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// game/leaderboard.js

// 2. EKSİK OLAN KISIM BURASIYDI: Firestore (Veritabanı) Kütüphanesini Ekledik
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
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

// Filter Buttons (Main Menu)
const filterAllBtn = document.getElementById('lb-filter-all');
const filterMonthlyBtn = document.getElementById('lb-filter-monthly');
const filterWeeklyBtn = document.getElementById('lb-filter-weekly');

// Filter Buttons (Game Over)
const filterAllBtnGO = document.getElementById('lb-filter-all-go');
const filterMonthlyBtnGO = document.getElementById('lb-filter-monthly-go');
const filterWeeklyBtnGO = document.getElementById('lb-filter-weekly-go');

let currentTimeframe = 'all'; // 'all', 'monthly', 'weekly'

function updateFilterStyles() {
    const allBtns = [
        filterAllBtn, filterMonthlyBtn, filterWeeklyBtn,
        filterAllBtnGO, filterMonthlyBtnGO, filterWeeklyBtnGO
    ];

    allBtns.forEach(btn => {
        if (!btn) return;
        btn.style.background = 'transparent';
        btn.style.color = '#00ffff';
    });

    let activeBtns = [];
    if (currentTimeframe === 'all') activeBtns = [filterAllBtn, filterAllBtnGO];
    if (currentTimeframe === 'monthly') activeBtns = [filterMonthlyBtn, filterMonthlyBtnGO];
    if (currentTimeframe === 'weekly') activeBtns = [filterWeeklyBtn, filterWeeklyBtnGO];

    activeBtns.forEach(btn => {
        if (btn) {
            btn.style.background = '#00ffff';
            btn.style.color = '#000';
        }
    });
}

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
        await loadLeaderboard(currentTimeframe);
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
async function loadLeaderboard(timeframe = 'all') {
    currentTimeframe = timeframe;
    updateFilterStyles();

    const listElements = [
        document.getElementById('leaderboard-list'),
        document.getElementById('main-leaderboard-list')
    ];

    // Yükleniyor yazısı
    listElements.forEach(el => {
        if (el) el.innerHTML = '<li>Loading...</li>';
    });

    let q;

    // Construct Query
    if (timeframe === 'all') {
        q = query(scoresCollection, orderBy("score", "desc"), limit(10));
    } else {
        const now = new Date();
        let startDate = new Date();

        if (timeframe === 'monthly') {
            startDate.setMonth(now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
        } else if (timeframe === 'weekly') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
            startDate.setDate(diff);
            startDate.setHours(0, 0, 0, 0);
        }

        // Note: Using 'where' with 'orderBy' requires a composite index in Firestore.
        // If the index is missing, this query will fail with a link to create it in the console.
        q = query(scoresCollection, where("date", ">=", startDate), orderBy("score", "desc"), limit(10));
    }

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
                el.innerHTML = '<li>No scores yet. Be the first!</li>';
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
        console.error("Liste çekilemedi veya Index eksik:", e);

        // Fallback for missing index: Fetch by date then sort client-side (inefficient for large data but works)
        if (e.code === 'failed-precondition' && timeframe !== 'all') {
            console.warn("Falling back to client-side sort due to missing index.");
            // Try fetching without score sort (automatically sorted by date if we filter by date?)
            // Actually just fetch by date filter
            // We can't easily fetch 'top score' without sort.
            // We'll fetch the last 50 entries by date and sort them.
            // This is an approximation.
            const fallbackQ = query(scoresCollection, where("date", ">=", startDate), orderBy("date", "desc"), limit(50));
            try {
                const snapshot = await getDocs(fallbackQ);
                let fallbackScores = [];
                snapshot.forEach(doc => fallbackScores.push(doc.data()));
                fallbackScores.sort((a, b) => b.score - a.score); // Client side sort
                fallbackScores = fallbackScores.slice(0, 10);

                // Render again
                listElements.forEach(el => {
                    if (!el) return;
                    el.innerHTML = '';
                    if (fallbackScores.length === 0) { el.innerHTML = '<li>No scores found.</li>'; return; }
                    fallbackScores.forEach((data, index) => {
                        const li = document.createElement('li');
                        li.innerHTML = `<span>#${index + 1} ${data.name}</span><span>${data.score}</span>`;
                        el.appendChild(li);
                    });
                });
                return; // Exit success after fallback
            } catch (fallbackErr) {
                console.error("Fallback failed:", fallbackErr);
            }
        }

        listElements.forEach(el => {
            if (el) el.innerHTML = '<li>Connection error! Check console.</li>';
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
            loadLeaderboard('all'); // Default to all time
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

// Filter Listeners (Main Menu)
if (filterAllBtn) filterAllBtn.addEventListener('click', () => loadLeaderboard('all'));
if (filterMonthlyBtn) filterMonthlyBtn.addEventListener('click', () => loadLeaderboard('monthly'));
if (filterWeeklyBtn) filterWeeklyBtn.addEventListener('click', () => loadLeaderboard('weekly'));

// Filter Listeners (Game Over)
if (filterAllBtnGO) filterAllBtnGO.addEventListener('click', () => loadLeaderboard('all'));
if (filterMonthlyBtnGO) filterMonthlyBtnGO.addEventListener('click', () => loadLeaderboard('monthly'));
if (filterWeeklyBtnGO) filterWeeklyBtnGO.addEventListener('click', () => loadLeaderboard('weekly'));


// Fonksiyonu dışarıdan tetiklenebilir yapmak için window'a ata
window.fetchLeaderboard = () => loadLeaderboard('all');
