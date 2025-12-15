// game/boss_5.js - CHRONOS - Time Lord Boss (Level 40)

const BOSS_5_DATA = {
    name: 'CHRONOS',
    hp: 15000,
    score: 12000,
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
        this.radius = 60;

        // Visuals
        this.clockAngle = 0;
        this.hourHand = 0;
        this.minuteHand = 0;
        this.pulseTimer = 0;
        this.phaseShiftAlpha = 1;

        // Combat
        this.state = 'IDLE';
        this.introTimer = 0;
        this.timeZones = [];
        this.echoClones = [];
        this.rewindProjectiles = [];
        this.isPhaseShifting = false;
        this.phaseShiftTimer = 0;

        // Attack tracking
        this.lastPositions = []; // For rewind mechanic

        // Death Config
        this.deathExplosionDuration = 3000;
        this.deathHitstopDuration = 200;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -150;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.phase = 1;
        this.isPhaseShifting = false;
        this.phaseShiftAlpha = 1;

        this.timeZones = [];
        this.echoClones = [];
        this.rewindProjectiles = [];
        this.lastPositions = [];

        document.getElementById('boss-name').innerText = "⏱️ TEMPORAL ANOMALY ⏱️";
        document.getElementById('boss-name').style.color = '#00aaff';

        console.log("⏰ CHRONOS: TIME ITSELF BENDS ⏰");
    }

    onUpdate(player, dt) {
        // Clock hands animation
        this.clockAngle += 0.01 * dt;
        this.hourHand += 0.005 * dt;
        this.minuteHand += 0.02 * dt;
        this.pulseTimer += dt;

        // Track player positions for rewind
        if (this.state !== 'INTRO' && typeof player !== 'undefined') {
            this.lastPositions.push({ x: player.x, y: player.y, time: Date.now() });
            if (this.lastPositions.length > 120) this.lastPositions.shift();
        }

        // --- INTRO ---
        if (this.state === 'INTRO') {
            this.handleIntro(player, dt);
            return;
        }

        // --- PHASE SHIFT (Invulnerability) ---
        if (this.isPhaseShifting) {
            this.phaseShiftTimer -= dt;
            this.phaseShiftAlpha = 0.2 + Math.sin(this.phaseShiftTimer * 0.3) * 0.15;

            if (this.phaseShiftTimer <= 0) {
                this.isPhaseShifting = false;
                this.phaseShiftAlpha = 1;
            }
            this.updateTimeZones(player, dt);
            this.updateEchoClones(player, dt);
            return; // Skip other updates during phase shift
        }

        // --- PHASE TRANSITIONS ---
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.6 && this.phase === 1) this.enterPhase(2);
        else if (hpPercent <= 0.3 && this.phase === 2) this.enterPhase(3);

        // --- MOVEMENT ---
        this.handleMovement(dt);

        // --- ATTACKS ---
        this.attackTimer += dt;

        if (this.state === 'IDLE' && this.attackTimer > 100) {
            this.chooseAttack();
        }

        this.updateTimeZones(player, dt);
        this.updateEchoClones(player, dt);
        this.updateRewindProjectiles(player, dt);
    }

    handleIntro(player, dt) {
        this.introTimer += dt;

        if (this.introTimer < 150) {
            // Descend
            this.y += (200 - this.y) * 0.02 * dt;

            // Time distortion effects
            if (this.introTimer % 10 < 1) {
                const glitchTexts = ['CHRONOS', '∞ TIME ∞', '00:00:00', 'REWIND', 'LOOP'];
                document.getElementById('boss-name').innerText =
                    glitchTexts[Math.floor(Math.random() * glitchTexts.length)];
            }

            // Spawn clock particles
            if (this.introTimer % 8 < 1) {
                const angle = Math.random() * Math.PI * 2;
                spawnParticles(
                    this.x + Math.cos(angle) * 100,
                    this.y + Math.sin(angle) * 100,
                    2, 3, '#00aaff'
                );
            }
        } else if (this.introTimer < 220) {
            // Flash clock hands
            document.getElementById('boss-name').innerText = "CHRONOS AWAKENS";
        } else {
            this.state = 'IDLE';
            document.getElementById('boss-name').innerText = BOSS_5_DATA.name;
            document.getElementById('boss-name').style.color = BOSS_5_DATA.colors.phase1;
            createExplosion(this.x, this.y, 150, 0);
            if (window.playSound) playSound('levelup');
        }
    }

    handleMovement(dt) {
        // Teleport-like movement with smooth transitions
        const speed = this.phase === 3 ? 0.06 : 0.03;
        const orbitRadius = 180 + Math.sin(this.pulseTimer * 0.01) * 80;

        const targetX = CANVAS.width / 2 + Math.cos(this.pulseTimer * 0.008) * orbitRadius;
        const targetY = 200 + Math.sin(this.pulseTimer * 0.006) * 100;

        this.x += (targetX - this.x) * speed * dt;
        this.y += (targetY - this.y) * speed * dt;
    }

    enterPhase(phaseNum) {
        this.phase = phaseNum;
        this.state = 'IDLE';
        this.attackTimer = 0;

        // Phase shift effect
        this.isPhaseShifting = true;
        this.phaseShiftTimer = 90;

        const color = phaseNum === 2 ? BOSS_5_DATA.colors.phase2 : BOSS_5_DATA.colors.phase3;
        document.getElementById('boss-name').style.color = color;

        const phaseName = phaseNum === 2 ? 'DISTORTION' : 'SINGULARITY';
        document.getElementById('boss-name').innerText = `CHRONOS - ${phaseName}`;

        createExplosion(this.x, this.y, 400, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerHitstop) triggerHitstop(50);

        // Clear old mechanics
        this.timeZones = [];
        this.echoClones = [];
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
            case 1: return ['SLOW_ZONE', 'TIME_BURST', 'CLOCK_HANDS'];
            case 2: return ['ECHO_CLONE', 'REWIND', 'ACCELERATE'];
            case 3: return ['TIME_STOP', 'CHAOS_LOOP', 'PHASE_BARRAGE'];
            default: return ['SLOW_ZONE'];
        }
    }

    executeAttack(attack) {
        console.log(`CHRONOS ATTACK: ${attack}`);

        switch (attack) {
            case 'SLOW_ZONE':
                this.attackSlowZone();
                break;
            case 'TIME_BURST':
                this.attackTimeBurst();
                break;
            case 'CLOCK_HANDS':
                this.attackClockHands();
                break;
            case 'ECHO_CLONE':
                this.attackEchoClone();
                break;
            case 'REWIND':
                this.attackRewind();
                break;
            case 'ACCELERATE':
                this.attackAccelerate();
                break;
            case 'TIME_STOP':
                this.attackTimeStop();
                break;
            case 'CHAOS_LOOP':
                this.attackChaosLoop();
                break;
            case 'PHASE_BARRAGE':
                this.attackPhaseBarrage();
                break;
        }

        setTimeout(() => {
            this.state = 'IDLE';
        }, 2500);
    }

    // --- PHASE 1 ATTACKS ---

    attackSlowZone() {
        // Create slow zones that trap the player
        for (let i = 0; i < 3; i++) {
            this.timeZones.push({
                x: Math.random() * (CANVAS.width - 200) + 100,
                y: Math.random() * (CANVAS.height - 200) + 100,
                radius: 0,
                maxRadius: 120,
                type: 'slow',
                slowFactor: 0.3,
                life: 400,
                color: 'rgba(0, 170, 255, 0.3)'
            });
        }
        if (window.playSound) playSound('shoot');
    }

    attackTimeBurst() {
        // Radial burst of projectiles
        const count = 16;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
            bullet.radius = 12;
            bullet.hp = 2;
            bullet.color = '#00aaff';
            bullet.vx = Math.cos(angle) * 4;
            bullet.vy = Math.sin(angle) * 4;

            bullet.update = function (p, d) {
                this.x += this.vx * d;
                this.y += this.vy * d;
                // Trail effect
                if (Math.random() < 0.3) {
                    spawnParticles(this.x, this.y, 1, 2, '#00aaff');
                }
                this.draw();
            };
        }
        if (window.playSound) playSound('shoot');
    }

    attackClockHands() {
        // Sweeping laser hands like clock
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const hourAngle = this.hourHand + (i * 0.1);
                const minuteAngle = this.minuteHand + (i * 0.2);

                // Hour hand bullet
                const b1 = enemyPool.get(
                    this.x + Math.cos(hourAngle) * 100,
                    this.y + Math.sin(hourAngle) * 100,
                    ENEMY_TYPES.BASIC, 1
                );
                b1.radius = 15;
                b1.color = '#00aaff';
                b1.hp = 1;
                b1.update = function (p, d) {
                    this.x += Math.cos(hourAngle) * 3 * d;
                    this.y += Math.sin(hourAngle) * 3 * d;
                    this.draw();
                };

                // Minute hand bullet
                const b2 = enemyPool.get(
                    this.x + Math.cos(minuteAngle) * 60,
                    this.y + Math.sin(minuteAngle) * 60,
                    ENEMY_TYPES.BASIC, 1
                );
                b2.radius = 8;
                b2.color = '#88ccff';
                b2.hp = 1;
                b2.update = function (p, d) {
                    this.x += Math.cos(minuteAngle) * 5 * d;
                    this.y += Math.sin(minuteAngle) * 5 * d;
                    this.draw();
                };
            }, i * 50);
        }
    }

    // --- PHASE 2 ATTACKS ---

    attackEchoClone() {
        // Create echo clones that mirror attacks with delay
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            this.echoClones.push({
                x: this.x + Math.cos(angle) * 200,
                y: this.y + Math.sin(angle) * 200,
                angle: angle,
                alpha: 0.6,
                life: 300,
                fireTimer: 30 + i * 40
            });
        }
        createExplosion(this.x, this.y, 100, 0);
    }

    attackRewind() {
        // Spawn wave of time-echo enemies (player can't move, so spawn shootable targets)
        const count = 10;
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const angle = (i / count) * Math.PI * 2;
                const enemy = enemyPool.get(
                    this.x + Math.cos(angle) * 150,
                    this.y + Math.sin(angle) * 150,
                    ENEMY_TYPES.BASIC, 1
                );
                enemy.radius = 10;
                enemy.hp = 2;
                enemy.maxHp = 2;
                enemy.color = '#aa00ff';
                enemy.isDead = false;
                spawnParticles(enemy.x, enemy.y, 3, 3, '#aa00ff');
            }, i * 80);
        }
        if (window.playSound) playSound('shoot');
    }

    attackAccelerate() {
        // Create fast zones
        for (let i = 0; i < 2; i++) {
            this.timeZones.push({
                x: this.x + (Math.random() - 0.5) * 400,
                y: this.y + 200 + Math.random() * 200,
                radius: 0,
                maxRadius: 150,
                type: 'fast',
                speedFactor: 3,
                life: 300,
                color: 'rgba(170, 0, 255, 0.3)'
            });
        }

        // Enemies in fast zones move faster!
        enemyPool.getActive().forEach(enemy => {
            enemy.speed *= 1.5;
        });
    }

    // --- PHASE 3 ATTACKS ---

    attackTimeStop() {
        // Brief time stop followed by burst damage
        if (window.triggerHitstop) triggerHitstop(40);

        // Warning indicator
        createExplosion(this.x, this.y, 200, 0);

        // After time stop, burst of fast projectiles
        setTimeout(() => {
            const count = 24;
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2;
                const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                bullet.radius = 10;
                bullet.hp = 1;
                bullet.color = '#ff0066';
                bullet.vx = Math.cos(angle) * 8;
                bullet.vy = Math.sin(angle) * 8;
                bullet.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.draw();
                };
            }
            if (window.playSound) playSound('shoot');
        }, 700);
    }

    attackChaosLoop() {
        // Spawns enemies that loop back around
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 2);
            enemy.color = '#ff0066';

            const startAngle = angle;
            let loopTimer = 0;

            enemy.update = function (p, d) {
                loopTimer += d * 0.03;
                const loopRadius = 100 + loopTimer * 50;
                this.x = this.startX + Math.cos(startAngle + loopTimer) * loopRadius;
                this.y = this.startY + Math.sin(startAngle + loopTimer) * loopRadius;
                this.draw();
            };
            enemy.startX = this.x;
            enemy.startY = this.y;
        }
    }

    attackPhaseBarrage() {
        // Rapid phase shifting attacks
        for (let i = 0; i < 15; i++) {
            setTimeout(() => {
                // Brief phase shift
                this.phaseShiftAlpha = 0.3;

                // Teleport and attack
                const angle = Math.random() * Math.PI * 2;
                this.x = CANVAS.width / 2 + Math.cos(angle) * 200;
                this.y = 200 + Math.sin(angle) * 100;

                // Fire at player
                if (typeof player !== 'undefined') {
                    const aimAngle = Math.atan2(player.y - this.y, player.x - this.x);
                    const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    bullet.radius = 12;
                    bullet.hp = 2;
                    bullet.color = '#ff0066';
                    bullet.vx = Math.cos(aimAngle) * 6;
                    bullet.vy = Math.sin(aimAngle) * 6;
                    bullet.update = function (p, d) {
                        this.x += this.vx * d;
                        this.y += this.vy * d;
                        this.draw();
                    };
                }

                setTimeout(() => {
                    this.phaseShiftAlpha = 1;
                }, 50);
            }, i * 150);
        }
    }

    // --- UPDATERS ---

    updateTimeZones(player, dt) {
        for (let i = this.timeZones.length - 1; i >= 0; i--) {
            const zone = this.timeZones[i];
            zone.life -= dt;

            // Grow
            if (zone.radius < zone.maxRadius) {
                zone.radius += 2 * dt;
            }

            // Time zones are now just visual/decorative since player can't move
            // They spawn enemies when active
            if (zone.life < zone.maxRadius && zone.life % 60 < 1 && !zone.spawned) {
                zone.spawned = true;
                const enemy = enemyPool.get(zone.x, zone.y, ENEMY_TYPES.BASIC, 1);
                enemy.radius = 12;
                enemy.hp = 1;
                enemy.color = zone.type === 'slow' ? '#00aaff' : '#aa00ff';
                enemy.isDead = false;
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
            clone.angle += 0.01 * dt;

            // Orbit around boss
            clone.x = this.x + Math.cos(clone.angle) * 180;
            clone.y = this.y + Math.sin(clone.angle) * 180;

            // Fire
            clone.fireTimer -= dt;
            if (clone.fireTimer <= 0 && typeof player !== 'undefined') {
                clone.fireTimer = 80;
                const aimAngle = Math.atan2(player.y - clone.y, player.x - clone.x);
                const bullet = enemyPool.get(clone.x, clone.y, ENEMY_TYPES.BASIC, 1);
                bullet.radius = 8;
                bullet.hp = 1;
                bullet.color = 'rgba(170, 0, 255, 0.7)';
                bullet.vx = Math.cos(aimAngle) * 4;
                bullet.vy = Math.sin(aimAngle) * 4;
                bullet.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.draw();
                };
            }

            // Fade out
            clone.alpha = Math.min(0.6, clone.life / 100);

            if (clone.life <= 0) {
                this.echoClones.splice(i, 1);
            }
        }
    }

    updateRewindProjectiles(player, dt) {
        // Placeholder for advanced rewind mechanics
    }

    takeDamage(amount) {
        if (this.state === 'INTRO' || this.isPhaseShifting) return;
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.timeZones = [];
        this.echoClones = [];

        // Epic time-freeze death
        if (window.triggerHitstop) triggerHitstop(100);

        // Radial explosion wave
        for (let wave = 0; wave < 5; wave++) {
            setTimeout(() => {
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    createExplosion(
                        this.x + Math.cos(angle) * (100 + wave * 80),
                        this.y + Math.sin(angle) * (100 + wave * 80),
                        80, 0
                    );
                }
            }, wave * 200);
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

            // Pulsing border
            CTX.strokeStyle = zone.type === 'slow' ? '#00aaff' : '#aa00ff';
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
            CTX.rotate(clone.angle);

            CTX.shadowBlur = 15;
            CTX.shadowColor = '#aa00ff';
            CTX.fillStyle = '#aa00ff';

            // Ghost clock shape
            CTX.beginPath();
            CTX.arc(0, 0, 30, 0, Math.PI * 2);
            CTX.fill();

            // Clock hands
            CTX.strokeStyle = '#fff';
            CTX.lineWidth = 2;
            CTX.beginPath();
            CTX.moveTo(0, 0);
            CTX.lineTo(Math.cos(this.hourHand) * 15, Math.sin(this.hourHand) * 15);
            CTX.stroke();

            CTX.restore();
        });

        // Draw main boss
        CTX.save();
        CTX.globalAlpha = this.phaseShiftAlpha;
        CTX.translate(this.x, this.y);

        // Outer time ring
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 4;
        CTX.setLineDash([15, 8]);
        CTX.beginPath();
        CTX.arc(0, 0, this.radius + 25, 0, Math.PI * 2);
        CTX.stroke();
        CTX.setLineDash([]);

        // Clock face
        CTX.shadowBlur = 30;
        CTX.shadowColor = this.getPhaseColor();

        // Outer circle
        CTX.fillStyle = '#111';
        CTX.beginPath();
        CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
        CTX.fill();

        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 5;
        CTX.stroke();

        // Clock markings
        CTX.strokeStyle = '#fff';
        CTX.lineWidth = 2;
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const inner = this.radius - 15;
            const outer = this.radius - 5;
            CTX.beginPath();
            CTX.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
            CTX.lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer);
            CTX.stroke();
        }

        // Hour hand
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 6;
        CTX.lineCap = 'round';
        CTX.beginPath();
        CTX.moveTo(0, 0);
        CTX.lineTo(
            Math.cos(this.hourHand - Math.PI / 2) * (this.radius * 0.4),
            Math.sin(this.hourHand - Math.PI / 2) * (this.radius * 0.4)
        );
        CTX.stroke();

        // Minute hand
        CTX.strokeStyle = '#fff';
        CTX.lineWidth = 4;
        CTX.beginPath();
        CTX.moveTo(0, 0);
        CTX.lineTo(
            Math.cos(this.minuteHand - Math.PI / 2) * (this.radius * 0.65),
            Math.sin(this.minuteHand - Math.PI / 2) * (this.radius * 0.65)
        );
        CTX.stroke();

        // Center dot
        CTX.fillStyle = this.getPhaseColor();
        CTX.beginPath();
        CTX.arc(0, 0, 8, 0, Math.PI * 2);
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
