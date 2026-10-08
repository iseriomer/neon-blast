// player-OPTIMIZED.js - Player System with Projectile Cap

const player = {
    x: CANVAS.width / 2,
    y: CANVAS.height / 2,
    radius: 20
};

function drawPlayer(playerStats, lastShotTime) {
    const coreSkin = (typeof CosmeticsManager !== 'undefined' && CosmeticsManager.getEquipped)
        ? CosmeticsManager.getEquipped('core')
        : 'core_default';

    // Invulnerability flashing (e.g. after Revive)
    if (gameState.invulnerableTimer && gameState.invulnerableTimer > 0) {
        const flashRate = Math.floor(gameState.invulnerableTimer / 100);
        if (flashRate % 2 === 0) {
            CTX.globalAlpha = 0.4;
        }
    }

    const t = Date.now() * 0.002;
    const r = player.radius;
    const color = playerStats.color || '#00ffff';

    function isStarshipCore(skin) {
        return CosmeticVisuals.isShip(skin);
    }
    window.isStarshipCore = isStarshipCore;

    const isShip = isStarshipCore(coreSkin);

    CTX.save();
    CTX.translate(player.x, player.y);

    if (isShip) {
        if (typeof player.angle === 'undefined') player.angle = -Math.PI / 2;
        if (typeof player.targetAngle === 'undefined') player.targetAngle = -Math.PI / 2;

        // Smoothly rotate starship towards firing/aim direction
        let diff = player.targetAngle - player.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        player.angle += diff * 0.22;

        CTX.rotate(player.angle);
    }

    if (RenderOptimizer.useShadows) {
        CTX.shadowBlur = 18;
        CTX.shadowColor = color;
    }

    drawSpacecraftHull(CTX, coreSkin, color, r, t, false);

    CTX.restore();
    CTX.globalAlpha = 1.0;

    // Reload indicator
    const now = Date.now();
    const timeSinceLast = now - lastShotTime;
    const reloadRatio = Math.min(timeSinceLast / playerStats.fireRate, 1);

    CTX.beginPath();
    CTX.arc(player.x, player.y, player.radius * 0.45 * reloadRatio, 0, Math.PI * 2, false);

    if (reloadRatio < 1) {
        CTX.fillStyle = 'rgba(255, 255, 255, 0.4)';
    } else {
        CTX.fillStyle = 'rgba(255, 255, 255, 0.95)';
        if (RenderOptimizer.useShadows) {
            CTX.shadowBlur = 10;
            CTX.shadowColor = 'white';
        }
    }
    CTX.fill();
    CTX.shadowBlur = 0;

    // Shield indicator around player
    if (playerStats.shield > 0) {
        CTX.beginPath();
        CTX.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
        CTX.strokeStyle = 'rgba(0, 255, 255, 0.75)';
        CTX.lineWidth = 3;
        if (RenderOptimizer.useShadows) {
            CTX.shadowBlur = 15;
            CTX.shadowColor = '#00ffff';
        }
        CTX.stroke();
        CTX.shadowBlur = 0;
        CTX.lineWidth = 1;
    }
}

