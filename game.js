// --- Temel Ayarlar ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const xpFillEl = document.getElementById('xp-fill');
const xpTextEl = document.getElementById('xp-text');
const shieldIndicatorEl = document.getElementById('shield-indicator');
const levelEl = document.getElementById('level-indicator');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelUpScreen = document.getElementById('levelup-screen');
const perkListEl = document.getElementById('perk-list');
const finalScoreEl = document.getElementById('final-score');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Oyun Durumu Değişkenleri ---
let animationId;
let score = 0;
let level = 1;
let nextLevelThreshold = 1000;
let gameActive = false;
let isPaused = false;
let spawnInterval;
let difficultyMultiplier = 1;
let lastShotTime = 0;
let nuclearBombTimer = 0;
let timeWarpActive = false;
let timeWarpTimer = 0;
let lastMouseX = 0;
let lastMouseY = 0;

// Oyuncu İstatistikleri (Perkler ile değişecek)
let playerStats = {
    shotCount: 1,      // Aynı anda atılan mermi
    shotSpeed: 10,     // Mermi hızı
    shotSize: 5,       // Mermi büyüklüğü
    piercing: 1,       // Mermi kaç düşman delip geçer
    fireRate: 400,     // Atış hızı (ms)
    spread: 0.1,       // Çoklu atış saçılma açısı
    explosionSize: 1,  // Patlama efekti çarpanı
    color: 'white',
    homing: 0,         // Güdümlü mermi gücü
    ricochet: 0,       // Sekme sayısı
    splitShot: false,  // Vuruşta parçalanma
    backShot: false,   // Arkaya ateş
    sideCannons: false,// Yanlara ateş
    knockback: 0,      // Geri tepme gücü
    freeze: 0,         // Dondurma süresi (frame)
    execute: false,    // %30 altı tek atış
    screenWrap: false, // Ekranın diğer tarafından çıkma
    cluster: false,    // Patlayınca bomba bırakma
    orbitals: 0,       // Oyuncu etrafında dönen korumalar
    chainLightning: 0, // Zincir şimşek zıplama sayısı
    explosiveRadius: 0,// Patlayıcı mermi alan hasarı
    shield: 0,         // Enerji Kalkanı sayısı
    maxShields: 2,     // Maksimum kalkan sayısı
    laserBeam: false,  // Lazer ışını aktif mi
    nuclearBomb: false,// Nükleer bomba aktif mi
    timeWarp: false    // Zaman bükme aktif mi
};

const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20
};

// Listeler
let projectiles = [];
let enemies = [];
let particles = [];

