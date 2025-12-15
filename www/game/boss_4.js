// game/boss_4.js - THE SWARM - Hive Mind Boss (Level 20)

const BOSS_4_DATA = {
    name: 'THE SWARM',
    hp: 50000,
    score: 8000,
    colors: {
        hive: '#00ff88',
        swarm: '#ff4400',
        drone: '#44ffaa'
    }
};

// Drone Pool for Swarm
class SwarmDrone {
    constructor() {
        this.reset();
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.angle = 0;
        this.orbitRadius = 100;
        this.orbitSpeed = 0.02;
        this.hp = 3;
        this.maxHp = 3;
        this.radius = 15;
        this.isShield = false;
        this.active = true;
        this.pulseTimer = 0;
        this.type = 'orbit'; // orbit, attack, shield
        this.vx = 0;
        this.vy = 0;
    }
}

const dronePool = new ObjectPool(
    () => new SwarmDrone(),
    (drone) => drone.reset(),
    50
);

class BossSwarm extends BossBase {
    constructor() {
        super();
        this.name = BOSS_4_DATA.name;
        this.maxHp = BOSS_4_DATA.hp;
        this.score = BOSS_4_DATA.score;
        this.radius = 70;

        // Visuals
        this.coreAngle = 0;
        this.pulseTimer = 0;
        this.glowIntensity = 0;

        // Combat
        this.state = 'IDLE';
        this.introTimer = 0;
        this.swarmFormation = 'ORBIT';
        this.reformTimer = 0;
        this.isSplit = false;
        this.splitCores = [];

        // Cooldowns
        this.cooldowns = {
            spawnDrone: 0,
            laserGrid: 0,
            swarmCloud: 0,
            reform: 0
        };

        // Death Config
        this.deathExplosionDuration = 2500;
        this.deathHitstopDuration = 120;
    }

    spawn(x, y) {
        super.spawn(x, y);
        this.y = -200;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.isSplit = false;
        this.splitCores = [];
        this.swarmFormation = 'ORBIT';

        dronePool.releaseAll();

        // Spawn initial shield drones
        for (let i = 0; i < 8; i++) {
            const drone = dronePool.get();
            drone.angle = (i / 8) * Math.PI * 2;
            drone.orbitRadius = 120;
            drone.orbitSpeed = 0.015;
            drone.isShield = true;
            drone.type = 'orbit';
            drone.hp = 5;
            drone.maxHp = 5;
        }

        document.getElementById('boss-name').innerText = "⚠️ HIVE SIGNAL DETECTED ⚠️";
        document.getElementById('boss-name').style.color = '#00ff88';

        console.log("🐝 THE SWARM HAS AWAKENED 🐝");
    }

    onUpdate(player, dt) {
        this.coreAngle += 0.02 * dt;
        this.pulseTimer += dt;
        this.glowIntensity = 0.5 + Math.sin(this.pulseTimer * 0.1) * 0.3;

        // --- INTRO ---
        if (this.state === 'INTRO') {
            this.handleIntro(player, dt);
            this.updateDrones(player, dt);
            return;
        }

        // --- PHASE CHECK ---
        if (this.hp < this.maxHp * 0.5 && this.phase === 1) {
            this.enterPhase2();
        }

        // --- MOVEMENT ---
        if (!this.isSplit) {
            const targetX = CANVAS.width / 2 + Math.cos(this.pulseTimer * 0.005) * 200;
            const targetY = 180 + Math.sin(this.pulseTimer * 0.008) * 80;
            this.x += (targetX - this.x) * 0.02 * dt;
            this.y += (targetY - this.y) * 0.02 * dt;
        }

        // --- ATTACKS ---
        this.attackTimer += dt;
        this.updateCooldowns(dt);

        if (this.state === 'IDLE' && this.attackTimer > 80) {
            this.chooseAttack();
        }

        // Shield Drone Logic - Blocks damage when active
        const shieldDrones = dronePool.getActive().filter(d => d.isShield && d.type === 'orbit');
        this.shieldActive = shieldDrones.length > 0;

        this.updateDrones(player, dt);
        this.updateSplitCores(player, dt);
    }

    handleIntro(player, dt) {
        this.introTimer += dt;

        if (this.introTimer < 200) {
            this.y += (180 - this.y) * 0.015 * dt;

            // Drones spiral in
            dronePool.getActive().forEach((drone, i) => {
                drone.orbitRadius = Math.max(100, 400 - this.introTimer * 1.5);
            });

            if (this.introTimer % 15 < 1) {
                spawnParticles(
                    this.x + (Math.random() - 0.5) * 200,
                    this.y + (Math.random() - 0.5) * 200,
                    3, 4, '#00ff88'
                );
            }
        } else if (this.introTimer < 280) {
            // Pulsing
            if (this.introTimer % 30 < 15) {
                document.getElementById('boss-name').innerText = "THE SWARM";
            } else {
                document.getElementById('boss-name').innerText = "⚡ ONLINE ⚡";
            }
        } else {
            this.state = 'IDLE';
            document.getElementById('boss-name').innerText = BOSS_4_DATA.name;
            createExplosion(this.x, this.y, 100, 0);
            if (window.playSound) playSound('levelup');
        }
    }

