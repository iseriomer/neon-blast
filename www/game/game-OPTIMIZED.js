
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
// Capacitor StatusBar is loaded via CDN or build process for mobile apps
// For web, we check if Capacitor is available at runtime
let lastTime = 0; // Delta time için zaman takibi

// Constants moved to constants.js (MAX_PROJECTILES, MAX_PARTICLES)


const hideBar = async () => {
    // Only hide status bar if running in Capacitor (mobile app)
    if (typeof Capacitor !== 'undefined' && Capacitor.Plugins && Capacitor.Plugins.StatusBar) {
        try {
            await Capacitor.Plugins.StatusBar.hide();
        } catch (e) {
            console.log('StatusBar API not available:', e);
        }
    }
};
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
    orbitalRotation: 0,
    screenShake: null, // { intensity, duration, timer }
    killStreak: 0,
    killStreakTimer: 0,
    sessionGameCount: 0,       // Track games played this session for interstitial frequency
    totalEnemiesKilled: 0,     // Track for quests
    totalBossesKilled: 0       // Track for quests
};

// Input State handled by InputManager

// Hitstop Function
window.triggerHitstop = function (duration) {
    gameState.hitstopTimer = duration;
}

// Screen Shake Function
window.triggerScreenShake = function (intensity, duration = 200) {
    // Check if screen shake is enabled
    const shakeToggle = document.getElementById('screenshake-toggle');
    if (shakeToggle && !shakeToggle.checked) {
        return; // Screen shake disabled
    }

    // Don't override stronger shakes with weaker ones
    if (gameState.screenShake && gameState.screenShake.intensity > intensity) {
        return;
    }
    gameState.screenShake = {
        intensity: intensity,
        duration: duration,
        timer: 0
    };
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

        // 3. Oyun Sonu / Revive (2000ms sonra)
        if (gameState.deathTimer > 2000) {
            gameState.isDying = false;
            player.shattered = false; // Reset
            if (!gameState.hasRevivedThisRun) {
                triggerReviveOffer();
                return;
            }
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

    profiler.start('input');
    // OPTIMIZED: Input Handling (Synced with Game Loop)
    InputManager.update(gameState);
    profiler.end('input');
    gameState.animationId = requestAnimationFrame(animate);

    updateFPS();

    // OPTIMIZATION: Auto-adjust quality based on object count
    profiler.start('quality-adjust');
    RenderOptimizer.autoAdjustQuality();
    profiler.end('quality-adjust');

    // UPDATE: Screen Shake
    if (gameState.screenShake) {
        gameState.screenShake.timer += deltaTime;
        if (gameState.screenShake.timer >= gameState.screenShake.duration) {
            gameState.screenShake = null;
        }
    }

    // UPDATE: Kill Streak Decay
    if (gameState.killStreakTimer > 0) {
        gameState.killStreakTimer -= deltaTime;
        if (gameState.killStreakTimer <= 0) {
            gameState.killStreak = 0;
        }
    }

    // UPDATE: Invulnerability Timer (e.g. after Revive)
    if (gameState.invulnerableTimer && gameState.invulnerableTimer > 0) {
        gameState.invulnerableTimer -= deltaTime;
        if (gameState.invulnerableTimer < 0) gameState.invulnerableTimer = 0;
    }

    profiler.start('clear-screen');
    if (window.BackgroundManager) {
        BackgroundManager.updateAndDraw(1);
    } else {
        CTX.fillStyle = 'rgba(5, 5, 5, 0.1)';
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    }
    profiler.end('clear-screen');

    // APPLY: Screen Shake Transform
    if (gameState.screenShake) {
        CTX.save();
        const shake = gameState.screenShake.intensity;
        const randomX = (Math.random() - 0.5) * shake;
        const randomY = (Math.random() - 0.5) * shake;
        CTX.translate(randomX, randomY);
    }

    // BOSS UPDATES
    profiler.start('boss-manager');
    BossManager.updateAndDraw(dt);
    profiler.end('boss-manager');

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
        const laserRange = Math.max(CANVAS.width, CANVAS.height) * 1.45;
        const activeEnemies = enemyPool.getActive();

        for (let i = 0; i < laserCount; i++) {
            const angleOffset = (Math.PI * 2 / laserCount) * i;
            const angle = baseAngle + angleOffset;
            const unitX = Math.cos(angle);
            const unitY = Math.sin(angle);
            const laserEndX = player.x + unitX * laserRange;
            const laserEndY = player.y + unitY * laserRange;

            CTX.beginPath();
            CTX.moveTo(player.x, player.y);
            CTX.lineTo(laserEndX, laserEndY);
            CTX.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            CTX.lineWidth = 3;
            CTX.stroke();
            CTX.lineWidth = 1;

            // Unit-vector projection avoids two hypot/sqrt operations per target.
            for (let enemyIndex = activeEnemies.length - 1; enemyIndex >= 0; enemyIndex--) {
                const enemy = activeEnemies[enemyIndex];
                const enemyDx = enemy.x - player.x;
                const enemyDy = enemy.y - player.y;
                const forward = unitX * enemyDx + unitY * enemyDy;
                if (forward > 0 && forward < laserRange) {
                    const perpendicular = Math.abs(unitX * enemyDy - unitY * enemyDx);
                    if (perpendicular < enemy.radius + 10) {
                        let damage = gameState.playerStats.laserDamage;
                        if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.2) {
                            damage = 999;
                            spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                        }
                        enemy.hp -= damage;
                        if (enemy.hp <= 0) handleEnemyDeath(enemy);
                    }
                }
            }

            // BOSS DAMAGE - LASER
            if (gameState.bossActive && BossManager.activeBoss && BossManager.activeBoss.active) {
                const boss = BossManager.activeBoss;
                const bossDx = boss.x - player.x;
                const bossDy = boss.y - player.y;
                const forward = unitX * bossDx + unitY * bossDy;
                if (forward > 0 && forward < laserRange) {
                    const perpendicular = Math.abs(unitX * bossDy - unitY * bossDx);
                    if (perpendicular < boss.radius + 10) {
                        boss.takeDamage(gameState.playerStats.laserDamage * (gameState.playerStats.bossDamageMultiplier || 1));
                    }
                }
            }
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
                    // Execute check
                    let damage = gameState.playerStats.orbitalDamage;
                    if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.2) {
                        damage = 999;
                        spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                    }
                    enemy.hp -= damage;
                    if (enemy.hp <= 0) {
                        handleEnemyDeath(enemy);
                    }
                }
            });

            // BOSS DAMAGE - ORBITAL
            if (gameState.bossActive && BossManager.activeBoss && BossManager.activeBoss.active) {
                const boss = BossManager.activeBoss;
                const dist = Math.hypot(ox - boss.x, oy - boss.y);
                if (dist < boss.radius + orbitalRadius) {
                    boss.takeDamage(gameState.playerStats.orbitalDamage * (gameState.playerStats.bossDamageMultiplier || 1));
                }
            }
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
    // OPTIMIZATION: Batch render enemies instead of individual draws
    RenderOptimizer.drawEnemiesBatched(enemyPool.getActive());
    profiler.end('draw-enemies');

    // Electric Aura Update & Draw
    if (gameState.playerStats.electricAura) {
        profiler.start('electric-aura');
        updateAndDrawElectricAura(dt);
        profiler.end('electric-aura');
    }

    // RESTORE: Screen Shake Transform
    if (gameState.screenShake) {
        CTX.restore();
    }

    CollisionManager.check();

    profiler.end('frame');
    profiler.update();
}