// --- Perk Tanımları (Güçlendirmeler) ---
const ALL_PERKS = [
    {
        id: 'rapid_fire',
        title: 'Seri Atış',
        desc: 'Atış hızın %20 artar.',
        apply: () => { playerStats.fireRate *= 0.8; }
    },
    {
        id: 'machine_gun',
        title: 'Makineli Tüfek',
        desc: 'Atış hızı ÇOK artar ama isabet azalır.',
        apply: () => { playerStats.fireRate *= 0.5; playerStats.spread += 0.2; playerStats.color = '#ff00ff'; }
    },
    {
        id: 'sniper',
        title: 'Nuri Yarra',
        desc: 'Mermi hızı ve hasarı artar, atış hızı düşer.',
        apply: () => { playerStats.shotSpeed *= 1.5; playerStats.piercing += 2; playerStats.fireRate *= 1.3; }
    },
    {
        id: 'double_shot',
        title: 'Çift Namlu',
        desc: 'Tek tıklamada +1 fazla mermi atarsın.',
        apply: () => { playerStats.shotCount += 1; playerStats.spread += 0.05; }
    },
    {
        id: 'freeze',
        title: 'Buz Mermisi',
        desc: 'Vurulan düşmanlar kısa süre yavaşlar.',
        apply: () => { playerStats.freeze += 60; playerStats.color = '#00ffff'; }
    },
    {
        id: 'knockback',
        title: 'Geri Tepme',
        desc: 'Mermiler düşmanları geriye iter.',
        apply: () => { playerStats.knockback += 5; }
    },
    {
        id: 'side_cannons',
        title: 'Yan Toplar',
        desc: 'Sağa ve sola da ateş edersin.',
        apply: () => { playerStats.sideCannons = true; }
    },
    {
        id: 'orbitals',
        title: 'Yörünge Koruması',
        desc: 'Etrafında dönen ve düşmanlara hasar veren bir küre.',
        apply: () => { playerStats.orbitals += 1; }
    },
    {
        id: 'screen_wrap',
        title: 'Portal Mermi',
        desc: 'Mermiler ekrandan çıkınca diğer taraftan girer (1 kez).',
        apply: () => { playerStats.screenWrap = true; }
    },
    {
        id: 'execute',
        title: 'İnfazcı',
        desc: 'Canı %30\'un altındaki düşmanları tek atışta yok et.',
        apply: () => { playerStats.execute = true; }
    },
    {
        id: 'cluster',
        title: 'Misket Bombası',
        desc: 'Patlamalar etrafa küçük bombalar saçar.',
        apply: () => { playerStats.cluster = true; }
    },
    {
        id: 'homing',
        title: 'Güdümlü Mermi',
        desc: 'Mermilerin düşmanlara doğru kavis çizer.',
        apply: () => { playerStats.homing += 0.05; playerStats.color = '#0f0'; }
    },
    {
        id: 'ricochet',
        title: 'Seken Mermi',
        desc: 'Mermilerin duvarlardan seker.',
        apply: () => { playerStats.ricochet += 1; }
    },
    {
        id: 'split_shot',
        title: 'Parça Tesirli',
        desc: 'Mermiler düşmana çarpınca küçük parçalara ayrılır.',
        apply: () => { playerStats.splitShot = true; }
    },
    {
        id: 'back_shot',
        title: 'Arka Koruma',
        desc: 'Ateş ettiğinde arkana da bir mermi atarsın.',
        apply: () => { playerStats.backShot = true; }
    },
    {
        id: 'giant_bullet',
        title: 'Gülle Atışı',
        desc: 'Mermiler %50 büyür ve vurması kolaylaşır.',
        apply: () => { playerStats.shotSize *= 1.5; }
    },
    {
        id: 'shotgun',
        title: 'Pompalı',
        desc: 'Mermi sayısı +2 artar ama saçılma çok artar.',
        apply: () => { playerStats.shotCount += 2; playerStats.spread += 0.15; }
    },
    {
        id: 'chain_lightning',
        title: 'Yıldırım Zinciri',
        desc: 'Vuruş sonrası yakındaki 2 düşmana elektrik zıplar.',
        apply: () => { playerStats.chainLightning += 2; playerStats.color = '#ffff00'; }
    },
    {
        id: 'explosive_shot',
        title: 'Patlayıcı Mermi',
        desc: 'Düşman öldürünce alan hasarı verir.',
        apply: () => { playerStats.explosiveRadius += 80; playerStats.color = '#ff6600'; }
    },
    {
        id: 'energy_shield',
        title: 'Enerji Kalkanı',
        desc: 'Sana 1 kalkan verir. Vurulunca tüm ekranı temizler! (Max 2)',
        apply: () => {
            if (playerStats.shield < playerStats.maxShields) {
                playerStats.shield += 1;
            }
        }
    },
    {
        id: 'laser_beam',
        title: 'Lazer Işını',
        desc: 'Sürekli hasar veren bir lazer ışını ekler.',
        apply: () => { playerStats.laserBeam = true; playerStats.color = '#ff0000'; }
    },
    {
        id: 'nuclear_bomb',
        title: 'Nükleer Bomba',
        desc: 'Her 10 saniyede bir devasa patlama! Tüm ekrana hasar.',
        apply: () => { playerStats.nuclearBomb = true; }
    },
    /* {
        id: 'time_warp',
        title: 'Zaman Bükme',
        desc: 'Mermi her vurduğunda etrafta zaman yavaşlar.',
        apply: () => { playerStats.timeWarp = true; }
    } */
];

// --- Ses Sistemi (Web Audio API) ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'shoot') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400 - (playerStats.shotCount * 20), now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(10, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    } else if (type === 'levelup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1);
        osc.frequency.setValueAtTime(659, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    }
}

