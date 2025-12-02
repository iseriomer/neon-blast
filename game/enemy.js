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
    }

    reset(x, y, type, difficultyMultiplier) {
        this.x = x;
        this.y = y;
        this.type = type;

        // YARIÇAP ve HIZ ölçekleniyor
        this.radius = type.radius * GAME_SCALE;

        // Hız hesaplamasına GAME_SCALE eklendi
        this.speed = (type.speed * (1 + (difficultyMultiplier * 0.1))) * GAME_SCALE;

        this.color = type.color;
        this.hp = type.hp + Math.floor(difficultyMultiplier / 2);
        this.maxHp = this.hp;
        this.id = Math.random();
        this.dashCooldown = 0;
        this.spawnTimer = 0;
        this.spawnCooldown = 180;
        this.freezeTimer = 0;
        this.shieldAura = false; // Kalkan aura aktif mi?
        this.shieldPulse = 0;
    }

    draw() {
        CTX.beginPath();
        if (this.type.name === 'Shielder') {
            // Core (Merkez küre)
            CTX.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
            CTX.fillStyle = this.color;
            CTX.fill();

            // Dönen kalkan halkaları
            const rings = 3;
            for (let i = 0; i < rings; i++) {
                const ringRadius = this.radius + 10 + (i * 8);
                const offset = (this.shieldPulse + i * (Math.PI * 2 / rings));

                CTX.save();
                CTX.translate(this.x, this.y);
                CTX.rotate(offset);

                CTX.strokeStyle = `rgba(100, 200, 255, ${0.6 - i * 0.15})`;
                CTX.lineWidth = 3;
                CTX.setLineDash([15, 10]);
                CTX.beginPath();
                CTX.arc(0, 0, ringRadius, 0, Math.PI * 2);
                CTX.stroke();
                CTX.setLineDash([]);

                CTX.restore();
            }

            // Aura efekti
            CTX.beginPath();
            CTX.arc(this.x, this.y, this.radius + 30 + Math.sin(this.shieldPulse * 2) * 5, 0, Math.PI * 2);
            CTX.strokeStyle = 'rgba(100, 200, 255, 0.2)';
            CTX.lineWidth = 2;
            CTX.stroke();
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
        } else {
            CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        }

        if (this.freezeTimer > 0) {
            CTX.fillStyle = '#00ffff';
        } else {
            CTX.fillStyle = this.color;
        }

        CTX.shadowBlur = 10;
        CTX.shadowColor = this.color;
        CTX.fill();
        CTX.shadowBlur = 0;

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
        // SHIELDER Mekaniği
        if (this.type.name === 'Shielder') {
            this.shieldPulse += 0.05 * dt;

            // Yavaş hareket et ve mesafe koru
            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            const idealDist = 250; // Oyuncudan uzak dur

            if (distToPlayer < idealDist) {
                // Geri çekil
                this.x -= Math.cos(angle) * currentSpeed * dt;
                this.y -= Math.sin(angle) * currentSpeed * dt;
            } else {
                // Hafif yaklaş
                this.x += Math.cos(angle) * (currentSpeed * 0.3) * dt;
                this.y += Math.sin(angle) * (currentSpeed * 0.3) * dt;
            }

            // Etraftaki düşmanlara kalkan ver
            this.shieldAura = true;
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

        this.draw();
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