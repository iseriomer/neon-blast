// game/boss_2.js - The Architect of Void

const BOSS_2_DATA = {
    name: 'NEXUS PRIME',
    hp: 8000, // Boss 1'den çok daha tank
    score: 15000,
    colors: ['#00ffff', '#ff0055', '#ffff00'] // Fazlara göre renkler
};

class Boss2 {
    constructor() {
        this.active = false;
        this.x = 0;
        this.y = 0;
        this.radius = 60;
        this.hp = 0;
        this.maxHp = 0;

        // Animasyon değişkenleri
        this.angle = 0;
        this.pulse = 0;
        this.floatY = 0;

        // Saldırı Mantığı
        this.phase = 1;
        this.attackTimer = 0;
        this.currentAttack = null;
        this.state = 'IDLE'; // IDLE, MOVING_PLAYER, ATTACKING, STUNNED

        // Oyuncu Kontrolü
        this.grabbedPlayer = false;
        this.playerTargetX = 0;
        this.playerTargetY = 0;
    }

    spawn(x, y) {
        this.active = true;
        this.x = x;
        this.y = y;
        this.hp = BOSS_2_DATA.hp;
        this.maxHp = BOSS_2_DATA.hp;
        this.phase = 1;
        this.state = 'INTRO';
        this.attackTimer = 0;

        document.getElementById('boss-hud').style.display = 'flex';
        document.getElementById('boss-name').innerText = BOSS_2_DATA.name;
        document.getElementById('boss-name').style.color = '#00ffff';
        this.updateHealthBar();

        playSound('levelup');
        console.log("⚠️ SYSTEM BREACH: NEXUS PRIME DETECTED ⚠️");

        // Intro: Ekranı sars
        createExplosion(CANVAS.width / 2, CANVAS.height / 2, 0, 0);
    }

    update(player, dt = 1) {
        if (!this.active) return;

        this.updateHealthBar();
        this.angle += 0.01 * dt;
        this.pulse = Math.sin(Date.now() / 200) * 10;
        this.floatY = Math.sin(Date.now() / 500) * 50;

        // Boss hareketi (Süzülme)
        // Boss ekranın üst yarısında süzülür
        const targetX = CANVAS.width / 2 + Math.cos(Date.now() / 1000) * 200;
        const targetY = 150 + this.floatY;

        this.x += (targetX - this.x) * 0.05 * dt;
        this.y += (targetY - this.y) * 0.05 * dt;

        // --- FAZ GEÇİŞLERİ ---
        if (this.hp < this.maxHp * 0.4 && this.phase === 1) {
            this.phase = 2;
            this.state = 'RAGE';
            createExplosion(this.x, this.y, 500, 0); // Görsel patlama
            spawnParticles(this.x, this.y, 100, 10, '#ff0055', 5);
            document.getElementById('boss-name').style.color = '#ff0055';
        }

        // --- STATE MACHINE ---
        this.attackTimer += dt;

        if (this.state === 'INTRO') {
            if (this.attackTimer > 180) this.state = 'IDLE';
        }
        else if (this.state === 'IDLE') {
            // Saldırı seçimi
            if (this.attackTimer > 120) {
                this.chooseAttack();
                this.attackTimer = 0;
            }
        }
        else if (this.state === 'GRABBING_PLAYER') {
            // Oyuncuyu hedefe çek
            const dx = this.playerTargetX - player.x;
            const dy = this.playerTargetY - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Oyuncuyu zorla hareket ettir (Lerp)
            player.x += dx * 0.1 * dt;
            player.y += dy * 0.1 * dt;

            // Oyuncu hedefe vardı mı?
            if (dist < 10) {
                this.state = 'ATTACKING';
                this.attackTimer = 0;
                // Oyuncuyu serbest bırak ama saldırıyı başlat
                if (this.currentAttack === 'WALL_OF_DEATH') this.executeWallOfDeath();
                if (this.currentAttack === 'CORNER_TRAP') this.executeCornerTrap();
            }
        }
        else if (this.state === 'ATTACKING') {
            // Saldırı süresi dolunca IDLE'a dön
            if (this.attackTimer > 300) { // 5 saniye saldırı
                this.state = 'IDLE';
                this.attackTimer = 0;
            }

            // Phase 2 Bullet Hell
            if (this.phase === 2 && this.attackTimer % 10 < 1) {
                this.spiralShoot();
            }
        }
    }

