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

            CTX.globalCompositeOperation = 'lighter'; // NEON GLOW
            CTX.fill();
            CTX.globalCompositeOperation = 'source-over'; // Reset
            CTX.shadowBlur = 0;
        }
    },

    // Batch draw particles
    // Batch draw particles (Optimized with types)
    drawParticlesBatched(particles) {
        if (!this.batchRendering || particles.length === 0) return;

        // Group by Color -> Type? Or just iterate and minimal state change.
        // Grouping by Color is most important for fillStyle.
        const byColor = {};

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!byColor[p.color]) byColor[p.color] = [];
            byColor[p.color].push(p);
        }

        for (const color in byColor) {
            const group = byColor[color];

            // Batch Alpha buckets
            const alphaBuckets = {};

            for (let i = 0; i < group.length; i++) {
                const p = group[i];
                const alphaKey = Math.max(0.1, Math.round(p.alpha * 4) / 4);
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

                    if (p.type === 'spark') {
                        // Manual Rotated Rect for Spark (Line-like)
                        // Length = radius * 4, Width = radius * 0.5
                        const len = p.radius * 3;
                        const width = Math.max(1, p.radius * 0.5);
                        const c = Math.cos(p.rotation);
                        const s = Math.sin(p.rotation);

                        // Head
                        const hx = p.x;
                        const hy = p.y;
                        // Tail
                        const tx = p.x - c * len;
                        const ty = p.y - s * len;

                        // Perpendicular offset
                        const px = -s * width;
                        const py = c * width;

                        CTX.moveTo(hx + px, hy + py);
                        CTX.lineTo(hx - px, hy - py);
                        CTX.lineTo(tx - px, ty - py);
                        CTX.lineTo(tx + px, ty + py);
                        // Close implicitly by next moveTo or fill
                    } else {
                        // Default Square
                        CTX.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
                    }
                }

                CTX.fill();
            }
        }

        CTX.globalAlpha = 1;
    },

    // Optimized enemy rendering (keep individual for variety)
    // Optimized enemy rendering (keep individual for variety)
    drawEnemy(enemy) {
        // Dynamic Pulse
        const pulse = 1 + Math.sin(Date.now() / 200) * 0.1;
        const color = enemy.freezeTimer > 0 ? '#00ffff' : enemy.color;

        CTX.save();
        CTX.translate(enemy.x, enemy.y);

        // Rotation for some enemies
        if (enemy.type.name === 'Splitter' || enemy.type.name === 'Spawner') {
            CTX.rotate(Date.now() / 1000);
        } else if (enemy.type.name === 'Speedster' || enemy.type.name === 'Dasher') {
            // Speedsters point to player usually, but we don't have player ref here easily
            // We can just rotate by velocity if valid
            // For now specific shapes
        }

        // Draw based on type
        switch (enemy.type.name) {
            case 'Speedster': // Arrow
                // Custom Arrow Draw
                CTX.shadowBlur = 10;
                CTX.shadowColor = color;
                CTX.strokeStyle = color;
                CTX.lineWidth = 2;
                CTX.beginPath();
                CTX.moveTo(enemy.radius, 0);
                CTX.lineTo(-enemy.radius, enemy.radius * 0.7);
                CTX.lineTo(-enemy.radius * 0.5, 0);
                CTX.lineTo(-enemy.radius, -enemy.radius * 0.7);
                CTX.closePath();
                CTX.stroke();
                break;

            case 'Tank': // Hexagon
                FX.drawNeonPoly(CTX, 0, 0, 6, enemy.radius, color);
                // Inner Detail
                CTX.fillStyle = color;
                CTX.globalAlpha = 0.3;
                CTX.beginPath();
                CTX.arc(0, 0, enemy.radius * 0.5, 0, Math.PI * 2);
                CTX.fill();
                CTX.globalAlpha = 1;
                break;

            case 'Splitter': // Cross/Star
                FX.drawNeonPoly(CTX, 0, 0, 4, enemy.radius, color, Math.PI / 4);
                FX.drawNeonPoly(CTX, 0, 0, 4, enemy.radius * 0.6, '#fff', 0);
                break;

            case 'Spawner': // Square
                FX.drawNeonPoly(CTX, 0, 0, 4, enemy.radius, color);
                // Inner rotating square
                CTX.rotate(Date.now() / -500);
                FX.drawNeonPoly(CTX, 0, 0, 4, enemy.radius * 0.5, '#fff');
                break;

            case 'Shielder': // Circle with Aura (Aura drawn in game loop usually, but body here)
                FX.drawNeonCircle(CTX, 0, 0, enemy.radius, color);
                break;

            default: // Basic (Diamond)
                FX.drawNeonPoly(CTX, 0, 0, 4, enemy.radius, color);
        }

        CTX.restore();

        // HP Bar for high HP enemies (Modern Style)
        if (enemy.hp > 3 && enemy.maxHp > 3) {
            const hpPct = enemy.hp / enemy.maxHp;
            const barW = enemy.radius * 2;
            const barH = 4;

            CTX.fillStyle = '#333';
            CTX.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 5, barW, barH);

            CTX.fillStyle = hpPct > 0.5 ? '#0f0' : '#f00';
            CTX.fillRect(enemy.x - enemy.radius, enemy.y + enemy.radius + 5, barW * hpPct, barH);
        }
    }
};