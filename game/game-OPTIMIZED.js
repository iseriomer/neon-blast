// game-OPTIMIZED.js - Heavily optimized version
// Key changes:
// 1. Spatial grid for collisions (O(n*m) -> O(n))
// 2. Batch rendering (400 draw calls -> 5)
// 3. Performance profiling
// 4. Projectile cap
// 5. Dynamic quality adjustment
// game-OPTIMIZED.js EN BAŞINA BUNU YAPIŞTIR


// ... geri kalan kodlar ...
let mines = [];
let lightnings = [];
let lastTime = 0; // Delta time için zaman takibi

// OPTIMIZATION: Projectile cap to prevent FPS death
const MAX_PROJECTILES = 250; // Cap at 250 for performance

// Game State
const gameState = {
    animationId: null,
    score: 0,
    level: 1,
    nextLevelThreshold: 600,
    currentLevelStep: 600, // <-- YENİ: Başlangıç artış miktarı
    bossActive: false, // YENİ
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
    if (gameState.level === 14 && !gameState.bossActive) {
        startBossFight();
        return; // Normal level up ekranını açma
    }
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
// YENİ FONKSİYON
function startBossFight() {
    gameState.bossActive = true;
    gameState.level = 15;
    updateLevelIndicator("BOSS");

    // Normal spawn'ı durdur
    clearInterval(gameState.spawnInterval);

    // Varolan tüm düşmanları öldür (Sahne temizliği)
    enemyPool.getActive().forEach(e => {
        createExplosion(e.x, e.y, 50, 0);
        enemyPool.release(e);
    });

    // Boss'u çağır
    boss.spawn(CANVAS.width / 2, -100);
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

// OPTIMIZED: Collision Detection with Spatial Grid
function checkCollisions() {
    profiler.start('collisions');

    const enemies = enemyPool.getActive();

    // DÜZELTME 1: Sadece düşman yoksa çık. Mermi yoksa bile oyuncu çarpışmasını kontrol etmeliyiz.
    if (enemies.length === 0) {
        profiler.end('collisions');
        return;
    }

    profiler.start('spatial-grid-build');
    // Build spatial grid for enemies
    enemySpatialGrid.clear();
    for (const enemy of enemies) {
        enemySpatialGrid.insert(enemy);
    }
    profiler.end('spatial-grid-build');

    profiler.start('player-collision');
    // Check enemy-player collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);

        if (distPlayer - enemy.radius - player.radius < 1) {
            if (gameState.godMode) {
                enemyPool.release(enemy);
                spawnParticles(enemy.x, enemy.y, 10, 5, enemy.color);
                continue;
            }
            if (gameState.playerStats.shield > 0) {
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);
                CTX.fillStyle = 'rgba(0, 255, 255, 0.3)';
                CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
                enemies.forEach(e => spawnParticles(e.x, e.y, 20, 5, '#00ffff'));
                enemyPool.releaseAll();
                playSound('levelup');
                break;
            } else {
                gameOver();
                profiler.end('player-collision');
                profiler.end('collisions'); // Profiler'ı düzgün kapatıp çıkıyoruz
                return;
            }
        }
    }
    profiler.end('player-collision');

    // DÜZELTME 2: Mermi kontrolünü buraya aldık.
    // Eğer mermi yoksa, aşağıdaki mermi-düşman hesaplamalarına girmeden çıkabiliriz.
    const projectiles = projectilePool.getActive();
    if (projectiles.length === 0) {
        profiler.end('collisions');
        return;
    }

    profiler.start('projectile-collision');
    // OPTIMIZED: Use spatial grid for projectile-enemy collisions
    for (let j = projectiles.length - 1; j >= 0; j--) {
        const projectile = projectiles[j];
        // BOSS ÇARPIŞMASI (YENİ)
        if (gameState.bossActive && boss.active) {
            const dx = projectile.x - boss.x;
            const dy = projectile.y - boss.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < boss.radius + projectile.radius) {
                // Hasar ver
                let damage = 20; // Baz hasar
                if (projectile.isSplit) damage = 10;
                if (gameState.playerStats.sniper) damage *= 2;

                boss.takeDamage(damage);
                spawnParticles(projectile.x, projectile.y, 5, 3, '#8a2be2');
                playSound('hit');

                // Mermiyi yok et
                projectilePool.release(projectile);
                continue; // Diğer düşmanları kontrol etmeye gerek yok
            }
        }
        // OPTIMIZATION: Only check nearby enemies using spatial grid!
        const nearbyEnemies = enemySpatialGrid.getNearby(projectile);

        for (const enemy of nearbyEnemies) {
            if (projectile.hitList.includes(enemy.id)) continue;

            const dx = projectile.x - enemy.x;
            const dy = projectile.y - enemy.y;
            const distProj = Math.sqrt(dx * dx + dy * dy);

            if (distProj - enemy.radius - projectile.radius < 1) {
                // ... (Mermi çarpışma mantığının geri kalanı aynı) ...
                projectile.hitList.push(enemy.id);
                projectile.penetration--;

                let damage = 1;
                if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.3) {
                    damage = 999;
                    spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                }
                enemy.hp -= damage;

                if (gameState.playerStats.knockback > 0) {
                    const angle = Math.atan2(dy, dx);
                    enemy.x -= Math.cos(angle) * gameState.playerStats.knockback;
                    enemy.y -= Math.sin(angle) * gameState.playerStats.knockback;
                }

                if (gameState.playerStats.freeze > 0) {
                    enemy.freezeTimer = gameState.playerStats.freeze;
                }

                playSound('hit');

                const particleCount = Math.min(enemy.radius * 0.3, 10);
                spawnParticles(projectile.x, projectile.y, particleCount, 3, enemy.color);

                if (gameState.playerStats.clusterCount > 0 && !projectile.isSplit) {
                    for (let c = 0; c < gameState.playerStats.clusterCount; c++) {
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

                if (gameState.playerStats.chainLightning > 0) {
                    // DÜZELTME: "nearbyEnemies" yerine "enemySpatialGrid.query" kullanıyoruz.
                    // Merminin olduğu yeri değil, VURULAN DÜŞMANIN etrafını (400px) tarıyoruz.
                    const lightningRange = 400;
                    const potentialTargets = enemySpatialGrid.query(enemy.x, enemy.y, lightningRange);

                    let chainTargets = [];
                    for (const t of potentialTargets) {
                        if (t.id !== enemy.id && t.hp > 0) { // Canlı ve kendisi değilse
                            const dist = Math.hypot(t.x - enemy.x, t.y - enemy.y);
                            if (dist < lightningRange) {
                                chainTargets.push({ enemy: t, dist: dist });
                            }
                        }
                    }

                    chainTargets.sort((a, b) => a.dist - b.dist);
                    const chainCount = Math.min(gameState.playerStats.chainLightning, chainTargets.length);

                    for (let c = 0; c < chainCount; c++) {
                        const target = chainTargets[c].enemy;
                        target.hp -= 3; // Yıldırım hasarı (biraz artırdım)

                        // Görsel oluştur
                        spawnChainLightning(enemy.x, enemy.y, target.x, target.y);
                        spawnParticles(target.x, target.y, 5, 2, '#00ffff'); // Mavi partikül

                        // Yıldırımla ölürse
                        if (target.hp <= 0) {
                            handleEnemyDeath(target);
                        }
                    }
                }

                if (enemy.hp <= 0) {
                    gameState.score += enemy.type.score;

                    if (enemy.type.name === 'Splitter') {
                        const splitCount = 2 + Math.floor(Math.random() * 2);
                        for (let s = 0; s < splitCount; s++) {
                            const splitAngle = (Math.PI * 2 / splitCount) * s;
                            const splitX = enemy.x + Math.cos(splitAngle) * 30;
                            const splitY = enemy.y + Math.sin(splitAngle) * 30;
                            enemyPool.get(splitX, splitY, ENEMY_TYPES.MINI_SPLITTER, gameState.difficultyMultiplier);
                        }
                    }

                    if (gameState.playerStats.explosiveRadius > 0) {
                        // Dosyanın altındaki hazır ve düzgün fonksiyonu çağırıyoruz
                        createExplosion(enemy.x, enemy.y, gameState.playerStats.explosiveRadius, 7);
                    }

                    enemyPool.release(enemy);
                    spawnParticles(enemy.x, enemy.y, 8, 5, enemy.color, 2);
                }

                updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                if (gameState.score >= gameState.nextLevelThreshold && !gameState.bossActive) {
                    triggerLevelUp();
                }
            }
        }
    }
    profiler.end('projectile-collision');
    profiler.end('collisions');
}