// --- Sınıflar ---
class Projectile {
    constructor(x, y, velocity, isSplit = false) {
        this.x = x;
        this.y = y;
        this.velocity = velocity;
        this.radius = isSplit ? playerStats.shotSize / 2 : playerStats.shotSize;
        this.color = playerStats.color;
        this.penetration = isSplit ? 1 : playerStats.piercing;
        this.hitList = [];
        this.ricochetCount = playerStats.ricochet;
        this.homing = playerStats.homing;
        this.isSplit = isSplit;
        this.screenWrap = playerStats.screenWrap && !isSplit;
        this.hasWrapped = false;
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    update() {
        this.draw();

        // Homing Logic
        if (this.homing > 0 && enemies.length > 0) {
            let nearestEnemy = null;
            let minDist = Infinity;

            enemies.forEach(enemy => {
                const dist = Math.hypot(enemy.x - this.x, enemy.y - this.y);
                if (dist < minDist && dist < 400) {
                    minDist = dist;
                    nearestEnemy = enemy;
                }
            });

            if (nearestEnemy) {
                const angle = Math.atan2(nearestEnemy.y - this.y, nearestEnemy.x - this.x);
                const targetVx = Math.cos(angle) * playerStats.shotSpeed;
                const targetVy = Math.sin(angle) * playerStats.shotSpeed;

                this.velocity.x += (targetVx - this.velocity.x) * this.homing;
                this.velocity.y += (targetVy - this.velocity.y) * this.homing;

                const currentSpeed = Math.hypot(this.velocity.x, this.velocity.y);
                this.velocity.x = (this.velocity.x / currentSpeed) * playerStats.shotSpeed;
                this.velocity.y = (this.velocity.y / currentSpeed) * playerStats.shotSpeed;
            }
        }

        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;

        // Screen Wrap Logic
        if (this.screenWrap && !this.hasWrapped) {
            if (this.x < 0) { this.x = canvas.width; this.hasWrapped = true; }
            else if (this.x > canvas.width) { this.x = 0; this.hasWrapped = true; }
            else if (this.y < 0) { this.y = canvas.height; this.hasWrapped = true; }
            else if (this.y > canvas.height) { this.y = 0; this.hasWrapped = true; }
        }

        // Ricochet Logic
        if (this.ricochetCount > 0 && !this.hasWrapped) {
            if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
                this.velocity.x = -this.velocity.x;
                this.ricochetCount--;
            }
            if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
                this.velocity.y = -this.velocity.y;
                this.ricochetCount--;
            }
        }
    }
}

const ENEMY_TYPES = {
    BASIC: { radius: 20, color: 'hsl(0, 70%, 50%)', speed: 1, hp: 1, score: 50, name: 'Basic' },
    SPEEDSTER: { radius: 12, color: 'hsl(60, 90%, 60%)', speed: 2.2, hp: 1, score: 100, name: 'Speedster' },
    TANK: { radius: 35, color: 'hsl(240, 70%, 50%)', speed: 0.6, hp: 5, score: 200, name: 'Tank' },
    DASHER: { radius: 15, color: 'hsl(300, 80%, 50%)', speed: 1.5, hp: 2, score: 150, name: 'Dasher' },
    SPLITTER: { radius: 25, color: 'hsl(120, 70%, 50%)', speed: 0.8, hp: 3, score: 180, name: 'Splitter' },
    MINI_SPLITTER: { radius: 10, color: 'hsl(120, 70%, 40%)', speed: 1.5, hp: 1, score: 30, name: 'MiniSplitter' },
    SPAWNER: { radius: 30, color: 'hsl(180, 70%, 50%)', speed: 0.4, hp: 4, score: 250, name: 'Spawner' }
};

class Enemy {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = type.radius;
        this.color = type.color;
        this.speed = type.speed * (1 + (difficultyMultiplier * 0.1));
        this.hp = type.hp + Math.floor(difficultyMultiplier / 2);
        this.maxHp = this.hp;
        this.id = Math.random();

        // Dasher için özel değişkenler
        this.dashCooldown = 0;

        // Spawner için özel değişkenler
        this.spawnTimer = 0;
        this.spawnCooldown = 180;

