// game/boss_3.js - THE ARCHITECT - Final Boss (Refactored)

const BOSS_3_DATA = {
    name: 'THE ARCHITECT',
    hp: 20000,
    score: 50000,
    phases: [
        { threshold: 1.0, color: '#00ff88', name: 'CONSTRUCT' },
        { threshold: 0.6, color: '#ff8800', name: 'DECONSTRUCT' },
        { threshold: 0.3, color: '#ff0088', name: 'CHAOS' }
    ]
};

// Shape Pool Class
class BossShape {
    constructor() {
        this.reset({});
    }

    reset(params) {
        this.x = params.x || 0;
        this.y = params.y || 0;
        this.type = params.type !== undefined ? params.type : 0;
        this.size = params.size || 20;
        this.rotation = params.rotation || 0;
        this.rotSpeed = params.rotSpeed || 0;
        this.life = params.life || 100;
        this.vx = params.vx || 0;
        this.vy = params.vy || 0;
        this.deadly = params.deadly !== undefined ? params.deadly : true;
        this.fixed = params.fixed || false;
        this.hp = params.hp || 0;
        this.maxHp = params.maxHp || 0;
    }
}

const bossShapePool = new ObjectPool(
    () => new BossShape(),
    (shape, params) => shape.reset(params),
    200
);

class BossArchitect extends BossBase {
    constructor() {
        super();
        this.name = BOSS_3_DATA.name;
        this.maxHp = BOSS_3_DATA.hp;
        this.score = BOSS_3_DATA.score;
        this.radius = 120;

        // Visuals
        this.angle = 0;
        this.geometryTimer = 0;

        // Combat
        this.state = 'IDLE';
        this.currentAttack = null;
        this.platforms = [];
        this.walls = [];
        this.vortexes = [];

        this.targetY = 120;
        this.introTimer = 0;

        // Death Config
        this.deathExplosionDuration = 3000;
        this.deathHitstopDuration = 300;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -300; // Override for intro
        this.targetY = 120;

        this.state = 'INTRO';
        this.introTimer = 0;

        bossShapePool.releaseAll();
        this.platforms = [];
        this.walls = [];
        this.vortexes = [];

        document.getElementById('boss-name').innerText = "??? UNKNOWN ENTITY ???";
        document.getElementById('boss-name').style.color = '#ffffff';

        console.log("⚠️ REALITY BREACH: THE ARCHITECT HAS ARRIVED ⚠️");
    }

    onUpdate(player, dt) {
        this.angle += 0.005 * dt;
        this.geometryTimer += 0.02 * dt;

        if (this.state === 'INTRO') {
            this.handleIntro(player, dt);
            this.updateShapes(player, dt);
            return;
        }

        // Phase Check
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.6 && this.phase === 1) this.enterPhase(2);
        else if (hpPercent <= 0.3 && this.phase === 2) this.enterPhase(3);

        // Movement
        this.handleMovement(dt);

        // Attacks
        this.attackTimer += dt;
        if (this.state === 'IDLE') {
            if (this.attackTimer > 120) this.chooseAttack();
        } else if (this.state === 'ATTACKING') {
            this.executeAttack(player, dt);
            if (this.attackTimer > 300) {
                this.state = 'IDLE';
                this.attackTimer = 0;
                this.currentAttack = null;
            }
        }

