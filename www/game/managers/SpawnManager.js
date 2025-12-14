
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
            if (p.id === 'laser_beam' && gameState.playerStats.laserBeam >= 5) return false;
            // Laser Damage needs Laser Beam
            if (p.id === 'laser_damage' && gameState.playerStats.laserBeam === 0) return false;

            // Chain Lightning Logic
            if (p.id === 'chain_lightning' && gameState.playerStats.chainLightning > 0) return false;
            if ((p.id === 'chain_lightning_count' || p.id === 'chain_lightning_damage') && gameState.playerStats.chainLightning === 0) return false;

            // Orbital Size needs Orbitals
            if (p.id === 'orbital_size' && gameState.playerStats.orbitals === 0) return false;

            return true;
        });

        // 2. SELECT 3 UNIQUE PERKS (Final Selection)
        // Shuffle available perks
        const shuffled = availablePerks.sort(() => 0.5 - Math.random());
        // Pick top 3 (or fewer if not enough perks)
        const selectedPerks = shuffled.slice(0, 3);

        // If we have fewer than 3 perks, fill the rest with placeholders or just show fewer
        // For visual consistency, let's just use what we have.

        // 3. SHOW UI WITH PLACEHOLDERS
        // We want the perk cards to appear immediately after the "LEVEL UP" text starts fading
        // The original code had 1200ms delay. We'll keep a short delay for the text impact.
        setTimeout(() => { // Faster start (500ms)
            perkListEl.innerHTML = '';
            levelUpScreen.classList.remove('hidden');

            // Create card elements
            const cardElements = [];

            // We'll create 3 cards (or less)
            for (let i = 0; i < selectedPerks.length; i++) {
                const div = document.createElement('div');
                div.className = 'perk-card perk-shuffling'; // Start blurring
                div.style.setProperty('--perk-theme', '#555'); // Default gray during shuffle

                // Staggered entry animation (Tight timing)
                div.style.animation = `cardEntry 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.08}s backwards`;

                div.innerHTML = `
                    <div class="perk-title" style="font-family: monospace;">INIT...</div>
                    <div class="perk-desc">DECRYPTING...</div>
                `;
                // Prevent clicking during shuffle
                div.style.pointerEvents = 'none';
                perkListEl.appendChild(div);
                cardElements.push(div);
            }

            // 4. SLOT MACHINE ANIMATION
            // Cycle through random perks on each card independently
            const intervals = [];
            const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!%&";

            cardElements.forEach((card, index) => {
                let tickCount = 0;
                const interval = setInterval(() => {
                    tickCount++;
                    // Play tick sound occasionally (too fast otherwise)
                    if (tickCount % 3 === 0) playSound('ui_tick');

                    // Pick a random perk from ALL available perks just for visual noise
                    const randomPerk = availablePerks[Math.floor(Math.random() * availablePerks.length)];

                    if (randomPerk) {
                        // Randomize color
                        const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
                        card.style.setProperty('--perk-theme', randomColor);

                        // Scramble Text Effect
                        let scrambledTitle = "";
                        for (let k = 0; k < 10; k++) scrambledTitle += randomChars.charAt(Math.floor(Math.random() * randomChars.length));

                        // NO ICON - Scrambled text only
                        card.querySelector('.perk-title').innerText = scrambledTitle;
                    }
                }, 40); // Faster shuffle (40ms)
                intervals.push(interval);
            });

            // 5. STOP CARDS ONE BY ONE
            // Faster stagger
            selectedPerks.forEach((finalPerk, index) => {
                setTimeout(() => {
                    clearInterval(intervals[index]);

                    const card = cardElements[index];

                    // Set Final Content
                    let displayDesc = finalPerk.desc;
                    // Dynamic Descriptions
                    if (finalPerk.id === 'orbitals') {
                        displayDesc = `(Current: ${gameState.playerStats.orbitals} protection) + 1 Orbital Shield.`;
                    } else if (finalPerk.id === 'split_shot') {
                        displayDesc = `(Current: ${gameState.playerStats.splitShotCount} fragments) + 1 Fragment on hit.`;
                    }

                    if (finalPerk.theme) {
                        card.style.setProperty('--perk-theme', finalPerk.theme);
                    }

                    // NO ICON in final result
                    card.innerHTML = `
                        <div class="perk-title">${finalPerk.title}</div>
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

                }, 800 + (index * 300)); // Faster stagger (300ms)
            });

        }, 500); // 500ms delay after "LEVEL UP" text appears
    }

    static selectPerk(perk) {
        playSound('perk_select');
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