    updateCooldowns(dt) {
        Object.keys(this.cooldowns).forEach(key => {
            this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
        });
    }

    chooseAttack() {
        this.state = 'ATTACKING';
        this.attackTimer = 0;

        const attacks = this.phase === 1
            ? ['SPAWN_DRONES', 'LASER_GRID', 'SWARM_CLOUD']
            : ['SPLIT_ATTACK', 'DRONE_RUSH', 'CHAOS_SWARM'];

        const attack = attacks[Math.floor(Math.random() * attacks.length)];
        this.executeAttack(attack);
    }

    executeAttack(attack) {
        console.log(`SWARM ATTACK: ${attack}`);

        switch (attack) {
            case 'SPAWN_DRONES':
                this.attackSpawnDrones();
                break;
            case 'LASER_GRID':
                this.attackLaserGrid();
                break;
            case 'SWARM_CLOUD':
                this.attackSwarmCloud();
                break;
            case 'SPLIT_ATTACK':
                this.attackSplit();
                break;
            case 'DRONE_RUSH':
                this.attackDroneRush();
                break;
            case 'CHAOS_SWARM':
                this.attackChaosSwarm();
                break;
        }

        setTimeout(() => {
            this.state = 'IDLE';
        }, 2000);
    }

    // --- PHASE 1 ATTACKS ---

