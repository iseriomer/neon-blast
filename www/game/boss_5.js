// game/boss_5.js - CHRONOS - Time Lord Boss (Level 40) - ENHANCED VERSION

const BOSS_5_DATA = {
    name: 'CHRONOS',
    hp: 5000, // Increased HP
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
        this.deathExplosionDuration = 2000;
        this.deathHitstopDuration = 120;
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

        document.getElementById('boss-name').innerText = "TEMPORAL RIFT";
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
            document.getElementById('boss-name').innerText = "CHRONOS AWAKENS";
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
        document.getElementById('boss-name').innerText = `CHRONOS`;

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

    // NEW: Spawn orbiting clock minions using Enemy class
    spawnClockMinions(count) {
        for (let i = 0; i < count; i++) {
            const minionAngle = (i / count) * Math.PI * 2;
            const orbitRadius = 120 + Math.random() * 40;
            const startX = this.x + Math.cos(minionAngle) * orbitRadius;
            const startY = this.y + Math.sin(minionAngle) * orbitRadius;

            const minion = enemyPool.get(startX, startY, ENEMY_TYPES.BASIC, 1);
            minion.isClockMinion = true;
            minion.minionAngle = minionAngle;
            minion.orbitRadius = orbitRadius;
            minion.orbitSpeed = 0.02 + Math.random() * 0.01;
            minion.hp = 80;
            minion.maxHp = 80;
            minion.radius = 18;
            minion.fireTimer = Math.random() * 60;
            minion.bossRef = this;
            minion.color = this.getPhaseColor();

            // Custom update - orbit and fire
            minion.update = function (player, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }

                this.minionAngle += this.orbitSpeed * dt;
                this.x = this.bossRef.x + Math.cos(this.minionAngle) * this.orbitRadius;
                this.y = this.bossRef.y + Math.sin(this.minionAngle) * this.orbitRadius;

                this.fireTimer -= dt;
                if (this.fireTimer <= 0 && typeof player !== 'undefined') {
                    this.fireTimer = 100;
                    const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    bullet.radius = 8;
                    bullet.hp = 25;
                    bullet.maxHp = 25;
                    bullet.color = this.bossRef.getPhaseColor();
                    bullet.isDead = false;
                    bullet.vx = Math.cos(aimAngle) * 4;
                    bullet.vy = Math.sin(aimAngle) * 4;
                    bullet.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
            };

            // Custom draw - gear shape
            minion.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);

                CTX.shadowBlur = 15;
                CTX.shadowColor = this.bossRef.getPhaseColor();

                CTX.fillStyle = this.bossRef.getPhaseColor();
                CTX.beginPath();
                for (let j = 0; j < 8; j++) {
                    const angle = (j / 8) * Math.PI * 2 + this.bossRef.clockAngle;
                    const r = j % 2 === 0 ? this.radius : this.radius * 0.7;
                    const x = Math.cos(angle) * r;
                    const y = Math.sin(angle) * r;
                    if (j === 0) CTX.moveTo(x, y);
                    else CTX.lineTo(x, y);
                }
                CTX.closePath();
                CTX.fill();

                if (this.hp < this.maxHp) {
                    const hpPercent = this.hp / this.maxHp;
                    CTX.fillStyle = hpPercent > 0.5 ? '#00ff00' : '#ff0000';
                    CTX.fillRect(-10, -this.radius - 8, 20 * hpPercent, 4);
                }

                CTX.restore();
            };

            this.clockMinions.push(minion);
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
        enemy.hp = 50;
        enemy.maxHp = 50;
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
    // PHASE 1 ATTACKS - SKILL-TESTING
    // ═══════════════════════════════════════════════════════

    attackSpiralBurst() {
        // Spiral pattern with GAP - player must find safe angle
        const gapAngle = Math.random() * Math.PI * 2;
        const gapSize = 0.7; // ~40 degree gap

        for (let w = 0; w < 2; w++) {
            setTimeout(() => {
                const count = 10;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + (w * 0.2);

                    // Skip enemies in gap zone
                    const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (angleDiff < gapSize / 2) continue;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 10;
                    enemy.hp = 30;
                    enemy.maxHp = 30;
                    enemy.color = '#00aaff';
                    enemy.isDead = false;

                    const speed = 3.5 + w * 0.5;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, w * 400);
        }
    }

    attackClockSweep() {
        // TELEGRAPHED sweeping arc with warning line first
        const sweepStart = this.hourHand;

        // Warning particles along sweep path
        for (let i = 0; i < 10; i++) {
            const angle = sweepStart + (i / 10) * Math.PI * 0.8;
            spawnParticles(
                this.x + Math.cos(angle) * 100,
                this.y + Math.sin(angle) * 100,
                3, 6, '#ff0000'
            );
        }

        // Delayed actual bullets
        setTimeout(() => {
            const sweepCount = 12;
            for (let i = 0; i < sweepCount; i++) {
                setTimeout(() => {
                    const angle = sweepStart + (i / sweepCount) * Math.PI * 0.8;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(angle) * 60,
                        this.y + Math.sin(angle) * 60,
                        ENEMY_TYPES.BASIC, 1
                    );
                    enemy.radius = 12;
                    enemy.hp = 25;
                    enemy.maxHp = 25;
                    enemy.color = '#88ccff';
                    enemy.isDead = false;
                    enemy.vx = Math.cos(angle) * 4;
                    enemy.vy = Math.sin(angle) * 4;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }, i * 40);
            }
        }, 400);
    }

    attackTimeWave() {
        // Horizontal wave with DESTROYABLE gaps
        const gapPos = Math.floor(Math.random() * 4) + 3; // Gap position 3-6
        const count = 8;

        // Warning indicator
        for (let i = 0; i < count; i++) {
            if (i >= gapPos && i < gapPos + 2) continue;
            const x = 80 + (CANVAS.width - 160) * (i / (count - 1));
            spawnParticles(x, 50, 4, 6, '#ff0000');
        }

        // Delayed spawn
        setTimeout(() => {
            for (let i = 0; i < count; i++) {
                if (i >= gapPos && i < gapPos + 2) continue; // Gap

                const enemy = enemyPool.get(
                    80 + (CANVAS.width - 160) * (i / (count - 1)),
                    -30,
                    ENEMY_TYPES.BASIC, 1
                );
                enemy.radius = 15;
                enemy.hp = 35;
                enemy.maxHp = 35;
                enemy.color = '#00ffff';
                enemy.isDead = false;
            }
            if (window.playSound) playSound('shoot');
        }, 350);
    }

    attackMinionSpawn() {
        // Fewer minions with INDICATOR
        const count = 5;

        // Show indicators first
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dist = 130;
            spawnParticles(
                this.x + Math.cos(angle) * dist,
                this.y + Math.sin(angle) * dist,
                5, 8, '#ff0000'
            );
        }

        // Delayed spawn
        setTimeout(() => {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const dist = 130;
                const enemy = enemyPool.get(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    ENEMY_TYPES.BASIC, 1
                );
                enemy.radius = 12;
                enemy.hp = 40;
                enemy.maxHp = 40;
                enemy.color = '#00aaff';
                enemy.isDead = false;
            }
            if (window.playSound) playSound('shoot');
        }, 400);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2 ATTACKS - SKILL-TESTING
    // ═══════════════════════════════════════════════════════

    attackEchoArmy() {
        // DESTROYABLE echo clones with HP bars - priority targets!
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const startX = this.x + Math.cos(angle) * 150;
            const startY = this.y + Math.sin(angle) * 150;

            const clone = enemyPool.get(startX, startY, ENEMY_TYPES.TANK, 1);
            clone.isEchoClone = true;
            clone.cloneAngle = angle;
            clone.bossRef = this;
            clone.radius = 30;
            clone.hp = 100;
            clone.maxHp = 100;
            clone.fireTimer = 60;
            clone.color = this.getPhaseColor();

            clone.update = function (player, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }

                this.cloneAngle += 0.012 * dt;
                this.x = this.bossRef.x + Math.cos(this.cloneAngle) * 140;
                this.y = this.bossRef.y + Math.sin(this.cloneAngle) * 140;

                this.fireTimer -= dt;
                if (this.fireTimer <= 0 && typeof player !== 'undefined') {
                    this.fireTimer = 80;
                    const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    bullet.radius = 8;
                    bullet.hp = 20;
                    bullet.maxHp = 20;
                    bullet.color = this.bossRef.getPhaseColor();
                    bullet.isDead = false;
                    bullet.vx = Math.cos(aimAngle) * 4;
                    bullet.vy = Math.sin(aimAngle) * 4;
                    bullet.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
            };

            clone.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);
                CTX.shadowBlur = 15;
                CTX.shadowColor = this.bossRef.getPhaseColor();
                CTX.fillStyle = this.bossRef.getPhaseColor();
                CTX.beginPath();
                CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                CTX.fill();
                // HP bar
                const hpPct = this.hp / this.maxHp;
                CTX.fillStyle = hpPct > 0.5 ? '#00ff00' : '#ff0000';
                CTX.fillRect(-20, -this.radius - 10, 40 * hpPct, 5);
                CTX.restore();
            };

            this.echoClones.push(clone);
        }
        createExplosion(this.x, this.y, 80, 0);
        if (window.playSound) playSound('powerup');
    }

    attackTemporalStorm() {
        // TELEGRAPHED spawn positions with warning indicators
        const spawnPoints = [];
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
            const dist = 250;
            spawnPoints.push({
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                angle: angle
            });
        }

        // Show warning indicators
        spawnPoints.forEach(pt => {
            spawnParticles(pt.x, pt.y, 6, 10, '#ff0000');
        });

        // Delayed spawn
        setTimeout(() => {
            spawnPoints.forEach(pt => {
                const enemy = enemyPool.get(pt.x, pt.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 14;
                enemy.hp = 35;
                enemy.maxHp = 35;
                enemy.color = '#aa00ff';
                enemy.isDead = false;
            });
            if (window.playSound) playSound('shoot');
        }, 500);
    }

    attackAccelerate() {
        // TIME FREEZE then burst - warning visual first
        spawnParticles(this.x, this.y, 20, 12, '#ffaa00');

        setTimeout(() => {
            // Radial burst with gaps
            const gapAngle = Math.random() * Math.PI * 2;
            const count = 12;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                if (angleDiff < 0.4) continue; // Gap

                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1);
                enemy.radius = 10;
                enemy.hp = 30;
                enemy.maxHp = 30;
                enemy.color = '#ffaa00';
                enemy.isDead = false;
                enemy.vx = Math.cos(angle) * 5;
                enemy.vy = Math.sin(angle) * 5;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                };
            }
            createExplosion(this.x, this.y, 120, 0);
            if (window.playSound) playSound('shoot');
        }, 400);
    }

    attackClockBomb() {
        // Fewer zones with better telegraphing
        const zoneCount = 3;
        for (let i = 0; i < zoneCount; i++) {
            let zoneX = 150 + (CANVAS.width - 300) * (i / (zoneCount - 1 || 1));
            let zoneY = 200 + Math.random() * 150;

            // Visual warning zone
            this.timeZones.push({
                x: zoneX,
                y: zoneY,
                radius: 0,
                maxRadius: 80,
                type: 'bomb',
                life: 150,
                color: 'rgba(255, 0, 100, 0.4)',
                spawned: false
            });

            // Delayed spawn - fewer enemies
            setTimeout(() => {
                for (let j = 0; j < 3; j++) {
                    const angle = (j / 3) * Math.PI * 2;
                    const enemy = enemyPool.get(
                        zoneX + Math.cos(angle) * 25,
                        zoneY + Math.sin(angle) * 25,
                        ENEMY_TYPES.BASIC, 1
                    );
                    enemy.radius = 10;
                    enemy.hp = 30;
                    enemy.maxHp = 30;
                    enemy.color = '#ff0066';
                    enemy.isDead = false;
                }
                createExplosion(zoneX, zoneY, 60, 0);
            }, 1200);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3 ATTACKS - SKILL-TESTING INTENSE
    // ═══════════════════════════════════════════════════════

    attackBulletHell() {
        // Reduced waves with GAPS for dodging
        const totalWaves = 4;
        const gapAngle = Math.random() * Math.PI * 2;

        for (let w = 0; w < totalWaves; w++) {
            setTimeout(() => {
                const bulletCount = 12;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = (i / bulletCount) * Math.PI * 2 + (w * 0.25);

                    // Gap check
                    const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (angleDiff < 0.5) continue;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 8;
                    enemy.hp = 25;
                    enemy.maxHp = 25;
                    enemy.color = '#ff0066';
                    enemy.isDead = false;

                    const speed = 3 + (w % 2);
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, w * 200);
        }
    }

    attackChaosSpiral() {
        // Reduced spiral with destroyable nodes
        const arms = 2;
        const bulletsPerArm = 12;

        for (let arm = 0; arm < arms; arm++) {
            for (let i = 0; i < bulletsPerArm; i++) {
                setTimeout(() => {
                    const baseAngle = (arm / arms) * Math.PI + this.clockAngle;
                    const spiralAngle = baseAngle + (i / bulletsPerArm) * Math.PI * 2;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 10;
                    enemy.hp = 25;
                    enemy.maxHp = 25;
                    enemy.color = arm === 0 ? '#ff0066' : '#aa00ff';
                    enemy.isDead = false;

                    enemy.vx = Math.cos(spiralAngle) * 3.5;
                    enemy.vy = Math.sin(spiralAngle) * 3.5;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }, i * 50 + arm * 25);
            }
        }
    }

    attackPhaseBarrage() {
        // Fewer teleports with TELEGRAPHED delayed bursts
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                const oldX = this.x;
                const oldY = this.y;

                // Teleport boss
                this.phaseShiftAlpha = 0.3;
                const angle = Math.random() * Math.PI * 2;
                this.x = CANVAS.width / 2 + Math.cos(angle) * 140;
                this.y = 170 + Math.sin(angle) * 60;

                // Warning at old position
                spawnParticles(oldX, oldY, 8, 8, '#ff0000');

                // Delayed burst from old position
                setTimeout(() => {
                    for (let j = 0; j < 6; j++) {
                        const burstAngle = (j / 6) * Math.PI * 2;
                        const enemy = enemyPool.get(oldX, oldY, ENEMY_TYPES.BASIC, 1);
                        enemy.radius = 10;
                        enemy.hp = 25;
                        enemy.maxHp = 25;
                        enemy.color = '#ff0066';
                        enemy.isDead = false;
                        enemy.vx = Math.cos(burstAngle) * 4;
                        enemy.vy = Math.sin(burstAngle) * 4;
                        enemy.update = function (p, d) {
                            this.x += this.vx * d;
                            this.y += this.vy * d;
                        };
                    }
                }, 350);

                setTimeout(() => { this.phaseShiftAlpha = 1; }, 120);
            }, i * 400);
        }
    }

    attackDoomsday() {
        // Multi-phase finale: Spiral → Ring → Burst. All destroyable!
        createExplosion(this.x, this.y, 200, 0);

        // Phase 1: Spiral
        const spiralCount = 10;
        for (let i = 0; i < spiralCount; i++) {
            setTimeout(() => {
                const angle = (i / spiralCount) * Math.PI * 3 + this.clockAngle;
                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 10;
                enemy.hp = 25;
                enemy.maxHp = 25;
                enemy.color = '#ff0066';
                enemy.isDead = false;
                enemy.vx = Math.cos(angle) * 3.5;
                enemy.vy = Math.sin(angle) * 3.5;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                };
            }, i * 50);
        }

        // Phase 2: Ring (delayed)
        setTimeout(() => {
            const ringCount = 12;
            const gapAngle = Math.random() * Math.PI * 2;
            for (let i = 0; i < ringCount; i++) {
                const angle = (i / ringCount) * Math.PI * 2;
                const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                if (angleDiff < 0.5) continue;

                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 12;
                enemy.hp = 30;
                enemy.maxHp = 30;
                enemy.color = '#aa00ff';
                enemy.isDead = false;
                enemy.vx = Math.cos(angle) * 3;
                enemy.vy = Math.sin(angle) * 3;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                };
            }
            if (window.playSound) playSound('shoot');
        }, 600);

        // Phase 3: Targeted burst
        setTimeout(() => {
            const targetPlayer = typeof player !== 'undefined' ? player : { x: CANVAS.width / 2, y: CANVAS.height - 100 };
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const aimAngle = Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x);
                    const spreadAngle = aimAngle + (Math.random() - 0.5) * 0.6;
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1);
                    enemy.radius = 12;
                    enemy.hp = 35;
                    enemy.maxHp = 35;
                    enemy.color = '#ff3300';
                    enemy.isDead = false;
                    enemy.vx = Math.cos(spreadAngle) * 5;
                    enemy.vy = Math.sin(spreadAngle) * 5;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }, i * 80);
            }
        }, 1100);
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
        // Clean up dead clones (Enemy update handles movement/firing now)
        this.echoClones = this.echoClones.filter(clone => !clone.isDead && clone.hp > 0 && clone.life > 0);
    }

    updateClockMinions(player, dt) {
        // Clean up dead minions (Enemy update handles movement/firing now)
        this.clockMinions = this.clockMinions.filter(minion => !minion.isDead && minion.hp > 0);
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
        // Time zones draw themselves via custom draw() method

        // Echo clones draw themselves via custom draw() method

        // Clock minions draw themselves via custom draw() method

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