function shoot(targetX, targetY, gameState) {
    const now = Date.now();
    if (now - gameState.lastShotTime < gameState.playerStats.fireRate) return;

    // OPTIMIZATION: Projectile cap to prevent FPS death
    const currentProjectiles = projectilePool.getActiveCount();
    if (currentProjectiles >= MAX_PROJECTILES) {
        // Show warning to player
        if (!window.projectileWarningShown) {
            console.log('‚ö†Ô∏è Maximum projectile limit reached! Consider different perks.');
            window.projectileWarningShown = true;
        }
        return; // Don't shoot if at max
    }

    gameState.lastShotTime = now;

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    player.targetAngle = angle;
    const count = gameState.playerStats.shotCount;
    const spread = gameState.playerStats.spread;
    const startAngle = angle - ((count - 1) * spread) / 2;

    // Main shots
    for (let i = 0; i < count; i++) {
        if (projectilePool.getActiveCount() >= MAX_PROJECTILES) break;

        const currentAngle = startAngle + (i * spread);
        const velocity = {
            x: Math.cos(currentAngle) * (gameState.playerStats.shotSpeed * GAME_SCALE),
            y: Math.sin(currentAngle) * (gameState.playerStats.shotSpeed * GAME_SCALE)
        };
        projectilePool.get(player.x, player.y, velocity, false, gameState.playerStats);
    }

    // Back shot
    if (gameState.playerStats.backShot && projectilePool.getActiveCount() < MAX_PROJECTILES) {
        const backAngle = angle + Math.PI;
        const backVel = {
            x: Math.cos(backAngle) * gameState.playerStats.shotSpeed * GAME_SCALE,
            y: Math.sin(backAngle) * gameState.playerStats.shotSpeed * GAME_SCALE
        };
        projectilePool.get(player.x, player.y, backVel, false, gameState.playerStats);
    }

    // Side cannons
    if (gameState.playerStats.sideCannons && projectilePool.getActiveCount() < MAX_PROJECTILES - 1) {
        const leftAngle = angle - Math.PI / 2;
        const rightAngle = angle + Math.PI / 2;

        projectilePool.get(player.x, player.y, {
            x: Math.cos(leftAngle) * gameState.playerStats.shotSpeed * GAME_SCALE,
            y: Math.sin(leftAngle) * gameState.playerStats.shotSpeed * GAME_SCALE
        }, false, gameState.playerStats);

        projectilePool.get(player.x, player.y, {
            x: Math.cos(rightAngle) * gameState.playerStats.shotSpeed * GAME_SCALE,
            y: Math.sin(rightAngle) * gameState.playerStats.shotSpeed * GAME_SCALE
        }, false, gameState.playerStats);
    }

    // Pulse Reactor: one predictable radial burst every N trigger pulls.
    // It is capped and batched by the existing projectile renderer.
    const stats = gameState.playerStats;
    stats.shotSequence = (stats.shotSequence || 0) + 1;
    if (stats.pulseCore && stats.shotSequence % stats.pulseEvery === 0) {
        const available = MAX_PROJECTILES - projectilePool.getActiveCount();
        const pulseCount = Math.min(stats.pulseProjectiles, available);
        const pulseStats = {
            ...stats,
            shotSize: stats.shotSize * stats.pulseSizeMultiplier,
            piercing: Math.max(1, stats.piercing)
        };
        for (let i = 0; i < pulseCount; i++) {
            const pulseAngle = (i / pulseCount) * Math.PI * 2 + angle * 0.15;
            projectilePool.get(player.x, player.y, {
                x: Math.cos(pulseAngle) * stats.shotSpeed * GAME_SCALE * 0.82,
                y: Math.sin(pulseAngle) * stats.shotSpeed * GAME_SCALE * 0.82
            }, false, pulseStats);
        }
        if (typeof spawnShockwave === 'function') spawnShockwave(player.x, player.y, stats.color);
        playSound('spark_short');
    }

    playSound('shoot');
}

