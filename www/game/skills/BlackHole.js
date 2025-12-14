
// BlackHole.js - Singularity Skill

let blackHole = null; // Global for now as per legacy refactor requirement

function spawnBlackHole() {
    const centerX = CANVAS.width / 2;
    const centerY = CANVAS.height / 2;

    blackHole = {
        x: centerX,
        y: centerY,
        radius: 10,
        targetRadius: 180, // Biraz daha büyük hedef yarıçap
        pullRadius: 900,
        life: 300,
        maxLife: 300,
        rotation: 0,
        particles: [],
        diskElements: []
    };

    // Accretion Disk (Birikim Diski) için detaylar oluştur
    // Bu disk parçaları sürekli dönecek
    const colors = ['#8a2be2', '#4b0082', '#00ffff', '#ff00ff', '#ffffff'];
    for (let i = 0; i < 120; i++) {
        const distBase = 1.1 + Math.random() * 1.5; // Yarıçap çarpanı
        blackHole.diskElements.push({
            angle: Math.random() * Math.PI * 2,
            dist: distBase,
            speed: (3 / distBase) * 0.05 * (Math.random() < 0.5 ? 1 : 0.9), // İç kısımlar daha hızlı döner
            size: Math.random() * 0.2 + 0.05, // Ark uzunluğu (radyan)
            thickness: Math.random() * 3 + 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            alpha: Math.random() * 0.5 + 0.2
        });
    }

    playSound('levelup');
    createExplosion(centerX, centerY, 150, 0);
}

