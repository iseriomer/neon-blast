
// Lightning.js - Chain Lightning Skill

let lightnings = [];

function spawnChainLightning(x1, y1, x2, y2, color = '#00ffff') {
    lightnings.push({
        x1, y1, x2, y2,
        life: 15, // Biraz daha uzun kalsın
        segments: [],
        color: color // Custom color
    });
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 255, b: 255 };
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
        const rgb = hexToRgb(bolt.color);

        // 1. Katman: Geniş, renkli dış ışıltı (Glow)
        CTX.beginPath();
        CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
        for (let p = 1; p < bolt.segments.length; p++) {
            CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
        }
        CTX.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha * 0.6})`; // Custom Color Glow
        CTX.lineWidth = 8;

        // Offset glow (much faster than shadowBlur)
        if (lightnings.length < 10) {
            // Draw offset layers for glow effect
            CTX.globalAlpha = alpha * 0.2;
            for (let offset = 1; offset <= 2; offset++) {
                CTX.save();
                CTX.translate(offset, offset);
                CTX.beginPath();
                CTX.moveTo(bolt.segments[0].x, bolt.segments[0].y);
                for (let p = 1; p < bolt.segments.length; p++) {
                    CTX.lineTo(bolt.segments[p].x, bolt.segments[p].y);
                }
                CTX.strokeStyle = bolt.color;
                CTX.lineWidth = 10;
                CTX.stroke();
                CTX.restore();
            }
            CTX.globalAlpha = 1;
        }

        CTX.stroke();

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
