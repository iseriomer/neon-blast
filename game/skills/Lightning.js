
// Lightning.js - Chain Lightning Skill

let lightnings = [];

function spawnChainLightning(x1, y1, x2, y2) {
    lightnings.push({
        x1, y1, x2, y2,
        life: 15, // Biraz daha uzun kalsın
        segments: [],
        color: '#00ffff' // Neon mavisi (Cyan)
    });
}

function updateAndDrawLightnings(dt) {
    // Bloom efekti için ayar (performanslı olması için batch'lemesiz)
    CTX.lineCap = 'round';
    CTX.lineJoin = 'round';

    for (let i = lightnings.length - 1; i >= 0; i--) {
        const bolt = lightnings[i];

        // Segmentleri sadece ilk karede oluştur (Fractal yapısı)
        if (bolt.segments.length === 0) {
            const dist = Math.hypot(bolt.x2 - bolt.x1, bolt.y2 - bolt.y1);
            const steps = Math.max(3, Math.floor(dist / 40)); // Adım sayısı

            let currX = bolt.x1;
            let currY = bolt.y1;
            bolt.segments.push({ x: currX, y: currY });

            for (let s = 1; s < steps; s++) {
                // Doğrusal interpolasyon
                const t = s / steps;
                let tx = bolt.x1 + (bolt.x2 - bolt.x1) * t;
                let ty = bolt.y1 + (bolt.y2 - bolt.y1) * t;

                // Jitter (Rastgele sapma)
                const jitter = (Math.random() - 0.5) * 60;
                tx += jitter;
                ty += jitter;

                bolt.segments.push({ x: tx, y: ty });
            }
            bolt.segments.push({ x: bolt.x2, y: bolt.y2 });
        }

        // ÇİZİM - İki katmanlı (Glow + Core)
        const alpha = bolt.life / 15;

        // 1. Katman: Geniş, renkli dış ışıltı (Glow)
        CTX.beginPath();
        CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let p = 1; p < bolt.segments.length; p++) {
            CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
        }
        CTX.strokeStyle = `rgba(0, 255, 255, ${alpha * 0.6})`; // Cyan Glow
        CTX.lineWidth = 8;
        // ShadowBlur pahalıdır ama sadece yıldırım için değer
        if (lightnings.length < 10) {
            CTX.shadowBlur = 15;
            CTX.shadowColor = '#00ffff';
        }
        CTX.stroke();
        CTX.shadowBlur = 0; // Kapatmayı unutma

        // 2. Katman: İnce, beyaz çekirdek (Core)
        CTX.beginPath();
        CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let p = 1; p < bolt.segments.length; p++) {
            CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
        }
        CTX.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        CTX.lineWidth = 2;
        CTX.stroke();

        bolt.life -= dt;
        if (bolt.life <= 0) {
            lightnings.splice(i, 1);
        }
    }
    // Canvas ayarlarını normale döndür
    CTX.lineCap = 'butt';
    CTX.lineJoin = 'miter';
}

window.spawnChainLightning = spawnChainLightning;
window.updateAndDrawLightnings = updateAndDrawLightnings;
