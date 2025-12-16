// BossManager.js - Orchestrates Boss Fights (Refactored for Polymorphism)

class BossManager {
    static activeBoss = null;

    static startBossFight(bossId = 1) {
        gameState.bossActive = true;
        gameState.level++;

        // Polymorphic Registry
        // Relies on the global instances created in boss files
        const BOSS_REGISTRY = {
            1: typeof boss !== 'undefined' ? boss : null,
            2: typeof boss2 !== 'undefined' ? boss2 : null,
            3: typeof boss3 !== 'undefined' ? boss3 : null,
            4: typeof boss4 !== 'undefined' ? boss4 : null,
            5: typeof boss5 !== 'undefined' ? boss5 : null
        };

        const selectedBoss = BOSS_REGISTRY[bossId];

        if (!selectedBoss) {
            console.error(`Boss ID ${bossId} not found!`);
            gameState.bossActive = false;
            return;
        }

        BossManager.activeBoss = selectedBoss;

        let bossLabel = `BOSS: ${selectedBoss.name}`;
        updateLevelIndicator(bossLabel);

        clearInterval(gameState.spawnInterval);

        // Cleanup Scene
        if (typeof enemyPool !== 'undefined') {
            enemyPool.getActive().forEach(e => {
                if (window.createExplosion) createExplosion(e.x, e.y, 50, 0);
                enemyPool.release(e);
            });
        }

        selectedBoss.spawn(CANVAS.width / 2, -100);
    }

    static updateAndDraw(dt) {
        if (!gameState.bossActive || !BossManager.activeBoss) return;

        const currentBoss = BossManager.activeBoss;

        if (currentBoss.active) {
            currentBoss.update(player, dt);
            currentBoss.draw();
            BossManager.checkPlayerCollision(currentBoss);
        } else {
            // Safety check: if boss became inactive but manager thinks it is active
            BossManager.activeBoss = null;
        }
    }

    static draw() {
        if (BossManager.activeBoss && BossManager.activeBoss.active) {
            BossManager.activeBoss.draw();
        }
    }

    static checkPlayerCollision(bossEntity) {
        const dist = Math.hypot(bossEntity.x - player.x, bossEntity.y - player.y);

        // Use generic radius/hitbox
        if (dist < bossEntity.radius + player.radius) {
            if (gameState.playerStats.shield > 0) {
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);

                // Determine Push Force based on boss type or default
                // This could be moved to BossBase property 'pushForce'
                let pushForce = 200;
                if (bossEntity.name === 'NEXUS PRIME') pushForce = 300;
                if (bossEntity.name === 'THE OMEGA') pushForce = 300;

                const angle = Math.atan2(player.y - bossEntity.y, player.x - bossEntity.x);
                player.x += Math.cos(angle) * pushForce;
                player.y += Math.sin(angle) * pushForce;
            } else {
                startDeathSequence();
            }
        }
    }
}

window.startBossFight = BossManager.startBossFight;
window.BossManager = BossManager;
