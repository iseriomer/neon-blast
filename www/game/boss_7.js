// game/boss_7.js - THE SINGULARITY - True Final Boss (Level 50+)
// "Beyond the event horizon, all things converge."

const BOSS_7_DATA = {
    name: 'THE SINGULARITY',
    hp: 7000,
    score: 100000,
    colors: {
        phase1: '#00ffff',   // Cyan - Event Horizon
        phase2: '#ff00ff',   // Magenta - Quantum Foam
        phase3: '#ffffff',   // White - Big Crunch
        core: '#000000',
        glitch: ['#ff0000', '#00ff00', '#0000ff']
    }
};

class BossSingularity extends BossBase {
    constructor() {
        super();
        this.name = BOSS_7_DATA.name;
        this.maxHp = BOSS_7_DATA.hp;
        this.score = BOSS_7_DATA.score;
        this.radius = 100 * GAME_SCALE;

        // Visuals
        this.coreAngle = 0;
        this.pulseTimer = 0;
        this.glitchIntensity = 0;
        this.glitchTimer = 0;
        this.eventHorizonRadius = 0;
        this.innerRingAngle = 0;
        this.outerRingAngle = 0;

        // Combat State
        this.state = 'IDLE';
        this.introTimer = 0;
        this.phase = 1;
        this.deathCount = 0;
        this.maxDeaths = 2; // 2 rebirths = 3 total phases
        this.isRebirthing = false;
        this.rebirthTimer = 0;

        // Entity Tracking (ALL use Enemy class)
        this.orbitals = [];        // Phase 1 shields
        this.beamSegments = [];    // Laser attacks
        this.glitchClones = [];    // Phase 2 decoys
        this.voidProjectiles = []; // Misc projectiles
        this.gravitySpheres = [];  // Phase 3 gravity wells
        this.tractorBeam = null;   // Phase 3 abduction

        // Attack Timers
        this.attackTimer = 0;
        this.attackCooldown = 120;
        this.lastAttack = '';

        // Phase-specific
        this.teleportTimer = 0;
        this.abductionActive = false;
        this.pylons = [];

        // Phase 3 Shield System
        this.phase3ShieldActive = false;
        this.pylonData = []; // {x, alive, respawnTimer}
        this.vulnerabilityTimer = 0; // 10 second vulnerability window
        this.isVulnerable = false;

        // Death Config
        this.deathExplosionDuration = 2000;
        this.deathHitstopDuration = 120;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -300;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.phase = 1;
        this.deathCount = 0;
        this.isRebirthing = false;
        this.glitchIntensity = 0;

        // Clear all entities
        this.clearAllEntities();

        // Position player
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 120;
            player.vx = 0;
            player.vy = 0;
        }

        document.getElementById('boss-name').innerText = "???";
        document.getElementById('boss-name').style.color = '#888';

