// A forge alternates a focused procession and a wide fan of shootable embers.
// All attacks use ordinary targetable enemies; movement is never required.
class AuroraForge extends BossBase {
    constructor() {
        super(); this.name = 'AURORA FORGE'; this.color = '#73ffd9';
        this.maxHp = 4200; this.radius = 55; this.score = 15000;
        this.telegraphs = []; this.cycle = 0; this.rotation = 0;
    }
    spawn(x, y) {
        this.telegraphs = []; this.cycle = 0; this.rotation = 0;
        super.spawn(x, Math.max(75, CANVAS.height * .18));
        this.attackTimer = 180; CollisionManager.registerBoss(this);
    }
    onUpdate(_player, dt) {
        this.phase = this.hp / this.maxHp > .6 ? 1 : this.hp / this.maxHp > .3 ? 2 : 3;
        this.rotation += dt * .009;
        this.x = CANVAS.width / 2 + Math.sin(this.rotation) * CANVAS.width * .18;
        this.attackTimer -= dt;
        if (this.attackTimer <= 0 && enemyPool.getActive().length < 9) {
            this.cycle++;
            const fan = this.cycle % 2 === 0;
            const count = fan ? this.phase + 2 : 2;
            const radius = Math.min(CANVAS.width, CANVAS.height) * .43;
            for (let i = 0; i < count; i++) {
                const angle = fan ? -Math.PI / 2 + (i - (count - 1) / 2) * .7 : this.rotation + i * Math.PI;
                this.telegraphs.push({ x: player.x + Math.cos(angle) * radius,
                    y: player.y + Math.sin(angle) * radius, timer: 100,
                    tank: !fan && i === 0 });
            }
            this.attackTimer = 340 - this.phase * 30;
        }
        for (let i = this.telegraphs.length - 1; i >= 0; i--) {
            const point = this.telegraphs[i]; point.timer -= dt;
            if (point.timer > 0) continue;
            const enemy = enemyPool.get(point.x, point.y, point.tank ? ENEMY_TYPES.TANK : ENEMY_TYPES.BASIC, 1);
            enemy.color = this.color; enemy.hp = enemy.maxHp = point.tank ? 8 + this.phase * 2 : 2 + this.phase;
            enemy.speed *= point.tank ? .8 : 1.15;
            enemy.isMinibossNode = true;
            this.telegraphs.splice(i, 1);
        }
    }
    onDraw() {
        CTX.save(); CTX.translate(this.x, this.y);
        for (let ring = 0; ring < 2; ring++) {
            CTX.save(); CTX.rotate(this.rotation * (ring ? -1 : 1));
            const radius = this.radius * (ring ? .55 : 1);
            CTX.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3, x = Math.cos(a) * radius, y = Math.sin(a) * radius;
                if (!i) CTX.moveTo(x, y); else CTX.lineTo(x, y);
            }
            CTX.closePath(); CTX.fillStyle = ring ? '#205147' : '#101c26';
            CTX.fill(); CTX.strokeStyle = this.color; CTX.lineWidth = ring ? 2 : 4; CTX.stroke(); CTX.restore();
        }
        CTX.fillStyle = '#fff4cc'; CTX.beginPath(); CTX.arc(0, 0, this.radius * .18, 0, Math.PI * 2); CTX.fill(); CTX.restore();
        for (const point of this.telegraphs) {
            CTX.save(); CTX.globalAlpha = .3 + .6 * (1 - point.timer / 100);
            CTX.strokeStyle = point.tank ? '#ffb954' : this.color; CTX.lineWidth = 2;
            CTX.beginPath(); CTX.arc(point.x, point.y, 8 + point.timer * .2, 0, Math.PI * 2); CTX.stroke(); CTX.restore();
        }
    }
    die() {
        if (!this.active) return;
        this.telegraphs.length = 0; CollisionManager.unregisterBoss(this); super.die();
    }
}
const boss11 = new AuroraForge();
window.boss11 = boss11;
