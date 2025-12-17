// THE OMEGA - The True Final Boss
// "I am the end of all things."

const BOSS_3_DATA = {
    name: 'THE OMEGA',
    hp: 120000,
    score: 100000, // It's the final boss
    phases: [
        { threshold: 0.5, color: '#ffffff', name: 'UNLEASHED' },
        { threshold: 0.0, color: '#ff0044', name: 'TRUE FORM' } // 0.0 because it triggers on death
    ],
    colors: {
        shell: '#8800ff',
        core: '#000000',
        danger: '#ff0044',
        divine: '#ffffff'
    }
};

// --- Boss Specific Projectile Pool ---
// We use this for boss-specific threats that need simple physics but aren't generic "Enemies"
class OmegaEntity {
    constructor() {
        this.reset({});
    }

    reset(params) {
        this.active = true;
        this.x = params.x || 0;
        this.y = params.y || 0;
        this.type = params.type || 'projectile'; // 'projectile', 'shield', 'orb'
        this.vx = params.vx || 0;
        this.vy = params.vy || 0;
        this.radius = params.radius || 10;
        this.color = params.color || '#fff';
        this.life = params.life || 300;
        this.hp = params.hp || 1;
        this.maxHp = params.hp || 1;
        this.angle = params.angle || 0;
        this.rotSpeed = params.rotSpeed || 0;
        this.parent = params.parent || null; // For shields orbiting
        this.orbitAngle = params.orbitAngle || 0;
        this.orbitDist = params.orbitDist || 0;
        this.deadly = params.deadly !== undefined ? params.deadly : true;
    }
}

const omegaPool = new ObjectPool(
    () => new OmegaEntity(),
    (e, params) => e.reset(params),
    100
);

class BossOmega extends BossBase {
    constructor() {
        super();
        this.name = BOSS_3_DATA.name;
        this.maxHp = BOSS_3_DATA.hp;
        this.score = BOSS_3_DATA.score;
        this.radius = 90;

        // Visuals
        this.pulseTimer = 0;
        this.shake = 0;
        this.eyeOpenness = 0.1; // 0 to 1
        this.innerRotation = 0;

        // Combat State
        this.state = 'IDLE';
        this.omegaPhase = 1; // 1: Shell, 2: Unleashed, 3: True Form
        this.subPhase = 'NONE'; // For Phase 3: 'EVENT_HORIZON', 'DOOMSDAY'

        this.trueFormHp = 120000; // Extra HP bar for Phase 3
        this.trueFormMaxHp = 120000;

        this.shields = []; // Active shield entities
        this.attackTimer = 0;
        this.teleportDistortion = 0;
        // Death & Rebirth Tracking
        this.deathCount = 0; // Kaç kez öldü
        this.maxDeaths = 2; // 2 kez ölebilir, 3. sefer gerçekten ölür
        this.isRebirthing = false;
        this.rebirthTimer = 0;

        // New Attack Patterns
        this.aimTestActive = false;
        this.aimTestTargets = [];
        this.aimTestTimer = 0;
        this.dpsCheckActive = false;
        this.dpsCheckStartTime = 0;
        this.dpsCheckDamageDealt = 0;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -300; // Start high

        // Reset Logic
        this.omegaPhase = 1;
        this.subPhase = 'NONE';
        this.state = 'INTRO';
        this.introTimer = 0;
        this.hp = this.maxHp;
        this.radius = 90;

        omegaPool.releaseAll();
        this.shields = [];
        this.deathCount = 0;
        this.isRebirthing = false;
        this.aimTestActive = false;
        this.dpsCheckActive = false;
        this.aimTestTargets = [];
        // Center player manually for the "Stationary" experience
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 150;
            player.vx = 0;
            player.vy = 0;
        }

