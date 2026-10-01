// SpawnManager.js - Handles enemy spawning and diffculty

class SpawnManager {
    static activeIntervals = []; // Track intervals for cleanup

    static init() {
        // Any init logic
    }

    static clearAllIntervals() {
        // Cleanup all active intervals
        this.activeIntervals.forEach(id => clearInterval(id));
        this.activeIntervals = [];
    }

    static spawnEnemies() {
        // Clear any existing interval to prevent duplicates (Leak fix)
        if (gameState.spawnInterval) clearInterval(gameState.spawnInterval);

        let spawnRate = 1000 - (gameState.difficultyMultiplier * 50);
        if (gameState.level >= 10) spawnRate = 1000 - (gameState.difficultyMultiplier * 110);
        if (gameState.level >= 20) spawnRate = 1000 - (gameState.difficultyMultiplier * 160);
        if (gameState.level >= 30) spawnRate = 1000 - (gameState.difficultyMultiplier * 220);
        if (gameState.level >= 40) spawnRate = 1000 - (gameState.difficultyMultiplier * 280);
        if (gameState.level >= 45) spawnRate = 1000 - (gameState.difficultyMultiplier * 400);
        if (spawnRate < 200) spawnRate = 200;

        gameState.spawnInterval = setInterval(() => {
            if (gameState.isPaused || !gameState.gameActive) return;

            let type = ENEMY_TYPES.BASIC;
            const rand = Math.random();

            if (gameState.difficultyMultiplier > 5 && rand < 0.04 && gameState.activeHealerCount < 3) type = ENEMY_TYPES.HEALER; // Rare spawn (Max 3)
            else if (gameState.level > 50 && rand < 0.08) type = ENEMY_TYPES.SUPERTANK; // After level 50
            else if (gameState.difficultyMultiplier > 4 && rand < 0.15 && gameState.activeSpawnerCount < 3) type = ENEMY_TYPES.SPAWNER;
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

    static triggerLevelUp(isFromBossDeath = false) {
        // --- BOSS SCHEDULE ---
        // Minibosses bridge the long gaps without requiring player movement.
        const isFromBoss = isFromBossDeath || (typeof gameState !== 'undefined' && gameState.justDefeatedBoss);
        if (typeof gameState !== 'undefined') gameState.justDefeatedBoss = false;

        if (!isFromBoss) {
            if (gameState.level === 4 && !gameState.bossActive) { startBossFight(101); return; }
            if (gameState.level === 14 && !gameState.bossActive) { startBossFight(102); return; }
            if (gameState.level === 24 && !gameState.bossActive) { startBossFight(103); return; }
            if (gameState.level === 34 && !gameState.bossActive) { startBossFight(102); return; }
            if (gameState.level === 47 && !gameState.bossActive) { startBossFight(103); return; }
        // Level 10: OMEGA CORE (Boss 1)
        if (gameState.level === 9 && !gameState.bossActive) {
            startBossFight(1);
            return;
        }
        // Level 20: THE SWARM (Boss 4)
        if (gameState.level === 19 && !gameState.bossActive) {
            startBossFight(2);
            return;
        }
        // Level 30: NEXUS PRIME (Boss 2)
        if (gameState.level === 29 && !gameState.bossActive) {
            startBossFight(4);
            return;
        }
        // Level 40: CHRONOS (Boss 5)
        if (gameState.level === 39 && !gameState.bossActive) {
            startBossFight(5);
            return;
        }
        // Level 45: VOID REAPER (Boss 6) - FINAL BOSS
        if (gameState.level === 44 && !gameState.bossActive) {
            startBossFight(6);
            return;
        }
        // Level 50: THE OMEGA (Boss 3)
        if (gameState.level === 49 && !gameState.bossActive) {
            startBossFight(7);
            return;
        }
        // Level 55: THE SINGULARITY (Boss 7) - TRUE FINAL BOSS
        if (gameState.level === 54 && !gameState.bossActive) {
            startBossFight(8);
            return;
        }
        // Level 60: THE GALAXY DEVOURER (Boss 8) - ULTIMATE CHALLENGE
        if (gameState.level === 59 && !gameState.bossActive) {
            startBossFight(9);
            return;
        }
        }

        gameState.isPaused = true;
        clearInterval(gameState.spawnInterval);
        playSound('levelup');
        showLevelUpAnimation();

        // 1. FILTER AVAILABLE PERKS
        let availablePerks = ALL_PERKS.filter(p => {
            if (p.singleUse && gameState.takenPerks.includes(p.id)) return false;
            // Max Shield Check
            if (p.id === 'energy_shield' && gameState.playerStats.shield >= gameState.playerStats.maxShields) return false;
            // Max Shot Check
            if (p.id === 'double_shot' && gameState.playerStats.shotCount >= MAX_SHOT_COUNT) return false;
            // One-time perks
            if (p.id === 'back_shot' && gameState.playerStats.backShot) return false;
            if (p.id === 'singularity' && gameState.playerStats.singularity) return false;

            // Laser Beam Cap
            if (p.id === 'laser_beam' && gameState.playerStats.laserBeam >= 10) return false;
            // Laser Damage needs Laser Beam
            if (p.id === 'laser_damage' && gameState.playerStats.laserBeam === 0) return false;

            // Chain Lightning Logic
            if (p.id === 'chain_lightning' && gameState.playerStats.chainLightning > 0) return false;
            if ((p.id === 'chain_lightning_count' || p.id === 'chain_lightning_damage') && gameState.playerStats.chainLightning === 0) return false;

            // Orbital Size needs Orbitals
            if (p.id === 'orbital_size' && gameState.playerStats.orbitals === 0) return false;

            // Electric Aura Upgrades need Electric Aura
            if ((p.id === 'electric_aura_damage' || p.id === 'electric_aura_rate' || p.id === 'electric_aura_area') && !gameState.playerStats.electricAura) return false;
            if ((p.id === 'pulse_accelerator' || p.id === 'pulse_payload') && !gameState.playerStats.pulseCore) return false;
            if (p.id === 'cryo_fracture' && gameState.playerStats.freeze <= 0) return false;
            if (p.id === 'demolition_matrix' && gameState.playerStats.explosiveRadius <= 0) return false;
            if (p.id === 'critical_cascade' && gameState.playerStats.critChance <= 0) return false;

            return true;
        });

        // 2. SELECT 3 UNIQUE PERKS (Final Selection)
        // Shuffle available perks
        const shuffled = availablePerks.sort(() => 0.5 - Math.random());
        // Pick top 3 (or fewer if not enough perks)
        const selectedPerks = shuffled.slice(0, 3);

        // 3. SHOW UI WITH PLACEHOLDERS
        setTimeout(() => {
            perkListEl.innerHTML = '';
            levelUpScreen.classList.remove('hidden');

            // Create card elements
            const cardElements = [];

            // We'll create 3 cards (or less)
            for (let i = 0; i < selectedPerks.length; i++) {
                const div = document.createElement('div');
                div.className = 'perk-card perk-shuffling';
                div.style.setProperty('--perk-theme', '#555');

                div.style.animation = `cardEntry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s backwards`;

                div.innerHTML = `
                    <div class="perk-title" style="font-family: monospace;">INIT...</div>
                    <div class="perk-desc">DECRYPTING...</div>
                `;
                div.style.pointerEvents = 'none';
                perkListEl.appendChild(div);
                cardElements.push(div);
            }

            // 4. SLOT MACHINE ANIMATION
            const intervals = [];
            const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!%&";

            cardElements.forEach((card, index) => {
                let tickCount = 0;
                const interval = setInterval(() => {
                    tickCount++;
                    if (tickCount % 3 === 0) playSound('ui_tick');

                    const randomPerk = availablePerks[Math.floor(Math.random() * availablePerks.length)];

                    if (randomPerk) {
                        const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
                        card.style.setProperty('--perk-theme', randomColor);

                        let scrambledTitle = "";
                        for (let k = 0; k < 10; k++) scrambledTitle += randomChars.charAt(Math.floor(Math.random() * randomChars.length));

                        card.querySelector('.perk-title').innerText = scrambledTitle;
                    }
                }, 40);
                intervals.push(interval);
                SpawnManager.activeIntervals.push(interval);
            });

            // 5. STOP CARDS ONE BY ONE
            selectedPerks.forEach((finalPerk, index) => {
                setTimeout(() => {
                    clearInterval(intervals[index]);
                    const intervalIndex = SpawnManager.activeIntervals.indexOf(intervals[index]);
                    if (intervalIndex > -1) {
                        SpawnManager.activeIntervals.splice(intervalIndex, 1);
                    }

                    const card = cardElements[index];

                    // Set Final Content
                    let displayDesc = Localization.t(finalPerk.desc);
                    if (finalPerk.id === 'orbitals') {
                        displayDesc = Localization.t('perk_orbitals_desc_dynamic', { value: gameState.playerStats.orbitals });
                    } else if (finalPerk.id === 'split_shot') {
                        displayDesc = Localization.t('perk_split_shot_desc_dynamic', { value: gameState.playerStats.splitShotCount });
                    }

                    if (finalPerk.theme) {
                        card.style.setProperty('--perk-theme', finalPerk.theme);
                    }

                    card.innerHTML = `
                        <div class="perk-title">${Localization.t(finalPerk.title)}</div>
                        <div class="perk-desc">${displayDesc}</div>
                    `;

                    // Remove shuffle effect and add lock-in effect
                    card.classList.remove('perk-shuffling');
                    card.classList.add('locked-in');

                    // Play Lock Sound
                    playSound('ui_lock');

                    // Enable interaction
                    card.style.pointerEvents = 'auto';
                    card.onclick = () => SpawnManager.selectPerk(finalPerk);

                }, 800 + (index * 300));
            });

        }, 500);
    }

    static selectPerk(perk) {
        // OPTIMIZATION: Clear all active intervals immediately
        SpawnManager.clearAllIntervals();

        playSound('perk_select');
        gameState.takenPerks.push(perk.id);
        if (typeof QuestManager !== 'undefined') {
            QuestManager.trackEvent('perks_selected', 1);
        }
        perk.apply(gameState.playerStats);
        gameState.level++;
        if (typeof gameState !== 'undefined') gameState.justDefeatedBoss = false;
        gameState.currentLevelStep = Math.floor(gameState.currentLevelStep * 1.1) + 200;
        gameState.previousLevelThreshold = gameState.nextLevelThreshold;
        gameState.nextLevelThreshold += gameState.currentLevelStep;
        gameState.difficultyMultiplier += 0.5;

        updateLevelIndicator(gameState.level);
        updateShieldIndicator(gameState.playerStats.shield);
        updateProgressBar(gameState.score, gameState.nextLevelThreshold, gameState.previousLevelThreshold);
        updateXPBarColor(gameState.playerStats.color);
        levelUpScreen.classList.add('hidden');
        gameState.isPaused = false;
        SpawnManager.spawnEnemies();
        SaveManager.saveGame(gameState); // SAVE THE GAME
        requestAnimationFrame(animate);
    }
}

// Global Exports
window.spawnEnemies = SpawnManager.spawnEnemies;
window.triggerLevelUp = SpawnManager.triggerLevelUp;
window.selectPerk = SpawnManager.selectPerk;