        // Status Effects
        this.freezeTimer = 0;
    }

    draw() {
        ctx.beginPath();
        if (this.type.name === 'Speedster') {
            ctx.moveTo(this.x + this.radius, this.y);
            ctx.lineTo(this.x - this.radius, this.y + this.radius);
            ctx.lineTo(this.x - this.radius, this.y - this.radius);
            ctx.closePath();
        } else if (this.type.name === 'Tank') {
            ctx.rect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
        } else if (this.type.name === 'Splitter' || this.type.name === 'MiniSplitter') {
            const sides = 6;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = this.x + Math.cos(angle) * this.radius;
                const y = this.y + Math.sin(angle) * this.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        } else if (this.type.name === 'Spawner') {
            const spikes = 5;
            const outerRadius = this.radius;
            const innerRadius = this.radius * 0.5;
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                const r = i % 2 === 0 ? outerRadius : innerRadius;
                const x = this.x + Math.cos(angle) * r;
                const y = this.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
        } else {
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        }

        if (this.freezeTimer > 0) {
            ctx.fillStyle = '#00ffff';
        } else {
            ctx.fillStyle = this.color;
        }

        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (this.hp > 1) {
            ctx.fillStyle = 'white';
            ctx.font = '10px Arial';
            ctx.fillText(this.hp, this.x - 3, this.y + 4);
        }
    }

    update() {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);

        let currentSpeed = this.speed;
        if (this.freezeTimer > 0) {
            currentSpeed *= 0.5;
            this.freezeTimer--;
        }

        if (this.type.name === 'Spawner') {
            this.spawnTimer++;
            if (this.spawnTimer >= this.spawnCooldown && this.freezeTimer <= 0) {
                this.spawnTimer = 0;
                const spawnCount = 2;
                for (let i = 0; i < spawnCount; i++) {
                    const spawnAngle = Math.random() * Math.PI * 2;
                    const spawnDist = this.radius + 20;
                    const spawnX = this.x + Math.cos(spawnAngle) * spawnDist;
                    const spawnY = this.y + Math.sin(spawnAngle) * spawnDist;
                    enemies.push(new Enemy(spawnX, spawnY, ENEMY_TYPES.BASIC));
                }
                for (let i = 0; i < 15; i++) {
                    particles.push(new Particle(
                        this.x, this.y,
                        Math.random() * 3, this.color,
                        {
                            x: (Math.random() - 0.5) * 8,
                            y: (Math.random() - 0.5) * 8
                        }
                    ));
                }
            }
            this.x += Math.cos(angle) * currentSpeed * 0.5;
            this.y += Math.sin(angle) * currentSpeed * 0.5;
        }
        else if (this.type.name === 'Dasher') {
            this.dashCooldown--;
            if (this.dashCooldown <= 0 && this.freezeTimer <= 0) {
                this.x += Math.cos(angle) * currentSpeed * 10;
                this.y += Math.sin(angle) * currentSpeed * 10;
                this.dashCooldown = 100 + Math.random() * 100;
            } else {
                this.x += Math.cos(angle) * (currentSpeed * 0.5);
                this.y += Math.sin(angle) * (currentSpeed * 0.5);
            }
        } else {
            this.x += Math.cos(angle) * currentSpeed;
            this.y += Math.sin(angle) * currentSpeed;
        }

        this.draw();
    }
}

const friction = 0.97;
class Particle {
    constructor(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= friction;
        this.velocity.y *= friction;
        this.x = this.x + this.velocity.x;
        this.y = this.y + this.velocity.y;
        this.alpha -= 0.015;
    }
}

function spawnEnemies() {
    let spawnRate = 1000 - (difficultyMultiplier * 50);
    if (spawnRate < 200) spawnRate = 200;

    spawnInterval = setInterval(() => {
        if (isPaused || !gameActive) return;

        let type = ENEMY_TYPES.BASIC;
        const rand = Math.random();

        if (difficultyMultiplier > 4 && rand < 0.15) type = ENEMY_TYPES.SPAWNER;
        else if (difficultyMultiplier > 3 && rand < 0.25) type = ENEMY_TYPES.SPLITTER;
        else if (difficultyMultiplier > 2 && rand < 0.35) type = ENEMY_TYPES.TANK;
        else if (difficultyMultiplier > 3 && rand < 0.5) type = ENEMY_TYPES.DASHER;
        else if (difficultyMultiplier > 1 && rand < 0.6) type = ENEMY_TYPES.SPEEDSTER;

        const radius = type.radius;
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : canvas.width + radius;
            y = Math.random() * canvas.height;
        } else {
            x = Math.random() * canvas.width;
            y = Math.random() < 0.5 ? 0 - radius : canvas.height + radius;
        }

        enemies.push(new Enemy(x, y, type));
    }, spawnRate);
}

