// BossManager.js - Centralized Boss Control System

class BossManager {
    static activeBoss = null;

    static startBossFight(bossId) {
        if (gameState.bossActive) return; // Prevent multiple bosses

        gameState.bossActive = true;

        // Boss Registry - Map ID to Boss Instance
        const BOSS_REGISTRY = {
            1: typeof boss !== 'undefined' ? boss : null,
            2: typeof boss2 !== 'undefined' ? boss2 : null,
            3: typeof boss3 !== 'undefined' ? boss3 : null,
            4: typeof boss4 !== 'undefined' ? boss4 : null,
            5: typeof boss5 !== 'undefined' ? boss5 : null,
            6: typeof boss6 !== 'undefined' ? boss6 : null,
            7: typeof boss7 !== 'undefined' ? boss7 : null,
            8: typeof boss8 !== 'undefined' ? boss8 : null,
            9: typeof boss9 !== 'undefined' ? boss9 : null,
            101: typeof miniSentinel !== 'undefined' ? miniSentinel : null,
            102: typeof miniWarden !== 'undefined' ? miniWarden : null,
            103: typeof miniHarvester !== 'undefined' ? miniHarvester : null
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
            const active = [...enemyPool.getActive()];
            for (let i = 0; i < active.length; i++) {
                if (window.createExplosion) createExplosion(active[i].x, active[i].y, 50, 0);
            }
            enemyPool.releaseAll();
        }

        const spawnY = selectedBoss.isMiniboss ? (selectedBoss.targetY || 120) : -100;
        selectedBoss.spawn(CANVAS.width / 2, spawnY);
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