    attackSpawnDrones() {
        const count = 5 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const drone = dronePool.get();
                drone.angle = (i / count) * Math.PI * 2;
                drone.orbitRadius = 150;
                drone.orbitSpeed = 0.025;
                drone.type = 'orbit';
                drone.hp = 2;
                drone.maxHp = 2;
                drone.isShield = false;
                spawnParticles(this.x, this.y, 5, 3, '#44ffaa');
                if (window.playSound) playSound('shoot');
            }, i * 100);
        }
    }

    attackLaserGrid() {
        // Spawn wave of enemies instead of laser (player can't dodge)
        const count = 8;
        for (let i = 0; i < count; i++) {
            const drone = dronePool.get();
            drone.angle = (i / count) * Math.PI * 2;
            drone.orbitRadius = 200;
            drone.orbitSpeed = 0.03;
            drone.type = 'orbit';
            drone.hp = 2;
            drone.maxHp = 2;
            drone.isShield = false;
        }
        createExplosion(this.x, this.y, 50, 0);
        if (window.playSound) playSound('shoot');
    }

    attackSwarmCloud() {
        // Release swarm enemies that player must shoot
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const enemy = enemyPool.get(
                this.x + Math.cos(angle) * 50,
                this.y + Math.sin(angle) * 50,
                ENEMY_TYPES.BASIC, 1
            );
            enemy.radius = 8;
            enemy.hp = 1;
            enemy.maxHp = 1;
            enemy.color = '#44ffaa';
            enemy.isDead = false;
        }
        if (window.playSound) playSound('shoot');
    }

    // --- PHASE 2 ATTACKS ---

    enterPhase2() {
        this.phase = 2;
        this.state = 'IDLE';
        this.attackTimer = 0;

        createExplosion(this.x, this.y, 500, 0);
        document.getElementById('boss-name').style.color = '#ff4400';
        document.getElementById('boss-name').innerText = 'THE SWARM - FURY';

        if (window.playSound) playSound('powerup');
        if (window.triggerHitstop) triggerHitstop(30);

        // Make all drones aggressive
        dronePool.getActive().forEach(drone => {
            drone.orbitSpeed *= 2;
        });
    }

    attackSplit() {
        if (this.isSplit) return;

        this.isSplit = true;
        this.splitCores = [];

        // Create 5 split cores
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            this.splitCores.push({
                x: this.x + Math.cos(angle) * 200,
                y: this.y + Math.sin(angle) * 200,
                targetX: CANVAS.width / 2 + Math.cos(angle) * 250,
                targetY: CANVAS.height / 2 + Math.sin(angle) * 200,
                angle: angle,
                radius: 30,
                hp: this.hp / 5,
                fireTimer: 0,
                forming: true // No collision while forming
            });
        }

        // Hide main body during split
        this.reformTimer = 500;
    }

    attackDroneRush() {
        const drones = dronePool.getActive();
        drones.forEach(drone => {
            drone.type = 'attack';
            if (typeof player !== 'undefined') {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                drone.vx = Math.cos(angle) * 8;
                drone.vy = Math.sin(angle) * 8;
            }
        });
    }

    attackChaosSwarm() {
        // Spawn enemies in chaotic pattern
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const dist = 100 + Math.random() * 100;
                const enemy = enemyPool.get(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    ENEMY_TYPES.SPEEDSTER, 1.5
                );
                enemy.color = '#ff4400';
            }, i * 50);
        }
    }

    // --- UPDATERS ---

    updateDrones(player, dt) {
        dronePool.update((drone) => {
            if (drone.type === 'orbit') {
                // Orbital movement
                drone.angle += drone.orbitSpeed * dt;
                drone.x = this.x + Math.cos(drone.angle) * drone.orbitRadius;
                drone.y = this.y + Math.sin(drone.angle) * drone.orbitRadius;
            } else if (drone.type === 'attack') {
                // Rush at player
                drone.x += drone.vx * dt;
                drone.y += drone.vy * dt;

                // Return after going too far
                if (Math.hypot(drone.x - this.x, drone.y - this.y) > 500) {
                    drone.type = 'orbit';
                    drone.vx = 0;
                    drone.vy = 0;
                }
            } else if (drone.type === 'laser') {
                // Laser mode - draw laser to boss
                drone.laserTimer -= dt;
                drone.angle += drone.orbitSpeed * dt;
                drone.x = this.x + Math.cos(drone.angle) * drone.orbitRadius;
                drone.y = this.y + Math.sin(drone.angle) * drone.orbitRadius;

                if (drone.laserTimer <= 0) {
                    drone.type = 'orbit';
                }
            }

            drone.pulseTimer += dt;

            // Player collision
            if (gameState.gameActive) {
                const dist = Math.hypot(player.x - drone.x, player.y - drone.y);
                if (dist < drone.radius + player.radius) {
                    if (gameState.playerStats.shield > 0) {
                        gameState.playerStats.shield--;
                        updateShieldIndicator(gameState.playerStats.shield);
                        drone.hp = 0; // Destroy drone on hit
                    } else if (!gameState.godMode) {
                        startDeathSequence();
                    }
                }
            }

            return drone.hp <= 0;
        });
    }

    updateSplitCores(player, dt) {
        if (!this.isSplit) return;

        this.reformTimer -= dt;

        this.splitCores.forEach((core, index) => {
            // Move to target
            core.x += (core.targetX - core.x) * 0.03 * dt;
            core.y += (core.targetY - core.y) * 0.03 * dt;
            core.angle += 0.05 * dt;

            // Check if core has reached its target position (disable forming state)
            if (core.forming) {
                const distToTarget = Math.hypot(core.x - core.targetX, core.y - core.targetY);
                if (distToTarget < 30) {
                    core.forming = false;
                }
            }

            // Fire at player
            core.fireTimer += dt;
            if (core.fireTimer > 60) {
                core.fireTimer = 0;
                const angle = Math.atan2(player.y - core.y, player.x - core.x);
                const bullet = enemyPool.get(core.x, core.y, ENEMY_TYPES.BASIC, 1);
                bullet.radius = 10;
                bullet.hp = 1;
                bullet.color = '#ff4400';
                bullet.vx = Math.cos(angle) * 5;
                bullet.vy = Math.sin(angle) * 5;
                bullet.update = function (p, d) {
                    this.x += this.vx * d;
                    this.y += this.vy * d;
                    this.draw();
                };
            }

            // Player collision - only when not forming
            if (!core.forming) {
                const dist = Math.hypot(player.x - core.x, player.y - core.y);
                if (dist < core.radius + player.radius) {
                    if (gameState.playerStats.shield > 0) {
                        gameState.playerStats.shield--;
                        updateShieldIndicator(gameState.playerStats.shield);
                    } else if (!gameState.godMode) {
                        startDeathSequence();
                    }
                }
            }
        });

        // Reform after timer
        if (this.reformTimer <= 0) {
            this.isSplit = false;
            this.splitCores = [];
            createExplosion(this.x, this.y, 200, 0);
        }
    }

    takeDamage(amount) {
        if (this.state === 'INTRO') return;

        // Shield drones block damage
        const shieldDrones = dronePool.getActive().filter(d => d.isShield);
        if (shieldDrones.length > 0 && Math.random() < 0.7) {
            // Damage shield drone instead
            const drone = shieldDrones[0];
            drone.hp -= amount;
            spawnParticles(drone.x, drone.y, 3, 2, '#00ff88');
            if (drone.hp <= 0) {
                createExplosion(drone.x, drone.y, 30, 0);
            }
            return;
        }

        super.takeDamage(amount);
    }

    die() {
        super.die();
        dronePool.releaseAll();
        this.isSplit = false;
        this.splitCores = [];

        // Epic death - spawn explosion ring
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            setTimeout(() => {
                createExplosion(
                    this.x + Math.cos(angle) * 150,
                    this.y + Math.sin(angle) * 150,
                    100, 0
                );
            }, i * 50);
        }
    }

    onDraw() {
        // Draw lasers between drones
        const drones = dronePool.getActive();
        if (drones.some(d => d.type === 'laser')) {
            CTX.strokeStyle = `rgba(0, 255, 136, ${0.3 + Math.sin(this.pulseTimer * 0.2) * 0.2})`;
            CTX.lineWidth = 3;

            for (let i = 0; i < drones.length; i++) {
                const d1 = drones[i];
                const d2 = drones[(i + 1) % drones.length];
                if (d1.type === 'laser' && d2.type === 'laser') {
                    CTX.beginPath();
                    CTX.moveTo(d1.x, d1.y);
                    CTX.lineTo(d2.x, d2.y);
                    CTX.stroke();

                    // Damage player if crossing laser
                    if (typeof player !== 'undefined' && gameState.gameActive) {
                        const dist = this.pointToLineDistance(player.x, player.y, d1.x, d1.y, d2.x, d2.y);
                        if (dist < player.radius + 5) {
                            if (gameState.playerStats.shield > 0) {
                                gameState.playerStats.shield--;
                                updateShieldIndicator(gameState.playerStats.shield);
                            } else if (!gameState.godMode) {
                                startDeathSequence();
                            }
                        }
                    }
                }
            }
        }

        // Draw drones
        drones.forEach(drone => {
            CTX.save();
            CTX.translate(drone.x, drone.y);

            // Glow
            const glow = drone.isShield ? 20 : 10;
            CTX.shadowBlur = glow;
            CTX.shadowColor = drone.isShield ? '#00ffff' : '#44ffaa';

            // Body
            CTX.fillStyle = drone.isShield ? '#00ffff' : BOSS_4_DATA.colors.drone;
            CTX.beginPath();

            // Hexagon shape for drones
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2 + drone.pulseTimer * 0.1;
                const x = Math.cos(angle) * drone.radius;
                const y = Math.sin(angle) * drone.radius;
                if (i === 0) CTX.moveTo(x, y);
                else CTX.lineTo(x, y);
            }
            CTX.closePath();
            CTX.fill();

            // HP indicator
            if (drone.hp < drone.maxHp) {
                const hpPercent = drone.hp / drone.maxHp;
                CTX.fillStyle = hpPercent > 0.5 ? '#00ff00' : '#ff0000';
                CTX.fillRect(-10, -drone.radius - 8, 20 * hpPercent, 4);
            }

            CTX.restore();
        });

        // Draw split cores
        this.splitCores.forEach(core => {
            CTX.save();
            CTX.translate(core.x, core.y);
            CTX.rotate(core.angle);

            CTX.shadowBlur = 15;
            CTX.shadowColor = '#ff4400';
            CTX.fillStyle = '#ff4400';
            CTX.fillRect(-core.radius / 2, -core.radius / 2, core.radius, core.radius);

            CTX.restore();
        });

        // Draw main core (only if not split)
        if (!this.isSplit) {
            CTX.save();
            CTX.translate(this.x, this.y);
            CTX.rotate(this.coreAngle);

            // Outer aura
            CTX.beginPath();
            CTX.arc(0, 0, this.radius + 20 + Math.sin(this.pulseTimer * 0.1) * 10, 0, Math.PI * 2);
            CTX.strokeStyle = this.phase === 2
                ? `rgba(255, 68, 0, ${this.glowIntensity})`
                : `rgba(0, 255, 136, ${this.glowIntensity})`;
            CTX.lineWidth = 4;
            CTX.stroke();

            // Core body - honeycomb pattern
            CTX.shadowBlur = 25;
            CTX.shadowColor = this.phase === 2 ? '#ff4400' : '#00ff88';

            CTX.fillStyle = this.phase === 2 ? '#ff4400' : '#00ff88';
            CTX.beginPath();
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const x = Math.cos(angle) * this.radius;
                const y = Math.sin(angle) * this.radius;
                if (i === 0) CTX.moveTo(x, y);
                else CTX.lineTo(x, y);
            }
            CTX.closePath();
            CTX.fill();

            // Inner eye
            CTX.fillStyle = '#000';
            CTX.beginPath();
            CTX.arc(0, 0, 20, 0, Math.PI * 2);
            CTX.fill();

            CTX.fillStyle = '#fff';
            CTX.beginPath();
            CTX.arc(5, -5, 8, 0, Math.PI * 2);
            CTX.fill();

            CTX.restore();
        }
    }

    pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;

        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) { xx = x1; yy = y1; }
        else if (param > 1) { xx = x2; yy = y2; }
        else { xx = x1 + param * C; yy = y1 + param * D; }

        return Math.hypot(px - xx, py - yy);
    }
}

const boss4 = new BossSwarm();
window.boss4 = boss4;