// Electric Aura Implementation - Redesigned (Optimized & Cool UX)
function updateAndDrawElectricAura(dt) {
    const stats = gameState.playerStats;
    const radius = stats.auraRadius * GAME_SCALE;

    // Logic: Periodic Damage
    stats.auraTimer = (stats.auraTimer || 0) + (dt * 16.67);
    stats.auraRotation = (stats.auraRotation || 0) + dt * 0.03;

    // Initialize persistent lightning visual queue if needed
    if (!stats.lightningQueue) stats.lightningQueue = [];

    if (stats.auraTimer >= stats.auraTickRate) {
        stats.auraTimer = 0;
        let hitSomething = false;

        // OPTIMIZATION: Use spatial grid to query only nearby enemies
        const nearbyEnemies = enemySpatialGrid.query(
            player.x,
            player.y,
            radius * 1.1 // Slightly larger than aura radius for safety
        );

        const rSq = (radius * 1.05) ** 2; // Slight buffer

        for (let i = 0; i < nearbyEnemies.length; i++) {
            const enemy = nearbyEnemies[i];
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distSq = dx * dx + dy * dy; // OPTIMIZATION: Squared distance

            if (distSq < rSq) {
                // Execute check
                let damage = stats.auraDamage;
                if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.2) {
                    damage = 999;
                    spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                }
                enemy.hp -= damage;
                if (enemy.hp <= 0) handleEnemyDeath(enemy);
                hitSomething = true;

                // OPTIMIZATION: Cap lightning queue at 12 arcs to prevent performance degradation
                if (stats.lightningQueue.length < 52) {
                    stats.lightningQueue.push({
                        x: enemy.x,
                        y: enemy.y,
                        life: 1.0
                    });
                }
            }
        }

        // BOSS DAMAGE - ELECTRIC AURA
        if (gameState.bossActive && BossManager.activeBoss && BossManager.activeBoss.active) {
            const boss = BossManager.activeBoss;
            const dx = player.x - boss.x;
            const dy = player.y - boss.y;
            const distSq = dx * dx + dy * dy;
            // Boss radius might be larger, so check against combined radii squared or simple containment
            if (Math.hypot(dx, dy) < radius + boss.radius) { // Simple circle-circle
                boss.takeDamage(stats.auraDamage * (stats.bossDamageMultiplier || 1));
                hitSomething = true;
                if (stats.lightningQueue.length < 52) {
                    stats.lightningQueue.push({
                        x: boss.x,
                        y: boss.y,
                        life: 1.0
                    });
                }
            }
        }

        if (hitSomething) {
            playSound('spark_short');
            stats.auraDamagePulse = 1.0;
        }
    }

    // Decay Pulse
    if (stats.auraDamagePulse > 0) {
        stats.auraDamagePulse -= dt * 0.1;
        if (stats.auraDamagePulse < 0) stats.auraDamagePulse = 0;
    }

    // Visuals
    CTX.save();
    CTX.translate(player.x, player.y);
    CTX.globalCompositeOperation = 'lighter';

    // 1. Base Field (Subtle Glow)
    const bgGradient = CTX.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
    bgGradient.addColorStop(0, 'rgba(0, 150, 255, 0)');
    bgGradient.addColorStop(0.8, 'rgba(0, 150, 255, 0.02)');
    bgGradient.addColorStop(1, 'rgba(0, 200, 255, 0.08)'); // Much more subtle

    CTX.fillStyle = bgGradient;
    CTX.beginPath();
    CTX.arc(0, 0, radius, 0, Math.PI * 2);
    CTX.fill();

    // 2. Tech Ring (Outer Boundary - Thinner & Dimmer)
    CTX.strokeStyle = `rgba(0, 200, 255, ${0.1 + stats.auraDamagePulse * 0.3})`;
    CTX.lineWidth = 1; // Reduced from 2
    const segments = 4;
    const arcLen = (Math.PI * 2) / segments;
    const gap = 0.2;

    for (let i = 0; i < segments; i++) {
        const startAngle = stats.auraRotation + i * arcLen;
        CTX.beginPath();
        CTX.arc(0, 0, radius, startAngle, startAngle + arcLen - gap);
        CTX.stroke();
    }

    // 3. Inner Kinetic Ring (Fast Rotation - Subtler)
    CTX.strokeStyle = 'rgba(0, 100, 255, 0.1)';
    CTX.lineWidth = 1;
    const innerRadius = radius * 0.6;
    const innerSegments = 3;
    const innerArcLen = (Math.PI * 2) / innerSegments;

    for (let i = 0; i < innerSegments; i++) {
        const startAngle = -stats.auraRotation * 2 + i * innerArcLen;
        CTX.beginPath();
        CTX.arc(0, 0, innerRadius, startAngle, startAngle + innerArcLen - 0.5);
        CTX.stroke();
    }

    // 4. Random Idle Electricity (Arcing inside - Reduced frequency & opacity)
    if (Math.random() < 0.03) { // OPTIMIZATION: Reduced from 0.05 to 0.03
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        const tx = Math.cos(angle) * dist; // Target X (relative)
        const ty = Math.sin(angle) * dist; // Target Y (relative)
        drawElectricArc(CTX, 0, 0, tx, ty, 0.15); // Used 0.15 alpha directly
    }

    // 5. Active Damage Lightning (Connect player to hit enemies)
    // Draw & Update Persistent Lightning
    for (let i = stats.lightningQueue.length - 1; i >= 0; i--) {
        const bolt = stats.lightningQueue[i];

        // Transform to local
        const lx = bolt.x - player.x;
        const ly = bolt.y - player.y;

        const alpha = bolt.life;
        // Dual-layer lightning (Glow + Core)
        drawElectricArc(CTX, 0, 0, lx, ly, alpha);

        // Impact glow
        CTX.fillStyle = `rgba(0, 220, 255, ${alpha * 0.5})`;
        CTX.beginPath();
        CTX.arc(lx, ly, 6 * alpha, 0, Math.PI * 2);
        CTX.fill();

        bolt.life -= dt * 0.2; // Fade out speed
        if (bolt.life <= 0) {
            stats.lightningQueue.splice(i, 1);
        }
    }

    CTX.restore();
}

