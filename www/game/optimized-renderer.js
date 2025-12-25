// optimized-renderer.js - Batch Rendering System
// Dramatically reduces draw calls from 400+ to just a few!

const RenderOptimizer = {
    // Settings
    useShadows: false, // Shadows are EXPENSIVE - disable in late game
    batchRendering: true,
    qualityCheckTimer: 0,

    // Reusable containers to prevent GC (Zero-Allocation approach)
    _projGroups: {},
    _partGroups: { default: [], shockwave: [], star: [] },
    _partColorGroups: {},
    _strokeColorGroups: {},
    _alphaBuckets: {}, // Reusable alpha buckets

    // Toggle shadows based on object count
    autoAdjustQuality() {
        // Throttle: Only check every 60 frames (approx 1 sec)
        this.qualityCheckTimer++;
        if (this.qualityCheckTimer < 60) return;
        this.qualityCheckTimer = 0;

        const totalObjects =
            (projectilePool?.getActiveCount() || 0) +
            (enemyPool?.getActiveCount() || 0) +
            (particlePool?.getActiveCount() || 0);

        // Disable shadows when > 200 objects
        this.useShadows = totalObjects < 200;
    },

    // Helper to clear an object's arrays without deleting keys (Pooling)
    _clearGroups(groups) {
        for (const key in groups) {
            groups[key].length = 0;
        }
    },

    // Batch draw projectiles (MASSIVE performance gain)
    drawProjectilesBatched(projectiles) {
        if (!this.batchRendering || projectiles.length === 0) return;

        // 1. Clear & Reuse Groups
        this._clearGroups(this._projGroups);

        // 2. Group by color
        for (let i = 0; i < projectiles.length; i++) {
            const proj = projectiles[i];
            if (!this._projGroups[proj.color]) {
                this._projGroups[proj.color] = [];
            }
            this._projGroups[proj.color].push(proj);
        }

        // 3. Draw each color group
        for (const color in this._projGroups) {
            const group = this._projGroups[color];
            if (group.length === 0) continue;

            CTX.beginPath();
            for (let i = 0; i < group.length; i++) {
                const proj = group[i];
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

        // Reset Typed Groups
        this._partGroups.default.length = 0;
        this._partGroups.shockwave.length = 0;
        this._partGroups.star.length = 0;

        // Group by Type
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const type = p.type || 'default';
            // Safety check if new types added dynamically
            if (this._partGroups[type]) {
                this._partGroups[type].push(p);
            } else {
                // Fallback for unknown types (create if needed, but risky for GC)
                // Better to map to default
                this._partGroups.default.push(p);
            }
        }

        // 1. Draw Default Particles (Squares)
        if (this._partGroups.default.length > 0) {
            this.drawDefaultParticles(this._partGroups.default);
        }

        // 2. Draw Shockwaves (Rings)
        if (this._partGroups.shockwave.length > 0) {
            this.renderStrokeBatch(this._partGroups.shockwave, 3, (ctx, p) => {
                // OPTIMIZATION: Use integer render coordinates
                const r = p.radius | 0;
                ctx.moveTo(p.renderX + r, p.renderY);
                ctx.arc(p.renderX, p.renderY, r, 0, Math.PI * 2);
            });
        }

        // 3. Draw Stars (Spikes/Lines)
        if (this._partGroups.star.length > 0) {
            this.renderStrokeBatch(this._partGroups.star, 2, (ctx, p) => {
                const c = Math.cos(p.rotation);
                const s = Math.sin(p.rotation);
                const r = p.radius | 0; // OPTIMIZATION: Round radius
                const rOffset = (r * 0.2) | 0;
                const x = p.renderX; // OPTIMIZATION: Use integer coords
                const y = p.renderY;

                // Main Axis
                ctx.moveTo(x - r * c, y - r * s);
                ctx.lineTo(x + r * c, y + r * s);

                // Cross Axis
                ctx.moveTo(x + rOffset * s, y - rOffset * c);
                ctx.lineTo(x - rOffset * s, y + rOffset * c);
            });
        }
    },

    drawDefaultParticles(particles) {
        // Reuse color groups
        this._clearGroups(this._partColorGroups);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!this._partColorGroups[p.color]) {
                this._partColorGroups[p.color] = [];
            }
            this._partColorGroups[p.color].push(p);
        }

        for (const color in this._partColorGroups) {
            const group = this._partColorGroups[color];
            if (group.length === 0) continue;

            // Reuse alpha buckets
            this._clearGroups(this._alphaBuckets);

            for (let i = 0; i < group.length; i++) {
                const p = group[i];
                const alphaKey = Math.max(0.1, Math.round(p.alpha * 5) / 5);
                // Convert key to string implies GC? Keys are strings. 
                // However, caching limited number of keys (0.2, 0.4 etc) is fine.
                if (!this._alphaBuckets[alphaKey]) this._alphaBuckets[alphaKey] = [];
                this._alphaBuckets[alphaKey].push(p);
            }

            CTX.fillStyle = color;

            for (const alpha in this._alphaBuckets) {
                const bucket = this._alphaBuckets[alpha];
                if (bucket.length === 0) continue;

                CTX.globalAlpha = parseFloat(alpha);
                CTX.beginPath();

                for (let i = 0; i < bucket.length; i++) {
                    const p = bucket[i];
                    // OPTIMIZATION: Use integer render coordinates
                    const r = p.radius | 0;
                    CTX.rect(p.renderX - r, p.renderY - r, r * 2, r * 2);
                }

                CTX.fill();
            }
        }
        CTX.globalAlpha = 1;
    },

    // Helper for Batched Strokes (Shockwaves, Stars) to reduce draw calls
    renderStrokeBatch(particles, lineWidth, pathCallback) {
        this._clearGroups(this._strokeColorGroups);

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!this._strokeColorGroups[p.color]) {
                this._strokeColorGroups[p.color] = [];
            }
            this._strokeColorGroups[p.color].push(p);
        }

        CTX.lineWidth = lineWidth;

        for (const color in this._strokeColorGroups) {
            const group = this._strokeColorGroups[color];
            if (group.length === 0) continue;

            // Reuse alpha buckets (shared is fine as we process sequentially)
            this._clearGroups(this._alphaBuckets);

            // Group by alpha (0.1 steps for smooth enough fades)
            for (let i = 0; i < group.length; i++) {
                const p = group[i];
                const alphaKey = Math.max(0.0, Math.floor(p.alpha * 10) / 10);
                if (alphaKey <= 0) continue;

                if (!this._alphaBuckets[alphaKey]) this._alphaBuckets[alphaKey] = [];
                this._alphaBuckets[alphaKey].push(p);
            }

            CTX.strokeStyle = color;

            for (const alphaStr in this._alphaBuckets) {
                const bucket = this._alphaBuckets[alphaStr];
                if (bucket.length === 0) continue;

                const alpha = parseFloat(alphaStr);
                CTX.globalAlpha = alpha;
                CTX.beginPath();

                for (let i = 0; i < bucket.length; i++) {
                    pathCallback(CTX, bucket[i]);
                }

                CTX.stroke();
            }
        }
        CTX.globalAlpha = 1;
    },

    // Optimized enemy rendering (keep individual for variety)
    drawEnemy(enemy) {
        // Optimization: Use custom draw method if it exists on the instance (Boss minions)
        if (Object.prototype.hasOwnProperty.call(enemy, 'draw') && typeof enemy.draw === 'function') {
            enemy.draw();
            return;
        }

        // Customized Spawner Renderer (Optimized)
        if (enemy.type.name === 'Spawner') {
            CTX.save();
            CTX.translate(enemy.x, enemy.y);

            // Optimization: Calculate time once per frame globally if possible, but here is fine
            const time = Date.now() / 1000;
            const pulse = 1 + Math.sin(time * 3) * 0.1;

            // 1. Outer Hexagon
            CTX.save();
            CTX.rotate(time * 0.5);
            CTX.strokeStyle = enemy.type.color;
            CTX.lineWidth = 3;
            if (this.useShadows) {
                CTX.shadowBlur = 10;
                CTX.shadowColor = enemy.type.color;
            }

            CTX.beginPath();
            const sides = 6;
            const r = enemy.radius * 1.2;
            for (let i = 0; i < sides; i++) {
                const angle = (i / sides) * Math.PI * 2;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                if (i === 0) CTX.moveTo(x, y);
                else CTX.lineTo(x, y);
            }
            CTX.closePath();
            CTX.stroke();
            CTX.restore();

            // 2. Inner Portal
            CTX.beginPath();
            CTX.arc(0, 0, enemy.radius * 0.6 * pulse, 0, Math.PI * 2);
            CTX.fillStyle = 'black';
            CTX.fill();
            CTX.strokeStyle = '#fff';
            CTX.lineWidth = 2;
            CTX.stroke();

            // 3. Orbiting Particles (Simple dots, no shadow for performance)
            CTX.fillStyle = '#fff';
            for (let i = 0; i < 3; i++) {
                const angle = time * 2 + (i * (Math.PI * 2 / 3));
                const px = Math.cos(angle) * (enemy.radius * 0.8);
                const py = Math.sin(angle) * (enemy.radius * 0.8);
                CTX.beginPath();
                CTX.arc(px, py, 4, 0, Math.PI * 2);
                CTX.fill();
            }

            CTX.restore();
            return;
        }

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
    },

    // OPTIMIZATION: Batched Enemy Rendering (15-20% FPS gain)
    drawEnemiesBatched(enemies) {
        if (!this.batchRendering || enemies.length === 0) {
            // Fallback to individual rendering
            enemies.forEach(enemy => this.drawEnemy(enemy));
            return;
        }

        // Separate special enemies (with custom draw methods) from batch-able ones
        const batchableEnemies = [];
        const specialEnemies = [];

        for (const enemy of enemies) {
            if (Object.prototype.hasOwnProperty.call(enemy, 'draw') &&
                typeof enemy.draw === 'function') {
                specialEnemies.push(enemy);
            } else {
                batchableEnemies.push(enemy);
            }
        }

        // Draw special enemies individually
        for (const enemy of specialEnemies) {
            enemy.draw();
        }

        // Draw Spawners separately (they have complex rendering)
        const spawners = [];
        const regularEnemies = [];

        for (const enemy of batchableEnemies) {
            if (enemy.type.name === 'Spawner') {
                spawners.push(enemy);
            } else {
                regularEnemies.push(enemy);
            }
        }

        // Render Spawners individually (too complex to batch)
        for (const enemy of spawners) {
            this.drawEnemy(enemy);
        }

        // Batch regular enemies by type and color
        const batches = new Map();

        for (const enemy of regularEnemies) {
            const color = enemy.freezeTimer > 0 ? '#00ffff' : enemy.color;
            const key = `${enemy.type.name}-${color}`;

            if (!batches.has(key)) {
                batches.set(key, {
                    type: enemy.type,
                    color: color,
                    enemies: []
                });
            }
            batches.get(key).enemies.push(enemy);
        }

        // Draw each batch
        const totalEnemies = enemyPool?.getActiveCount() || 0;

        for (const [key, batch] of batches) {
            CTX.fillStyle = batch.color;

            // Enable shadows only for small batches
            if (this.useShadows && batch.enemies.length < 20 && totalEnemies < 50) {
                CTX.shadowBlur = 10;
                CTX.shadowColor = batch.color;
            }

            CTX.beginPath();

            // Draw all enemies of this type in one path
            for (const enemy of batch.enemies) {
                const x = enemy.x | 0; // OPTIMIZATION: Integer coords
                const y = enemy.y | 0;
                const r = enemy.radius | 0;

                // Use simple shapes for high enemy counts
                if (totalEnemies > 30) {
                    CTX.moveTo(x + r, y);
                    CTX.arc(x, y, r, 0, Math.PI * 2);
                } else {
                    // Detailed shapes for low counts
                    if (batch.type.name === 'Speedster') {
                        // Triangle
                        CTX.moveTo(x + r, y);
                        CTX.lineTo(x - r, y + r);
                        CTX.lineTo(x - r, y - r);
                        CTX.closePath();
                        CTX.moveTo(0, 0); // Reset path
                    } else if (batch.type.name === 'Tank') {
                        // Square
                        CTX.rect(x - r, y - r, r * 2, r * 2);
                    } else {
                        // Circle
                        CTX.moveTo(x + r, y);
                        CTX.arc(x, y, r, 0, Math.PI * 2);
                    }
                }
            }

            CTX.fill();
            CTX.shadowBlur = 0;
        }

        // Draw health arcs in second pass (revised: allow drawing even without shadows, and up to higher enemy counts)
        if (totalEnemies < 200) {
            this.drawHealthArcs(regularEnemies);
        }
    },

    // Helper: Draw health arcs for damaged enemies
    drawHealthArcs(enemies) {
        for (const enemy of enemies) {
            if (enemy.hp >= enemy.maxHp) continue;

            const hpPercent = enemy.hp / enemy.maxHp;
            const arcRadius = enemy.radius + 8;
            const x = enemy.x | 0;
            const y = enemy.y | 0;

            let arcColor = '#00ffaa';
            let isGlitching = false;

            if (hpPercent < 0.25) {
                arcColor = '#ff0055';
                isGlitching = true;
            } else if (hpPercent < 0.5) {
                arcColor = '#ffaa00';
            }

            CTX.save();

            // Glitch effect for critical health
            if (isGlitching && Math.random() < 0.3) {
                const shakeX = (Math.random() - 0.5) * 4;
                const shakeY = (Math.random() - 0.5) * 4;
                CTX.translate(shakeX, shakeY);
                if (Math.random() < 0.3) CTX.globalAlpha = 0.5;
            }

            // Background arc
            CTX.beginPath();
            CTX.arc(x, y, arcRadius, Math.PI * 0.8, Math.PI * 2.2);
            CTX.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            CTX.lineWidth = 3;
            CTX.stroke();

            // Health arc
            const startAngle = Math.PI * 0.8;
            const endAngle = startAngle + (Math.PI * 1.4 * hpPercent);

            CTX.beginPath();
            CTX.arc(x, y, arcRadius, startAngle, endAngle);
            CTX.strokeStyle = arcColor;
            CTX.lineWidth = 3;
            CTX.lineCap = 'round';
            CTX.stroke();

            CTX.restore();
        }
        CTX.lineCap = 'butt'; // Reset
    }
};