// projectile-CONE-HOMING.js - Cone-based Smart Homing

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
        this.targetEnemy = null;
        this.homingState = 'SEARCHING';
        this.lostTargetTime = 0;
        this.damageMultiplier = 1;
        this.bossDamageMultiplier = 1;
        this.skinId = 'proj_default';
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
        this.homingState = 'SEARCHING';
        this.lostTargetTime = 0;
        this.damageMultiplier = playerStats.damageMultiplier || 1;
        this.bossDamageMultiplier = playerStats.bossDamageMultiplier || 1;
        this.skinId = (window.CosmeticsManager && window.CosmeticsManager.getEquipped)
            ? window.CosmeticsManager.getEquipped('projectile')
            : 'proj_default';
    }

    draw() {
        CTX.save();
        CTX.translate(this.x, this.y);
        CTX.rotate(Math.atan2(this.velocity.y, this.velocity.x));
        CosmeticVisuals.drawProjectile(CTX, this.skinId || 'proj_default', this.color || '#00ffff', this.radius, Date.now() * 0.002);
        CTX.restore();
    }

    update(enemies, playerStats, dt = 1) {
        // CONE-BASED HOMING - Sadece ön tarafa bakar!
        if (this.homing > 0 && enemies.length > 0) {
            this.homingCooldown -= dt;

            const shouldUpdateTarget =
                this.homingCooldown <= 0 ||
                !this.targetEnemy ||
                this.targetEnemy.hp <= 0 ||
                this.homingState === 'LOST';

            if (shouldUpdateTarget) {
                this.homingCooldown = 0.15; // 150ms
                const newTarget = this.findNearestEnemyInCone(enemies);

                if (newTarget) {
                    this.targetEnemy = newTarget;
                    this.homingState = 'LOCKED';
                    this.lostTargetTime = 0;
                } else if (this.targetEnemy) {
                    this.homingState = 'LOST';
                    this.lostTargetTime += dt;
                    if (this.lostTargetTime > 0.5) {
                        this.targetEnemy = null;
                    }
                }
            }

            // Hedef varsa ve hala cone içindeyse takip et
            if (this.targetEnemy && this.targetEnemy.hp > 0) {
                // Hedef hala cone içinde mi kontrol et
                if (this.isEnemyInCone(this.targetEnemy)) {
                    this.applyHoming(this.targetEnemy, playerStats.shotSpeed, dt);
                } else {
                    // Cone dışına çıktı - hedefi kaybet
                    this.homingState = 'LOST';
                    this.targetEnemy = null;
                }
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
                this.targetEnemy = null;
            }
            if (this.y - this.radius < 0 || this.y + this.radius > CANVAS.height) {
                this.velocity.y = -this.velocity.y;
                this.ricochetCount--;
                this.targetEnemy = null;
            }
        }

        return (this.x < -50 || this.x > CANVAS.width + 50 ||
            this.y < -50 || this.y > CANVAS.height + 50);
    }

    // ✅ CONE İÇİNDE Mİ KONTROLÜ - OPTIMIZE (sqrt yok!)
    isEnemyInCone(enemy, coneAngleDeg = 90, maxRange = 300 * GAME_SCALE) {
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const distSq = dx * dx + dy * dy;

        // Menzil kontrolü (squared distance)
        if (distSq > maxRange * maxRange) return false;

        // Açı kontrolü - Dot Product kullan (sqrt gereksiz!)
        const velocityMag = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.y * this.velocity.y);
        if (velocityMag === 0) return false;

        // Normalize edilmiş velocity direction
        const dirX = this.velocity.x / velocityMag;
        const dirY = this.velocity.y / velocityMag;

        // Düşmana olan direction
        const dist = Math.sqrt(distSq);
        const toEnemyX = dx / dist;
        const toEnemyY = dy / dist;

        // Dot product = cos(angle)
        const dotProduct = dirX * toEnemyX + dirY * toEnemyY;

        // Cone açısını radyana çevir ve cos değerini hesapla
        const coneAngleRad = (coneAngleDeg / 2) * (Math.PI / 180);
        const minDotProduct = Math.cos(coneAngleRad);

        return dotProduct >= minDotProduct;
    }

    // ✅ CONE İÇİNDEKİ EN YAKIN DÜŞMANI BUL
    findNearestEnemyInCone(enemies) {
        const homingRange = 300 * GAME_SCALE;
        const coneAngle = 60; // 60 derece FOV (ayarlanabilir!)

        let nearestEnemy = null;
        let minDistSq = homingRange * homingRange;

        // Spatial grid ile optimize et
        const searchList = typeof enemySpatialGrid !== 'undefined'
            ? enemySpatialGrid.query(this.x, this.y, homingRange)
            : enemies;

        // Mevcut hedefi tercih et (sticky targeting - daha smooth)
        if (this.targetEnemy &&
            !this.hitList.includes(this.targetEnemy.id) &&
            this.targetEnemy.hp > 0) {

            if (this.isEnemyInCone(this.targetEnemy, coneAngle * 1.2, homingRange * 1.2)) {
                const dx = this.targetEnemy.x - this.x;
                const dy = this.targetEnemy.y - this.y;
                const distSq = dx * dx + dy * dy;

                // Sticky tolerance: %30 daha uzak bile olsa devam et
                if (distSq < minDistSq * 1.3) {
                    return this.targetEnemy;
                }
            }
        }

        // Cone içindeki en yakın düşmanı bul
        for (let i = 0; i < searchList.length; i++) {
            const enemy = searchList[i];

            // Skip conditions
            if (this.hitList.includes(enemy.id) || enemy.hp <= 0) continue;

            // Önce cone kontrolü (ucuz işlem)
            if (!this.isEnemyInCone(enemy, coneAngle, homingRange)) continue;

            // Sonra mesafe kontrolü
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

    // ✅ GELİŞTİRİLMİŞ HOMING - Adaptive + Prediction
    applyHoming(target, shotSpeed, dt) {
        // 1. Hedef prediction
        const predictTime = 0.1;
        const predictedX = target.x + (target.velocity?.x || 0) * predictTime;
        const predictedY = target.y + (target.velocity?.y || 0) * predictTime;

        const dx = predictedX - this.x;
        const dy = predictedY - this.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // 2. Adaptive strength (yakında güçlü, uzakta zayıf)
        const normalizedDist = Math.min(dist / (300 * GAME_SCALE), 1);
        const adaptiveStrength = this.homing * (0.5 + 0.5 * (1 - normalizedDist));

        // 3. Smooth angular lerp
        const angle = Math.atan2(dy, dx);
        const currentAngle = Math.atan2(this.velocity.y, this.velocity.x);

        // Angle difference normalize et
        let angleDiff = angle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // 4. Lerp interpolation
        const lerpFactor = Math.min(adaptiveStrength * dt * 10, 1);
        const newAngle = currentAngle + angleDiff * lerpFactor;

        // 5. Velocity güncelle
        this.velocity.x = Math.cos(newAngle) * shotSpeed;
        this.velocity.y = Math.sin(newAngle) * shotSpeed;
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
