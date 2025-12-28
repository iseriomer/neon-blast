
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
    killStreakTimer: 0
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

    profiler.start('clear-screen');
    CTX.fillStyle = 'rgba(5, 5, 5, 0.1)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
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
                        // Execute check
                        let damage = gameState.playerStats.laserDamage;
                        if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.2) {
                            damage = 999;
                            spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                        }
                        enemy.hp -= damage;

                        if (enemy.hp <= 0) {
                            handleEnemyDeath(enemy);
                        }
                    }
                }
            });

            // BOSS DAMAGE - LASER
            if (gameState.bossActive && BossManager.activeBoss && BossManager.activeBoss.active) {
                const boss = BossManager.activeBoss;
                const laserDx = laserEndX - player.x;
                const laserDy = laserEndY - player.y;
                const bossDx = boss.x - player.x;
                const bossDy = boss.y - player.y;

                const dotProduct = laserDx * bossDx + laserDy * bossDy;
                if (dotProduct > 0) {
                    const distToLine = Math.abs(
                        (laserEndY - player.y) * boss.x -
                        (laserEndX - player.x) * boss.y +
                        laserEndX * player.y - laserEndY * player.x
                    ) / Math.hypot(laserEndY - player.y, laserEndX - player.x);

                    const distToPlayer = Math.hypot(bossDx, bossDy);

                    if (distToLine < boss.radius + 10 && distToPlayer < 2000) {
                        boss.takeDamage(gameState.playerStats.laserDamage);
                        // Boss death handled in BossManager or Boss Update
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
                    boss.takeDamage(gameState.playerStats.orbitalDamage);
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
                boss.takeDamage(stats.auraDamage);
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
function initGame() {
    hideBar();
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

    // OPTIMIZATION: Clean up all intervals
    if (gameState.spawnInterval) clearInterval(gameState.spawnInterval);
    if (typeof SpawnManager !== 'undefined' && SpawnManager.clearAllIntervals) {
        SpawnManager.clearAllIntervals();
    }

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
    // NEW: Animate main buttons on show
    if (typeof animateButton === 'function') {
        animateButton(document.getElementById('submit-score-btn'));
        //wait 0.5 sec.
        setTimeout(() => {
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

        // Resume Audio
        if (musicManager && musicManager.audioCtx && musicManager.audioCtx.state === 'suspended') {
            musicManager.audioCtx.resume();
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

        // Suspend Audio immediately
        if (musicManager && musicManager.audioCtx) {
            musicManager.audioCtx.suspend();
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

            // Suspend Audio immediately
            if (musicManager && musicManager.audioCtx) {
                musicManager.audioCtx.suspend();
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
