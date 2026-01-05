// game/boss_8.js - THE GALAXY DEVOURER - Ultimate Endgame Boss (Level 60+)
// "When the stars themselves bow in terror, the Devourer awakens."

const BOSS_8_DATA = {
    name: 'GALAXY DEVOURER',
    hp: 8000,
    score: 150000,
    colors: {
        phase1: '#8b00ff',   // Deep Purple - Cosmic Hunger
        phase1Accent: '#00ffff',
        phase2: '#ff0055',   // Crimson - Dimensional Tear
        phase2Accent: '#ffd700',
        phase3: '#ffffff',   // White - Final Collapse
        phase3Accent: '#000000',
        core: '#1a0033',
        eventHorizon: '#330066'
    }
};

class BossGalaxyDevourer extends BossBase {
    constructor() {
        super();
        this.name = BOSS_8_DATA.name;
        this.maxHp = BOSS_8_DATA.hp;
        this.score = BOSS_8_DATA.score;
        this.radius = 120 * GAME_SCALE;

        // ═══════════════════════════════════════════════════════════════════
        // VISUAL STATE
        // ═══════════════════════════════════════════════════════════════════
        this.coreAngle = 0;
        this.pulseTimer = 0;
        this.galaxyRotation = 0;
        this.eventHorizonPulse = 0;
        this.starField = [];
        this.particleTrails = [];

        // Galaxy Arms
        this.galaxyArms = []; // Tracked entities
        this.armAngles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

        // Screen effects
        this.screenGlowIntensity = 0;
        this.dimensionalRiftActive = false;
        this.riftTimer = 0;

        // ═══════════════════════════════════════════════════════════════════
        // COMBAT STATE
        // ═══════════════════════════════════════════════════════════════════
        this.state = 'IDLE';
        this.introTimer = 0;
        this.phase = 1;
        this.attackTimer = 0;
        this.attackCooldown = 100;
        this.lastAttack = '';
        this.teleportTimer = 0;

        // Entity Tracking (ALL use enemyPool)
        this.cosmicDust = [];      // Phase 1 orbiting minions
        this.voidProjectiles = []; // All projectile attacks
        this.gravityWells = [];    // Pull zones
        this.voidLasers = [];      // Phase 2 lasers
        this.meteors = [];         // Large destructibles

        // Phase 3 Chaos State
        this.chaosIntensity = 0;
        this.realityShatterZones = [];

        // Death Config
        this.deathExplosionDuration = 10000;
        this.deathHitstopDuration = 800;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPAWN & INIT
    // ═══════════════════════════════════════════════════════════════════
    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -400;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.phase = 1;
        this.galaxyRotation = 0;

        // Clear all entities
        this.clearAllEntities();

        // Initialize star field
        this.initStarField();

        // Position player at bottom center
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 100;
            player.vx = 0;
            player.vy = 0;
        }

        document.getElementById('boss-name').innerText = "???";
        document.getElementById('boss-name').style.color = '#330066';