// Global Procedural Core & Starship Renderer
function drawSpacecraftHull(ctx, coreSkin, color, r, t, isHangar = false) {
    if (CosmeticVisuals.drawShip(ctx, coreSkin, color, r, t)) return;
    const isShip = CosmeticVisuals.isShip(coreSkin);

    // 1. PREMIUM STARSHIPS (Aerodynamic Combat Hulls with Plasma Thrusters)
    if (isShip) {
        const flameFlicker = Math.sin(t * 22) * (r * 0.2) + Math.cos(t * 31) * (r * 0.1);
        const flameLen = r * 1.1 + flameFlicker;

        function drawDualThrusters(yOffset, jetColor = '#00ffff') {
            [-yOffset, yOffset].forEach(y => {
                const grad = ctx.createLinearGradient(-r * 0.7, y, -r * 0.7 - flameLen, y);
                grad.addColorStop(0, '#ffffff');
                grad.addColorStop(0.3, jetColor);
                grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.moveTo(-r * 0.65, y - r * 0.18);
                ctx.lineTo(-r * 0.7 - flameLen, y);
                ctx.lineTo(-r * 0.65, y + r * 0.18);
                ctx.closePath();
                ctx.fill();
            });
        }

        switch (coreSkin) {
            case 'core_dragon': {
                drawDualThrusters(r * 0.6, color);
                // Cybernetic Dragon Starfighter Hull
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(r * 1.7, 0); // Nose tip
                ctx.lineTo(r * 0.6, -r * 0.4);
                ctx.lineTo(-r * 0.2, -r * 1.25); // Left dragon wing
                ctx.lineTo(-r * 0.4, -r * 0.5);
                ctx.lineTo(-r * 0.85, -r * 0.75); // Winglet
                ctx.lineTo(-r * 0.65, -r * 0.2);
                ctx.lineTo(-r * 0.75, 0); // Rear tail
                ctx.lineTo(-r * 0.65, r * 0.2);
                ctx.lineTo(-r * 0.85, r * 0.75); // Winglet
                ctx.lineTo(-r * 0.4, r * 0.5);
                ctx.lineTo(-r * 0.2, r * 1.25); // Right dragon wing
                ctx.lineTo(r * 0.6, r * 0.4);
                ctx.closePath();
                ctx.fill();

                // Dragon Spine & Cockpit
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(r * 1.7, 0); ctx.lineTo(-r * 0.6, 0);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(r * 0.35, 0, r * 0.45, r * 0.18, 0, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            case 'core_aurora': {
                drawDualThrusters(r * 0.55, color);
                // Aurora Stealth Interceptor Starship
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(r * 1.6, 0);
                ctx.lineTo(r * 0.4, -r * 0.4);
                ctx.lineTo(-r * 0.6, -r * 1.15);
                ctx.lineTo(-r * 0.45, -r * 0.35);
                ctx.lineTo(-r * 0.75, 0);
                ctx.lineTo(-r * 0.45, r * 0.35);
                ctx.lineTo(-r * 0.6, r * 1.15);
                ctx.lineTo(r * 0.4, r * 0.4);
                ctx.closePath();
                ctx.fill();

                // Aurora Glow Strip
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.8;
                ctx.beginPath();
                ctx.moveTo(r * 1.3, 0);
                ctx.lineTo(-r * 0.3, -r * 0.7);
                ctx.moveTo(r * 1.3, 0);
                ctx.lineTo(-r * 0.3, r * 0.7);
                ctx.stroke();

                // Cockpit Core
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(r * 0.2, 0, r * 0.25, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            case 'core_void_king': {
                drawDualThrusters(r * 0.75, color);
                // Void Dreadnought / Flagship Hull
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(r * 1.65, 0);
                ctx.lineTo(r * 0.8, -r * 0.5);
                ctx.lineTo(r * 0.1, -r * 1.2);
                ctx.lineTo(-r * 0.4, -r * 0.6);
                ctx.lineTo(-r * 0.85, -r * 0.9);
                ctx.lineTo(-r * 0.7, 0);
                ctx.lineTo(-r * 0.85, r * 0.9);
                ctx.lineTo(-r * 0.4, r * 0.6);
                ctx.lineTo(r * 0.1, r * 1.2);
                ctx.lineTo(r * 0.8, r * 0.5);
                ctx.closePath();
                ctx.fill();

                // Crown Wings
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(r * 0.9, -r * 0.55);
                ctx.lineTo(r * 1.25, -r * 0.75);
                ctx.lineTo(r * 0.7, -r * 0.35);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(r * 0.9, r * 0.55);
                ctx.lineTo(r * 1.25, r * 0.75);
                ctx.lineTo(r * 0.7, r * 0.35);
                ctx.closePath();
                ctx.fill();

                // Void Crown Core
                ctx.fillStyle = '#080114';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
                ctx.fill();
                return;
            }
        }
    }

    // 2. NON-SHIP CORES (Stationary Circular Dots + Rich Procedural VFX)
    switch (coreSkin) {
        case 'core_prism': {
            // Sabit nokta Áekirdek + dˆnen kristal prizma fasetleri
            ctx.save();
            ctx.rotate(t * 0.85);
            const sides = 6;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
                const a = (Math.PI * 2 / sides) * i;
                const px = Math.cos(a) * (r * 1.35);
                const py = Math.sin(a) * (r * 1.35);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();

            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            for (let i = 0; i < sides; i++) {
                const a = (Math.PI * 2 / sides) * i;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a) * (r * 1.35), Math.sin(a) * (r * 1.35));
                ctx.stroke();
            }
            ctx.restore();

            // Sabit neon nokta Áekirdek
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            // Elmas k˝r˝lma merkezi
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_pulsar': {
            // Sabit nokta Áekirdek + Áift dˆnen pulsar yˆr¸nge halkalar˝
            const pulse = 1 + Math.sin(t * 4) * 0.12;

            ctx.strokeStyle = color;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.5 * pulse, r * 0.55, t * 1.8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 1.5 * pulse, r * 0.55, -t * 1.8, 0, Math.PI * 2);
            ctx.stroke();

            // Sabit neon nokta Áekirdek
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.42 * pulse, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_singularity': {
            // Sabit nokta Áekirdek + girdapl˝ mor Áekim alan˝
            ctx.save();
            ctx.rotate(t * 1.5);
            const grad = ctx.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.6);
            grad.addColorStop(0, CosmeticVisuals.alpha(color, 0.95));
            grad.addColorStop(0.7, CosmeticVisuals.alpha(color, 0.5));
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.8;
            for (let i = 0; i < 4; i++) {
                const off = (Math.PI / 2) * i;
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.1, off, off + 0.85);
                ctx.stroke();
            }
            ctx.restore();

            // Merkez karanl˝k madde Áekirdek noktas˝
            ctx.fillStyle = '#060114';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_chrono': {
            // Sabit nokta Áekirdek + alt˝n saat mekanizmas˝ & ibreler
            ctx.save();
            ctx.rotate(t * 0.6);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (r * 0.8), Math.sin(a) * (r * 0.8));
                ctx.lineTo(Math.cos(a) * (r * 1.35), Math.sin(a) * (r * 1.35));
                ctx.stroke();
            }
            ctx.restore();

            // Sabit alt˝n nokta Áekirdek
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            // Dˆnen saat ibreleri
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(-t * 2.8) * (r * 0.55), Math.sin(-t * 2.8) * (r * 0.55));
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(t * 1.4) * (r * 0.7), Math.sin(t * 1.4) * (r * 0.7));
            ctx.stroke();
            break;
        }

        case 'core_glitch': {
            // Sabit nokta Áekirdek + RGB kromatik aberasyon & parazit Áizgileri
            const jitter = (Math.floor(Date.now() / 90) % 2 === 0) ? (Math.random() - 0.5) * 4 : 0;
            ctx.fillStyle = CosmeticVisuals.alpha(color, 0.75);
            ctx.beginPath();
            ctx.arc(jitter, -jitter, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = CosmeticVisuals.alpha(color, 0.4);
            ctx.beginPath();
            ctx.arc(-jitter, jitter, r * 0.95, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            for (let y = -r; y <= r; y += 6) {
                ctx.beginPath();
                ctx.moveTo(-r * 0.8, y);
                ctx.lineTo(r * 0.8, y);
                ctx.stroke();
            }
            break;
        }

        case 'core_solar': {
            // Sabit parlak g¸ne˛ noktas˝ + korona alev saÁ˝lmalar˝
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.2;
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i + t;
                const len = r * (1.2 + Math.sin(t * 5 + i) * 0.25);
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (r * 0.8), Math.sin(a) * (r * 0.8));
                ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                ctx.stroke();
            }
            ctx.restore();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_default':
        default: {
            // Klasik Neon: Eski saf parlak neon nokta
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
            ctx.fill();
            break;
        }
    }
}
window.drawSpacecraftHull = drawSpacecraftHull;