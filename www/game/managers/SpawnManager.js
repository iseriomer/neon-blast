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

        const spawnRate = LevelDirector.spawnInterval(gameState.difficultyMultiplier);

        gameState.spawnInterval = setInterval(() => {
            if (gameState.isPaused || !gameState.gameActive) return;

            let type = ENEMY_TYPES.BASIC;
            const rand = Math.random();

            for (const [id, rule] of Object.entries(GameBalance.get('spawning'))) {
                const count = id === 'HEALER' ? gameState.activeHealerCount : id === 'SPAWNER' ? gameState.activeSpawnerCount : 0;
                if (gameState.difficultyMultiplier > rule.difficulty && rand < rule.chance && (rule.cap === undefined || count < rule.cap)) {
                    type = ENEMY_TYPES[id];
                    break;
                }
            }

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
        const isFromBoss = isFromBossDeath || gameState.justDefeatedBoss;
        gameState.justDefeatedBoss = false;
        if (LevelProgress.encounter(isFromBoss)) return;

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
            : Math.random() < GameBalance.get('perks.synergyChance') ? shuffled.find(perk => this.fitsBuild(perk)) : null;
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

                const displayDesc = GameBalance.perkDescription(finalPerk, gameState.playerStats);

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
                    </div>
                    <div class="perk-info-wrap">
                        <div class="perk-title">${Localization.t(finalPerk.title)}</div>
                        <div class="perk-desc">${displayDesc}</div>
                    </div>
                `;

                if (card.isConnected) window.Encyclopedia?.discoverPerk(finalPerk);
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
            const isVip = typeof PremiumStoreManager !== 'undefined' && !PremiumStoreManager.shouldShowInterstitial();
            if (rerollText) {
                rerollText.dataset.i18n = isVip ? 'perk_reroll_vip_label' : 'perk_reroll_ad_label';
                rerollText.innerText = Localization.t(rerollText.dataset.i18n);
            }
            if (rerollTag) {
                rerollTag.dataset.i18n = isVip ? 'tag_vip' : 'tag_ad';
                rerollTag.innerText = Localization.t(rerollTag.dataset.i18n);
                rerollTag.classList.toggle('free', isVip);
            }
            if (rerollHint) {
                rerollHint.dataset.i18n = isVip ? 'perk_reroll_hint_vip' : 'perk_reroll_hint';
                rerollHint.innerText = Localization.t(rerollHint.dataset.i18n);
            }
            rerollBtn.disabled = false;
            rerollBtn.onclick = () => {
                if (!gameState.isPaused || !gameState.gameActive || window.AdManager?.isAdPlaying) return;
                rerollBtn.disabled = true;
                const currentIds = SpawnManager.currentOfferedPerks.map(p => p.id);
                if (isVip) {
                    SpawnManager.rollPerks(currentIds);
                } else if (typeof AdManager !== 'undefined') {
                    AdManager.showRewardedAd({
                        rewardType: 'PERK_REROLL',
                        onSuccess: () => SpawnManager.rollPerks(currentIds),
                        onDismiss: () => { rerollBtn.disabled = false; }
                    });
                } else {
                    rerollBtn.disabled = false;
                    ArmoryUI.showToast(Localization.t('ad_unavailable'), false);
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
        const progression = LevelDirector.progression();
        gameState.currentLevelStep = Math.floor(gameState.currentLevelStep * progression.stepGrowth) + progression.stepAddition;
        gameState.previousLevelThreshold = gameState.nextLevelThreshold;
        gameState.nextLevelThreshold += gameState.currentLevelStep;
        gameState.difficultyMultiplier += 0.5;
        if (window.LevelProgress) LevelProgress.afterPerk();

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