// OPTIMIZED: Main Animation Loop
function animate(timestamp) {
    if (!gameState.gameActive || gameState.isPaused) {
        lastTime = 0; // Pause sonrası zıplamayı önle
        return;
    }

    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // Normalize dt: 1.0 at 60 FPS (16.67ms)
    // Eğer çok düşük fps varsa (örn tab değişimi) dt'yi sınırla (max 3 frame atlama)
    const dt = Math.min(deltaTime / (1000 / 60), 3);

    profiler.start('frame');
    gameState.animationId = requestAnimationFrame(animate);

    updateFPS();

    // OPTIMIZATION: Auto-adjust quality based on object count
    profiler.start('quality-adjust');
    RenderOptimizer.autoAdjustQuality();
    profiler.end('quality-adjust');

    profiler.start('clear-screen');
    CTX.fillStyle = 'rgba(5, 5, 5, 0.1)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    profiler.end('clear-screen');
    /* BackgroundManager.updateAndDraw(); // <-- BURAYA *///burası backgroundeffectyeri
    // BOSS GÜNCELLEME VE ÇİZİM
    if (gameState.bossActive) {
        boss.update(player, dt);
        boss.draw();

        // Boss oyuncuya çarparsa (Basit çarpışma)
        const dist = Math.hypot(boss.x - player.x, boss.y - player.y);
        if (dist < boss.radius + player.radius) {
            if (gameState.playerStats.shield > 0) {
                // Kalkan varsa kalkanı kır ama ölme
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);
                // Oyuncuyu it
                const angle = Math.atan2(player.y - boss.y, player.x - boss.x);
                player.x += Math.cos(angle) * 200;
                player.y += Math.sin(angle) * 200;
            } else {
                gameOver(); // Shield yoksa ölürsün
            }
        }
    }
    profiler.start('draw-player');
    drawPlayer(gameState.playerStats, gameState.lastShotTime);
    profiler.end('draw-player');

    // Laser Beam
    if (gameState.playerStats.laserBeam && (isTouching || gameState.lastMouseX)) {
        profiler.start('laser');
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
        CTX.stroke();
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
        profiler.end('laser');
    }

    // Nuclear Bomb
    // Nuclear Bomb Fix
    if (gameState.playerStats.nuclearBomb) {
        gameState.nuclearBombTimer += dt;
        if (gameState.nuclearBombTimer >= 600) {
            gameState.nuclearBombTimer = 0;
            // Görsel efekt
            spawnParticles(player.x, player.y, 50, 8, '#ff6600', 3);
            playSound('hit');

            // KRİTİK DÜZELTME: Tersten döngü ile can azalt ve ölenleri yok et
            const enemies = enemyPool.getActive();
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                enemy.hp -= 10; // 10 Hasar vur

                if (enemy.hp <= 0) {
                    handleEnemyDeath(enemy); // Merkezi ölüm fonksiyonunu çağır
                }
            }
        }
    }

    // Orbitals
    if (gameState.playerStats.orbitals > 0) {
        profiler.start('orbitals');
        const orbitalTime = Date.now() / 500;
        for (let i = 0; i < gameState.playerStats.orbitals; i++) {
            const angle = orbitalTime + (i * (Math.PI * 2 / gameState.playerStats.orbitals));
            const ox = player.x + Math.cos(angle) * 60;
            const oy = player.y + Math.sin(angle) * 60;

            CTX.beginPath();
            CTX.arc(ox, oy, 10, 0, Math.PI * 2);
            CTX.fillStyle = '#00ffff';
            CTX.fill();

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
        profiler.end('orbitals');
    }

    profiler.start('update-particles');
    particlePool.update(particle => particle.update(dt));
    profiler.end('update-particles');

    profiler.start('draw-particles');
    RenderOptimizer.drawParticlesBatched(particlePool.getActive());
    profiler.end('draw-particles');

    profiler.start('update-mines');
    updateAndDrawMines(dt);
    profiler.end('update-mines');

    profiler.start('update-lightnings');
    updateAndDrawLightnings(dt);
    profiler.end('update-lightnings');

    profiler.start('update-projectiles');
    projectilePool.update(projectile => {
        return projectile.update(enemyPool.getActive(), gameState.playerStats, dt);
    });
    profiler.end('update-projectiles');

    profiler.start('draw-projectiles');
    // OPTIMIZATION: Batch render projectiles!
    RenderOptimizer.drawProjectilesBatched(projectilePool.getActive());
    profiler.end('draw-projectiles');

    profiler.start('update-enemies');
    enemyPool.getActive().forEach(enemy => enemy.update(player, dt));
    profiler.end('update-enemies');

    profiler.start('draw-enemies');
    enemyPool.getActive().forEach(enemy => RenderOptimizer.drawEnemy(enemy));
    profiler.end('draw-enemies');

    checkCollisions();

    profiler.end('frame');
    profiler.update();
}

