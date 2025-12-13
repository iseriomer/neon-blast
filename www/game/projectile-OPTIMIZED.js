// projectile-OPTIMIZED.js - İyileştirilmiş Homing Mekaniği

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
        this.homingCooldown = 0;
        this.targetEnemy = null; // Hedef düşman cache'i
    }

    reset(x, y, velocity, isSplit, playerStats) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.isSplit = isSplit;
        const baseSize = isSplit ? playerStats.shotSize / 2 : playerStats.shotSize;
        this.radius = baseSize * GAME_SCALE;
        this.color = playerStats.color;
        this.penetration = isSplit ? 1 : playerStats.piercing;
        this.hitList = [];
        this.ricochetCount = playerStats.ricochet;
        this.homing = playerStats.homing;
        this.screenWrap = playerStats.screenWrap && !isSplit;
        this.hasWrapped = false;
        this.homingCooldown = 0;
        this.targetEnemy = null;
    }

    draw() {
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        CTX.fillStyle = this.color;
        CTX.fill();
    }

    update(enemies, playerStats, dt = 1) {
        // HOMING MEKANİĞİ - Optimize ve Smooth
        if (this.homing > 0 && enemies.length > 0) {
            this.homingCooldown -= dt;

            // Her 5 frame'de bir hedef güncelle veya hedef yoksa/ölmüşse
            const shouldUpdateTarget = this.homingCooldown <= 0 ||
                !this.targetEnemy ||
                this.targetEnemy.hp <= 0;

            if (shouldUpdateTarget) {
                this.homingCooldown = 3;
                this.targetEnemy = this.findNearestEnemy(enemies);
            }

            // Hedef varsa sürekli takip et (sadece 5 frame'de bir hedef değiştir)
            if (this.targetEnemy && this.targetEnemy.hp > 0) {
                this.applyHoming(this.targetEnemy, playerStats.shotSpeed, dt);
            }
        }

        // Pozisyon güncelleme
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;

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
                this.targetEnemy = null; // Hedefi sıfırla
            }
            if (this.y - this.radius < 0 || this.y + this.radius > CANVAS.height) {
                this.velocity.y = -this.velocity.y;
                this.ricochetCount--;
                this.targetEnemy = null; // Hedefi sıfırla
            }
        }

        // Ekran dışı kontrolü
        return (this.x < -50 || this.x > CANVAS.width + 50 ||
            this.y < -50 || this.y > CANVAS.height + 50);
    }

    // En yakın düşmanı bul (SPATIAL GRID ile optimize edilebilir!)
    findNearestEnemy(enemies) {
        const homingRange = 300 * GAME_SCALE; // Ölçeklenmiş menzil
        let nearestEnemy = null;
        let minDistSq = homingRange * homingRange; // Squared distance karşılaştırması (sqrt yok!)

        // Spatial grid varsa onu kullan, yoksa brute force
        const searchList = typeof enemySpatialGrid !== 'undefined'
            ? enemySpatialGrid.query(this.x, this.y, homingRange)
            : enemies;

        for (let i = 0; i < searchList.length; i++) {
            const enemy = searchList[i];

            // Zaten vurduğumuz düşmanları atla
            if (this.hitList.includes(enemy.id)) continue;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                nearestEnemy = enemy;
            }
        }

        return nearestEnemy;
    }

    // Homing uygulaması - Smooth interpolation
    applyHoming(target, shotSpeed, dt) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const angle = Math.atan2(dy, dx);

        const targetVx = Math.cos(angle) * shotSpeed;
        const targetVy = Math.sin(angle) * shotSpeed;

        // Lerp interpolation (daha smooth)
        const homingStrength = this.homing * dt; // dt ile çarp ki frame rate bağımsız olsun
        this.velocity.x += (targetVx - this.velocity.x) * homingStrength;
        this.velocity.y += (targetVy - this.velocity.y) * homingStrength;

        // Hız normalizasyonu - sadece çok sapma olursa
        const currentSpeedSq = this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y;
        const targetSpeedSq = shotSpeed * shotSpeed;

        // %10'dan fazla sapma varsa normalize et
        if (Math.abs(currentSpeedSq - targetSpeedSq) > targetSpeedSq * 0.1) {
            const currentSpeed = Math.sqrt(currentSpeedSq);
            if (currentSpeed > 0) {
                const scale = shotSpeed / currentSpeed;
                this.velocity.x *= scale;
                this.velocity.y *= scale;
            }
        }
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