function updateAndDrawBlackHole(dt) {
    if (!blackHole) return;

    blackHole.life -= dt;
    // Olay ufku dönüşü
    blackHole.rotation += 1.5 * dt;

    // Radius Animasyonu (Ease Out Elastic benzeri bir etki ile açılış)
    const lifeRatio = blackHole.life / blackHole.maxLife;
    let currentRadius = blackHole.targetRadius;

    if (lifeRatio > 0.9) {
        // Açılış
        const t = (1 - lifeRatio) * 10; // 0 -> 1
        currentRadius = blackHole.targetRadius * Math.sin(t * Math.PI / 2);
    } else if (lifeRatio < 0.1) {
        // Kapanış - Hızlıca küçül
        const t = lifeRatio * 10; // 1 -> 0
        currentRadius = blackHole.targetRadius * t;
    }

    // Nefes alma efekti (Pulse)
    const pulse = 1 + Math.sin(Date.now() / 150) * 0.05;
    const visualRadius = currentRadius * pulse;

    blackHole.radius = visualRadius; // Mantıksal yarıçapı da güncelle (çekim için)

    // Ölüm
    if (blackHole.life <= 0) {
        createExplosion(blackHole.x, blackHole.y, 500, 50);
        spawnParticles(blackHole.x, blackHole.y, 150, 20, '#9400d3', 10);

        // Şok dalgası efekti (Screen Flash)
        CTX.fillStyle = 'rgba(255, 255, 255, 0.8)';
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        playSound('hit');
        blackHole = null;
        return;
    }

    // ────────────────────────────────────────────────────────────────
    // FİZİK & MANTIK (Çekim Gücü)
    // ────────────────────────────────────────────────────────────────
    const enemies = enemyPool.getActive();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.type.name.includes("Boss")) continue; // Bossları çekmesin

        const dx = blackHole.x - enemy.x;
        const dy = blackHole.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < blackHole.pullRadius) {
            // Çekim gücü
            const pullFactor = (1 - dist / blackHole.pullRadius);
            const force = pullFactor * pullFactor * 25 * dt; // Üstel artış kuvvetli çekim

            const angle = Math.atan2(dy, dx);

            // Spiral Hareketi: Hem merkeze çek, hem döndür
            // Tangential velocity (Teğetsel hız)
            const spinForce = force * 0.8;

            enemy.x += Math.cos(angle) * force;
            enemy.y += Math.sin(angle) * force;
            enemy.x += Math.cos(angle + Math.PI / 2) * spinForce;
            enemy.y += Math.sin(angle + Math.PI / 2) * spinForce;

            // Spaghettification (Görsel deformasyon partikülleri)
            if (Math.random() < 0.3 * pullFactor) {
                // Düşmandan merkeze doğru çizgi partiküller
                blackHole.particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 15,
                    color: enemy.color,
                    width: enemy.radius / 2
                });
            }

            // Olay Ufku Hasarı
            if (dist < visualRadius) {
                enemy.hp -= 40 * dt; // Saniyede ~300 hasar
                if (enemy.hp <= 0) handleEnemyDeath(enemy);
            }
        }
    }

    // ────────────────────────────────────────────────────────────────
    // ÇİZİM (RENDER) - Katman Katman
    // ────────────────────────────────────────────────────────────────
    CTX.save();
    CTX.translate(blackHole.x, blackHole.y);

    // 1. UZAY BÜKÜLMESİ (Dark Halo)
    // Etrafı karartarak kontrast yaratır
    const darkHalo = CTX.createRadialGradient(0, 0, visualRadius, 0, 0, visualRadius * 6);
    darkHalo.addColorStop(0, 'rgba(0,0,0,1)');
    darkHalo.addColorStop(0.4, 'rgba(0,0,0,0.8)');
    darkHalo.addColorStop(1, 'rgba(0,0,0,0)');

    CTX.globalCompositeOperation = 'source-over';
    CTX.beginPath();
    CTX.arc(0, 0, visualRadius * 6, 0, Math.PI * 2);
    CTX.fillStyle = darkHalo;
    CTX.fill();

    // 2. ACCRETION DISK (Birikim Diski) - PARLAK GAZLAR
    // Additive blending ile parlak neon efekti
    CTX.globalCompositeOperation = 'lighter';

    // Arka plan disk parlaması
    const glow = CTX.createRadialGradient(0, 0, visualRadius, 0, 0, visualRadius * 3);
    glow.addColorStop(0, 'rgba(75, 0, 130, 0)');
    glow.addColorStop(0.2, 'rgba(138, 43, 226, 0.4)'); // BlueViolet
    glow.addColorStop(0.5, 'rgba(0, 255, 255, 0.2)'); // Cyan
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');

    CTX.beginPath();
    CTX.arc(0, 0, visualRadius * 3, 0, Math.PI * 2);
    CTX.fillStyle = glow;
    CTX.fill();

    // Dönen Disk Parçacıkları (Swirling Gas)
    blackHole.diskElements.forEach(el => {
        el.angle += el.speed * dt;
        const r = visualRadius * el.dist;

        CTX.beginPath();
        CTX.arc(0, 0, r, el.angle, el.angle + el.size);
        CTX.strokeStyle = el.color;
        CTX.lineWidth = el.thickness;
        CTX.globalAlpha = el.alpha;
        CTX.stroke();
    });

    // 3. PHOTON RING (Foton Halkası)
    // Olay ufkunun hemen dışındaki aşırı parlak ince halka
    CTX.beginPath();
    CTX.arc(0, 0, visualRadius * 1.05, 0, Math.PI * 2);
    CTX.strokeStyle = '#ffffff';
    CTX.lineWidth = 3;
    CTX.shadowBlur = 20;
    CTX.shadowColor = '#00ffff';
    CTX.globalAlpha = 1;
    CTX.stroke();
    CTX.shadowBlur = 0; // Reset

    // 4. EVENT HORIZON (Olay Ufku) - Mutlak Siyah
    CTX.globalCompositeOperation = 'source-over';
    CTX.beginPath();
    CTX.arc(0, 0, visualRadius, 0, Math.PI * 2);
    CTX.fillStyle = '#000000';
    CTX.fill();

    // İç kenar parlaması (Void hissi vermek için)
    CTX.strokeStyle = '#4b0082'; // Indigo
    CTX.lineWidth = 1;
    CTX.stroke();

    CTX.restore();

    // 5. YUTULAN MADDELER (Particles)
    // Merkeze çekilen çizgiler
    CTX.globalCompositeOperation = 'lighter';
    for (let i = blackHole.particles.length - 1; i >= 0; i--) {
        const p = blackHole.particles[i];

        // Hareketi güncelle
        const dx = blackHole.x - p.x;
        const dy = blackHole.y - p.y;
        const dist = Math.hypot(dx, dy);

        // Hızlanarak merkeze git
        p.x += (dx / dist) * 20 * dt;
        p.y += (dy / dist) * 20 * dt;
        p.life -= dt;

        if (p.life <= 0 || dist < 10) {
            blackHole.particles.splice(i, 1);
            continue;
        }

        // Çizim (Uzayan kuyruklu yıldız gibi)
        const tailLength = Math.min(dist, 40);
        const angle = Math.atan2(dy, dx);

        CTX.beginPath();
        CTX.moveTo(p.x, p.y);
        CTX.lineTo(p.x - Math.cos(angle) * tailLength, p.y - Math.sin(angle) * tailLength);
        CTX.strokeStyle = p.color;
        CTX.lineWidth = Math.max(1, p.width * (p.life / 15));
        CTX.globalAlpha = p.life / 15;
        CTX.stroke();
    }

    CTX.globalCompositeOperation = 'source-over';
    CTX.globalAlpha = 1;
}

window.spawnBlackHole = spawnBlackHole;
window.updateAndDrawBlackHole = updateAndDrawBlackHole;
