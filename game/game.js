// game.js - Main Game Loop and State Management
let mines = []; // Mayınları tutacak dizi
let lightnings = []; // Yıldırımları tutacak dizi

// Game State
// game.js dosyasında en üstteki gameState tanımını şöyle güncelle:
const gameState = {
    animationId: null,
    score: 0,
    level: 1,
    nextLevelThreshold: 1000,
    currentLevelStep: 1000, // <-- YENİ: Başlangıç artış miktarı
    gameActive: false,
    isPaused: false,
    spawnInterval: null,
    difficultyMultiplier: 1,
    lastShotTime: 0,
    nuclearBombTimer: 0,
    timeWarpActive: false,
    timeWarpTimer: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    playerStats: { ...DEFAULT_PLAYER_STATS },
    godMode: false
};
gameState.godMode = false; // Varsayılan kapalı
// Input State
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// Spawn Enemies
function spawnEnemies() {
    let spawnRate = 1000 - (gameState.difficultyMultiplier * 50);
    if (spawnRate < 200) spawnRate = 200;

    gameState.spawnInterval = setInterval(() => {
        if (gameState.isPaused || !gameState.gameActive) return;

        let type = ENEMY_TYPES.BASIC;
        const rand = Math.random();

        if (gameState.difficultyMultiplier > 4 && rand < 0.15) type = ENEMY_TYPES.SPAWNER;
        else if (gameState.difficultyMultiplier > 3 && rand < 0.25) type = ENEMY_TYPES.SPLITTER;
        else if (gameState.difficultyMultiplier > 2 && rand < 0.35) type = ENEMY_TYPES.TANK;
        else if (gameState.difficultyMultiplier > 3 && rand < 0.5) type = ENEMY_TYPES.DASHER;
        else if (gameState.difficultyMultiplier > 1 && rand < 0.6) type = ENEMY_TYPES.SPEEDSTER;

        const radius = type.radius;
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : CANVAS.width + radius;
            y = Math.random() * CANVAS.height;
        } else {
            x = Math.random() * CANVAS.width;
            y = Math.random() < 0.5 ? 0 - radius : CANVAS.height + radius;
        }

        enemyPool.get(x, y, type, gameState.difficultyMultiplier);
    }, spawnRate);
}

// Level Up System
function triggerLevelUp() {
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);
    playSound('levelup');

    showLevelUpAnimation();

    setTimeout(() => {
        const shuffled = ALL_PERKS.sort(() => 0.5 - Math.random());

        let availablePerks = shuffled;
        if (gameState.playerStats.shield >= gameState.playerStats.maxShields) {
            availablePerks = shuffled.filter(p => p.id !== 'energy_shield');
        }

        const selectedPerks = availablePerks.slice(0, 3);

        perkListEl.innerHTML = '';
        selectedPerks.forEach(perk => {
            const div = document.createElement('div');
            div.className = 'perk-card';
            div.innerHTML = `
                <div class="perk-title">${perk.title}</div>
                <div class="perk-desc">${perk.desc}</div>
            `;
            div.onclick = () => selectPerk(perk);
            perkListEl.appendChild(div);
        });

        levelUpScreen.classList.remove('hidden');
    }, 1200);
}

function selectPerk(perk) {
    perk.apply(gameState.playerStats);

    gameState.level++;
    gameState.currentLevelStep += 200;
    gameState.nextLevelThreshold += gameState.currentLevelStep;
    gameState.difficultyMultiplier += 0.5;

    updateLevelIndicator(gameState.level);
    updateShieldIndicator(gameState.playerStats.shield);
    updateProgressBar(gameState.score, gameState.nextLevelThreshold);
    levelUpScreen.classList.add('hidden');

    gameState.isPaused = false;
    spawnEnemies();
    animate();
}

