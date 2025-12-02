// game/boss.js - Epic Boss System (Clean & Simple 2 Phases)

const BOSS_TYPES = {
    OMEGA: {
        name: 'OMEGA CORE',
        hp: 3500,
        color: '#8a2be2', // Phase 1: Mor
        radius: 80,
        score: 6000
    }
};

class Boss {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.hp = 0;
        this.maxHp = 0;
        this.angle = 0;
        this.orbitAngle = 0;
        this.phase = 1;
        this.attackTimer = 0;

        this.name = "";
    }

    spawn(x, y) {
        this.active = true;
        this.x = x;
        this.y = y;

        const type = BOSS_TYPES.OMEGA;
        this.name = type.name;
        this.hp = type.hp;
        this.maxHp = type.hp;
        this.radius = type.radius;
        this.color = type.color;
        this.phase = 1;
        this.attackTimer = 0;
        this.orbitAngle = 0;

        document.getElementById('boss-hud').style.display = 'flex';
        this.updateHealthBar();

        playSound('levelup');
        console.log("⚠️ WARNING: OMEGA CORE ACTIVE ⚠️");
    }

    update(player, dt = 1) {
        if (!this.active) return;

        this.attackTimer += dt;
        this.angle += 0.02 * dt;

        // --- PHASE KONTROLÜ (%50) ---
        if (this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            this.color = '#ff0000'; // Phase 2: Kırmızı
        } else {
            this.phase = 1;
            this.color = BOSS_TYPES.OMEGA.color; // Phase 1: Mor
        }

        // --- HAREKET: YÖRÜNGE (Her iki fazda da döner) ---
        let orbitSpeed = 0.01 * dt; // Phase 1 Hızı
        let orbitRadius = 350;
        let chaseSpeed = 0.05 * dt;

        if (this.phase === 2) {
            orbitSpeed = 0.015 * dt; // Phase 2 biraz daha hızlı döner
            orbitRadius = 300;  // Biraz daha yaklaşır
        }

        this.orbitAngle += orbitSpeed;

        // Hedef koordinat
        let targetX = player.x + Math.cos(this.orbitAngle) * orbitRadius;
        let targetY = player.y + Math.sin(this.orbitAngle) * orbitRadius;

        // Yumuşak takip (Lerp)
        this.x += (targetX - this.x) * chaseSpeed;
        this.y += (targetY - this.y) * chaseSpeed;


        // --- SALDIRILAR ---
        if (this.phase === 1) {
            // Phase 1: Minion + Homing Missile
            // Note: Logic simplified for dt, relying on cooldowns below
        }

        // COOLDOWN MANTIĞINA GEÇİŞ (Daha güvenli)
        if (!this.cooldowns) this.cooldowns = { minion: 0, missile: 0, spiral: 0 };

        this.cooldowns.minion -= dt;
        this.cooldowns.missile -= dt;
        this.cooldowns.spiral -= dt;

        if (this.phase === 1) {
            if (this.cooldowns.minion <= 0) {
                this.spawnMinions();
                this.cooldowns.minion = 180;
            }
            if (this.cooldowns.missile <= 0) {
                this.shootHomingMissile(player);
                this.cooldowns.missile = 120;
            }
        }
        else {
            // Phase 2: Spiral Bullet Hell
            if (this.cooldowns.spiral <= 0) {
                this.spiralShoot();
                this.cooldowns.spiral = 40; // Daha sık
            }
        }
    }

    // --- SALDIRI FONKSİYONLARI ---

    spawnMinions() {
        for (let i = 0; i < 1; i++) {
            enemyPool.get(this.x + (Math.random() - 0.5) * 50, this.y + (Math.random() - 0.5) * 50, ENEMY_TYPES.SPEEDSTER, 2);
        }
        playSound('shoot');
    }

    shootHomingMissile(player) {
        const missile = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1.5);
        missile.color = '#ff00ff';
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        missile.vx = Math.cos(angle) * 5;
        missile.vy = Math.sin(angle) * 5;
    }

    spiralShoot() {
        const angle = this.attackTimer * 0.3;
        for (let i = 0; i < 4; i++) {
            const finalAngle = angle + (i * (Math.PI * 2 / 4));
            const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
            bullet.radius = 8;
            bullet.hp = 1;
            bullet.color = '#ffff00';
            bullet.type = { ...bullet.type, score: 0 }; // Puan vermez

            bullet.x += Math.cos(finalAngle) * 20;
            bullet.y += Math.sin(finalAngle) * 20;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.updateHealthBar();

        this.radius = BOSS_TYPES.OMEGA.radius - 3;
        setTimeout(() => this.radius = BOSS_TYPES.OMEGA.radius, 50);

        if (this.hp <= 0) {
            this.die();
        }
    }

    updateHealthBar() {
        const fill = document.getElementById('boss-hp-fill');
        if (fill) {
            const percent = Math.max(0, (this.hp / this.maxHp) * 100);
            fill.style.width = percent + '%';

            if (percent < 50) fill.style.background = '#ff0000'; // %50 altı kırmızı
            else fill.style.background = '#8a2be2';
        }
    }

    die() {
        this.active = false;
        document.getElementById('boss-hud').style.display = 'none';

        // Final Patlaması
        createExplosion(this.x, this.y, 1000, 9999);

        // Hitstop efekti
        if (window.triggerHitstop) window.triggerHitstop(60); // 1 saniye donma

        // Ödül ve Level Up
        gameState.score += BOSS_TYPES.OMEGA.score;
        triggerLevelUp();

        // Normal oyuna dönüş
        gameState.bossActive = false;
        spawnEnemies();
    }

    draw() {
        if (!this.active) return;

        CTX.save();
        CTX.translate(this.x, this.y);

        // Aura
        CTX.beginPath();
        CTX.arc(0, 0, this.radius + 15 + Math.sin(this.attackTimer * 0.1) * 10, 0, Math.PI * 2);
        CTX.strokeStyle = this.phase === 2 ? `rgba(255, 0, 0, 0.5)` : `rgba(138, 43, 226, 0.4)`;
        CTX.lineWidth = 4;
        CTX.stroke();

        // Gövde
        CTX.rotate(this.angle);
        CTX.fillStyle = this.color;

        if (RenderOptimizer.useShadows) {
            CTX.shadowBlur = 20;
            CTX.shadowColor = this.color;
        }

        // Titreme yok, sadece dönen kare
        CTX.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

        // Göz
        CTX.rotate(-this.angle - this.orbitAngle); // Açıyı sıfırla
        // Hafif bir bakış animasyonu
        CTX.rotate(Math.sin(this.attackTimer * 0.05) * 0.5);

        CTX.fillStyle = '#fff';
        CTX.fillRect(-25, -10, 50, 20);

        CTX.restore();
    }
}

const boss = new Boss();