// Helper: Dual-layer lightning (Glow + Core) matching game style
function drawElectricArc(ctx, x1, y1, x2, y2, alpha) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);

    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(3, Math.floor(dist / 20)); // Segment count
    const dx = (x2 - x1) / steps;
    const dy = (y2 - y1) / steps;

    for (let i = 1; i < steps; i++) {
        // Reduced jitter for cleaner look
        ctx.lineTo(
            x1 + dx * i + (Math.random() - 0.5) * 12,
            y1 + dy * i + (Math.random() - 0.5) * 12
        );
    }
    ctx.lineTo(x2, y2);

    // Layer 1: Glow (Electric Blue)
    ctx.strokeStyle = `rgba(0, 220, 255, ${alpha * 0.4})`;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Layer 2: Core (White)
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reset context
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
}

// Initialize Game
// Initialize Game
function initGame() {
    hideBar();

    // A run can end during a miniboss. Clear transient encounter references so
    // a restarted/continued run never keeps an invisible registered boss.
    if (typeof BossManager !== 'undefined' && BossManager.activeBoss) {
        BossManager.activeBoss.active = false;
        BossManager.activeBoss = null;
    }
    if (typeof CollisionManager !== 'undefined') CollisionManager.clearBossRegistry();

    // CHECK FOR SAVE DATA
    const saveData = SaveManager.loadGame();
    if (saveData) {
        // --- LOAD GAME STATE ---
        gameState.score = saveData.score;
        gameState.level = saveData.level;
        gameState.nextLevelThreshold = saveData.nextLevelThreshold;
        gameState.previousLevelThreshold = saveData.previousLevelThreshold;
        gameState.currentLevelStep = saveData.currentLevelStep;
        gameState.difficultyMultiplier = saveData.difficultyMultiplier;
        gameState.playerStats = { ...DEFAULT_PLAYER_STATS, ...saveData.playerStats };
        gameState.takenPerks = saveData.takenPerks || [];

        // Restore Globals
        gameState.activeHealerCount = 0;
        gameState.activeSpawnerCount = 0;
        gameState.laserRotation = 0;
        gameState.orbitalRotation = 0;
        gameState.singularityTimer = 0;

        if (typeof lightnings !== 'undefined') lightnings.length = 0;
        if (typeof blackHole !== 'undefined') blackHole = null;

        projectilePool.releaseAll();
        enemyPool.releaseAll();
        particlePool.releaseAll();

        // Boss Reset (Keep inactive for now, let SpawnManager handle respawn if needed or just wait for next trigger)
        gameState.bossActive = false;
        if (typeof BossManager !== 'undefined') BossManager.activeBoss = null;
        if (typeof miniSentinel !== 'undefined') miniSentinel.active = false;
        if (typeof miniWarden !== 'undefined') miniWarden.active = false;
        if (typeof miniHarvester !== 'undefined') miniHarvester.active = false;
        if (typeof boss !== 'undefined') { boss.active = false; boss.hp = 0; }
        if (typeof boss2 !== 'undefined') boss2.active = false;
        if (typeof boss3 !== 'undefined') { boss3.active = false; boss3.platforms = []; boss3.walls = []; boss3.vortexes = []; }
        if (typeof bossShapePool !== 'undefined') bossShapePool.releaseAll();
        if (typeof boss4 !== 'undefined') { boss4.active = false; boss4.isSplit = false; boss4.splitCores = []; boss4.drones = []; }
        if (typeof boss5 !== 'undefined') { boss5.active = false; if (boss5.clockMinions) boss5.clockMinions = []; boss5.minions = []; }
        document.getElementById('boss-hud').style.display = 'none';

        const xpContainer = document.getElementById('xp-container');
        if (xpContainer) xpContainer.style.display = '';

        // Reset other states
        gameState.timeWarpActive = false;
        gameState.timeWarpTimer = 0;
        gameState.hitstopTimer = 0;
        gameState.isDying = false;
        gameState.deathTimer = 0;
        player.shattered = false;
        if (typeof enemySpatialGrid !== 'undefined') enemySpatialGrid.clear();

        // Restore Player
        player.radius = 20 * GAME_SCALE;

        // UPDATE UI
        updateLevelIndicator(gameState.level);
        updateProgressBar(gameState.score, gameState.nextLevelThreshold, gameState.previousLevelThreshold);
        updateShieldIndicator(gameState.playerStats.shield);
        updateXPBarColor(gameState.playerStats.color);

        // START PAUSED
        gameState.gameActive = true;
        gameState.isPaused = true; // Use togglePause logic manually to ensure UI shows up

        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        levelUpScreen.classList.add('hidden');

        // Setup Player for "Resume"
        player.visible = true;
        player.x = CANVAS.width / 2;
        player.y = CANVAS.height / 2;

        gameState.isStarting = false; // Skip intro
        lastTime = 0;

        // Show Pause Menu
        document.getElementById('pause-menu').classList.remove('hidden');
        document.getElementById('ui-layer').style.filter = 'blur(5px)';
        if (typeof animateButton === 'function') animateButton(document.getElementById('resume-btn'));

        SpawnManager.spawnEnemies(); // Start spawning logic (it will check isPaused and wait)
        requestAnimationFrame(animate);
        return;
    }

    // --- NEW GAME (Original Logic) ---
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
    const xpContainer = document.getElementById('xp-container');
    if (xpContainer) xpContainer.style.display = '';

    // Reset other states
    gameState.timeWarpActive = false;
    gameState.timeWarpTimer = 0;
    gameState.hitstopTimer = 0;
    gameState.isDying = false;
    gameState.deathTimer = 0;
    gameState.hasRevivedThisRun = false;
    gameState.invulnerableTimer = 0;
    player.shattered = false;
    if (typeof enemySpatialGrid !== 'undefined') {
        enemySpatialGrid.clear();
    }

    gameState.playerStats = { ...DEFAULT_PLAYER_STATS };
    gameState.totalEnemiesKilled = 0;
    gameState.totalBossesKilled = 0;
    if (typeof QuestManager !== 'undefined' && QuestManager.onGameStart) {
        QuestManager.onGameStart();
    }
    player.radius = 20 * GAME_SCALE;
    updateLevelIndicator(1);
    updateProgressBar(0, 600);
    updateShieldIndicator(0);
    updateXPBarColor(gameState.playerStats.color); // Reset XP bar color
    if (window.BackgroundManager) BackgroundManager.init();
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

let reviveCountdownTimer = null;

function triggerReviveOffer() {
    gameState.isDying = false;
    gameState.isPaused = true;
    player.shattered = false;

    const modal = document.getElementById('revive-modal');
    if (!modal) {
        gameOver();
        return;
    }

    modal.classList.remove('hidden');

    const numEl = document.getElementById('revive-countdown-num');
    const barEl = document.getElementById('revive-timer-bar');
    if (numEl) numEl.innerText = '5';
    if (barEl) {
        barEl.style.strokeDashoffset = '0';
    }

    if (reviveCountdownTimer) clearInterval(reviveCountdownTimer);

    const startTime = Date.now();
    const duration = 5000;
    const circumference = 276.46; // 2 * PI * 44

    reviveCountdownTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, duration - elapsed);
        const seconds = Math.ceil(remaining / 1000);
        
        if (numEl) numEl.innerText = seconds.toString();
        if (barEl) {
            const progress = (duration - remaining) / duration;
            barEl.style.strokeDashoffset = (progress * circumference).toString();
        }

        if (remaining <= 0) {
            clearInterval(reviveCountdownTimer);
            reviveCountdownTimer = null;
            declineRevive();
        }
    }, 40);
}

