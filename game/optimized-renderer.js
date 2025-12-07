// optimized-renderer.js - Batch Rendering System
// Dramatically reduces draw calls from 400+ to just a few!

const RenderOptimizer = {
    // Settings
    useShadows: false, // Shadows are EXPENSIVE - disable in late game
    batchRendering: true,

    // Toggle shadows based on object count
    autoAdjustQuality() {
        const totalObjects =
            (projectilePool?.getActiveCount() || 0) +
            (enemyPool?.getActiveCount() || 0) +
            (particlePool?.getActiveCount() || 0);

        // Disable shadows when > 200 objects
        this.useShadows = totalObjects < 200;
    },

    // Batch draw projectiles (MASSIVE performance gain)
    drawProjectilesBatched(projectiles) {
        if (!this.batchRendering || projectiles.length === 0) return;

        // Group by color for batching
        const byColor = {};
        for (const proj of projectiles) {
            if (!byColor[proj.color]) byColor[proj.color] = [];
            byColor[proj.color].push(proj);
        }

        // Draw each color group in ONE path
        for (const color in byColor) {
            const group = byColor[color];

            CTX.beginPath();
            for (const proj of group) {
                CTX.moveTo(proj.x + proj.radius, proj.y);
                CTX.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            }

            CTX.fillStyle = color;

            if (this.useShadows && group.length < 50) {
                CTX.shadowBlur = 5;
                CTX.shadowColor = color;
            }

            CTX.fill();
            CTX.shadowBlur = 0;
        }
    },

    // Batch draw particles
    drawParticlesBatched(particles) {
        if (!this.batchRendering || particles.length === 0) return;

        // Group by Type first
        const byType = { default: [], shockwave: [], star: [] };

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const type = p.type || 'default';
            if (!byType[type]) byType[type] = [];
            byType[type].push(p);
        }

        // 1. Draw Default Particles (Squares)
        if (byType.default.length > 0) {
            this.drawDefaultParticles(byType.default);
        }

        // 2. Draw Shockwaves (Rings)
        if (byType.shockwave.length > 0) {
            const list = byType.shockwave;
            CTX.lineWidth = 3;
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                CTX.beginPath();
                CTX.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                CTX.strokeStyle = p.color;
                CTX.globalAlpha = p.alpha;
                CTX.stroke();
            }
            CTX.globalAlpha = 1;
        }

        // 3. Draw Stars (Spikes/Lines)
        if (byType.star.length > 0) {
            const list = byType.star;
            CTX.lineWidth = 2;
            for (let i = 0; i < list.length; i++) {
                const p = list[i];
                CTX.save();
                CTX.translate(p.x, p.y);
                CTX.rotate(p.rotation);

                CTX.beginPath();
                // Draw a spike/star shape
                CTX.moveTo(-p.radius, 0);
                CTX.lineTo(p.radius, 0);
                CTX.moveTo(0, -p.radius * 0.2);
                CTX.lineTo(0, p.radius * 0.2);

                CTX.strokeStyle = p.color;
                CTX.globalAlpha = p.alpha;
                CTX.stroke();
                CTX.restore();
            }
            CTX.globalAlpha = 1;
        }
    },

    drawDefaultParticles(particles) {
        const byColor = {};

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!byColor[p.color]) byColor[p.color] = [];
            byColor[p.color].push(p);
        }

        for (const color in byColor) {
            const group = byColor[color];
            const alphaBuckets = {};

            for (let i = 0; i < group.length; i++) {
                const p = group[i];
                const alphaKey = Math.max(0.25, Math.round(p.alpha * 4) / 4);
                if (!alphaBuckets[alphaKey]) alphaBuckets[alphaKey] = [];
                alphaBuckets[alphaKey].push(p);
            }

            CTX.fillStyle = color;

            for (const alpha in alphaBuckets) {
                CTX.globalAlpha = parseFloat(alpha);
                CTX.beginPath();

                const bucket = alphaBuckets[alpha];
                for (let i = 0; i < bucket.length; i++) {
                    const p = bucket[i];
                    CTX.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
                }

                CTX.fill();
            }
        }
        CTX.globalAlpha = 1;
    },

    // Optimized enemy rendering (keep individual for variety)
    drawEnemy(enemy) {
        CTX.beginPath();

        // Use simpler shapes in late game
        if (enemyPool.getActiveCount() > 30) {
            CTX.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        } else {
            // Original detailed shapes for early game
            if (enemy.type.name === 'Speedster') {
                CTX.moveTo(enemy.x + enemy.radius, enemy.y);
                CTX.lineTo(enemy.x - enemy.radius, enemy.y + enemy.radius);
                CTX.lineTo(enemy.x - enemy.radius, enemy.y - enemy.radius);
                CTX.closePath();
            } else if (enemy.type.name === 'Tank') {
                CTX.rect(enemy.x - enemy.radius, enemy.y - enemy.radius, enemy.radius * 2, enemy.radius * 2);
            } else {
                CTX.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
            }
        }

        CTX.fillStyle = enemy.freezeTimer > 0 ? '#00ffff' : enemy.color;

        if (this.useShadows && enemyPool.getActiveCount() < 20) {
            CTX.shadowBlur = 10;
            CTX.shadowColor = enemy.color;
        }

        CTX.fill();
        CTX.shadowBlur = 0;

        CTX.fill();
        CTX.shadowBlur = 0;

        // --- NEW: Neon Life Arc (Health Visualization) ---
        // Sadece canı azalmış düşmanlarda göster
        if (enemy.hp < enemy.maxHp) {
            const hpPercent = enemy.hp / enemy.maxHp;
            const arcRadius = enemy.radius + 8;

            // Can durumuna göre renk ve efekt
            let arcColor = '#00ffaa'; // Yüksek Can: Cyan/Yeşil
            let isGlitching = false;

            if (hpPercent < 0.25) {
                arcColor = '#ff0055'; // Kritik: Neon Kırmızı
                isGlitching = true;
            } else if (hpPercent < 0.5) {
                arcColor = '#ffaa00'; // Orta: Altın/Turuncu
            }

            CTX.save();

            // Glitch Efekti: Kritik canda titreme
            if (isGlitching) {
                const shakeX = (Math.random() - 0.5) * 4;
                const shakeY = (Math.random() - 0.5) * 4;
                CTX.translate(shakeX, shakeY);
                if (Math.random() < 0.3) CTX.globalAlpha = 0.5; // Flicker
            }

            // Arkaplan Arkı (Sönük gri)
            CTX.beginPath();
            CTX.arc(enemy.x, enemy.y, arcRadius, Math.PI * 0.8, Math.PI * 2.2);
            CTX.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            CTX.lineWidth = 3;
            CTX.stroke();

            // Can Arkı
            const startAngle = Math.PI * 0.8;
            const endAngle = Math.PI * 0.8 + (Math.PI * 1.4 * hpPercent); // 252 derecelik yay

            CTX.beginPath();
            CTX.arc(enemy.x, enemy.y, arcRadius, startAngle, endAngle);
            CTX.strokeStyle = arcColor;
            CTX.lineWidth = 3;
            CTX.lineCap = 'round';

            // Glow efekti (Sadece high quality modunda)
            if (this.useShadows) {
                CTX.shadowBlur = 5;
                CTX.shadowColor = arcColor;
            }

            CTX.stroke();
            CTX.restore();
        }
    }
};