class BossBase {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.radius = 50; // Default
        this.hp = 100;
        this.maxHp = 100;
        this.name = "Unknown Boss";
        this.score = 1000;
        this.phase = 1;
        this.attackTimer = 0;
        this.color = '#ffffff';
        this.deathExplosionDuration = 1000;
        this.deathHitstopDuration = 60;
    }

    spawn(x, y) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.hp = this.maxHp;
        this.phase = 1;
        this.attackTimer = 0;

        document.getElementById('boss-hud').style.display = 'flex';
        // Hide XP container when boss is active
        const xpContainer = document.getElementById('xp-container');
        if (xpContainer) xpContainer.style.display = 'none';

        document.getElementById('boss-name').textContent = this.name;
        document.getElementById('boss-name').style.color = this.color;
        this.updateHealthBar();

        console.log(`⚠️ WARNING: ${this.name} ACTIVE ⚠️`);
        if (window.playSound) playSound('levelup');
    }

    // Template method - override this for specific movement/attacks
    onUpdate(player, dt) { }

    update(player, dt = 1) {
        if (!this.active) return;

        this.onUpdate(player, dt);

        // Standard Collision Check can be here or in Manager
        // Keeping it compatible with existing Manager logic which currently does it externally,
        // BUT we want to move it IN here for encapsulation if possible.
        // For now, let's leave physics in the specific classes or Manager to minimize breakage risk during migration,
        // OR better yet, add a method checkCollision(player) that Manager calls.
    }

    // Template method - override for drawing
    onDraw() { }

    draw() {
        if (!this.active) return;
        this.onDraw();
    }

    takeDamage(amount) {
        if (!this.active) return;

        this.hp -= amount;
        this.updateHealthBar();

        if (this.hp <= 0) {
            this.die();
        }
    }

    updateHealthBar() {
        const fill = document.getElementById('boss-hp-fill');
        if (fill) {
            const percent = Math.max(0, (this.hp / this.maxHp) * 100);
            fill.style.width = percent + '%';

            // Default color behavior (can be overridden or managed by subclasses changing this.color)
            fill.style.background = this.phase === 2 ? '#ff0000' : this.color;
        }
    }

    die() {
        this.active = false;
        document.getElementById('boss-hud').style.display = 'none';

        // Show XP container when boss is dead
        const xpContainer = document.getElementById('xp-container');
        if (xpContainer) xpContainer.style.display = '';

        // Common Death Effects
        if (window.createExplosion) createExplosion(this.x, this.y, this.deathExplosionDuration, 9999);
        if (window.triggerHitstop) window.triggerHitstop(this.deathHitstopDuration);

        // Rewards
        if (typeof gameState !== 'undefined') {
            gameState.score += this.score;
            gameState.bossActive = false;
        }

        if (window.triggerLevelUp) triggerLevelUp();
        if (window.spawnEnemies) spawnEnemies();

        // Kill all minions
        if (typeof enemyPool !== 'undefined') {
            enemyPool.getActive().forEach(e => e.hp = 0);
        }
    }
}

// Make it available globally
window.BossBase = BossBase;