function declineRevive() {
    if (reviveCountdownTimer) {
        clearInterval(reviveCountdownTimer);
        reviveCountdownTimer = null;
    }
    const modal = document.getElementById('revive-modal');
    if (modal) modal.classList.add('hidden');
    gameOver();
}

function executeReviveEMP() {
    if (reviveCountdownTimer) {
        clearInterval(reviveCountdownTimer);
        reviveCountdownTimer = null;
    }
    const modal = document.getElementById('revive-modal');
    if (modal) modal.classList.add('hidden');

    gameState.hasRevivedThisRun = true;
    gameState.isDying = false;
    gameState.isPaused = false;
    player.shattered = false;

    // Center player safely
    player.x = CANVAS.width / 2;
    player.y = CANVAS.height / 2;

    // Restore full shield
    const maxShield = gameState.playerStats.maxShield || 1;
    gameState.playerStats.shield = Math.max(1, maxShield);
    updateShieldIndicator(gameState.playerStats.shield);

    // 3 seconds invulnerability
    gameState.invulnerableTimer = 3000;

    // EMP Shockwave visual & screen shake
    gameState.screenShake = { duration: 800, intensity: 25, timer: 0 };
    if (typeof spawnShockwave === 'function') {
        spawnShockwave(player.x, player.y, '#00ffff');
        setTimeout(() => spawnShockwave(player.x, player.y, '#ffffff'), 150);
    }
    spawnParticles(player.x, player.y, 80, 8, '#00ffff');
    playSound('spark_long');
    playSound('levelup');

    // Destroy all active enemies and enemy projectiles
    const activeEnemies = enemyPool.getActive();
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
        const enemy = activeEnemies[i];
        spawnParticles(enemy.x, enemy.y, 12, 5, enemy.color || '#ff0055');
        enemyPool.release(enemy);
    }

    if (typeof bossShapePool !== 'undefined') {
        bossShapePool.releaseAll();
    }

    // Heavy EMP damage to active boss if any
    if (gameState.bossActive) {
        const activeBoss = (typeof boss !== 'undefined' && boss.active) ? boss :
            (typeof boss2 !== 'undefined' && boss2.active) ? boss2 :
            (typeof boss3 !== 'undefined' && boss3.active) ? boss3 :
            (typeof boss4 !== 'undefined' && boss4.active) ? boss4 :
            (typeof boss5 !== 'undefined' && boss5.active) ? boss5 : null;

        if (activeBoss) {
            if (typeof activeBoss.takeDamage === 'function') {
                activeBoss.takeDamage(600);
            } else if (activeBoss.hp) {
                activeBoss.hp -= 600;
            }
        }
    }

    lastTime = performance.now();
    gameState.animationId = requestAnimationFrame(animate);
}

