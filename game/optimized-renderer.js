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

        // 1. Gruplama: Önce Renge Göre
        const byColor = {};
        
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (!byColor[p.color]) byColor[p.color] = [];
            byColor[p.color].push(p);
        }

        // Çizim Döngüsü
        for (const color in byColor) {
            const group = byColor[color];
            
            // 2. Gruplama: Alpha (Saydamlık) Seviyesine Göre
            // Partikülleri 0.1'lik dilimlere ayırıyoruz (0.9, 0.8, 0.7...)
            // Böylece 1000 draw call yerine maksimum 10 draw call yaparız.
            const alphaBuckets = {};
            
            for (let i = 0; i < group.length; i++) {
                const p = group[i];
                // Alpha'yı 1 ondalık basamağa yuvarla (örn: 0.87 -> 0.9)
                const alphaKey = Math.max(0.1, Math.round(p.alpha * 10) / 10);
                if (!alphaBuckets[alphaKey]) alphaBuckets[alphaKey] = [];
                alphaBuckets[alphaKey].push(p);
            }

            // Her Alpha grubu için tek bir çizim komutu
            CTX.fillStyle = color;
            
            for (const alpha in alphaBuckets) {
                CTX.globalAlpha = parseFloat(alpha);
                CTX.beginPath();
                
                const bucket = alphaBuckets[alpha];
                for (let i = 0; i < bucket.length; i++) {
                    const p = bucket[i];
                    // OPTİMİZASYON: Küçük partiküller için kare çiz (Çok daha hızlı)
                    if (p.radius < 3) {
                        CTX.rect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
                    } else {
                        // Büyükler için daire devam
                        CTX.moveTo(p.x + p.radius, p.y);
                        CTX.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    }
                }
                
                CTX.fill(); // Bu gruptaki TÜM partikülleri tek seferde boya!
            }
        }
        
        // Alpha'yı sıfırla
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

        // Draw HP only for high HP enemies
        if (enemy.hp > 3) {
            CTX.fillStyle = 'white';
            CTX.font = '10px Arial';
            CTX.fillText(enemy.hp, enemy.x - 3, enemy.y + 4);
        }
    }
};