// Collision Detection (Optimized)
function checkCollisions() {
    const projectiles = projectilePool.getActive();
    const enemies = enemyPool.getActive();
    
    // Check enemy-player collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        
        if (distPlayer - enemy.radius - player.radius < 1) {
            // --- GOD MODE KONTROLÜ ---
            if (gameState.godMode) {
                enemyPool.release(enemy);
                spawnParticles(enemy.x, enemy.y, 10, 5, enemy.color);
                continue; // Oyuncuya hasar vermeden döngüye devam et
            }
            if (gameState.playerStats.shield > 0) {
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);

                CTX.fillStyle = 'rgba(0, 255, 255, 0.3)';
                CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

                enemies.forEach(e => spawnParticles(e.x, e.y, 20, 5, '#00ffff'));
                enemyPool.releaseAll();
                playSound('levelup');
            } else {
                gameOver();
                return;
            }
        }

        // Check projectile-enemy collisions
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];
            
            if (projectile.hitList.includes(enemy.id)) continue;

            const distProj = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (distProj - enemy.radius - projectile.radius < 1) {
                projectile.hitList.push(enemy.id);
                projectile.penetration--;

                let damage = 1;
                if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.3) {
                    damage = 999;
                    spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                }
                enemy.hp -= damage;

                if (gameState.playerStats.knockback > 0) {
                    const kbAngle = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
                    enemy.x += Math.cos(kbAngle) * gameState.playerStats.knockback;
                    enemy.y += Math.sin(kbAngle) * gameState.playerStats.knockback;
                }

                if (gameState.playerStats.freeze > 0) {
                    enemy.freezeTimer = gameState.playerStats.freeze;
                }

                playSound('hit');
                
                const particleCount = enemy.radius * gameState.playerStats.explosionSize * 0.5;
                spawnParticles(projectile.x, projectile.y, particleCount, 3, enemy.color);
               // YENİ KOD:
                // Eğer clusterCount varsa (en az 1), o kadar sayıda mayın bırak
                if (gameState.playerStats.clusterCount > 0 && !projectile.isSplit) {
                    for(let c = 0; c < gameState.playerStats.clusterCount; c++) {
                        spawnClusterMine(projectile.x, projectile.y);
                    }
                }

                if (gameState.playerStats.splitShot && !projectile.isSplit) {
                    for (let s = 0; s < 3; s++) {
                        const splitAngle = Math.random() * Math.PI * 2;
                        const splitVel = {
                            x: Math.cos(splitAngle) * gameState.playerStats.shotSpeed * 0.8,
                            y: Math.sin(splitAngle) * gameState.playerStats.shotSpeed * 0.8
                        };
                        projectilePool.get(projectile.x, projectile.y, splitVel, true, gameState.playerStats);
                    }
                }

                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                }
                // Chain Lightning
                if (gameState.playerStats.chainLightning > 0) {
                    let chainTargets = [];
                    enemies.forEach(e => {
                        if (e.id !== enemy.id) {
                            const dist = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                            if (dist < 400) {
                                chainTargets.push({ enemy: e, dist: dist });
                            }
                        }
                    });

                    chainTargets.sort((a, b) => a.dist - b.dist);
                    const chainCount = Math.min(gameState.playerStats.chainLightning, chainTargets.length);

                    for (let c = 0; c < chainCount; c++) {
                        const target = chainTargets[c].enemy;
                        target.hp -= 1;
                        // Vurulan düşmandan (enemy), hedef düşmana (target) yıldırım fırlat
                        spawnChainLightning(enemy.x, enemy.y, target.x, target.y);

                        // Ekstra olarak hedef üzerinde de küçük bir patlama olsun
                        spawnParticles(target.x, target.y, 5, 2, '#ffff00');
                    }
                }
                if (enemy.hp <= 0) {
                    gameState.score += enemy.type.score;

                    // Splitter logic
                    if (enemy.type.name === 'Splitter') {
                        const splitCount = 2 + Math.floor(Math.random() * 2);
                        for (let s = 0; s < splitCount; s++) {
                            const splitAngle = (Math.PI * 2 / splitCount) * s;
                            const splitX = enemy.x + Math.cos(splitAngle) * 30;
                            const splitY = enemy.y + Math.sin(splitAngle) * 30;
                            enemyPool.get(splitX, splitY, ENEMY_TYPES.MINI_SPLITTER, gameState.difficultyMultiplier);
                        }
                    }

                    // Explosive Radius
                    if (gameState.playerStats.explosiveRadius > 0) {
                        const radius = gameState.playerStats.explosiveRadius; // Güncel yarıçapı al
                        const explosionDamage = 5; // Hasarı artırdık (Eskiden 1'di)

                        // 1. GÖRSEL: Alanı gösteren şok dalgası ve daire
                        CTX.beginPath();
                        CTX.arc(enemy.x, enemy.y, radius, 0, Math.PI * 2);
                        CTX.fillStyle = 'rgba(255, 100, 0, 0.2)'; // Alanı turuncu ile doldur
                        CTX.fill();
                        CTX.strokeStyle = '#ff4400';
                        CTX.lineWidth = 2;
                        CTX.stroke();

                        // 2. GÖRSEL: Yarıçapa göre dinamik partiküller
                        // Yarıçap ne kadar büyükse o kadar çok partikül çıksın
                        const particleCount = Math.floor(radius / 3); 
                        for (let i = 0; i < particleCount; i++) {
                            const angle = Math.random() * Math.PI * 2;
                            // Partiküller patlama merkezinden dışa doğru saçılır, ama radius içinde başlar
                            const dist = Math.random() * radius; 
                            
                            particlePool.get(
                                enemy.x + Math.cos(angle) * dist,
                                enemy.y + Math.sin(angle) * dist,
                                4, '#ff6600',
                                {
                                    x: Math.cos(angle) * 2, // Dışa doğru hızla fırlasınlar
                                    y: Math.sin(angle) * 2
                                }
                            );
                        }

                        // 3. HASAR MANTIĞI
                        enemies.forEach(e => {
                            if (e.id !== enemy.id) {
                                const dist = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                                // Düşmanın kendi cüssesini de hesaba kat (daha adil vuruş için)
                                if (dist < radius + e.radius) {
                                    e.hp -= explosionDamage;
                                    
                                    // Vurulduğunu belli etmek için beyaz bir efekt (hit marker)
                                    spawnParticles(e.x, e.y, 2, 2, '#ffffff', 2);
                                }
                            }
                        });
                    }
                    enemyPool.release(enemy);
                    spawnParticles(enemy.x, enemy.y, 10, 5, enemy.color, 2);
                }

                updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                if (gameState.score >= gameState.nextLevelThreshold) {
                    triggerLevelUp();
                }
            }
        }
    }
}

