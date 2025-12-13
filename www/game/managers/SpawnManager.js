
// SpawnManager.js - Handles enemy spawning and diffculty

class SpawnManager {
    static init() {
        // Any init logic
    }

    static spawnEnemies() {
        // Clear any existing interval to prevent duplicates (Leak fix)
        if (gameState.spawnInterval) clearInterval(gameState.spawnInterval);

        let spawnRate = 1000 - (gameState.difficultyMultiplier * 50);
        if (gameState.level >= 10) spawnRate = 1000 - (gameState.difficultyMultiplier * 100);
        if (gameState.level >= 20) spawnRate = 1000 - (gameState.difficultyMultiplier * 150);
        if (gameState.level >= 30) spawnRate = 1000 - (gameState.difficultyMultiplier * 200);
        if (spawnRate < 200) spawnRate = 200;

        gameState.spawnInterval = setInterval(() => {
            if (gameState.isPaused || !gameState.gameActive) return;

            let type = ENEMY_TYPES.BASIC;
            const rand = Math.random();

            if (gameState.difficultyMultiplier > 5 && rand < 0.04 && gameState.activeHealerCount < 4) type = ENEMY_TYPES.HEALER; // Rare spawn (Max 4)
            else if (gameState.difficultyMultiplier > 4 && rand < 0.15 && gameState.activeSpawnerCount < 4) type = ENEMY_TYPES.SPAWNER;
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

    static triggerLevelUp() {
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
                if (p.singleUse && gameState.takenPerks.includes(p.id)) return false;
                if (p.id === 'energy_shield' && gameState.playerStats.shield >= gameState.playerStats.maxShields) return false;
                if (p.id === 'double_shot' && gameState.playerStats.shotCount >= MAX_SHOT_COUNT) return false;
                if (p.id === 'back_shot' && gameState.playerStats.backShot) return false;
                if (p.id === 'laser_beam' && gameState.playerStats.laserBeam >= 5) return false;
                // Laser Damage Perk Logic
                if (p.id === 'laser_damage' && gameState.playerStats.laserBeam === 0) return false;
                if (p.id === 'singularity' && gameState.playerStats.singularity) return false;
                // Chain Lightning Logic
                if (p.id === 'chain_lightning' && gameState.playerStats.chainLightning > 0) return false;
                if ((p.id === 'chain_lightning_count' || p.id === 'chain_lightning_damage') && gameState.playerStats.chainLightning === 0) return false;
                // Status Mutual Exclusivity

                // Conditional Perks
                if (p.id === 'orbital_size' && gameState.playerStats.orbitals === 0) return false;
                return true;
            });

            const shuffled = availablePerks.sort(() => 0.5 - Math.random());
            const selectedPerks = shuffled.slice(0, 3);

            perkListEl.innerHTML = '';
            selectedPerks.forEach(perk => {
                let displayDesc = perk.desc;

                // Dynamic Descriptions
                if (perk.id === 'orbitals') {
                    displayDesc = `(Current: ${gameState.playerStats.orbitals} protection) + 1 Orbital Shield.`;
                } else if (perk.id === 'split_shot') {
                    displayDesc = `(Current: ${gameState.playerStats.splitShotCount} fragments) + 1 Fragment on hit.`;
                }

                const div = document.createElement('div');
                div.className = 'perk-card';
                // Set dynamic theme color
                if (perk.theme) {
                    div.style.setProperty('--perk-theme', perk.theme);
                }

                div.innerHTML = `
                    <div class="perk-title">${perk.title}</div>
                    <div class="perk-desc">${displayDesc}</div>
                `;
                div.onclick = () => SpawnManager.selectPerk(perk);
                perkListEl.appendChild(div);
            });

            levelUpScreen.classList.remove('hidden');
        }, 1200);
    }

    static selectPerk(perk) {
        gameState.takenPerks.push(perk.id);
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
        SpawnManager.spawnEnemies();
        requestAnimationFrame(animate);
    }
}

// Global Exports
window.spawnEnemies = SpawnManager.spawnEnemies;
window.triggerLevelUp = SpawnManager.triggerLevelUp;
window.selectPerk = SpawnManager.selectPerk;
