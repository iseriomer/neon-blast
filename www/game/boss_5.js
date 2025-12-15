// game/boss_5.js - CHRONOS - Time Lord Boss (Level 40) - ENHANCED VERSION

const BOSS_5_DATA = {
    name: 'CHRONOS',
    hp: 18000, // Increased HP
    score: 15000,
    colors: {
        phase1: '#00aaff',
        phase2: '#aa00ff',
        phase3: '#ff0066'
    }
};

class BossChronos extends BossBase {
    constructor() {
        super();
        this.name = BOSS_5_DATA.name;
        this.maxHp = BOSS_5_DATA.hp;
        this.score = BOSS_5_DATA.score;
        this.radius = 70; // Bigger hitbox

        // Visuals
        this.clockAngle = 0;
        this.hourHand = 0;
        this.minuteHand = 0;
        this.secondHand = 0; // NEW: Second hand
        this.pulseTimer = 0;
        this.phaseShiftAlpha = 1;
        this.glitchTimer = 0;

        // Combat
        this.state = 'IDLE';
        this.introTimer = 0;
        this.timeZones = [];
        this.echoClones = [];
        this.clockMinions = []; // NEW: Orbiting clock minions
        this.isPhaseShifting = false;
        this.phaseShiftTimer = 0;
        this.burstCount = 0; // Track burst attacks

        // Death Config
        this.deathExplosionDuration = 4000;
        this.deathHitstopDuration = 250;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -200;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.phase = 1;
        this.isPhaseShifting = false;
        this.phaseShiftAlpha = 1;
        this.burstCount = 0;

        this.timeZones = [];
        this.echoClones = [];
        this.clockMinions = [];

        // Move player to bottom of screen (like NEXUS PRIME)
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 100;
        }

        document.getElementById('boss-name').innerText = "⚠️ TEMPORAL RIFT DETECTED ⚠️";
        document.getElementById('boss-name').style.color = '#ff0000';

