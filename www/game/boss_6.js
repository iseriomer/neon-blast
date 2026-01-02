// game/boss_6.js - VOID REAPER - The Final Boss (Level 45)

const BOSS_6_DATA = {
    name: 'VOID REAPER',
    hp: 7500, // Ultimate boss HP
    score: 25000,
    colors: {
        phase1: '#6600ff', // Deep purple
        phase2: '#cc00ff', // Dark magenta
        phase3: '#ffffff', // White (event horizon)
        phase4: '#ff0033'  // Blood red
    }
};

class BossVoidReaper extends BossBase {
    constructor() {
        super();
        this.name = BOSS_6_DATA.name;
        this.maxHp = BOSS_6_DATA.hp;
        this.score = BOSS_6_DATA.score;
        this.radius = 90; // Massive hitbox

        // Visuals
        this.coreAngle = 0;
        this.eventHorizonRadius = 0;
        this.pulseTimer = 0;
        this.distortionIntensity = 0;
        this.voidParticles = [];
        this.glitchTimer = 0;

        // Combat
        this.state = 'IDLE';
        this.introTimer = 0;
        this.voidOrbitals = [];
        this.realityTears = [];
        this.voidClones = [];
        this.gravityWells = [];
        this.isPhaseShifting = false;
        this.phaseShiftTimer = 0;
        this.phaseShiftAlpha = 1;

        // Gravitational mechanics
        this.gravitationalPull = 0;
        this.pullRadius = 400;

        // Death Config
        this.deathExplosionDuration = 6000; // Epic death
        this.deathHitstopDuration = 300;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -250;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.phase = 1;
        this.isPhaseShifting = false;
        this.phaseShiftAlpha = 1;

        this.voidOrbitals = [];
        this.realityTears = [];
        this.voidClones = [];
        this.gravityWells = [];
        this.voidParticles = [];

        // Move player to bottom of screen
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 100;
        }

        document.getElementById('boss-name').innerText = "VOID ANOMALY";
        document.getElementById('boss-name').style.color = '#ff0000';

        console.log("🌌 VOID REAPER: THE END OF ALL THINGS 🌌");