// Initialize Game
function initGame() {
    gameState.score = 0;
    gameState.level = 1;
    gameState.nextLevelThreshold = 600;
    gameState.currentLevelStep = 600;
    gameState.difficultyMultiplier = 0;
    gameState.nuclearBombTimer = 0;
    mines = [];
    lightnings = [];
    projectilePool.releaseAll();
    enemyPool.releaseAll();
    particlePool.releaseAll();
    gameState.playerStats = { ...DEFAULT_PLAYER_STATS };
    player.radius = 20 * GAME_SCALE;
    updateLevelIndicator(1);
    updateProgressBar(0, 600);
    updateShieldIndicator(0);
    /* BackgroundManager.init(); */
    gameState.gameActive = true;
    gameState.isPaused = false;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    lastTime = 0; // Reset time
    requestAnimationFrame(animate);
    spawnEnemies();
}

function gameOver() {
    gameState.gameActive = false;
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);

    finalScoreEl.innerText = `Toplam Skor: ${gameState.score} - Seviye: ${gameState.level}`;
    window.lastGameScore = gameState.score;
    window.lastGameLevel = gameState.level;

    document.getElementById('submit-score-btn').style.display = 'inline-block';
    document.getElementById('submit-score-btn').disabled = false;
    document.getElementById('submit-score-btn').innerText = 'SKORU KAYDET';
    document.getElementById('player-name-input').style.display = 'inline-block';

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

