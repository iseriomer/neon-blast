// game/boss_2.js - The Architect of Void (Refactored)

const BOSS_2_DATA = {
    name: 'NEXUS PRIME',
    hp: 10000,
    score: 5000,
    colors: ['#00ffff', '#ff0055', '#ffff00']
};

class BossNexus extends BossBase {
    constructor() {
        super();
        this.name = BOSS_2_DATA.name;
        this.maxHp = BOSS_2_DATA.hp;
        this.score = BOSS_2_DATA.score;
        this.radius = 100; // Visuals match this

        // Visuals
        this.angle = 0;
        this.pulse = 0;
        this.floatY = 0;
        this.rings = [];

        // Combat
        this.currentAttack = null;
        this.state = 'IDLE';
        this.telegraphTimer = 0;
        this.introTimer = 0;
        this.targetY = 150;

        // Death Config
        this.deathExplosionDuration = 2000;
        this.deathHitstopDuration = 180;

        // Specific Attack Data
        this.targetPos = { x: 0, y: 0 };
        this.laserLines = [];
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.y = -200; // Override Y for intro
        this.targetY = 150;

        this.state = 'INTRO';
        this.introTimer = 0;

        // Initialize Rings
        this.rings = [
            { r: 90, speed: 0.02, angle: 0, dash: [20, 10], width: 4 },
            { r: 120, speed: -0.01, angle: 0, dash: [40, 20], width: 2 },
            { r: 60, speed: 0.05, angle: 0, dash: [], width: 8 }
        ];

        document.getElementById('boss-name').innerText = "⚠️ UNKNOWN SIGNAL ⚠️";
        document.getElementById('boss-name').style.color = '#ff0000';

        console.log("⚠️ SYSTEM BREACH: NEXUS PRIME DETECTED ⚠️");
    }

    onUpdate(player, dt) {
        this.angle += 0.01 * dt;
        this.pulse = Math.sin(Date.now() / 200) * 5;

        // Update Rings
        this.rings.forEach(ring => ring.angle += ring.speed * dt);

        // --- STATE MACHINE ---
        if (this.state === 'INTRO') {
            this.handleIntro(player, dt);
            return;
        }

        // Standard Float
        this.floatY = Math.sin(Date.now() / 500) * 30;
        const targetX = CANVAS.width / 2 + Math.cos(Date.now() / 1500) * 150;
        const targetY = 150 + this.floatY;
        this.x += (targetX - this.x) * 0.05 * dt;
        this.y += (targetY - this.y) * 0.05 * dt;

        // Phase Transition
        if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
            this.enterPhase2();
        }

        this.attackTimer += dt;