// Main Animation Loop
function animate() {
    if (!gameState.gameActive || gameState.isPaused) return;
    gameState.animationId = requestAnimationFrame(animate);

    updateFPS();

    CTX.fillStyle = 'rgba(5, 5, 5, 0.1)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    drawPlayer(gameState.playerStats, gameState.lastShotTime);

    // Laser Beam
    if (gameState.playerStats.laserBeam && (isTouching || gameState.lastMouseX)) {
        const angle = Math.atan2(
            (gameState.lastMouseY || touchStartY) - player.y,
            (gameState.lastMouseX || touchStartX) - player.x
        );
        const laserEndX = player.x + Math.cos(angle) * 2000;
        const laserEndY = player.y + Math.sin(angle) * 2000;

        CTX.beginPath();
        CTX.moveTo(player.x, player.y);
        CTX.lineTo(laserEndX, laserEndY);
        CTX.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        CTX.lineWidth = 3;
        CTX.shadowBlur = 15;
        CTX.shadowColor = '#ff0000';
        CTX.stroke();
        CTX.shadowBlur = 0;
        CTX.lineWidth = 1;

        enemyPool.getActive().forEach(enemy => {
            const distToLine = Math.abs(
                (laserEndY - player.y) * enemy.x - 
                (laserEndX - player.x) * enemy.y + 
                laserEndX * player.y - laserEndY * player.x
            ) / Math.hypot(laserEndY - player.y, laserEndX - player.x);
            const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);

            if (distToLine < enemy.radius + 10 && distToPlayer < 2000) {
                enemy.hp -= 0.02;
                if (enemy.hp <= 0) {
                    gameState.score += enemy.type.score;
                    enemyPool.release(enemy);
                    updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                }
            }
        });
    }

    // Nuclear Bomb
    if (gameState.playerStats.nuclearBomb) {
        gameState.nuclearBombTimer++;
        if (gameState.nuclearBombTimer >= 600) {
            gameState.nuclearBombTimer = 0;
            spawnParticles(player.x, player.y, 100, 8, '#ff6600', 3);
            enemyPool.getActive().forEach(enemy => { enemy.hp -= 3; });
            playSound('hit');
        }
    }

    // Orbitals
    if (gameState.playerStats.orbitals > 0) {
        const orbitalTime = Date.now() / 500;
        for (let i = 0; i < gameState.playerStats.orbitals; i++) {
            const angle = orbitalTime + (i * (Math.PI * 2 / gameState.playerStats.orbitals));
            const ox = player.x + Math.cos(angle) * 60;
            const oy = player.y + Math.sin(angle) * 60;

            CTX.beginPath();
            CTX.arc(ox, oy, 10, 0, Math.PI * 2);
            CTX.fillStyle = '#00ffff';
            CTX.shadowBlur = 10;
            CTX.shadowColor = '#00ffff';
            CTX.fill();
            CTX.shadowBlur = 0;

            enemyPool.getActive().forEach(enemy => {
                const dist = Math.hypot(ox - enemy.x, oy - enemy.y);
                if (dist < enemy.radius + 10) {
                    enemy.hp -= 0.1;
                    if (enemy.hp <= 0) {
                        gameState.score += enemy.type.score;
                        enemyPool.release(enemy);
                        updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                    }
                }
            });
        }
    }

    // Update particles
    particlePool.update(particle => particle.update());
    // --- YENİ EKLENEN SATIR ---
    updateAndDrawMines();
    updateAndDrawLightnings(); // (Şimdi eklediğin yıldırımlar)
    // Update projectiles
    projectilePool.update(projectile => {
        return projectile.update(enemyPool.getActive(), gameState.playerStats);
    });

    // Update enemies
    enemyPool.getActive().forEach(enemy => enemy.update(player));

    // Check collisions
    checkCollisions();
}

