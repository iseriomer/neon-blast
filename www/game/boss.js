// game/boss.js - Epic Boss System (Refactored)

const BOSS_TYPES = {
    OMEGA: {
        name: 'OMEGA CORE',
        hp: 6500,
        color: '#8a2be2', // Phase 1: Mor
        radius: 80,
        score: 6000
    }
};

class BossOmega extends BossBase {
    constructor() {
        super();
        this.name = BOSS_TYPES.OMEGA.name;
        this.maxHp = BOSS_TYPES.OMEGA.hp;
        this.score = BOSS_TYPES.OMEGA.score;
        this.baseColor = BOSS_TYPES.OMEGA.color;
        this.color = this.baseColor;
        this.radius = BOSS_TYPES.OMEGA.radius;
        this.orbitAngle = 0;
        this.angle = 0;
        this.cooldowns = { minion: 0, missile: 0, spiral: 0 };
    }

    spawn(x, y) {
        // Call generic spawn first
        super.spawn(x, y);

        // Specific resets
        this.orbitAngle = 0;
        this.cooldowns = { minion: 0, missile: 0, spiral: 0 };
        this.color = this.baseColor;
    }

    onUpdate(player, dt) {
        this.angle += 0.02 * dt;
        this.attackTimer += dt;

        // --- PHASE CONTROL ---
        if (this.hp < this.maxHp * 0.5) {
            this.phase = 2;
            this.color = '#ff0000'; // Phase 2: Red
        } else {
            this.phase = 1;
            this.color = this.baseColor; // Phase 1: Purple
        }

        // --- MOVEMENT: ORBIT ---
        let orbitSpeed = 0.01 * dt;
        let orbitRadius = 350;
        let chaseSpeed = 0.05 * dt;

        if (this.phase === 2) {
            orbitSpeed = 0.015 * dt;
            orbitRadius = 300;
        }

        this.orbitAngle += orbitSpeed;

        let targetX = player.x + Math.cos(this.orbitAngle) * orbitRadius;
        let targetY = player.y + Math.sin(this.orbitAngle) * orbitRadius;

        // Smooth Lerp
        this.x += (targetX - this.x) * chaseSpeed;
        this.y += (targetY - this.y) * chaseSpeed;

        // --- ATTACKS ---
        this.cooldowns.minion -= dt;
        this.cooldowns.missile -= dt;
        this.cooldowns.spiral -= dt;

        if (this.phase === 1) {
            if (this.cooldowns.minion <= 0) {
                this.spawnMinions();
                this.cooldowns.minion = 120;
            }
            if (this.cooldowns.missile <= 0) {
                this.shootHomingMissile(player);
                this.cooldowns.missile = 80;
            }
        } else {
            // Phase 2: Spiral Bullet Hell
            if (this.cooldowns.spiral <= 0) {
                this.spiralShoot();
                this.cooldowns.spiral = 15;
            }
        }
    }

    // --- ATTACK FUNCTIONS ---

    spawnMinions() {
        if (!typeof enemyPool) return;
        enemyPool.get(this.x + (Math.random() - 0.5) * 50, this.y + (Math.random() - 0.5) * 50, ENEMY_TYPES.SPEEDSTER, 2);
        if (window.playSound) playSound('shoot');
    }

    shootHomingMissile(player) {
        if (!typeof enemyPool) return;
        const missile = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1.5);
        missile.color = '#ff00ff';
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        missile.vx = Math.cos(angle) * 5;
        missile.vy = Math.sin(angle) * 5;
    }

    spiralShoot() {
        if (!typeof enemyPool) return;
        const angle = this.attackTimer * 0.3;
        for (let i = 0; i < 4; i++) {
            const finalAngle = angle + (i * (Math.PI * 2 / 4));
            const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
            bullet.radius = 8;
            bullet.hp = 1;
            bullet.color = '#ffff00';
            bullet.type = { ...bullet.type, score: 0 };

            bullet.x += Math.cos(finalAngle) * 20;
            bullet.y += Math.sin(finalAngle) * 20;
        }
    }

    // Override death to add specific cleanup if needed, or rely on base
    die() {
        super.die();
        // Specific Boss Omega death logic is handled by base (explosion, score)
    }

    onDraw() {
        CTX.save();
        CTX.translate(this.x, this.y);

        // Aura
        CTX.beginPath();
        CTX.arc(0, 0, this.radius + 15 + Math.sin(this.attackTimer * 0.1) * 10, 0, Math.PI * 2);
        CTX.strokeStyle = this.phase === 2 ? `rgba(255, 0, 0, 0.5)` : `rgba(138, 43, 226, 0.4)`;
        CTX.lineWidth = 4;
        CTX.stroke();

        // Body
        CTX.rotate(this.angle);
        CTX.fillStyle = this.color;

        if (window.RenderOptimizer && RenderOptimizer.useShadows) {
            CTX.shadowBlur = 20;
            CTX.shadowColor = this.color;
        }

        CTX.fillRect(-this.radius, -this.radius, this.radius * 2, this.radius * 2);

        // Eye
        CTX.rotate(-this.angle - this.orbitAngle); // Reset angle
        CTX.rotate(Math.sin(this.attackTimer * 0.05) * 0.5);

        CTX.fillStyle = '#fff';
        CTX.fillRect(-25, -10, 50, 20);

        CTX.restore();
    }
}

// Rename to 'boss' variable for backward compatibility until Manager is refactored
const boss = new BossOmega();