        console.log("⬛ THE SINGULARITY AWAKENS ⬛");
    }

    clearAllEntities() {
        // Kill all tracked entities
        [...this.orbitals, ...this.beamSegments, ...this.glitchClones,
        ...this.voidProjectiles, ...this.gravitySpheres, ...this.pylons].forEach(e => {
            if (e) e.hp = 0;
        });
        this.orbitals = [];
        this.beamSegments = [];
        this.glitchClones = [];
        this.voidProjectiles = [];
        this.gravitySpheres = [];
        this.pylons = [];
        if (this.tractorBeam) {
            this.tractorBeam.hp = 0;
            this.tractorBeam = null;
        }
        this.abductionActive = false;
    }

    getPhaseColor() {
        if (this.phase === 1) return BOSS_7_DATA.colors.phase1;
        if (this.phase === 2) return BOSS_7_DATA.colors.phase2;
        return BOSS_7_DATA.colors.phase3;
    }

    // =========================================================================
    // MAIN UPDATE LOOP
    // =========================================================================

    onUpdate(player, dt) {
        this.pulseTimer += dt;
        this.coreAngle += 0.015 * dt;
        this.innerRingAngle += 0.02 * dt;
        this.outerRingAngle -= 0.01 * dt;

        // Clean up dead entities
        this.orbitals = this.orbitals.filter(e => !e.isDead && e.hp > 0);
        this.beamSegments = this.beamSegments.filter(e => !e.isDead && e.hp > 0);
        this.glitchClones = this.glitchClones.filter(e => !e.isDead && e.hp > 0);
        this.voidProjectiles = this.voidProjectiles.filter(e => !e.isDead && e.hp > 0);
        this.gravitySpheres = this.gravitySpheres.filter(e => !e.isDead && e.hp > 0);
        this.pylons = this.pylons.filter(e => !e.isDead && e.hp > 0);

        // State Machine
        if (this.state === 'INTRO') {
            this.updateIntro(dt);
        } else if (this.state === 'FIGHTING') {
            this.updateFighting(player, dt);
        } else if (this.state === 'REBIRTHING') {
            this.updateRebirth(dt);
        }

        // Glitch effect
        if (this.glitchIntensity > 0) {
            this.glitchTimer += dt;
            this.glitchIntensity -= 0.01 * dt;
        }
    }

    updateIntro(dt) {
        this.introTimer += dt;
        const targetY = 120 * GAME_SCALE;

        if (this.introTimer < 180) {
            // Descend
            this.y += (targetY - this.y) * 0.02 * dt;
            this.eventHorizonRadius = Math.min(this.radius * 1.5, this.eventHorizonRadius + 0.5 * dt);
        } else if (this.introTimer < 300) {
            // Dramatic pause
            if (this.introTimer > 200 && this.introTimer < 210) {
                document.getElementById('boss-name').innerText = "THE SINGULARITY";
                document.getElementById('boss-name').style.color = this.getPhaseColor();
                if (window.playSound) playSound('boss');
            }
        } else {
            // Start fight
            this.state = 'FIGHTING';
            this.spawnOrbitals(6);
        }
    }

    updateFighting(player, dt) {
        this.attackTimer += dt;

        // Phase-specific behavior
        if (this.phase === 2) {
            this.updatePhase2Teleport(dt);
        }
        if (this.phase === 3) {
            this.updatePhase3Shield(player, dt);
        }

        // Attack selection
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.selectAttack(player);
        }
    }

    updateRebirth(dt) {
        this.rebirthTimer += dt;

        // Visual effects during rebirth
        this.glitchIntensity = 1;

        if (this.rebirthTimer < 60) {
            // Collapse
            this.radius = Math.max(20, this.radius - 1 * dt);
        } else if (this.rebirthTimer < 120) {
            // Pause at singularity
            this.radius = 20;
        } else if (this.rebirthTimer < 180) {
            // Expand
            this.radius = Math.min(100 * GAME_SCALE, this.radius + 2 * dt);
        } else {
            // Complete rebirth
            this.isRebirthing = false;
            this.state = 'FIGHTING';
            this.hp = this.maxHp;
            this.phase++;
            this.attackTimer = 0;
            this.attackCooldown = this.phase === 2 ? 90 : 70;
            this.radius = 100 * GAME_SCALE;

            // Phase-specific spawn
            if (this.phase === 2) {
                this.spawnGlitchClones(3);
            } else if (this.phase === 3) {
                this.spawnGravitySpheres(4);
                this.initPhase3Shield(); // Activate shield system!
            }

            createExplosion(this.x, this.y, 300, 0);
            if (window.playSound) playSound('powerup');
        }
    }

    // =========================================================================
    // ATTACK SELECTION
    // =========================================================================

    selectAttack(player) {
        const attacks = this.getPhaseAttacks();
        let attack;
        do {
            attack = attacks[Math.floor(Math.random() * attacks.length)];
        } while (attack === this.lastAttack && attacks.length > 1);

        this.lastAttack = attack;
        this[attack](player);
    }

    getPhaseAttacks() {
        if (this.phase === 1) {
            return ['attackHorizonBeam', 'attackSpiralVolley', 'attackOrbitalStrike', 'attackPrecisionTest', 'attackCrossfireBarrage'];
        } else if (this.phase === 2) {
            return ['attackQuantumBurst', 'attackGlitchStorm', 'attackDataStream', 'attackCloneSwarm'];
        } else {
            return ['attackSingularityPulse', 'attackFinalCollapse', 'attackDoomSpiral', 'attackVoidCrushers', 'attackVoidMines'];
        }
    }

    // =========================================================================
    // PHASE 1 ATTACKS - Event Horizon (Structured, Geometric)
    // =========================================================================

    spawnOrbitals(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const orbital = enemyPool.get(
                this.x + Math.cos(angle) * 140,
                this.y + Math.sin(angle) * 140,
                ENEMY_TYPES.TANK, 1
            );
            orbital.isOrbital = true;
            orbital.orbAngle = angle;
            orbital.orbitRadius = 140 * GAME_SCALE;
            orbital.orbitSpeed = 0.015;
            orbital.radius = 20 * GAME_SCALE;
            orbital.hp = 200;
            orbital.maxHp = 200;
            orbital.color = BOSS_7_DATA.colors.phase1;
            orbital.bossRef = this;

            orbital.update = function (p, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.orbAngle += this.orbitSpeed * dt;
                this.x = this.bossRef.x + Math.cos(this.orbAngle) * this.orbitRadius;
                this.y = this.bossRef.y + Math.sin(this.orbAngle) * this.orbitRadius;
            };

            orbital.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);

                // Hexagon shape
                CTX.shadowBlur = 15;
                CTX.shadowColor = this.color;
                CTX.fillStyle = this.color;
                CTX.beginPath();
                for (let j = 0; j < 6; j++) {
                    const a = (j / 6) * Math.PI * 2;
                    const px = Math.cos(a) * this.radius;
                    const py = Math.sin(a) * this.radius;
                    if (j === 0) CTX.moveTo(px, py);
                    else CTX.lineTo(px, py);
                }
                CTX.closePath();
                CTX.fill();

                // HP bar
                if (this.hp < this.maxHp) {
                    const pct = this.hp / this.maxHp;
                    CTX.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
                    CTX.fillRect(-15, -this.radius - 10, 30 * pct, 4);
                }
                CTX.restore();
            };

            this.orbitals.push(orbital);
        }
    }

    attackHorizonBeam(player) {
        // Sweeping beam attack - chain of Enemy segments
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        const segmentCount = 4;
        const segmentSpacing = 30 * GAME_SCALE;

        for (let i = 0; i < segmentCount; i++) {
            setTimeout(() => {
                const dist = 100 + i * segmentSpacing;
                const seg = enemyPool.get(
                    this.x + Math.cos(angleToPlayer) * dist,
                    this.y + Math.sin(angleToPlayer) * dist,
                    ENEMY_TYPES.BASIC, 1
                );
                seg.isBeamSegment = true;
                seg.radius = 15 * GAME_SCALE;
                seg.hp = 25;
                seg.maxHp = 25;
                seg.life = 80;
                seg.color = BOSS_7_DATA.colors.phase1;
                seg.alpha = 1;

                seg.update = function (p, dt) {
                    this.life -= dt;
                    this.alpha = this.life / 80;
                    if (this.life <= 0) this.hp = 0;
                };

                seg.draw = function () {
                    CTX.save();
                    CTX.globalAlpha = this.alpha;
                    CTX.shadowBlur = 20;
                    CTX.shadowColor = this.color;
                    CTX.fillStyle = this.color;
                    CTX.beginPath();
                    CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    CTX.fill();
                    CTX.restore();
                };

                this.beamSegments.push(seg);
            }, i * 30);
        }
        if (window.playSound) playSound('shoot');
    }

    attackSpiralVolley(player) {
        // Spiral pattern of projectiles
        const waves = 3;
        const bulletsPerWave = 12;

        for (let w = 0; w < waves; w++) {
            setTimeout(() => {
                for (let i = 0; i < bulletsPerWave; i++) {
                    const angle = (i / bulletsPerWave) * Math.PI * 2 + w * 0.3;
                    const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    proj.isVoidProjectile = true;
                    proj.radius = 10 * GAME_SCALE;
                    proj.hp = 15;
                    proj.maxHp = 15;
                    proj.color = BOSS_7_DATA.colors.phase1;
                    proj.vx = Math.cos(angle) * 4;
                    proj.vy = Math.sin(angle) * 4;

                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -50 || this.x > CANVAS.width + 50 ||
                            this.y < -50 || this.y > CANVAS.height + 50) {
                            this.hp = 0;
                        }
                    };

                    proj.draw = function () {
                        CTX.save();
                        CTX.shadowBlur = 10;
                        CTX.shadowColor = this.color;
                        CTX.fillStyle = this.color;
                        CTX.beginPath();
                        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        CTX.fill();
                        CTX.restore();
                    };

                    this.voidProjectiles.push(proj);
                }
                if (window.playSound) playSound('shoot');
            }, w * 200);
        }
    }

    attackOrbitalStrike(player) {
        // Each orbital fires at player
        this.orbitals.forEach((orb, idx) => {
            if (orb.isDead || orb.hp <= 0) return;
            setTimeout(() => {
                const angle = Math.atan2(player.y - orb.y, player.x - orb.x);
                const proj = enemyPool.get(orb.x, orb.y, ENEMY_TYPES.BASIC, 1);
                proj.isVoidProjectile = true;
                proj.radius = 12 * GAME_SCALE;
                proj.hp = 20;
                proj.maxHp = 20;
                proj.color = BOSS_7_DATA.colors.phase1;
                proj.vx = Math.cos(angle) * 5;
                proj.vy = Math.sin(angle) * 5;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.y > CANVAS.height + 50) this.hp = 0;
                };

                this.voidProjectiles.push(proj);
            }, idx * 100);
        });
        if (window.playSound) playSound('shoot');
    }

    // NEW: Precision Test - Moving targets that test aim!
    attackPrecisionTest(player) {
        // Spawn moving targets player must shoot to stop attack
        const targetCount = 4;
        for (let i = 0; i < targetCount; i++) {
            setTimeout(() => {
                // Spawn within screen bounds
                const startX = 100 + Math.random() * (CANVAS.width - 200);
                const startY = 100 + Math.random() * (CANVAS.height * 0.3);
                const target = enemyPool.get(startX, startY, ENEMY_TYPES.SPEEDSTER, 1);
                target.isPrecisionTarget = true;
                target.radius = 25 * GAME_SCALE;
                target.hp = 250; // BUFFED from 50
                target.maxHp = 250;
                target.color = '#ffff00';
                target.vx = (Math.random() - 0.5) * 6;
                target.vy = (Math.random() - 0.5) * 4;
                target.fireTimer = 30;
                target.life = 600; // 10 second lifespan
                target.bossRef = this;

                target.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.life -= dt;

                    // Bounce off ALL edges - stay within screen
                    const margin = this.radius + 10;
                    if (this.x < margin) {
                        this.x = margin;
                        this.vx = Math.abs(this.vx);
                    }
                    if (this.x > CANVAS.width - margin) {
                        this.x = CANVAS.width - margin;
                        this.vx = -Math.abs(this.vx);
                    }
                    if (this.y < margin) {
                        this.y = margin;
                        this.vy = Math.abs(this.vy);
                    }
                    if (this.y > CANVAS.height * 0.6) {
                        this.y = CANVAS.height * 0.6;
                        this.vy = -Math.abs(this.vy);
                    }

                    // Fire at player periodically
                    this.fireTimer -= dt;
                    if (this.fireTimer <= 0 && typeof p !== 'undefined') {
                        this.fireTimer = 30; // Faster fire rate
                        const angle = Math.atan2(p.y - this.y, p.x - this.x);
                        const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                        proj.radius = 12;
                        proj.hp = 20;
                        proj.maxHp = 20;
                        proj.color = '#ffff00';
                        proj.vx = Math.cos(angle) * 9; // Faster bullets
                        proj.vy = Math.sin(angle) * 9;
                        proj.update = function (pl, d) {
                            this.x += this.vx * d;
                            this.y += this.vy * d;
                            if (this.y > CANVAS.height + 50) this.hp = 0;
                        };
                    }

                    // Lifetime expiry
                    if (this.life <= 0) {
                        this.hp = 0;
                    }
                };

                target.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);

                    // Pulsing target
                    const pulse = 1 + Math.sin(Date.now() * 0.01) * 0.2;
                    CTX.shadowBlur = 20;
                    CTX.shadowColor = this.color;
                    CTX.strokeStyle = this.color;
                    CTX.lineWidth = 3;

                    // Crosshair shape
                    CTX.beginPath();
                    CTX.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
                    CTX.stroke();
                    CTX.beginPath();
                    CTX.moveTo(-this.radius * 1.5, 0);
                    CTX.lineTo(this.radius * 1.5, 0);
                    CTX.moveTo(0, -this.radius * 1.5);
                    CTX.lineTo(0, this.radius * 1.5);
                    CTX.stroke();

                    // HP bar
                    if (this.hp < this.maxHp) {
                        const pct = this.hp / this.maxHp;
                        CTX.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
                        CTX.fillRect(-20, this.radius + 8, 40 * pct, 4);
                    }
                    CTX.restore();
                };

                this.voidProjectiles.push(target);
            }, i * 300);
        }
        if (window.playSound) playSound('powerup');
    }

    // NEW: Crossfire Barrage - Intense multi-directional attack!
    attackCrossfireBarrage(player) {
        // Fire from multiple angles simultaneously
        const waves = 4;
        for (let w = 0; w < waves; w++) {
            setTimeout(() => {
                // Top
                for (let i = 0; i < 8; i++) {
                    const x = (i / 7) * CANVAS.width;
                    const proj = enemyPool.get(x, -20, ENEMY_TYPES.BASIC, 1);
                    proj.isVoidProjectile = true;
                    proj.radius = 12 * GAME_SCALE;
                    proj.hp = 18;
                    proj.maxHp = 18;
                    proj.color = BOSS_7_DATA.colors.phase1;
                    proj.vx = (Math.random() - 0.5) * 2;
                    proj.vy = 4 + Math.random();
                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.y > CANVAS.height + 30) this.hp = 0;
                    };
                    this.voidProjectiles.push(proj);
                }

                // Sides
                for (let side = 0; side < 2; side++) {
                    for (let i = 0; i < 4; i++) {
                        const x = side === 0 ? -20 : CANVAS.width + 20;
                        const y = 100 + (i / 3) * (CANVAS.height * 0.5);
                        const proj = enemyPool.get(x, y, ENEMY_TYPES.BASIC, 1);
                        proj.isVoidProjectile = true;
                        proj.radius = 12 * GAME_SCALE;
                        proj.hp = 18;
                        proj.maxHp = 18;
                        proj.color = BOSS_7_DATA.colors.phase1;
                        proj.vx = side === 0 ? 5 : -5;
                        proj.vy = (Math.random() - 0.5) * 2;
                        proj.update = function (p, dt) {
                            this.x += this.vx * dt;
                            this.y += this.vy * dt;
                            if (this.x < -50 || this.x > CANVAS.width + 50) this.hp = 0;
                        };
                        this.voidProjectiles.push(proj);
                    }
                }

                if (window.playSound) playSound('shoot');
            }, w * 400);
        }
    }

    // =========================================================================
    // PHASE 2 ATTACKS - Quantum Foam (Chaotic, Glitchy)
    // =========================================================================


    updatePhase2Teleport(dt) {
        this.teleportTimer += dt;
        if (this.teleportTimer > 300) {
            this.teleportTimer = 0;
            // Teleport to random position
            const newX = 150 + Math.random() * (CANVAS.width - 300);
            const newY = 80 + Math.random() * 150;

            this.glitchIntensity = 1;
            createExplosion(this.x, this.y, 80, 0);
            this.x = newX;
            this.y = newY;
            createExplosion(this.x, this.y, 80, 0);
            if (window.playSound) playSound('powerup');
        }
    }

    spawnGlitchClones(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const clone = enemyPool.get(
                this.x + Math.cos(angle) * 180,
                this.y + Math.sin(angle) * 180,
                ENEMY_TYPES.BASIC, 1
            );
            clone.isGlitchClone = true;
            clone.cloneAngle = angle;
            clone.radius = 50 * GAME_SCALE;
            clone.hp = 100;
            clone.maxHp = 100;
            clone.alpha = 0.6;
            clone.life = 600;
            clone.bossRef = this;
            clone.fireTimer = 60 + i * 40;

            clone.update = function (p, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.life -= dt;
                if (this.life <= 0) {
                    this.hp = 0;
                    return;
                }
                // Follow boss with offset
                this.cloneAngle += 0.008 * dt;
                this.x = this.bossRef.x + Math.cos(this.cloneAngle) * 180;
                this.y = this.bossRef.y + Math.sin(this.cloneAngle) * 180;
                this.alpha = 0.3 + Math.sin(this.life * 0.05) * 0.3;

                // Shoot occasionally
                this.fireTimer -= dt;
                if (this.fireTimer <= 0 && typeof p !== 'undefined') {
                    this.fireTimer = 90;
                    const aimAngle = Math.atan2(p.y - this.y, p.x - this.x);
                    const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    proj.radius = 8;
                    proj.hp = 15;
                    proj.maxHp = 15;
                    proj.color = '#ff00ff';
                    proj.vx = Math.cos(aimAngle) * 4;
                    proj.vy = Math.sin(aimAngle) * 4;
                    proj.update = function (pl, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                        if (this.y > CANVAS.height + 50) this.hp = 0;
                    };
                }
            };

            clone.draw = function () {
                CTX.save();
                CTX.globalAlpha = this.alpha;
                CTX.translate(this.x, this.y);

                // Glitchy circle
                const glitchOffset = (Math.random() - 0.5) * 10;
                CTX.shadowBlur = 20;
                CTX.shadowColor = '#ff00ff';
                CTX.strokeStyle = '#ff00ff';
                CTX.lineWidth = 3;
                CTX.beginPath();
                CTX.arc(glitchOffset, 0, this.radius, 0, Math.PI * 2);
                CTX.stroke();

                CTX.strokeStyle = '#00ffff';
                CTX.beginPath();
                CTX.arc(-glitchOffset, 0, this.radius * 0.8, 0, Math.PI * 2);
                CTX.stroke();

                CTX.restore();
            };

            this.glitchClones.push(clone);
        }
    }

    attackQuantumBurst(player) {
        // Rapid fire in random directions
        const burstCount = 20;
        for (let i = 0; i < burstCount; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 3;
                const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                proj.isVoidProjectile = true;
                proj.radius = 8 * GAME_SCALE;
                proj.hp = 12;
                proj.maxHp = 12;
                proj.color = BOSS_7_DATA.colors.phase2;
                proj.vx = Math.cos(angle) * speed;
                proj.vy = Math.sin(angle) * speed;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.x < -30 || this.x > CANVAS.width + 30 ||
                        this.y < -30 || this.y > CANVAS.height + 30) {
                        this.hp = 0;
                    }
                };

                this.voidProjectiles.push(proj);
            }, i * 25);
        }
        if (window.playSound) playSound('shoot');
    }

    attackGlitchStorm(player) {
        // Matrix-style falling code rain
        const columns = 10;
        for (let c = 0; c < columns; c++) {
            const x = (c / columns) * CANVAS.width + CANVAS.width / columns / 2;
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const rain = enemyPool.get(x + (Math.random() - 0.5) * 30, -20, ENEMY_TYPES.BASIC, 1);
                    rain.isVoidProjectile = true;
                    rain.radius = 10 * GAME_SCALE;
                    rain.hp = 10;
                    rain.maxHp = 10;
                    rain.color = '#00ff00';
                    rain.vy = 4 + Math.random() * 2;

                    rain.update = function (p, dt) {
                        this.y += this.vy * dt;
                        if (this.y > CANVAS.height + 30) this.hp = 0;
                    };

                    rain.draw = function () {
                        CTX.save();
                        CTX.fillStyle = this.color;
                        CTX.fillRect(this.x - 3, this.y - 15, 6, 30);
                        CTX.restore();
                    };

                    this.voidProjectiles.push(rain);
                }, i * 100 + c * 50);
            }
        }
    }

    attackDataStream(player) {
        // Binary streams from sides - BUFFED
        const streamCount = 10;
        for (let i = 0; i < streamCount; i++) {
            setTimeout(() => {
                const fromLeft = i % 2 === 0;
                const y = 80 + (i / streamCount) * (CANVAS.height * 0.85); // Cover 85% height
                const proj = enemyPool.get(fromLeft ? -20 : CANVAS.width + 20, y, ENEMY_TYPES.BASIC, 1);
                proj.isVoidProjectile = true;
                proj.radius = 20 * GAME_SCALE;
                proj.hp = 50; // BUFFED HP
                proj.maxHp = 50;
                proj.color = '#00ffff';
                proj.vx = fromLeft ? 12 : -12; // BUFFED Speed

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    if (this.x < -50 || this.x > CANVAS.width + 50) this.hp = 0;
                };

                proj.draw = function () {
                    CTX.save();
                    CTX.fillStyle = this.color;
                    CTX.shadowBlur = 15;
                    CTX.shadowColor = this.color;
                    // Square shape
                    CTX.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
                    CTX.restore();
                };

                this.voidProjectiles.push(proj);
            }, i * 150);
        }
        if (window.playSound) playSound('shoot');
    }

    attackCloneSwarm(player) {
        // All clones fire simultaneously
        this.glitchClones.forEach(clone => {
            if (clone.isDead || clone.hp <= 0) return;
            for (let i = 0; i < 3; i++) {
                const spread = (i - 1) * 0.3;
                const angle = Math.atan2(player.y - clone.y, player.x - clone.x) + spread;
                const proj = enemyPool.get(clone.x, clone.y, ENEMY_TYPES.BASIC, 1);
                proj.isVoidProjectile = true;
                proj.radius = 10 * GAME_SCALE;
                proj.hp = 15;
                proj.maxHp = 15;
                proj.color = '#ff00ff';
                proj.vx = Math.cos(angle) * 5;
                proj.vy = Math.sin(angle) * 5;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.y > CANVAS.height + 50) this.hp = 0;
                };

                this.voidProjectiles.push(proj);
            }
        });
        if (window.playSound) playSound('shoot');
    }

    // =========================================================================
    // PHASE 3 ATTACKS - The Big Crunch (Desperate, Overwhelming)
    // =========================================================================

    spawnGravitySpheres(count) {
        for (let i = 0; i < count; i++) {
            const x = 100 + Math.random() * (CANVAS.width - 200);
            const y = 200 + Math.random() * (CANVAS.height * 0.4);
            const sphere = enemyPool.get(x, y, ENEMY_TYPES.TANK, 1);
            sphere.isGravitySphere = true;
            sphere.radius = 60 * GAME_SCALE;
            sphere.hp = 300;
            sphere.maxHp = 300;
            sphere.pullStrength = 0.15;
            sphere.life = 800;
            sphere.bossRef = this;

            sphere.update = function (p, dt) {
                this.life -= dt;
                if (this.life <= 0) {
                    this.hp = 0;
                    return;
                }
                // Pull nearby projectiles
                enemyPool.getActive().forEach(e => {
                    if (e !== this && !e.isGravitySphere && e.isVoidProjectile) {
                        const dx = this.x - e.x;
                        const dy = this.y - e.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist < this.radius * 2 && dist > 0) {
                            e.vx += (dx / dist) * this.pullStrength * dt;
                            e.vy += (dy / dist) * this.pullStrength * dt;
                        }
                    }
                });
            };

            sphere.draw = function () {
                const alpha = Math.min(1, this.life / 200);
                CTX.save();
                CTX.globalAlpha = alpha * 0.5;
                CTX.beginPath();
                CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                CTX.fillStyle = 'rgba(255, 255, 255, 0.1)';
                CTX.fill();
                CTX.strokeStyle = '#ffffff';
                CTX.lineWidth = 3;
                CTX.stroke();

                // HP bar
                if (this.hp < this.maxHp) {
                    CTX.globalAlpha = 1;
                    const pct = this.hp / this.maxHp;
                    CTX.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
                    CTX.fillRect(this.x - 30, this.y - this.radius - 15, 60 * pct, 5);
                }
                CTX.restore();
            };

            this.gravitySpheres.push(sphere);
        }
    }

    attackSingularityPulse(player) {
        // Expanding ring of projectiles
        const rings = 3;
        for (let r = 0; r < rings; r++) {
            setTimeout(() => {
                const count = 16 + r * 4;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    proj.isVoidProjectile = true;
                    proj.radius = 12 * GAME_SCALE;
                    proj.hp = 20;
                    proj.maxHp = 20;
                    proj.color = '#ffffff';
                    proj.vx = Math.cos(angle) * (3 + r);
                    proj.vy = Math.sin(angle) * (3 + r);

                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -30 || this.x > CANVAS.width + 30 ||
                            this.y < -30 || this.y > CANVAS.height + 30) {
                            this.hp = 0;
                        }
                    };

                    this.voidProjectiles.push(proj);
                }
                if (window.playSound) playSound('shoot');
            }, r * 300);
        }
    }

    attackAbduction(player) {
        // This attack now just pulls player - shield is always active in Phase 3
        if (this.abductionActive) return;

        this.abductionActive = true;
        const beam = enemyPool.get(this.x, this.y + 100, ENEMY_TYPES.TANK, 1);
        beam.isTractorBeam = true;
        beam.radius = 80 * GAME_SCALE;
        beam.hp = 999999;
        beam.maxHp = 999999;
        beam.life = 300;
        beam.bossRef = this;

        beam.update = function (p, dt) {
            this.life -= dt;
            this.x = this.bossRef.x;
            this.y = this.bossRef.y + 150;

            if (this.life <= 0) {
                this.hp = 0;
                this.bossRef.abductionActive = false;
                return;
            }

            // Pull player towards beam center
            if (typeof p !== 'undefined') {
                const dx = this.x - p.x;
                const dy = this.y - p.y;
                const dist = Math.hypot(dx, dy);
                if (dist < this.radius * 1.5) {
                    p.x += dx * 0.02 * dt;
                    p.y += dy * 0.02 * dt;
                }
            }
        };

        beam.draw = function () {
            const alpha = Math.min(1, this.life / 100);
            CTX.save();
            CTX.globalAlpha = alpha * 0.4;
            CTX.beginPath();
            CTX.moveTo(this.bossRef.x - 30, this.bossRef.y);
            CTX.lineTo(this.x - this.radius, this.y + this.radius);
            CTX.lineTo(this.x + this.radius, this.y + this.radius);
            CTX.lineTo(this.bossRef.x + 30, this.bossRef.y);
            CTX.closePath();
            CTX.fillStyle = '#ffffff';
            CTX.fill();
            CTX.restore();
        };

        this.tractorBeam = beam;
        if (window.playSound) playSound('powerup');
    }

    // Phase 3 Shield System
    initPhase3Shield() {
        if (this.phase3ShieldActive) return;
        this.phase3ShieldActive = true;
        this.isVulnerable = false;
        this.vulnerabilityTimer = 0;

        // Create 2 pylon positions (left and right only)
        this.pylonData = [
            { x: CANVAS.width * 0.15, alive: true, respawnTimer: 0 },
            { x: CANVAS.width * 0.85, alive: true, respawnTimer: 0 }
        ];

        // Spawn all pylons
        this.respawnAllPylons();
    }

    respawnAllPylons() {
        // Clear existing pylons
        this.pylons.forEach(p => p.hp = 0);
        this.pylons = [];

        // Spawn new pylons
        this.pylonData.forEach((data, index) => {
            data.alive = true;
            data.respawnTimer = 0;
            this.spawnSinglePylon(data.x, index);
        });
    }

    spawnSinglePylon(x, index) {
        const pylon = enemyPool.get(x, CANVAS.height - 100, ENEMY_TYPES.TANK, 1);
        pylon.isPylon = true;
        pylon.pylonIndex = index;
        pylon.radius = 30 * GAME_SCALE;
        pylon.hp = 1000; // BUFFED from 200 (5x)
        pylon.maxHp = 1000;
        pylon.color = '#00ff00';
        pylon.bossRef = this;

        pylon.update = function (p, dt) {
            // Check if dead and trigger respawn timer
            if (this.hp <= 0 && this.bossRef.pylonData[this.pylonIndex]) {
                this.bossRef.pylonData[this.pylonIndex].alive = false;
                this.bossRef.pylonData[this.pylonIndex].respawnTimer = 300; // 5 seconds
            }
        };

        pylon.draw = function () {
            CTX.save();
            CTX.translate(this.x, this.y);

            CTX.shadowBlur = 25;
            CTX.shadowColor = this.color;
            CTX.fillStyle = this.color;

            // Triangle pointing up
            CTX.beginPath();
            CTX.moveTo(0, -this.radius);
            CTX.lineTo(-this.radius * 0.8, this.radius);
            CTX.lineTo(this.radius * 0.8, this.radius);
            CTX.closePath();
            CTX.fill();

            // Inner glow
            CTX.fillStyle = '#ffffff';
            CTX.beginPath();
            CTX.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
            CTX.fill();

            // HP bar
            const pct = this.hp / this.maxHp;
            CTX.fillStyle = '#333';
            CTX.fillRect(-25, this.radius + 10, 50, 8);
            CTX.fillStyle = pct > 0.5 ? '#00ff00' : (pct > 0.25 ? '#ffff00' : '#ff0000');
            CTX.fillRect(-25, this.radius + 10, 50 * pct, 8);

            CTX.restore();
        };

        this.pylons.push(pylon);
    }

    updatePhase3Shield(player, dt) {
        if (!this.phase3ShieldActive) return;

        // Clean up dead pylons from array
        this.pylons = this.pylons.filter(p => !p.isDead && p.hp > 0);

        // Handle vulnerability window
        if (this.isVulnerable) {
            this.vulnerabilityTimer -= dt;
            if (this.vulnerabilityTimer <= 0) {
                // End vulnerability - respawn all pylons
                this.isVulnerable = false;
                this.respawnAllPylons();
                if (window.playSound) playSound('powerup');
            }
            return;
        }

        // Update respawn timers for dead pylons
        let allDead = true;
        this.pylonData.forEach((data, index) => {
            if (data.alive) {
                // Check if this pylon is actually still alive in the pool
                const pylonExists = this.pylons.some(p => p.pylonIndex === index && p.hp > 0);
                if (!pylonExists) {
                    data.alive = false;
                    data.respawnTimer = 300; // 5 seconds
                } else {
                    allDead = false;
                }
            } else {
                // Respawn timer countdown
                data.respawnTimer -= dt;
                if (data.respawnTimer <= 0) {
                    // Respawn this pylon
                    data.alive = true;
                    this.spawnSinglePylon(data.x, index);
                    if (window.playSound) playSound('hit');
                }
            }
        });

        // Check if ALL pylons are dead at the same time
        const anyAlive = this.pylonData.some(d => d.alive);
        if (!anyAlive && !this.isVulnerable) {
            // STUN & DAMAGE!
            this.isVulnerable = true;
            this.vulnerabilityTimer = 180; // 3 seconds STUN

            // Visual Impact (Stun Feel)
            createExplosion(this.x, this.y, 300, 0);
            if (window.triggerHitstop) triggerHitstop(20);
            if (window.playSound) {
                playSound('explosion');
                playSound('boss');
            }

            // 10% Damage penalty
            const dmg = this.maxHp * 0.1;
            this.takeDamage(dmg);

            console.log("⚡ BOSS STUNNED! 3s Vulnerability + 10% Damage!");
        } else {
            // HEAL BOSS when shield is active!
            if (this.hp < this.maxHp && this.phase3ShieldActive && !this.isVulnerable) {
                this.hp += 0.05 * dt; // SLOWER: 0.1 -> 0.05
                if (this.hp > this.maxHp) this.hp = this.maxHp;

                // Update HUD
                this.updateHealthBar();

                // Visual heal ticks
                if (Math.random() < 0.1) {
                    spawnParticles(this.x + (Math.random() - 0.5) * 100, this.y + (Math.random() - 0.5) * 100, 1, 2, '#00ff00');
                }
            }
        }
    }

    drawPhase3ShieldUI() {
        if (!this.phase3ShieldActive || this.phase !== 3) return;

        CTX.save();

        if (!this.isVulnerable) {
            // GREEN AURA (Shield Active)
            const pulse = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
            const gradient = CTX.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, this.radius * 2);
            gradient.addColorStop(0, `rgba(0, 255, 100, ${pulse})`);
            gradient.addColorStop(0.5, `rgba(0, 255, 100, ${pulse * 0.5})`);
            gradient.addColorStop(1, 'rgba(0, 255, 100, 0)');
            CTX.fillStyle = gradient;
            CTX.beginPath();
            CTX.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
            CTX.fill();
        } else {
            // RED AURA (Vulnerable)
            const flash = 0.3 + Math.sin(Date.now() * 0.02) * 0.2;
            const gradient = CTX.createRadialGradient(this.x, this.y, this.radius * 0.5, this.x, this.y, this.radius * 2);
            gradient.addColorStop(0, `rgba(255, 0, 0, ${flash})`);
            gradient.addColorStop(0.5, `rgba(255, 0, 0, ${flash * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            CTX.fillStyle = gradient;
            CTX.beginPath();
            CTX.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
            CTX.fill();
        }

        CTX.restore();
    }

    updateAbduction(player, dt) {
        // Legacy - now handled by updatePhase3Shield
    }

    attackFinalCollapse(player) {
        // Massive spiral + homing missiles
        const spiralArms = 4;
        const bulletsPerArm = 8;

        for (let arm = 0; arm < spiralArms; arm++) {
            for (let i = 0; i < bulletsPerArm; i++) {
                setTimeout(() => {
                    const baseAngle = (arm / spiralArms) * Math.PI * 2;
                    const angle = baseAngle + i * 0.15;
                    const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    proj.isVoidProjectile = true;
                    proj.radius = 10 * GAME_SCALE;
                    proj.hp = 18;
                    proj.maxHp = 18;
                    proj.color = '#ffffff';
                    proj.vx = Math.cos(angle) * 3.5;
                    proj.vy = Math.sin(angle) * 3.5;

                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -30 || this.x > CANVAS.width + 30 ||
                            this.y < -30 || this.y > CANVAS.height + 30) {
                            this.hp = 0;
                        }
                    };

                    this.voidProjectiles.push(proj);
                }, arm * 100 + i * 50);
            }
        }

        // Homing missiles
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const missile = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1);
                missile.isVoidProjectile = true;
                missile.isHoming = true;
                missile.radius = 15 * GAME_SCALE;
                missile.hp = 40;
                missile.maxHp = 40;
                missile.color = '#ff0000';
                missile.speed = 3;
                missile.life = 300;

                missile.update = function (p, dt) {
                    this.life -= dt;
                    if (this.life <= 0) {
                        this.hp = 0;
                        return;
                    }
                    if (typeof p !== 'undefined') {
                        const angle = Math.atan2(p.y - this.y, p.x - this.x);
                        this.x += Math.cos(angle) * this.speed * dt;
                        this.y += Math.sin(angle) * this.speed * dt;
                    }
                };

                missile.draw = function () {
                    CTX.save();
                    CTX.shadowBlur = 15;
                    CTX.shadowColor = this.color;
                    CTX.fillStyle = this.color;
                    CTX.beginPath();
                    CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    CTX.fill();
                    CTX.restore();
                };

                this.voidProjectiles.push(missile);
            }, 500 + i * 200);
        }
        if (window.playSound) playSound('shoot');
    }

    attackDoomSpiral(player) {
        // Ultimate bullet hell
        const totalBullets = 60;
        for (let i = 0; i < totalBullets; i++) {
            setTimeout(() => {
                const angle = (i / 20) * Math.PI * 2 + this.pulseTimer * 0.1;
                const speed = 2.5 + (i % 3) * 0.5;
                const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                proj.isVoidProjectile = true;
                proj.radius = 8 * GAME_SCALE;
                proj.hp = 12;
                proj.maxHp = 12;
                proj.color = i % 2 === 0 ? '#ffffff' : '#ff00ff';
                proj.vx = Math.cos(angle) * speed;
                proj.vy = Math.sin(angle) * speed;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.x < -30 || this.x > CANVAS.width + 30 ||
                        this.y < -30 || this.y > CANVAS.height + 30) {
                        this.hp = 0;
                    }
                };

                this.voidProjectiles.push(proj);
            }, i * 20);
        }
        if (window.playSound) playSound('shoot');
    }

    // NEW: Void Crushers - The walls are closing in! (Claustrophobic DPS check)
    attackVoidCrushers(player) {
        // Spawn 2 massive crushers at left/right edges
        const sides = [-50, CANVAS.width + 50];
        sides.forEach((startX, i) => {
            const crusher = enemyPool.get(startX, CANVAS.height / 2, ENEMY_TYPES.TANK, 1);
            crusher.isVoidProjectile = true; // Make it damaging
            crusher.radius = 60 * GAME_SCALE;
            crusher.hp = 300; // High HP
            crusher.maxHp = 300;
            crusher.color = '#ff0000'; // Red danger
            crusher.vx = i === 0 ? 1 : -1; // Move to center slowly

            crusher.update = function (p, dt) {
                this.x += this.vx * dt * 60 * 0.05; // Slow movement

                // Panic effect: shake if close to center
                if (Math.abs(this.x - CANVAS.width / 2) < 100) {
                    this.x += (Math.random() - 0.5) * 5;
                }

                // Impact check (Center)
                if (Math.abs(this.x - CANVAS.width / 2) < 20) {
                    // CRUSH!
                    this.hp = 0;
                    createExplosion(this.x, this.y, 400, 0);
                    if (window.triggerHitstop) triggerHitstop(30);
                    // Massive damage to player if alive
                    if (p && !p.isDead) {
                        p.takeDamage(100); // Instakill feeling
                    }
                }
            };

            crusher.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);
                CTX.fillStyle = '#000000';
                CTX.strokeStyle = this.color;
                CTX.lineWidth = 4;
                CTX.shadowBlur = 20;
                CTX.shadowColor = this.color;
                // Tall crusher wall shape
                CTX.fillRect(-20, -200, 40, 400);
                CTX.strokeRect(-20, -200, 40, 400);

                // HP Bar
                const pct = this.hp / this.maxHp;
                CTX.fillStyle = '#ff0000';
                CTX.fillRect(-15, -190 + (1 - pct) * 380, 30, pct * 380);

                CTX.restore();
            };

            this.voidProjectiles.push(crusher);
        });
        if (window.playSound) playSound('boss'); // Danger sound
    }

    // NEW: Void Mines - Surprise bombs!
    attackVoidMines(player) {
        // Spawn mines near player that detonate after 3s
        const count = 5;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const x = 100 + Math.random() * (CANVAS.width - 200);
                const y = 100 + Math.random() * (CANVAS.height - 200);
                const mine = enemyPool.get(x, y, ENEMY_TYPES.BASIC, 1);
                mine.isVoidProjectile = true;
                mine.radius = 25 * GAME_SCALE;
                mine.hp = 30; // Destructible
                mine.maxHp = 30;
                mine.color = '#ffff00'; // Yellow caution
                mine.timer = 180; // 3 seconds

                mine.update = function (p, dt) {
                    this.timer -= dt;

                    // Countdown visuals
                    if (this.timer % 60 < 10 && window.playSound) playSound('blip');

                    if (this.timer <= 0) {
                        // DETONATE
                        this.hp = 0;
                        createExplosion(this.x, this.y, 150, 0);
                        // Spawn shrapnel
                        for (let k = 0; k < 8; k++) {
                            const angle = (k / 8) * Math.PI * 2;
                            const shrapnel = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                            shrapnel.isVoidProjectile = true;
                            shrapnel.radius = 8;
                            shrapnel.color = '#ff0000';
                            shrapnel.vx = Math.cos(angle) * 6;
                            shrapnel.vy = Math.sin(angle) * 6;
                            shrapnel.hp = 100; // Indestructible shrapnel
                            shrapnel.update = function (pl, d) {
                                this.x += this.vx * d;
                                this.y += this.vy * d;
                                if (this.x < -50 || this.x > CANVAS.width + 50 || this.y < -50 || this.y > CANVAS.height + 50) this.hp = 0;
                            };
                            if (window.boss7) window.boss7.voidProjectiles.push(shrapnel);
                        }
                    }
                };

                mine.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);
                    // Blinking red/yellow
                    const blink = Math.floor(this.timer / 10) % 2 === 0;
                    CTX.fillStyle = blink ? '#ff0000' : '#ffff00';
                    CTX.beginPath();
                    CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                    CTX.fill();
                    // Timer text
                    CTX.fillStyle = '#000000';
                    CTX.font = 'bold 20px Arial';
                    CTX.textAlign = 'center';
                    CTX.textBaseline = 'middle';
                    CTX.fillText(Math.ceil(this.timer / 60), 0, 0);
                    CTX.restore();
                };

                this.voidProjectiles.push(mine);
            }, i * 500);
        }
    }

    // =========================================================================
    // DAMAGE & DEATH
    // =========================================================================

    takeDamage(amount) {
        if (this.state === 'INTRO' || this.state === 'REBIRTHING' || this.isRebirthing) return;
        if (!this.active) return;

        // Phase 3: Shield blocks damage unless vulnerable
        if (this.phase === 3 && this.phase3ShieldActive && !this.isVulnerable) {
            // Show "shielded" feedback
            spawnParticles(this.x, this.y, 3, 2, '#ffffff');
            return; // No damage!
        }

        // Reduced damage if orbitals alive (Phase 1)
        if (this.phase === 1 && this.orbitals.length > 0) {
            amount = Math.floor(amount * 0.3);
        }

        // Apply damage directly (don't call super to prevent immediate death)
        this.hp -= amount;
        this.updateHealthBar();

        // Check for rebirth BEFORE death
        if (this.hp <= 0 && this.deathCount < this.maxDeaths) {
            this.hp = 1; // Keep alive
            this.deathCount++;
            this.isRebirthing = true;
            this.state = 'REBIRTHING';
            this.rebirthTimer = 0;
            this.clearAllEntities();

            document.getElementById('boss-name').innerText =
                this.phase === 1 ? "QUANTUM FOAM" : "THE BIG CRUNCH";
            document.getElementById('boss-name').style.color =
                this.phase === 1 ? BOSS_7_DATA.colors.phase2 : BOSS_7_DATA.colors.phase3;

            if (window.playSound) playSound('boss');
            console.log(`⚡ REBIRTH ${this.deathCount}/${this.maxDeaths} - Phase ${this.phase + 1} incoming!`);
            return; // Don't die!
        }

        // Final death
        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        super.die();

        // Respawn player in center of screen
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
            player.vx = 0;
            player.vy = 0;
        }

        console.log("🌌 THE SINGULARITY HAS BEEN DEFEATED! 🌌");
    }

    // =========================================================================
    // DRAWING
    // =========================================================================

    onDraw() {
        // Entities draw themselves via Enemy class

        // Main boss body
        CTX.save();
        CTX.translate(this.x, this.y);

        // Glitch effect
        if (this.glitchIntensity > 0) {
            CTX.translate((Math.random() - 0.5) * 10 * this.glitchIntensity,
                (Math.random() - 0.5) * 10 * this.glitchIntensity);
        }

        // Event horizon (outer glow)
        const grad = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius * 1.5);
        grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
        grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.8)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        CTX.fillStyle = grad;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
        CTX.fill();

        // Outer ring
        CTX.save();
        CTX.rotate(this.outerRingAngle);
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 4;
        CTX.shadowBlur = 20;
        CTX.shadowColor = this.getPhaseColor();
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 1.2, 0, Math.PI * 2);
        CTX.stroke();
        CTX.restore();

        // Inner ring
        CTX.save();
        CTX.rotate(this.innerRingAngle);
        CTX.strokeStyle = '#ffffff';
        CTX.lineWidth = 2;
        CTX.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            CTX.moveTo(Math.cos(a) * this.radius * 0.5, Math.sin(a) * this.radius * 0.5);
            CTX.lineTo(Math.cos(a) * this.radius * 0.9, Math.sin(a) * this.radius * 0.9);
        }
        CTX.stroke();
        CTX.restore();

        // Core
        CTX.fillStyle = '#000000';
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        CTX.fill();

        // Core glow
        CTX.shadowBlur = 30;
        CTX.shadowColor = this.getPhaseColor();
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 3;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.4, 0, Math.PI * 2);
        CTX.stroke();

        CTX.restore();

        // Draw Phase 3 Shield UI (after boss body)
        this.drawPhase3ShieldUI();
    }
}

// Global instance for BossManager registry
const boss7 = new BossSingularity();
window.boss7 = boss7;
