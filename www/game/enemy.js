// enemy.js - Enemy System

class Enemy {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.type = null;
        this.radius = 20;
        this.color = 'red';
        this.speed = 1;
        this.hp = 1;
        this.maxHp = 1;
        this.id = 0;
        this.dashCooldown = 0;
        this.spawnTimer = 0;
        this.spawnCooldown = 180;
        this.freezeTimer = 0;
        this.shieldAura = false; // Kalkan aura aktif mi?
        this.shieldPulse = 0;

        this.isDead = false;
    }

    reset(x, y, type, difficultyMultiplier) {
        this.x = x;
        this.y = y;
        this.type = type;

        // FIX: Boss 2 assigns custom update methods and physics to enemies.
        // We must clear these when recycling the enemy from the pool.
        delete this.update;
        delete this.draw;
        this.vx = 0;
        this.vy = 0;
        this.isChasing = false;

        // YARIÇAP ve HIZ ölçekleniyor
        this.radius = type.radius * GAME_SCALE;

        // Hız hesaplamasına GAME_SCALE eklendi
        this.speed = (type.speed * (1 + (difficultyMultiplier * 0.1))) * GAME_SCALE;

        this.color = type.color;

        // SPEEDSTER FIX: Early levels (Difficulty < 3) should have 1 HP
        let hpMultiplierDivisor = 1.5;
        if (type.name === 'Speedster') hpMultiplierDivisor = 3.0; // Grows slower

        this.hp = type.hp + Math.floor(difficultyMultiplier / hpMultiplierDivisor);
        if (gameState.level >= 10) this.hp = type.hp + Math.floor(difficultyMultiplier / 0.9);
        if (gameState.level >= 20) this.hp = type.hp + Math.floor(difficultyMultiplier / 0.4);
        if (gameState.level >= 30) this.hp = type.hp + Math.floor(difficultyMultiplier / 0.13);
        if (gameState.level >= 40) this.hp = type.hp + Math.floor(difficultyMultiplier / 0.1);
        this.maxHp = this.hp;
        this.id = Math.random();
        this.dashCooldown = 0;
        this.spawnTimer = 0;
        this.spawnCooldown = 180;
        this.freezeTimer = 0;
        this.shieldAura = false;
        this.shieldPulse = 0;

        this.isDead = false;
    }

    draw() {
        CTX.beginPath();
        if (this.type.name === 'Healer') {
            const time = Date.now() / 1000;
            const pulse = 1 + Math.sin(time * 5) * 0.1;

            CTX.save();
            CTX.translate(this.x, this.y);

            // Aura Glow
            CTX.shadowBlur = 20;
            CTX.shadowColor = 'rgba(255, 215, 0, 0.6)';

            // 1. Double Rotating Squares (8-pointed star effect)
            CTX.fillStyle = 'rgba(255, 215, 0, 0.2)';
            CTX.save();
            CTX.rotate(time);
            CTX.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);
            CTX.restore();

            CTX.save();
            CTX.rotate(-time);
            CTX.fillStyle = 'rgba(255, 255, 100, 0.3)';
            CTX.fillRect(-this.radius * 0.8, -this.radius * 0.8, this.radius * 1.6, this.radius * 1.6);
            CTX.restore();

            // 2. Heavy Medic Cross (Solid)
            CTX.fillStyle = '#fff';
            CTX.shadowBlur = 10;
            CTX.shadowColor = '#fff';

            const s = this.radius * 0.4 * pulse;
            const l = this.radius * 1.0 * pulse;

            // Cross Arms
            CTX.beginPath();
            CTX.rect(-s, -l, s * 2, l * 2); // Vertical
            CTX.rect(-l, -s, l * 2, s * 2); // Horizontal
            CTX.fill();

            // 3. Tech Bits / Satellites
            CTX.shadowBlur = 5;
            CTX.shadowColor = '#ffd700';
            CTX.fillStyle = '#ffd700';
            const orbitDist = this.radius * 1.4;
            for (let i = 0; i < 4; i++) {
                const ang = time * 2 + (i * Math.PI / 2);
                const ox = Math.cos(ang) * orbitDist;
                const oy = Math.sin(ang) * orbitDist;
                CTX.beginPath();
                CTX.arc(ox, oy, 4, 0, Math.PI * 2);
                CTX.fill();
            }

            CTX.restore();
        }
        else if (this.type.name === 'Speedster') {
            CTX.moveTo(this.x + this.radius, this.y);
            CTX.lineTo(this.x - this.radius, this.y + this.radius);
            CTX.lineTo(this.x - this.radius, this.y - this.radius);
            CTX.closePath();
        } else if (this.type.name === 'Tank') {
            CTX.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else if (this.type.name === 'Splitter' || this.type.name === 'MiniSplitter') {
            const sides = 6;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = this.x + Math.cos(angle) * this.radius;
                const y = this.y + Math.sin(angle) * this.radius;
                if (i === 0) CTX.moveTo(x, y);
                else CTX.lineTo(x, y);
            }
            CTX.closePath();
        } else if (this.type.name === 'Spawner') {
            const spikes = 5;
            const outerRadius = this.radius;
            const innerRadius = this.radius * 0.5;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const x = this.x + Math.cos(angle) * r;
                const y = this.y + Math.sin(angle) * r;
                if (i === 0) CTX.moveTo(x, y);
                else CTX.lineTo(x, y);
            }
            CTX.closePath();
            CTX.stroke();
            CTX.restore();

            // 2. Inner Portal (Pulsating)
            CTX.beginPath();
            CTX.arc(0, 0, this.radius * 0.6 * pulse, 0, Math.PI * 2);
            CTX.fillStyle = 'black'; // "Void" center
            CTX.fill();
            CTX.lineWidth = 2;
            CTX.strokeStyle = '#fff';
            CTX.stroke();

            // 3. Orbiting Particles (Spawning Energy)
            for (let i = 0; i < 3; i++) {
                CTX.save();
                CTX.rotate(time * 2 + (i * (Math.PI * 2 / 3)));
                CTX.translate(this.radius * 0.8, 0);
                CTX.beginPath();
                CTX.arc(0, 0, 4, 0, Math.PI * 2);
                CTX.fillStyle = '#fff';
                CTX.fill();
                CTX.restore();
            }

            CTX.restore();
        } else {
            CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        }

        if (this.freezeTimer > 0) {
            CTX.fillStyle = '#00ffff';

        } else if (this.type.name !== 'Healer') { // Healer kendi rengini yönetiyor
            CTX.fillStyle = this.color;
        }

        // Common draw finalize (Shadows etc)
        if (this.type.name !== 'Healer') {
            CTX.shadowBlur = 10;
            CTX.shadowColor = this.color;
            CTX.fill();
            CTX.shadowBlur = 0;
        }

        if (this.hp > 1) {
            CTX.fillStyle = 'white';
            CTX.font = '10px Arial';
            CTX.fillText(Math.ceil(this.hp), this.x - 3, this.y + 4);
        }
    }

    update(player, dt = 1) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        let currentSpeed = this.speed;
        if (this.freezeTimer > 0) {
            currentSpeed *= 0.5;
            this.freezeTimer -= dt;
        }



        // HEALER Mechanic
        if (this.type.name === 'Healer') {
            // Run away if player is too close, else maintain safe distance
            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            const idealDist = 350; // Use long range for healing support

            if (distToPlayer < idealDist) {
                // Retreat fast
                this.x -= Math.cos(angle) * currentSpeed * 1.1 * dt;
                this.y -= Math.sin(angle) * currentSpeed * 1.1 * dt;
            } else if (distToPlayer > idealDist + 100) {
                // Approach slowly if too far
                this.x += Math.cos(angle) * (currentSpeed * 0.6) * dt;
                this.y += Math.sin(angle) * (currentSpeed * 0.6) * dt;
            } else {
                // Strafe / Orbit
                this.x += Math.cos(angle + Math.PI / 2) * (currentSpeed * 0.2) * dt;
                this.y += Math.sin(angle + Math.PI / 2) * (currentSpeed * 0.2) * dt;
            }
        }
        else if (this.type.name === 'Spawner') {
            this.spawnTimer += dt;
            if (this.spawnTimer >= this.spawnCooldown && this.freezeTimer <= 0) {
                this.spawnTimer = 0;
                const spawnCount = 2;
                for (let i = 0; i < spawnCount; i++) {
                    const spawnAngle = Math.random() * Math.PI * 2;
                    const spawnDist = this.radius + 20;
                    const spawnX = this.x + Math.cos(spawnAngle) * spawnDist;
                    const spawnY = this.y + Math.sin(spawnAngle) * spawnDist;
                    enemyPool.get(spawnX, spawnY, ENEMY_TYPES.BASIC, gameState.difficultyMultiplier);
                }
                spawnParticles(this.x, this.y, 15, 3, this.color);
            }
            this.x += Math.cos(angle) * currentSpeed * 0.5 * dt;
            this.y += Math.sin(angle) * currentSpeed * 0.5 * dt;
        }
        else if (this.type.name === 'Dasher') {
            this.dashCooldown -= dt;
            if (this.dashCooldown <= 0 && this.freezeTimer <= 0) {
                this.x += Math.cos(angle) * currentSpeed * 10 * dt;
                this.y += Math.sin(angle) * currentSpeed * 10 * dt;
                this.dashCooldown = 100 + Math.random() * 100;
            } else {
                this.x += Math.cos(angle) * (currentSpeed * 0.5) * dt;
                this.y += Math.sin(angle) * (currentSpeed * 0.5) * dt;
            }
        } else {
            this.x += Math.cos(angle) * currentSpeed * dt;
            this.y += Math.sin(angle) * currentSpeed * dt;
        }


        // Double-draw fix: RenderOptimizer handles drawing
        // this.draw();
    }
}

// Enemy Pool
const enemyPool = new ObjectPool(
    () => new Enemy(),
    (enemy, x, y, type, difficultyMultiplier) => {
        enemy.reset(x, y, type, difficultyMultiplier);
    },
    POOL_SIZES.ENEMY
);