window.addEventListener('resize', () => {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    GAME_SCALE = Math.max(window.innerWidth / BASE_SCREEN_WIDTH, 0.6);
    player.x = CANVAS.width / 2;
    player.y = CANVAS.height / 2;
    player.radius = 20 * GAME_SCALE;
});

// Mine System
function spawnClusterMine(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 30;
    mines.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        timer: 360,
        radius: 12,
        active: true,
        color: '#ff6600'
    });
}

function updateAndDrawMines(dt) {
    for (let i = mines.length - 1; i >= 0; i--) {
        const mine = mines[i];
        const pulse = Math.sin(Date.now() / 100) * 3;
        CTX.beginPath();
        CTX.arc(mine.x, mine.y, mine.radius + pulse, 0, Math.PI * 2);
        CTX.fillStyle = `rgba(255, 100, 0, ${mine.timer / 360 + 0.2})`;
        CTX.fill();
        CTX.strokeStyle = 'white';
        CTX.lineWidth = 2;
        CTX.stroke();

        mine.timer -= dt;
        let shouldExplode = mine.timer <= 0;

        if (!shouldExplode) {
            const enemies = enemyPool.getActive();
            for (const enemy of enemies) {
                const dist = Math.hypot(mine.x - enemy.x, mine.y - enemy.y);
                if (dist < mine.radius + enemy.radius) {
                    shouldExplode = true;
                    break;
                }
            }
        }

        if (shouldExplode) {
            explodeMine(mine.x, mine.y);
            mines.splice(i, 1);
        }
    }
}

