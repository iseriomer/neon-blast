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

    if (typeof player.angle === 'undefined') player.angle = -Math.PI / 2;
    if (typeof player.targetAngle === 'undefined') player.targetAngle = -Math.PI / 2;

    // Smoothly rotate spacecraft towards firing/aim direction
    let diff = player.targetAngle - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    player.angle += diff * 0.22;

    CTX.save();
    CTX.translate(player.x, player.y);
    CTX.rotate(player.angle);

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
            console.log('⚠️ Maximum projectile limit reached! Consider different perks.');
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

// Global Procedural Starship Hull & Fighter Renderer
function drawSpacecraftHull(ctx, coreSkin, color, r, t, isHangar = false) {
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

    function drawCenterThruster(jetColor = '#00ffff', width = 0.3) {
        const grad = ctx.createLinearGradient(-r * 0.8, 0, -r * 0.8 - flameLen * 1.3, 0);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.35, jetColor);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-r * 0.75, -r * width);
        ctx.lineTo(-r * 0.8 - flameLen * 1.3, 0);
        ctx.lineTo(-r * 0.75, r * width);
        ctx.closePath();
        ctx.fill();
    }

    switch (coreSkin) {
        case 'core_prism': {
            drawDualThrusters(r * 0.55, '#32e8ff');

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.5, 0);
            ctx.lineTo(r * 0.2, -r * 0.45);
            ctx.lineTo(-r * 0.85, -r * 1.15);
            ctx.lineTo(-r * 0.5, -r * 0.4);
            ctx.lineTo(-r * 0.75, 0);
            ctx.lineTo(-r * 0.5, r * 0.4);
            ctx.lineTo(-r * 0.85, r * 1.15);
            ctx.lineTo(r * 0.2, r * 0.45);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(r * 1.5, 0); ctx.lineTo(-r * 0.75, 0);
            ctx.moveTo(r * 0.2, -r * 0.45); ctx.lineTo(-r * 0.75, 0);
            ctx.moveTo(r * 0.2, r * 0.45); ctx.lineTo(-r * 0.75, 0);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(r * 0.6, 0);
            ctx.lineTo(r * 0.05, -r * 0.2);
            ctx.lineTo(-r * 0.25, 0);
            ctx.lineTo(r * 0.05, r * 0.2);
            ctx.closePath();
            ctx.fill();
            break;
        }

        case 'core_pulsar': {
            drawDualThrusters(r * 0.65, '#ffe600');

            [-r * 0.65, r * 0.65].forEach(y => {
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(r * 1.4, y);
                ctx.lineTo(-r * 0.75, y - r * 0.32);
                ctx.lineTo(-r * 0.8, y + r * 0.32);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(r * 0.8, y);
                ctx.lineTo(r * 1.65, y);
                ctx.stroke();
            });

            ctx.fillStyle = 'rgba(20, 20, 35, 0.9)';
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(-r * 0.4, -r * 0.65, r * 0.8, r * 1.3);
            ctx.fill();
            ctx.stroke();

            const pulse = 1 + Math.sin(t * 6) * 0.12;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.45 * pulse, r * 0.2, t * 2, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#ffe600';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_singularity': {
            drawCenterThruster('#d946ef', 0.4);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.5, -r * 0.6);
            ctx.lineTo(r * 0.5, -r * 0.2);
            ctx.lineTo(r * 1.5, r * 0.6);
            ctx.lineTo(r * 0.3, r * 0.4);
            ctx.lineTo(-r * 0.85, r * 0.9);
            ctx.lineTo(-r * 0.6, 0);
            ctx.lineTo(-r * 0.85, -r * 0.9);
            ctx.lineTo(r * 0.3, -r * 0.4);
            ctx.closePath();
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
            ctx.fillStyle = '#050010';
            ctx.fill();
            ctx.strokeStyle = '#d946ef';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const off = (Math.PI * 2 / 3) * i + t * 4;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.38, off, off + 1.2);
                ctx.stroke();
            }
            break;
        }

        case 'core_chrono': {
            drawCenterThruster('#ffd700', 0.35);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(r * 1.55, 0);
            ctx.lineTo(r * 0.5, -r * 0.45);
            ctx.lineTo(r * 0.5, r * 0.45);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i;
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * (r * 0.65), Math.sin(a) * (r * 0.65));
                ctx.lineTo(Math.cos(a) * (r * 1.05), Math.sin(a) * (r * 1.05));
                ctx.stroke();
            }

            ctx.fillStyle = '#170f03';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(Math.cos(-t * 3) * (r * 0.32), Math.sin(-t * 3) * (r * 0.32));
            ctx.moveTo(0, 0); ctx.lineTo(Math.cos(t * 1.5) * (r * 0.38), Math.sin(t * 1.5) * (r * 0.38));
            ctx.stroke();
            break;
        }

        case 'core_glitch': {
            drawDualThrusters(r * 0.48, '#00ff66');

            const jitter = (Math.floor(Date.now() / 70) % 2 === 0) ? (Math.random() - 0.5) * 3.5 : 0;

            ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
            ctx.beginPath();
            ctx.moveTo(r * 1.45 + jitter, -jitter);
            ctx.lineTo(-r * 0.8 + jitter, -r * 0.95 - jitter);
            ctx.lineTo(-r * 0.4 + jitter, -jitter);
            ctx.lineTo(-r * 0.8 + jitter, r * 0.95 - jitter);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 0, 120, 0.7)';
            ctx.beginPath();
            ctx.moveTo(r * 1.45 - jitter, jitter);
            ctx.lineTo(-r * 0.8 - jitter, -r * 0.95 + jitter);
            ctx.lineTo(-r * 0.4 - jitter, jitter);
            ctx.lineTo(-r * 0.8 - jitter, r * 0.95 + jitter);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.45, 0);
            ctx.lineTo(-r * 0.8, -r * 0.95);
            ctx.lineTo(-r * 0.4, 0);
            ctx.lineTo(-r * 0.8, r * 0.95);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(r * 0.2, 0, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_solar': {
            drawDualThrusters(r * 0.5, '#ff5500');

            ctx.fillStyle = 'rgba(255, 100, 0, 0.45)';
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI * 2 / 6) * i + t * 0.8;
                const flareLen = r * (1.1 + Math.sin(t * 5 + i) * 0.25);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(a - 0.25) * (r * 0.65), Math.sin(a - 0.25) * (r * 0.65));
                ctx.lineTo(Math.cos(a) * flareLen, Math.sin(a) * flareLen);
                ctx.lineTo(Math.cos(a + 0.25) * (r * 0.65), Math.sin(a + 0.25) * (r * 0.65));
                ctx.closePath();
                ctx.fill();
            }

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.55, 0);
            ctx.lineTo(r * 0.3, -r * 0.5);
            ctx.lineTo(-r * 0.9, -r * 1.05);
            ctx.lineTo(-r * 0.55, 0);
            ctx.lineTo(-r * 0.9, r * 1.05);
            ctx.lineTo(r * 0.3, r * 0.5);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#fff7b2';
            ctx.beginPath();
            ctx.arc(r * 0.1, 0, r * 0.38, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_dragon': {
            drawDualThrusters(r * 0.45, '#ff3300');

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.6, 0);
            ctx.lineTo(r * 0.8, -r * 0.35);
            ctx.lineTo(r * 0.1, -r * 1.15);
            ctx.lineTo(-r * 0.7, -r * 0.65);
            ctx.lineTo(-r * 0.45, 0);
            ctx.lineTo(-r * 0.7, r * 0.65);
            ctx.lineTo(r * 0.1, r * 1.15);
            ctx.lineTo(r * 0.8, r * 0.35);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#ff1100';
            ctx.beginPath();
            ctx.ellipse(r * 0.6, 0, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(r * 0.65, 0, r * 0.1, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_aurora': {
            drawDualThrusters(r * 0.5, '#00ffcc');

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.4, 0);
            ctx.quadraticCurveTo(r * 0.4, -r * 1.1, -r * 0.8, -r * 0.9);
            ctx.lineTo(-r * 0.45, 0);
            ctx.lineTo(-r * 0.8, r * 0.9);
            ctx.quadraticCurveTo(r * 0.4, r * 1.1, r * 1.4, 0);
            ctx.closePath();
            ctx.fill();

            for (let i = 0; i < 2; i++) {
                const off = i * Math.PI + t * 3;
                ctx.strokeStyle = (i === 0) ? '#00ffcc' : '#a855f7';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 0.75, r * 0.35, off * 0.3, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(r * 0.2, 0, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        case 'core_void_king': {
            drawDualThrusters(r * 0.55, '#c084fc');

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.55, 0);
            ctx.lineTo(r * 0.9, -r * 0.55);
            ctx.lineTo(r * 1.25, -r * 0.75);
            ctx.lineTo(-r * 0.85, -r * 1.05);
            ctx.lineTo(-r * 0.5, 0);
            ctx.lineTo(-r * 0.85, r * 1.05);
            ctx.lineTo(r * 1.25, r * 0.75);
            ctx.lineTo(r * 0.9, r * 0.55);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = '#080114';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#c084fc';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
            ctx.fill();
            break;
        }

        default: {
            drawDualThrusters(r * 0.5, '#00ffff');

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(r * 1.5, 0);
            ctx.lineTo(r * 0.2, -r * 0.35);
            ctx.lineTo(-r * 0.85, -r * 1.05);
            ctx.lineTo(-r * 0.6, -r * 0.4);
            ctx.lineTo(-r * 0.85, -r * 0.35);
            ctx.lineTo(-r * 0.55, 0);
            ctx.lineTo(-r * 0.85, r * 0.35);
            ctx.lineTo(-r * 0.6, r * 0.4);
            ctx.lineTo(-r * 0.85, r * 1.05);
            ctx.lineTo(r * 0.2, r * 0.35);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-r * 0.85, -r * 1.05); ctx.lineTo(-r * 0.4, -r * 1.05);
            ctx.moveTo(-r * 0.85, r * 1.05); ctx.lineTo(-r * 0.4, r * 1.05);
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(r * 0.65, 0);
            ctx.lineTo(r * 0.05, -r * 0.22);
            ctx.lineTo(-r * 0.25, 0);
            ctx.lineTo(r * 0.05, r * 0.22);
            ctx.closePath();
            ctx.fill();
            break;
        }
    }
}
window.drawSpacecraftHull = drawSpacecraftHull;
