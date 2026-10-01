// Miniboss encounters designed for a stationary player: every threat is
// telegraphed and countered by aim/target priority, never by dodging.
class Miniboss extends BossBase {
    constructor(config) {
        super();
        this.config = config;
        this.name = config.name;
        this.color = config.color;
        this.baseMaxHp = config.hp;
        this.maxHp = config.hp;
        this.radius = 46;
        this.score = config.score;
        this.isMiniboss = true;
        this.pendingWaves = [];
        this.waveCooldown = 0;
        this.rotation = 0;
        this.targetY = 120;
        this.activeNodeCount = 0;
    }

    spawn(x, y) {
        this.maxHp = Math.round(this.baseMaxHp * (1 + Math.max(0, gameState.level - 1) * 0.055));
        this.pendingWaves.length = 0;
        this.waveCooldown = 100;
        this.rotation = 0;
        this.targetY = Math.max(90, Math.min(CANVAS.height * 0.22, 170));
        super.spawn(x, this.targetY);
        this.x = x;
        this.y = this.targetY;
        this.activeNodeCount = 0;
        if (typeof CollisionManager !== 'undefined') CollisionManager.registerBoss(this);
    }

    getNodeCount() {
        if (typeof enemyPool === 'undefined') return 0;
        let count = 0;
        const enemies = enemyPool.getActive();
        for (let i = 0; i < enemies.length; i++) if (enemies[i].isMinibossNode) count++;
        return count;
    }

    queueWave() {
        if (this.activeNodeCount >= 7 || this.pendingWaves.length) return;
        const hpRatio = this.hp / this.maxHp;
        const count = hpRatio > .66 ? 2 : (hpRatio > .33 ? 3 : 4);
        const points = [];
        const startAngle = this.rotation + Math.PI * .25;
        const radius = Math.min(CANVAS.width, CANVAS.height) * .44;
        for (let i = 0; i < count; i++) {
            const angle = startAngle + i * Math.PI * 2 / count;
            points.push({
                x: player.x + Math.cos(angle) * radius,
                y: player.y + Math.sin(angle) * radius
            });
        }
        this.pendingWaves.push({ timer: 72, points, type: this.config.nodeType(hpRatio) });
        if (window.playSound) playSound('ui_tick');
    }

    deployWave(wave) {
        for (let i = 0; i < wave.points.length; i++) {
            const point = wave.points[i];
            const node = enemyPool.get(point.x, point.y, wave.type, gameState.difficultyMultiplier + 1);
            node.isMinibossNode = true;
            node.color = this.color;
            node.hp = Math.max(node.hp, 2 + Math.floor(gameState.level / 10));
            node.maxHp = node.hp;
            spawnParticles(point.x, point.y, 6, 3, this.color);
        }
    }

    onUpdate(_player, dt) {
        this.activeNodeCount = this.getNodeCount();
        this.rotation += dt * .012;
        this.x = CANVAS.width / 2 + Math.sin(this.rotation * .42) * Math.min(110, CANVAS.width * .18);
        this.y += (this.targetY - this.y) * .035 * dt;
        this.waveCooldown -= dt;
        const hpRatio = this.hp / this.maxHp;
        if (this.waveCooldown <= 0) {
            this.queueWave();
            this.waveCooldown = hpRatio > .66 ? 320 : (hpRatio > .33 ? 260 : 210);
        }
        for (let i = this.pendingWaves.length - 1; i >= 0; i--) {
            const wave = this.pendingWaves[i];
            wave.timer -= dt;
            if (wave.timer <= 0) {
                this.deployWave(wave);
                this.pendingWaves.splice(i, 1);
            }
        }
    }

    takeDamage(amount) {
        // Nodes are an optional priority target, not hard invulnerability.
        if (this.activeNodeCount > 0) amount *= .58;
        super.takeDamage(amount);
    }

    onDraw() {
        const t = performance.now() * .001;
        CTX.save();
        CTX.translate(this.x, this.y);
        CTX.rotate(this.rotation);
        CTX.fillStyle = '#060914';
        CTX.strokeStyle = this.color;
        CTX.lineWidth = 3;
        CTX.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            const r = i % 2 ? this.radius * .72 : this.radius;
            const x = Math.cos(a) * r;
            const y = Math.sin(a) * r;
            if (i === 0) CTX.moveTo(x, y); else CTX.lineTo(x, y);
        }
        CTX.closePath();
        CTX.fill();
        CTX.stroke();
        CTX.rotate(-this.rotation * 2.3);
        CTX.strokeStyle = 'rgba(255,255,255,.7)';
        CTX.lineWidth = 1.5;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * (.42 + Math.sin(t * 4) * .04), 0, Math.PI * 1.55);
        CTX.stroke();
        CTX.fillStyle = this.color;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * .22, 0, Math.PI * 2);
        CTX.fill();
        CTX.restore();

        if (this.activeNodeCount > 0) {
            CTX.beginPath();
            CTX.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
            CTX.strokeStyle = this.color;
            CTX.globalAlpha = .3 + Math.sin(t * 7) * .12;
            CTX.lineWidth = 3;
            CTX.stroke();
            CTX.globalAlpha = 1;
        }

        // Telegraphs are rings only; no per-frame particles or allocations.
        for (let w = 0; w < this.pendingWaves.length; w++) {
            const wave = this.pendingWaves[w];
            const progress = 1 - wave.timer / 72;
            CTX.strokeStyle = this.color;
            CTX.globalAlpha = .25 + progress * .65;
            CTX.lineWidth = 2;
            CTX.beginPath();
            for (let i = 0; i < wave.points.length; i++) {
                const p = wave.points[i];
                CTX.moveTo(p.x + 22 * (1 - progress), p.y);
                CTX.arc(p.x, p.y, 22 * (1 - progress) + 6, 0, Math.PI * 2);
            }
            CTX.stroke();
            CTX.globalAlpha = 1;
        }
    }

    die() {
        if (typeof CollisionManager !== 'undefined') CollisionManager.unregisterBoss(this);
        super.die();
    }
}

const miniSentinel = new Miniboss({
    name: 'PRISM SENTINEL', color: '#32e8ff', hp: 32, score: 1400,
    nodeType: hpRatio => hpRatio > .4 ? ENEMY_TYPES.BASIC : ENEMY_TYPES.SPEEDSTER
});
const miniWarden = new Miniboss({
    name: 'AEGIS WARDEN', color: '#72ff7d', hp: 55, score: 2300,
    nodeType: hpRatio => hpRatio > .4 ? ENEMY_TYPES.TANK : ENEMY_TYPES.SPLITTER
});
const miniHarvester = new Miniboss({
    name: 'VOID HARVESTER', color: '#d35cff', hp: 80, score: 3400,
    nodeType: hpRatio => hpRatio > .4 ? ENEMY_TYPES.DASHER : ENEMY_TYPES.SPAWNER
});

window.miniSentinel = miniSentinel;
window.miniWarden = miniWarden;
window.miniHarvester = miniHarvester;