// Initialize Game
function initGame() {
    gameState.score = 0;
    gameState.level = 1;
    gameState.nextLevelThreshold = 1000;
    gameState.currentLevelStep = 1000; // <-- YENİ: Oyunu sıfırlarken adımı da sıfırla
    gameState.difficultyMultiplier = 0;
    gameState.nuclearBombTimer = 0;
    gameState.timeWarpActive = false;
    gameState.timeWarpTimer = 0;
    mines = []; // Oyun başlayınca eski mayınları temizle
    lightnings = []; // Oyun başlayınca yıldırımları temizle
    projectilePool.releaseAll();
    enemyPool.releaseAll();
    particlePool.releaseAll();
    gameState.playerStats = { ...DEFAULT_PLAYER_STATS };
    // Player boyutunu ölçeğe göre ayarla
    player.radius = 20 * GAME_SCALE;
    updateLevelIndicator(1);
    updateProgressBar(0, 1000);
    updateShieldIndicator(0);
    
    gameState.gameActive = true;
    gameState.isPaused = false;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    animate();
    spawnEnemies();
}

function gameOver() {
    gameState.gameActive = false;
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);
    
    finalScoreEl.innerText = `Toplam Skor: ${gameState.score} - Seviye: ${gameState.level}`;
    
    // YENİ EKLENEN KISIM: Skoru global alana taşı ve leaderboard'u yükle
    window.lastGameScore = gameState.score;
    window.lastGameLevel = gameState.level;
    
    // UI'ı sıfırla
    document.getElementById('submit-score-btn').style.display = 'inline-block';
    document.getElementById('submit-score-btn').disabled = false;
    document.getElementById('submit-score-btn').innerText = 'SKORU KAYDET';
    document.getElementById('player-name-input').style.display = 'inline-block';
    
    // Eğer leaderboard yükleme fonksiyonu hazırsa çağır
    if (window.fetchLeaderboard) {
        window.fetchLeaderboard();
    }
    
    gameOverScreen.classList.remove('hidden');
}

