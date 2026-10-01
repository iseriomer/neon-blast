
// CollisionManager.js - Handles all collision detection
// REFACTORED: Modular, maintainable, DRY code

class CollisionManager {
    // ═══════════════════════════════════════════════════════════════════
    // BOSS REGISTRY - All bosses register here for automatic collision
    // ═══════════════════════════════════════════════════════════════════
    static bossRegistry = [];

    static registerBoss(boss) {
        if (!this.bossRegistry.includes(boss)) {
            this.bossRegistry.push(boss);
        }
    }

    static unregisterBoss(boss) {
        const index = this.bossRegistry.indexOf(boss);
        if (index > -1) {
            this.bossRegistry.splice(index, 1);
        }
    }

    static clearBossRegistry() {
        this.bossRegistry = [];
    }

    static init() {
        // Any setup if needed
    }

    // ═══════════════════════════════════════════════════════════════════
    // MAIN CHECK - Now just coordinates smaller methods
    // ═══════════════════════════════════════════════════════════════════
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
            this.buildSpatialGrid(enemies);
        }

        // Player collision
        if (this.checkPlayerCollisions(enemies)) {
            profiler.end('collisions');
            return; // Player died, stop processing
        }

        // Healer system
        this.updateHealerSystem(enemies);

        // Spawner counting
        gameState.activeSpawnerCount = enemies.filter(e => e.type.name === 'Spawner').length;

        // Projectile collisions
        if (projectiles.length > 0) {
            this.checkProjectileCollisions(projectiles, enemies);
        }

        profiler.end('collisions');
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPATIAL GRID
    // ═══════════════════════════════════════════════════════════════════
    static buildSpatialGrid(enemies) {
        profiler.start('spatial-grid-build');
        enemySpatialGrid.clear();
        for (const enemy of enemies) {
            enemySpatialGrid.insert(enemy);
        }
        profiler.end('spatial-grid-build');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PLAYER COLLISION
    // ═══════════════════════════════════════════════════════════════════
    static checkPlayerCollisions(enemies) {
        profiler.start('player-collision');

        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);

            if (distPlayer - enemy.radius - player.radius < 1) {
                if (gameState.godMode || (gameState.invulnerableTimer && gameState.invulnerableTimer > 0)) {
                    enemyPool.release(enemy);
                    spawnParticles(enemy.x, enemy.y, 10, 5, enemy.color);
                    continue;
                }

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
                    profiler.end('player-collision');
                    return false;
                } else {
                    startDeathSequence();
                    profiler.end('player-collision');
                    return true; // Player died
                }
            }
        }

        profiler.end('player-collision');
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HEALER SYSTEM
    // ═══════════════════════════════════════════════════════════════════
    static updateHealerSystem(enemies) {
        profiler.start('healer-system');

        const healers = enemies.filter(e => e.type.name === 'Healer');
        gameState.activeHealerCount = healers.length;

        if (healers.length === 0) {
            profiler.end('healer-system');
            return;
        }

        const healRange = 350;

        for (const healer of healers) {
            const nearbyEnemies = enemySpatialGrid.query(healer.x, healer.y, healRange);

            for (const enemy of nearbyEnemies) {
                if (enemy.id === healer.id) continue;
                // Healerlar birbirlerine heal basmasın
                if (enemy.type.name === 'Healer') continue;

                const distSq = (enemy.x - healer.x) ** 2 + (enemy.y - healer.y) ** 2;
                if (distSq >= healRange * healRange) continue;

                const dist = Math.sqrt(distSq);
                this.drawHealerLink(healer, enemy, dist, healRange);
                this.applyHealing(healer, enemy, dist, healRange);
            }
        }

        profiler.end('healer-system');
    }

    static drawHealerLink(healer, enemy, dist, healRange) {
        CTX.save();
        CTX.beginPath();
        CTX.moveTo(healer.x, healer.y);
        CTX.lineTo(enemy.x, enemy.y);

        // Base Line
        CTX.strokeStyle = `rgba(255, 215, 0, ${0.15 * (1 - dist / healRange)})`;
        CTX.lineWidth = 1;
        CTX.stroke();

        // Flowing Energy
        const flowSpeed = performance.now() / 10;
        CTX.setLineDash([15, 30]);
        CTX.lineDashOffset = -flowSpeed;
        CTX.lineWidth = 2;
        CTX.strokeStyle = `rgba(255, 255, 100, ${0.6 * (1 - dist / healRange)})`;
        CTX.stroke();

        CTX.setLineDash([]);
        CTX.restore();
    }

    static applyHealing(healer, enemy, dist, healRange) {
        if (enemy.hp >= enemy.maxHp) return;

        enemy.hp += 0.03;
        if (enemy.hp > enemy.maxHp) enemy.hp = enemy.maxHp;

        // Visual heal particles
        if (Math.random() < 0.05) {
            const ratio = Math.random();
            const px = healer.x + (enemy.x - healer.x) * ratio;
            const py = healer.y + (enemy.y - healer.y) * ratio;
            spawnParticles(px, py, 1, 2, '#ffd700', 0.5);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PROJECTILE COLLISIONS
    // ═══════════════════════════════════════════════════════════════════
    static checkProjectileCollisions(projectiles, enemies) {
        profiler.start('projectile-collision');

        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];
            let destroyed = false;

            // Boss collisions (using registry)
            if (gameState.bossActive) {
                destroyed = this.checkBossCollisions(projectile);
            }

            // Enemy collisions
            if (!destroyed) {
                this.checkEnemyCollisions(projectile);
            }
        }

        profiler.end('projectile-collision');
    }

    // ═══════════════════════════════════════════════════════════════════
    // BOSS COLLISION - Uses registry for all bosses
    // ═══════════════════════════════════════════════════════════════════
    static checkBossCollisions(projectile) {
        // Priority 1: Check active boss from BossManager (covers Minibosses & active bosses directly)
        if (typeof BossManager !== 'undefined' && BossManager.activeBoss && BossManager.activeBoss.active) {
            const boss = BossManager.activeBoss;
            const color = boss.getPhaseColor ? boss.getPhaseColor() : (boss.color || '#ffffff');

            if (boss.isSplit && this.checkBoss4SplitCores && this.checkBoss4SplitCores(projectile, boss)) {
                return true;
            }

            if (this.checkSingleBossHit(projectile, boss, color)) {
                return true;
            }

            if (boss.hasEntities && typeof omegaPool !== 'undefined') {
                if (this.checkOmegaEntities(projectile)) return true;
            }
            if (boss.splitCores && this.checkBoss4SplitCores && this.checkBoss4SplitCores(projectile, boss)) {
                return true;
            }
            if (boss.clockMinions && this.checkClockMinions && this.checkClockMinions(projectile, boss)) {
                return true;
            }
            if (boss.galaxyArms && this.checkGalaxyArms && this.checkGalaxyArms(projectile, boss)) {
                return true;
            }
            if (boss.neuralNodes && this.checkNeuralNodes && this.checkNeuralNodes(projectile, boss)) {
                return true;
            }
        }

        // First check legacy global bosses (backward compatibility)
        const legacyBosses = [
            { ref: 'boss', color: '#8a2be2' },
            { ref: 'boss2', color: '#00ffff' },
            { ref: 'boss3', color: '#00ff88', hasEntities: true },
            { ref: 'boss4', color: '#00ff88', hasSplitCores: true },
            { ref: 'boss5', color: null, hasClockMinions: true }, // color from getPhaseColor()
            { ref: 'boss6', color: null, hasVoidOrbitals: true }, // VOID REAPER - color from getPhaseColor()
            { ref: 'boss7', color: null }, // THE SINGULARITY - color from getPhaseColor()
            { ref: 'boss8', color: null, hasGalaxyArms: true }, // THE GALAXY DEVOURER - color from getPhaseColor()
            { ref: 'boss9', color: null, hasNeuralNodes: true } // THE NEURAL NEXUS - color from getPhaseColor()
        ];

        for (const bossInfo of legacyBosses) {
            const boss = window[bossInfo.ref];
            if (!boss || !boss.active) continue;

            const color = bossInfo.color || (boss.getPhaseColor ? boss.getPhaseColor() : '#ffffff');

            // Special case: Boss4 split mode
            if (bossInfo.ref === 'boss4' && boss.isSplit) {
                if (this.checkBoss4SplitCores(projectile, boss)) return true;
                continue;
            }

            // Main boss hit
            if (this.checkSingleBossHit(projectile, boss, color)) {
                return true;
            }

            // Boss3 entities (OmegaPool)
            if (bossInfo.hasEntities && typeof omegaPool !== 'undefined') {
                if (this.checkOmegaEntities(projectile)) return true;
            }

            // Boss4 split cores
            if (bossInfo.hasSplitCores && boss.splitCores) {
                if (this.checkBoss4SplitCores(projectile, boss)) return true;
            }

            // Boss5 clock minions
            if (bossInfo.hasClockMinions && boss.clockMinions) {
                if (this.checkClockMinions(projectile, boss)) return true;
            }

            // Boss8 galaxy arms
            if (bossInfo.hasGalaxyArms && boss.galaxyArms) {
                if (this.checkGalaxyArms(projectile, boss)) return true;
            }

            // Boss9 neural nodes
            if (bossInfo.hasNeuralNodes && boss.neuralNodes) {
                if (this.checkNeuralNodes(projectile, boss)) return true;
            }
        }

        // Check registered bosses (for future extensibility)
        for (const boss of this.bossRegistry) {
            if (!boss.active) continue;
            const color = boss.getPhaseColor ? boss.getPhaseColor() : (boss.color || '#ffffff');
            if (this.checkSingleBossHit(projectile, boss, color)) {
                return true;
            }
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Calculate projectile damage
    // ═══════════════════════════════════════════════════════════════════
    static calculateProjectileDamage(projectile) {
        let damage = projectile.damageMultiplier || 1;
        if (projectile.isSplit) damage *= 0.5;
        if (gameState.playerStats.sniper) damage *= 2;
        return damage;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Single boss hit check
    // ═══════════════════════════════════════════════════════════════════
    static checkSingleBossHit(projectile, boss, particleColor) {
        const dx = projectile.x - boss.x;
        const dy = projectile.y - boss.y;
        const distSq = dx * dx + dy * dy;
        const minDist = boss.radius + projectile.radius;

        if (distSq < minDist * minDist) {
            let damage = this.calculateProjectileDamage(projectile) * (projectile.bossDamageMultiplier || 1);
            boss.takeDamage(damage);
            const particleCount = (typeof MOBILE_MODE !== 'undefined' && MOBILE_MODE) ? 2 : 5;
            spawnParticles(projectile.x, projectile.y, particleCount, 3, particleColor);
            playSound('hit');
            projectilePool.release(projectile);
            return true;
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Omega entities (Boss3)
    // ═══════════════════════════════════════════════════════════════════
    static checkOmegaEntities(projectile) {
        const activeEntities = omegaPool.getActive();

        for (let eIdx = activeEntities.length - 1; eIdx >= 0; eIdx--) {
            const entity = activeEntities[eIdx];
            if (entity.hp <= 0 || !entity.active) continue;

            const dx = projectile.x - entity.x;
            const dy = projectile.y - entity.y;
            const distSq = dx * dx + dy * dy;
            const minDist = entity.radius + projectile.radius;

            if (distSq < minDist * minDist) {
                let dmg = gameState.playerStats.sniper ? 2 : 1;
                entity.hp -= dmg;
                spawnParticles(entity.x, entity.y, 3, 2, entity.color);
                playSound('hit');

                projectile.penetration--;
                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                    return true;
                }
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Boss4 split cores
    // ═══════════════════════════════════════════════════════════════════
    static checkBoss4SplitCores(projectile, boss4) {
        if (!boss4.splitCores) return false;

        for (let sc = boss4.splitCores.length - 1; sc >= 0; sc--) {
            const core = boss4.splitCores[sc];
            const dx = projectile.x - core.x;
            const dy = projectile.y - core.y;
            const distSq = dx * dx + dy * dy;
            const minDist = core.radius + projectile.radius;

            if (distSq < minDist * minDist) {
                let damage = 15;
                if (gameState.playerStats.sniper) damage *= 2;

                boss4.takeDamage(damage);
                spawnParticles(projectile.x, projectile.y, 5, 3, '#ff4400');
                playSound('hit');
                projectilePool.release(projectile);
                return true;
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Boss5 clock minions
    // ═══════════════════════════════════════════════════════════════════
    static checkClockMinions(projectile, boss5) {
        if (!boss5.clockMinions) return false;

        for (let cm = boss5.clockMinions.length - 1; cm >= 0; cm--) {
            const minion = boss5.clockMinions[cm];
            if (minion.hp <= 0) continue;

            const dx = projectile.x - minion.x;
            const dy = projectile.y - minion.y;
            const distSq = dx * dx + dy * dy;
            const minDist = minion.radius + projectile.radius;

            if (distSq < minDist * minDist) {
                let damage = gameState.playerStats.sniper ? 2 : 1;
                minion.hp -= damage;
                spawnParticles(minion.x, minion.y, 3, 2, boss5.getPhaseColor());
                playSound('hit');

                projectile.penetration--;
                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                    return true;
                }
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Boss8 galaxy arms
    // ═══════════════════════════════════════════════════════════════════
    static checkGalaxyArms(projectile, boss8) {
        if (!boss8.galaxyArms) return false;

        for (let ga = boss8.galaxyArms.length - 1; ga >= 0; ga--) {
            const arm = boss8.galaxyArms[ga];
            if (arm.hp <= 0) continue;

            const dx = projectile.x - arm.x;
            const dy = projectile.y - arm.y;
            const distSq = dx * dx + dy * dy;
            const minDist = arm.radius + projectile.radius;

            if (distSq < minDist * minDist) {
                let damage = gameState.playerStats.sniper ? 2 : 1;
                arm.hp -= damage;
                spawnParticles(arm.x, arm.y, 3, 2, boss8.getPhaseColor());
                playSound('hit');

                projectile.penetration--;
                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                    return true;
                }
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Boss9 neural nodes
    // ═══════════════════════════════════════════════════════════════════
    static checkNeuralNodes(projectile, boss9) {
        if (!boss9.neuralNodes) return false;

        for (let nn = boss9.neuralNodes.length - 1; nn >= 0; nn--) {
            const node = boss9.neuralNodes[nn];
            if (node.hp <= 0) continue;

            const dx = projectile.x - node.x;
            const dy = projectile.y - node.y;
            const distSq = dx * dx + dy * dy;
            const minDist = node.radius + projectile.radius;

            if (distSq < minDist * minDist) {
                let damage = gameState.playerStats.sniper ? 2 : 1;
                node.hp -= damage;
                spawnParticles(node.x, node.y, 3, 2, boss9.getPhaseColor());
                playSound('hit');

                projectile.penetration--;
                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                    return true;
                }
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENEMY COLLISION
    // ═══════════════════════════════════════════════════════════════════
    static checkEnemyCollisions(projectile) {
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

                // Calculate damage
                let damage = projectile.damageMultiplier || 1;
                let isCritical = Math.random() < gameState.playerStats.critChance;

                if (gameState.playerStats.cryoFracture && enemy.freezeTimer > 0) {
                    damage *= 1.4;
                }

                if (isCritical) {
                    damage *= gameState.playerStats.critMultiplier;
                    if (typeof spawnShockwave === 'function') spawnShockwave(enemy.x, enemy.y, '#ff00ff');
                    if (typeof spawnCritStars === 'function') spawnCritStars(enemy.x, enemy.y, '#ffffff');
                }

                if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.2) {
                    damage = 999;
                    spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                }

                enemy.hp -= damage;

                // Apply knockback
                if (gameState.playerStats.knockback > 0 && !enemy.immuneToKnockback) {
                    const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                    enemy.x += Math.cos(angle) * gameState.playerStats.knockback;
                    enemy.y += Math.sin(angle) * gameState.playerStats.knockback;
                }

                // Apply freeze
                if (gameState.playerStats.freeze > 0 && !enemy.immuneToFreeze) {
                    enemy.freezeTimer = gameState.playerStats.freeze;
                }

                playSound('hit');
                const particleCount = Math.min(enemy.radius * 0.3, 10);
                spawnParticles(projectile.x, projectile.y, particleCount, 3, enemy.color);

                // Split shot
                if (gameState.playerStats.splitShotCount > 0 && !projectile.isSplit) {
                    this.createSplitShots(projectile);
                }

                // Chain lightning
                if (gameState.playerStats.chainLightning > 0) {
                    this.applyChainLightning(enemy);
                }

                // Check enemy death
                if (enemy.hp <= 0) {
                    this.handleEnemyDeath(enemy);
                }

                // Check projectile destruction
                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                    return;
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Split shots
    // ═══════════════════════════════════════════════════════════════════
    static createSplitShots(projectile) {
        const splitCount = gameState.playerStats.splitShotCount;
        for (let s = 0; s < splitCount; s++) {
            const splitAngle = Math.random() * Math.PI * 2;
            const splitVel = {
                x: Math.cos(splitAngle) * gameState.playerStats.shotSpeed * 0.8,
                y: Math.sin(splitAngle) * gameState.playerStats.shotSpeed * 0.8
            };
            projectilePool.get(projectile.x, projectile.y, splitVel, true, gameState.playerStats);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // HELPER: Chain lightning
    // ═══════════════════════════════════════════════════════════════════
    static applyChainLightning(sourceEnemy) {
        const lightningRange = Math.min(400, CANVAS.width * 0.4);
        const potentialTargets = enemySpatialGrid.query(sourceEnemy.x, sourceEnemy.y, lightningRange);

        let chainTargets = [];
        for (const t of potentialTargets) {
            if (t.id !== sourceEnemy.id && t.hp > 0) {
                const dist = Math.hypot(t.x - sourceEnemy.x, t.y - sourceEnemy.y);
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

            if (typeof spawnChainLightning === 'function') {
                spawnChainLightning(sourceEnemy.x, sourceEnemy.y, target.x, target.y);
            }
            spawnParticles(target.x, target.y, 5, 2, '#00ffff');

            if (target.hp <= 0) {
                this.handleEnemyDeath(target);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENEMY DEATH - ENHANCED WITH TYPE-SPECIFIC VFX
    // ═══════════════════════════════════════════════════════════════════
    static handleEnemyDeath(enemy) {
        // Eğer zaten öldüyse veya havuzda değilse işlem yapma
        if ((enemy.hp > 0 && !enemyPool.active.includes(enemy)) || enemy.isDead) return;

        enemy.isDead = true;

        if (!gameState.bossActive) {
            gameState.score += enemy.type.score;
        }

        // ENHANCED: Kill Streak Tracking
        gameState.killStreak++;
        gameState.killStreakTimer = 2000; // 2 seconds to continue streak
        gameState.totalEnemiesKilled = (gameState.totalEnemiesKilled || 0) + 1;
        if (typeof QuestManager !== 'undefined') {
            QuestManager.trackEvent('enemies_killed', 1);
        }

        // ENHANCED: Type-Specific Death VFX
        this.createDeathEffect(enemy);

        // ENHANCED: Multi-Kill Screen Shake
        if (gameState.killStreak >= 10) {
            const shakeIntensity = Math.min(3 + Math.floor(gameState.killStreak / 10), 12);
            if (window.triggerScreenShake) window.triggerScreenShake(shakeIntensity, 150);
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

        // Patlama mantığı
        if (gameState.playerStats.explosiveRadius > 0) {
            this.createExplosion(
                enemy.x,
                enemy.y,
                gameState.playerStats.explosiveRadius,
                7 * (gameState.playerStats.explosiveDamageMultiplier || 1)
            );
        }

        enemyPool.release(enemy);

        // Level atlama kontrolü
        updateProgressBar(gameState.score, gameState.nextLevelThreshold, gameState.previousLevelThreshold);
        if (gameState.score >= gameState.nextLevelThreshold && !gameState.bossActive && !gameState.isPaused) {
            triggerLevelUp();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENHANCED: Type-Specific Death Effects
    // ═══════════════════════════════════════════════════════════════════
    static createDeathEffect(enemy) {
        const x = enemy.x;
        const y = enemy.y;
        const type = enemy.type.name;

        switch (type) {
            case 'Tank':
                // BIG EXPLOSION + SCREEN SHAKE
                spawnParticles(x, y, 25, 8, enemy.color, 3);
                // Create expanding ring effect
                CTX.save();
                CTX.beginPath();
                CTX.arc(x, y, enemy.radius * 2, 0, Math.PI * 2);
                CTX.strokeStyle = 'rgba(100, 100, 255, 0.6)';
                CTX.lineWidth = 4;
                CTX.stroke();
                CTX.restore();
                // Screen shake
                if (window.triggerScreenShake) window.triggerScreenShake(5, 200);
                playSound('hit');
                break;

            case 'Healer':
                // GOLDEN PARTICLE BURST
                spawnParticles(x, y, 35, 7, '#ffd700', 4);
                // Additional white particles
                spawnParticles(x, y, 20, 5, '#ffffff', 3);
                // Create radial burst lines
                CTX.save();
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 / 8) * i;
                    const endX = x + Math.cos(angle) * enemy.radius * 3;
                    const endY = y + Math.sin(angle) * enemy.radius * 3;
                    CTX.beginPath();
                    CTX.moveTo(x, y);
                    CTX.lineTo(endX, endY);
                    CTX.strokeStyle = 'rgba(255, 215, 0, 0.5)';
                    CTX.lineWidth = 2;
                    CTX.stroke();
                }
                CTX.restore();
                /* playSound('levelup'); */ // Use levelup sound for special effect
                break;

            case 'Speedster':
                // LIGHTNING TRAIL + FAST PARTICLES
                spawnParticles(x, y, 15, 6, '#ffff00', 5);
                // Create lightning effect
                if (typeof spawnChainLightning === 'function') {
                    // Create 3 random lightning bolts
                    for (let i = 0; i < 3; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const dist = 50 + Math.random() * 20;
                        const targetX = x + Math.cos(angle) * dist;
                        const targetY = y + Math.sin(angle) * dist;
                        spawnChainLightning(x, y, targetX, targetY, '#ffff00');//make it yellow. #ffff00
                    }
                }
                // Speed trails
                for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 20 + i * 10;
                    spawnParticles(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 3, 2, '#ffff00', 2);
                }
                playSound('hit');
                break;

            case 'Spawner':
                // IMPLOSION EFFECT (reverse explosion)
                spawnParticles(x, y, 30, 6, enemy.color, 3);
                // Create converging effect
                CTX.save();
                CTX.beginPath();
                CTX.arc(x, y, enemy.radius * 1.5, 0, Math.PI * 2);
                CTX.fillStyle = 'rgba(0, 255, 255, 0.2)';
                CTX.fill();
                CTX.strokeStyle = 'rgba(0, 255, 255, 0.8)';
                CTX.lineWidth = 2;
                CTX.stroke();
                CTX.restore();
                // Mild screen shake
                if (window.triggerScreenShake) window.triggerScreenShake(3, 150);
                playSound('hit');
                break;

            case 'Dasher':
                // IMPACT FLASH
                spawnParticles(x, y, 20, 5, '#ff00ff', 3);
                CTX.save();
                CTX.fillStyle = 'rgba(255, 0, 255, 0.3)';
                CTX.beginPath();
                CTX.arc(x, y, enemy.radius * 2, 0, Math.PI * 2);
                CTX.fill();
                CTX.restore();
                playSound('hit');
                break;

            case 'Splitter':
                // SHATTER EFFECT
                spawnParticles(x, y, 18, 6, enemy.color, 3);
                // Create hexagonal shatter pattern
                CTX.save();
                CTX.strokeStyle = 'rgba(0, 255, 100, 0.5)';
                CTX.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI * 2 / 6) * i;
                    const endX = x + Math.cos(angle) * enemy.radius * 2;
                    const endY = y + Math.sin(angle) * enemy.radius * 2;
                    CTX.beginPath();
                    CTX.moveTo(x, y);
                    CTX.lineTo(endX, endY);
                    CTX.stroke();
                }
                CTX.restore();
                playSound('hit');
                break;

            default:
                // BASIC ENEMY - Standard particles
                const particleCount = Math.max(8, Math.floor(enemy.maxHp * 2));
                spawnParticles(x, y, particleCount, 5, enemy.color, 2);
                playSound('hit');
                break;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPLOSION
    // ═══════════════════════════════════════════════════════════════════
    static createExplosion(x, y, radius, damage) {
        // Görsel Efekt
        CTX.beginPath();
        CTX.arc(x, y, radius, 0, Math.PI * 2);
        CTX.fillStyle = 'rgba(255, 60, 0, 0.2)';
        CTX.fill();

        spawnParticles(x, y, Math.min(radius / 3, 20), 4, '#ff4400', 3);

        // Hasar Mantığı
        const nearbyTargets = enemySpatialGrid.query(x, y, radius);

        for (const target of nearbyTargets) {
            const dist = Math.hypot(target.x - x, target.y - y);

            if (dist < radius + target.radius) {
                target.hp -= damage;
                spawnParticles(target.x, target.y, 2, 2, '#ffffff', 2);

                if (target.hp <= 0) {
                    gameState.score += target.type.score;
                    enemyPool.release(target);
                }
            }
        }
    }
}

// Expose globals for backward compatibility
window.handleEnemyDeath = CollisionManager.handleEnemyDeath.bind(CollisionManager);
window.createExplosion = CollisionManager.createExplosion.bind(CollisionManager);