function updateProgressBar() {
    const xpPercentage = (score / nextLevelThreshold) * 100;
    xpFillEl.style.width = `${Math.min(xpPercentage, 100)}%`;
    xpTextEl.innerText = `${score} / ${nextLevelThreshold}`;
}

function updateShieldIndicator() {
    shieldIndicatorEl.innerHTML = '';
    for (let i = 0; i < playerStats.shield; i++) {
        const shieldIcon = document.createElement('div');
        shieldIcon.innerText = '🛡️';
        shieldIcon.style.filter = 'drop-shadow(0 0 5px cyan)';
        shieldIndicatorEl.appendChild(shieldIcon);
    }
}

function showLevelUpAnimation() {
    // Create level up animation overlay
    const levelUpAnim = document.createElement('div');
    levelUpAnim.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 5rem;
        font-weight: bold;
        color: #ffd700;
        text-shadow: 0 0 30px #ffd700;
        z-index: 40;
        animation: levelUpPulse 1.2s ease-out;
        pointer-events: none;
    `;
    levelUpAnim.innerText = 'LEVEL UP!';
    document.body.appendChild(levelUpAnim);

    // Add animation keyframes
    if (!document.getElementById('levelup-anim-style')) {
        const style = document.createElement('style');
        style.id = 'levelup-anim-style';
        style.innerHTML = `
            @keyframes levelUpPulse {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        document.body.removeChild(levelUpAnim);
    }, 1200);
}

function triggerLevelUp() {
    isPaused = true;
    clearInterval(spawnInterval);
    playSound('levelup');

    // Show animation first
    showLevelUpAnimation();

    // Delay perk selection screen to prevent missclicks
    setTimeout(() => {
        const shuffled = ALL_PERKS.sort(() => 0.5 - Math.random());

        // Filter out energy_shield if already at max
        let availablePerks = shuffled;
        if (playerStats.shield >= playerStats.maxShields) {
            availablePerks = shuffled.filter(p => p.id !== 'energy_shield');
        }

        const selectedPerks = availablePerks.slice(0, 3);

        perkListEl.innerHTML = '';
        selectedPerks.forEach(perk => {
            const div = document.createElement('div');
            div.className = 'perk-card';
            div.innerHTML = `
                <div class="perk-title">${perk.title}</div>
                <div class="perk-desc">${perk.desc}</div>
            `;
            div.onclick = () => selectPerk(perk);
            perkListEl.appendChild(div);
        });

        levelUpScreen.classList.remove('hidden');
    }, 1200); // 1.2 second delay
}

function selectPerk(perk) {
    perk.apply();

    level++;
    nextLevelThreshold += 1000;
    difficultyMultiplier += 0.5;

    levelEl.innerText = `Seviye: ${level}`;
    updateShieldIndicator();
    updateProgressBar();
    levelUpScreen.classList.add('hidden');

    isPaused = false;
    spawnEnemies();
    animate();
}