        console.log("🌌 THE GALAXY DEVOURER AWAKENS 🌌");
    }

    initStarField() {
        this.starField = [];
        for (let i = 0; i < 30; i++) {
            this.starField.push({
                angle: Math.random() * Math.PI * 2,
                distance: 60 + Math.random() * 100,
                speed: 0.005 + Math.random() * 0.01,
                size: 1 + Math.random() * 2,
                brightness: 0.5 + Math.random() * 0.5
            });
        }
    }

    clearAllEntities() {
        [...this.galaxyArms, ...this.cosmicDust, ...this.voidProjectiles,
        ...this.gravityWells, ...this.voidLasers, ...this.meteors].forEach(e => {
            if (e) e.hp = 0;
        });
        this.galaxyArms = [];
        this.cosmicDust = [];
        this.voidProjectiles = [];
        this.gravityWells = [];
        this.voidLasers = [];
        this.meteors = [];
        this.realityShatterZones = [];
    }

    getPhaseColor() {
        if (this.phase === 1) return BOSS_8_DATA.colors.phase1;
        if (this.phase === 2) return BOSS_8_DATA.colors.phase2;
        return BOSS_8_DATA.colors.phase3;
    }

    getPhaseAccent() {
        if (this.phase === 1) return BOSS_8_DATA.colors.phase1Accent;
        if (this.phase === 2) return BOSS_8_DATA.colors.phase2Accent;
        return BOSS_8_DATA.colors.phase3Accent;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MAIN UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════════
    onUpdate(player, dt) {
        this.pulseTimer += dt;
        this.coreAngle += 0.02 * dt;
        this.galaxyRotation += 0.008 * dt;
        this.eventHorizonPulse = Math.sin(this.pulseTimer * 0.05) * 0.3;

        // Update star field
        this.starField.forEach(star => {
            star.angle += star.speed * dt;
        });

        // Clean up dead entities
        this.galaxyArms = this.galaxyArms.filter(e => !e.isDead && e.hp > 0);
        this.cosmicDust = this.cosmicDust.filter(e => !e.isDead && e.hp > 0);
        this.voidProjectiles = this.voidProjectiles.filter(e => !e.isDead && e.hp > 0);
        this.gravityWells = this.gravityWells.filter(e => !e.isDead && e.hp > 0);
        this.voidLasers = this.voidLasers.filter(e => !e.isDead && e.hp > 0);
        this.meteors = this.meteors.filter(e => !e.isDead && e.hp > 0);

        // State Machine
        if (this.state === 'INTRO') {
            this.updateIntro(dt);
        } else if (this.state === 'FIGHTING') {
            this.updateFighting(player, dt);
        }

        // Phase transitions
        this.checkPhaseTransitions();
    }

    updateIntro(dt) {
        this.introTimer += dt;
        const targetY = 150 * GAME_SCALE;

        if (this.introTimer < 200) {
            // Descend with screen shake
            this.y += (targetY - this.y) * 0.015 * dt;

            if (this.introTimer > 50) {
                const shake = Math.min((this.introTimer - 50) / 30, 5);
                if (window.triggerScreenShake) window.triggerScreenShake(shake, 50);

                // Spawn particle effects
                if (Math.random() < 0.4) {
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 150 + Math.random() * 100;
                    spawnParticles(
                        this.x + Math.cos(angle) * dist,
                        this.y + Math.sin(angle) * dist,
                        2, 3, this.getPhaseColor()
                    );
                }
            }
        } else if (this.introTimer < 300) {
            // Dramatic reveal
            if (this.introTimer > 220 && this.introTimer < 230) {
                document.getElementById('boss-name').innerText = "GALAXY DEVOURER";
                document.getElementById('boss-name').style.color = this.getPhaseColor();
                if (window.playSound) playSound('boss');
                createExplosion(this.x, this.y, 400, 0);
                if (window.triggerScreenShake) window.triggerScreenShake(15, 500);
            }
        } else {
            // Start fight
            this.state = 'FIGHTING';
            this.spawnGalaxyArms();
            this.spawnCosmicDust(8);
        }
    }

    updateFighting(player, dt) {
        this.attackTimer += dt;

        // Phase-specific behaviors
        if (this.phase === 2) {
            this.updatePhase2Teleport(dt);
        }
        if (this.phase === 3) {
            this.updatePhase3Chaos(player, dt);
        }

        // Gentle floating motion
        const floatX = Math.cos(this.pulseTimer * 0.02) * 50;
        const floatY = Math.sin(this.pulseTimer * 0.03) * 20;
        const targetX = CANVAS.width / 2 + floatX;
        const targetY = 150 * GAME_SCALE + floatY;
        this.x += (targetX - this.x) * 0.02 * dt;
        this.y += (targetY - this.y) * 0.02 * dt;

        // Attack selection
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.selectAttack(player);
        }
    }

    checkPhaseTransitions() {
        const hpPercent = this.hp / this.maxHp;

        if (this.phase === 1 && hpPercent <= 0.6) {
            this.enterPhase2();
        } else if (this.phase === 2 && hpPercent <= 0.25) {
            this.enterPhase3();
        }
    }

    enterPhase2() {
        this.phase = 2;
        this.attackTimer = 0;
        this.attackCooldown = 80;
        this.teleportTimer = 0;

        // Visual transition
        createExplosion(this.x, this.y, 500, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerScreenShake) window.triggerScreenShake(20, 800);

        document.getElementById('boss-name').style.color = this.getPhaseColor();
        console.log("⚠️ DIMENSIONAL TEAR - PHASE 2 ⚠️");

        // Clear old minions, spawn new patterns
        this.cosmicDust.forEach(e => e.hp = 0);
        this.cosmicDust = [];
    }

    enterPhase3() {
        this.phase = 3;
        this.attackTimer = 0;
        this.attackCooldown = 50; // CHAOS MODE
        this.chaosIntensity = 0;

        // Massive visual transition
        createExplosion(this.x, this.y, 800, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerScreenShake) window.triggerScreenShake(30, 1500);

        document.getElementById('boss-name').style.color = this.getPhaseColor();
        console.log("💀 FINAL COLLAPSE - PHASE 3 💀");
    }

    updatePhase2Teleport(dt) {
        this.teleportTimer += dt;
        if (this.teleportTimer > 480) { // 8 seconds
            this.teleportTimer = 0;

            // Teleport effect
            createExplosion(this.x, this.y, 100, 0);

            const newX = 150 + Math.random() * (CANVAS.width - 300);
            const newY = 100 + Math.random() * 100;

            this.x = newX;
            this.y = newY;

            createExplosion(this.x, this.y, 100, 0);
            if (window.playSound) playSound('powerup');
        }
    }

    updatePhase3Chaos(player, dt) {
        this.chaosIntensity = Math.min(1, this.chaosIntensity + 0.001 * dt);

        // Constant screen shake
        if (window.triggerScreenShake) {
            window.triggerScreenShake(2 + this.chaosIntensity * 5, 100);
        }

        // Spawn chaos particles
        if (Math.random() < 0.3 * this.chaosIntensity) {
            const angle = Math.random() * Math.PI * 2;
            const dist = CANVAS.width * 0.6;
            spawnParticles(
                CANVAS.width / 2 + Math.cos(angle) * dist,
                CANVAS.height / 2 + Math.sin(angle) * dist,
                3, 5, this.getPhaseColor()
            );
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ATTACK SELECTION
    // ═══════════════════════════════════════════════════════════════════
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
            return ['attackSpiralBarrage', 'attackGravityWell', 'attackStarRain', 'attackMeteorStorm'];
        } else if (this.phase === 2) {
            return ['attackVoidLasers', 'attackDimensionRift', 'attackGalaxyCrush', 'attackSupernovaPulse'];
        } else {
            return ['attackApocalypseSpiral', 'attackBlackHoleSurge', 'attackRealityShatter', 'attackFinalJudgment'];
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENTITY SPAWNERS
    // ═══════════════════════════════════════════════════════════════════
    spawnGalaxyArms() {
        for (let i = 0; i < 4; i++) {
            const angle = this.armAngles[i];
            const arm = enemyPool.get(
                this.x + Math.cos(angle) * 80,
                this.y + Math.sin(angle) * 80,
                ENEMY_TYPES.TANK, 1
            );
            arm.isGalaxyArm = true;
            arm.armIndex = i;
            arm.orbAngle = angle;
            arm.orbitRadius = 80 * GAME_SCALE;
            arm.radius = 35 * GAME_SCALE;
            arm.hp = 300;
            arm.maxHp = 300;
            arm.color = this.getPhaseColor();
            arm.bossRef = this;

            arm.update = function (p, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.orbAngle = this.bossRef.armAngles[this.armIndex] + this.bossRef.galaxyRotation;
                this.x = this.bossRef.x + Math.cos(this.orbAngle) * this.orbitRadius;
                this.y = this.bossRef.y + Math.sin(this.orbAngle) * this.orbitRadius;
                this.color = this.bossRef.getPhaseColor();
            };

            arm.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);

                // Spiral arm shape
                const gradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                gradient.addColorStop(0, this.color);
                gradient.addColorStop(1, 'rgba(0,0,0,0)');

                CTX.shadowBlur = 25;
                CTX.shadowColor = this.color;
                CTX.fillStyle = gradient;
                CTX.beginPath();

                // Draw spiral
                for (let j = 0; j < 20; j++) {
                    const t = j / 20;
                    const spiralAngle = t * Math.PI * 2;
                    const spiralDist = t * this.radius;
                    const px = Math.cos(spiralAngle + this.orbAngle) * spiralDist;
                    const py = Math.sin(spiralAngle + this.orbAngle) * spiralDist;
                    if (j === 0) CTX.moveTo(px, py);
                    else CTX.lineTo(px, py);
                }
                CTX.lineTo(0, 0);
                CTX.fill();

                // Core glow
                CTX.fillStyle = '#ffffff';
                CTX.beginPath();
                CTX.arc(0, 0, 8, 0, Math.PI * 2);
                CTX.fill();

                CTX.restore();
            };

            this.galaxyArms.push(arm);
        }
    }

    spawnCosmicDust(count) {
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const dust = enemyPool.get(
                this.x + Math.cos(angle) * 200,
                this.y + Math.sin(angle) * 200,
                ENEMY_TYPES.SPEEDSTER, 1
            );
            dust.isCosmicDust = true;
            dust.dustAngle = angle;
            dust.orbitRadius = 180 + Math.random() * 40;
            dust.orbitSpeed = 0.02 + Math.random() * 0.01;
            dust.radius = 12 * GAME_SCALE;
            dust.hp = 40;
            dust.maxHp = 40;
            dust.color = this.getPhaseAccent();
            dust.bossRef = this;

            dust.update = function (p, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.dustAngle += this.orbitSpeed * dt;
                this.x = this.bossRef.x + Math.cos(this.dustAngle) * this.orbitRadius;
                this.y = this.bossRef.y + Math.sin(this.dustAngle) * this.orbitRadius;
                this.color = this.bossRef.getPhaseAccent();

                // Particle trail
                if (Math.random() < 0.2) {
                    spawnParticles(this.x, this.y, 1, 2, this.color, 0.5);
                }
            };

            dust.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);
                CTX.shadowBlur = 15;
                CTX.shadowColor = this.color;
                CTX.fillStyle = this.color;
                CTX.beginPath();
                CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                CTX.fill();
                CTX.restore();
            };

            this.cosmicDust.push(dust);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1 ATTACKS - COSMIC HUNGER
    // ═══════════════════════════════════════════════════════════════════
    attackSpiralBarrage(player) {
        // Each galaxy arm fires a stream of projectiles
        this.galaxyArms.forEach((arm, idx) => {
            if (arm.isDead || arm.hp <= 0) return;

            for (let i = 0; i < 8; i++) {
                setTimeout(() => {
                    const angle = arm.orbAngle + (i * 0.15);
                    const proj = enemyPool.get(arm.x, arm.y, ENEMY_TYPES.BASIC, 1);
                    proj.isVoidProjectile = true;
                    proj.radius = 10 * GAME_SCALE;
                    proj.hp = 30;
                    proj.maxHp = 30;
                    proj.color = this.getPhaseColor();
                    proj.vx = Math.cos(angle) * 5;
                    proj.vy = Math.sin(angle) * 5;

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
                }, i * 80 + idx * 200);
            }
        });
        if (window.playSound) playSound('shoot');
    }

    attackGravityWell(player) {
        // Create 2 gravity wells that pull the player - with safe distance from player
        const safeDistance = 150; // Minimum distance from player
        const positions = [];

        // Generate 2 positions that are safe from player
        for (let i = 0; i < 2; i++) {
            let pos, attempts = 0;
            do {
                pos = {
                    x: 100 + Math.random() * (CANVAS.width - 200),
                    y: 150 + Math.random() * (CANVAS.height - 300)
                };
                attempts++;
            } while (Math.hypot(pos.x - player.x, pos.y - player.y) < safeDistance && attempts < 10);
            positions.push(pos);
        }

        positions.forEach((pos, idx) => {
            setTimeout(() => {
                const well = enemyPool.get(pos.x, pos.y, ENEMY_TYPES.TANK, 1);
                well.isGravityWell = true;
                well.radius = 20;
                well.maxRadius = 100;
                well.hp = 160;
                well.maxHp = 160;
                well.color = '#330066';
                well.life = 300; // 5 seconds
                well.pullRadius = 200;

                well.update = function (p, dt) {
                    this.life -= dt;
                    if (this.life <= 0) {
                        this.hp = 0;
                        return;
                    }

                    // Expand
                    if (this.radius < this.maxRadius) {
                        this.radius += 0.5 * dt;
                    }

                    // Pull player
                    const dist = Math.hypot(p.x - this.x, p.y - this.y);
                    if (dist < this.pullRadius && dist > this.radius) {
                        const angle = Math.atan2(this.y - p.y, this.x - p.x);
                        const pullStrength = 2 * (1 - dist / this.pullRadius);
                        p.x += Math.cos(angle) * pullStrength * dt;
                        p.y += Math.sin(angle) * pullStrength * dt;
                    }
                };

                well.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);

                    // Event horizon effect
                    const gradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                    gradient.addColorStop(0, '#000000');
                    gradient.addColorStop(0.7, '#330066');
                    gradient.addColorStop(1, 'rgba(0,0,0,0)');

                    CTX.fillStyle = gradient;
                    CTX.beginPath();
                    CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
                    CTX.fill();

                    // Swirling rings
                    CTX.strokeStyle = '#8b00ff';
                    CTX.lineWidth = 2;
                    for (let j = 0; j < 3; j++) {
                        CTX.beginPath();
                        CTX.arc(0, 0, this.radius * (0.5 + j * 0.2), 0, Math.PI * 2);
                        CTX.stroke();
                    }

                    CTX.restore();
                };

                this.gravityWells.push(well);
            }, idx * 500);
        });
        if (window.playSound) playSound('powerup');
    }

    attackStarRain(player) {
        // Spawn 15 falling stars
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                const x = 50 + Math.random() * (CANVAS.width - 100);
                const star = enemyPool.get(x, -30, ENEMY_TYPES.BASIC, 1);
                star.isVoidProjectile = true;
                star.radius = 12 * GAME_SCALE;
                star.hp = 36;
                star.maxHp = 36;
                star.color = '#ffff00';
                star.vy = 4 + Math.random() * 2;
                star.vx = (Math.random() - 0.5) * 2;
                star.twinkle = Math.random() * Math.PI * 2;

                star.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    this.twinkle += 0.1 * dt;
                    if (this.y > CANVAS.height + 50) this.hp = 0;
                };

                star.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);

                    const scale = 1 + Math.sin(this.twinkle) * 0.2;
                    CTX.shadowBlur = 15;
                    CTX.shadowColor = this.color;
                    CTX.fillStyle = this.color;

                    // Star shape
                    CTX.beginPath();
                    for (let j = 0; j < 5; j++) {
                        const angle = (j * Math.PI * 2 / 5) - Math.PI / 2;
                        const outerR = this.radius * scale;
                        const innerR = this.radius * 0.4 * scale;
                        const ox = Math.cos(angle) * outerR;
                        const oy = Math.sin(angle) * outerR;
                        const ix = Math.cos(angle + Math.PI / 5) * innerR;
                        const iy = Math.sin(angle + Math.PI / 5) * innerR;
                        if (j === 0) CTX.moveTo(ox, oy);
                        else CTX.lineTo(ox, oy);
                        CTX.lineTo(ix, iy);
                    }
                    CTX.closePath();
                    CTX.fill();
                    CTX.restore();
                };

                this.voidProjectiles.push(star);
            }, i * 100);
        }
        if (window.playSound) playSound('shoot');
    }

    attackMeteorStorm(player) {
        // Large slow-moving destructible meteors
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                const x = 100 + Math.random() * (CANVAS.width - 200);
                const meteor = enemyPool.get(x, -80, ENEMY_TYPES.TANK, 1);
                meteor.isMeteor = true;
                meteor.radius = 40 * GAME_SCALE;
                meteor.hp = 100;
                meteor.maxHp = 100;
                meteor.color = '#ff4400';
                meteor.vy = 2;
                meteor.rotation = 0;
                meteor.rotationSpeed = 0.02 + Math.random() * 0.02;

                meteor.update = function (p, dt) {
                    this.y += this.vy * dt;
                    this.rotation += this.rotationSpeed * dt;
                    if (this.y > CANVAS.height + 100) this.hp = 0;

                    // Trailing particles
                    if (Math.random() < 0.3) {
                        spawnParticles(this.x, this.y - this.radius, 2, 3, '#ff6600');
                    }
                };

                meteor.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);
                    CTX.rotate(this.rotation);

                    // Meteor body
                    const gradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius);
                    gradient.addColorStop(0, '#ff6600');
                    gradient.addColorStop(0.5, '#ff4400');
                    gradient.addColorStop(1, '#660000');

                    CTX.shadowBlur = 30;
                    CTX.shadowColor = '#ff4400';
                    CTX.fillStyle = gradient;

                    // Irregular shape
                    CTX.beginPath();
                    for (let j = 0; j < 8; j++) {
                        const angle = (j / 8) * Math.PI * 2;
                        const r = this.radius * (0.8 + Math.sin(j * 3) * 0.2);
                        const px = Math.cos(angle) * r;
                        const py = Math.sin(angle) * r;
                        if (j === 0) CTX.moveTo(px, py);
                        else CTX.lineTo(px, py);
                    }
                    CTX.closePath();
                    CTX.fill();

                    // HP bar
                    if (this.hp < this.maxHp) {
                        const pct = this.hp / this.maxHp;
                        CTX.fillStyle = pct > 0.5 ? '#00ff00' : '#ff0000';
                        CTX.fillRect(-25, this.radius + 10, 50 * pct, 5);
                    }

                    CTX.restore();
                };

                this.meteors.push(meteor);
            }, i * 400);
        }
        if (window.playSound) playSound('shoot');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2 ATTACKS - DIMENSIONAL TEAR
    // ═══════════════════════════════════════════════════════════════════
    attackVoidLasers(player) {
        // 4 rotating laser beams with telegraph
        const telegraphDuration = 90; // 1.5 seconds warning

        // Telegraph phase
        this.dimensionalRiftActive = true;

        setTimeout(() => {
            // Fire the lasers
            for (let i = 0; i < 4; i++) {
                const baseAngle = this.galaxyRotation + (i / 4) * Math.PI * 2;

                // Create laser segments along the beam
                for (let seg = 0; seg < 20; seg++) {
                    const dist = 100 + seg * 40;
                    const laser = enemyPool.get(
                        this.x + Math.cos(baseAngle) * dist,
                        this.y + Math.sin(baseAngle) * dist,
                        ENEMY_TYPES.BASIC, 1
                    );
                    laser.isVoidLaser = true;
                    laser.laserAngle = baseAngle;
                    laser.laserDist = dist;
                    laser.radius = 15 * GAME_SCALE;
                    laser.hp = 50;
                    laser.maxHp = 50;
                    laser.color = this.getPhaseColor();
                    laser.life = 120; // 2 seconds
                    laser.bossRef = this;
                    laser.rotationSpeed = 0.01;

                    laser.update = function (p, dt) {
                        if (!this.bossRef || !this.bossRef.active) {
                            this.hp = -1; // Mark for cleanup
                            return;
                        }
                        this.life -= dt;
                        if (this.life <= 0) {
                            this.hp = -1; // Mark for cleanup - will be released by pool
                            return;
                        }
                        // Rotate with boss
                        this.laserAngle += this.rotationSpeed * dt;
                        this.x = this.bossRef.x + Math.cos(this.laserAngle) * this.laserDist;
                        this.y = this.bossRef.y + Math.sin(this.laserAngle) * this.laserDist;
                    };

                    laser.draw = function () {
                        CTX.save();
                        CTX.translate(this.x, this.y);
                        CTX.shadowBlur = 20;
                        CTX.shadowColor = this.color;
                        CTX.fillStyle = this.color;
                        CTX.fillRect(-this.radius, -5, this.radius * 2, 10);
                        CTX.restore();
                    };

                    this.voidLasers.push(laser);
                }
            }
            this.dimensionalRiftActive = false;
            if (window.playSound) playSound('shoot');
            if (window.triggerScreenShake) window.triggerScreenShake(10, 300);
        }, telegraphDuration * 16.67); // Convert frames to ms
    }

    attackDimensionRift(player) {
        // Open portals on sides that spawn enemies
        const sides = [
            { x: -30, spawnVx: 4 },
            { x: CANVAS.width + 30, spawnVx: -4 }
        ];

        sides.forEach((side, idx) => {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => {
                    const y = 100 + (i / 4) * (CANVAS.height * 0.6);
                    const rift = enemyPool.get(side.x, y, ENEMY_TYPES.SPEEDSTER, 1);
                    rift.isVoidProjectile = true;
                    rift.radius = 15 * GAME_SCALE;
                    rift.hp = 40;
                    rift.maxHp = 40;
                    rift.color = '#ff00ff';
                    rift.vx = side.spawnVx;
                    rift.vy = (Math.random() - 0.5) * 2;

                    rift.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -100 || this.x > CANVAS.width + 100) this.hp = 0;
                    };

                    rift.draw = function () {
                        CTX.save();
                        CTX.translate(this.x, this.y);
                        CTX.shadowBlur = 15;
                        CTX.shadowColor = this.color;
                        CTX.strokeStyle = this.color;
                        CTX.lineWidth = 3;

                        // Rift shape
                        CTX.beginPath();
                        CTX.moveTo(-this.radius, 0);
                        CTX.lineTo(0, -this.radius);
                        CTX.lineTo(this.radius, 0);
                        CTX.lineTo(0, this.radius);
                        CTX.closePath();
                        CTX.stroke();

                        CTX.restore();
                    };

                    this.voidProjectiles.push(rift);
                }, idx * 300 + i * 150);
            }
        });
        if (window.playSound) playSound('powerup');
    }

    attackGalaxyCrush(player) {
        // Arms sweep across screen
        this.galaxyArms.forEach((arm, idx) => {
            if (arm.isDead || arm.hp <= 0) return;

            // Temporarily expand orbit and sweep
            const originalRadius = arm.orbitRadius;
            arm.orbitRadius = 300 * GAME_SCALE;
            arm.orbitSpeed = 0.05;

            setTimeout(() => {
                arm.orbitRadius = originalRadius;
                arm.orbitSpeed = undefined;
            }, 2000);
        });

        // Spawn projectiles during sweep
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const dist = 100 + Math.random() * 150;
                const proj = enemyPool.get(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    ENEMY_TYPES.BASIC, 1
                );
                proj.isVoidProjectile = true;
                proj.radius = 8 * GAME_SCALE;
                proj.hp = 24;
                proj.maxHp = 24;
                proj.color = this.getPhaseColor();

                const toPlayer = Math.atan2(player.y - proj.y, player.x - proj.x);
                proj.vx = Math.cos(toPlayer) * 4;
                proj.vy = Math.sin(toPlayer) * 4;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.y > CANVAS.height + 50) this.hp = 0;
                };

                this.voidProjectiles.push(proj);
            }, i * 100);
        }
        if (window.playSound) playSound('shoot');
    }

    attackSupernovaPulse(player) {
        // Expanding rings that must be destroyed
        for (let ring = 0; ring < 3; ring++) {
            setTimeout(() => {
                const pulseCount = 12;
                for (let i = 0; i < pulseCount; i++) {
                    const angle = (i / pulseCount) * Math.PI * 2;
                    const pulse = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    pulse.isVoidProjectile = true;
                    pulse.radius = 12 * GAME_SCALE;
                    pulse.hp = 40;
                    pulse.maxHp = 40;
                    pulse.color = '#ffd700';
                    pulse.vx = Math.cos(angle) * 3;
                    pulse.vy = Math.sin(angle) * 3;

                    pulse.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -50 || this.x > CANVAS.width + 50 ||
                            this.y < -50 || this.y > CANVAS.height + 50) {
                            this.hp = 0;
                        }
                    };

                    pulse.draw = function () {
                        CTX.save();
                        CTX.shadowBlur = 15;
                        CTX.shadowColor = this.color;
                        CTX.fillStyle = this.color;
                        CTX.beginPath();
                        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        CTX.fill();
                        CTX.restore();
                    };

                    this.voidProjectiles.push(pulse);
                }
                if (window.playSound) playSound('shoot');
            }, ring * 400);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3 ATTACKS - FINAL COLLAPSE
    // ═══════════════════════════════════════════════════════════════════
    attackApocalypseSpiral(player) {
        // Continuous spiral from all 4 arms
        let bulletCount = 0;
        const maxBullets = 60;

        const spawnBullet = () => {
            if (bulletCount >= maxBullets || !this.active) return;

            this.galaxyArms.forEach(arm => {
                if (arm.isDead || arm.hp <= 0) return;

                const angle = arm.orbAngle + bulletCount * 0.3;
                const proj = enemyPool.get(arm.x, arm.y, ENEMY_TYPES.BASIC, 1);
                proj.isVoidProjectile = true;
                proj.radius = 8 * GAME_SCALE;
                proj.hp = 20;
                proj.maxHp = 20;
                proj.color = this.getPhaseColor();
                proj.vx = Math.cos(angle) * 5;
                proj.vy = Math.sin(angle) * 5;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.x < -50 || this.x > CANVAS.width + 50 ||
                        this.y < -50 || this.y > CANVAS.height + 50) {
                        this.hp = 0;
                    }
                };

                this.voidProjectiles.push(proj);
            });

            bulletCount++;
            if (bulletCount < maxBullets) {
                setTimeout(spawnBullet, 50);
            }
        };

        spawnBullet();
        if (window.playSound) playSound('shoot');
    }

    attackBlackHoleSurge(player) {
        // Massive gravity pull for 3 seconds
        const surgeWell = enemyPool.get(this.x, this.y, ENEMY_TYPES.TANK, 1);
        surgeWell.isGravityWell = true;
        surgeWell.radius = 60;
        surgeWell.hp = 9999; // Near invincible
        surgeWell.maxHp = 9999;
        surgeWell.color = '#000000';
        surgeWell.life = 180; // 3 seconds
        surgeWell.pullRadius = 500;
        surgeWell.bossRef = this;

        surgeWell.update = function (p, dt) {
            if (!this.bossRef || !this.bossRef.active) {
                this.hp = 0;
                return;
            }
            this.life -= dt;
            if (this.life <= 0) {
                this.hp = 0;
                return;
            }

            // Follow boss
            this.x = this.bossRef.x;
            this.y = this.bossRef.y;

            // Strong pull
            const dist = Math.hypot(p.x - this.x, p.y - this.y);
            if (dist < this.pullRadius && dist > 80) {
                const angle = Math.atan2(this.y - p.y, this.x - p.x);
                const pullStrength = 4 * (1 - dist / this.pullRadius);
                p.x += Math.cos(angle) * pullStrength * dt;
                p.y += Math.sin(angle) * pullStrength * dt;
            }

            // Spawn danger projectiles around edge
            if (Math.random() < 0.15) {
                const spawnAngle = Math.random() * Math.PI * 2;
                const spawnDist = 100;
                const proj = enemyPool.get(
                    this.x + Math.cos(spawnAngle) * spawnDist,
                    this.y + Math.sin(spawnAngle) * spawnDist,
                    ENEMY_TYPES.BASIC, 1
                );
                proj.radius = 10;
                proj.hp = 30;
                proj.color = '#8b00ff';
                proj.vx = Math.cos(spawnAngle) * 3;
                proj.vy = Math.sin(spawnAngle) * 3;
                proj.update = function (pl, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    if (this.y > CANVAS.height + 50) this.hp = 0;
                };
            }
        };

        surgeWell.draw = function () {
            CTX.save();
            CTX.translate(this.x, this.y);

            // Massive event horizon
            const gradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
            gradient.addColorStop(0, '#000000');
            gradient.addColorStop(0.5, '#1a0033');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');

            CTX.fillStyle = gradient;
            CTX.beginPath();
            CTX.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
            CTX.fill();

            // Accretion disk
            CTX.strokeStyle = '#8b00ff';
            CTX.lineWidth = 3;
            CTX.beginPath();
            CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
            CTX.stroke();

            CTX.restore();
        };

        this.gravityWells.push(surgeWell);
        if (window.playSound) playSound('powerup');
        if (window.triggerScreenShake) window.triggerScreenShake(15, 3000);
    }

    attackRealityShatter(player) {
        // Random danger zones appear on screen
        const zoneCount = 5;
        this.realityShatterZones = [];

        const safeDistance = 150; // Minimum distance from player
        for (let i = 0; i < zoneCount; i++) {
            setTimeout(() => {
                // Find a position safe from player
                let zoneX, zoneY, attempts = 0;
                do {
                    zoneX = 100 + Math.random() * (CANVAS.width - 200);
                    zoneY = 150 + Math.random() * (CANVAS.height - 300);
                    attempts++;
                } while (Math.hypot(zoneX - player.x, zoneY - player.y) < safeDistance && attempts < 10);

                const zone = {
                    x: zoneX,
                    y: zoneY,
                    radius: 80 + Math.random() * 40,
                    alpha: 0,
                    life: 180,
                    warning: true
                };
                this.realityShatterZones.push(zone);

                // After warning, spawn projectiles in zone
                setTimeout(() => {
                    zone.warning = false;

                    // Spawn projectiles
                    for (let j = 0; j < 8; j++) {
                        const angle = (j / 8) * Math.PI * 2;
                        const proj = enemyPool.get(zone.x, zone.y, ENEMY_TYPES.BASIC, 1);
                        proj.isVoidProjectile = true;
                        proj.radius = 10 * GAME_SCALE;
                        proj.hp = 24;
                        proj.maxHp = 24;
                        proj.color = '#ffffff';
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

                        this.voidProjectiles.push(proj);
                    }
                }, 1500);
            }, i * 300);
        }
        if (window.playSound) playSound('powerup');
    }

    attackFinalJudgment(player) {
        // Combination of all attacks
        this.attackSpiralBarrage(player);
        setTimeout(() => this.attackStarRain(player), 500);
        setTimeout(() => this.attackSupernovaPulse(player), 1000);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DAMAGE & DEATH
    // ═══════════════════════════════════════════════════════════════════
    takeDamage(amount) {
        if (this.state === 'INTRO') return;
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.state = 'DEAD';

        // Epic death sequence
        console.log("🌌 THE GALAXY DEVOURER HAS BEEN VANQUISHED 🌌");

        // Clear all entities
        this.clearAllEntities();

        // Massive explosion chain
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 200;
                createExplosion(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    200, 0
                );
            }, i * 100);
        }

        // Reset player position
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DRAWING
    // ═══════════════════════════════════════════════════════════════════
    onDraw() {
        CTX.save();
        CTX.translate(this.x, this.y);

        // Draw reality shatter zones
        this.realityShatterZones.forEach(zone => {
            CTX.save();
            CTX.translate(zone.x - this.x, zone.y - this.y);

            if (zone.warning) {
                // Warning indicator
                CTX.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
                CTX.lineWidth = 3;
                CTX.setLineDash([10, 5]);
                CTX.beginPath();
                CTX.arc(0, 0, zone.radius, 0, Math.PI * 2);
                CTX.stroke();
                CTX.setLineDash([]);
            }

            CTX.restore();
        });

        // ─── EVENT HORIZON (Background) ───
        const horizonRadius = this.radius * 1.8 + this.eventHorizonPulse * 20;
        const horizonGradient = CTX.createRadialGradient(0, 0, 0, 0, 0, horizonRadius);
        horizonGradient.addColorStop(0, BOSS_8_DATA.colors.core);
        horizonGradient.addColorStop(0.5, BOSS_8_DATA.colors.eventHorizon);
        horizonGradient.addColorStop(1, 'rgba(0,0,0,0)');

        CTX.fillStyle = horizonGradient;
        CTX.beginPath();
        CTX.arc(0, 0, horizonRadius, 0, Math.PI * 2);
        CTX.fill();

        // ─── STAR FIELD ───
        CTX.save();
        CTX.rotate(this.galaxyRotation);
        this.starField.forEach(star => {
            const sx = Math.cos(star.angle) * star.distance;
            const sy = Math.sin(star.angle) * star.distance;

            CTX.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            CTX.beginPath();
            CTX.arc(sx, sy, star.size, 0, Math.PI * 2);
            CTX.fill();
        });
        CTX.restore();

        // ─── GALAXY SPIRAL VISUAL ───
        CTX.save();
        CTX.rotate(this.galaxyRotation);

        for (let arm = 0; arm < 4; arm++) {
            const armAngle = (arm / 4) * Math.PI * 2;
            CTX.save();
            CTX.rotate(armAngle);

            // Spiral arm trail
            CTX.strokeStyle = this.getPhaseColor();
            CTX.lineWidth = 8;
            CTX.globalAlpha = 0.4;
            CTX.beginPath();
            for (let t = 0; t < 1; t += 0.05) {
                const spiralR = 40 + t * 120;
                const spiralA = t * Math.PI;
                const px = Math.cos(spiralA) * spiralR;
                const py = Math.sin(spiralA) * spiralR;
                if (t === 0) CTX.moveTo(px, py);
                else CTX.lineTo(px, py);
            }
            CTX.stroke();
            CTX.globalAlpha = 1;

            CTX.restore();
        }
        CTX.restore();

        // ─── CORE ───
        CTX.shadowBlur = 40;
        CTX.shadowColor = this.getPhaseColor();

        // Outer ring
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 4;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.8, 0, Math.PI * 2);
        CTX.stroke();

        // Inner core
        const coreGradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.5);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.3, this.getPhaseColor());
        coreGradient.addColorStop(1, '#000000');

        CTX.fillStyle = coreGradient;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.5, 0, Math.PI * 2);
        CTX.fill();

        // Pulsing rings
        for (let ring = 0; ring < 3; ring++) {
            const ringRadius = this.radius * (0.6 + ring * 0.15) + Math.sin(this.pulseTimer * 0.1 + ring) * 5;
            CTX.strokeStyle = this.getPhaseAccent();
            CTX.lineWidth = 2;
            CTX.globalAlpha = 0.5 - ring * 0.15;
            CTX.beginPath();
            CTX.arc(0, 0, ringRadius, 0, Math.PI * 2);
            CTX.stroke();
        }
        CTX.globalAlpha = 1;

        // ─── DIMENSIONAL RIFT TELEGRAPH ───
        if (this.dimensionalRiftActive) {
            CTX.strokeStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
            CTX.lineWidth = 5;

            for (let i = 0; i < 4; i++) {
                const angle = this.galaxyRotation + (i / 4) * Math.PI * 2;
                CTX.beginPath();
                CTX.moveTo(0, 0);
                CTX.lineTo(Math.cos(angle) * CANVAS.width, Math.sin(angle) * CANVAS.width);
                CTX.stroke();
            }
        }

        // ─── PHASE 3 EDGE GLOW ───
        if (this.phase === 3) {
            CTX.restore();
            CTX.save();

            // Screen edge danger glow
            const edgeGradient = CTX.createRadialGradient(
                CANVAS.width / 2, CANVAS.height / 2, CANVAS.width * 0.3,
                CANVAS.width / 2, CANVAS.height / 2, CANVAS.width * 0.7
            );
            edgeGradient.addColorStop(0, 'rgba(0,0,0,0)');
            edgeGradient.addColorStop(1, `rgba(255, 0, 0, ${0.1 + this.chaosIntensity * 0.2})`);

            CTX.fillStyle = edgeGradient;
            CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

            CTX.restore();
            return;
        }

        CTX.shadowBlur = 0;
        CTX.restore();
    }
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL INSTANCE
// ═══════════════════════════════════════════════════════════════════
const boss8 = new BossGalaxyDevourer();
window.boss8 = boss8;
