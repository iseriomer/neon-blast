
// CollisionManager.js - Handles all collision detection

class CollisionManager {
    static init() {
        // Any setup if needed
    }

    static check() {
        profiler.start('collisions');

        const enemies = enemyPool.getActive();
        const projectiles = projectilePool.getActive();

        // Early exit: If no enemies AND no boss, nothing to collide with
        if (enemies.length === 0 && !gameState.bossActive) {
            gameState.activeHealerCount = 0;
            gameState.activeSpawnerCount = 0;
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
                // Check for Black Hole protection (if global variable exists)
                const isBlackHoleActive = typeof blackHole !== 'undefined' && blackHole !== null;

                if (gameState.playerStats.shield > 0 && !isBlackHoleActive) {
                    gameState.playerStats.shield--;
                    updateShieldIndicator(gameState.playerStats.shield);
                    CTX.fillStyle = 'rgba(0, 255, 255, 0.3)';
                    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
                    enemies.forEach(e => spawnParticles(e.x, e.y, 20, 5, '#00ffff'));
                    enemyPool.releaseAll();
                    playSound('levelup');
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
        // HEALER SYSTEM
        // ═══════════════════════════════════════════════════════
        profiler.start('healer-system');
        const healers = enemies.filter(e => e.type.name === 'Healer');
        gameState.activeHealerCount = healers.length;

        if (healers.length > 0) {
            for (const healer of healers) {
                const healRange = 350;
                const nearbyEnemies = enemySpatialGrid.query(healer.x, healer.y, healRange);

                for (const enemy of nearbyEnemies) {
                    if (enemy.id === healer.id) continue;

                    const distSq = (enemy.x - healer.x) ** 2 + (enemy.y - healer.y) ** 2;
                    if (distSq < healRange * healRange) {
                        // Draw Link (Visual connection)
                        const dist = Math.sqrt(distSq);

                        CTX.save();
                        CTX.beginPath();
                        CTX.moveTo(healer.x, healer.y);
                        CTX.lineTo(enemy.x, enemy.y);

                        // 1. Base Line (Constant weak connection)
                        CTX.strokeStyle = `rgba(255, 215, 0, ${0.15 * (1 - dist / healRange)})`; // Gold fade
                        CTX.lineWidth = 1;
                        CTX.stroke();

                        // 2. Flowing Energy (Animated Dash - The "Stream" effect)
                        // Negative offset makes it flow FROM healer TO enemy
                        const flowSpeed = performance.now() / 10;
                        CTX.setLineDash([15, 30]); // Segment, Gap
                        CTX.lineDashOffset = -flowSpeed;

                        CTX.lineWidth = 2;
                        CTX.strokeStyle = `rgba(255, 255, 100, ${0.6 * (1 - dist / healRange)})`; // Brighter gold
                        CTX.stroke();

                        CTX.setLineDash([]);
                        CTX.restore();

                        // Healing Logic
                        if (enemy.hp < enemy.maxHp) {
                            enemy.hp += 0.03;
                            if (enemy.hp > enemy.maxHp) enemy.hp = enemy.maxHp;

                            // Visual heal particles (sending energy)
                            if (Math.random() < 0.05) {
                                const ratio = Math.random();
                                const px = healer.x + (enemy.x - healer.x) * ratio;
                                const py = healer.y + (enemy.y - healer.y) * ratio;
                                spawnParticles(px, py, 1, 2, '#ffd700', 0.5);
                            }
                        }
                    }
                }
            }
        }
        profiler.end('healer-system');

        // ═══════════════════════════════════════════════════════
        // SPAWNER COUNTING (Limit Logic)
        // ═══════════════════════════════════════════════════════
        const spawners = enemies.filter(e => e.type.name === 'Spawner');
        gameState.activeSpawnerCount = spawners.length;

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
                if (typeof boss !== 'undefined' && boss.active && !projectileDestroyed) {
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
                if (typeof boss2 !== 'undefined' && boss2.active && !projectileDestroyed) {
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
                if (typeof boss3 !== 'undefined' && boss3.active && !projectileDestroyed) {
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
                    if (!projectileDestroyed && typeof bossShapePool !== 'undefined') {
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

                    // Shield Aura Check REMOVED

                    let damage = 1;
                    let isCritical = Math.random() < gameState.playerStats.critChance;

                    if (isCritical) {
                        damage *= gameState.playerStats.critMultiplier;
                        // Updated Critical Visuals
                        if (typeof spawnShockwave === 'function') spawnShockwave(enemy.x, enemy.y, '#ff00ff');
                        if (typeof spawnCritStars === 'function') spawnCritStars(enemy.x, enemy.y, '#ffffff');
                    }

                    if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.2) {
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
                            target.hp -= (gameState.playerStats.chainLightningDamage || 1);

                            if (typeof spawnChainLightning === 'function') spawnChainLightning(enemy.x, enemy.y, target.x, target.y);
                            spawnParticles(target.x, target.y, 5, 2, '#00ffff');

                            if (target.hp <= 0) {
                                CollisionManager.handleEnemyDeath(target);
                            }
                        }
                    }

                    if (enemy.hp <= 0) {
                        CollisionManager.handleEnemyDeath(enemy);
                    }

                    if (projectileDestroyed) break;
                }
            }
        }

        profiler.end('projectile-collision');
        profiler.end('collisions');
    }

    static handleEnemyDeath(enemy) {
        // Eğer zaten öldüyse veya havuzda değilse işlem yapma
        if ((enemy.hp > 0 && !enemyPool.active.includes(enemy)) || enemy.isDead) return;

        enemy.isDead = true;

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
            CollisionManager.createExplosion(enemy.x, enemy.y, gameState.playerStats.explosiveRadius, 7);
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
    static createExplosion(x, y, radius, damage) {
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
}

// Expose globals for backward compatibility if needed, or use CollisionManager.xxx
window.handleEnemyDeath = CollisionManager.handleEnemyDeath;
window.createExplosion = CollisionManager.createExplosion;