// Event Listeners
CANVAS.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.gameActive || gameState.isPaused) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;

    shoot(touchStartX, touchStartY, gameState);
});

CANVAS.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameState.gameActive || gameState.isPaused || !isTouching) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

CANVAS.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
});

setInterval(() => {
    if (isTouching && gameState.gameActive && !gameState.isPaused) {
        shoot(touchStartX, touchStartY, gameState);
    }
}, 100);

window.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.perk-card')) return;
    if (!gameState.gameActive || gameState.isPaused) return;
    gameState.lastMouseX = e.clientX;
    gameState.lastMouseY = e.clientY;
    shoot(e.clientX, e.clientY, gameState);
});

window.addEventListener('mousemove', (e) => {
    gameState.lastMouseX = e.clientX;
    gameState.lastMouseY = e.clientY;
});

// game.js içinde window.addEventListener('resize', ...) kısmını bul ve ŞÖYLE DEĞİŞTİR:

window.addEventListener('resize', () => {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    
    // Ölçeği yeniden hesapla
    GAME_SCALE = Math.max(window.innerWidth / BASE_SCREEN_WIDTH, 0.6);
    
    // Oyuncuyu merkeze al ve boyutunu güncelle
    player.x = CANVAS.width / 2;
    player.y = CANVAS.height / 2;
    player.radius = 20 * GAME_SCALE; // Player'ın orijinal radius'u 20 idi
});
// --- YENİ MAYIN SİSTEMİ ---

function spawnClusterMine(x, y) {
    // Rastgele hafif bir saçılma ile mayın oluştur
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 30; // Vuruş noktasından biraz uzağa düşsün
    
    mines.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        timer: 360, // 60 FPS * 6 saniye = 360 kare
        radius: 12,
        active: true,
        color: '#ff6600'
    });
}

function updateAndDrawMines() {
    for (let i = mines.length - 1; i >= 0; i--) {
        const mine = mines[i];
        
        // 1. Mayını Çiz (Yanıp sönen efekt)
        const pulse = Math.sin(Date.now() / 100) * 3;
        CTX.beginPath();
        CTX.arc(mine.x, mine.y, mine.radius + pulse, 0, Math.PI * 2);
        CTX.fillStyle = `rgba(255, 100, 0, ${mine.timer / 360 + 0.2})`; // Süre azaldıkça soluklaşabilir
        CTX.fill();
        CTX.strokeStyle = 'white';
        CTX.lineWidth = 2;
        CTX.stroke();

        // Merkezdeki kırmızı ışık
        CTX.beginPath();
        CTX.arc(mine.x, mine.y, 4, 0, Math.PI * 2);
        CTX.fillStyle = 'red';
        CTX.fill();

        // 2. Mantık (Süre ve Patlama)
        mine.timer--;
        let shouldExplode = false;

        // Süre doldu mu?
        if (mine.timer <= 0) {
            shouldExplode = true;
        }

        // Düşman teması var mı?
        if (!shouldExplode) {
            const enemies = enemyPool.getActive();
            for (let j = 0; j < enemies.length; j++) {
                const enemy = enemies[j];
                const dist = Math.hypot(mine.x - enemy.x, mine.y - enemy.y);
                if (dist < mine.radius + enemy.radius) {
                    shouldExplode = true;
                    break; 
                }
            }
        }

        // 3. Patlama İşlemi
        if (shouldExplode) {
            explodeMine(mine.x, mine.y);
            mines.splice(i, 1); // Listeden sil
        }
    }
}