function explodeMine(x, y) {
    const explosionRadius = 120;
    const damage = 5;
    spawnParticles(x, y, 15, 5, '#ff4400', 4);
    playSound('hit');

    const enemies = enemyPool.getActive();
    enemies.forEach(enemy => {
        const dist = Math.hypot(enemy.x - x, enemy.y - y);
        if (dist < explosionRadius) {
            enemy.hp -= damage;
            spawnParticles(enemy.x, enemy.y, 3, 2, '#fff');
        }
    });
}

// Lightning System
function spawnChainLightning(x1, y1, x2, y2) {
    lightnings.push({
        x1, y1, x2, y2,
        life: 15, // Biraz daha uzun kalsın
        segments: [],
        color: '#00ffff' // Neon mavisi (Cyan)
    });
}

function updateAndDrawLightnings(dt) {
    // Bloom efekti için ayar (performanslı olması için batch'lemesiz)
    CTX.lineCap = 'round';
    CTX.lineJoin = 'round';

    for (let i = lightnings.length - 1; i >= 0; i--) {
        const bolt = lightnings[i];

        // Segmentleri sadece ilk karede oluştur (Fractal yapısı)
        if (bolt.segments.length === 0) {
            const dist = Math.hypot(bolt.x2 - bolt.x1, bolt.y2 - bolt.y1);
            const steps = Math.max(3, Math.floor(dist / 40)); // Adım sayısı

            let currX = bolt.x1;
            let currY = bolt.y1;
            bolt.segments.push({ x: currX, y: currY });

            for (let s = 1; s < steps; s++) {
                // Doğrusal interpolasyon
                const t = s / steps;
                let tx = bolt.x1 + (bolt.x2 - bolt.x1) * t;
                let ty = bolt.y1 + (bolt.y2 - bolt.y1) * t;

                // Jitter (Rastgele sapma)
                const jitter = (Math.random() - 0.5) * 60;
                tx += jitter;
                ty += jitter;

                bolt.segments.push({ x: tx, y: ty });
            }
            bolt.segments.push({ x: bolt.x2, y: bolt.y2 });
        }

        // ÇİZİM - İki katmanlı (Glow + Core)
        const alpha = bolt.life / 15;

        // 1. Katman: Geniş, renkli dış ışıltı (Glow)
        CTX.beginPath();
        CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let p = 1; p < bolt.segments.length; p++) {
            CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
        }
        CTX.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.6})`; // Cyan Glow
        CTX.lineWidth = 8;
        // ShadowBlur pahalıdır ama sadece yıldırım için değer
        if (lightnings.length < 10) {
            CTX.shadowBlur = 15;
            CTX.shadowColor = '#00ffff';
        }
        CTX.stroke();
        CTX.shadowBlur = 0; // Kapatmayı unutma

        // 2. Katman: İnce, beyaz çekirdek (Core)
        CTX.beginPath();
        CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let p = 1; p < bolt.segments.length; p++) {
            CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
        }
        CTX.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        CTX.lineWidth = 2;
        CTX.stroke();

        bolt.life -= dt;
        if (bolt.life <= 0) {
            lightnings.splice(i, 1);
        }
    }
    // Canvas ayarlarını normale döndür
    CTX.lineCap = 'butt';
    CTX.lineJoin = 'miter';
}
// YENİ: Merkezi ölüm yönetimi (Kod tekrarını ve bugları önler)
function handleEnemyDeath(enemy) {
    // Eğer zaten öldüyse veya havuzda değilse işlem yapma
    if (enemy.hp > 0 && !enemyPool.active.includes(enemy)) return;

    if (!gameState.bossActive) {
        gameState.score += enemy.type.score;
    }
    // Splitter Mantığı
    if (enemy.type.name === 'Splitter') {
        const splitCount = 2 + Math.floor(Math.random() * 2);
        for (let s = 0; s < splitCount; s++) {
            const splitAngle = (Math.PI * 2 / splitCount) * s;
            const splitX = enemy.x + Math.cos(splitAngle) * 30;
            const splitY = enemy.y + Math.sin(splitAngle) * 30;
            enemyPool.get(splitX, splitY, ENEMY_TYPES.MINI_SPLITTER, gameState.difficultyMultiplier);
        }
    }

    // Patlama (Explosive Radius) Mantığı - Zincirleme patlama için buraya aldık
    if (gameState.playerStats.explosiveRadius > 0) {
        createExplosion(enemy.x, enemy.y, gameState.playerStats.explosiveRadius, 7);
    }

    enemyPool.release(enemy);
    spawnParticles(enemy.x, enemy.y, 8, 5, enemy.color, 2);

    // Level atlama kontrolü
    updateProgressBar(gameState.score, gameState.nextLevelThreshold);
    if (gameState.score >= gameState.nextLevelThreshold && !gameState.bossActive) {
        triggerLevelUp();
    }
}

// YENİ: Patlama Fonksiyonu (Hem mayın hem perk için ortak)
function createExplosion(x, y, radius, damage) {
    // Görsel Efekt
    CTX.beginPath();
    CTX.arc(x, y, radius, 0, Math.PI * 2);
    CTX.fillStyle = 'rgba(255, 60, 0, 0.2)'; // Daha belirgin renk
    CTX.fill();
    // Grid'i bük! (Gücü 50, Yarıçapı 300 yaptık)
    /* backgroundEffect.applyForce(x, y, 150, 300); */
    // Şok dalgası efekti
    spawnParticles(x, y, Math.min(radius / 3, 20), 4, '#ff4400', 3);

    // Hasar Mantığı - DÜZELTME BURADA
    // Grid üzerinden geniş alan sorgusu yapıyoruz
    const nearbyTargets = enemySpatialGrid.query(x, y, radius);

    for (const target of nearbyTargets) {
        // Kendimize hasar vermeyelim (mesafe kontrolü zaten spatial grid içinde kaba yapılıyor, burada hassas ölçüm şart)
        const dist = Math.hypot(target.x - x, target.y - y);

        if (dist < radius + target.radius) {
            target.hp -= damage;
            spawnParticles(target.x, target.y, 2, 2, '#ffffff', 2);

            // KRİTİK DÜZELTME: Canı bittiyse anında öldür!
            if (target.hp <= 0) {
                // Recursive (özyinelemeli) patlama olmaması için patlamadan ölen bir daha patlamasın diyebilirsin
                // Ama kaos istiyorsan handleEnemyDeath çağırabilirsin. 
                // Sonsuz döngüyü önlemek için basitçe release yapıyoruz:
                gameState.score += target.type.score;
                enemyPool.release(target);
                /* handleEnemyDeath(target);
                spawnParticles(target.x, target.y, 5, 3, target.color, 1.5); */
            }
        }
    }
}
document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);