        // Spawn initial void orbitals
        this.spawnVoidOrbitals(12);
    }

    spawnVoidOrbitals(count) {
        for (let i = 0; i < count; i++) {
            const orbAngle = (i / count) * Math.PI * 2;
            const orbRadius = 130 + (i % 3) * 20;
            const startX = this.x + Math.cos(orbAngle) * orbRadius;
            const startY = this.y + Math.sin(orbAngle) * orbRadius;

            const orbital = enemyPool.get(startX, startY, ENEMY_TYPES.BASIC, 1);
            orbital.isVoidOrbital = true;
            orbital.orbAngle = orbAngle;
            orbital.orbitRadius = orbRadius;
            orbital.orbitSpeed = 0.008 + (i % 2) * 0.004;
            orbital.radius = 12;
            orbital.pulsePhase = Math.random() * Math.PI * 2;
            orbital.bossRef = this;
            orbital.hp = 999999; // Indestructible visual
            orbital.maxHp = 999999;
            orbital.color = '#6600ff';

            orbital.update = function (player, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.orbAngle += this.orbitSpeed * dt;
                this.pulsePhase += 0.05 * dt;
                this.x = this.bossRef.x + Math.cos(this.orbAngle) * this.orbitRadius;
                this.y = this.bossRef.y + Math.sin(this.orbAngle) * this.orbitRadius;
            }; // Void orbitals draw themselves via custom draw() method

            orbital.draw = function () {
                const pulse = 1 + Math.sin(this.pulsePhase) * 0.3;
                CTX.save();
                CTX.translate(this.x, this.y);
                CTX.shadowBlur = 15;
                CTX.shadowColor = '#6600ff';
                CTX.fillStyle = '#6600ff';
                CTX.beginPath();
                CTX.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
                CTX.fill();
                CTX.restore();
            };

            this.voidOrbitals.push(orbital);
        }
    }

    onUpdate(player, dt) {
        // Core animation
        this.coreAngle += 0.01 * dt;
        this.pulseTimer += dt;
        this.glitchTimer += dt;
        this.distortionIntensity = 0.3 + Math.sin(this.pulseTimer * 0.05) * 0.2;

        // Event horizon pulsing
        this.eventHorizonRadius = this.radius + 30 + Math.sin(this.pulseTimer * 0.08) * 15;

        // Update void orbitals
        this.voidOrbitals.forEach(orbital => {
            orbital.angle += orbital.orbitSpeed * dt;
            orbital.pulsePhase += 0.05 * dt;
        });

        // Spawn void particles
        if (this.pulseTimer % 3 < 1) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 300 + Math.random() * 200;
            this.voidParticles.push({
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                life: 100 + Math.random() * 50,
                speed: 2 + Math.random()
            });
        }

        // Update void particles (pulled toward boss)
        for (let i = this.voidParticles.length - 1; i >= 0; i--) {
            const p = this.voidParticles[i];
            const angle = Math.atan2(this.y - p.y, this.x - p.x);
            p.x += Math.cos(angle) * p.speed * dt;
            p.y += Math.sin(angle) * p.speed * dt;
            p.life -= dt;

            if (p.life <= 0 || Math.hypot(p.x - this.x, p.y - this.y) < this.radius) {
                this.voidParticles.splice(i, 1);
            }
        }

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
            this.updateRealityTears(player, dt);
            this.updateVoidClones(player, dt);
            this.updateGravityWells(player, dt);
            return;
        }

        // --- PHASE TRANSITIONS ---
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.70 && this.phase === 1) this.enterPhase(2);
        else if (hpPercent <= 0.50 && this.phase === 2) this.enterPhase(3);
        else if (hpPercent <= 0.25 && this.phase === 3) this.enterPhase(4);

        // --- MOVEMENT ---
        this.handleMovement(dt);

        // --- GRAVITATIONAL PULL ---
        this.gravitationalPull = this.phase * 0.15; // Increases with phase
        this.applyGravitationalPull(dt);

        // --- ATTACKS ---
        this.attackTimer += dt;
        const attackCooldown = this.phase === 4 ? 50 : this.phase === 3 ? 70 : this.phase === 2 ? 90 : 110;

        if (this.state === 'IDLE' && this.attackTimer > attackCooldown) {
            this.chooseAttack();
        }

        this.updateRealityTears(player, dt);
        this.updateVoidClones(player, dt);
        this.updateGravityWells(player, dt);
    }

    handleIntro(player, dt) {
        this.introTimer += dt;

        if (this.introTimer < 220) {
            this.y += (200 - this.y) * 0.012 * dt;

            // Reality glitch effects
            if (this.introTimer % 10 < 1) {
                const glitchTexts = ['VOID REAPER', '◼️◼️◼️', '∞ NULL ∞', 'THE END', 'OBLIVION', '⬛⬛⬛'];
                document.getElementById('boss-name').innerText =
                    glitchTexts[Math.floor(Math.random() * glitchTexts.length)];
                document.getElementById('boss-name').style.color =
                    Math.random() > 0.5 ? '#000000' : '#ffffff';
            }

            // Void convergence particles
            if (this.introTimer % 4 < 1) {
                for (let i = 0; i < 5; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 400;
                    spawnParticles(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist,
                        3, 5, '#6600ff'
                    );
                }
            }
        } else if (this.introTimer < 300) {
            document.getElementById('boss-name').innerText = "VOID REAPER AWAKENS";
            document.getElementById('boss-name').style.color = '#6600ff';

            // Screen distortion effect
            if (this.introTimer % 5 < 1) {
                spawnParticles(this.x, this.y, 8, 6, '#000000');
            }
        } else {
            this.state = 'IDLE';
            document.getElementById('boss-name').innerText = BOSS_6_DATA.name;
            document.getElementById('boss-name').style.color = BOSS_6_DATA.colors.phase1;
            createExplosion(this.x, this.y, 300, 0);
            if (window.triggerHitstop) triggerHitstop(60);
            if (window.playSound) playSound('levelup');
        }
    }

    handleMovement(dt) {
        const speed = this.phase === 4 ? 0.04 : this.phase === 3 ? 0.03 : 0.02;
        const orbitRadius = 120 + Math.sin(this.pulseTimer * 0.01) * 80;

        // Erratic movement in phase 4
        const chaos = this.phase === 4 ? Math.sin(this.pulseTimer * 0.15) * 80 : 0;

        const targetX = CANVAS.width / 2 + Math.cos(this.pulseTimer * 0.008) * orbitRadius + chaos;
        const targetY = 200 + Math.sin(this.pulseTimer * 0.006) * 60;

        this.x += (targetX - this.x) * speed * dt;
        this.y += (targetY - this.y) * speed * dt;
    }

    enterPhase(phaseNum) {
        this.phase = phaseNum;
        this.state = 'IDLE';
        this.attackTimer = 0;

        this.isPhaseShifting = true;
        this.phaseShiftTimer = 140;

        const colorMap = {
            2: BOSS_6_DATA.colors.phase2,
            3: BOSS_6_DATA.colors.phase3,
            4: BOSS_6_DATA.colors.phase4
        };
        const color = colorMap[phaseNum];
        document.getElementById('boss-name').style.color = color;

        const phaseNames = {
            2: 'DISTORTION',
            3: 'COLLAPSE',
            4: 'SINGULARITY'
        };
        const phaseName = phaseNames[phaseNum];
        document.getElementById('boss-name').innerText = `VOID REAPER - ${phaseName}`;

        createExplosion(this.x, this.y, 600, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerHitstop) triggerHitstop(80);

        // Clear and respawn mechanics
        this.realityTears = [];
        this.voidClones = [];
        this.gravityWells = [];

        // Add more orbitals each phase
        if (phaseNum === 2) {
            this.spawnVoidOrbitals(4);
        } else if (phaseNum === 3) {
            this.spawnVoidOrbitals(6);
        } else if (phaseNum === 4) {
            this.spawnVoidOrbitals(8);
            // Screen-wide chaos
            for (let i = 0; i < 20; i++) {
                setTimeout(() => {
                    const angle = (i / 20) * Math.PI * 2;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(angle) * 250,
                        this.y + Math.sin(angle) * 250,
                        ENEMY_TYPES.SPEEDSTER, 2.5
                    );
                    enemy.hp *= 15;
                    enemy.maxHp *= 15;
                    enemy.color = '#ff0033';
                    enemy.isDead = false;
                }, i * 60);
            }
        }
    }

    applyGravitationalPull(dt) {
        if (this.gravitationalPull <= 0) return;

        // Pull enemies toward boss (visual chaos for player to compensate aim)
        enemyPool.getActive().forEach(enemy => {
            if (!enemy.isDead) {
                const dx = this.x - enemy.x;
                const dy = this.y - enemy.y;
                const dist = Math.hypot(dx, dy);

                if (dist < this.pullRadius && dist > this.radius + enemy.radius) {
                    const pullStrength = this.gravitationalPull * (1 - dist / this.pullRadius);
                    enemy.x += (dx / dist) * pullStrength * dt;
                    enemy.y += (dy / dist) * pullStrength * dt;
                }
            }
        });
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
            case 1: return ['VOID_PULSE', 'GRAVITY_WELL', 'ORBITAL_STRIKE', 'DARK_MATTER'];
            case 2: return ['REALITY_TEAR', 'COSMIC_STORM', 'VOID_CLONES', 'GRAVITY_SPIKE'];
            case 3: return ['SINGULARITY', 'EVENT_HORIZON', 'DIMENSIONAL_SHIFT', 'SUPERNOVA'];
            case 4: return ['VOID_TSUNAMI', 'REALITY_COLLAPSE', 'FINAL_HOUR', 'OBLIVION'];
            default: return ['VOID_PULSE'];
        }
    }

    executeAttack(attack) {
        console.log(`VOID REAPER ATTACK: ${attack}`);

        switch (attack) {
            // Phase 1
            case 'VOID_PULSE': this.attackVoidPulse(); break;
            case 'GRAVITY_WELL': this.attackGravityWell(); break;
            case 'ORBITAL_STRIKE': this.attackOrbitalStrike(); break;
            case 'DARK_MATTER': this.attackDarkMatter(); break;
            // Phase 2
            case 'REALITY_TEAR': this.attackRealityTear(); break;
            case 'COSMIC_STORM': this.attackCosmicStorm(); break;
            case 'VOID_CLONES': this.attackVoidClones(); break;
            case 'GRAVITY_SPIKE': this.attackGravitySpike(); break;
            // Phase 3
            case 'SINGULARITY': this.attackSingularity(); break;
            case 'EVENT_HORIZON': this.attackEventHorizon(); break;
            case 'DIMENSIONAL_SHIFT': this.attackDimensionalShift(); break;
            case 'SUPERNOVA': this.attackSupernova(); break;
            // Phase 4
            case 'VOID_TSUNAMI': this.attackVoidTsunami(); break;
            case 'REALITY_COLLAPSE': this.attackRealityCollapse(); break;
            case 'FINAL_HOUR': this.attackFinalHour(); break;
            case 'OBLIVION': this.attackOblivion(); break;
        }

        const cooldown = this.phase === 4 ? 1800 : 2200;
        setTimeout(() => {
            this.state = 'IDLE';
        }, cooldown);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 1 ATTACKS - Introduction
    // ═══════════════════════════════════════════════════════

    attackVoidPulse() {
        // Expanding rings of enemies
        for (let ring = 0; ring < 4; ring++) {
            setTimeout(() => {
                const count = 14 + ring * 2;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + (ring * 0.2);
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 11;
                    enemy.hp = 120;
                    enemy.maxHp = 120;
                    enemy.color = '#6600ff';
                    enemy.isDead = false;

                    const speed = 3 + ring * 0.5;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, ring * 350);
        }
    }

    attackGravityWell() {
        // Spawn gravity wells using Enemy class
        for (let i = 0; i < 3; i++) {
            const wellX = 150 + Math.random() * (CANVAS.width - 300);
            const wellY = 150 + Math.random() * (CANVAS.height - 300);

            const well = enemyPool.get(wellX, wellY, ENEMY_TYPES.TANK, 1);
            well.isGravityWell = true;
            well.radius = 80;
            well.life = 400;
            well.strength = 0.4;
            well.hp = 999999; // Non-destructible zone
            well.maxHp = 999999;
            well.color = 'rgba(102, 0, 255, 0.2)';

            well.update = function (player, dt) {
                this.life -= dt;
                if (this.life <= 0) {
                    this.hp = 0;
                    return;
                }

                // Apply gravity to nearby enemies
                enemyPool.getActive().forEach(enemy => {
                    if (!enemy.isDead && enemy !== this && !enemy.isGravityWell) {
                        const dx = this.x - enemy.x;
                        const dy = this.y - enemy.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist < this.radius) {
                            const pullStrength = this.strength * (1 - dist / this.radius);
                            enemy.x += (dx / dist) * pullStrength * dt;
                            enemy.y += (dy / dist) * pullStrength * dt;
                        }
                    }
                });
            };

            well.draw = function () {
                CTX.save();
                CTX.beginPath();
                CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                CTX.fillStyle = this.color;
                CTX.fill();
                CTX.strokeStyle = '#6600ff';
                CTX.lineWidth = 3;
                CTX.stroke();
                CTX.restore();
            };

            this.gravityWells.push(well);

            // Spawn enemies around well
            for (let j = 0; j < 8; j++) {
                const angle = (j / 8) * Math.PI * 2;
                const enemy = enemyPool.get(
                    wellX + Math.cos(angle) * 100,
                    wellY + Math.sin(angle) * 100,
                    ENEMY_TYPES.BASIC, 1
                );
                enemy.radius = 12;
                enemy.hp = 150;
                enemy.maxHp = 150;
                enemy.color = '#8833ff';
                enemy.isDead = false;
            }
        }
        createExplosion(this.x, this.y, 100, 0);
    }

    attackOrbitalStrike() {
        // Void orbitals release bullet patterns
        this.voidOrbitals.forEach((orbital, idx) => {
            setTimeout(() => {
                const orbitalX = this.x + Math.cos(orbital.angle) * orbital.orbitRadius;
                const orbitalY = this.y + Math.sin(orbital.angle) * orbital.orbitRadius;

                // 3-way spread from each orbital
                for (let i = -1; i <= 1; i++) {
                    const angle = orbital.angle + i * 0.4;
                    const enemy = enemyPool.get(orbitalX, orbitalY, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 10;
                    enemy.hp = 105;
                    enemy.maxHp = 105;
                    enemy.color = '#6600ff';
                    enemy.isDead = false;
                    enemy.vx = Math.cos(angle) * 5;
                    enemy.vy = Math.sin(angle) * 5;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, idx * 80);
        });
    }

    attackDarkMatter() {
        // Horizontal wave of tankier enemies
        const count = 12;
        for (let i = 0; i < count; i++) {
            const enemy = enemyPool.get(
                150 + (CANVAS.width - 300) * (i / count),
                -40,
                ENEMY_TYPES.TANK, 0.8
            );
            enemy.radius = 18;
            enemy.hp = 300;
            enemy.maxHp = 300;
            enemy.color = '#000033';
            enemy.isDead = false;
        }
        if (window.playSound) playSound('shoot');
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2 ATTACKS - Challenging
    // ═══════════════════════════════════════════════════════

    attackRealityTear() {
        // Spawn reality tears using Enemy class
        const tearCount = 4;
        for (let i = 0; i < tearCount; i++) {
            const tearX = 200 + Math.random() * (CANVAS.width - 400);
            const tearY = 150 + Math.random() * (CANVAS.height * 0.6);

            const tear = enemyPool.get(tearX, tearY, ENEMY_TYPES.TANK, 1);
            tear.isRealityTear = true;
            tear.radius = 40;
            tear.life = 500;
            tear.spawnTimer = 0;
            tear.spawnRate = 70;
            tear.enemiesSpawned = 0;
            tear.maxEnemies = 15;
            tear.hp = 999999; // Non-destructible
            tear.maxHp = 999999;
            tear.color = '#cc00ff';

            tear.update = function (player, dt) {
                this.life -= dt;
                this.spawnTimer += dt;

                if (this.spawnTimer >= this.spawnRate && this.enemiesSpawned < this.maxEnemies) {
                    this.spawnTimer = 0;
                    this.enemiesSpawned++;
                    const angle = Math.random() * Math.PI * 2;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(angle) * this.radius,
                        this.y + Math.sin(angle) * this.radius,
                        ENEMY_TYPES.BASIC, 1
                    );
                    enemy.radius = 11;
                    enemy.hp = 120;
                    enemy.maxHp = 120;
                    enemy.color = '#cc00ff';
                    enemy.isDead = false;
                }

                if (this.life <= 0) {
                    spawnParticles(this.x, this.y, 10, 6, '#cc00ff');
                    this.hp = 0;
                }
            };

            tear.draw = function () {
                CTX.save();
                CTX.beginPath();
                CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                CTX.fillStyle = 'rgba(204, 0, 255, 0.3)';
                CTX.fill();
                CTX.strokeStyle = '#cc00ff';
                CTX.lineWidth = 4;
                CTX.setLineDash([10, 5]);
                CTX.stroke();
                CTX.setLineDash([]);
                CTX.restore();
            };

            this.realityTears.push(tear);
            spawnParticles(tearX, tearY, 15, 8, '#cc00ff');
        }
        createExplosion(this.x, this.y, 150, 0);
    }

    attackCosmicStorm() {
        // Massive spiral from multiple directions
        const arms = 3;
        const bulletsPerArm = 30;

        for (let arm = 0; arm < arms; arm++) {
            for (let i = 0; i < bulletsPerArm; i++) {
                setTimeout(() => {
                    const baseAngle = (arm / arms) * Math.PI * 2;
                    const spiralAngle = baseAngle + (i / bulletsPerArm) * Math.PI * 4;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 11;
                    enemy.hp = 120;
                    enemy.maxHp = 120;
                    enemy.color = '#cc00ff';
                    enemy.isDead = false;
                    enemy.vx = Math.cos(spiralAngle) * 4.5;
                    enemy.vy = Math.sin(spiralAngle) * 4.5;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }, i * 35 + arm * 15);
            }
        }
    }

    attackVoidClones() {
        // Spawn phantom clones using Enemy class
        const count = 3;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const startX = this.x + Math.cos(angle) * 220;
            const startY = this.y + Math.sin(angle) * 220;

            const clone = enemyPool.get(startX, startY, ENEMY_TYPES.BASIC, 1);
            clone.isVoidClone = true;
            clone.cloneAngle = angle;
            clone.alpha = 0.6;
            clone.life = 450;
            clone.fireTimer = 30 + i * 40;
            clone.phase = this.phase;
            clone.bossRef = this;
            clone.radius = 40;
            clone.hp = 50;
            clone.maxHp = 50;
            clone.color = this.getPhaseColor();

            clone.update = function (player, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }

                this.life -= dt;
                if (this.life <= 0) {
                    this.hp = 0;
                    return;
                }

                this.cloneAngle += 0.01 * dt;
                this.x = this.bossRef.x + Math.cos(this.cloneAngle) * 200;
                this.y = this.bossRef.y + Math.sin(this.cloneAngle) * 200;

                this.fireTimer -= dt;
                if (this.fireTimer <= 0 && typeof player !== 'undefined') {
                    this.fireTimer = 50;
                    for (let j = -1; j <= 1; j++) {
                        const aimAngle = Math.atan2(player.y - this.y, player.x - this.x) + j * 0.3;
                        const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                        bullet.radius = 10;
                        bullet.hp = 105;
                        bullet.maxHp = 105;
                        bullet.color = this.bossRef.getPhaseColor();
                        bullet.isDead = false;
                        bullet.vx = Math.cos(aimAngle) * 5;
                        bullet.vy = Math.sin(aimAngle) * 5;
                        bullet.update = function (p, d) {
                            this.x += this.vx * d;
                            this.y += this.vy * d;
                        };
                    }
                }

                this.alpha = Math.min(0.6, this.life / 150);
            };

            clone.draw = function () {
                CTX.save();
                CTX.globalAlpha = this.alpha;
                CTX.translate(this.x, this.y);
                CTX.shadowBlur = 25;
                CTX.shadowColor = this.bossRef.getPhaseColor();
                CTX.fillStyle = this.bossRef.getPhaseColor();
                CTX.beginPath();
                CTX.arc(0, 0, 40, 0, Math.PI * 2);
                CTX.fill();
                CTX.strokeStyle = '#fff';
                CTX.lineWidth = 3;
                CTX.stroke();
                CTX.restore();
            };

            this.voidClones.push(clone);
        }
        createExplosion(this.x, this.y, 120, 0);
        if (window.playSound) playSound('powerup');
    }

    attackGravitySpike() {
        // Sudden gravitational pull then explosive burst
        if (window.triggerHitstop) triggerHitstop(40);

        // Intensify gravity temporarily
        const originalPull = this.gravitationalPull;
        this.gravitationalPull = 3.0;

        setTimeout(() => {
            this.gravitationalPull = originalPull;

            // Explosive burst of enemies
            const count = 25;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1.5);
                enemy.radius = 12;
                enemy.hp = 150;
                enemy.maxHp = 150;
                enemy.color = '#cc00ff';
                enemy.isDead = false;
                const speed = 5;
                enemy.vx = Math.cos(angle) * speed;
                enemy.vy = Math.sin(angle) * speed;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                };
            }
            createExplosion(this.x, this.y, 250, 0);
        }, 800);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3 ATTACKS - INTENSE
    // ═══════════════════════════════════════════════════════

    attackSingularity() {
        // Black hole effect - massive pull then release
        if (window.triggerHitstop) triggerHitstop(60);

        const originalPull = this.gravitationalPull;
        this.gravitationalPull = 5.0;
        this.pullRadius = 800;

        setTimeout(() => {
            // Release explosion
            this.gravitationalPull = originalPull;
            this.pullRadius = 400;

            for (let wave = 0; wave < 3; wave++) {
                setTimeout(() => {
                    const count = 18;
                    for (let i = 0; i < count; i++) {
                        const angle = (i / count) * Math.PI * 2 + wave * 0.3;
                        const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                        enemy.radius = 10;
                        enemy.hp = 120;
                        enemy.maxHp = 120;
                        enemy.color = '#ffffff';
                        enemy.isDead = false;
                        const speed = 6 + wave;
                        enemy.vx = Math.cos(angle) * speed;
                        enemy.vy = Math.sin(angle) * speed;
                        enemy.update = function (p, d) {
                            this.x += this.vx * d;
                            this.y += this.vy * d;
                        };
                    }
                }, wave * 250);
            }
            createExplosion(this.x, this.y, 400, 0);
        }, 1200);
    }

    attackEventHorizon() {
        // Dense ring of bullets around boss perimeter
        const rings = 3;
        for (let ring = 0; ring < rings; ring++) {
            setTimeout(() => {
                const count = 24 + ring * 6;
                const ringRadius = 150 + ring * 50;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const startX = this.x + Math.cos(angle) * ringRadius;
                    const startY = this.y + Math.sin(angle) * ringRadius;

                    const enemy = enemyPool.get(startX, startY, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 9;
                    enemy.hp = 105;
                    enemy.maxHp = 105;
                    enemy.color = '#ffffff';
                    enemy.isDead = false;
                    enemy.vx = Math.cos(angle) * 3;
                    enemy.vy = Math.sin(angle) * 3;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, ring * 300);
        }
    }

    attackDimensionalShift() {
        // Rapid teleportation leaving void trails
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                // Teleport
                this.phaseShiftAlpha = 0.2;
                const angle = Math.random() * Math.PI * 2;
                this.x = CANVAS.width / 2 + Math.cos(angle) * 200;
                this.y = 200 + Math.sin(angle) * 80;

                // Spawn enemies at new position
                for (let j = 0; j < 5; j++) {
                    const spawnAngle = (j / 5) * Math.PI * 2;
                    const enemy = enemyPool.get(
                        this.x + Math.cos(spawnAngle) * 70,
                        this.y + Math.sin(spawnAngle) * 70,
                        ENEMY_TYPES.BASIC, 1
                    );
                    enemy.radius = 11;
                    enemy.hp = 120;
                    enemy.maxHp = 120;
                    enemy.color = '#ffffff';
                    enemy.isDead = false;
                }

                spawnParticles(this.x, this.y, 12, 5, '#ffffff');

                setTimeout(() => {
                    this.phaseShiftAlpha = 1;
                }, 100);
            }, i * 150);
        }
    }

    attackSupernova() {
        // Massive radial explosion
        if (window.triggerHitstop) triggerHitstop(70);
        createExplosion(this.x, this.y, 400, 0);

        for (let wave = 0; wave < 5; wave++) {
            setTimeout(() => {
                const count = 16 + wave * 4;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 10 + wave;
                    enemy.hp = 120;
                    enemy.maxHp = 120;
                    enemy.color = wave % 2 === 0 ? '#ffffff' : '#ffaa00';
                    enemy.isDead = false;

                    const speed = 3.5 + wave * 0.8;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, wave * 250);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 4 ATTACKS - ULTIMATE DESTRUCTION
    // ═══════════════════════════════════════════════════════

    attackVoidTsunami() {
        // Screen-filling wave from all sides
        if (window.triggerHitstop) triggerHitstop(50);

        // From all 4 sides
        const sides = ['top', 'bottom', 'left', 'right'];
        sides.forEach((side, sideIdx) => {
            setTimeout(() => {
                for (let i = 0; i < 15; i++) {
                    let x, y;
                    switch (side) {
                        case 'top':
                            x = (CANVAS.width / 15) * i;
                            y = -30;
                            break;
                        case 'bottom':
                            x = (CANVAS.width / 15) * i;
                            y = CANVAS.height + 30;
                            break;
                        case 'left':
                            x = -30;
                            y = (CANVAS.height / 15) * i;
                            break;
                        case 'right':
                            x = CANVAS.width + 30;
                            y = (CANVAS.height / 15) * i;
                            break;
                    }

                    const enemy = enemyPool.get(x, y, ENEMY_TYPES.SPEEDSTER, 2);
                    enemy.color = '#ff0033';
                    enemy.radius = 14;
                    enemy.hp = 180;
                    enemy.maxHp = 180;
                    enemy.isDead = false;
                }
            }, sideIdx * 200);
        });
    }

    attackRealityCollapse() {
        // Multiple reality tears + gravity wells
        this.attackRealityTear();
        setTimeout(() => {
            this.attackGravityWell();
        }, 400);
    }

    attackFinalHour() {
        // Combines multiple attacks rapidly
        this.attackVoidPulse();
        setTimeout(() => this.attackCosmicStorm(), 600);
        setTimeout(() => this.attackEventHorizon(), 1200);
    }

    attackOblivion() {
        // Ultimate attack - chaos everywhere
        if (window.triggerHitstop) triggerHitstop(80);
        createExplosion(this.x, this.y, 500, 0);

        // Center burst
        for (let wave = 0; wave < 6; wave++) {
            setTimeout(() => {
                const count = 14 + wave * 3;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 9;
                    enemy.hp = 120;
                    enemy.maxHp = 120;
                    enemy.color = wave % 2 === 0 ? '#ff0033' : '#000000';
                    enemy.isDead = false;

                    const speed = 3 + wave * 0.6;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                if (window.playSound) playSound('shoot');
            }, wave * 200);
        }

        // Edge spawns
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const side = Math.floor(Math.random() * 3);
                let x, y;
                switch (side) {
                    case 0: x = Math.random() * CANVAS.width; y = -20; break;
                    case 1: x = CANVAS.width + 20; y = Math.random() * CANVAS.height * 0.7; break;
                    case 2: x = -20; y = Math.random() * CANVAS.height * 0.7; break;
                }
                const enemy = enemyPool.get(x, y, ENEMY_TYPES.SPEEDSTER, 2.5);
                enemy.hp *= 15;
                enemy.maxHp *= 15;
                enemy.color = '#ff0033';
                enemy.isDead = false;
            }, i * 70);
        }
    }

    // ═══════════════════════════════════════════════════════
    // UPDATERS
    // ═══════════════════════════════════════════════════════

    updateRealityTears(player, dt) {
        // Clean up dead tears (Enemy update handles spawning now)
        this.realityTears = this.realityTears.filter(tear => !tear.isDead && tear.hp > 0);
    }

    updateVoidClones(player, dt) {
        // Clean up dead clones (Enemy update handles movement/firing now)
        this.voidClones = this.voidClones.filter(clone => !clone.isDead && clone.hp > 0);
    }

    updateGravityWells(player, dt) {
        // Clean up expired wells (Enemy update handles gravity now)
        this.gravityWells = this.gravityWells.filter(well => !well.isDead && well.hp > 0);
    }

    takeDamage(amount) {
        if (this.state === 'INTRO' || this.isPhaseShifting) return;
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.voidOrbitals = [];
        this.realityTears = [];
        this.voidClones = [];
        this.gravityWells = [];
        this.voidParticles = [];

        // Return player to center
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }

        // EPIC DEATH SEQUENCE
        if (window.triggerHitstop) triggerHitstop(200);

        // Massive explosion waves
        for (let wave = 0; wave < 12; wave++) {
            setTimeout(() => {
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2 + wave * 0.15;
                    createExplosion(
                        this.x + Math.cos(angle) * (100 + wave * 70),
                        this.y + Math.sin(angle) * (100 + wave * 70),
                        150, 0
                    );
                }
            }, wave * 200);
        }
    }

    onDraw() {
        // Gravity wells draw themselves via custom draw() method

        // Reality tears draw themselves via custom draw() method

        // Void clones draw themselves via custom draw() method

        // Draw void particles
        this.voidParticles.forEach(p => {
            CTX.save();
            CTX.globalAlpha = p.life / 150;
            CTX.fillStyle = this.getPhaseColor();
            CTX.beginPath();
            CTX.arc(p.x, p.y, 3, 0, Math.PI * 2);
            CTX.fill();
            CTX.restore();
        });

        // Draw main boss
        CTX.save();
        CTX.globalAlpha = this.phaseShiftAlpha;
        CTX.translate(this.x, this.y);

        // Event horizon ring
        CTX.beginPath();
        CTX.arc(0, 0, this.eventHorizonRadius, 0, Math.PI * 2);
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 5;
        CTX.shadowBlur = 30;
        CTX.shadowColor = this.getPhaseColor();
        CTX.stroke();

        // Core black hole
        const gradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(0.7, this.getPhaseColor());
        gradient.addColorStop(1, '#000000');

        CTX.fillStyle = gradient;
        CTX.shadowBlur = 40;
        CTX.shadowColor = this.getPhaseColor();
        CTX.beginPath();
        CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
        CTX.fill();

        // Inner void
        CTX.fillStyle = '#000000';
        CTX.shadowBlur = 0;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        CTX.fill();

        // Void distortion lines
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + this.coreAngle;
            CTX.beginPath();
            CTX.moveTo(Math.cos(angle) * this.radius * 0.5, Math.sin(angle) * this.radius * 0.5);
            CTX.lineTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            CTX.stroke();
        }

        CTX.restore();

        // Draw void orbitals
        this.voidOrbitals.forEach(orbital => {
            const orbitalX = this.x + Math.cos(orbital.angle) * orbital.orbitRadius;
            const orbitalY = this.y + Math.sin(orbital.angle) * orbital.orbitRadius;

            CTX.save();
            CTX.translate(orbitalX, orbitalY);

            const orbitalPulse = 1 + Math.sin(orbital.pulsePhase) * 0.2;
            CTX.scale(orbitalPulse, orbitalPulse);

            CTX.shadowBlur = 15;
            CTX.shadowColor = this.getPhaseColor();
            CTX.fillStyle = this.getPhaseColor();
            CTX.beginPath();
            CTX.arc(0, 0, orbital.radius, 0, Math.PI * 2);
            CTX.fill();

            CTX.fillStyle = '#000000';
            CTX.beginPath();
            CTX.arc(0, 0, orbital.radius * 0.4, 0, Math.PI * 2);
            CTX.fill();

            CTX.restore();
        });
    }

    getPhaseColor() {
        switch (this.phase) {
            case 1: return BOSS_6_DATA.colors.phase1;
            case 2: return BOSS_6_DATA.colors.phase2;
            case 3: return BOSS_6_DATA.colors.phase3;
            case 4: return BOSS_6_DATA.colors.phase4;
            default: return BOSS_6_DATA.colors.phase1;
        }
    }
}

const boss6 = new BossVoidReaper();
window.boss6 = boss6;