        this.updateShapes(player, dt);
        this.updatePlatforms(player, dt);
        this.updateWalls(player, dt);
        this.updateVortexes(player, dt);
    }

    handleIntro(player, dt) {
        this.introTimer += dt;
        if (this.introTimer < 240) {
            this.y += (this.targetY - this.y) * 0.01 * dt;
            if (this.introTimer % 20 < 1) {
                // Intro Shapes
                const shapeCount = 5;
                for (let i = 0; i < shapeCount; i++) {
                    const angle = (i / shapeCount) * Math.PI * 2;
                    const dist = 300;
                    bossShapePool.get({
                        x: this.x + Math.cos(angle) * dist,
                        y: this.y + Math.sin(angle) * dist,
                        type: Math.floor(Math.random() * 4),
                        size: 20 + Math.random() * 30,
                        rotation: Math.random() * Math.PI * 2,
                        rotSpeed: (Math.random() - 0.5) * 0.1,
                        life: 100,
                        vx: (this.x - (this.x + Math.cos(angle) * dist)) / 50,
                        vy: (this.y - (this.y + Math.sin(angle) * dist)) / 50,
                        hp: 0,
                        deadly: false
                    });
                }
            }
            if (this.introTimer % 10 < 1) {
                const glitchTexts = ['ARCHITECT', '01001000', 'GEOMETRY', 'VOID', 'CONSTRUCT'];
                document.getElementById('boss-name').innerText = glitchTexts[Math.floor(Math.random() * glitchTexts.length)];
            }
        } else if (this.introTimer < 300) {
            document.getElementById('boss-name').innerText = BOSS_3_DATA.name;
            document.getElementById('boss-name').style.color = '#00ff88';
        } else {
            this.state = 'IDLE';
            bossShapePool.releaseAll();
            createExplosion(this.x, this.y, 300, 0);
        }
    }

    handleMovement(dt) {
        const orbitRadius = 200 + Math.sin(this.geometryTimer) * 100;
        const targetX = CANVAS.width / 2 + Math.cos(this.geometryTimer * 0.3) * orbitRadius;
        const targetY = 150 + Math.sin(this.geometryTimer * 0.5) * 50;

        this.x += (targetX - this.x) * 0.03 * dt;
        this.y += (targetY - this.y) * 0.03 * dt;
    }

    enterPhase(phaseNum) {
        this.phase = phaseNum;
        this.state = 'IDLE';
        this.attackTimer = 0;

        const phaseData = BOSS_3_DATA.phases[phaseNum - 1];
        document.getElementById('boss-name').style.color = phaseData.color;
        document.getElementById('boss-name').innerText = `${BOSS_3_DATA.name} - ${phaseData.name}`;

        createExplosion(this.x, this.y, 500, 0);
        if (window.playSound) playSound('powerup');

        this.platforms = [];
        this.walls = [];
        bossShapePool.releaseAll();

        if (window.triggerHitstop) window.triggerHitstop(30);
    }

    chooseAttack() {
        this.state = 'ATTACKING';
        this.attackTimer = 0;
        const attacks = this.getAvailableAttacks();
        this.currentAttack = attacks[Math.floor(Math.random() * attacks.length)];
        console.log(`ARCHITECT ATTACK: ${this.currentAttack}`);
    }

    getAvailableAttacks() {
        if (this.phase === 1) return ['PLATFORM_JUMP', 'SHAPE_RAIN', 'GEOMETRIC_CAGE'];
        if (this.phase === 2) return ['MAZE_WALLS', 'ROTATING_BLADES', 'GRAVITY_WELL'];
        return ['REALITY_BREAK', 'FRACTAL_HELL', 'VORTEX_STORM'];
    }

    executeAttack(player, dt) {
        // ... (Original Attack implementations, keeping logic identical but cleaned up)
        if (this.currentAttack === 'PLATFORM_JUMP') this.attackPlatformJump(player);
        else if (this.currentAttack === 'SHAPE_RAIN') this.attackShapeRain();
        else if (this.currentAttack === 'GEOMETRIC_CAGE') this.attackGeometricCage(player);
        else if (this.currentAttack === 'MAZE_WALLS') this.attackMazeWalls();
        else if (this.currentAttack === 'ROTATING_BLADES') this.attackRotatingBlades();
        else if (this.currentAttack === 'GRAVITY_WELL') this.attackGravityWell();
        else if (this.currentAttack === 'REALITY_BREAK') this.attackRealityBreak();
        else if (this.currentAttack === 'FRACTAL_HELL') this.attackFractalHell();
        else if (this.currentAttack === 'VORTEX_STORM') this.attackVortexStorm();
    }

    // --- ATTACK IMPLEMENTATIONS ---
    attackPlatformJump(player) {
        if (this.attackTimer === 0) {
            for (let i = 0; i < 5; i++) {
                this.platforms.push({
                    x: Math.random() * CANVAS.width,
                    y: Math.random() * CANVAS.height,
                    width: 100, height: 20, deadly: false, life: 300
                });
            }
        }
        if (this.attackTimer % 60 < 1 && this.platforms.length > 0) {
            const target = this.platforms[Math.floor(Math.random() * this.platforms.length)];
            this.x = target.x;
            this.y = target.y - 50;
            spawnParticles(target.x, target.y, 20, 4, '#00ff88', 3);
            this.platforms.forEach(p => {
                if (Math.hypot(player.x - p.x, player.y - p.y) < 150) p.deadly = true;
            });
        }
    }

    attackShapeRain() {
        if (this.attackTimer % 15 < 1) {
            bossShapePool.get({
                x: Math.random() * CANVAS.width, y: -50,
                type: Math.floor(Math.random() * 4),
                size: 15 + Math.random() * 25,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.2,
                life: 300, vx: 0, vy: 3 + Math.random() * 2,
                deadly: true, hp: 3, maxHp: 3
            });
        }
    }

    attackGeometricCage(player) {
        if (this.attackTimer < 120) {
            if (this.attackTimer % 20 < 1) {
                const sides = 6;
                for (let i = 0; i < sides; i++) {
                    const angle = (i / sides) * Math.PI * 2;
                    bossShapePool.get({
                        x: player.x + Math.cos(angle) * 150,
                        y: player.y + Math.sin(angle) * 150,
                        type: 0, size: 30, rotation: angle, rotSpeed: 0, life: 100,
                        vx: 0, vy: 0, deadly: true, fixed: true, hp: 5, maxHp: 5
                    });
                }
            }
        } else {
            bossShapePool.getActive().forEach(s => {
                if (s.fixed) {
                    const angle = Math.atan2(player.y - s.y, player.x - s.x);
                    s.vx = Math.cos(angle) * 2; s.vy = Math.sin(angle) * 2; s.fixed = false;
                }
            });
        }
    }

    attackMazeWalls() {
        if (this.attackTimer < 10) {
            for (let i = 0; i < 8; i++) {
                const h = i % 2 === 0;
                this.walls.push({
                    x: Math.random() * CANVAS.width,
                    y: Math.random() * CANVAS.height,
                    width: h ? 200 : 20, height: h ? 20 : 200,
                    life: 300, deadly: true
                });
            }
        }
    }

    attackRotatingBlades() {
        if (this.attackTimer % 5 < 1) {
            const count = 8;
            for (let i = 0; i < count; i++) {
                const angle = this.attackTimer * 0.05 + (i / count) * Math.PI * 2;
                bossShapePool.get({
                    x: this.x + Math.cos(angle) * 150,
                    y: this.y + Math.sin(angle) * 150,
                    type: 1, size: 40, rotation: angle + Math.PI / 2, rotSpeed: 0.2,
                    life: 20, vx: 0, vy: 0, deadly: true, hp: 2, maxHp: 2
                });
            }
        }
    }

    attackGravityWell() {
        if (this.attackTimer % 60 < 1) {
            this.vortexes.push({
                x: Math.random() * CANVAS.width, y: Math.random() * CANVAS.height,
                radius: 0, maxRadius: 120, pull: 5, life: 300
            });
        }
    }

    attackRealityBreak() {
        if (this.attackTimer % 10 < 1) {
            CTX.save();
            CTX.translate((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50);
            CTX.restore();
        }
        if (this.attackTimer % 20 < 1) {
            for (let i = 0; i < 10; i++) {
                bossShapePool.get({
                    x: Math.random() * CANVAS.width,
                    y: Math.random() * CANVAS.height,
                    type: Math.floor(Math.random() * 4),
                    size: 20 + Math.random() * 40,
                    rotation: Math.random() * Math.PI * 2,
                    rotSpeed: (Math.random() - 0.5) * 0.3,
                    life: 80,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    deadly: true, hp: 4, maxHp: 4
                });
            }
        }
    }

    attackFractalHell() {
        if (this.attackTimer % 30 < 1) this.spawnFractal(this.x, this.y, 80, 3);
    }

    attackVortexStorm() {
        if (this.attackTimer % 40 < 1) {
            for (let i = 0; i < 3; i++) {
                this.vortexes.push({
                    x: Math.random() * CANVAS.width, y: Math.random() * CANVAS.height,
                    radius: 80, maxRadius: 80, pull: 8, life: 200
                });
            }
        }
    }

    spawnFractal(x, y, size, depth) {
        if (depth <= 0 || size < 10) return;
        const count = 6;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const newX = x + Math.cos(angle) * size;
            const newY = y + Math.sin(angle) * size;
            bossShapePool.get({
                x: newX, y: newY,
                type: Math.floor(Math.random() * 4),
                size: size * 0.5, rotation: angle, rotSpeed: 0.1, life: 150,
                vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2,
                deadly: true, hp: Math.max(1, depth), maxHp: Math.max(1, depth)
            });
            if (depth > 1) setTimeout(() => this.spawnFractal(newX, newY, size * 0.6, depth - 1), 100);
        }
    }

    // --- UPDATERS ---

    updateShapes(player, dt) {
        bossShapePool.update((shape) => {
            shape.x += shape.vx * dt;
            shape.y += shape.vy * dt;
            shape.rotation += shape.rotSpeed * dt;
            shape.life -= dt;

            if (shape.deadly && gameState.gameActive) {
                const dist = Math.hypot(player.x - shape.x, player.y - shape.y);
                if (dist < shape.size + player.radius) {
                    if (gameState.playerStats.shield > 0) {
                        gameState.playerStats.shield--;
                        updateShieldIndicator(gameState.playerStats.shield);
                    } else if (!gameState.godMode) {
                        startDeathSequence();
                    }
                    return true;
                }
            }

            if (shape.hp !== undefined && shape.hp <= 0) {
                spawnParticles(shape.x, shape.y, 8, 3, '#00ff88', 2);
                if (window.playSound) playSound('hit');
                return true;
            }
            return shape.life <= 0;
        });
    }

    updatePlatforms(player, dt) {
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            const p = this.platforms[i];
            p.life -= dt;
            if (player.x > p.x - p.width / 2 && player.x < p.x + p.width / 2 &&
                player.y > p.y - p.height / 2 && player.y < p.y + p.height / 2) {
                if (p.deadly && !gameState.godMode) {
                    if (gameState.playerStats.shield > 0) {
                        gameState.playerStats.shield--;
                        updateShieldIndicator(gameState.playerStats.shield);
                        p.deadly = false;
                    } else startDeathSequence();
                }
            }
            if (p.life <= 0) this.platforms.splice(i, 1);
        }
    }

    updateWalls(player, dt) {
        for (let i = this.walls.length - 1; i >= 0; i--) {
            const w = this.walls[i];
            w.life -= dt;
            // Simplified AABB collision correction
            if (player.x + player.radius > w.x - w.width / 2 &&
                player.x - player.radius < w.x + w.width / 2 &&
                player.y + player.radius > w.y - w.height / 2 &&
                player.y - player.radius < w.y + w.height / 2) {

                const dx = player.x - w.x;
                const dy = player.y - w.y;
                if (Math.abs(dx) > Math.abs(dy)) {
                    player.x = w.x + (dx > 0 ? w.width / 2 : -w.width / 2) + player.radius * Math.sign(dx);
                } else {
                    player.y = w.y + (dy > 0 ? w.height / 2 : -w.height / 2) + player.radius * Math.sign(dy);
                }
            }
            if (w.life <= 0) this.walls.splice(i, 1);
        }
    }

    updateVortexes(player, dt) {
        for (let i = this.vortexes.length - 1; i >= 0; i--) {
            const v = this.vortexes[i];
            v.life -= dt;
            if (v.radius < v.maxRadius) v.radius += 2 * dt;
            const dist = Math.hypot(player.x - v.x, player.y - v.y);
            if (dist < v.radius) {
                const angle = Math.atan2(v.y - player.y, v.x - player.x);
                const pull = (1 - dist / v.radius) * v.pull;
                player.x += Math.cos(angle) * pull * dt;
                player.y += Math.sin(angle) * pull * dt;
            }
            if (v.life <= 0) this.vortexes.splice(i, 1);
        }
    }

    takeDamage(amount) {
        if (this.state === 'INTRO') return;
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.state = 'DEAD';
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }
        bossShapePool.releaseAll();
    }

    // --- DRAW ---
    onDraw() {
        this.drawShapesBatched();

        // Platforms
        this.platforms.forEach(p => {
            CTX.fillStyle = p.deadly ? 'rgba(255, 0, 0, 0.6)' : 'rgba(0, 255, 136, 0.4)';
            CTX.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
            CTX.strokeStyle = '#fff';
            CTX.strokeRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
        });

        // Walls
        this.walls.forEach(w => {
            CTX.fillStyle = 'rgba(255, 136, 0, 0.7)';
            CTX.fillRect(w.x - w.width / 2, w.y - w.height / 2, w.width, w.height);
        });

        // Vortexes
        this.vortexes.forEach(v => {
            CTX.beginPath();
            CTX.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
            CTX.strokeStyle = 'rgba(136, 0, 255, 0.8)';
            CTX.lineWidth = 5;
            CTX.stroke();
        });

        // Main Body Visuals
        CTX.save();
        CTX.translate(this.x, this.y);
        CTX.rotate(this.angle);

        for (let layer = 0; layer < 3; layer++) {
            const layerRotation = this.angle * (layer + 1) * (layer % 2 === 0 ? 1 : -1);
            const layerSize = this.radius - (layer * 30);
            CTX.save();
            CTX.rotate(layerRotation);
            const phaseData = BOSS_3_DATA.phases[this.phase - 1];
            CTX.strokeStyle = phaseData.color;
            CTX.lineWidth = 4;
            CTX.setLineDash([20, 10]);
            if (layer % 2 === 0) CTX.strokeRect(-layerSize / 2, -layerSize / 2, layerSize, layerSize);
            else { CTX.beginPath(); CTX.arc(0, 0, layerSize / 2, 0, Math.PI * 2); CTX.stroke(); }
            CTX.restore();
        }
        CTX.fillStyle = '#fff'; CTX.fillRect(-20, -20, 40, 40);
        CTX.restore();
    }

    drawShapesBatched() {
        const shapes = bossShapePool.getActive();
        if (shapes.length === 0) return;
        CTX.lineWidth = 2;
        shapes.forEach(shape => {
            CTX.save();
            CTX.translate(shape.x, shape.y);
            CTX.rotate(shape.rotation);
            CTX.globalAlpha = Math.min(1, shape.life / 100);
            CTX.beginPath();
            if (shape.type === 0) CTX.rect(-shape.size / 2, -shape.size / 2, shape.size, shape.size);
            else if (shape.type === 1) { CTX.moveTo(0, -shape.size / 2); CTX.lineTo(shape.size / 2, shape.size / 2); CTX.lineTo(-shape.size / 2, shape.size / 2); CTX.closePath(); }
            else if (shape.type === 2) { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const x = Math.cos(a) * shape.size / 2; const y = Math.sin(a) * shape.size / 2; if (i === 0) CTX.moveTo(x, y); else CTX.lineTo(x, y); } CTX.closePath(); }
            else CTX.arc(0, 0, shape.size / 2, 0, Math.PI * 2);
            CTX.fillStyle = shape.deadly ? '#ff0088' : '#00ff88';
            CTX.fill();
            if (shape.deadly) { CTX.strokeStyle = '#fff'; CTX.stroke(); }
            if (shape.hp > 0) {
                CTX.rotate(-shape.rotation);
                const hpPercent = shape.hp / shape.maxHp;
                CTX.fillStyle = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
                CTX.font = 'bold 12px Arial';
                CTX.textAlign = 'center';
                CTX.fillText(Math.ceil(shape.hp), 0, 4);
            }
            CTX.restore();
        });
        CTX.globalAlpha = 1;
    }
}

const boss3 = new BossArchitect();