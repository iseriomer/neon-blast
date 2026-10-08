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

        setTimeout(() => {
            levelUpScreen.classList.remove('hidden');
            SpawnManager.rollPerks([]);
        }, 500);
    }

    static currentOfferedPerks = [];

    static getAvailablePerks() {
        return ALL_PERKS.filter(p => {
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
    }

    static fitsBuild(perk, stats = gameState.playerStats) {
        const dependencies = {
            pulse_accelerator: stats.pulseCore, pulse_payload: stats.pulseCore,
            cryo_fracture: stats.freeze > 0, demolition_matrix: stats.explosiveRadius > 0,
            critical_cascade: stats.critChance > 0,
            chain_lightning_count: stats.chainLightning > 0, chain_lightning_damage: stats.chainLightning > 0,
            laser_damage: stats.laserBeam > 0, orbital_size: stats.orbitals > 0,
            electric_aura_damage: stats.electricAura, electric_aura_rate: stats.electricAura, electric_aura_area: stats.electricAura
        };
        return !!dependencies[perk.id];
    }

    static choosePerks(candidates) {
        const shuffled = [...candidates];
        // Fisher-Yates avoids the positional bias of a random sort comparator.
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const firstPick = gameState.level <= 2 && !gameState.takenPerks.length;
        const offensive = new Set(['rapid_fire', 'machine_gun', 'double_shot', 'shotgun']);
        const anchor = firstPick ? shuffled.find(perk => offensive.has(perk.id))
            : Math.random() < .6 ? shuffled.find(perk => this.fitsBuild(perk)) : null;
        if (anchor) {
            const index = shuffled.indexOf(anchor);
            [shuffled[0], shuffled[index]] = [shuffled[index], shuffled[0]];
        }
        return shuffled.slice(0, 3);
    }

    static rollPerks(excludedPerkIds = []) {
        SpawnManager.clearAllIntervals();
        perkListEl.innerHTML = '';

        const availablePerks = SpawnManager.getAvailablePerks();

        // Exclude perks that were just shown in previous roll
        let candidates = availablePerks.filter(p => !excludedPerkIds.includes(p.id));
        if (candidates.length < 3) {
            const others = availablePerks.filter(p => !candidates.some(c => c.id === p.id));
            candidates = candidates.concat(others);
        }

        const selectedPerks = SpawnManager.choosePerks(candidates);
        SpawnManager.currentOfferedPerks = selectedPerks;

        // Create card elements
        const cardElements = [];
        for (let i = 0; i < selectedPerks.length; i++) {
            const div = document.createElement('div');
            div.className = 'perk-card perk-shuffling';
            div.style.setProperty('--perk-theme', '#555');
            div.style.animation = `cardEntry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s backwards`;
            div.innerHTML = `
                <div class="perk-card-top">
                    <div class="perk-icon-slot">
                        <span class="perk-decrypt-scan"></span>
                    </div>
                </div>
                <div class="perk-info-wrap">
                    <div class="perk-title" style="font-family: monospace;">INIT...</div>
                    <div class="perk-desc">${Localization.t('perk_decrypting')}</div>
                </div>
            `;
            div.style.pointerEvents = 'none';
            perkListEl.appendChild(div);
            cardElements.push(div);
        }

        // Slot machine decrypt animation
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

                    const titleEl = card.querySelector('.perk-title');
                    if (titleEl) titleEl.innerText = scrambledTitle;
                }
            }, 40);
            intervals.push(interval);
            SpawnManager.activeIntervals.push(interval);
        });

        // Stop cards one by one
        selectedPerks.forEach((finalPerk, index) => {
            setTimeout(() => {
                clearInterval(intervals[index]);
                const intervalIndex = SpawnManager.activeIntervals.indexOf(intervals[index]);
                if (intervalIndex > -1) {
                    SpawnManager.activeIntervals.splice(intervalIndex, 1);
                }

                const card = cardElements[index];
                if (!card) return;

                let displayDesc = Localization.t(finalPerk.desc);
                if (finalPerk.id === 'orbitals') {
                    displayDesc = Localization.t('perk_orbitals_desc_dynamic', { value: gameState.playerStats.orbitals });
                } else if (finalPerk.id === 'split_shot') {
                    displayDesc = Localization.t('perk_split_shot_desc_dynamic', { value: gameState.playerStats.splitShotCount });
                }

                if (finalPerk.theme) {
                    card.style.setProperty('--perk-theme', finalPerk.theme);
                }

                let iconSvg = '';
                if (typeof IconSystem !== 'undefined') {
                    iconSvg = IconSystem.getPerkIcon(finalPerk.id, finalPerk.theme || '#00ffff', 28);
                }

                card.innerHTML = `
                    <div class="perk-card-top">
                        <div class="perk-icon-slot">${iconSvg}</div>
                        ${SpawnManager.fitsBuild(finalPerk) ? `<span class="perk-fit">${Localization.t('perk_build_fit')}</span>` : ''}
                    </div>
                    <div class="perk-info-wrap">
                        <div class="perk-title">${Localization.t(finalPerk.title)}</div>
                        <div class="perk-desc">${displayDesc}</div>
                    </div>
                `;

                card.classList.remove('perk-shuffling');
                card.classList.add('locked-in');
                playSound('ui_lock');

                card.style.pointerEvents = 'auto';
                card.onclick = () => SpawnManager.selectPerk(finalPerk);

            }, 600 + (index * 250));
        });

        // Setup Reroll button
        const rerollBtn = document.getElementById('perk-reroll-btn');
        const rerollText = document.getElementById('perk-reroll-text');
        const rerollTag = document.getElementById('perk-reroll-tag') || (rerollBtn ? rerollBtn.querySelector('.reroll-tag') : null);
        const rerollHint = document.getElementById('perk-reroll-hint');

        if (rerollBtn) {
            const isVip = (typeof PremiumStoreManager !== 'undefined' && !PremiumStoreManager.shouldShowInterstitial());
            if (rerollText) {
                rerollText.innerText = isVip
                    ? Localization.t('perk_reroll_vip_label')
                    : Localization.t('perk_reroll_ad_label');
            }
            if (rerollTag) {
                if (isVip) {
                    rerollTag.innerText = Localization.t('tag_vip');
                    rerollTag.classList.add('free');
                } else {
                    rerollTag.innerText = Localization.t('tag_ad');
                    rerollTag.classList.remove('free');
                }
            }
            if (rerollHint) {
                rerollHint.innerText = isVip
                    ? Localization.t('perk_reroll_hint_vip')
                    : Localization.t('perk_reroll_hint');
            }
            rerollBtn.disabled = false;
            rerollBtn.onclick = () => {
                rerollBtn.disabled = true;
                const currentIds = SpawnManager.currentOfferedPerks.map(p => p.id);
                const executeReroll = () => {
                    SpawnManager.rollPerks(currentIds);
                };

                if (isVip) {
                    executeReroll();
                } else if (typeof AdManager !== 'undefined') {
                    AdManager.showRewardedAd({
                        rewardType: 'PERK_REROLL',
                        onSuccess: () => executeReroll(),
                        onDismiss: () => { rerollBtn.disabled = false; }
                    });
                } else {
                    executeReroll();
                }
            };
        }
    }

    static selectPerk(perk) {
        // OPTIMIZATION: Clear all active intervals immediately
        SpawnManager.clearAllIntervals();

        playSound('perk_select');
        gameState.takenPerks.push(perk.id);
        if (window.GameTelemetry) GameTelemetry.track('perk_picked', { perk_id: perk.id, level: gameState.level });
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