    chooseAttack() {
        const rand = Math.random();

        // Saldırı 1: Telekinesis (Oyuncuyu Konumlandır)
        if (rand < 0.4) {
            this.currentAttack = Math.random() < 0.5 ? 'WALL_OF_DEATH' : 'CORNER_TRAP';
            this.state = 'GRABBING_PLAYER';

            // Hedef belirle (Ekran boyutuna göre dinamik)
            if (this.currentAttack === 'WALL_OF_DEATH') {
                // Oyuncuyu en sola çek
                this.playerTargetX = CANVAS.width * 0.1;
                this.playerTargetY = CANVAS.height / 2;
            } else {
                // Oyuncuyu merkeze çek
                this.playerTargetX = CANVAS.width / 2;
                this.playerTargetY = CANVAS.height / 2;
            }

            playSound('shoot'); // Ses efekti (Telekinesis sesi olarak düşün)
        }
        // Saldırı 2: Geometrik Mermiler
        else if (rand < 0.7) {
            this.state = 'ATTACKING';
            this.spawnGeometryShapes();
        }
        // Saldırı 3: Minion Spawn
        else {
            this.state = 'IDLE'; // Saldırı sayılmaz hemen spawnlayıp bitirir
            this.spawnMinions();
        }
    }

    executeWallOfDeath() {
        // Oyuncu solda, sağdan sola devasa lazerler gönder
        const gap = 150; // Kaçılacak boşluk
        const safeY = CANVAS.height / 2;

        // Yukarıdan ve aşağıdan kaplayan mermiler
        // Sadece ortası boş
        for (let i = 0; i < 10; i++) {
            // Üst Duvar
            let y = safeY - gap - (i * 40);
            this.shootLaserLine(CANVAS.width, y, -5, 0);

            // Alt Duvar
            y = safeY + gap + (i * 40);
            this.shootLaserLine(CANVAS.width, y, -5, 0);
        }
    }

    executeCornerTrap() {
        // Oyuncu merkezde, 4 köşeden ortaya mermi yağdır
        const corners = [
            { x: 0, y: 0 }, { x: CANVAS.width, y: 0 },
            { x: 0, y: CANVAS.height }, { x: CANVAS.width, y: CANVAS.height }
        ];

        corners.forEach(c => {
            const projectile = enemyPool.get(c.x, c.y, ENEMY_TYPES.BASIC, 2);
            projectile.color = '#ff0055';
            // Merkeze doğru
            const angle = Math.atan2(CANVAS.height / 2 - c.y, CANVAS.width / 2 - c.x);
            projectile.vx = Math.cos(angle) * 3;
            projectile.vy = Math.sin(angle) * 3;
        });
    }

