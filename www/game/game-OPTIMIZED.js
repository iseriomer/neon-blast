
// game-OPTIMIZED.js - Heavily optimized version
// Key changes:
// 1. Spatial grid for collisions (O(n*m) -> O(n))
// 2. Batch rendering (400 draw calls -> 5)
// 3. Performance profiling
// 4. Projectile cap
// 5. Dynamic quality adjustment
// 6. COMPONENTIZED ARCHITECTURE (refactored)

// Globals managed by other files:
// lightnings, blackHole (in skills/)
// spawnEnemies, triggerLevelUp (in managers/)

let lastTime = 0; // Delta time için zaman takibi

// Constants moved to constants.js (MAX_PROJECTILES, MAX_PARTICLES)

// Game State
const gameState = {
    animationId: null,
    score: 0,
    level: 1,
    nextLevelThreshold: 600,
    previousLevelThreshold: 0,
    currentLevelStep: 600,
    bossActive: false,
    gameActive: false,
    isPaused: false,
    spawnInterval: null,
    difficultyMultiplier: 1,
    lastShotTime: 0,
    singularityTimer: 0,
    timeWarpActive: false,
    timeWarpTimer: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    playerStats: { ...DEFAULT_PLAYER_STATS },
    godMode: false,
    hitstopTimer: 0,
    isDying: false,
    deathTimer: 0,
    isStarting: false,
    startTimer: 0,
    activeHealerCount: 0,
    activeSpawnerCount: 0,
    takenPerks: [],
    laserRotation: 0,
    orbitalRotation: 0
};

// Input State handled by InputManager

// Hitstop Function
window.triggerHitstop = function (duration) {
    gameState.hitstopTimer = duration;
}

// Boss Functions handled by BossManager
// Collision Logic handled by CollisionManager