        // Attack Logic
        if (this.state === 'IDLE') {
            if (this.attackTimer > 100) {
                this.chooseAttack(player);
            }
        }
        else if (this.state === 'TELEGRAPH') {
            this.telegraphTimer -= dt;
            if (this.telegraphTimer <= 0) {
                this.executeAttack();
            }
        }
        else if (this.state === 'ATTACKING') {
            if (this.attackTimer > 200) {
                this.state = 'IDLE';
                this.attackTimer = 0;
            }
            if (this.phase === 2 && this.attackTimer % 15 < 1) {
                this.fireHomingMissile();
            }
        }
    }

    handleIntro(player, dt) {
        this.introTimer += dt;

        // 1. Descent
        if (this.introTimer < 180) {
            this.y += (this.targetY - this.y) * 0.02 * dt;
            if (this.introTimer > 100) {
                const shake = (this.introTimer - 100) / 10;
                CTX.save();
                CTX.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
                CTX.restore();
                if (Math.random() < 0.5) {
                    spawnParticles(this.x + (Math.random() - 0.5) * 200, this.y + 100, 1, 2, '#00ffff');
                }
            }
        }
        // 2. Charge
        else if (this.introTimer < 300) {
            document.getElementById('boss-name').innerText = (this.introTimer % 20 < 10) ? "NEXUS PRIME" : "⚠️ DANGER ⚠️";
        }
        // 3. ROAR
        else {
            this.state = 'IDLE';
            document.getElementById('boss-name').innerText = BOSS_2_DATA.name;
            document.getElementById('boss-name').style.color = '#00ffff';
            createExplosion(this.x, this.y, 0, 0);
            if (window.playSound) playSound('levelup');
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            if (dist < 400) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                player.x += Math.cos(angle) * 200;
                player.y += Math.sin(angle) * 200;
            }
        }
    }

    enterPhase2() {
        this.phase = 2;
        this.state = 'IDLE';
        this.attackTimer = 0;
        createExplosion(this.x, this.y, 500, 0);
        document.getElementById('boss-name').style.color = '#ff0055';
        if (window.playSound) playSound('powerup');
        this.rings.forEach(r => r.speed *= 2);
    }

    chooseAttack(player) {
        const rand = Math.random();
        this.state = 'TELEGRAPH';
        this.telegraphTimer = 60;

        if (rand < 0.33) {
            this.currentAttack = 'WALL_OF_DEATH';
            this.laserLines = [];
            const safeY = (Math.random() * (CANVAS.height - 200)) + 100;
            for (let i = -5; i < 6; i++) {
                if (i === 0) continue;
                this.laserLines.push(safeY + i * 50);
            }
        } else if (rand < 0.66) {
            this.currentAttack = 'VOID_ZONES';
            this.targetPos = [];
            const margin = 50; // Keep away from edges
            const safeDist = 200; // Keep away from player

            for (let i = 0; i < 3; i++) {
                let pos, valid = false;
                let attempts = 0;
                while (!valid && attempts < 10) {
                    pos = {
                        x: margin + Math.random() * (CANVAS.width - margin * 2),
                        y: margin + Math.random() * (CANVAS.height - margin * 2)
                    };
                    const dist = Math.hypot(pos.x - player.x, pos.y - player.y);
                    if (dist > safeDist) valid = true;
                    attempts++;
                }
                this.targetPos.push(pos);
            }
        } else {
            this.currentAttack = 'CORNER_TRAP';
        }
    }

    executeAttack() {
        this.state = 'ATTACKING';
        this.attackTimer = 0;

        if (this.currentAttack === 'WALL_OF_DEATH') {
            if (window.playSound) playSound('shoot');
            this.laserLines.forEach(y => {
                this.shootLaserLine(CANVAS.width, y, -8, 0);
                this.shootLaserLine(0, y, 8, 0);
            });
        }
        else if (this.currentAttack === 'VOID_ZONES') {
            this.targetPos.forEach(pos => {
                const zone = enemyPool.get(pos.x, pos.y, ENEMY_TYPES.TANK, 20);
                zone.radius = 10;
                zone.color = '#220033';
                zone.vx = 0; zone.vy = 0;
                zone.isChasing = false;

                // Void Zone Custom Update Logic
                zone.update = function (player, dt) {
                    if (!this.isChasing) {
                        this.radius += 0.5 * dt;
                        if (this.radius > 100) {
                            this.isChasing = true;
                            this.color = '#440055';
                            createExplosion(this.x, this.y, 50, 0);
                        }
                    }
                    else {
                        const angle = Math.atan2(player.y - this.y, player.x - this.x);
                        this.x += Math.cos(angle) * 3 * dt;
                        this.y += Math.sin(angle) * 3 * dt;
                        this.radius = 100 + Math.sin(Date.now() / 100) * 5;
                    }

                    const d = Math.hypot(player.x - this.x, player.y - this.y);
                    if (d < this.radius) {
                        const a = Math.atan2(player.y - this.y, player.x - this.x);
                        player.x += Math.cos(a) * 5 * dt;
                        player.y += Math.sin(a) * 5 * dt;
                    }
                };
            });
        }
        else if (this.currentAttack === 'CORNER_TRAP') {
            const corners = [
                { x: 0, y: 0 }, { x: CANVAS.width, y: 0 },
                { x: 0, y: CANVAS.height }, { x: CANVAS.width, y: CANVAS.height }
            ];
            corners.forEach(c => {
                const p = enemyPool.get(c.x, c.y, ENEMY_TYPES.BASIC, 1);
                p.color = '#ff0055';
                const angle = Math.atan2(player.y - c.y, player.x - c.x);
                p.vx = Math.cos(angle) * 5;
                p.vy = Math.sin(angle) * 5;
            });
        }
    }

    shootLaserLine(x, y, vx, vy) {
        const bullet = enemyPool.get(x, y, ENEMY_TYPES.BASIC, 1);
        bullet.radius = 20;
        bullet.color = '#00ffff';
        bullet.hp = 3;
        bullet.vx = vx;
        bullet.vy = vy;
        bullet.update = function (player, dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            if (Math.random() < 0.3) spawnParticles(this.x, this.y, 1, 5, this.color);
        }
    }

    fireHomingMissile() {
        const m = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
        m.radius = 6;
        m.color = '#ff0000';
        m.vx = (Math.random() - 0.5) * 10;
        m.vy = -5;
        m.update = function (player, dt) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.vx += Math.cos(angle) * 0.2 * dt;
            this.vy += Math.sin(angle) * 0.2 * dt;
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 6) {
                this.vx = (this.vx / speed) * 6;
                this.vy = (this.vy / speed) * 6;
            }
            this.x += this.vx * dt;
            this.y += this.vy * dt;
        }
    }

    takeDamage(amount) {
        if (this.state === 'INTRO') return;
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.state = 'DEAD'; // Custom state tracking

        // --- EXTRA DEATH LOGIC ---
        // Teleport player to center
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }
    }

    onDraw() {
        CTX.save();
        CTX.translate(this.x, this.y);

        if (this.state === 'TELEGRAPH') {
            this.drawTelegraph();
        }

        if (this.state === 'INTRO') {
            CTX.beginPath();
            CTX.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
            CTX.strokeStyle = `rgba(0, 255, 255, ${Math.random()})`;
            CTX.stroke();
        }

        this.rings.forEach((ring, i) => {
            CTX.rotate(ring.angle);
            CTX.beginPath();
            if (ring.dash.length) CTX.setLineDash(ring.dash);
            else CTX.setLineDash([]);

            CTX.arc(0, 0, ring.r + this.pulse * (i + 1), 0, Math.PI * 2);
            CTX.strokeStyle = this.phase === 2 ? '#ff0055' : '#00ffff';
            CTX.lineWidth = ring.width;
            CTX.stroke();
            CTX.rotate(-ring.angle);
        });

        CTX.rotate(this.angle);
        CTX.fillStyle = '#fff';
        CTX.shadowBlur = 20;
        CTX.shadowColor = this.phase === 2 ? '#ff0000' : '#00ffff';
        CTX.beginPath();
        const size = 40;
        CTX.rect(-size / 2, -size / 2, size, size);
        CTX.fill();
        CTX.shadowBlur = 0;

        CTX.restore();
    }

    drawTelegraph() {
        CTX.save();
        CTX.globalAlpha = 0.5 + Math.sin(Date.now() / 50) * 0.2;
        CTX.strokeStyle = '#ff0000';
        CTX.lineWidth = 2;

        if (this.currentAttack === 'WALL_OF_DEATH') {
            this.laserLines.forEach(y => {
                CTX.beginPath();
                CTX.moveTo(-CANVAS.width, y - this.y);
                CTX.lineTo(CANVAS.width, y - this.y);
                CTX.stroke();
            });
        } else if (this.currentAttack === 'VOID_ZONES') {
            this.targetPos.forEach(p => {
                CTX.beginPath();
                CTX.arc(p.x - this.x, p.y - this.y, 50, 0, Math.PI * 2);
                CTX.stroke();
                CTX.fillStyle = 'rgba(255, 0, 0, 0.2)';
                CTX.fill();
            });
        }
        CTX.restore();
    }
}

const boss2 = new BossNexus();
window.boss2 = boss2; // FIX: Expose to window for CollisionManager