function animate() {
    if (!gameActive || isPaused) return;
    animationId = requestAnimationFrame(animate);

    ctx.fillStyle = 'rgba(5, 5, 5, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2, false);
    ctx.fillStyle = playerStats.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = playerStats.color;
    ctx.fill();
    ctx.shadowBlur = 0;

    const now = Date.now();
    const timeSinceLast = now - lastShotTime;
    const reloadRatio = Math.min(timeSinceLast / playerStats.fireRate, 1);

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius * reloadRatio, 0, Math.PI * 2, false);

    if (reloadRatio < 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'white';
    }
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw shield indicator around player
    if (playerStats.shield > 0) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00ffff';
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;
    }

    // Laser Beam
    if (playerStats.laserBeam && isTouching || playerStats.laserBeam && lastMouseX) {
        const angle = Math.atan2((lastMouseY || touchStartY) - player.y, (lastMouseX || touchStartX) - player.x);
        const laserEndX = player.x + Math.cos(angle) * 2000;
        const laserEndY = player.y + Math.sin(angle) * 2000;

        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(laserEndX, laserEndY);
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0000';
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1;

        // Laser damage to enemies
        enemies.forEach((enemy, eIndex) => {
            const distToLine = Math.abs((laserEndY - player.y) * enemy.x - (laserEndX - player.x) * enemy.y + laserEndX * player.y - laserEndY * player.x) / Math.hypot(laserEndY - player.y, laserEndX - player.x);
            const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);

            if (distToLine < enemy.radius + 10 && distToPlayer < 2000) {
                enemy.hp -= 0.02;
                if (enemy.hp <= 0) {
                    score += enemy.type.score;
                    enemies.splice(eIndex, 1);
                    updateProgressBar();
                }
            }
        });
    }

    // Nuclear Bomb
    if (playerStats.nuclearBomb) {
        nuclearBombTimer++;
        if (nuclearBombTimer >= 600) { // 10 seconds at 60fps
            nuclearBombTimer = 0;

            // Create massive explosion
            for (let i = 0; i < 100; i++) {
                particles.push(new Particle(
                    player.x, player.y,
                    Math.random() * 8, '#ff6600',
                    {
                        x: (Math.random() - 0.5) * 30,
                        y: (Math.random() - 0.5) * 30
                    }
                ));
            }

            // Damage all enemies
            enemies.forEach(enemy => {
                enemy.hp -= 3;
            });

            playSound('hit');
        }
    }

    // Time Warp effect
    if (timeWarpActive) {
        timeWarpTimer--;
        if (timeWarpTimer <= 0) {
            timeWarpActive = false;
        }
    }

    if (playerStats.orbitals > 0) {
        const orbitalTime = Date.now() / 500;
        for (let i = 0; i < playerStats.orbitals; i++) {
            const angle = orbitalTime + (i * (Math.PI * 2 / playerStats.orbitals));
            const ox = player.x + Math.cos(angle) * 60;
            const oy = player.y + Math.sin(angle) * 60;

            ctx.beginPath();
            ctx.arc(ox, oy, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00ffff';
            ctx.fill();
            ctx.shadowBlur = 0;

            enemies.forEach((enemy, eIndex) => {
                const dist = Math.hypot(ox - enemy.x, oy - enemy.y);
                if (dist < enemy.radius + 10) {
                    enemy.hp -= 0.1;
                    if (enemy.hp <= 0) {
                        score += enemy.type.score;
                        try { enemies.splice(eIndex, 1); } catch (e) { }
                        updateProgressBar();
                    }
                }
            });
        }
    }

    particles.forEach((particle, index) => {
        if (particle.alpha <= 0) particles.splice(index, 1);
        else particle.update();
    });

    projectiles.forEach((projectile, pIndex) => {
        projectile.update();

        if (projectile.x < 0 || projectile.x > canvas.width || projectile.y < 0 || projectile.y > canvas.height) {
            projectiles.splice(pIndex, 1);
        }
    });

    enemies.forEach((enemy, eIndex) => {
        // Apply time warp slow
        if (timeWarpActive) {
            enemy.speed *= 0.5;
        }

        enemy.update();

        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (distPlayer - enemy.radius - player.radius < 1) {
            // Check shield
            if (playerStats.shield > 0) {
                playerStats.shield--;
                updateShieldIndicator();

                // Screen clear animation
                ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Clear all enemies with particles
                enemies.forEach(e => {
                    for (let i = 0; i < 20; i++) {
                        particles.push(new Particle(
                            e.x, e.y,
                            Math.random() * 5, '#00ffff',
                            {
                                x: (Math.random() - 0.5) * 15,
                                y: (Math.random() - 0.5) * 15
                            }
                        ));
                    }
                });

                enemies.length = 0; // Clear all enemies
                playSound('levelup');
            } else {
                gameOver();
            }
        }

        projectiles.forEach((projectile, pIndex) => {
            if (projectile.hitList.includes(enemy.id)) return;

            const distProj = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (distProj - enemy.radius - projectile.radius < 1) {

                projectile.hitList.push(enemy.id);
                projectile.penetration--;

                let damage = 1;
                if (playerStats.execute && enemy.hp / enemy.maxHp < 0.3) {
                    damage = 999;
                    for (let i = 0; i < 10; i++) {
                        particles.push(new Particle(enemy.x, enemy.y, Math.random() * 3, 'red', { x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 10 }));
                    }
                }
                enemy.hp -= damage;

                if (playerStats.knockback > 0) {
                    const kbAngle = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
                    enemy.x += Math.cos(kbAngle) * playerStats.knockback;
                    enemy.y += Math.sin(kbAngle) * playerStats.knockback;
                }

                if (playerStats.freeze > 0) {
                    enemy.freezeTimer = playerStats.freeze;
                }

                // Time Warp effect
                if (playerStats.timeWarp) {
                    timeWarpActive = true;
                    timeWarpTimer = 180; // 3 seconds at 60fps
                }

                playSound('hit');
                const particleCount = enemy.radius * playerStats.explosionSize * 0.5;
                for (let i = 0; i < particleCount; i++) {
                    particles.push(new Particle(
                        projectile.x, projectile.y,
                        Math.random() * 3, enemy.color,
                        {
                            x: (Math.random() - 0.5) * (Math.random() * 8),
                            y: (Math.random() - 0.5) * (Math.random() * 8)
                        }
                    ));
                }

                if (playerStats.cluster && !projectile.isSplit) {
                    for (let c = 0; c < 3; c++) {
                        particles.push(new Particle(projectile.x, projectile.y, 4, 'orange', {
                            x: (Math.random() - 0.5) * 5,
                            y: (Math.random() - 0.5) * 5
                        }));
                    }
                }

                if (playerStats.splitShot && !projectile.isSplit) {
                    for (let s = 0; s < 3; s++) {
                        const splitAngle = Math.random() * Math.PI * 2;
                        const splitVel = {
                            x: Math.cos(splitAngle) * playerStats.shotSpeed * 0.8,
                            y: Math.sin(splitAngle) * playerStats.shotSpeed * 0.8
                        };
                        projectiles.push(new Projectile(projectile.x, projectile.y, splitVel, true));
                    }
                }

                if (projectile.penetration <= 0) {
                    setTimeout(() => projectiles.splice(pIndex, 1), 0);
                }

                if (enemy.hp <= 0) {
                    score += enemy.type.score;

                    if (enemy.type.name === 'Splitter') {
                        const splitCount = 2 + Math.floor(Math.random() * 2);
                        for (let s = 0; s < splitCount; s++) {
                            const splitAngle = (Math.PI * 2 / splitCount) * s;
                            const splitX = enemy.x + Math.cos(splitAngle) * 30;
                            const splitY = enemy.y + Math.sin(splitAngle) * 30;
                            enemies.push(new Enemy(splitX, splitY, ENEMY_TYPES.MINI_SPLITTER));
                        }
                    }

                    if (playerStats.chainLightning > 0) {
                        let chainTargets = [];
                        enemies.forEach(e => {
                            if (e.id !== enemy.id) {
                                const dist = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                                if (dist < 150) {
                                    chainTargets.push({ enemy: e, dist: dist });
                                }
                            }
                        });

                        chainTargets.sort((a, b) => a.dist - b.dist);
                        const chainCount = Math.min(playerStats.chainLightning, chainTargets.length);

                        for (let c = 0; c < chainCount; c++) {
                            const target = chainTargets[c].enemy;
                            target.hp -= 1;

                            for (let i = 0; i < 5; i++) {
                                particles.push(new Particle(
                                    enemy.x + (target.x - enemy.x) * (i / 5),
                                    enemy.y + (target.y - enemy.y) * (i / 5),
                                    3, '#ffff00',
                                    { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 }
                                ));
                            }
                        }
                    }

                    if (playerStats.explosiveRadius > 0) {
                        enemies.forEach(e => {
                            if (e.id !== enemy.id) {
                                const dist = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                                if (dist < playerStats.explosiveRadius) {
                                    e.hp -= 1;
                                    particles.push(new Particle(e.x, e.y, 4, '#ff6600', {
                                        x: (Math.random() - 0.5) * 5,
                                        y: (Math.random() - 0.5) * 5
                                    }));
                                }
                            }
                        });

                        for (let i = 0; i < 20; i++) {
                            const angle = (i / 20) * Math.PI * 2;
                            particles.push(new Particle(
                                enemy.x + Math.cos(angle) * 20,
                                enemy.y + Math.sin(angle) * 20,
                                3, '#ff6600',
                                {
                                    x: Math.cos(angle) * 3,
                                    y: Math.sin(angle) * 3
                                }
                            ));
                        }
                    }

                    setTimeout(() => enemies.splice(eIndex, 1), 0);

                    for (let i = 0; i < 10; i++) {
                        particles.push(new Particle(
                            enemy.x, enemy.y,
                            Math.random() * 5, enemy.color,
                            {
                                x: (Math.random() - 0.5) * 10,
                                y: (Math.random() - 0.5) * 10
                            }
                        ));
                    }
                }

                updateProgressBar();
                if (score >= nextLevelThreshold) {
                    triggerLevelUp();
                }
            }
        });
    });
}

