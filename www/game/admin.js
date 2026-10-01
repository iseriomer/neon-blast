// admin.js - Developer Console & Admin Panel

// 1. Panelin HTML Yapısı
const ADMIN_HTML = `
    <div id="admin-panel" class="hidden">
        <h3>[SYSTEM ADMIN]</h3>
        <div class="admin-grid">
            <button onclick="adminGodMode()" id="btn-godmode">GOD MODE: OFF</button>
            <button onclick="adminLevelUp()">LEVEL UP</button>
            <button onclick="adminKillAll()">KILL ALL</button>
            <button onclick="adminAddScore()">+5000 SCORE</button>
            <button onclick="adminMaxFireRate()">MAX FIRE RATE</button>
            <button onclick="adminSpawnSpawner()">SPAWN SPAWNER</button>
            <button onclick="adminSpawnBoss()">SPAWN BOSS</button>
            <button onclick="adminToggleCluster()">CLUSTER TEST</button>
        </div>
        <div class="admin-info">Panel: <b>"H"</b> Key</div>
    </div>
`;

// 2. Panelin CSS Stilleri
const ADMIN_CSS = `
    #admin-panel {
        position: fixed; top: 20px; right: 20px; width: 250px;
        background: rgba(0, 0, 0, 0.9); border: 2px solid #00ff00;
        padding: 15px; border-radius: 10px; color: #00ff00;
        font-family: 'Courier New', monospace; z-index: 9999;
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.2);
    }
    #admin-panel.hidden { display: none !important; }
    #admin-panel h3 { margin-top: 0; text-align: center; border-bottom: 1px solid #00ff00; padding-bottom: 10px; }
    .admin-grid { display: grid; gap: 8px; }
    #admin-panel button {
        background: #003300; color: #00ff00; border: 1px solid #00ff00;
        padding: 8px; cursor: pointer; font-weight: bold; transition: all 0.2s;
    }
    #admin-panel button:hover { background: #00ff00; color: black; }
    #admin-panel button:active { transform: scale(0.95); }
    .admin-info { margin-top: 10px; font-size: 12px; text-align: center; opacity: 0.7; }
`;

// 3. Paneli Sayfaya Entegre Etme (Initialization)
function initAdminPanel() {
    // CSS'i ekle
    const style = document.createElement('style');
    style.innerHTML = ADMIN_CSS;
    document.head.appendChild(style);

    // HTML'i ekle
    const div = document.createElement('div');
    div.innerHTML = ADMIN_HTML;
    document.body.appendChild(div);

    // Tuş dinleyicisini ekle
    window.addEventListener('keydown', (e) => {
        if (e.key === 'h' || e.key === 'H') {
            document.getElementById('admin-panel').classList.toggle('hidden');
        }
    });

    console.log("Admin Panel Loaded. Press 'H' to toggle.");
}

// 4. Admin Fonksiyonları
function adminGodMode() {
    gameState.godMode = !gameState.godMode;
    const btn = document.getElementById('btn-godmode');

    if (gameState.godMode) {
        btn.innerText = "GOD MODE: ON";
        btn.style.background = "#00ff00";
        btn.style.color = "black";
        gameState.playerStats.shield = 999;
        updateShieldIndicator(999);
    } else {
        btn.innerText = "GOD MODE: OFF";
        btn.style.background = "#003300";
        btn.style.color = "#00ff00";
        gameState.playerStats.shield = gameState.playerStats.maxShields;
        updateShieldIndicator(gameState.playerStats.shield);
    }
}

function adminLevelUp() {
    triggerLevelUp();
}

function adminKillAll() {
    const enemies = [...enemyPool.getActive()];
    enemies.forEach(enemy => {
        spawnParticles(enemy.x, enemy.y, 10, 5, enemy.color);
    });
    enemyPool.releaseAll();
    gameState.score += enemies.length * 50;
    updateProgressBar(gameState.score, gameState.nextLevelThreshold, gameState.previousLevelThreshold);
}

function adminAddScore() {
    gameState.score += 5000;
    updateProgressBar(gameState.score, gameState.nextLevelThreshold, gameState.previousLevelThreshold);
    if (gameState.score >= gameState.nextLevelThreshold) triggerLevelUp();
}

function adminMaxFireRate() {
    gameState.playerStats.fireRate = 50;
    gameState.playerStats.spread = 0.05;
}

let adminBossIndex = 0;
function adminSpawnBoss() {
    adminBossIndex = (adminBossIndex % 5) + 1;
    console.log(`Spawning Boss ${adminBossIndex}`);
    if (window.startBossFight) {
        startBossFight(adminBossIndex);
    }
}
function adminSpawnSpawner() {
    const x = Math.random() * CANVAS.width;
    const y = Math.random() * CANVAS.height;
    enemyPool.get(x, y, ENEMY_TYPES.SPAWNER, gameState.difficultyMultiplier + 5);
}
function adminToggleCluster() {
    gameState.playerStats.clusterCount = (gameState.playerStats.clusterCount || 0) + 5;
    console.log("Cluster Mayın Sayısı:", gameState.playerStats.clusterCount);
}

// Global scope'a fonksiyonları ata (HTML onclick çalışsın diye)
window.adminGodMode = adminGodMode;
window.adminLevelUp = adminLevelUp;
window.adminKillAll = adminKillAll;
window.adminAddScore = adminAddScore;
window.adminMaxFireRate = adminMaxFireRate;
window.adminSpawnBoss = adminSpawnBoss;
window.adminSpawnSpawner = adminSpawnSpawner;
window.adminToggleCluster = adminToggleCluster;