function explodeMine(x, y) {
    const explosionRadius = 120; // Patlama alanı
    const damage = 5; // Patlama hasarı

    // Görsel Efekt
    spawnParticles(x, y, 20, 5, '#ff4400', 4); // Büyük parçacıklar
    
    // Şok dalgası efekti (Halka çizimi)
    CTX.beginPath();
    CTX.arc(x, y, explosionRadius, 0, Math.PI * 2);
    CTX.strokeStyle = 'rgba(255, 100, 0, 0.5)';
    CTX.lineWidth = 5;
    CTX.stroke();

    playSound('hit'); // Veya patlama sesi

    // Alan Hasarı Ver
    const enemies = enemyPool.getActive();
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - x, enemy.y - y);
        if (dist < explosionRadius) {
            enemy.hp -= damage;
            spawnParticles(enemy.x, enemy.y, 3, 2, '#fff'); // Hasar efekti
        }
    });
}
// --- YENİ YILDIRIM EFEKTİ SİSTEMİ ---

function spawnChainLightning(x1, y1, x2, y2) {
    lightnings.push({
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        life: 10, // Ekranda kaç kare kalacağı (kısa sürsün, "çakıp" sönsün)
        segments: [] // Zikzak noktaları burada hesaplanacak
    });
}

function updateAndDrawLightnings() {
    for (let i = lightnings.length - 1; i >= 0; i--) {
        const bolt = lightnings[i];
        
        // Eğer ilk kareyse zikzak noktalarını hesapla (Her karede değişmesin diye)
        if (bolt.segments.length === 0) {
            const dist = Math.hypot(bolt.x2 - bolt.x1, bolt.y2 - bolt.y1);
            const steps = Math.floor(dist / 20); // Her 20 pikselde bir kırılma
            
            bolt.segments.push({x: bolt.x1, y: bolt.y1});
            
            for (let s = 1; s < steps; s++) {
                const t = s / steps;
                // Doğrusal nokta
                let px = bolt.x1 + (bolt.x2 - bolt.x1) * t;
                let py = bolt.y1 + (bolt.y2 - bolt.y1) * t;
                
                // Rastgele sapma (zikzak)
                const offset = (Math.random() - 0.5) * 40; 
                px += offset;
                py += offset;
                
                bolt.segments.push({x: px, y: py});
            }
            bolt.segments.push({x: bolt.x2, y: bolt.y2});
        }

        // ÇİZİM KISMI
        CTX.beginPath();
        CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let p = 1; p < bolt.segments.length; p++) {
            CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
        }
        
        // Ömrüne göre şeffaflık (solarak yok olsun)
        const alpha = bolt.life / 10;
        CTX.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
        CTX.lineWidth = 3;
        CTX.shadowBlur = 15;
        CTX.shadowColor = '#ffff00';
        CTX.stroke();
        
        CTX.shadowBlur = 0; // Diğer çizimleri etkilemesin
        
        // Ömür azaltma
        bolt.life--;
        if (bolt.life <= 0) {
            lightnings.splice(i, 1);
        }
    }
}
let cursorAngle = 0;

function drawCursor() {
    if(!gameState.lastMouseX) return;
    
    const x = gameState.lastMouseX;
    const y = gameState.lastMouseY;
    cursorAngle += 0.1;

    // Dış Daire (Dönen)
    CTX.strokeStyle = '#00ffff';
    CTX.lineWidth = 2;
    CTX.beginPath();
    // Kesik çizgili daire
    CTX.arc(x, y, 15, cursorAngle, cursorAngle + Math.PI / 2);
    CTX.arc(x, y, 15, cursorAngle + Math.PI, cursorAngle + Math.PI * 1.5);
    CTX.stroke();

    // İç Nokta
    CTX.fillStyle = '#ff0000';
    CTX.beginPath();
    CTX.arc(x, y, 2, 0, Math.PI * 2);
    CTX.fill();
    
    // Oyuncudan mouse'a giden silik bir nişan çizgisi (Lazer pointer gibi)
    CTX.beginPath();
    CTX.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    CTX.moveTo(player.x, player.y);
    CTX.lineTo(x, y);
    CTX.stroke();
}
document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);