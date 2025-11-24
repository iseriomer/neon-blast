// projectile.js - Projectile System

class Projectile {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.velocity = { x: 0, y: 0 };
        this.radius = 5;
        this.color = 'white';
        this.penetration = 1;
        this.hitList = [];
        this.ricochetCount = 0;
        this.homing = 0;
        this.isSplit = false;
        this.screenWrap = false;
        this.hasWrapped = false;
    }

    reset(x, y, velocity, isSplit, playerStats) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.isSplit = isSplit;
        this.radius = isSplit ? playerStats.shotSize / 2 : playerStats.shotSize;
        this.color = playerStats.color;
        this.penetration = isSplit ? 1 : playerStats.piercing;
        this.hitList = [];
        this.ricochetCount = playerStats.ricochet;
        this.homing = playerStats.homing;
        this.screenWrap = playerStats.screenWrap && !isSplit;
        this.hasWrapped = false;
    }

    draw() {
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        CTX.fillStyle = this.color;
        CTX.shadowBlur = 10;
        CTX.shadowColor = this.color;
        CTX.fill();
        CTX.shadowBlur = 0;
    }

    update(enemies, playerStats) {
        this.draw();

        // Homing Logic
        if (this.homing > 0 && enemies.length > 0) {
            let nearestEnemy = null;
            let minDist = Infinity;

            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < minDist && dist < 400) {
                    minDist = dist;
                    nearestEnemy = enemy;
                }
            }

            if (nearestEnemy) {
                const angle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
                const targetVx = Math.cos(angle) * playerStats.shotSpeed;
                const targetVy = Math.sin(angle) * playerStats.shotSpeed;

                this.velocity.x += (targetVx - this.velocity.x) * this.homing;
                this.velocity.y += (targetVy - this.velocity.y) * this.homing;

                const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
                this.velocity.x = (this.velocity.x / currentSpeed) * playerStats.shotSpeed;
                this.velocity.y = (this.velocity.y / currentSpeed) * playerStats.shotSpeed;
            }
        }

        this.x += this.velocity.x;
        this.y += this.velocity.y;

        // Screen Wrap Logic
        if (this.screenWrap && !this.hasWrapped) {
            if (this.x < 0) { 
                this.x = CANVAS.width; 
                this.hasWrapped = true; 
            } else if (this.x > CANVAS.width) { 
                this.x = 0; 
                this.hasWrapped = true; 
            } else if (this.y < 0) { 
                this.y = CANVAS.height; 
                this.hasWrapped = true; 
            } else if (this.y > CANVAS.height) { 
                this.y = 0; 
                this.hasWrapped = true; 
            }
        }

        // Ricochet Logic
        if (this.ricochetCount > 0 && !this.hasWrapped) {
            if (this.x - this.radius < 0 || this.x + this.radius > CANVAS.width) {
                this.velocity.x = -this.velocity.x;
                this.ricochetCount--;
            }
            if (this.y - this.radius < 0 || this.y + this.radius > CANVAS.height) {
                this.velocity.y = -this.velocity.y;
                this.ricochetCount--;
            }
        }

        // Return true if projectile should be removed
        return (this.x < 0 || this.x > CANVAS.width || 
                this.y < 0 || this.y > CANVAS.height);
    }
}

// Projectile Pool
const projectilePool = new ObjectPool(
    () => new Projectile(),
    (projectile, x, y, velocity, isSplit, playerStats) => {
        projectile.reset(x, y, velocity, isSplit, playerStats);
    },
    POOL_SIZES.PROJECTILE
);