    shootLaserLine(x, y, vx, vy) {
        // Mermi havuzundan "Dasher" gibi hızlı ama mermi görünümlü bir şey alalım
        // Veya enemyPool'u hackleyip mermi gibi kullanalım
        const bullet = enemyPool.get(x, y, ENEMY_TYPES.BASIC, 1);
        bullet.radius = 15;
        bullet.color = '#ffff00';
        bullet.hp = 999; // Yok edilemez
        bullet.vx = vx;
        bullet.vy = vy;
        // Özel güncelleme mantığı override (hack)
        bullet.update = function (player, dt) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;
            this.draw();
        }
    }

    spawnGeometryShapes() {
        for (let i = 0; i < 3; i++) {
            // Üçgen formasyonu
            const enemy = enemyPool.get(this.x, this.y, ENEMY_TYPES.TANK, 2);
            enemy.radius = 40;
            enemy.color = '#00ffff';
            const angle = (Math.PI * 2 / 3) * i + this.angle;
            enemy.x += Math.cos(angle) * 100;
            enemy.y += Math.sin(angle) * 100;
        }
    }

    spawnMinions() {
        for (let i = 0; i < 4; i++) {
            enemyPool.get(
                this.x + (Math.random() - 0.5) * 200,
                this.y + 100 + Math.random() * 100,
                ENEMY_TYPES.DASHER,
                3
            );
        }
    }

    spiralShoot() {
        const angle = this.attackTimer * 0.5;
        for (let i = 0; i < 3; i++) {
            const finalAngle = angle + (i * (Math.PI * 2 / 3));
            const bullet = enemyPool.get(this.x, this.y, ENEMY_TYPES.BASIC, 1);
            bullet.radius = 8;
            bullet.color = this.phase === 2 ? '#ff0000' : '#00ffff';
            bullet.vx = Math.cos(finalAngle) * 6;
            bullet.vy = Math.sin(finalAngle) * 6;

            // Basit hareket override'ı
            bullet.update = function (player, dt) {
                this.x += this.vx * dt;
                this.y += this.vy * dt;
                this.draw();
            }
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.updateHealthBar();

        // Hit efekti (Beyaz yanıp sönme mantığı draw içinde yapılabilir)
        spawnParticles(this.x, this.y, 2, 5, this.phase === 2 ? '#ff0055' : '#00ffff');

        if (this.hp <= 0) {
            this.die();
        }
    }

    updateHealthBar() {
        const fill = document.getElementById('boss-hp-fill');
        if (fill) {
            const percent = Math.max(0, (this.hp / this.maxHp) * 100);
            fill.style.width = percent + '%';

            // Renk değişimi
            if (this.phase === 2) fill.style.background = '#ff0055';
            else fill.style.background = '#00ffff';
        }
    }

    die() {
        this.active = false;
        this.state = 'DEAD';
        document.getElementById('boss-hud').style.display = 'none';

        // MÜKEMMEL ÖLÜM EFEKTİ
        createExplosion(this.x, this.y, 2000, 9999);
        // Ekranı beyazlat
        CTX.fillStyle = 'white';
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        if (window.triggerHitstop) window.triggerHitstop(120); // 2 saniye donma

        gameState.score += BOSS_2_DATA.score;

        // Oyun sonu veya sonsuz döngü?
        // Boss 2'yi yendikten sonra zorluk çok artar
        gameState.difficultyMultiplier += 2;
        gameState.bossActive = false;

        triggerLevelUp(); // Ödül
        spawnEnemies();
    }

    draw() {
        if (!this.active) return;

        CTX.save();
        CTX.translate(this.x, this.y);

        // --- TRACTOR BEAM (Oyuncuyu çekerken) ---
        if (this.state === 'GRABBING_PLAYER') {
            CTX.beginPath();
            CTX.moveTo(0, 0);
            // Oyuncunun boss'a göre konumu
            CTX.lineTo(player.x - this.x, player.y - this.y);
            CTX.strokeStyle = `rgba(0, 255, 255, ${0.3 + Math.random() * 0.2})`;
            CTX.lineWidth = 5 + Math.random() * 5;
            CTX.stroke();

            // "RELOCATING" Text
            CTX.fillStyle = '#00ffff';
            CTX.font = 'bold 20px monospace';
            CTX.fillText("⚠️ RELOCATING SUBJECT ⚠️", 0, 100);
        }

        // --- BOSS GÖVDESİ ---
        // Dönme efekti
        CTX.rotate(this.angle);

        // Katman 1: Dış Halka (Kesik çizgili)
        CTX.beginPath();
        CTX.setLineDash([20, 10]);
        CTX.arc(0, 0, this.radius + this.pulse, 0, Math.PI * 2);
        CTX.strokeStyle = this.phase === 2 ? '#ff0055' : '#00ffff';
        CTX.lineWidth = 4;
        CTX.stroke();
        CTX.setLineDash([]); // Reset

        // Katman 2: Kare (Ters döner)
        CTX.rotate(-this.angle * 2);
        CTX.fillStyle = this.phase === 2 ? 'rgba(50, 0, 0, 0.8)' : 'rgba(0, 50, 50, 0.8)';
        CTX.strokeStyle = '#ffffff';
        CTX.lineWidth = 2;
        const size = this.radius * 1.2;
        CTX.strokeRect(-size / 2, -size / 2, size, size);
        CTX.fillRect(-size / 2, -size / 2, size, size);

        // Katman 3: Çekirdek (Üçgen)
        CTX.rotate(this.angle * 3);
        CTX.beginPath();
        CTX.moveTo(0, -30);
        CTX.lineTo(26, 15);
        CTX.lineTo(-26, 15);
        CTX.closePath();
        CTX.fillStyle = '#fff';
        CTX.shadowBlur = 20;
        CTX.shadowColor = this.phase === 2 ? '#ff0000' : '#00ffff';
        CTX.fill();
        CTX.shadowBlur = 0;

        CTX.restore();
    }
}

const boss2 = new Boss2();