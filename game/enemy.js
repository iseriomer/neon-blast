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
    }

    reset(x, y, type, difficultyMultiplier) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type.radius;
        this.color = type.color;
        this.speed = type.speed * (1 + (difficultyMultiplier * 0.1));
        this.hp = type.hp + Math.floor(difficultyMultiplier / 2);
        this.maxHp = this.hp;
        this.id = Math.random();
        this.dashCooldown = 0;
        this.spawnTimer = 0;
        this.spawnCooldown = 180;
        this.freezeTimer = 0;
    }

    draw() {
        CTX.beginPath();
        
        if (this.type.name === 'Speedster') {
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
            CTX.fillText(this.hp, this.x - 3, this.y + 4);
        }
    }

    update(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        let currentSpeed = this.speed;
        if (this.freezeTimer > 0) {
            currentSpeed *= 0.5;
            this.freezeTimer--;
        }

        if (this.type.name === 'Spawner') {
            this.spawnTimer++;
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
            this.x += Math.cos(angle) * currentSpeed * 0.5;
            this.y += Math.sin(angle) * currentSpeed * 0.5;
        }
        else if (this.type.name === 'Dasher') {
            this.dashCooldown--;
            if (this.dashCooldown <= 0 && this.freezeTimer <= 0) {
                this.x += Math.cos(angle) * currentSpeed * 10;
                this.y += Math.sin(angle) * currentSpeed * 10;
                this.dashCooldown = 100 + Math.random() * 100;
            } else {
                this.x += Math.cos(angle) * (currentSpeed * 0.5);
                this.y += Math.sin(angle) * (currentSpeed * 0.5);
            }
        } else {
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
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