function initGame() {
    score = 0;
    level = 1;
    nextLevelThreshold = 1000;
    difficultyMultiplier = 0;
    projectiles = [];
    enemies = [];
    particles = [];
    nuclearBombTimer = 0;
    timeWarpActive = false;
    timeWarpTimer = 0;

    playerStats = {
        shotCount: 1,
        shotSpeed: 10,
        shotSize: 5,
        piercing: 1,
        fireRate: 400,
        reloadSpeed: 0,
        spread: 0.1,
        explosionSize: 1,
        color: 'white',
        homing: 0,
        ricochet: 0,
        splitShot: false,
        backShot: false,
        sideCannons: false,
        knockback: 0,
        freeze: 0,
        execute: false,
        screenWrap: false,
        cluster: false,
        orbitals: 0,
        chainLightning: 0,
        explosiveRadius: 0,
        shield: 0,
        maxShields: 2,
        laserBeam: false,
        nuclearBomb: false,
        timeWarp: false
    };

    levelEl.innerText = "Seviye: 1";
    updateProgressBar();
    updateShieldIndicator();
    gameActive = true;
    isPaused = false;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    animate();
    spawnEnemies();
}

function gameOver() {
    gameActive = false;
    isPaused = true;
    clearInterval(spawnInterval);
    finalScoreEl.innerText = `Toplam Skor: ${score} - Seviye: ${level}`;
    gameOverScreen.classList.remove('hidden');
}