// OPTIMIZED: Main Animation Loop
function animate(timestamp) {
    if (!gameState.gameActive || gameState.isPaused) {
        lastTime = 0; // Pause sonrası zıplamayı önle
        return;
    }

    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    // START ANIMATION (REBIRTH)
    if (gameState.isStarting) {
        gameState.startTimer += deltaTime;

        // Arkaplanı temizle
        CTX.fillStyle = 'rgba(0, 0, 0, 1)';
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        const centerX = CANVAS.width / 2;
        const centerY = CANVAS.height / 2;
        const duration = 2500;

        // Phase 1: Particles Converging (0 - 2000ms)
        if (gameState.startTimer < 2000) {
            // Rastgele dışarıdan merkeze gelen partiküller oluştur
            if (Math.random() < 0.5) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 800; // Uzaktan gelsin
                const px = centerX + Math.cos(angle) * dist;
                const py = centerY + Math.sin(angle) * dist;

                // Hız vektörü merkeze doğru
                const speed = 15;
                const vx = (centerX - px) / 50; // 50 frame'de ulaşsın
                const vy = (centerY - py) / 50;

                particlePool.get(px, py, 2, '#00ffff', { x: vx, y: vy });
            }

            // "REBIRTH" Text (Fading in)
            const alpha = Math.min(1, gameState.startTimer / 1000);
            CTX.fillStyle = `rgba(0, 255, 255, ${alpha})`;
            CTX.font = 'bold 40px Arial';
            CTX.textAlign = 'center';
            CTX.fillText("SYSTEM REBOOT...", centerX, centerY + 100);

        }
        // Phase 2: Flash & Spawn (2000ms - 2500ms)
        else if (gameState.startTimer < duration) {
            if (!player.visible) {
                player.visible = true;
                player.x = centerX;
                player.y = centerY;
                createExplosion(centerX, centerY, 200, 0); // Görsel patlama
                playSound('levelup');
            }

            // Flash Effect
            const flashProgress = (gameState.startTimer - 2000) / 500;
            const flashAlpha = 1 - flashProgress;
            CTX.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
            CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

            // Player'ı çiz
            drawPlayer(gameState.playerStats, 0);

            CTX.fillStyle = `rgba(0, 255, 255, ${flashAlpha})`;
            CTX.font = 'bold 60px Arial';
            CTX.textAlign = 'center';
            CTX.fillText("ONLINE", centerX, centerY - 100);

        } else {
            // Animasyon Bitişi
            gameState.isStarting = false;
            spawnEnemies();
        }

        // Partikülleri güncelle ve çiz
        RenderOptimizer.drawParticlesBatched(particlePool.getActive());
        particlePool.update(p => p.update(1)); // dt=1

        gameState.animationId = requestAnimationFrame(animate);
        return;
    }

    // HITSTOP
    if (gameState.hitstopTimer > 0) {
        gameState.hitstopTimer--;
        // Hitstop sırasında çizim yapmaya devam et ama update yapma
        // Sadece titreme efekti ekleyebiliriz
        CTX.save();
        CTX.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);

        // Mevcut kareyi tekrar çiz (Update olmadan)
        // animate() başında trail efektini dinamik yap
        const trailAlpha = projectilePool.getActiveCount() > 100 ? 0.2 : 0.1;
        CTX.fillStyle = `rgba(5, 5, 5, ${trailAlpha})`;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        if (gameState.bossActive) {
            BossManager.draw();
        }

        drawPlayer(gameState.playerStats, gameState.lastShotTime);
        RenderOptimizer.drawParticlesBatched(particlePool.getActive());
        updateAndDrawLightnings(0); // dt = 0
        RenderOptimizer.drawProjectilesBatched(projectilePool.getActive());
        enemyPool.getActive().forEach(enemy => RenderOptimizer.drawEnemy(enemy));

        CTX.restore();

        gameState.animationId = requestAnimationFrame(animate);
        return;
    }

    // DEATH SEQUENCE
    if (gameState.isDying) {
        gameState.deathTimer += deltaTime; // Gerçek zaman kullanıyoruz (dt değil)

        // 1. Zoom Efekti (0 - 1000ms)
        const maxZoom = 2.0;
        const zoomDuration = 1000;
        let currentZoom = 1.0;

        if (gameState.deathTimer < zoomDuration) {
            const progress = gameState.deathTimer / zoomDuration;
            // Easing: easeOutCubic
            const t = 1 - Math.pow(1 - progress, 3);
            currentZoom = 1.0 + (maxZoom - 1.0) * t;
        } else {
            currentZoom = maxZoom;
        }

        // 2. Zaman Yavaşlaması (Slow Motion)
        // dt'yi manipüle etmiyoruz, çünkü update'i tamamen durduracağız veya çok yavaşlatacağız
        // Sadece görsel efektler için çizim yapıyoruz

        CTX.save();

        // Zoom merkezini oyuncuya odakla
        CTX.translate(CANVAS.width / 2, CANVAS.height / 2);
        CTX.scale(currentZoom, currentZoom);
        CTX.translate(-player.x, -player.y); // Oyuncuyu merkeze al

        // Arkaplanı temizle (hafif iz bırakarak)
        CTX.fillStyle = 'rgba(0, 0, 0, 0.1)';
        CTX.fillRect(player.x - CANVAS.width, player.y - CANVAS.height, CANVAS.width * 2, CANVAS.height * 2);

        // Her şeyi çiz (Update yok!)
        if (gameState.bossActive) {
            BossManager.draw();
        }

        // Oyuncu parçalanma efekti (1000ms sonra)
        if (gameState.deathTimer > zoomDuration && gameState.deathTimer < zoomDuration + 100) {
            // Tek seferlik parçalanma
            if (!player.shattered) {
                createExplosion(player.x, player.y, 100, 50); // Büyük patlama
                spawnParticles(player.x, player.y, 50, 5, '#00ffff', 5);
                player.shattered = true;
                playSound('hit'); // Patlama sesi
            }
        }

        if (!player.shattered) {
            drawPlayer(gameState.playerStats, gameState.lastShotTime);
        }

        RenderOptimizer.drawParticlesBatched(particlePool.getActive());
        // Partikülleri yavaşça güncelle (Slow motion patlama için)
        particlePool.update(p => p.update(0.1));

        RenderOptimizer.drawProjectilesBatched(projectilePool.getActive());
        enemyPool.getActive().forEach(enemy => RenderOptimizer.drawEnemy(enemy));

        CTX.restore();

        // 3. Oyun Sonu (2000ms sonra)
        if (gameState.deathTimer > 2000) {
            gameState.isDying = false;
            player.shattered = false; // Reset
            gameOver();
            return;
        }

        gameState.animationId = requestAnimationFrame(animate);
        return;
    }

    // Normalize dt: 1.0 at 60 FPS (16.67ms)
    // Eğer çok düşük fps varsa (örn tab değişimi) dt'yi sınırla (max 3 frame atlama)
    const dt = Math.min(deltaTime / (1000 / 60), 3);
    /* if (Math.random() < 0.01) console.log("Animate - dt:", dt, "Enemies:", enemyPool.getActiveCount()); */

    profiler.start('frame');

    // OPTIMIZED: Input Handling (Synced with Game Loop)
    InputManager.update(gameState);
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

    // BOSS UPDATES
    BossManager.updateAndDraw(dt);

    // TRACER UPDATE (SVG)
    updateTracerUI();

    profiler.start('draw-player');
    drawPlayer(gameState.playerStats, gameState.lastShotTime);
    profiler.end('draw-player');

    // Multi-Laser Beam Implementation
    if (gameState.playerStats.laserBeam > 0) {
        profiler.start('laser');
        // Update laser rotation based on deltaTime (seconds)
        gameState.laserRotation += deltaTime / 1000;

        const laserCount = gameState.playerStats.laserBeam;
        const baseAngle = gameState.laserRotation; // Use accumulated rotation

        for (let i = 0; i < laserCount; i++) {
            const angleOffset = (Math.PI * 2 / laserCount) * i;
            const angle = baseAngle + angleOffset;

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
                // Direction vector of the laser
                const laserDx = laserEndX - player.x;
                const laserDy = laserEndY - player.y;

                // Vector from player to enemy
                const enemyDx = enemy.x - player.x;
                const enemyDy = enemy.y - player.y;

                // 1. Dot Product Check: Is the enemy in front of the laser?
                // (dot > 0 means the angle is less than 90 degrees)
                const dotProduct = laserDx * enemyDx + laserDy * enemyDy;

                if (dotProduct > 0) {
                    const distToLine = Math.abs(
                        (laserEndY - player.y) * enemy.x -
                        (laserEndX - player.x) * enemy.y +
                        laserEndX * player.y - laserEndY * player.x
                    ) / Math.hypot(laserEndY - player.y, laserEndX - player.x);

                    const distToPlayer = Math.hypot(enemyDx, enemyDy);

                    if (distToLine < enemy.radius + 10 && distToPlayer < 2000) {
                        enemy.hp -= gameState.playerStats.laserDamage;

                        if (enemy.hp <= 0) {
                            handleEnemyDeath(enemy);
                        }
                    }
                }
            });
        }
        profiler.end('laser');
    }

    // Nuclear Bomb
    // Nuclear Bomb Fix
    if (gameState.playerStats.singularity) {
        gameState.singularityTimer += dt;
        if (gameState.singularityTimer >= 1800) {
            gameState.singularityTimer = 0;
            // Görsel efekt
            spawnBlackHole();
        }
    }
    // Kara deliği güncelle ve çiz
    if (typeof updateAndDrawBlackHole === 'function') {
        updateAndDrawBlackHole(dt);
    }

    // Orbitals
    if (gameState.playerStats.orbitals > 0) {
        profiler.start('orbitals');
        gameState.orbitalRotation += deltaTime / 500;
        const orbitalTime = gameState.orbitalRotation;

        for (let i = 0; i < gameState.playerStats.orbitals; i++) {
            const angle = orbitalTime + (i * (Math.PI * 2 / gameState.playerStats.orbitals));

            // ADJUSTED: Larger radius and distance, scaled
            const orbitalDist = 230 * GAME_SCALE;
            const orbitalRadius = 16 * GAME_SCALE * gameState.playerStats.orbitalSizeMultiplier;

            const ox = player.x + Math.cos(angle) * orbitalDist;
            const oy = player.y + Math.sin(angle) * orbitalDist;

            CTX.beginPath();
            CTX.arc(ox, oy, orbitalRadius, 0, Math.PI * 2);
            CTX.fillStyle = '#00ffff';
            CTX.fill();

            enemyPool.getActive().forEach(enemy => {
                const dist = Math.hypot(ox - enemy.x, oy - enemy.y);
                if (dist < enemy.radius + orbitalRadius) {
                    enemy.hp -= 0.1;
                    if (enemy.hp <= 0) {
                        handleEnemyDeath(enemy);
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

    profiler.start('update-lightnings');
    updateAndDrawLightnings(dt);
    profiler.end('update-lightnings');

    profiler.start('update-projectiles');
    projectilePool.update(projectile => {
        return projectile.update(enemyPool.getActive(), gameState.playerStats, dt, enemySpatialGrid);
    });
    profiler.end('update-projectiles');

    profiler.start('draw-projectiles');
    // OPTIMIZATION: Btch render projectiles!
    RenderOptimizer.drawProjectilesBatched(projectilePool.getActive());
    profiler.end('draw-projectiles');

    profiler.start('update-enemies');
    enemyPool.getActive().forEach(enemy => enemy.update(player, dt));
    profiler.end('update-enemies');

    profiler.start('draw-enemies');
    enemyPool.getActive().forEach(enemy => RenderOptimizer.drawEnemy(enemy));
    profiler.end('draw-enemies');

    CollisionManager.check();

    profiler.end('frame');
    profiler.update();
}

// Initialize Game
function initGame() {
    gameState.score = 0;
    gameState.level = 1;
    gameState.nextLevelThreshold = 600;
    gameState.previousLevelThreshold = 0;
    gameState.currentLevelStep = 600;
    gameState.difficultyMultiplier = 0;
    gameState.activeHealerCount = 0;
    gameState.activeSpawnerCount = 0;
    gameState.takenPerks = [];
    gameState.laserRotation = 0;
    gameState.orbitalRotation = 0;
    // Yeni:
    gameState.singularityTimer = 0;

    // Globals managed in other files
    if (typeof lightnings !== 'undefined') lightnings.length = 0;
    if (typeof blackHole !== 'undefined') blackHole = null; // Careful with const assignment if it was const. It was let.

    projectilePool.releaseAll();
    enemyPool.releaseAll();
    particlePool.releaseAll();

    // BOSS RESET LOGIC
    gameState.bossActive = false;
    if (typeof boss !== 'undefined') {
        boss.active = false;
        boss.hp = 0;
    }
    if (typeof boss2 !== 'undefined') {
        boss2.active = false;
    }
    if (typeof boss3 !== 'undefined') {
        boss3.active = false;
        boss3.platforms = [];
        boss3.walls = [];
        boss3.vortexes = [];
    }
    if (typeof bossShapePool !== 'undefined') {
        bossShapePool.releaseAll();
    }
    // Fix: Reset Boss 4 & 5
    if (typeof boss4 !== 'undefined') {
        boss4.active = false;
        boss4.isSplit = false;
        boss4.splitCores = [];
        boss4.drones = []; // Clear local tracking
    }
    if (typeof boss5 !== 'undefined') {
        boss5.active = false;
        if (boss5.clockMinions) boss5.clockMinions = [];
        boss5.minions = [];
    }
    document.getElementById('boss-hud').style.display = 'none';

    // Reset other states
    gameState.timeWarpActive = false;
    gameState.timeWarpTimer = 0;
    gameState.hitstopTimer = 0;
    gameState.isDying = false;
    gameState.deathTimer = 0;
    player.shattered = false;
    if (typeof enemySpatialGrid !== 'undefined') {
        enemySpatialGrid.clear();
    }

    gameState.playerStats = { ...DEFAULT_PLAYER_STATS };
    player.radius = 20 * GAME_SCALE;
    updateLevelIndicator(1);
    updateProgressBar(0, 600);
    updateShieldIndicator(0);
    updateXPBarColor(gameState.playerStats.color); // Reset XP bar color
    /* BackgroundManager.init(); */
    gameState.gameActive = true;
    gameState.isPaused = false;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    levelUpScreen.classList.add('hidden'); // Ensure level up screen is closed

    lastTime = 0;

    // START ANIMATION SETUP
    gameState.isStarting = true;
    gameState.startTimer = 0;
    player.visible = false; // Player başta görünmez
    player.x = CANVAS.width / 2;
    player.y = CANVAS.height / 2;

    requestAnimationFrame(animate);
}

// Death Sequence
function startDeathSequence() {
    if (gameState.isDying || !gameState.gameActive || (typeof blackHole !== 'undefined' && blackHole)) return;

    gameState.isDying = true;
    gameState.deathTimer = 0;
    playSound('hit');
}

function gameOver() {
    gameState.gameActive = false;
    gameState.isPaused = true;
    if (gameState.spawnInterval) clearInterval(gameState.spawnInterval);

    finalScoreEl.innerText = `${Localization.t('score')}: ${gameState.score} - ${Localization.t('level')}: ${gameState.level}`;
    window.lastGameScore = gameState.score;
    window.lastGameLevel = gameState.level;

    document.getElementById('submit-score-btn').style.display = 'inline-block';
    document.getElementById('submit-score-btn').disabled = false;
    document.getElementById('submit-score-btn').innerText = Localization.t('save_score');
    document.getElementById('player-name-input').style.display = 'inline-block';

    if (window.fetchLeaderboard) {
        window.fetchLeaderboard();
    }

    gameOverScreen.classList.remove('hidden');
}



// PAUSE FUNCTIONALITY
function togglePause() {
    if (!gameState.gameActive) return; // Can't pause if game not active
    if (!levelUpScreen.classList.contains('hidden')) return; // Can't toggle pause during level up

    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
        document.getElementById('pause-menu').classList.remove('hidden');
        document.getElementById('ui-layer').style.filter = 'blur(5px)'; // Optional: Blur BG
    } else {
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('ui-layer').style.filter = 'none';
        lastTime = 0; // Reset timer to prevent jump
        requestAnimationFrame(animate);
    }
}

document.getElementById('pause-btn').addEventListener('click', togglePause);
document.getElementById('resume-btn').addEventListener('click', togglePause);

// FPS TOGGLE
document.getElementById('fps-toggle').addEventListener('change', (e) => {
    const fpsCounter = document.getElementById('fps-counter');
    if (e.target.checked) {
        fpsCounter.style.display = 'block';
    } else {
        fpsCounter.style.display = 'none';
    }
});

// KEYBOARD SHORTCUTS
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (gameState.gameActive && !gameState.isDying) {
            togglePause();
        } else if (!document.getElementById('leaderboard-screen').classList.contains('hidden')) {
            // Close leaderboard if open (optional context)
            document.getElementById('leaderboard-screen').classList.add('hidden');
        }
    }
});
InputManager.init();

// Initialize buttons
document.getElementById('start-btn').addEventListener('click', () => {
    // Audio Context might need user gesture to resume/start
    if (musicManager && musicManager.audioCtx) {
        if (musicManager.audioCtx.state === 'suspended') {
            musicManager.audioCtx.resume();
        }
    } else if (window.audioCtx) {
        musicManager.init(window.audioCtx);
    }

    musicManager.play(); // Start music
    initGame();
});
document.getElementById('restart-btn').addEventListener('click', () => {
    musicManager.play();
    initGame();
});

// AUDIO CONTROLS
document.getElementById('sfx-toggle').addEventListener('change', (e) => {
    setSFXEnabled(e.target.checked);
});

document.getElementById('music-toggle').addEventListener('change', (e) => {
    musicManager.toggleMusic(e.target.checked);
});

document.getElementById('music-volume').addEventListener('input', (e) => {
    musicManager.setVolume(parseFloat(e.target.value));
});

document.getElementById('prev-track-btn').addEventListener('click', () => {
    const switchSound = new Audio('game/music/switchTrack.mp3');
    switchSound.play();
    const trackName = musicManager.prevTrack();
    document.getElementById('current-track-name').innerText = trackName;
});

// Joystick Toggle
document.getElementById('joystick-toggle').addEventListener('change', (e) => {
    const zone = document.getElementById('joystick-zone');
    if (e.target.checked) {
        zone.style.display = 'block';
        if (window.joystick) window.joystick.active = false; // Reset state
    } else {
        zone.style.display = 'none';
        if (window.joystick) window.joystick.active = false;
    }
});

document.getElementById('next-track-btn').addEventListener('click', () => {
    const switchSound = new Audio('game/music/switchTrack.mp3');
    switchSound.play();
    const trackName = musicManager.nextTrack();
    document.getElementById('current-track-name').innerText = trackName;
});
// Initialize Track Name display
if (typeof musicManager !== 'undefined') {
    document.getElementById('current-track-name').innerText = musicManager.getCurrentTrackName();
}

function updateTracerUI() {
    const tracerLine = document.getElementById('tracer-line');
    if (!tracerLine) return;

    if (window.joystick && window.joystick.active) {
        tracerLine.style.display = 'block';
        const startX = player.x;
        const startY = player.y;
        const length = 1000;
        const endX = startX + window.joystick.vector.x * length;
        const endY = startY + window.joystick.vector.y * length;

        tracerLine.setAttribute('x1', startX);
        tracerLine.setAttribute('y1', startY);
        tracerLine.setAttribute('x2', endX);
        tracerLine.setAttribute('y2', endY);
    } else {
        tracerLine.style.display = 'none';
    }
}