        console.log("⏰ CHRONOS: THE MASTER OF TIME AWAKENS ⏰");
    }

    onUpdate(player, dt) {
        // Clock hands animation - faster in later phases
        const clockSpeed = this.phase === 3 ? 2 : this.phase === 2 ? 1.5 : 1;
        this.clockAngle += 0.015 * dt * clockSpeed;
        this.hourHand += 0.008 * dt * clockSpeed;
        this.minuteHand += 0.03 * dt * clockSpeed;
        this.secondHand += 0.1 * dt * clockSpeed;
        this.pulseTimer += dt;
        this.glitchTimer += dt;

        // --- INTRO ---
        if (this.state === 'INTRO') {
            this.handleIntro(player, dt);
            return;
        }

        // --- PHASE SHIFT (Invulnerability) ---
        if (this.isPhaseShifting) {
            this.phaseShiftTimer -= dt;
            this.phaseShiftAlpha = 0.15 + Math.sin(this.phaseShiftTimer * 0.5) * 0.15;

            if (this.phaseShiftTimer <= 0) {
                this.isPhaseShifting = false;
                this.phaseShiftAlpha = 1;
            }
            this.updateTimeZones(player, dt);
            this.updateEchoClones(player, dt);
            this.updateClockMinions(player, dt);
            return;
        }

        // --- PHASE TRANSITIONS ---
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.65 && this.phase === 1) this.enterPhase(2);
        else if (hpPercent <= 0.30 && this.phase === 2) this.enterPhase(3);

        // --- MOVEMENT ---
        this.handleMovement(dt);

        // --- CONTINUOUS SPAWNING (Challenge!) ---
        if (this.phase >= 2 && this.pulseTimer % 120 < 1) {
            this.spawnTimeMinion();
        }

        // --- ATTACKS - Faster cooldown ---
        this.attackTimer += dt;
        const attackCooldown = this.phase === 3 ? 60 : this.phase === 2 ? 80 : 100;

        if (this.state === 'IDLE' && this.attackTimer > attackCooldown) {
            this.chooseAttack();
        }

        this.updateTimeZones(player, dt);
        this.updateEchoClones(player, dt);
        this.updateClockMinions(player, dt);
    }

    handleIntro(player, dt) {
        this.introTimer += dt;

        if (this.introTimer < 180) {
            this.y += (180 - this.y) * 0.015 * dt;

            // Epic time distortion effects
            if (this.introTimer % 8 < 1) {
                const glitchTexts = ['CHRONOS', '∞ ETERNAL ∞', '00:00:00', 'TIME LORD', 'INFINITY', '⏱️⏱️⏱️'];
                document.getElementById('boss-name').innerText =
                    glitchTexts[Math.floor(Math.random() * glitchTexts.length)];
                document.getElementById('boss-name').style.color =
                    `hsl(${Math.random() * 360}, 80%, 60%)`;
            }

            // Spawn convergence particles
            if (this.introTimer % 5 < 1) {
                for (let i = 0; i < 3; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 300;
                    spawnParticles(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist,
                        2, 4, '#00aaff'
                    );
                }
            }
        } else if (this.introTimer < 250) {
            document.getElementById('boss-name').innerText = "⚡ CHRONOS AWAKENS ⚡";
            document.getElementById('boss-name').style.color = '#00aaff';

            // Screen shake effect
            if (this.introTimer % 3 < 1) {
                spawnParticles(this.x, this.y, 5, 5, '#ffffff');
            }
        } else {
            this.state = 'IDLE';
            document.getElementById('boss-name').innerText = BOSS_5_DATA.name;
            document.getElementById('boss-name').style.color = BOSS_5_DATA.colors.phase1;
            createExplosion(this.x, this.y, 200, 0);
            if (window.triggerHitstop) triggerHitstop(30);
            if (window.playSound) playSound('levelup');

            // Spawn initial clock minions
            this.spawnClockMinions(4);
        }
    }

    handleMovement(dt) {
        const speed = this.phase === 3 ? 0.08 : this.phase === 2 ? 0.05 : 0.03;
        const orbitRadius = 150 + Math.sin(this.pulseTimer * 0.015) * 100;

        // More erratic movement in later phases
        const wobble = this.phase === 3 ? Math.sin(this.pulseTimer * 0.1) * 50 : 0;

        const targetX = CANVAS.width / 2 + Math.cos(this.pulseTimer * 0.01) * orbitRadius + wobble;
        const targetY = 180 + Math.sin(this.pulseTimer * 0.008) * 80;

        this.x += (targetX - this.x) * speed * dt;
        this.y += (targetY - this.y) * speed * dt;
    }

    enterPhase(phaseNum) {
        this.phase = phaseNum;
        this.state = 'IDLE';
        this.attackTimer = 0;

        this.isPhaseShifting = true;
        this.phaseShiftTimer = 120;

        const color = phaseNum === 2 ? BOSS_5_DATA.colors.phase2 : BOSS_5_DATA.colors.phase3;
        document.getElementById('boss-name').style.color = color;

        const phaseName = phaseNum === 2 ? 'DISTORTION' : 'SINGULARITY';
        document.getElementById('boss-name').innerText = `⚡ CHRONOS - ${phaseName} ⚡`;

        createExplosion(this.x, this.y, 500, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerHitstop) triggerHitstop(60);

        // Clear and respawn
        this.timeZones = [];
        this.echoClones = [];

        // Phase 2: More clock minions
        if (phaseNum === 2) {
            this.spawnClockMinions(6);
        }
        // Phase 3: LOTS of minions
        else if (phaseNum === 3) {
            this.spawnClockMinions(10);
            // Spawn enemy wave on phase 3
            for (let i = 0; i < 15; i++) {
                setTimeout(() => {
                    const angle = (i / 15) * Math.PI * 2;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(angle) * 200,
                        this.y + Math.sin(angle) * 200,
                        ENEMY_TYPES.SPEEDSTER, 2
                    );
                    enemy.color = '#ff0066';
                    enemy.isDead = false;
                }, i * 50);
            }
        }
    }

    // NEW: Spawn orbiting clock minions
    spawnClockMinions(count) {
        for (let i = 0; i < count; i++) {
            this.clockMinions.push({
                angle: (i / count) * Math.PI * 2,
                orbitRadius: 120 + Math.random() * 40,
                orbitSpeed: 0.02 + Math.random() * 0.01,
                hp: 3,
                maxHp: 3,
                radius: 18,
                fireTimer: Math.random() * 60,
                x: 0,
                y: 0
            });
        }
    }

    // NEW: Spawn time minion enemy
    spawnTimeMinion() {
        // Only spawn from top, left, right - NOT bottom (player is there)
        const side = Math.floor(Math.random() * 3);
        let x, y;

        switch (side) {
            case 0: x = Math.random() * CANVAS.width; y = -30; break; // Top
            case 1: x = CANVAS.width + 30; y = Math.random() * (CANVAS.height * 0.7); break; // Right (upper portion)
            case 2: x = -30; y = Math.random() * (CANVAS.height * 0.7); break; // Left (upper portion)
        }

        const enemy = enemyPool.get(x, y, ENEMY_TYPES.BASIC, 1.5);
        enemy.color = this.getPhaseColor();
        enemy.radius = 12;
        enemy.hp = 2;
        enemy.maxHp = 2;
        enemy.isDead = false;
    }

    chooseAttack() {
        this.state = 'ATTACKING';
        this.attackTimer = 0;

        const attacks = this.getPhaseAttacks();
        const attack = attacks[Math.floor(Math.random() * attacks.length)];
        this.executeAttack(attack);
    }

    getPhaseAttacks() {
        switch (this.phase) {
            case 1: return ['SPIRAL_BURST', 'CLOCK_SWEEP', 'TIME_WAVE', 'MINION_SPAWN'];
            case 2: return ['ECHO_ARMY', 'TEMPORAL_STORM', 'ACCELERATE', 'CLOCK_BOMB'];
            case 3: return ['BULLET_HELL', 'CHAOS_SPIRAL', 'PHASE_BARRAGE', 'DOOMSDAY'];
            default: return ['SPIRAL_BURST'];
        }
    }

    executeAttack(attack) {
        console.log(`CHRONOS ATTACK: ${attack}`);

        switch (attack) {
            case 'SPIRAL_BURST': this.attackSpiralBurst(); break;
            case 'CLOCK_SWEEP': this.attackClockSweep(); break;
            case 'TIME_WAVE': this.attackTimeWave(); break;
            case 'MINION_SPAWN': this.attackMinionSpawn(); break;
            case 'ECHO_ARMY': this.attackEchoArmy(); break;
            case 'TEMPORAL_STORM': this.attackTemporalStorm(); break;
            case 'ACCELERATE': this.attackAccelerate(); break;
            case 'CLOCK_BOMB': this.attackClockBomb(); break;
            case 'BULLET_HELL': this.attackBulletHell(); break;
            case 'CHAOS_SPIRAL': this.attackChaosSpiral(); break;
            case 'PHASE_BARRAGE': this.attackPhaseBarrage(); break;
            case 'DOOMSDAY': this.attackDoomsday(); break;
        }

        const cooldown = this.phase === 3 ? 1500 : 2000;
        setTimeout(() => {
            this.state = 'IDLE';
        }, cooldown);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 1 ATTACKS - Introductory
    // ═══════════════════════════════════════════════════════

    attackSpiralBurst() {
        // Spiral pattern of enemies
        const waves = 3;
        for (let w = 0; w < waves; w++) {
            setTimeout(() => {
                const count = 12;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + (w * 0.3);
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 10;
                    enemy.hp = 1;
                    enemy.color = '#00aaff';
                    enemy.isDead = false;

                    const speed = 4 + w;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                        this.draw();
                    };
                }
                if (window.playSound) playSound('shoot');
            }, w * 300);
        }
    }

    attackClockSweep() {
        // Sweeping arc of bullets like clock hands
        const sweepCount = 30;
        for (let i = 0; i < sweepCount; i++) {
            setTimeout(() => {
                const angle = this.hourHand + (i / sweepCount) * Math.PI;
                const enemy = enemyPool.get(
                    this.x + Math.cos(angle) * 80,
                    this.y + Math.sin(angle) * 80,
                    ENEMY_TYPES.BASIC, 1
                );
                enemy.radius = 12;
                enemy.hp = 1;
                enemy.color = '#88ccff';
                enemy.isDead = false;
                enemy.vx = Math.cos(angle) * 5;
                enemy.vy = Math.sin(angle) * 5;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.draw();
                };
            }, i * 30);
        }
    }

    attackTimeWave() {
        // Horizontal wave of enemies
        const count = 10;
        for (let i = 0; i < count; i++) {
            const enemy = enemyPool.get(
                100 + (CANVAS.width - 200) * (i / count),
                -30,
                ENEMY_TYPES.BASIC, 1
            );
            enemy.radius = 15;
            enemy.hp = 2;
            enemy.maxHp = 2;
            enemy.color = '#00ffff';
            enemy.isDead = false;
        }
        if (window.playSound) playSound('shoot');
    }

    attackMinionSpawn() {
        // Spawn multiple minions around
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                const angle = (i / 8) * Math.PI * 2;
                const dist = 150;
                const enemy = enemyPool.get(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    ENEMY_TYPES.BASIC, 1.2
                );
                enemy.radius = 12;
                enemy.hp = 2;
                enemy.maxHp = 2;
                enemy.color = '#00aaff';
                enemy.isDead = false;
                spawnParticles(enemy.x, enemy.y, 5, 3, '#00aaff');
            }, i * 100);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2 ATTACKS - Challenging
    // ═══════════════════════════════════════════════════════

    attackEchoArmy() {
        // Multiple echo clones that attack
        const count = 5;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            this.echoClones.push({
                x: this.x + Math.cos(angle) * 180,
                y: this.y + Math.sin(angle) * 180,
                angle: angle,
                alpha: 0.7,
                life: 400,
                fireTimer: 20 + i * 30,
                burstMode: true
            });
        }
        createExplosion(this.x, this.y, 100, 0);
        if (window.playSound) playSound('powerup');
    }

    attackTemporalStorm() {
        // Rain of enemies from all directions
        for (let wave = 0; wave < 4; wave++) {
            setTimeout(() => {
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2 + wave * 0.5;
                    const dist = 400;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist,
                        ENEMY_TYPES.SPEEDSTER, 1.5
                    );
                    enemy.color = '#aa00ff';
                    enemy.isDead = false;
                }
            }, wave * 200);
        }
    }

    attackAccelerate() {
        // Speed up all existing enemies + spawn more
        enemyPool.getActive().forEach(enemy => {
            if (!enemy.isDead) {
                enemy.speed = (enemy.speed || 1) * 1.8;
            }
        });

        // Spawn fast enemies
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2;
            const enemy = enemyPool.get(
                this.x + Math.cos(angle) * 100,
                this.y + Math.sin(angle) * 100,
                ENEMY_TYPES.SPEEDSTER, 2
            );
            enemy.color = '#ffaa00';
            enemy.isDead = false;
        }

        createExplosion(this.x, this.y, 150, 0);
    }

    attackClockBomb() {
        // Delayed explosion zones
        for (let i = 0; i < 5; i++) {
            const zoneX = Math.random() * (CANVAS.width - 200) + 100;
            const zoneY = Math.random() * (CANVAS.height - 200) + 100;

            this.timeZones.push({
                x: zoneX,
                y: zoneY,
                radius: 0,
                maxRadius: 100,
                type: 'bomb',
                life: 180,
                color: 'rgba(255, 0, 100, 0.3)',
                spawned: false
            });

            // After delay, spawn enemies at zone
            setTimeout(() => {
                for (let j = 0; j < 5; j++) {
                    const angle = (j / 5) * Math.PI * 2;
                    const enemy = enemyPool.get(
                        zoneX + Math.cos(angle) * 30,
                        zoneY + Math.sin(angle) * 30,
                        ENEMY_TYPES.BASIC, 1
                    );
                    enemy.radius = 10;
                    enemy.hp = 1;
                    enemy.color = '#ff0066';
                    enemy.isDead = false;
                }
                createExplosion(zoneX, zoneY, 80, 0);
            }, 1500);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3 ATTACKS - BRUTAL
    // ═══════════════════════════════════════════════════════

    attackBulletHell() {
        // Massive bullet hell pattern
        this.burstCount++;
        const totalWaves = 8;

        for (let w = 0; w < totalWaves; w++) {
            setTimeout(() => {
                const bulletCount = 20;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (i / bulletCount) * Math.PI * 2 + (w * 0.2);
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 8;
                    enemy.hp = 1;
                    enemy.color = '#ff0066';
                    enemy.isDead = false;

                    const speed = 3 + (w % 2) * 2;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                        this.draw();
                    };
                }
            }, w * 150);
        }
    }

    attackChaosSpiral() {
        // Double spiral pattern
        const arms = 2;
        const bulletsPerArm = 25;

        for (let arm = 0; arm < arms; arm++) {
            for (let i = 0; i < bulletsPerArm; i++) {
                setTimeout(() => {
                    const baseAngle = (arm / arms) * Math.PI * 2;
                    const spiralAngle = baseAngle + (i / bulletsPerArm) * Math.PI * 3;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 10;
                    enemy.hp = 1;
                    enemy.color = arm === 0 ? '#ff0066' : '#aa00ff';
                    enemy.isDead = false;

                    enemy.vx = Math.cos(spiralAngle) * 4;
                    enemy.vy = Math.sin(spiralAngle) * 4;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                        this.draw();
                    };
                }, i * 40 + arm * 20);
            }
        }
    }

    attackPhaseBarrage() {
        // Rapid teleport attacks with enemy spawns
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                // Teleport boss
                this.phaseShiftAlpha = 0.2;
                const angle = Math.random() * Math.PI * 2;
                this.x = CANVAS.width / 2 + Math.cos(angle) * 180;
                this.y = 180 + Math.sin(angle) * 80;

                // Spawn enemies at new position
                for (let j = 0; j < 4; j++) {
                    const spawnAngle = (j / 4) * Math.PI * 2;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(spawnAngle) * 60,
                        this.y + Math.sin(spawnAngle) * 60,
                        ENEMY_TYPES.BASIC, 1
                    );
                    enemy.radius = 10;
                    enemy.hp = 1;
                    enemy.color = '#ff0066';
                    enemy.isDead = false;
                }

                spawnParticles(this.x, this.y, 10, 4, '#ff0066');

                setTimeout(() => {
                    this.phaseShiftAlpha = 1;
                }, 80);
            }, i * 120);
        }
    }

    attackDoomsday() {
        // Ultimate attack - massive enemy spawn + screen chaos
        if (window.triggerHitstop) triggerHitstop(50);
        createExplosion(this.x, this.y, 300, 0);

        // Spawn enemies from center
        for (let wave = 0; wave < 5; wave++) {
            setTimeout(() => {
                const count = 12 + wave * 3;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 8 + wave;
                    enemy.hp = 1;
                    enemy.color = wave % 2 === 0 ? '#ff0066' : '#aa00ff';
                    enemy.isDead = false;

                    const speed = 3 + wave * 0.5;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                        this.draw();
                    };
                }
                if (window.playSound) playSound('shoot');
            }, wave * 300);
        }

        // Also spawn from edges
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                // Only spawn from top, left, right - NOT bottom (player is there)
                const side = Math.floor(Math.random() * 3);
                let x, y;
                switch (side) {
                    case 0: x = Math.random() * CANVAS.width; y = -20; break; // Top
                    case 1: x = CANVAS.width + 20; y = Math.random() * (CANVAS.height * 0.7); break; // Right
                    case 2: x = -20; y = Math.random() * (CANVAS.height * 0.7); break; // Left
                }
                const enemy = enemyPool.get(x, y, ENEMY_TYPES.SPEEDSTER, 2);
                enemy.color = '#ff3300';
                enemy.isDead = false;
            }, i * 80);
        }
    }

    // ═══════════════════════════════════════════════════════
    // UPDATERS
    // ═══════════════════════════════════════════════════════

    updateTimeZones(player, dt) {
        for (let i = this.timeZones.length - 1; i >= 0; i--) {
            const zone = this.timeZones[i];
            zone.life -= dt;

            if (zone.radius < zone.maxRadius) {
                zone.radius += 3 * dt;
            }

            if (zone.life <= 0) {
                this.timeZones.splice(i, 1);
            }
        }
    }

    updateEchoClones(player, dt) {
        for (let i = this.echoClones.length - 1; i >= 0; i--) {
            const clone = this.echoClones[i];
            clone.life -= dt;
            clone.angle += 0.015 * dt;

            clone.x = this.x + Math.cos(clone.angle) * 160;
            clone.y = this.y + Math.sin(clone.angle) * 160;

            // Aggressive firing
            clone.fireTimer -= dt;
            if (clone.fireTimer <= 0 && typeof player !== 'undefined') {
                clone.fireTimer = clone.burstMode ? 40 : 60;

                const aimAngle = Math.atan2(player.y - clone.y, player.x - clone.x);
                const enemy = enemyPool.get(clone.x, clone.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 10;
                enemy.hp = 1;
                enemy.color = this.getPhaseColor();
                enemy.isDead = false;
                enemy.vx = Math.cos(aimAngle) * 5;
                enemy.vy = Math.sin(aimAngle) * 5;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.draw();
                };
            }

            clone.alpha = Math.min(0.7, clone.life / 100);

            if (clone.life <= 0) {
                this.echoClones.splice(i, 1);
            }
        }
    }

    updateClockMinions(player, dt) {
        for (let i = this.clockMinions.length - 1; i >= 0; i--) {
            const minion = this.clockMinions[i];

            // Orbit around boss
            minion.angle += minion.orbitSpeed * dt;
            minion.x = this.x + Math.cos(minion.angle) * minion.orbitRadius;
            minion.y = this.y + Math.sin(minion.angle) * minion.orbitRadius;

            // Fire at player
            minion.fireTimer -= dt;
            if (minion.fireTimer <= 0 && typeof player !== 'undefined') {
                minion.fireTimer = 80;
                const aimAngle = Math.atan2(player.y - minion.y, player.x - minion.x);
                const enemy = enemyPool.get(minion.x, minion.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 8;
                enemy.hp = 1;
                enemy.color = this.getPhaseColor();
                enemy.isDead = false;
                enemy.vx = Math.cos(aimAngle) * 4;
                enemy.vy = Math.sin(aimAngle) * 4;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.draw();
                };
            }

            // Player collision with minion
            if (typeof player !== 'undefined' && gameState.gameActive) {
                const dist = Math.hypot(player.x - minion.x, player.y - minion.y);
                if (dist < minion.radius + player.radius) {
                    if (gameState.playerStats.shield > 0) {
                        gameState.playerStats.shield--;
                        updateShieldIndicator(gameState.playerStats.shield);
                        minion.hp = 0;
                    } else if (!gameState.godMode) {
                        startDeathSequence();
                    }
                }
            }

            if (minion.hp <= 0) {
                spawnParticles(minion.x, minion.y, 8, 3, this.getPhaseColor());
                this.clockMinions.splice(i, 1);
            }
        }
    }

    takeDamage(amount) {
        if (this.state === 'INTRO' || this.isPhaseShifting) return;
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.timeZones = [];
        this.echoClones = [];
        this.clockMinions = [];

        // Return player to center of screen
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }

        // EPIC death sequence
        if (window.triggerHitstop) triggerHitstop(150);

        // Multiple explosion waves
        for (let wave = 0; wave < 8; wave++) {
            setTimeout(() => {
                for (let i = 0; i < 16; i++) {
                    const angle = (i / 16) * Math.PI * 2 + wave * 0.2;
                    createExplosion(
                        this.x + Math.cos(angle) * (80 + wave * 60),
                        this.y + Math.sin(angle) * (80 + wave * 60),
                        100, 0
                    );
                }
            }, wave * 150);
        }
    }

    onDraw() {
        // Draw time zones
        this.timeZones.forEach(zone => {
            CTX.save();
            CTX.beginPath();
            CTX.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            CTX.fillStyle = zone.color;
            CTX.fill();

            CTX.strokeStyle = zone.type === 'bomb' ? '#ff0066' : this.getPhaseColor();
            CTX.lineWidth = 3;
            CTX.setLineDash([10, 5]);
            CTX.stroke();
            CTX.setLineDash([]);
            CTX.restore();
        });

        // Draw echo clones
        this.echoClones.forEach(clone => {
            CTX.save();
            CTX.globalAlpha = clone.alpha;
            CTX.translate(clone.x, clone.y);

            CTX.shadowBlur = 20;
            CTX.shadowColor = this.getPhaseColor();
            CTX.fillStyle = this.getPhaseColor();

            CTX.beginPath();
            CTX.arc(0, 0, 35, 0, Math.PI * 2);
            CTX.fill();

            // Mini clock
            CTX.strokeStyle = '#fff';
            CTX.lineWidth = 2;
            CTX.beginPath();
            CTX.moveTo(0, 0);
            CTX.lineTo(Math.cos(this.minuteHand) * 20, Math.sin(this.minuteHand) * 20);
            CTX.stroke();

            CTX.restore();
        });

        // Draw clock minions
        this.clockMinions.forEach(minion => {
            CTX.save();
            CTX.translate(minion.x, minion.y);

            CTX.shadowBlur = 15;
            CTX.shadowColor = this.getPhaseColor();

            // Gear shape
            CTX.fillStyle = this.getPhaseColor();
            CTX.beginPath();
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + this.clockAngle;
                const r = i % 2 === 0 ? minion.radius : minion.radius * 0.7;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) CTX.moveTo(x, y);
                else CTX.lineTo(x, y);
            }
            CTX.closePath();
            CTX.fill();

            // HP bar
            if (minion.hp < minion.maxHp) {
                const hpPercent = minion.hp / minion.maxHp;
                CTX.fillStyle = hpPercent > 0.5 ? '#00ff00' : '#ff0000';
                CTX.fillRect(-10, -minion.radius - 8, 20 * hpPercent, 4);
            }

            CTX.restore();
        });

        // Draw main boss
        CTX.save();
        CTX.globalAlpha = this.phaseShiftAlpha;
        CTX.translate(this.x, this.y);

        // Glitch effect in phase 3
        if (this.phase === 3 && Math.random() < 0.1) {
            CTX.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
        }

        // Outer rotating ring
        CTX.save();
        CTX.rotate(this.clockAngle);
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 5;
        CTX.setLineDash([20, 10]);
        CTX.beginPath();
        CTX.arc(0, 0, this.radius + 30, 0, Math.PI * 2);
        CTX.stroke();
        CTX.setLineDash([]);
        CTX.restore();

        // Inner rotating ring (opposite direction)
        CTX.save();
        CTX.rotate(-this.clockAngle * 1.5);
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 3;
        CTX.setLineDash([10, 15]);
        CTX.beginPath();
        CTX.arc(0, 0, this.radius + 15, 0, Math.PI * 2);
        CTX.stroke();
        CTX.setLineDash([]);
        CTX.restore();

        // Clock face
        CTX.shadowBlur = 40;
        CTX.shadowColor = this.getPhaseColor();

        CTX.fillStyle = '#0a0a0a';
        CTX.beginPath();
        CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
        CTX.fill();

        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 6;
        CTX.stroke();

        // Clock markings
        CTX.strokeStyle = '#ffffff';
        CTX.lineWidth = 3;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const inner = this.radius - 18;
            const outer = this.radius - 6;
            CTX.beginPath();
            CTX.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            CTX.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            CTX.stroke();
        }

        // Hour hand
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 8;
        CTX.lineCap = 'round';
        CTX.beginPath();
        CTX.moveTo(0, 0);
        CTX.lineTo(
            Math.cos(this.hourHand - Math.PI / 2) * (this.radius * 0.4),
            Math.sin(this.hourHand - Math.PI / 2) * (this.radius * 0.4)
        );
        CTX.stroke();

        // Minute hand
        CTX.strokeStyle = '#ffffff';
        CTX.lineWidth = 5;
        CTX.beginPath();
        CTX.moveTo(0, 0);
        CTX.lineTo(
            Math.cos(this.minuteHand - Math.PI / 2) * (this.radius * 0.6),
            Math.sin(this.minuteHand - Math.PI / 2) * (this.radius * 0.6)
        );
        CTX.stroke();

        // Second hand
        CTX.strokeStyle = '#ff0000';
        CTX.lineWidth = 2;
        CTX.beginPath();
        CTX.moveTo(0, 0);
        CTX.lineTo(
            Math.cos(this.secondHand - Math.PI / 2) * (this.radius * 0.7),
            Math.sin(this.secondHand - Math.PI / 2) * (this.radius * 0.7)
        );
        CTX.stroke();

        // Center gem
        const gemGlow = 0.5 + Math.sin(this.pulseTimer * 0.1) * 0.3;
        CTX.shadowBlur = 20;
        CTX.shadowColor = this.getPhaseColor();
        CTX.fillStyle = this.getPhaseColor();
        CTX.globalAlpha = gemGlow;
        CTX.beginPath();
        CTX.arc(0, 0, 12, 0, Math.PI * 2);
        CTX.fill();

        CTX.globalAlpha = 1;
        CTX.fillStyle = '#ffffff';
        CTX.beginPath();
        CTX.arc(0, 0, 6, 0, Math.PI * 2);
        CTX.fill();

        CTX.restore();
    }

    getPhaseColor() {
        switch (this.phase) {
            case 1: return BOSS_5_DATA.colors.phase1;
            case 2: return BOSS_5_DATA.colors.phase2;
            case 3: return BOSS_5_DATA.colors.phase3;
            default: return '#ffffff';
        }
    }
}

const boss5 = new BossChronos();
window.boss5 = boss5;