function gameOver() {
    gameState.gameActive = false;
    gameState.isPaused = true;
    SaveManager.clearSave(); // Clear save on death

    // OPTIMIZATION: Clean up all intervals
    if (gameState.spawnInterval) clearInterval(gameState.spawnInterval);
    if (typeof SpawnManager !== 'undefined' && SpawnManager.clearAllIntervals) {
        SpawnManager.clearAllIntervals();
    }

    finalScoreEl.innerText = `${Localization.t('score')}: ${gameState.score} - ${Localization.t('level')}: ${gameState.level}`;
    window.lastGameScore = gameState.score;
    window.lastGameLevel = gameState.level;

    // --- QUEST TRACKING ---
    if (typeof QuestManager !== 'undefined') {
        QuestManager.onGameEnd(
            gameState.level,
            gameState.totalEnemiesKilled || 0,
            gameState.totalBossesKilled || 0,
            window.lastEarnedCoins || 0,
            (gameState.takenPerks || []).length
        );
    }

    // --- COIN REWARDS (Level-Only Formula) ---
    if (typeof CosmeticsManager !== 'undefined' && CosmeticsManager.calculateCoinsForLevel) {
        let earnedCoins = CosmeticsManager.calculateCoinsForLevel(gameState.level);

        // VIP Bonus Coins
        if (typeof PremiumStoreManager !== 'undefined') {
            earnedCoins += PremiumStoreManager.getVipBonusCoins();
        }

        CosmeticsManager.addCoins(earnedCoins);
        window.lastEarnedCoins = earnedCoins;
        window.hasDoubledCoinsThisGameOver = false;

        const coinDisplay = document.getElementById('game-over-coins');
        const coinAmountEl = document.getElementById('earned-coins-amount');
        const doubleCoinBtn = document.getElementById('double-coins-btn');
        if (coinDisplay && coinAmountEl) {
            coinDisplay.style.display = 'flex';
            coinAmountEl.innerText = `+${earnedCoins}`;
        }
        if (doubleCoinBtn) {
            doubleCoinBtn.style.display = earnedCoins > 0 ? 'inline-flex' : 'none';
            doubleCoinBtn.disabled = false;
            doubleCoinBtn.innerHTML = `<span>⚡</span> <span data-i18n="double_coins">${Localization.t('double_coins_btn') || '2X COINS (WATCH AD)'}</span>`;
        }
    }

    document.getElementById('submit-score-btn').style.display = 'inline-block';
    document.getElementById('submit-score-btn').disabled = false;
    document.getElementById('submit-score-btn').innerText = Localization.t('save_score');
    document.getElementById('player-name-input').style.display = 'inline-block';

    if (window.fetchLeaderboard) {
        window.fetchLeaderboard();
    }

    // --- INTERSTITIAL AD (every 3rd game, if not VIP) ---
    gameState.sessionGameCount++;
    const shouldShowInterstitial = (gameState.sessionGameCount >= 3) &&
        (gameState.sessionGameCount % 3 === 0) &&
        (typeof PremiumStoreManager === 'undefined' || PremiumStoreManager.shouldShowInterstitial());

    if (shouldShowInterstitial && typeof AdManager !== 'undefined' && AdManager.showInterstitialAd) {
        AdManager.showInterstitialAd(() => {
            // Show game over screen after interstitial
            gameOverScreen.classList.remove('hidden');
        });
    } else {
        gameOverScreen.classList.remove('hidden');
    }

    // NEW: Animate main buttons on show
    if (typeof animateButton === 'function') {
        animateButton(document.getElementById('submit-score-btn'));
        setTimeout(() => {
            animateButton(document.getElementById('game-over-armory-btn'));
            animateButton(document.getElementById('restart-btn'));
        }, 40);
    }
}