        document.getElementById('boss-name').innerText = "??? DETECTING SINGULARITY ???";
        document.getElementById('boss-name').style.color = '#888';
    }

    onUpdate(player, dt) {
        this.pulseTimer += dt;
        this.innerRotation += 0.02 * dt;

        // --- INTRO ---
        if (this.state === 'INTRO') {
            this.handleIntro(player, dt);
            return;
        }
        if (this.state === 'REBIRTHING') {
            this.handleRebirth(dt);
            return;
        }
        // --- DEATH SEQUENCE (Before True Form or Final Death) ---
        if (this.state === 'DYING') {
            this.handleDeathSequence(dt);
            return;
        }

        // --- PHASE LOGIC ---
        // Normal HP Check for Phase 1 -> 2
        if (this.omegaPhase === 1 && this.hp < this.maxHp * 0.5) {
            this.enterPhase2();
        }

        // True Form logic handled in takeDamage (when HP hits 0)

        // --- MOVEMENT & ATTACKS ---
        this.handleMovement(dt);
        this.handleAttacks(player, dt);

        // --- AIM TEST & DPS CHECK ---
        this.updateAimTest(dt);
        this.updateDPSCheck(dt);

        // --- UPDATING ENTITIES ---
        this.updateOmegaEntities(player, dt);
    }

    // -------------------------------------------------------------------------
    // LOGIC: STATES & TRANSITIONS
    // -------------------------------------------------------------------------

    handleIntro(player, dt) {
        this.introTimer += dt;
        const targetY = 150;

        if (this.introTimer < 180) {
            this.y += (targetY - this.y) * 0.02 * dt;
            if (this.introTimer % 10 < 1) {
                // Glitch effect on name
                const chars = "ΩOMEGA01VØIDERROR";
                let glitched = "";
                for (let i = 0; i < 10; i++) glitched += chars[Math.floor(Math.random() * chars.length)];
                document.getElementById('boss-name').innerText = glitched;
            }
        } else if (this.introTimer < 240) {
            document.getElementById('boss-name').innerText = "THE OMEGA";
            document.getElementById('boss-name').style.color = BOSS_3_DATA.colors.shell;
            // Spawn initial shields
            if (this.shields.length === 0) this.spawnShields(4);
        } else {
            this.state = 'IDLE';
            createExplosion(this.x, this.y, 300, 0);
            if (window.triggerHitstop) triggerHitstop(30);
        }
    }

    enterPhase2() {
        this.omegaPhase = 2;
        this.state = 'IDLE';
        this.attackTimer = 0;

        // Break shields
        this.shields.forEach(s => {
            s.hp = 0;
            spawnParticles(s.x, s.y, 10, 5, s.color);
        });
        this.shields = [];

        document.getElementById('boss-name').innerText = "THE OMEGA - UNLEASHED";
        document.getElementById('boss-name').style.color = BOSS_3_DATA.colors.divine;
        createExplosion(this.x, this.y, 400, 0);

        // Visual flare
        this.eyeOpenness = 0.5;
        if (window.playSound) playSound('powerup');
    }

    enterTrueForm() {
        this.omegaPhase = 3;
        this.subPhase = 'EVENT_HORIZON';

        // Recover HP but it's "True Form HP" now
        this.hp = this.trueFormMaxHp;
        this.maxHp = this.trueFormMaxHp; // Update HUD ref
        this.active = true; // Revive
        this.state = 'IDLE';

        this.x = CANVAS.width / 2;
        this.y = 150;
        this.radius = 120; // Bigger
        this.eyeOpenness = 1.0;

        document.getElementById('boss-name').innerText = "Ω T H E   E N D Ω";
        document.getElementById('boss-name').style.color = BOSS_3_DATA.colors.danger;

        // Push player to bottom center and LOCK them (soft lock or hard lock?)
        // User said "player can't move". We enforce position.
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 100;
        }

        // Clean screen
        omegaPool.releaseAll();
        if (typeof enemyPool !== 'undefined') {
            const enemies = enemyPool.getActive();
            enemies.forEach(e => e.hp = 0);
        }

        createExplosion(this.x, this.y, 1000, 0); // Massive boom
        // Background shift? (Handled by game loop usually, but we can fake it with particles)
        for (let i = 0; i < 50; i++) {
            spawnParticles(Math.random() * CANVAS.width, Math.random() * CANVAS.height, 2, 2, '#000');
        }
    }

    handleDeathSequence(dt) {
        // Just visual explosions before True Form or Real Death
        if (Math.random() < 0.2) {
            createExplosion(
                this.x - 50 + Math.random() * 100,
                this.y - 50 + Math.random() * 100,
                50 + Math.random() * 100,
                0
            );
        }
    }

    // -------------------------------------------------------------------------
    // LOGIC: MOVEMENT & ATTACKS
    // -------------------------------------------------------------------------

    handleMovement(dt) {
        if (this.omegaPhase === 3) {
            // True Form is mostly stationary center, maybe floats slightly
            this.y = 150 + Math.sin(this.pulseTimer * 0.05) * 10;
            // Force player position in phase 3
            if (typeof player !== 'undefined') {
                const dx = player.x - (CANVAS.width / 2);
                const dy = player.y - (CANVAS.height - 100);
                // "Gravity" well pulling player constantly to center spot
                if (Math.abs(dx) > 5) player.x -= dx * 0.1 * dt;
                if (Math.abs(dy) > 5) player.y -= dy * 0.1 * dt;
            }
            return;
        }

        if (this.omegaPhase === 2) {
            // Teleporting dash movement
            if (Math.random() < 0.01 * dt) {
                this.teleport();
            }
        }

        // Float
        this.y += Math.sin(this.pulseTimer * 0.05) * 0.5 * dt;
    }

    teleport() {
        this.teleportDistortion = 10;
        spawnParticles(this.x, this.y, 20, 5, '#fff');

        // Pick random spot in top half
        const targetX = 100 + Math.random() * (CANVAS.width - 200);
        const targetY = 80 + Math.random() * 150;

        this.x = targetX;
        this.y = targetY;

        if (window.playSound) playSound('shoot'); // reused sound
    }

    handleAttacks(player, dt) {
        this.attackTimer += dt;

        // Cooldowns vary by phase (BUFFED SPEEDS)
        let cooldown = 80;
        if (this.omegaPhase === 2) cooldown = 60;
        if (this.omegaPhase === 3) cooldown = 40; // Faster in true form

        if (this.attackTimer > cooldown) {
            this.attackTimer = 0;

            if (this.omegaPhase === 1) {
                this.phase1Attack();
            } else if (this.omegaPhase === 2) {
                this.phase2Attack();
            } else if (this.omegaPhase === 3) {
                this.phase3Attack();
            }
        }
        if (this.aimTestActive) {
            // Boss pasif kalır ama bazen rastgele projectile atar
            if (this.pulseTimer % 60 < 1) {
                const angle = Math.random() * Math.PI * 2;
                omegaPool.get({
                    type: 'projectile',
                    x: this.x, y: this.y,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    radius: 8,
                    color: '#ff00ff',
                    hp: 14,
                    life: 200,
                    deadly: true
                });
            }
            return; // Başka atak yapma
        }

        // DPS Check sırasında
        if (this.state === 'DPS_CHECK') {
            // Barriers orbit around boss
            omegaPool.getActive().forEach(e => {
                if (e.type === 'dps_barrier' && e.parent) {
                    e.orbitAngle += 0.04 * dt;
                    e.x = this.x + Math.cos(e.orbitAngle) * e.orbitDist;
                    e.y = this.y + Math.sin(e.orbitAngle) * e.orbitDist;
                }
            });
            return;
        }

        // Phase 2 için ekstra zorluk
        if (this.omegaPhase === 2 && !this.aimTestActive) {
            // Homing missiles
            if (this.attackTimer % 90 === 0) {
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * Math.PI * 2 + this.pulseTimer * 0.1;
                    const missile = omegaPool.get({
                        type: 'homing',
                        x: this.x, y: this.y,
                        vx: Math.cos(angle) * 3,
                        vy: Math.sin(angle) * 3,
                        radius: 12,
                        color: '#00ffff',
                        hp: 30,
                        life: 400,
                        deadly: true
                    });
                }
            }

            // Spiral pattern
            if (this.attackTimer % 120 === 60) {
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2 + this.pulseTimer * 0.2;
                    omegaPool.get({
                        type: 'projectile',
                        x: this.x, y: this.y,
                        vx: Math.cos(angle) * 7,
                        vy: Math.sin(angle) * 7,
                        radius: 10,
                        color: '#ff00ff',
                        hp: 25,
                        life: 250,
                        deadly: true
                    });
                }
            }
        }
    }

    // --- PHASE 1: THE SHELL ---
    // Shields protect boss. Must shoot through gaps.
    // --- PHASE 1: THE SHELL ---
    // Shields protect boss. Must shoot through gaps.
    spawnShields(count) {
        // BUFF: 6 Shields instead of 4, tighter gaps
        count = 6;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const shield = omegaPool.get({
                type: 'shield', x: 0, y: 0,
                parent: this, orbitAngle: angle, orbitDist: 140,
                radius: 25, color: '#aa00ff', hp: 280, life: 99999,
                deadly: true
            });
            this.shields.push(shield);
        }
    }

    phase1Attack() {
        // HARDER: Two types of attacks happening

        // 1. Fast Projectile Fan (Direct Threat)
        const fanCount = 5;
        const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        for (let i = 0; i < fanCount; i++) {
            const angle = angleToPlayer + (i - Math.floor(fanCount / 2)) * 0.2;
            omegaPool.get({
                type: 'projectile',
                x: this.x, y: this.y,
                vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6,
                radius: 8, color: '#ff5500', hp: 15, life: 200,
                deadly: true
            });
        }

        // 2. Spawn Seeker Orbs (Pressure)
        // BUFF: Faster, more HP
        for (let i = 0; i < 2; i++) {
            const angle = Math.random() * Math.PI;
            const orb = omegaPool.get({
                type: 'orb',
                x: this.x + (Math.random() - 0.5) * 100, y: this.y,
                vx: Math.cos(angle) * 3, vy: 3 + Math.random() * 2, // Faster
                radius: 18, color: '#ffaaaa', hp: 15, life: 400,
                deadly: true
            });
        }

        if (window.playSound) playSound('shoot');
    }

    // --- PHASE 2: UNLEASHED ---
    // Fast, aggression.
    phase2Attack() {
        const rand = Math.random();

        if (rand < 0.6) {
            // Destructible Projectile Barrage (Big Orbs)
            // BUFF: Fires 3 at once
            for (let i = -1; i <= 1; i++) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x) + (i * 0.3);
                omegaPool.get({
                    type: 'big_orb',
                    x: this.x, y: this.y,
                    vx: Math.cos(angle) * 7, vy: Math.sin(angle) * 7,
                    radius: 25, color: '#fff', hp: 25, life: 300,
                    deadly: true
                });
            }
        } else {
            // Minion Swarm (using Global Enemy Pool)
            // BUFF: Spawn 6 fast enemies
            for (let i = 0; i < 6; i++) {
                const side = i % 2 === 0 ? -20 : CANVAS.width + 20;
                const enemy = enemyPool.get(side, Math.random() * CANVAS.height / 2, ENEMY_TYPES.SPEEDSTER, 4); // Speedster type
                enemy.isDead = false;
                // Make them rush player
                const ang = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                enemy.vx = Math.cos(ang) * 6;
                enemy.vy = Math.sin(ang) * 6;
                enemy.update = function (p, d) { this.x += this.vx * d; this.y += this.vy * d; }
            }
        }
    }

    // --- PHASE 3: TRUE FORM ---
    // Subphase A: Event Horizon (Spiral)
    // Subphase B: Doomsday (DPS Check)
    phase3Attack() {
        // Switch sub-phase based on HP
        if (this.hp < this.trueFormMaxHp * 0.4 && this.subPhase !== 'DOOMSDAY') {
            this.subPhase = 'DOOMSDAY';
            this.startDoomsday();
            return;
        }

        if (this.subPhase === 'EVENT_HORIZON') {
            // Spiral Pattern
            const count = 10;
            for (let i = 0; i < count; i++) {
                const angle = this.pulseTimer * 0.1 + (i / count) * Math.PI * 2;
                omegaPool.get({
                    type: 'projectile',
                    x: this.x, y: this.y,
                    vx: Math.cos(angle) * 4, vy: Math.sin(angle) * 4,
                    radius: 8, color: '#ff0044', hp: 13, life: 200,
                    deadly: true
                });
            }
        } else if (this.subPhase === 'DOOMSDAY') {
            // Massive aimed lasers + screen shake
            if (this.pulseTimer % 20 < 1) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x) + (Math.random() - 0.5) * 0.5;
                omegaPool.get({
                    type: 'projectile',
                    x: this.x, y: this.y,
                    vx: Math.cos(angle) * 8, vy: Math.sin(angle) * 8,
                    radius: 12, color: '#ffffff', hp: 20, life: 100,
                    deadly: true
                });
            }
        }
    }

    startDoomsday() {
        document.getElementById('boss-name').innerText = "Ω DOOMSDAY IMMINENT Ω";
        if (window.triggerHitstop) triggerHitstop(60);
        createExplosion(this.x, this.y, 500, 0);
        // Summon 4 Heavy Minions to protect connection
        for (let i = 0; i < 4; i++) {
            const ang = (i / 4) * Math.PI * 2;
            const e = enemyPool.get(
                this.x + Math.cos(ang) * 150,
                this.y + Math.sin(ang) * 150,
                ENEMY_TYPES.TANK, 5
            );
        }
    }

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    updateOmegaEntities(player, dt) {
        omegaPool.update((e) => {
            if (!e.active) return true;

            // Logic by type
            if (e.type === 'shield') {
                if (e.parent) {
                    e.orbitAngle += 0.02 * dt;
                    e.x = e.parent.x + Math.cos(e.orbitAngle) * e.orbitDist;
                    e.y = e.parent.y + Math.sin(e.orbitAngle) * e.orbitDist;
                }
            } else {
                e.x += e.vx * dt;
                e.y += e.vy * dt;
            }

            e.life -= dt;
            if (e.type === 'homing' && typeof player !== 'undefined') {
                const angle = Math.atan2(player.y - e.y, player.x - e.x);
                const turnSpeed = 0.05 * dt;
                const currentAngle = Math.atan2(e.vy, e.vx);
                let targetAngle = angle;

                // Smooth turning
                let diff = targetAngle - currentAngle;
                if (diff > Math.PI) diff -= Math.PI * 2;
                if (diff < -Math.PI) diff += Math.PI * 2;

                const newAngle = currentAngle + diff * turnSpeed;
                const speed = Math.hypot(e.vx, e.vy);
                e.vx = Math.cos(newAngle) * speed;
                e.vy = Math.sin(newAngle) * speed;
            }
            // Collision with Player
            if (e.deadly && typeof player !== 'undefined' && gameState.gameActive) {
                if (Math.hypot(player.x - e.x, player.y - e.y) < e.radius + player.radius) {
                    if (gameState.playerStats.shield > 0) {
                        gameState.playerStats.shield--;
                        updateShieldIndicator(gameState.playerStats.shield);
                        return true; // Destroy projectile
                    } else if (!gameState.godMode) {
                        startDeathSequence();
                    }
                    return true;
                }
            }

            // Hit by bullets?
            // This is usually handled in bullet update, but for Boss Entities we might need manual check 
            // OR we rely on standard bullet collision checking finding these? 
            // Standard game loop usually checks bullets vs "enemies". 
            // Since these are in a separate pool, we need to bridge that.
            // **CRITICAL FIX**: Make sure player bullets hit these.
            // Assuming standard bullet loop doesn't know about omegaPool. 
            // We'll iterate bullets here.

            // NOTE: Accessing global 'bullets' array if exists, or passing projectile manager?
            // NeonBlast usually has a 'bullets' array in main game file. 
            // I'll assume global `bullets` or similar. If not, this part is tricky.
            // Checking `game/gun.js` or `game/game.js` would confirm. 
            // Standard practice: check collision with player bullets here.
            if (typeof bullets !== 'undefined') {
                bullets.forEach(b => {
                    if (b.active && Math.hypot(b.x - e.x, b.y - e.y) < e.radius + b.radius) {
                        e.hp -= b.damage || 1;
                        b.active = false; // Destroy bullet
                        spawnParticles(e.x, e.y, 3, 2, e.color);
                        if (window.playSound) playSound('hit');
                    }
                });
            }

            if (e.hp <= 0) {
                spawnParticles(e.x, e.y, 10, 3, e.color);
                return true;
            }

            return e.life <= 0;
        });

        // CRITICAL FIX: Update active shields list
        // Remove destroyed shields so boss becomes vulnerable
        this.shields = this.shields.filter(s => s.active && s.hp > 0);
    }

    takeDamage(amount) {
        if (this.state === 'INTRO' || this.state === 'DYING' || this.isRebirthing) return;

        // *** PHASE 1: SHIELD IMMUNITY - MOR YUVARLAKLAR ÖLDÜRÜLMEDEN BOSS HASAR ALAMAZ ***
        if (this.omegaPhase === 1 && this.shields.length > 0) {
            // Tam bağışıklık! Shield'lar varken boss'a hasar verilmez
            spawnParticles(this.x, this.y, 3, 2, '#8800ff');
            if (window.playSound) playSound('shield');
            return; // Hasar alınmaz!
        }

        // DPS Check sırasında hasar takibi
        if (this.dpsCheckActive) {
            this.dpsCheckDamageDealt += amount;
        }

        this.hp -= amount;
        this.updateHealthBar();

        if (this.hp <= 0) {
            if (this.deathCount < this.maxDeaths) {
                // DARK SOULS TARZINDA YENİDEN DOĞUŞ!
                this.startRebirth();
            } else {
                // Gerçek ölüm
                this.die();
            }
        }
    }
    startRebirth() {
        this.deathCount++;
        this.isRebirthing = true;
        this.rebirthTimer = 0;
        this.state = 'REBIRTHING';

        // Ekranı temizle
        omegaPool.releaseAll();
        if (typeof enemyPool !== 'undefined') {
            enemyPool.getActive().forEach(e => {
                if (!e.isBossMinion) e.hp = 0;
            });
        }

        // Büyük patlama efekti
        createExplosion(this.x, this.y, 800, 0);
        if (window.triggerHitstop) triggerHitstop(120);

        // Ses efekti
        if (window.playSound) playSound('levelup');

        console.log(`🔥 OMEGA REBIRTH ${this.deathCount}/${this.maxDeaths} 🔥`);
    }

    handleRebirth(dt) {
        this.rebirthTimer += dt;

        // Patlama parçacıkları
        if (this.rebirthTimer % 10 < 1) {
            for (let i = 0; i < 5; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 200;
                spawnParticles(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    5, 3, '#ff0044'
                );
            }
        }

        // 120 frame sonra yeniden canlan
        if (this.rebirthTimer >= 120) {
            this.completeRebirth();
        }
    }

    completeRebirth() {
        this.isRebirthing = false;
        this.state = 'IDLE';

        // Tam canla geri dön!
        if (this.deathCount === 1) {
            // İlk rebirth: Phase 2'ye geç, canı fullenir
            this.hp = this.maxHp;
            this.omegaPhase = 2;
            this.eyeOpenness = 0.7;
            document.getElementById('boss-name').innerText = "Ω REBORN - PHASE II Ω";
            document.getElementById('boss-name').style.color = '#00ffff';

            // Yeni pattern: AIM TEST başlat
            this.startAimTest();

        } else if (this.deathCount === 2) {
            // İkinci rebirth: Phase 3 - TRUE FORM
            this.enterTrueForm();

            // DPS CHECK başlat
            this.startDPSCheck();
        }

        this.updateHealthBar();
        createExplosion(this.x, this.y, 500, 0);
        if (window.playSound) playSound('powerup');
    }
    startAimTest() {
        this.aimTestActive = true;
        this.aimTestTimer = 0;
        this.aimTestTargets = [];

        document.getElementById('boss-name').innerText = "⚠️ OMEGA-REBORN ⚠️";

        // 6 hedef spawn et - bunlar öldürülmezse boss invincible kalır
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = 250;
            const target = omegaPool.get({
                type: 'aim_target',
                x: this.x + Math.cos(angle) * dist,
                y: this.y + Math.sin(angle) * dist,
                vx: 0, vy: 0,
                radius: 15,
                color: '#ffff00',
                hp: 5, // 5 hit gerekiyor
                life: 9999, // Süresiz
                deadly: false, // Oyuncuya zarar vermez
                orbitAngle: angle,
                orbitDist: dist,
                parent: this,
                targetIndex: i
            });
            this.aimTestTargets.push(target);
        }

        if (window.playSound) playSound('alert');
    }

    updateAimTest(dt) {
        if (!this.aimTestActive) return;

        this.aimTestTimer += dt;

        // Hedefler boss etrafında döner
        this.aimTestTargets = this.aimTestTargets.filter(t => t.active && t.hp > 0);

        this.aimTestTargets.forEach(target => {
            target.orbitAngle += 0.03 * dt; // Hızlı dönerler - aim zorlaşır!
            target.x = this.x + Math.cos(target.orbitAngle) * target.orbitDist;
            target.y = this.y + Math.sin(target.orbitAngle) * target.orbitDist;

            // Yanıp söner
            if (this.aimTestTimer % 20 < 10) {
                target.color = '#ffff00';
            } else {
                target.color = '#ff0000';
            }
        });

        // Tüm hedefler yok edildi mi?
        if (this.aimTestTargets.length === 0) {
            this.endAimTest(true);
        }

        // 20 saniye timeout - başarısız
        if (this.aimTestTimer > 1200) {
            this.endAimTest(false);
        }
    }

    endAimTest(success) {
        this.aimTestActive = false;
        this.aimTestTargets = [];

        if (success) {
            document.getElementById('boss-name').innerText = "✓ AIM TEST PASSED ✓";
            if (window.playSound) playSound('powerup');
            createExplosion(this.x, this.y, 300, 0);

            // Boss artık hasar alabilir!
            setTimeout(() => {
                document.getElementById('boss-name').innerText = "THE OMEGA - UNLEASHED";
            }, 2000);
        } else {
            // BAŞARISIZ - Boss fulll heal + agresif mod
            document.getElementById('boss-name').innerText = "✗ FAILED - OMEGA ENRAGED ✗";
            this.hp = this.maxHp;
            this.updateHealthBar();
            if (window.playSound) playSound('alert');

            // Punishment: Massive bullet hell
            for (let i = 0; i < 360; i += 10) {
                const rad = i * Math.PI / 180;
                omegaPool.get({
                    type: 'projectile',
                    x: this.x, y: this.y,
                    vx: Math.cos(rad) * 6,
                    vy: Math.sin(rad) * 6,
                    radius: 10,
                    color: '#ff0000',
                    hp: 999,
                    life: 300,
                    deadly: true
                });
            }
        }
    }


    // ============================================================================
    // 6. YENİ METOD: DPS CHECK MEKANİĞİ (endAimTest'den sonra ekle)

    startDPSCheck() {
        this.dpsCheckActive = true;
        this.dpsCheckStartTime = Date.now();
        this.dpsCheckDamageDealt = 0;

        document.getElementById('boss-name').innerText = "⚡ DPS CHECK - 10 SECONDS ⚡";

        // Boss sabit konumda durur
        this.state = 'DPS_CHECK';

        // Ekranda uyarı
        if (window.playSound) playSound('alert');

        // Spawn protective barriers that need to be destroyed
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            omegaPool.get({
                type: 'dps_barrier',
                x: this.x + Math.cos(angle) * 150,
                y: this.y + Math.sin(angle) * 150,
                vx: 0, vy: 0,
                radius: 20,
                color: '#00ffff',
                hp: 50,
                life: 9999,
                deadly: true,
                orbitAngle: angle,
                orbitDist: 150,
                parent: this
            });
        }
    }

    updateDPSCheck(dt) {
        if (!this.dpsCheckActive) return;

        const elapsed = Date.now() - this.dpsCheckStartTime;
        const timeLeft = Math.max(0, 10000 - elapsed); // 10 saniye

        // Zamanlayıcı göster
        const secondsLeft = Math.ceil(timeLeft / 1000);
        document.getElementById('boss-name').innerText = `⚡ DPS CHECK: ${secondsLeft}s - DMG: ${this.dpsCheckDamageDealt.toFixed(0)} ⚡`;

        // Süre doldu mu?
        if (timeLeft <= 0) {
            this.endDPSCheck();
        }
    }

    endDPSCheck() {
        this.dpsCheckActive = false;
        this.state = 'IDLE';

        // Gerekli hasar: 5000
        const requiredDamage = 5000;

        if (this.dpsCheckDamageDealt >= requiredDamage) {
            // BAŞARILI!
            document.getElementById('boss-name').innerText = "✓ DPS CHECK PASSED ✓";
            if (window.playSound) playSound('powerup');

            // Boss stunned - 5 saniye boyunca çok hassas
            this.state = 'STUNNED';
            setTimeout(() => {
                this.state = 'IDLE';
                document.getElementById('boss-name').innerText = "Ω THE END Ω";
            }, 5000);

            // Tüm bariyerleri patlat
            omegaPool.getActive().forEach(e => {
                if (e.type === 'dps_barrier') {
                    createExplosion(e.x, e.y, 100, 0);
                    e.hp = 0;
                }
            });

        } else {
            // BAŞARISIZ - OYUNCU ÖLDÜRÜLÜR!
            document.getElementById('boss-name').innerText = "✗ DPS CHECK FAILED - INSTANT DEATH ✗";

            // Tüm bariyerler oyuncuya doğru fırlatılır
            omegaPool.getActive().forEach(e => {
                if (e.type === 'dps_barrier') {
                    const angle = Math.atan2(player.y - e.y, player.x - e.x);
                    e.vx = Math.cos(angle) * 15;
                    e.vy = Math.sin(angle) * 15;
                    e.type = 'projectile'; // Artık projectile gibi davranır
                }
            });

            // 2 saniye sonra oyuncu otomatik ölür
            setTimeout(() => {
                if (gameState.gameActive) {
                    gameState.playerStats.shield = 0;
                    startDeathSequence();
                }
            }, 2000);
        }

        this.dpsCheckDamageDealt = 0;
    }


    die() {
        super.die();
        // Custom massive death effect
        if (typeof enemyPool !== 'undefined') {
            enemyPool.getActive().forEach(e => e.hp = 0);
        }
        omegaPool.releaseAll();
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }
    }

    // -------------------------------------------------------------------------
    // DRAW
    // -------------------------------------------------------------------------

    onDraw() {
        // Draw Entities
        const entities = omegaPool.getActive();
        entities.forEach(e => {
            CTX.save();
            CTX.translate(e.x, e.y);
            CTX.fillStyle = e.color;
            CTX.shadowBlur = 10;
            CTX.shadowColor = e.color;

            if (e.type === 'shield') {
                // Arc shape
                CTX.beginPath();
                CTX.arc(0, 0, e.radius, 0, Math.PI * 2);
                CTX.fill();
                CTX.strokeStyle = '#fff';
                CTX.stroke();
            } else if (e.type.includes('orb')) {
                CTX.beginPath();
                CTX.arc(0, 0, e.radius, 0, Math.PI * 2);
                CTX.fill();
            }
            // Aim targets - farklı render
            else if (e.type === 'aim_target') {
                CTX.save();
                CTX.strokeStyle = e.color;
                CTX.lineWidth = 3;
                CTX.shadowBlur = 20;
                CTX.shadowColor = e.color;

                // Hedef işareti
                CTX.beginPath();
                CTX.arc(0, 0, e.radius, 0, Math.PI * 2);
                CTX.stroke();

                CTX.beginPath();
                CTX.moveTo(-e.radius, 0);
                CTX.lineTo(e.radius, 0);
                CTX.moveTo(0, -e.radius);
                CTX.lineTo(0, e.radius);
                CTX.stroke();

                // HP indicator
                CTX.fillStyle = '#fff';
                CTX.font = 'bold 12px Arial';
                CTX.textAlign = 'center';
                CTX.fillText(e.hp, 0, 5);
                CTX.restore();
            }

            // DPS Barriers
            else if (e.type === 'dps_barrier') {
                CTX.save();
                CTX.strokeStyle = e.color;
                CTX.fillStyle = e.color + '44';
                CTX.lineWidth = 4;
                CTX.shadowBlur = 25;
                CTX.shadowColor = e.color;

                // Rotating square
                CTX.rotate(this.pulseTimer * 0.05);
                CTX.strokeRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
                CTX.fillRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2);
                CTX.restore();
            }

            // Homing missiles - trail effect
            else if (e.type === 'homing') {
                // Main body
                CTX.beginPath();
                CTX.arc(0, 0, e.radius, 0, Math.PI * 2);
                CTX.fill();

                // Direction indicator
                const angle = Math.atan2(e.vy, e.vx);
                CTX.save();
                CTX.rotate(angle);
                CTX.fillStyle = '#ffffff';
                CTX.beginPath();
                CTX.moveTo(e.radius, 0);
                CTX.lineTo(e.radius + 10, -5);
                CTX.lineTo(e.radius + 10, 5);
                CTX.closePath();
                CTX.fill();
                CTX.restore();
            }
            else {
                // Projectile
                CTX.beginPath();
                CTX.arc(0, 0, e.radius, 0, Math.PI * 2);
                CTX.fill();
            }
            CTX.restore();
        });

        // Draw Boss Body
        CTX.save();
        CTX.translate(this.x, this.y);

        // Shake logic
        if (this.omegaPhase === 3) {
            CTX.translate((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
        }

        // --- VISUAL DESIGN ---
        // 1. The Core (Black Hole)
        CTX.beginPath();
        CTX.arc(0, 0, this.radius, 0, Math.PI * 2);
        CTX.fillStyle = '#000';
        CTX.fill();

        // 2. The Rim (Glowing)
        CTX.strokeStyle = this.omegaPhase === 3 ? BOSS_3_DATA.colors.danger : BOSS_3_DATA.colors.shell;
        CTX.lineWidth = 5;
        CTX.stroke();

        CTX.shadowBlur = 20;
        CTX.shadowColor = CTX.strokeStyle;

        // 3. The Eye (Opens in Phase 2/3)
        if (this.eyeOpenness > 0) {
            CTX.save();
            CTX.scale(1, this.eyeOpenness);
            CTX.beginPath();
            CTX.arc(0, 0, this.radius * 0.6, 0, Math.PI * 2);
            CTX.fillStyle = '#fff';
            CTX.fill();

            // Pupil
            CTX.beginPath();
            CTX.arc(Math.sin(this.pulseTimer * 0.05) * 10, 0, this.radius * 0.2, 0, Math.PI * 2);
            CTX.fillStyle = '#f00';
            CTX.fill();
            CTX.restore();
        }

        // 4. Rotating Geometry (The "Architect" residue)
        CTX.save();
        CTX.rotate(this.innerRotation);
        CTX.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        CTX.lineWidth = 2;
        CTX.strokeRect(-this.radius * 1.2, -this.radius * 1.2, this.radius * 2.4, this.radius * 2.4);
        CTX.restore();

        // 5. HP Text overlay for Phase 3
        if (this.omegaPhase === 3) {
            CTX.fillStyle = '#fff';
            CTX.font = 'bold 20px Arial';
            CTX.textAlign = 'center';
            CTX.fillText((this.hp / 1000).toFixed(1) + 'k', 0, -this.radius - 20);
        }

        CTX.restore();
    }
}

const boss3 = new BossOmega();
window.boss3 = boss3; // FIX: Expose to window for CollisionManager
