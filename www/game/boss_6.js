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
        this.deathExplosionDuration = 2000; // Epic death
        this.deathHitstopDuration = 120;
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
            document.getElementById('boss-name').innerText = "VOID REAPER";
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
        document.getElementById('boss-name').innerText = `VOID REAPER`;

        createExplosion(this.x, this.y, 600, 0);
        if (window.playSound) playSound('powerup');


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
    // PHASE 1 ATTACKS - SKILL-TESTING
    // ═══════════════════════════════════════════════════════

    attackVoidPulse() {
        // Expanding ring with a GAP - player must find and shoot through
        const gapAngle = Math.random() * Math.PI * 2;
        const gapSize = 0.6; // ~35 degrees gap

        for (let ring = 0; ring < 3; ring++) {
            setTimeout(() => {
                const count = 14;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2 + ring * 0.15;
                    // Skip enemies in the gap zone
                    const angleDiff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (angleDiff < gapSize / 2) continue;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 14;
                    enemy.hp = 40;
                    enemy.maxHp = 40;
                    enemy.color = '#6600ff';
                    enemy.isDead = false;
                    enemy.ringSegment = true;

                    const speed = 2.5 + ring * 0.3;
                    enemy.vx = Math.cos(angle) * speed;
                    enemy.vy = Math.sin(angle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
                spawnParticles(this.x, this.y, 8, 5, '#6600ff');
                if (window.playSound) playSound('shoot');
            }, ring * 400);
        }
    }

    attackGravityWell() {
        // DESTROYABLE gravity wells that pull bullets off-course
        const wellCount = 2;
        for (let i = 0; i < wellCount; i++) {
            const wellX = 150 + (CANVAS.width - 300) * (i / (wellCount - 1 || 1));
            const wellY = CANVAS.height * 0.4 + Math.random() * 100;

            const well = enemyPool.get(wellX, wellY, ENEMY_TYPES.TANK, 1);
            well.isGravityWell = true;
            well.radius = 50;
            well.hp = 200;
            well.maxHp = 200;
            well.color = '#6600ff';
            well.pulsePhase = Math.random() * Math.PI * 2;

            well.update = function (player, dt) {
                this.pulsePhase += 0.08 * dt;
                // Spawn orbiting projectiles periodically
                if (Math.random() < 0.02) {
                    const orbitAngle = Math.random() * Math.PI * 2;
                    const proj = enemyPool.get(
                        this.x + Math.cos(orbitAngle) * 60,
                        this.y + Math.sin(orbitAngle) * 60,
                        ENEMY_TYPES.BASIC, 1
                    );
                    proj.radius = 8;
                    proj.hp = 15;
                    proj.maxHp = 15;
                    proj.color = '#9933ff';
                    proj.isDead = false;
                    proj.vx = Math.cos(orbitAngle) * 3;
                    proj.vy = Math.sin(orbitAngle) * 3;
                    proj.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }
            };

            well.draw = function () {
                const pulse = 1 + Math.sin(this.pulsePhase) * 0.15;
                CTX.save();
                CTX.beginPath();
                CTX.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
                CTX.fillStyle = 'rgba(102, 0, 255, 0.3)';
                CTX.fill();
                CTX.strokeStyle = '#6600ff';
                CTX.lineWidth = 4;
                CTX.stroke();
                // HP bar
                const hpPct = this.hp / this.maxHp;
                CTX.fillStyle = hpPct > 0.5 ? '#00ff00' : '#ff0000';
                CTX.fillRect(this.x - 30, this.y - this.radius - 15, 60 * hpPct, 6);
                CTX.restore();
            };

            this.gravityWells.push(well);
        }
        createExplosion(this.x, this.y, 100, 0);
    }

    attackOrbitalStrike() {
        // Orbitals fire TELEGRAPHED aimed shots with warning lines
        const targetPlayer = typeof player !== 'undefined' ? player : { x: CANVAS.width / 2, y: CANVAS.height - 100 };

        this.voidOrbitals.forEach((orbital, idx) => {
            setTimeout(() => {
                const orbX = this.x + Math.cos(orbital.orbAngle) * orbital.orbitRadius;
                const orbY = this.y + Math.sin(orbital.orbAngle) * orbital.orbitRadius;
                const aimAngle = Math.atan2(targetPlayer.y - orbY, targetPlayer.x - orbX);

                // Telegraph line (visual warning)
                spawnParticles(orbX, orbY, 3, 8, '#ff0000');

                // Delayed shot
                setTimeout(() => {
                    const bullet = enemyPool.get(orbX, orbY, ENEMY_TYPES.BASIC, 1);
                    bullet.radius = 12;
                    bullet.hp = 30;
                    bullet.maxHp = 30;
                    bullet.color = '#ff3366';
                    bullet.isDead = false;
                    bullet.vx = Math.cos(aimAngle) * 6;
                    bullet.vy = Math.sin(aimAngle) * 6;
                    bullet.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                    if (window.playSound) playSound('shoot');
                }, 300);
            }, idx * 120);
        });
    }

    attackDarkMatter() {
        // Slow walls from alternating sides with GAPS + INDICATOR
        const waves = 2;
        for (let wave = 0; wave < waves; wave++) {
            const fromLeft = wave % 2 === 0;
            const gapStart = Math.floor(Math.random() * 4) + 2;
            const gapSize = 3;

            // INDICATOR - show warning particles where walls will spawn
            setTimeout(() => {
                for (let i = 0; i < 8; i++) {
                    if (i >= gapStart && i < gapStart + gapSize) continue;
                    const y = 80 + (CANVAS.height - 160) * (i / 7);
                    const x = fromLeft ? 30 : CANVAS.width - 30;
                    spawnParticles(x, y, 5, 8, '#ff0000');
                }
                if (window.playSound) playSound('shoot');
            }, wave * 1200);

            // ACTUAL SPAWN - delayed after indicator
            setTimeout(() => {
                for (let i = 0; i < 8; i++) {
                    if (i >= gapStart && i < gapStart + gapSize) continue;

                    const y = 80 + (CANVAS.height - 160) * (i / 7);
                    const x = fromLeft ? -30 : CANVAS.width + 30;

                    const wall = enemyPool.get(x, y, ENEMY_TYPES.TANK, 1);
                    wall.radius = 20;
                    wall.hp = 40;
                    wall.maxHp = 40;
                    wall.color = '#220044';
                    wall.isDead = false;
                    wall.vx = fromLeft ? 2 : -2;
                    wall.update = function (p, d) {
                        this.x += this.vx * d;
                    };
                }
            }, wave * 1200 + 500);
        }
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 2 ATTACKS - SKILL-TESTING
    // ═══════════════════════════════════════════════════════

    attackRealityTear() {
        // DESTROYABLE portals that spawn homing missiles - destroy portal to stop flow
        const tearCount = 2;
        for (let i = 0; i < tearCount; i++) {
            const tearX = 150 + (CANVAS.width - 300) * (i / (tearCount - 1 || 1));
            const tearY = 120 + Math.random() * 100;

            const tear = enemyPool.get(tearX, tearY, ENEMY_TYPES.TANK, 1);
            tear.isRealityTear = true;
            tear.radius = 35;
            tear.hp = 250;
            tear.maxHp = 250;
            tear.spawnTimer = 0;
            tear.color = '#cc00ff';
            tear.pulsePhase = Math.random() * Math.PI * 2;

            tear.update = function (player, dt) {
                this.pulsePhase += 0.1 * dt;
                this.spawnTimer += dt;

                // Spawn homing missile every 80 frames
                if (this.spawnTimer >= 80 && typeof player !== 'undefined') {
                    this.spawnTimer = 0;
                    const missile = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    missile.radius = 10;
                    missile.hp = 20;
                    missile.maxHp = 20;
                    missile.color = '#ff00ff';
                    missile.isDead = false;
                    missile.targetRef = player;
                    missile.update = function (p, d) {
                        if (!this.targetRef) return;
                        const angle = Math.atan2(this.targetRef.y - this.y, this.targetRef.x - this.x);
                        this.x += Math.cos(angle) * 3 * d;
                        this.y += Math.sin(angle) * 3 * d;
                    };
                }
            };

            tear.draw = function () {
                const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;
                CTX.save();
                CTX.beginPath();
                CTX.arc(this.x, this.y, this.radius * pulse, 0, Math.PI * 2);
                CTX.fillStyle = 'rgba(204, 0, 255, 0.4)';
                CTX.fill();
                CTX.strokeStyle = '#cc00ff';
                CTX.lineWidth = 4;
                CTX.setLineDash([8, 4]);
                CTX.stroke();
                CTX.setLineDash([]);
                // HP bar
                const hpPct = this.hp / this.maxHp;
                CTX.fillStyle = hpPct > 0.5 ? '#00ff00' : '#ff0000';
                CTX.fillRect(this.x - 25, this.y - this.radius - 12, 50 * hpPct, 5);
                CTX.restore();
            };

            this.realityTears.push(tear);
            spawnParticles(tearX, tearY, 10, 6, '#cc00ff');
        }
        createExplosion(this.x, this.y, 120, 0);
    }

    attackCosmicStorm() {
        // Double-helix spiral with DESTROYABLE nodes at key positions
        const arms = 2;
        const nodesPerArm = 10;

        for (let arm = 0; arm < arms; arm++) {
            for (let i = 0; i < nodesPerArm; i++) {
                setTimeout(() => {
                    const baseAngle = (arm / arms) * Math.PI + this.coreAngle;
                    const spiralAngle = baseAngle + (i / nodesPerArm) * Math.PI * 3;

                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    enemy.radius = 12;
                    enemy.hp = 30;
                    enemy.maxHp = 30;
                    enemy.color = arm === 0 ? '#cc00ff' : '#ff00cc';
                    enemy.isDead = false;

                    const speed = 3.5;
                    enemy.vx = Math.cos(spiralAngle) * speed;
                    enemy.vy = Math.sin(spiralAngle) * speed;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }, i * 50 + arm * 25);
            }
        }
        if (window.playSound) playSound('shoot');
    }

    attackVoidClones() {
        // SHIELDED sentinels - must destroy shield first, then core
        const count = 2;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const startX = this.x + Math.cos(angle) * 180;
            const startY = this.y + Math.sin(angle) * 180;

            // Shield (outer)
            const shield = enemyPool.get(startX, startY, ENEMY_TYPES.TANK, 1);
            shield.isShield = true;
            shield.radius = 45;
            shield.hp = 150;
            shield.maxHp = 150;
            shield.color = '#cc00ff';
            shield.coreRef = null;
            shield.orbitAngle = angle;
            shield.bossRef = this;

            // Core (spawned when shield dies)
            shield.update = function (player, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.orbitAngle += 0.015 * dt;
                this.x = this.bossRef.x + Math.cos(this.orbitAngle) * 180;
                this.y = this.bossRef.y + Math.sin(this.orbitAngle) * 180;
            };

            shield.draw = function () {
                CTX.save();
                CTX.beginPath();
                CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                CTX.strokeStyle = '#cc00ff';
                CTX.lineWidth = 6;
                CTX.shadowBlur = 15;
                CTX.shadowColor = '#cc00ff';
                CTX.stroke();
                // HP bar
                const hpPct = this.hp / this.maxHp;
                CTX.fillStyle = '#00ffff';
                CTX.fillRect(this.x - 30, this.y - this.radius - 10, 60 * hpPct, 5);
                CTX.restore();
            };

            this.voidClones.push(shield);
        }
        createExplosion(this.x, this.y, 100, 0);
        if (window.playSound) playSound('powerup');
    }

    attackGravitySpike() {
        // Compression toward center then radial burst with safe zones
        const targetPlayer = typeof player !== 'undefined' ? player : { x: CANVAS.width / 2, y: CANVAS.height - 100 };

        // Visual warning
        spawnParticles(this.x, this.y, 20, 10, '#ff0066');

        setTimeout(() => {
            // Radial burst with gaps
            const gapAngles = [
                Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x), // Gap toward player
                Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x) + Math.PI // Opposite gap
            ];
            const gapSize = 0.5;

            const count = 16;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;

                // Check if in gap zone
                let inGap = false;
                for (const gapAngle of gapAngles) {
                    const diff = Math.abs(((angle - gapAngle + Math.PI) % (Math.PI * 2)) - Math.PI);
                    if (diff < gapSize / 2) inGap = true;
                }
                if (inGap) continue;

                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1);
                enemy.radius = 14;
                enemy.hp = 50;
                enemy.maxHp = 50;
                enemy.color = '#cc00ff';
                enemy.isDead = false;
                enemy.vx = Math.cos(angle) * 5;
                enemy.vy = Math.sin(angle) * 5;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                };
            }
            createExplosion(this.x, this.y, 200, 0);
            if (window.playSound) playSound('shoot');
        }, 600);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 3 ATTACKS - SKILL-TESTING INTENSE
    // ═══════════════════════════════════════════════════════

    attackSingularity() {
        // Central vortex with orbiting debris that SHIELDS boss - destroy debris first!
        const debrisCount = 6;
        for (let i = 0; i < debrisCount; i++) {
            const angle = (i / debrisCount) * Math.PI * 2;
            const debris = enemyPool.get(
                this.x + Math.cos(angle) * 120,
                this.y + Math.sin(angle) * 120,
                ENEMY_TYPES.TANK, 1
            );
            debris.isDebris = true;
            debris.radius = 18;
            debris.hp = 80;
            debris.maxHp = 80;
            debris.color = '#ffffff';
            debris.orbitAngle = angle;
            debris.bossRef = this;

            debris.update = function (player, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.orbitAngle += 0.02 * dt;
                this.x = this.bossRef.x + Math.cos(this.orbitAngle) * 120;
                this.y = this.bossRef.y + Math.sin(this.orbitAngle) * 120;
            };

            debris.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);
                CTX.fillStyle = '#ffffff';
                CTX.shadowBlur = 10;
                CTX.shadowColor = '#ffffff';
                CTX.beginPath();
                CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                CTX.fill();
                // HP bar
                const hpPct = this.hp / this.maxHp;
                CTX.fillStyle = '#00ffff';
                CTX.fillRect(-15, -this.radius - 8, 30 * hpPct, 4);
                CTX.restore();
            };
        }
        createExplosion(this.x, this.y, 150, 0);
        if (window.playSound) playSound('powerup');
    }

    attackEventHorizon() {
        // Expanding death ring with DESTROYABLE segments - shoot to create gaps!
        const segments = 12;
        const ringRadius = 80;

        for (let i = 0; i < segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const seg = enemyPool.get(
                this.x + Math.cos(angle) * ringRadius,
                this.y + Math.sin(angle) * ringRadius,
                ENEMY_TYPES.BASIC, 1
            );
            seg.radius = 16;
            seg.hp = 40;
            seg.maxHp = 40;
            seg.color = '#ffffff';
            seg.isDead = false;
            seg.segAngle = angle;
            seg.expandSpeed = 3;
            seg.bossRef = this;

            seg.update = function (p, d) {
                if (!this.bossRef) return;
                const dist = Math.hypot(this.x - this.bossRef.x, this.y - this.bossRef.y);
                this.x += Math.cos(this.segAngle) * this.expandSpeed * d;
                this.y += Math.sin(this.segAngle) * this.expandSpeed * d;
            };
        }
        spawnParticles(this.x, this.y, 15, 8, '#ffffff');
        if (window.playSound) playSound('shoot');
    }

    attackDimensionalShift() {
        // Boss teleports, leaves afterimage that fires delayed burst
        const positions = [];
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                // Store position
                const oldX = this.x;
                const oldY = this.y;
                positions.push({ x: oldX, y: oldY });

                // Teleport to new position
                this.phaseShiftAlpha = 0.3;
                const angle = Math.random() * Math.PI * 2;
                this.x = CANVAS.width / 2 + Math.cos(angle) * 150;
                this.y = 180 + Math.sin(angle) * 60;

                // Spawn warning at old position
                spawnParticles(oldX, oldY, 8, 6, '#ff0066');

                // Delayed burst from old position
                setTimeout(() => {
                    const burstCount = 6;
                    for (let j = 0; j < burstCount; j++) {
                        const burstAngle = (j / burstCount) * Math.PI * 2;
                        const enemy = enemyPool.get(oldX, oldY, ENEMY_TYPES.BASIC, 1);
                        enemy.radius = 12;
                        enemy.hp = 30;
                        enemy.maxHp = 30;
                        enemy.color = '#ff0066';
                        enemy.isDead = false;
                        enemy.vx = Math.cos(burstAngle) * 4;
                        enemy.vy = Math.sin(burstAngle) * 4;
                        enemy.update = function (p, d) {
                            this.x += this.vx * d;
                            this.y += this.vy * d;
                        };
                    }
                }, 400);

                setTimeout(() => { this.phaseShiftAlpha = 1; }, 150);
            }, i * 350);
        }
    }

    attackSupernova() {
        // Massive charge-up with warning, safe zone at EDGES
        spawnParticles(this.x, this.y, 25, 12, '#ffaa00');

        // Warning pulse
        setTimeout(() => {
            // Inner danger zone - radial burst but edges are safe
            const count = 14;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 14;
                enemy.hp = 40;
                enemy.maxHp = 40;
                enemy.color = '#ffaa00';
                enemy.isDead = false;

                // Variable speed - faster means reaches edge, slower stays center
                const speed = 2 + Math.random() * 2;
                enemy.vx = Math.cos(angle) * speed;
                enemy.vy = Math.sin(angle) * speed;
                enemy.lifeTimer = 300; // Despawn after time (don't reach edges)
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.lifeTimer -= d;
                    if (this.lifeTimer <= 0) this.hp = 0;
                };
            }
            createExplosion(this.x, this.y, 300, 0);
            if (window.playSound) playSound('shoot');
        }, 800);
    }

    // ═══════════════════════════════════════════════════════
    // PHASE 4 ATTACKS - ULTIMATE SKILL TEST
    // ═══════════════════════════════════════════════════════

    attackVoidTsunami() {
        // Alternating screen-sweep walls - DESTROY segments to create gaps!
        const waves = 2;
        for (let wave = 0; wave < waves; wave++) {
            setTimeout(() => {
                const fromTop = wave % 2 === 0;
                const segmentCount = 8;

                for (let i = 0; i < segmentCount; i++) {
                    const x = (CANVAS.width / segmentCount) * (i + 0.5);
                    const y = fromTop ? -30 : CANVAS.height + 30;

                    const wall = enemyPool.get(x, y, ENEMY_TYPES.TANK, 1);
                    wall.radius = 25;
                    wall.hp = 60;
                    wall.maxHp = 60;
                    wall.color = '#ff0033';
                    wall.isDead = false;
                    wall.vy = fromTop ? 2.5 : -2.5;

                    wall.update = function (p, d) {
                        this.y += this.vy * d;
                    };

                    wall.draw = function () {
                        CTX.save();
                        CTX.fillStyle = '#ff0033';
                        CTX.shadowBlur = 15;
                        CTX.shadowColor = '#ff0033';
                        CTX.beginPath();
                        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        CTX.fill();
                        // HP indicator
                        const hpPct = this.hp / this.maxHp;
                        CTX.fillStyle = '#ffffff';
                        CTX.fillRect(this.x - 20, this.y - this.radius - 8, 40 * hpPct, 4);
                        CTX.restore();
                    };
                }
                if (window.playSound) playSound('shoot');
            }, wave * 600);
        }
    }

    attackRealityCollapse() {
        // Screen divided into quadrants with rotating laser barriers
        const quadrantCount = 4;
        for (let q = 0; q < quadrantCount; q++) {
            const qx = (q % 2) * (CANVAS.width / 2) + CANVAS.width / 4;
            const qy = Math.floor(q / 2) * (CANVAS.height / 2) + CANVAS.height / 4;

            // Spawn rotating barrier in each quadrant
            const barrier = enemyPool.get(qx, qy, ENEMY_TYPES.TANK, 1);
            barrier.isBarrier = true;
            barrier.radius = 30;
            barrier.hp = 120;
            barrier.maxHp = 120;
            barrier.color = '#ff0066';
            barrier.rotAngle = (q / quadrantCount) * Math.PI * 2;
            barrier.laserLength = 80;

            barrier.update = function (player, dt) {
                this.rotAngle += 0.03 * dt;
            };

            barrier.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);

                // Core
                CTX.fillStyle = '#ff0066';
                CTX.shadowBlur = 20;
                CTX.shadowColor = '#ff0066';
                CTX.beginPath();
                CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                CTX.fill();

                // Rotating laser arms
                CTX.strokeStyle = '#ff3399';
                CTX.lineWidth = 8;
                for (let arm = 0; arm < 2; arm++) {
                    const armAngle = this.rotAngle + arm * Math.PI;
                    CTX.beginPath();
                    CTX.moveTo(0, 0);
                    CTX.lineTo(Math.cos(armAngle) * this.laserLength, Math.sin(armAngle) * this.laserLength);
                    CTX.stroke();
                }

                // HP bar
                const hpPct = this.hp / this.maxHp;
                CTX.fillStyle = '#00ffff';
                CTX.fillRect(-25, -this.radius - 10, 50 * hpPct, 5);
                CTX.restore();
            };
        }
        createExplosion(this.x, this.y, 200, 0);
        if (window.playSound) playSound('powerup');
    }

    attackFinalHour() {
        // Chain-kill mechanic: Spawn weak adds near boss that damage it when killed!
        const addCount = 8;
        for (let i = 0; i < addCount; i++) {
            setTimeout(() => {
                const angle = (i / addCount) * Math.PI * 2;
                const dist = 100 + Math.random() * 50;

                const add = enemyPool.get(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    ENEMY_TYPES.BASIC, 1
                );
                add.radius = 15;
                add.hp = 25;
                add.maxHp = 25;
                add.color = '#00ff00'; // Green = good to kill!
                add.isDead = false;
                add.isChainKill = true;
                add.bossRef = this;
                add.orbitAngle = angle;

                add.update = function (player, dt) {
                    if (!this.bossRef || !this.bossRef.active) return;
                    this.orbitAngle += 0.015 * dt;
                    const targetX = this.bossRef.x + Math.cos(this.orbitAngle) * 130;
                    const targetY = this.bossRef.y + Math.sin(this.orbitAngle) * 130;
                    this.x += (targetX - this.x) * 0.05 * dt;
                    this.y += (targetY - this.y) * 0.05 * dt;
                };

                add.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);
                    CTX.fillStyle = '#00ff00';
                    CTX.shadowBlur = 15;
                    CTX.shadowColor = '#00ff00';
                    CTX.beginPath();
                    CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                    CTX.fill();
                    // Pulsing glow
                    CTX.strokeStyle = '#88ff88';
                    CTX.lineWidth = 3;
                    CTX.stroke();
                    CTX.restore();
                };
            }, i * 80);
        }
        spawnParticles(this.x, this.y, 20, 8, '#00ff00');
        if (window.playSound) playSound('powerup');
    }

    attackOblivion() {
        // Multi-phase finale: Spiral → Ring → Targeted burst. All destroyable!

        // Phase 1: Spiral
        const spiralCount = 12;
        for (let i = 0; i < spiralCount; i++) {
            setTimeout(() => {
                const angle = (i / spiralCount) * Math.PI * 4 + this.coreAngle;
                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 12;
                enemy.hp = 30;
                enemy.maxHp = 30;
                enemy.color = '#ff0033';
                enemy.isDead = false;
                enemy.vx = Math.cos(angle) * 4;
                enemy.vy = Math.sin(angle) * 4;
                enemy.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                };
            }, i * 40);
        }

        // Phase 2: Ring (delayed)
        setTimeout(() => {
            const ringCount = 14;
            for (let i = 0; i < ringCount; i++) {
                const angle = (i / ringCount) * Math.PI * 2;
                const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 14;
                enemy.hp = 35;
                enemy.maxHp = 35;
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
        }, 700);

        // Phase 3: Targeted burst (delayed)
        setTimeout(() => {
            const targetPlayer = typeof player !== 'undefined' ? player : { x: CANVAS.width / 2, y: CANVAS.height - 100 };
            const burstCount = 6;
            for (let i = 0; i < burstCount; i++) {
                setTimeout(() => {
                    const aimAngle = Math.atan2(targetPlayer.y - this.y, targetPlayer.x - this.x);
                    const spreadAngle = aimAngle + (Math.random() - 0.5) * 0.5;
                    const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1);
                    enemy.radius = 16;
                    enemy.hp = 40;
                    enemy.maxHp = 40;
                    enemy.color = '#ff6600';
                    enemy.isDead = false;
                    enemy.vx = Math.cos(spreadAngle) * 5;
                    enemy.vy = Math.sin(spreadAngle) * 5;
                    enemy.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                    };
                }, i * 60);
            }
        }, 1400);

        createExplosion(this.x, this.y, 400, 0);
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
        if (window.triggerHitstop) triggerHitstop(60);

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
