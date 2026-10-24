// Targetable inbound sentries are the attack: no unavoidable beam or dodge check.
class HelixCitadel extends Miniboss {
    constructor() {
        super({ name: 'HELIX CITADEL', color: '#ffb954', hp: 2400, score: 12000,
            nodeType: ratio => ratio > .66 ? ENEMY_TYPES.TANK : ratio > .33 ? ENEMY_TYPES.DASHER : ENEMY_TYPES.SPLITTER });
        this.isMiniboss = false;
        this.radius = 58;
    }
    spawn(x, y) {
        super.spawn(x, y);
        this.waveCooldown = 160;
    }
    onUpdate(player, dt) {
        super.onUpdate(player, dt);
        this.phase = this.hp / this.maxHp > .66 ? 1 : this.hp / this.maxHp > .33 ? 2 : 3;
    }
    queueWave() {
        super.queueWave();
        // The inner ring arrives first; the outside ring follows later, giving
        // the stationary player an explicit target-priority decision.
        if (this.phase >= 2 && this.pendingWaves.length === 1) {
            const wave = this.pendingWaves[0];
            for (let i = 0; i < wave.points.length; i++) {
                const p = wave.points[i];
                const factor = i % 2 ? .82 : 1;
                p.x = player.x + (p.x - player.x) * factor;
                p.y = player.y + (p.y - player.y) * factor;
            }
            wave.timer = 96;
        }
    }
    onDraw() {
        super.onDraw();
        CTX.save();
        CTX.translate(this.x, this.y);
        CTX.strokeStyle = this.color;
        CTX.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            CTX.save(); CTX.rotate(-this.rotation * .65 + i * Math.PI * 2 / 3);
            CTX.beginPath();
            CTX.moveTo(this.radius + 12, -14); CTX.lineTo(this.radius + 34, 0);
            CTX.lineTo(this.radius + 12, 14); CTX.closePath();
            CTX.fillStyle = '#271c2d'; CTX.fill(); CTX.stroke(); CTX.restore();
        }
        CTX.restore();
    }
}
const boss10 = new HelixCitadel();
window.boss10 = boss10;