let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameActive || isPaused) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;

    shoot(touchStartX, touchStartY);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameActive || isPaused || !isTouching) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
});

setInterval(() => {
    if (isTouching && gameActive && !isPaused) {
        shoot(touchStartX, touchStartY);
    }
}, 100);

window.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.perk-card')) return;
    if (!gameActive || isPaused) return;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    shoot(e.clientX, e.clientY);
});

window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

function shoot(targetX, targetY) {
    const now = Date.now();
    if (now - lastShotTime < playerStats.fireRate) return;
    lastShotTime = now;

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const count = playerStats.shotCount;
    const spread = playerStats.spread;
    const startAngle = angle - ((count - 1) * spread) / 2;

    for (let i = 0; i < count; i++) {
        const currentAngle = startAngle + (i * spread);
        const velocity = {
            x: Math.cos(currentAngle) * playerStats.shotSpeed,
            y: Math.sin(currentAngle) * playerStats.shotSpeed
        };
        projectiles.push(new Projectile(player.x, player.y, velocity));
    }

    if (playerStats.backShot) {
        const backAngle = angle + Math.PI;
        const backVel = {
            x: Math.cos(backAngle) * playerStats.shotSpeed,
            y: Math.sin(backAngle) * playerStats.shotSpeed
        };
        projectiles.push(new Projectile(player.x, player.y, backVel));
    }

    if (playerStats.sideCannons) {
        const leftAngle = angle - Math.PI / 2;
        const rightAngle = angle + Math.PI / 2;
        projectiles.push(new Projectile(player.x, player.y, {
            x: Math.cos(leftAngle) * playerStats.shotSpeed,
            y: Math.sin(leftAngle) * playerStats.shotSpeed
        }));
        projectiles.push(new Projectile(player.x, player.y, {
            x: Math.cos(rightAngle) * playerStats.shotSpeed,
            y: Math.sin(rightAngle) * playerStats.shotSpeed
        }));
    }

    playSound('shoot');
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
});

document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);