// PAUSE FUNCTIONALITY
function togglePause() {
    if (!gameState.gameActive) return; // Can't pause if game not active
    if (!levelUpScreen.classList.contains('hidden')) return; // Can't toggle pause during level up

    gameState.isPaused = !gameState.isPaused;

    if (gameState.isPaused) {
        document.getElementById('pause-menu').classList.remove('hidden');
        document.getElementById('ui-layer').style.filter = 'blur(5px)'; // Optional: Blur BG

        // NEW: Animate Resume button
        if (typeof animateButton === 'function') {
            animateButton(document.getElementById('resume-btn'));
        }
    } else {
        document.getElementById('pause-menu').classList.add('hidden');
        document.getElementById('ui-layer').style.filter = 'none';
        lastTime = 0; // Reset timer to prevent jump

        // Resume Music - Restart playback if music was enabled
        if (musicManager && musicManager.musicEnabled && !musicManager.isPlaying) {
            // Resume audio context first if it was suspended
            if (musicManager.audioCtx && musicManager.audioCtx.state === 'suspended') {
                musicManager.audioCtx.resume();
            }
            // Restart music playback
            musicManager.play();
        }

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

// WINDOW BLUR - AUTO PAUSE & SAVE (for web)
window.addEventListener('blur', () => {
    if (gameState.gameActive && !gameState.isPaused && !gameState.isDying) {
        togglePause();

        // Stop music completely (not just suspend audio context)
        if (musicManager) {
            const wasMusicEnabled = musicManager.musicEnabled;
            musicManager.stop();
            // Restore music enabled state so it can resume when unpaused
            musicManager.musicEnabled = wasMusicEnabled;
        }
    }
});

// CAPACITOR APP - AUTO PAUSE ON BACKGROUND (for mobile)
// Using global Capacitor API (loaded via CDN)
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    const CapApp = window.Capacitor.Plugins.App;

    // Listen for app going to background (pause event)
    CapApp.addListener('pause', () => {
        if (gameState.gameActive && !gameState.isPaused && !gameState.isDying) {
            togglePause();

            // Stop music completely (not just suspend audio context)
            if (musicManager) {
                const wasMusicEnabled = musicManager.musicEnabled;
                musicManager.stop();
                // Restore music enabled state so it can resume when unpaused
                musicManager.musicEnabled = wasMusicEnabled;
            }
        }
    });

    // Listen for app returning to foreground (resume event)
    // No need to auto-resume, user will click Resume button from pause menu
    CapApp.addListener('resume', () => {
        // Resume audio context if it was suspended
        // But keep the game paused until user clicks Resume
        if (musicManager && musicManager.audioCtx && musicManager.audioCtx.state === 'suspended') {
            // Only resume audio context if game is not paused
            // Audio will resume when user clicks Resume button via togglePause
        }
    });
}
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

// Screen Shake Toggle
document.getElementById('screenshake-toggle').addEventListener('change', (e) => {
    // Save preference to localStorage
    localStorage.setItem('screenShakeEnabled', e.target.checked);

    // If disabling, clear any active shake
    if (!e.target.checked && gameState.screenShake) {
        gameState.screenShake = null;
    }
});

// Load screen shake preference on start
const savedShakePref = localStorage.getItem('screenShakeEnabled');
if (savedShakePref !== null) {
    document.getElementById('screenshake-toggle').checked = savedShakePref === 'true';
}

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

// --- NEW: Initial Button Animations (Start Screen) ---
setTimeout(() => {
    if (typeof animateButton === 'function') {
        animateButton(document.getElementById('start-btn'));
        //wait 40ms
        setTimeout(() => {
            animateButton(document.getElementById('leaderboard-btn'));
        }, 40);
    }
}, 500);

// --- REWARDED ADS: Revive & Double Coins Listeners ---
const reviveAdBtn = document.getElementById('revive-ad-btn');
if (reviveAdBtn) {
    reviveAdBtn.addEventListener('click', () => {
        if (typeof AdManager !== 'undefined') {
            AdManager.showRewardedAd({
                rewardType: 'REVIVE',
                onSuccess: () => {
                    executeReviveEMP();
                },
                onDismiss: () => {
                    declineRevive();
                }
            });
        } else {
            executeReviveEMP();
        }
    });
}

const reviveSkipBtn = document.getElementById('revive-skip-btn');
if (reviveSkipBtn) {
    reviveSkipBtn.addEventListener('click', () => {
        declineRevive();
    });
}

const doubleCoinsBtn = document.getElementById('double-coins-btn');
if (doubleCoinsBtn) {
    doubleCoinsBtn.addEventListener('click', () => {
        if (window.hasDoubledCoinsThisGameOver || !window.lastEarnedCoins) return;
        if (typeof AdManager !== 'undefined') {
            AdManager.showRewardedAd({
                rewardType: 'DOUBLE_COINS',
                onSuccess: () => {
                    window.hasDoubledCoinsThisGameOver = true;
                    if (typeof CosmeticsManager !== 'undefined') {
                        CosmeticsManager.addCoins(window.lastEarnedCoins);
                    }
                    const coinAmountEl = document.getElementById('earned-coins-amount');
                    if (coinAmountEl) {
                        coinAmountEl.innerText = `+${window.lastEarnedCoins * 2} (2X BOOSTED!)`;
                    }
                    doubleCoinsBtn.disabled = true;
                    doubleCoinsBtn.innerText = Localization.t('coins_doubled') || 'COINS DOUBLED!';
                    playSound('levelup');
                }
            });
        }
    });
}
