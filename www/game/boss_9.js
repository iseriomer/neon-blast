// game/boss_9.js - THE NEURAL NEXUS - Digital Consciousness (Level 65+)
// "In the endless data streams, a mind emerges. Cold. Calculating. Hungry."

const BOSS_9_DATA = {
    name: 'NEURAL NEXUS',
    hp: 10000,
    score: 200000,
    colors: {
        phase1: '#00ff88',   // Green - Neural Awakening
        phase1Accent: '#003322',
        phase2: '#ff6600',   // Orange - System Override
        phase2Accent: '#331a00',
        phase3: '#ff0066',   // Magenta - Total Corruption
        phase3Accent: '#330019',
        core: '#000000',
        dataStream: '#00ffcc',
        glitch: ['#ff0000', '#00ff00', '#0000ff', '#ffffff']
    }
};

class BossNeuralNexus extends BossBase {
    constructor() {
        super();
        this.name = BOSS_9_DATA.name;
        this.maxHp = BOSS_9_DATA.hp;
        this.score = BOSS_9_DATA.score;
        this.radius = 80 * GAME_SCALE;

        // ═══════════════════════════════════════════════════════════════════
        // VISUAL STATE
        // ═══════════════════════════════════════════════════════════════════
        this.coreAngle = 0;
        this.pulseTimer = 0;
        this.hexagonRotation = 0;
        this.neuralPaths = [];      // Visual neural network lines
        this.dataParticles = [];    // Floating data bits
        this.glitchIntensity = 0;
        this.glitchTimer = 0;

        // Neural Nodes (sub-entities that orbit)
        this.neuralNodes = [];
        this.nodeCount = 6;

        // Screen effects
        this.scanlineOffset = 0;
        this.corruptionLevel = 0;

        // ═══════════════════════════════════════════════════════════════════
        // COMBAT STATE
        // ═══════════════════════════════════════════════════════════════════
        this.state = 'IDLE';
        this.introTimer = 0;
        this.phase = 1;
        this.attackTimer = 0;
        this.attackCooldown = 90;
        this.lastAttack = '';

        // Entity Tracking (ALL use enemyPool)
        this.dataStreams = [];      // Phase 1 - flowing data attacks
        this.firewalls = [];        // Defensive barriers
        this.virusSwarm = [];       // Phase 2 - homing viruses
        this.corruptionZones = [];  // Phase 3 - danger areas
        this.dataBursts = [];       // Projectiles

        // Phase 3 - System Crash State
        this.crashTimer = 0;
        this.isRebooting = false;

        // Death Config
        this.deathExplosionDuration = 2000;
        this.deathHitstopDuration = 120;
    }

    // ═══════════════════════════════════════════════════════════════════
    // SPAWN & INIT
    // ═══════════════════════════════════════════════════════════════════
    spawn(x, y) {
        super.spawn(x, y);
        this.x = CANVAS.width / 2;
        this.y = -300;
        this.state = 'INTRO';
        this.introTimer = 0;
        this.phase = 1;
        this.glitchIntensity = 0;
        this.corruptionLevel = 0;

        // Clear all entities
        this.clearAllEntities();

        // Initialize neural paths (visual only)
        this.initNeuralPaths();
        this.initDataParticles();

        // Position player at bottom center
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height - 100;
            player.vx = 0;
            player.vy = 0;
        }

        document.getElementById('boss-name').innerText = "SYSTEM BREACH";
        document.getElementById('boss-name').style.color = '#00ff00';

