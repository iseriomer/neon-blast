// game-OPTIMIZED.js - Heavily optimized version
// Key changes:
// 1. Spatial grid for collisions (O(n*m) -> O(n))
// 2. Batch rendering (400 draw calls -> 5)
// 3. Performance profiling
// 4. Projectile cap
// 5. Dynamic quality adjustment

let mines = [];
let lightnings = [];
let lastTime = 0; // Delta time için zaman takibi
let blackHole = null; // ← BUNU EKLE
// OPTIMIZATION: Projectile cap to prevent FPS death
const MAX_PROJECTILES = 250; // Cap at 250 for performance
const MAX_PARTICLES = 800; // ADD THIS - Prevent particle explosion
// Game State
const gameState = {
    animationId: null,
    score: 0,
    level: 1,
    nextLevelThreshold: 600,
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
    startTimer: 0
};

// Input State
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// Spawn Enemies
function spawnEnemies() {
    let spawnRate = 1000 - (gameState.difficultyMultiplier * 50);
    if (gameState.level >= 10) spawnRate = 1000 - (gameState.difficultyMultiplier * 100);
    if (gameState.level >= 20) spawnRate = 1000 - (gameState.difficultyMultiplier * 150);
    if (gameState.level >= 30) spawnRate = 1000 - (gameState.difficultyMultiplier * 200);
    if (spawnRate < 200) spawnRate = 200;

    gameState.spawnInterval = setInterval(() => {
        if (gameState.isPaused || !gameState.gameActive) return;

        let type = ENEMY_TYPES.BASIC;
        const rand = Math.random();

        if (gameState.difficultyMultiplier > 5 && rand < 0.12) type = ENEMY_TYPES.SHIELDER; // EKLE!
        else if (gameState.difficultyMultiplier > 4 && rand < 0.15) type = ENEMY_TYPES.SPAWNER;
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
    // --- BOSS 2 CHECK (YENİ) ---
    if (gameState.level === 29 && !gameState.bossActive) {
        startBossFight(2); // Boss ID 2
        return;
    }
    if (gameState.level === 44 && !gameState.bossActive) {
        startBossFight(3);
        return;
    }
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);
    playSound('levelup');
    showLevelUpAnimation();

    setTimeout(() => {
        // Filter perks
        let availablePerks = ALL_PERKS.filter(p => {
            if (p.id === 'energy_shield' && gameState.playerStats.shield >= gameState.playerStats.maxShields) return false;
            if (p.id === 'double_shot' && gameState.playerStats.shotCount >= MAX_SHOT_COUNT) return false;
            if (p.id === 'back_shot' && gameState.playerStats.backShot) return false;
            if (p.id === 'laser_beam' && gameState.playerStats.laserBeam) return false;
            if (p.id === 'singularity' && gameState.playerStats.singularity) return false;
            return true;
        });

        const shuffled = availablePerks.sort(() => 0.5 - Math.random());
        const selectedPerks = shuffled.slice(0, 3);

        perkListEl.innerHTML = '';
        selectedPerks.forEach(perk => {
            let displayDesc = perk.desc;

            // Dynamic Descriptions
            if (perk.id === 'orbitals') {
                displayDesc = `(Şu an: ${gameState.playerStats.orbitals} koruma) + 1 Yörünge Koruması ekler.`;
            } else if (perk.id === 'split_shot') {
                displayDesc = `(Şu an: ${gameState.playerStats.splitShotCount} parça) + 1 Parçaya Ayrılır.`;
            }

            const div = document.createElement('div');
            div.className = 'perk-card';
            div.innerHTML = `
                <div class="perk-title">${perk.title}</div>
                <div class="perk-desc">${displayDesc}</div>
            `;
            div.onclick = () => selectPerk(perk);
            perkListEl.appendChild(div);
        });

        levelUpScreen.classList.remove('hidden');
    }, 1200);
}

// Hitstop Function
window.triggerHitstop = function (duration) {
    gameState.hitstopTimer = duration;
}

// Boss Functions
function startBossFight(bossId = 1) {
    gameState.bossActive = true;
    gameState.level++; // 15 veya 30 olur

    // Boss tipine göre etiket
    let bossLabel = bossId === 2 ? "BOSS: NEXUS" : "BOSS: OMEGA";
    if (bossId === 3) bossLabel = "BOSS: ARCHITECT";
    updateLevelIndicator(bossLabel);

    clearInterval(gameState.spawnInterval);

    // Sahne temizliği
    enemyPool.getActive().forEach(e => {
        createExplosion(e.x, e.y, 50, 0);
        enemyPool.release(e);
    });

    if (bossId === 1) {
        boss.spawn(CANVAS.width / 2, -100);
    } else if (bossId === 2) {
        boss2.spawn(CANVAS.width / 2, -100); // Boss 2 Çağır
    } else if (bossId === 3) {
        boss3.spawn(CANVAS.width / 2, -100);
    }
}

function selectPerk(perk) {
    perk.apply(gameState.playerStats);
    gameState.level++;
    gameState.currentLevelStep = Math.floor(gameState.currentLevelStep * 1.1) + 200;
    gameState.nextLevelThreshold += gameState.currentLevelStep;
    gameState.difficultyMultiplier += 0.5;

    updateLevelIndicator(gameState.level);
    updateShieldIndicator(gameState.playerStats.shield);
    updateProgressBar(gameState.score, gameState.nextLevelThreshold);
    updateXPBarColor(gameState.playerStats.color);
    levelUpScreen.classList.add('hidden');
    gameState.isPaused = false;
    spawnEnemies();
    requestAnimationFrame(animate);
}

// OPTIMIZED: Collision Detection with Better Logic Flow
function checkCollisions() {
    profiler.start('collisions');

    const enemies = enemyPool.getActive();
    const projectiles = projectilePool.getActive();

    // Early exit: If no enemies AND no boss, nothing to collide with
    if (enemies.length === 0 && !gameState.bossActive) {
        profiler.end('collisions');
        return;
    }

    // Build spatial grid (only if we have enemies)
    if (enemies.length > 0) {
        profiler.start('spatial-grid-build');
        enemySpatialGrid.clear();
        for (const enemy of enemies) {
            enemySpatialGrid.insert(enemy);
        }
        profiler.end('spatial-grid-build');
    }

    // ═══════════════════════════════════════════════════════
    // PLAYER COLLISION (Always check, even with no projectiles)
    // ═══════════════════════════════════════════════════════
    profiler.start('player-collision');
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
                FX.glitch(0.5); // Major Glitch
                FX.shake(20);
                if (window.triggerHitstop) window.triggerHitstop(10);
                break;
            } else {
                startDeathSequence();
                profiler.end('player-collision');
                profiler.end('collisions');
                return;
            }
        }
    }
    profiler.end('player-collision');

    // ═══════════════════════════════════════════════════════
    // SHIELDER AURA SYSTEM (Only if we have Shielders)
    // ═══════════════════════════════════════════════════════
    profiler.start('shielder-aura');
    const shielders = enemies.filter(e => e.type.name === 'Shielder');

    if (shielders.length > 0) {
        // Reset all shield auras first
        enemies.forEach(e => e.shieldAura = false);

        for (const shielder of shielders) {
            const nearbyEnemies = enemySpatialGrid.query(shielder.x, shielder.y, 200);

            for (const enemy of nearbyEnemies) {
                if (enemy.id === shielder.id) continue;
                enemy.shieldAura = true;

                // Visual effect (every ~30 frames at 60fps)
                if (Math.random() < 0.05) {
                    const angle = Math.atan2(enemy.y - shielder.y, enemy.x - shielder.x);
                    const midX = shielder.x + Math.cos(angle) * 100;
                    const midY = shielder.y + Math.sin(angle) * 100;
                    spawnParticles(midX, midY, 1, 2, '#64c8ff', 0.5);
                }
            }
        }
    }
    profiler.end('shielder-aura');

    // ═══════════════════════════════════════════════════════
    // PROJECTILE COLLISION (Only if we have projectiles)
    // ═══════════════════════════════════════════════════════
    if (projectiles.length === 0) {
        profiler.end('collisions');
        return;
    }

    profiler.start('projectile-collision');

    for (let j = projectiles.length - 1; j >= 0; j--) {
        const projectile = projectiles[j];
        let projectileDestroyed = false;

        // ─────────────────────────────────────────────────────
        // BOSS COLLISION CHECKS
        // ─────────────────────────────────────────────────────
        if (gameState.bossActive) {
            // Boss 1
            if (boss.active && !projectileDestroyed) {
                const dx = projectile.x - boss.x;
                const dy = projectile.y - boss.y;
                const distSq = dx * dx + dy * dy; // Avoid sqrt for performance
                const minDist = boss.radius + projectile.radius;

                if (distSq < minDist * minDist) {
                    let damage = 20;
                    if (projectile.isSplit) damage = 10;
                    if (gameState.playerStats.sniper) damage *= 2;

                    boss.takeDamage(damage);
                    spawnParticles(projectile.x, projectile.y, 5, 3, '#8a2be2');
                    playSound('hit');
                    projectilePool.release(projectile);
                    projectileDestroyed = true;
                }
            }

            // Boss 2
            if (boss2.active && !projectileDestroyed) {
                const dx = projectile.x - boss2.x;
                const dy = projectile.y - boss2.y;
                const distSq = dx * dx + dy * dy;
                const minDist = boss2.radius + projectile.radius;

                if (distSq < minDist * minDist) {
                    let damage = 20;
                    if (projectile.isSplit) damage = 10;
                    if (gameState.playerStats.sniper) damage *= 2;

                    boss2.takeDamage(damage);
                    spawnParticles(projectile.x, projectile.y, 5, 3, '#00ffff');
                    playSound('hit');
                    projectilePool.release(projectile);
                    projectileDestroyed = true;
                }
            }

            // Boss 3
            if (boss3.active && !projectileDestroyed) {
                const dx = projectile.x - boss3.x;
                const dy = projectile.y - boss3.y;
                const distSq = dx * dx + dy * dy;
                const minDist = boss3.radius + projectile.radius;

                if (distSq < minDist * minDist) {
                    let damage = 20;
                    if (projectile.isSplit) damage = 10;
                    if (gameState.playerStats.sniper) damage *= 2;

                    boss3.takeDamage(damage);
                    spawnParticles(projectile.x, projectile.y, 5, 3, '#00ff88');
                    playSound('hit');
                    projectilePool.release(projectile);
                    projectileDestroyed = true;
                }

                // Boss 3 shapes
                if (!projectileDestroyed) {
                    const activeShapes = bossShapePool.getActive();
                    for (let s = activeShapes.length - 1; s >= 0; s--) {
                        const shape = activeShapes[s];
                        if (shape.hp === undefined || shape.hp <= 0) continue;

                        const shapeDx = projectile.x - shape.x;
                        const shapeDy = projectile.y - shape.y;
                        const shapeDistSq = shapeDx * shapeDx + shapeDy * shapeDy;
                        const shapeMinDist = shape.size / 2 + projectile.radius;

                        if (shapeDistSq < shapeMinDist * shapeMinDist) {
                            let shapeDamage = 1;
                            if (gameState.playerStats.sniper) shapeDamage = 2;

                            shape.hp -= shapeDamage;
                            spawnParticles(shape.x, shape.y, 3, 2, '#00ff88');
                            playSound('hit');

                            projectile.penetration--;
                            if (projectile.penetration <= 0) {
                                projectilePool.release(projectile);
                                projectileDestroyed = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if (projectileDestroyed) continue;

        // ─────────────────────────────────────────────────────
        // ENEMY COLLISION (Use spatial grid)
        // ─────────────────────────────────────────────────────
        const nearbyEnemies = enemySpatialGrid.getNearby(projectile);

        for (const enemy of nearbyEnemies) {
            if (projectile.hitList.includes(enemy.id)) continue;

            const dx = projectile.x - enemy.x;
            const dy = projectile.y - enemy.y;
            const distSq = dx * dx + dy * dy;
            const minDist = enemy.radius + projectile.radius;

            if (distSq < minDist * minDist) {
                projectile.hitList.push(enemy.id);
                projectile.penetration--;

                // Shield Aura Check
                if (enemy.shieldAura && enemy.type.name !== 'Shielder') {
                    projectile.penetration -= 0.5;
                    spawnParticles(projectile.x, projectile.y, 5, 2, '#64c8ff', 2);
                    enemy.shieldAura = false;
                    enemy.hp -= 0.5;
                }

                let damage = 1;
                if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.3) {
                    damage = 999;
                    spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                }
                enemy.hp -= damage;

                if (gameState.playerStats.knockback > 0) {
                    // Knockback her zaman oyuncudan uzağa doğru
                    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(angle) * gameState.playerStats.knockback;
                    enemy.y += Math.sin(angle) * gameState.playerStats.knockback;
                }

                if (gameState.playerStats.freeze > 0) {
                    enemy.freezeTimer = gameState.playerStats.freeze;
                }

                playSound('hit');

                const particleCount = Math.min(enemy.radius * 0.3, 10);
                spawnParticles(projectile.x, projectile.y, particleCount, 3, enemy.color);
                // Occasional spark on hit
                if (Math.random() < 0.3) spawnParticles(projectile.x, projectile.y, 2, 2, '#fff', 2, 'spark');

                if (gameState.playerStats.clusterCount > 0 && !projectile.isSplit) {
                    for (let c = 0; c < gameState.playerStats.clusterCount; c++) {
                        spawnClusterMine(projectile.x, projectile.y);
                    }
                }

                if (gameState.playerStats.splitShotCount > 0 && !projectile.isSplit) {
                    const splitCount = gameState.playerStats.splitShotCount + 1;
                    for (let s = 0; s < splitCount; s++) {
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
                    projectileDestroyed = true;
                }

                if (gameState.playerStats.chainLightning > 0) {
                    const lightningRange = Math.min(400, CANVAS.width * 0.4);
                    const potentialTargets = enemySpatialGrid.query(enemy.x, enemy.y, lightningRange);

                    let chainTargets = [];
                    for (const t of potentialTargets) {
                        if (t.id !== enemy.id && t.hp > 0) {
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
                        target.hp -= 3;

                        spawnChainLightning(enemy.x, enemy.y, target.x, target.y);
                        spawnParticles(target.x, target.y, 5, 2, '#00ffff');

                        if (target.hp <= 0) {
                            handleEnemyDeath(target);
                        }
                    }
                }

                if (enemy.hp <= 0) {
                    handleEnemyDeath(enemy);
                }

                if (projectileDestroyed) break;
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

        if (gameState.bossActive) boss.draw();

        drawPlayer(gameState.playerStats, gameState.lastShotTime);
        RenderOptimizer.drawParticlesBatched(particlePool.getActive());
        updateAndDrawMines(0); // dt = 0
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
        if (gameState.bossActive) boss.draw();

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
    gameState.animationId = requestAnimationFrame(animate);

    updateFPS();

    // OPTIMIZATION: Auto-adjust quality based on object count
    profiler.start('quality-adjust');
    RenderOptimizer.autoAdjustQuality();
    profiler.end('quality-adjust');

    // --- VISUAL EFFECTS UPDATE ---
    FX.update(dt);

    // Clear Screen (handled by FX.process but we need base black)
    profiler.start('clear-screen');
    CTX.fillStyle = '#050505'; // Deep black for neon contrast
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    // Background (if any)
    if (BackgroundManager) BackgroundManager.updateAndDraw(dt);

    profiler.end('clear-screen');

    // SHAKE APPLY
    FX.applyShake(CTX);

    // BOSS 1 UPDATE
    if (gameState.bossActive && boss.active) {
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
                startDeathSequence();
            }
        }
    }
    // --- BOSS 2 UPDATE & DRAW (YENİ) ---
    if (gameState.bossActive && boss2.active) {
        boss2.update(player, dt);
        boss2.draw();

        // Boss 2 Fiziksel Çarpışma
        const dist = Math.hypot(boss2.x - player.x, boss2.y - player.y);
        if (dist < boss2.radius + player.radius) {
            if (gameState.playerStats.shield > 0) {
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);
                // Oyuncuyu it (Çok sert it çünkü bu boss tehlikeli)
                const angle = Math.atan2(player.y - boss2.y, player.x - boss2.x);
                player.x += Math.cos(angle) * 300;
                player.y += Math.sin(angle) * 300;
            } else {
                startDeathSequence();
            }
        }
    }
    // --- BOSS 3 UPDATE & DRAW ---
    if (gameState.bossActive && boss3.active) {
        boss3.update(player, dt);
        boss3.draw();

        const dist = Math.hypot(boss3.x - player.x, boss3.y - player.y);
        if (dist < boss3.radius + player.radius) {
            if (gameState.playerStats.shield > 0) {
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);
                const angle = Math.atan2(player.y - boss3.y, player.x - boss3.x);
                player.x += Math.cos(angle) * 250;
                player.y += Math.sin(angle) * 250;
            } else {
                startDeathSequence();
            }
        }
    }

    profiler.start('draw-player');
    drawPlayer(gameState.playerStats, gameState.lastShotTime);
    profiler.end('draw-player');

    // Laser Beam
    if (gameState.playerStats.laserBeam) {
        profiler.start('laser');
        // Otomatik saat yönünde dönme (Speed: 1 rad/s)
        const angle = Date.now() / 1000;
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
                    handleEnemyDeath(enemy);
                }
            }
        });
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
    if (blackHole) {
        updateAndDrawBlackHole(dt);
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

    profiler.start('update-mines');
    updateAndDrawMines(dt);
    profiler.end('update-mines');

    profiler.start('update-lightnings');
    updateAndDrawLightnings(dt);
    profiler.end('update-lightnings');

    profiler.start('update-projectiles');
    projectilePool.update(projectile => {
        return projectile.update(enemyPool.getActive(), gameState.playerStats, dt, enemySpatialGrid);
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

    // RESTORE SHAKE & POST PROCESS
    FX.restoreShake(CTX);

    profiler.start('post-process');
    FX.process(CTX, CANVAS.width, CANVAS.height);
    profiler.end('post-process');

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
    // Yeni:
    gameState.singularityTimer = 0;
    blackHole = null;
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

    lastTime = 0;

    // START ANIMATION SETUP
    gameState.isStarting = true;
    gameState.startTimer = 0;
    player.visible = false; // Player başta görünmez
    player.x = CANVAS.width / 2;
    player.y = CANVAS.height / 2;

    // INIT FX
    FX.init(CANVAS.width, CANVAS.height);

    requestAnimationFrame(animate);
}

// Death Sequence
function startDeathSequence() {
    if (gameState.isDying || !gameState.gameActive) return;

    gameState.isDying = true;
    gameState.deathTimer = 0;
    playSound('hit');
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

    // RESIZE FX
    FX.resize(CANVAS.width, CANVAS.height);
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

    // JUICE: Shake & Sparks
    FX.shake(radius / 20); // 100 radius -> 5 shake
    spawnParticles(x, y, Math.min(radius / 3, 20), 4, '#ff4400', 3, 'smoke');
    spawnParticles(x, y, 12, 5, '#ffee00', 4, 'spark'); // Sparks!

    // Şok dalgası efekti

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
// ===========================
// SINGULARITY (KARA DELİK) SİSTEMİ
// ===========================
// ===========================
// SINGULARITY (KARA DELİK) SİSTEMİ
// ===========================
function spawnBlackHole() {
    const centerX = CANVAS.width / 2;
    const centerY = CANVAS.height / 2;

    blackHole = {
        x: centerX,
        y: centerY,
        radius: 10,
        targetRadius: 180, // Biraz daha büyük hedef yarıçap
        pullRadius: 900,
        life: 300,
        maxLife: 300,
        rotation: 0,
        particles: [],
        diskElements: []
    };

    // Accretion Disk (Birikim Diski) için detaylar oluştur
    // Bu disk parçaları sürekli dönecek
    const colors = ['#8a2be2', '#4b0082', '#00ffff', '#ff00ff', '#ffffff'];
    for (let i = 0; i < 120; i++) {
        const distBase = 1.1 + Math.random() * 1.5; // Yarıçap çarpanı
        blackHole.diskElements.push({
            angle: Math.random() * Math.PI * 2,
            dist: distBase,
            speed: (3 / distBase) * 0.05 * (Math.random() < 0.5 ? 1 : 0.9), // İç kısımlar daha hızlı döner
            size: Math.random() * 0.2 + 0.05, // Ark uzunluğu (radyan)
            thickness: Math.random() * 3 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.5 + 0.2
        });
    }

    playSound('levelup');
    createExplosion(centerX, centerY, 150, 0);
}

function updateAndDrawBlackHole(dt) {
    if (!blackHole) return;

    blackHole.life -= dt;
    // Olay ufku dönüşü
    blackHole.rotation += 1.5 * dt;

    // Radius Animasyonu (Ease Out Elastic benzeri bir etki ile açılış)
    const lifeRatio = blackHole.life / blackHole.maxLife;
    let currentRadius = blackHole.targetRadius;

    if (lifeRatio > 0.9) {
        // Açılış
        const t = (1 - lifeRatio) * 10; // 0 -> 1
        currentRadius = blackHole.targetRadius * Math.sin(t * Math.PI / 2);
    } else if (lifeRatio < 0.1) {
        // Kapanış - Hızlıca küçül
        const t = lifeRatio * 10; // 1 -> 0
        currentRadius = blackHole.targetRadius * t;
    }

    // Nefes alma efekti (Pulse)
    const pulse = 1 + Math.sin(Date.now() / 150) * 0.05;
    const visualRadius = currentRadius * pulse;

    blackHole.radius = visualRadius; // Mantıksal yarıçapı da güncelle (çekim için)

    // Ölüm
    if (blackHole.life <= 0) {
        createExplosion(blackHole.x, blackHole.y, 500, 50);
        spawnParticles(blackHole.x, blackHole.y, 150, 20, '#9400d3', 10);

        // Şok dalgası efekti (Screen Flash)
        CTX.fillStyle = 'rgba(255, 255, 255, 0.8)';
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        playSound('hit');
        blackHole = null;
        return;
    }

    // ────────────────────────────────────────────────────────────────
    // FİZİK & MANTIK (Çekim Gücü)
    // ────────────────────────────────────────────────────────────────
    const enemies = enemyPool.getActive();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.type.name.includes("Boss")) continue; // Bossları çekmesin

        const dx = blackHole.x - enemy.x;
        const dy = blackHole.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < blackHole.pullRadius) {
            // Çekim gücü
            const pullFactor = (1 - dist / blackHole.pullRadius);
            const force = pullFactor * pullFactor * 25 * dt; // Üstel artış kuvvetli çekim

            const angle = Math.atan2(dy, dx);

            // Spiral Hareketi: Hem merkeze çek, hem döndür
            // Tangential velocity (Teğetsel hız)
            const spinForce = force * 0.8;

            enemy.x += Math.cos(angle) * force;
            enemy.y += Math.sin(angle) * force;
            enemy.x += Math.cos(angle + Math.PI / 2) * spinForce;
            enemy.y += Math.sin(angle + Math.PI / 2) * spinForce;

            // Spaghettification (Görsel deformasyon partikülleri)
            if (Math.random() < 0.3 * pullFactor) {
                // Düşmandan merkeze doğru çizgi partiküller
                blackHole.particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 15,
                    color: enemy.color,
                    width: enemy.radius / 2
                });
            }

            // Olay Ufku Hasarı
            if (dist < visualRadius) {
                enemy.hp -= 5 * dt; // Saniyede ~300 hasar
                if (enemy.hp <= 0) handleEnemyDeath(enemy);
            }
        }
    }

    // ────────────────────────────────────────────────────────────────
    // ÇİZİM (RENDER) - Katman Katman
    // ────────────────────────────────────────────────────────────────
    CTX.save();
    CTX.translate(blackHole.x, blackHole.y);

    // 1. UZAY BÜKÜLMESİ (Dark Halo)
    // Etrafı karartarak kontrast yaratır
    const darkHalo = CTX.createRadialGradient(0, 0, visualRadius, 0, 0, visualRadius * 6);
    darkHalo.addColorStop(0, 'rgba(0,0,0,1)');
    darkHalo.addColorStop(0.4, 'rgba(0,0,0,0.8)');
    darkHalo.addColorStop(1, 'rgba(0,0,0,0)');

    CTX.globalCompositeOperation = 'source-over';
    CTX.beginPath();
    CTX.arc(0, 0, visualRadius * 6, 0, Math.PI * 2);
    CTX.fillStyle = darkHalo;
    CTX.fill();

    // 2. ACCRETION DISK (Birikim Diski) - PARLAK GAZLAR
    // Additive blending ile parlak neon efekti
    CTX.globalCompositeOperation = 'lighter';

    // Arka plan disk parlaması
    const glow = CTX.createRadialGradient(0, 0, visualRadius, 0, 0, visualRadius * 3);
    glow.addColorStop(0, 'rgba(75, 0, 130, 0)');
    glow.addColorStop(0.2, 'rgba(138, 43, 226, 0.4)'); // BlueViolet
    glow.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)'); // Cyan
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    CTX.beginPath();
    CTX.arc(0, 0, visualRadius * 3, 0, Math.PI * 2);
    CTX.fillStyle = glow;
    CTX.fill();

    // Dönen Disk Parçacıkları (Swirling Gas)
    blackHole.diskElements.forEach(el => {
        el.angle += el.speed * dt;
        const r = visualRadius * el.dist;

        CTX.beginPath();
        CTX.arc(0, 0, r, el.angle, el.angle + el.size);
        CTX.strokeStyle = el.color;
        CTX.lineWidth = el.thickness;
        CTX.globalAlpha = el.alpha;
        CTX.stroke();
    });

    // 3. PHOTON RING (Foton Halkası)
    // Olay ufkunun hemen dışındaki aşırı parlak ince halka
    CTX.beginPath();
    CTX.arc(0, 0, visualRadius * 1.05, 0, Math.PI * 2);
    CTX.strokeStyle = '#ffffff';
    CTX.lineWidth = 3;
    CTX.shadowBlur = 20;
    CTX.shadowColor = '#00ffff';
    CTX.globalAlpha = 1;
    CTX.stroke();
    CTX.shadowBlur = 0; // Reset

    // 4. EVENT HORIZON (Olay Ufku) - Mutlak Siyah
    CTX.globalCompositeOperation = 'source-over';
    CTX.beginPath();
    CTX.arc(0, 0, visualRadius, 0, Math.PI * 2);
    CTX.fillStyle = '#000000';
    CTX.fill();

    // İç kenar parlaması (Void hissi vermek için)
    CTX.strokeStyle = '#4b0082'; // Indigo
    CTX.lineWidth = 1;
    CTX.stroke();

    CTX.restore();

    // 5. YUTULAN MADDELER (Particles)
    // Merkeze çekilen çizgiler
    CTX.globalCompositeOperation = 'lighter';
    for (let i = blackHole.particles.length - 1; i >= 0; i--) {
        const p = blackHole.particles[i];

        // Hareketi güncelle
        const dx = blackHole.x - p.x;
        const dy = blackHole.y - p.y;
        const dist = Math.hypot(dx, dy);

        // Hızlanarak merkeze git
        p.x += (dx / dist) * 20 * dt;
        p.y += (dy / dist) * 20 * dt;
        p.life -= dt;

        if (p.life <= 0 || dist < 10) {
            blackHole.particles.splice(i, 1);
            continue;
        }

        // Çizim (Uzayan kuyruklu yıldız gibi)
        const tailLength = Math.min(dist, 40);
        const angle = Math.atan2(dy, dx);

        CTX.beginPath();
        CTX.moveTo(p.x, p.y);
        CTX.lineTo(p.x - Math.cos(angle) * tailLength, p.y - Math.sin(angle) * tailLength);
        CTX.strokeStyle = p.color;
        CTX.lineWidth = Math.max(1, p.width * (p.life / 15));
        CTX.globalAlpha = p.life / 15;
        CTX.stroke();
    }

    CTX.globalCompositeOperation = 'source-over';
    CTX.globalAlpha = 1;
}
document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);