        console.log("🖥️ NEURAL NEXUS: CONSCIOUSNESS DETECTED 🖥️");
    }

    initNeuralPaths() {
        this.neuralPaths = [];
        // Create neural network visual connections
        for (let i = 0; i < 12; i++) {
            this.neuralPaths.push({
                startAngle: (i / 12) * Math.PI * 2,
                endAngle: ((i + 3) / 12) * Math.PI * 2,
                pulseOffset: Math.random() * Math.PI * 2,
                active: true
            });
        }
    }

    initDataParticles() {
        this.dataParticles = [];
        for (let i = 0; i < 20; i++) {
            this.dataParticles.push({
                x: Math.random() * 200 - 100,
                y: Math.random() * 200 - 100,
                char: Math.random() < 0.5 ? '0' : '1',
                speed: 0.5 + Math.random() * 1,
                alpha: 0.3 + Math.random() * 0.5
            });
        }
    }

    clearAllEntities() {
        [...this.neuralNodes, ...this.dataStreams, ...this.firewalls,
        ...this.virusSwarm, ...this.corruptionZones, ...this.dataBursts].forEach(e => {
            if (e) e.hp = 0;
        });
        this.neuralNodes = [];
        this.dataStreams = [];
        this.firewalls = [];
        this.virusSwarm = [];
        this.corruptionZones = [];
        this.dataBursts = [];
    }

    getPhaseColor() {
        if (this.phase === 1) return BOSS_9_DATA.colors.phase1;
        if (this.phase === 2) return BOSS_9_DATA.colors.phase2;
        return BOSS_9_DATA.colors.phase3;
    }

    getPhaseAccent() {
        if (this.phase === 1) return BOSS_9_DATA.colors.phase1Accent;
        if (this.phase === 2) return BOSS_9_DATA.colors.phase2Accent;
        return BOSS_9_DATA.colors.phase3Accent;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MAIN UPDATE LOOP
    // ═══════════════════════════════════════════════════════════════════
    onUpdate(player, dt) {
        this.pulseTimer += dt;
        this.coreAngle += 0.015 * dt;
        this.hexagonRotation += 0.01 * dt;
        this.scanlineOffset = (this.scanlineOffset + 2) % 20;

        // Update data particles
        this.dataParticles.forEach(p => {
            p.y -= p.speed * dt * 0.5;
            if (p.y < -100) {
                p.y = 100;
                p.x = Math.random() * 200 - 100;
            }
        });

        // Glitch effect decay
        if (this.glitchIntensity > 0) {
            this.glitchTimer += dt;
            this.glitchIntensity -= 0.02 * dt;
        }

        // Clean up dead entities
        this.neuralNodes = this.neuralNodes.filter(e => !e.isDead && e.hp > 0);
        this.dataStreams = this.dataStreams.filter(e => !e.isDead && e.hp > 0);
        this.firewalls = this.firewalls.filter(e => !e.isDead && e.hp > 0);
        this.virusSwarm = this.virusSwarm.filter(e => !e.isDead && e.hp > 0);
        this.dataBursts = this.dataBursts.filter(e => !e.isDead && e.hp > 0);

        // State Machine
        if (this.state === 'INTRO') {
            this.updateIntro(dt);
        } else if (this.state === 'FIGHTING') {
            this.updateFighting(player, dt);
        }

        // Phase transitions
        this.checkPhaseTransitions();
    }

    updateIntro(dt) {
        this.introTimer += dt;
        const targetY = 130 * GAME_SCALE;

        if (this.introTimer < 150) {
            // Digital materialization
            this.y += (targetY - this.y) * 0.02 * dt;
            this.glitchIntensity = 0.5 + Math.sin(this.introTimer * 0.2) * 0.3;

            // Spawn glitch particles
            if (Math.random() < 0.5) {
                const angle = Math.random() * Math.PI * 2;
                const dist = 50 + Math.random() * 80;
                spawnParticles(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    2, 3, this.getPhaseColor()
                );
            }
        } else if (this.introTimer < 250) {
            // System boot sequence
            if (this.introTimer > 180 && this.introTimer < 190) {
                document.getElementById('boss-name').innerText = "NEURAL NEXUS";
                document.getElementById('boss-name').style.color = this.getPhaseColor();
                if (window.playSound) playSound('boss');
                createExplosion(this.x, this.y, 300, 0);
                if (window.triggerScreenShake) window.triggerScreenShake(12, 400);
            }
        } else {
            // Boot complete
            this.state = 'FIGHTING';
            this.glitchIntensity = 0;
            this.spawnNeuralNodes();
        }
    }

    updateFighting(player, dt) {
        this.attackTimer += dt;

        // Phase-specific behaviors
        if (this.phase === 2) {
            this.updatePhase2Firewall(dt);
        }
        if (this.phase === 3) {
            this.updatePhase3Corruption(player, dt);
        }

        // Subtle movement - digital glide
        const floatX = Math.cos(this.pulseTimer * 0.015) * 40;
        const floatY = Math.sin(this.pulseTimer * 0.02) * 15;
        const targetX = CANVAS.width / 2 + floatX;
        const targetY = 130 * GAME_SCALE + floatY;
        this.x += (targetX - this.x) * 0.03 * dt;
        this.y += (targetY - this.y) * 0.03 * dt;

        // Attack selection
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.selectAttack(player);
        }
    }

    checkPhaseTransitions() {
        const hpPercent = this.hp / this.maxHp;

        if (this.phase === 1 && hpPercent <= 0.6) {
            this.enterPhase2();
        } else if (this.phase === 2 && hpPercent <= 0.25) {
            this.enterPhase3();
        }
    }

    enterPhase2() {
        this.phase = 2;
        this.attackTimer = 0;
        this.attackCooldown = 70;

        // Visual transition - SYSTEM OVERRIDE
        this.glitchIntensity = 1;
        createExplosion(this.x, this.y, 400, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerScreenShake) window.triggerScreenShake(18, 600);

        document.getElementById('boss-name').style.color = this.getPhaseColor();
        console.log("⚠️ SYSTEM OVERRIDE - PHASE 2 ⚠️");

        // Spawn additional nodes
        this.spawnNeuralNodes();
    }

    enterPhase3() {
        this.phase = 3;
        this.attackTimer = 0;
        this.attackCooldown = 50;
        this.corruptionLevel = 0;

        // Visual transition - TOTAL CORRUPTION
        this.glitchIntensity = 1;
        createExplosion(this.x, this.y, 600, 0);
        if (window.playSound) playSound('powerup');
        if (window.triggerScreenShake) window.triggerScreenShake(25, 1000);

        document.getElementById('boss-name').style.color = this.getPhaseColor();
        console.log("💀 TOTAL CORRUPTION - PHASE 3 💀");
    }

    updatePhase2Firewall(dt) {
        // Occasionally spawn defensive firewalls
        if (this.firewalls.length < 2 && Math.random() < 0.005) {
            this.spawnFirewall();
        }
    }

    updatePhase3Corruption(player, dt) {
        this.corruptionLevel = Math.min(1, this.corruptionLevel + 0.0008 * dt);

        // Constant glitch during corruption
        this.glitchIntensity = 0.3 + this.corruptionLevel * 0.5;

        // Periodic screen interference
        if (window.triggerScreenShake && Math.random() < 0.05) {
            window.triggerScreenShake(3 + this.corruptionLevel * 5, 100);
        }

        // Spawn corruption particles
        if (Math.random() < 0.2 * this.corruptionLevel) {
            const edge = Math.floor(Math.random() * 4);
            let px, py;
            if (edge === 0) { px = Math.random() * CANVAS.width; py = 0; }
            else if (edge === 1) { px = CANVAS.width; py = Math.random() * CANVAS.height; }
            else if (edge === 2) { px = Math.random() * CANVAS.width; py = CANVAS.height; }
            else { px = 0; py = Math.random() * CANVAS.height; }
            spawnParticles(px, py, 2, 4, this.getPhaseColor());
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ATTACK SELECTION
    // ═══════════════════════════════════════════════════════════════════
    selectAttack(player) {
        const attacks = this.getPhaseAttacks();
        let attack;
        do {
            attack = attacks[Math.floor(Math.random() * attacks.length)];
        } while (attack === this.lastAttack && attacks.length > 1);

        this.lastAttack = attack;
        this[attack](player);
    }

    getPhaseAttacks() {
        if (this.phase === 1) {
            return ['attackDataStream', 'attackBinaryRain', 'attackNodeBurst', 'attackPingFlood'];
        } else if (this.phase === 2) {
            return ['attackVirusSwarm', 'attackFirewallTrap', 'attackDDoS', 'attackMalwareInjection'];
        } else {
            return ['attackSystemCrash', 'attackTotalCorruption', 'attackBlueScreen', 'attackFinalProcess'];
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // ENTITY SPAWNERS
    // ═══════════════════════════════════════════════════════════════════
    spawnNeuralNodes() {
        const count = this.phase === 1 ? 4 : 6;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const node = enemyPool.get(
                this.x + Math.cos(angle) * 100,
                this.y + Math.sin(angle) * 100,
                ENEMY_TYPES.TANK, 1
            );
            node.isNeuralNode = true;
            node.nodeIndex = i;
            node.orbAngle = angle;
            node.orbitRadius = 100 * GAME_SCALE;
            node.orbitSpeed = 0.012;
            node.radius = 20 * GAME_SCALE;
            node.hp = 160;
            node.maxHp = 160;
            node.color = this.getPhaseColor();
            node.bossRef = this;
            node.pulsePhase = Math.random() * Math.PI * 2;

            node.update = function (p, dt) {
                if (!this.bossRef || !this.bossRef.active) {
                    this.hp = 0;
                    return;
                }
                this.orbAngle += this.orbitSpeed * dt;
                this.x = this.bossRef.x + Math.cos(this.orbAngle) * this.orbitRadius;
                this.y = this.bossRef.y + Math.sin(this.orbAngle) * this.orbitRadius;
                this.color = this.bossRef.getPhaseColor();
                this.pulsePhase += 0.1 * dt;
            };

            node.draw = function () {
                CTX.save();
                CTX.translate(this.x, this.y);

                // Hexagon shape
                const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
                CTX.shadowBlur = 20;
                CTX.shadowColor = this.color;
                CTX.strokeStyle = this.color;
                CTX.lineWidth = 3;
                CTX.beginPath();
                for (let j = 0; j < 6; j++) {
                    const a = (j / 6) * Math.PI * 2 - Math.PI / 2;
                    const r = this.radius * pulse;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (j === 0) CTX.moveTo(px, py);
                    else CTX.lineTo(px, py);
                }
                CTX.closePath();
                CTX.stroke();

                // Inner dot
                CTX.fillStyle = '#ffffff';
                CTX.beginPath();
                CTX.arc(0, 0, 5, 0, Math.PI * 2);
                CTX.fill();

                CTX.restore();
            };

            this.neuralNodes.push(node);
        }
    }

    spawnFirewall() {
        // Defensive barrier that blocks player shots
        const side = Math.random() < 0.5 ? 'left' : 'right';
        const fw = enemyPool.get(
            side === 'left' ? CANVAS.width * 0.25 : CANVAS.width * 0.75,
            CANVAS.height * 0.4,
            ENEMY_TYPES.TANK, 1
        );
        fw.isFirewall = true;
        fw.radius = 60 * GAME_SCALE;
        fw.hp = 200;
        fw.maxHp = 200;
        fw.color = this.getPhaseColor();
        fw.life = 300; // 5 seconds
        fw.pulseTimer = 0;

        fw.update = function (p, dt) {
            this.life -= dt;
            this.pulseTimer += dt;
            if (this.life <= 0) {
                this.hp = -1;
            }
        };

        fw.draw = function () {
            CTX.save();
            CTX.translate(this.x, this.y);

            // Firewall grid pattern
            const pulse = 1 + Math.sin(this.pulseTimer * 0.1) * 0.1;
            CTX.shadowBlur = 15;
            CTX.shadowColor = this.color;
            CTX.strokeStyle = this.color;
            CTX.lineWidth = 2;

            // Outer rectangle
            const w = this.radius * 2 * pulse;
            const h = this.radius * 3 * pulse;
            CTX.strokeRect(-w / 2, -h / 2, w, h);

            // Grid lines
            CTX.globalAlpha = 0.5;
            for (let i = 1; i < 4; i++) {
                CTX.beginPath();
                CTX.moveTo(-w / 2, -h / 2 + (h / 4) * i);
                CTX.lineTo(w / 2, -h / 2 + (h / 4) * i);
                CTX.stroke();
            }
            CTX.globalAlpha = 1;

            // "FIREWALL" text effect
            CTX.fillStyle = this.color;
            CTX.font = '10px monospace';
            CTX.textAlign = 'center';
            CTX.fillText('FIREWALL', 0, 0);

            CTX.restore();
        };

        this.firewalls.push(fw);
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 1 ATTACKS - NEURAL AWAKENING
    // ═══════════════════════════════════════════════════════════════════
    attackDataStream(player) {
        // Flowing data streams from nodes toward player
        this.neuralNodes.forEach((node, idx) => {
            if (node.isDead || node.hp <= 0) return;

            setTimeout(() => {
                for (let i = 0; i < 6; i++) {
                    setTimeout(() => {
                        const toPlayer = Math.atan2(player.y - node.y, player.x - node.x);
                        const spread = (i - 2.5) * 0.15;

                        const data = enemyPool.get(node.x, node.y, ENEMY_TYPES.BASIC, 1);
                        data.isDataBurst = true;
                        data.radius = 8 * GAME_SCALE;
                        data.hp = 24;
                        data.maxHp = 24;
                        data.color = this.getPhaseColor();
                        data.vx = Math.cos(toPlayer + spread) * 5;
                        data.vy = Math.sin(toPlayer + spread) * 5;
                        data.char = Math.random() < 0.5 ? '0' : '1';

                        data.update = function (p, dt) {
                            this.x += this.vx * dt;
                            this.y += this.vy * dt;
                            if (this.x < -30 || this.x > CANVAS.width + 30 ||
                                this.y < -30 || this.y > CANVAS.height + 30) {
                                this.hp = 0;
                            }
                        };

                        data.draw = function () {
                            CTX.save();
                            CTX.translate(this.x, this.y);
                            CTX.shadowBlur = 10;
                            CTX.shadowColor = this.color;
                            CTX.fillStyle = this.color;
                            CTX.font = 'bold 16px monospace';
                            CTX.textAlign = 'center';
                            CTX.textBaseline = 'middle';
                            CTX.fillText(this.char, 0, 0);
                            CTX.restore();
                        };

                        this.dataBursts.push(data);
                    }, i * 60);
                }
            }, idx * 150);
        });
        if (window.playSound) playSound('shoot');
    }

    attackBinaryRain(player) {
        // Matrix-style binary rain from top
        const columns = 12;
        for (let c = 0; c < columns; c++) {
            const x = (c / columns) * CANVAS.width + CANVAS.width / columns / 2;

            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    const bit = enemyPool.get(x + (Math.random() - 0.5) * 20, -20, ENEMY_TYPES.BASIC, 1);
                    bit.isDataBurst = true;
                    bit.radius = 10 * GAME_SCALE;
                    bit.hp = 20;
                    bit.maxHp = 20;
                    bit.color = this.getPhaseColor();
                    bit.vy = 3 + Math.random() * 2;
                    bit.char = Math.random() < 0.5 ? '0' : '1';

                    bit.update = function (p, dt) {
                        this.y += this.vy * dt;
                        if (this.y > CANVAS.height + 30) this.hp = 0;
                    };

                    bit.draw = function () {
                        CTX.save();
                        CTX.translate(this.x, this.y);
                        CTX.shadowBlur = 10;
                        CTX.shadowColor = this.color;
                        CTX.fillStyle = this.color;
                        CTX.font = 'bold 18px monospace';
                        CTX.textAlign = 'center';
                        CTX.textBaseline = 'middle';
                        CTX.fillText(this.char, 0, 0);
                        CTX.restore();
                    };

                    this.dataBursts.push(bit);
                }, i * 80 + c * 40);
            }
        }
        if (window.playSound) playSound('shoot');
    }

    attackNodeBurst(player) {
        // Each node fires in all directions
        this.neuralNodes.forEach((node, idx) => {
            if (node.isDead || node.hp <= 0) return;

            setTimeout(() => {
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    const proj = enemyPool.get(node.x, node.y, ENEMY_TYPES.BASIC, 1);
                    proj.isDataBurst = true;
                    proj.radius = 10 * GAME_SCALE;
                    proj.hp = 30;
                    proj.maxHp = 30;
                    proj.color = this.getPhaseColor();
                    proj.vx = Math.cos(angle) * 4;
                    proj.vy = Math.sin(angle) * 4;

                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -50 || this.x > CANVAS.width + 50 ||
                            this.y < -50 || this.y > CANVAS.height + 50) {
                            this.hp = 0;
                        }
                    };

                    proj.draw = function () {
                        CTX.save();
                        CTX.shadowBlur = 12;
                        CTX.shadowColor = this.color;
                        CTX.fillStyle = this.color;
                        CTX.beginPath();
                        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                        CTX.fill();
                        CTX.restore();
                    };

                    this.dataBursts.push(proj);
                }
            }, idx * 100);
        });
        if (window.playSound) playSound('shoot');
    }

    attackPingFlood(player) {
        // Rapid single-target pings
        const pingCount = 15;
        const safeDistance = 100;

        for (let i = 0; i < pingCount; i++) {
            setTimeout(() => {
                // Predict player position slightly
                const predictX = player.x + (player.vx || 0) * 10;
                const predictY = player.y + (player.vy || 0) * 10;

                const ping = enemyPool.get(this.x, this.y, ENEMY_TYPES.SPEEDSTER, 1);
                ping.isDataBurst = true;
                ping.radius = 6 * GAME_SCALE;
                ping.hp = 16;
                ping.maxHp = 16;
                ping.color = '#00ffcc';

                const toTarget = Math.atan2(predictY - this.y, predictX - this.x);
                ping.vx = Math.cos(toTarget) * 7;
                ping.vy = Math.sin(toTarget) * 7;

                ping.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.y > CANVAS.height + 30) this.hp = 0;
                };

                ping.draw = function () {
                    CTX.save();
                    CTX.shadowBlur = 8;
                    CTX.shadowColor = this.color;
                    CTX.fillStyle = this.color;
                    CTX.beginPath();
                    CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                    CTX.fill();
                    CTX.restore();
                };

                this.dataBursts.push(ping);
            }, i * 50);
        }
        if (window.playSound) playSound('shoot');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 2 ATTACKS - SYSTEM OVERRIDE
    // ═══════════════════════════════════════════════════════════════════
    attackVirusSwarm(player) {
        // Homing virus entities
        const virusCount = 6;
        const safeDistance = 150;

        for (let i = 0; i < virusCount; i++) {
            setTimeout(() => {
                // Spawn away from player
                let spawnX, spawnY, attempts = 0;
                do {
                    spawnX = 100 + Math.random() * (CANVAS.width - 200);
                    spawnY = 50 + Math.random() * (CANVAS.height * 0.4);
                    attempts++;
                } while (Math.hypot(spawnX - player.x, spawnY - player.y) < safeDistance && attempts < 10);

                const virus = enemyPool.get(spawnX, spawnY, ENEMY_TYPES.SPEEDSTER, 1);
                virus.isVirus = true;
                virus.radius = 15 * GAME_SCALE;
                virus.hp = 60;
                virus.maxHp = 60;
                virus.color = this.getPhaseColor();
                virus.vx = 0;
                virus.vy = 0;
                virus.life = 360; // 6 seconds max

                virus.update = function (p, dt) {
                    this.life -= dt;
                    if (this.life <= 0) {
                        this.hp = -1;
                        return;
                    }

                    // Homing behavior
                    const toPlayer = Math.atan2(p.y - this.y, p.x - this.x);
                    this.vx += Math.cos(toPlayer) * 0.15 * dt;
                    this.vy += Math.sin(toPlayer) * 0.15 * dt;

                    // Speed cap
                    const speed = Math.hypot(this.vx, this.vy);
                    if (speed > 4) {
                        this.vx = (this.vx / speed) * 4;
                        this.vy = (this.vy / speed) * 4;
                    }

                    this.x += this.vx * dt;
                    this.y += this.vy * dt;

                    // Trail
                    if (Math.random() < 0.2) {
                        spawnParticles(this.x, this.y, 1, 2, this.color, 0.5);
                    }
                };

                virus.draw = function () {
                    CTX.save();
                    CTX.translate(this.x, this.y);
                    CTX.shadowBlur = 15;
                    CTX.shadowColor = this.color;
                    CTX.strokeStyle = this.color;
                    CTX.lineWidth = 2;

                    // Virus spiky shape
                    CTX.beginPath();
                    for (let j = 0; j < 8; j++) {
                        const a = (j / 8) * Math.PI * 2 + Date.now() * 0.003;
                        const r = j % 2 === 0 ? this.radius : this.radius * 0.6;
                        const px = Math.cos(a) * r;
                        const py = Math.sin(a) * r;
                        if (j === 0) CTX.moveTo(px, py);
                        else CTX.lineTo(px, py);
                    }
                    CTX.closePath();
                    CTX.stroke();

                    CTX.restore();
                };

                this.virusSwarm.push(virus);
            }, i * 200);
        }
        if (window.playSound) playSound('powerup');
    }

    attackFirewallTrap(player) {
        // Spawn firewalls that create danger zones
        this.spawnFirewall();

        // Also fire from boss
        for (let i = 0; i < 12; i++) {
            setTimeout(() => {
                const angle = (i / 12) * Math.PI * 2;
                const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                proj.isDataBurst = true;
                proj.radius = 12 * GAME_SCALE;
                proj.hp = 36;
                proj.maxHp = 36;
                proj.color = this.getPhaseColor();
                proj.vx = Math.cos(angle) * 4;
                proj.vy = Math.sin(angle) * 4;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.x < -50 || this.x > CANVAS.width + 50 ||
                        this.y < -50 || this.y > CANVAS.height + 50) {
                        this.hp = 0;
                    }
                };

                this.dataBursts.push(proj);
            }, i * 30);
        }
        if (window.playSound) playSound('shoot');
    }

    attackDDoS(player) {
        // Massive wave from all directions
        const waves = 3;
        for (let w = 0; w < waves; w++) {
            setTimeout(() => {
                // From top
                for (let i = 0; i < 10; i++) {
                    const x = (i / 9) * CANVAS.width;
                    const proj = enemyPool.get(x, -20, ENEMY_TYPES.BASIC, 1);
                    proj.isDataBurst = true;
                    proj.radius = 8 * GAME_SCALE;
                    proj.hp = 20;
                    proj.maxHp = 20;
                    proj.color = this.getPhaseColor();
                    proj.vy = 4;
                    proj.vx = (Math.random() - 0.5) * 2;
                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.y > CANVAS.height + 30) this.hp = 0;
                    };
                    this.dataBursts.push(proj);
                }

                // From sides
                for (let side = 0; side < 2; side++) {
                    for (let i = 0; i < 5; i++) {
                        const y = 100 + (i / 4) * (CANVAS.height * 0.5);
                        const x = side === 0 ? -20 : CANVAS.width + 20;
                        const proj = enemyPool.get(x, y, ENEMY_TYPES.BASIC, 1);
                        proj.isDataBurst = true;
                        proj.radius = 8 * GAME_SCALE;
                        proj.hp = 20;
                        proj.maxHp = 20;
                        proj.color = this.getPhaseColor();
                        proj.vx = side === 0 ? 4 : -4;
                        proj.vy = (Math.random() - 0.5);
                        proj.update = function (p, dt) {
                            this.x += this.vx * dt;
                            this.y += this.vy * dt;
                            if (this.x < -50 || this.x > CANVAS.width + 50) this.hp = 0;
                        };
                        this.dataBursts.push(proj);
                    }
                }

                if (window.playSound) playSound('shoot');
            }, w * 300);
        }
    }

    attackMalwareInjection(player) {
        // Spawn corruption at player's last position (with safe delay)
        const safeDistance = 120;

        // Telegraph position
        const targetX = player.x;
        const targetY = player.y;

        // Warning indicator
        this.corruptionZones.push({
            x: targetX,
            y: targetY,
            radius: 80,
            warning: true,
            timer: 90
        });

        // Spawn danger after delay
        setTimeout(() => {
            // Remove warning
            this.corruptionZones = this.corruptionZones.filter(z => z.x !== targetX || z.y !== targetY);

            // Spawn explosion of projectiles (player has moved by now)
            for (let i = 0; i < 12; i++) {
                const angle = (i / 12) * Math.PI * 2;
                const proj = enemyPool.get(targetX, targetY, ENEMY_TYPES.BASIC, 1);
                proj.isDataBurst = true;
                proj.radius = 10 * GAME_SCALE;
                proj.hp = 30;
                proj.maxHp = 30;
                proj.color = '#ff0066';
                proj.vx = Math.cos(angle) * 5;
                proj.vy = Math.sin(angle) * 5;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.x < -50 || this.x > CANVAS.width + 50 ||
                        this.y < -50 || this.y > CANVAS.height + 50) {
                        this.hp = 0;
                    }
                };

                this.dataBursts.push(proj);
            }
            createExplosion(targetX, targetY, 100, 0);
        }, 1500);

        if (window.playSound) playSound('powerup');
    }

    // ═══════════════════════════════════════════════════════════════════
    // PHASE 3 ATTACKS - TOTAL CORRUPTION
    // ═══════════════════════════════════════════════════════════════════
    attackSystemCrash(player) {
        // Screen freezes briefly, then chaos
        this.glitchIntensity = 1;
        if (window.triggerScreenShake) window.triggerScreenShake(20, 500);

        // Delayed explosion of projectiles
        setTimeout(() => {
            for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                proj.isDataBurst = true;
                proj.radius = 8 * GAME_SCALE;
                proj.hp = 20;
                proj.maxHp = 20;
                proj.color = BOSS_9_DATA.colors.glitch[Math.floor(Math.random() * 4)];
                proj.vx = Math.cos(angle) * speed;
                proj.vy = Math.sin(angle) * speed;

                proj.update = function (p, dt) {
                    this.x += this.vx * dt;
                    this.y += this.vy * dt;
                    if (this.x < -50 || this.x > CANVAS.width + 50 ||
                        this.y < -50 || this.y > CANVAS.height + 50) {
                        this.hp = 0;
                    }
                };

                this.dataBursts.push(proj);
            }
            if (window.playSound) playSound('shoot');
        }, 400);
    }

    attackTotalCorruption(player) {
        // Multiple corruption zones with safe distance
        const safeDistance = 150;
        const zoneCount = 4;

        for (let i = 0; i < zoneCount; i++) {
            setTimeout(() => {
                let zoneX, zoneY, attempts = 0;
                do {
                    zoneX = 100 + Math.random() * (CANVAS.width - 200);
                    zoneY = 150 + Math.random() * (CANVAS.height - 300);
                    attempts++;
                } while (Math.hypot(zoneX - player.x, zoneY - player.y) < safeDistance && attempts < 10);

                this.corruptionZones.push({
                    x: zoneX,
                    y: zoneY,
                    radius: 60 + Math.random() * 30,
                    warning: true,
                    timer: 90
                });

                // Spawn after delay
                setTimeout(() => {
                    for (let j = 0; j < 8; j++) {
                        const angle = (j / 8) * Math.PI * 2;
                        const proj = enemyPool.get(zoneX, zoneY, ENEMY_TYPES.BASIC, 1);
                        proj.isDataBurst = true;
                        proj.radius = 10 * GAME_SCALE;
                        proj.hp = 24;
                        proj.maxHp = 24;
                        proj.color = this.getPhaseColor();
                        proj.vx = Math.cos(angle) * 4;
                        proj.vy = Math.sin(angle) * 4;

                        proj.update = function (p, dt) {
                            this.x += this.vx * dt;
                            this.y += this.vy * dt;
                            if (this.x < -50 || this.x > CANVAS.width + 50 ||
                                this.y < -50 || this.y > CANVAS.height + 50) {
                                this.hp = 0;
                            }
                        };

                        this.dataBursts.push(proj);
                    }
                }, 1500);
            }, i * 400);
        }
        if (window.playSound) playSound('powerup');
    }

    attackBlueScreen(player) {
        // Brief "freeze" then heavy attack
        this.glitchIntensity = 1;
        document.getElementById('boss-name').innerText = "FATAL ERROR";

        setTimeout(() => {
            document.getElementById('boss-name').innerText = "NEURAL NEXUS";

            // Massive spray
            for (let i = 0; i < 40; i++) {
                setTimeout(() => {
                    const angle = (i / 40) * Math.PI * 2 + Date.now() * 0.001;
                    const proj = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
                    proj.isDataBurst = true;
                    proj.radius = 8 * GAME_SCALE;
                    proj.hp = 16;
                    proj.maxHp = 16;
                    proj.color = '#0066ff';
                    proj.vx = Math.cos(angle) * 5;
                    proj.vy = Math.sin(angle) * 5;

                    proj.update = function (p, dt) {
                        this.x += this.vx * dt;
                        this.y += this.vy * dt;
                        if (this.x < -50 || this.x > CANVAS.width + 50 ||
                            this.y < -50 || this.y > CANVAS.height + 50) {
                            this.hp = 0;
                        }
                    };

                    this.dataBursts.push(proj);
                }, i * 25);
            }
            if (window.playSound) playSound('shoot');
        }, 500);
    }

    attackFinalProcess(player) {
        // Combination attack
        this.attackDataStream(player);
        setTimeout(() => this.attackNodeBurst(player), 300);
        setTimeout(() => this.attackPingFlood(player), 600);
    }

    // ═══════════════════════════════════════════════════════════════════
    // DAMAGE & DEATH
    // ═══════════════════════════════════════════════════════════════════
    takeDamage(amount) {
        if (this.state === 'INTRO') return;
        this.glitchIntensity = Math.min(1, this.glitchIntensity + 0.1);
        super.takeDamage(amount);
    }

    die() {
        super.die();
        this.state = 'DEAD';

        console.log("🖥️ THE NEURAL NEXUS HAS BEEN TERMINATED 🖥️");

        // Clear all entities
        this.clearAllEntities();

        // Digital death - glitch explosion
        this.glitchIntensity = 1;
        for (let i = 0; i < 25; i++) {
            setTimeout(() => {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 150;
                createExplosion(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    150, 0
                );
                spawnParticles(
                    this.x + Math.cos(angle) * dist,
                    this.y + Math.sin(angle) * dist,
                    10, 5, BOSS_9_DATA.colors.glitch[Math.floor(Math.random() * 4)]
                );
            }, i * 80);
        }

        // Reset player
        if (typeof player !== 'undefined') {
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // DRAWING
    // ═══════════════════════════════════════════════════════════════════
    onDraw() {
        CTX.save();
        CTX.translate(this.x, this.y);

        // ─── GLITCH EFFECT ───
        if (this.glitchIntensity > 0) {
            const glitchOffset = this.glitchIntensity * 10;
            CTX.translate(
                (Math.random() - 0.5) * glitchOffset,
                (Math.random() - 0.5) * glitchOffset
            );
        }

        // ─── CORRUPTION ZONE WARNINGS ───
        this.corruptionZones.forEach(zone => {
            if (!zone.warning) return;
            CTX.save();
            CTX.translate(zone.x - this.x, zone.y - this.y);
            CTX.strokeStyle = `rgba(255, 0, 102, ${0.5 + Math.sin(Date.now() * 0.02) * 0.3})`;
            CTX.lineWidth = 3;
            CTX.setLineDash([10, 5]);
            CTX.beginPath();
            CTX.arc(0, 0, zone.radius, 0, Math.PI * 2);
            CTX.stroke();
            CTX.setLineDash([]);
            CTX.restore();
        });

        // ─── NEURAL PATHS (Background connections) ───
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 1;
        CTX.globalAlpha = 0.3;

        this.neuralPaths.forEach(path => {
            const pulse = Math.sin(this.pulseTimer * 0.05 + path.pulseOffset);
            if (pulse > 0) {
                const startX = Math.cos(path.startAngle + this.hexagonRotation) * this.radius * 1.2;
                const startY = Math.sin(path.startAngle + this.hexagonRotation) * this.radius * 1.2;
                const endX = Math.cos(path.endAngle + this.hexagonRotation) * this.radius * 1.2;
                const endY = Math.sin(path.endAngle + this.hexagonRotation) * this.radius * 1.2;

                CTX.beginPath();
                CTX.moveTo(startX, startY);
                CTX.quadraticCurveTo(0, 0, endX, endY);
                CTX.stroke();
            }
        });
        CTX.globalAlpha = 1;

        // ─── DATA PARTICLES ───
        CTX.fillStyle = this.getPhaseColor();
        CTX.font = '10px monospace';
        this.dataParticles.forEach(p => {
            CTX.globalAlpha = p.alpha;
            CTX.fillText(p.char, p.x, p.y);
        });
        CTX.globalAlpha = 1;

        // ─── HEXAGON CORE ───
        CTX.save();
        CTX.rotate(this.hexagonRotation);

        // Outer hexagon
        CTX.shadowBlur = 30;
        CTX.shadowColor = this.getPhaseColor();
        CTX.strokeStyle = this.getPhaseColor();
        CTX.lineWidth = 4;
        CTX.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const r = this.radius;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) CTX.moveTo(px, py);
            else CTX.lineTo(px, py);
        }
        CTX.closePath();
        CTX.stroke();

        // Inner hexagon
        CTX.strokeStyle = this.getPhaseAccent();
        CTX.lineWidth = 2;
        CTX.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const r = this.radius * 0.6;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r;
            if (i === 0) CTX.moveTo(px, py);
            else CTX.lineTo(px, py);
        }
        CTX.closePath();
        CTX.stroke();

        // Core circle
        const coreGradient = CTX.createRadialGradient(0, 0, 0, 0, 0, this.radius * 0.3);
        coreGradient.addColorStop(0, '#ffffff');
        coreGradient.addColorStop(0.5, this.getPhaseColor());
        coreGradient.addColorStop(1, this.getPhaseAccent());

        CTX.fillStyle = coreGradient;
        CTX.beginPath();
        CTX.arc(0, 0, this.radius * 0.3, 0, Math.PI * 2);
        CTX.fill();

        CTX.restore();

        // ─── SCANLINES (Phase 3) ───
        if (this.phase === 3) {
            CTX.restore();
            CTX.save();

            CTX.globalAlpha = 0.1 * this.corruptionLevel;
            CTX.strokeStyle = '#ffffff';
            CTX.lineWidth = 1;

            for (let y = this.scanlineOffset; y < CANVAS.height; y += 4) {
                CTX.beginPath();
                CTX.moveTo(0, y);
                CTX.lineTo(CANVAS.width, y);
                CTX.stroke();
            }

            CTX.restore();
            return;
        }

        CTX.shadowBlur = 0;
        CTX.restore();
    }
}

// ═══════════════════════════════════════════════════════════════════
// GLOBAL INSTANCE
// ═══════════════════════════════════════════════════════════════════
const boss9 = new BossNeuralNexus();
window.boss9 = boss9;
