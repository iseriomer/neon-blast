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

    CTX.save();
    CTX.translate(player.x, player.y);

    if (RenderOptimizer.useShadows) {
        CTX.shadowBlur = 16;
        CTX.shadowColor = color;
    }

    switch (coreSkin) {
        case 'core_prism': {
            // Rotating Hexagonal Prismatic Crystal Hull
            const sides = 6;
            const angleStep = (Math.PI * 2) / sides;
            CTX.rotate(t * 0.5);

            // Outer Crystal Hexagon
            CTX.beginPath();
            for (let i = 0; i < sides; i++) {
                const a = i * angleStep;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) CTX.moveTo(px, py);
                else CTX.lineTo(px, py);
            }
            CTX.closePath();
            CTX.fillStyle = color;
            CTX.fill();

            // Inner Prismatic Facet lines
            CTX.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            CTX.lineWidth = 1.5;
            CTX.beginPath();
            for (let i = 0; i < sides; i++) {
                const a = i * angleStep;
                CTX.moveTo(0, 0);
                CTX.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            CTX.stroke();

            // Inner Crystal Core
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.35, 0, Math.PI * 2);
            CTX.fillStyle = '#ffffff';
            CTX.fill();
            break;
        }

        case 'core_pulsar': {
            // Stellar Pulsar Core with dual rotating rings and pulse radiation
            const pulse = 1 + Math.sin(t * 4) * 0.08;
            
            // Dual Orbiting Rings
            CTX.lineWidth = 2.5;
            CTX.strokeStyle = color;
            CTX.beginPath();
            CTX.ellipse(0, 0, r * 1.2 * pulse, r * 0.45, t * 1.5, 0, Math.PI * 2);
            CTX.stroke();

            CTX.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            CTX.beginPath();
            CTX.ellipse(0, 0, r * 1.2 * pulse, r * 0.45, -t * 1.5, 0, Math.PI * 2);
            CTX.stroke();

            // Dense Center Star
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.65 * pulse, 0, Math.PI * 2);
            CTX.fillStyle = '#ffffff';
            CTX.fill();

            CTX.beginPath();
            CTX.arc(0, 0, r * 0.85, 0, Math.PI * 2);
            CTX.strokeStyle = color;
            CTX.lineWidth = 2;
            CTX.stroke();
            break;
        }

        case 'core_singularity': {
            // Pitch-Black Event Horizon with Spinning Violet/Magenta Accretion Disk
            CTX.rotate(t * 1.2);
            // Outer Accretion Glow
            const accGrad = CTX.createRadialGradient(0, 0, r * 0.5, 0, 0, r * 1.35);
            accGrad.addColorStop(0, 'rgba(200, 0, 255, 0.9)');
            accGrad.addColorStop(0.7, 'rgba(0, 255, 255, 0.6)');
            accGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            CTX.fillStyle = accGrad;
            CTX.beginPath();
            CTX.arc(0, 0, r * 1.35, 0, Math.PI * 2);
            CTX.fill();

            // Accretion Swirl Jets
            CTX.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            CTX.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                const offset = (Math.PI / 2) * i;
                CTX.beginPath();
                CTX.arc(0, 0, r * 0.9, offset, offset + 0.9);
                CTX.stroke();
            }

            // Dark Void Event Horizon
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.55, 0, Math.PI * 2);
            CTX.fillStyle = '#050010';
            CTX.fill();
            CTX.strokeStyle = '#d946ef';
            CTX.lineWidth = 1.5;
            CTX.stroke();
            break;
        }

        case 'core_chrono': {
            // Chrono Dial Hull with 8 Chrono Notches & Runic Hands
            CTX.rotate(t * 0.4);
            CTX.beginPath();
            CTX.arc(0, 0, r, 0, Math.PI * 2);
            CTX.fillStyle = color;
            CTX.fill();

            // Notches
            CTX.strokeStyle = '#ffd700';
            CTX.lineWidth = 2.5;
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI * 2 / 8) * i;
                CTX.beginPath();
                CTX.moveTo(Math.cos(a) * (r * 0.7), Math.sin(a) * (r * 0.7));
                CTX.lineTo(Math.cos(a) * (r * 1.05), Math.sin(a) * (r * 1.05));
                CTX.stroke();
            }

            // Central dial
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.45, 0, Math.PI * 2);
            CTX.fillStyle = '#1a1005';
            CTX.fill();
            CTX.strokeStyle = '#ffd700';
            CTX.stroke();

            // Clock needles
            CTX.strokeStyle = '#ffffff';
            CTX.lineWidth = 2;
            CTX.beginPath();
            CTX.moveTo(0, 0);
            CTX.lineTo(Math.cos(-t * 2) * (r * 0.35), Math.sin(-t * 2) * (r * 0.35));
            CTX.moveTo(0, 0);
            CTX.lineTo(Math.cos(t * 1.2) * (r * 0.4), Math.sin(t * 1.2) * (r * 0.4));
            CTX.stroke();
            break;
        }

        case 'core_glitch': {
            // Unstable Shifting Polygons with Chromatic Aberration
            const jitter = (Math.floor(Date.now() / 60) % 2 === 0) ? (Math.random() - 0.5) * 4 : 0;
            // Cyan split hull
            CTX.beginPath();
            CTX.arc(jitter, -jitter, r, 0, Math.PI * 2);
            CTX.fillStyle = 'rgba(0, 255, 255, 0.75)';
            CTX.fill();

            // Magenta split hull
            CTX.beginPath();
            CTX.arc(-jitter, jitter, r * 0.95, 0, Math.PI * 2);
            CTX.fillStyle = 'rgba(255, 0, 100, 0.75)';
            CTX.fill();

            // Digital grid scanlines across core
            CTX.strokeStyle = '#ffffff';
            CTX.lineWidth = 1;
            for (let y = -r; y <= r; y += 7) {
                CTX.beginPath();
                CTX.moveTo(-r * 0.7, y);
                CTX.lineTo(r * 0.7, y);
                CTX.stroke();
            }
            break;
        }

        case 'core_solar': {
            // Blazing Corona Flares with Hyperdense Golden Core
            const flares = 8;
            CTX.fillStyle = 'rgba(255, 140, 0, 0.45)';
            for (let i = 0; i < flares; i++) {
                const a = (Math.PI * 2 / flares) * i + t * 0.8;
                const flareLen = r * (1.1 + Math.sin(t * 5 + i) * 0.25);
                CTX.beginPath();
                CTX.moveTo(0, 0);
                CTX.lineTo(Math.cos(a - 0.2) * (r * 0.7), Math.sin(a - 0.2) * (r * 0.7));
                CTX.lineTo(Math.cos(a) * flareLen, Math.sin(a) * flareLen);
                CTX.lineTo(Math.cos(a + 0.2) * (r * 0.7), Math.sin(a + 0.2) * (r * 0.7));
                CTX.closePath();
                CTX.fill();
            }

            CTX.beginPath();
            CTX.arc(0, 0, r * 0.8, 0, Math.PI * 2);
            CTX.fillStyle = color;
            CTX.fill();

            CTX.beginPath();
            CTX.arc(0, 0, r * 0.45, 0, Math.PI * 2);
            CTX.fillStyle = '#fff7b2';
            CTX.fill();
            break;
        }

        case 'core_dragon': {
            // Neon Dragon Crest: Horns, sweeping flame arcs, draconic eye
            const pulse = 1 + Math.sin(t * 4) * 0.08;
            CTX.fillStyle = color;
            CTX.beginPath();
            CTX.moveTo(0, -r * 1.35 * pulse);
            CTX.quadraticCurveTo(r * 0.8, -r * 0.7, r * 1.2, -r * 0.1);
            CTX.quadraticCurveTo(r * 0.6, -r * 0.2, 0, 0);
            CTX.quadraticCurveTo(-r * 0.6, -r * 0.2, -r * 1.2, -r * 0.1);
            CTX.quadraticCurveTo(-r * 0.8, -r * 0.7, 0, -r * 1.35 * pulse);
            CTX.closePath();
            CTX.fill();

            // Dragon Heart Sphere
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.75, 0, Math.PI * 2);
            CTX.fillStyle = '#ff2200';
            CTX.fill();

            // Ember Eye / Core
            CTX.fillStyle = '#ffea00';
            CTX.beginPath();
            CTX.ellipse(0, 0, r * 0.35, r * 0.55 * pulse, 0, 0, Math.PI * 2);
            CTX.fill();

            CTX.fillStyle = '#ffffff';
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.2, 0, Math.PI * 2);
            CTX.fill();
            break;
        }

        case 'core_aurora': {
            // Undulating Borealis Light Ribbons
            CTX.rotate(t * 0.6);
            for (let i = 0; i < 3; i++) {
                const off = (Math.PI * 2 / 3) * i;
                const waveR = r * (0.85 + Math.sin(t * 3 + i) * 0.15);
                CTX.strokeStyle = (i === 0) ? '#00ff88' : (i === 1) ? '#00e5ff' : '#a855f7';
                CTX.lineWidth = 2.5;
                CTX.beginPath();
                CTX.arc(0, 0, waveR, off, off + Math.PI * 0.9);
                CTX.stroke();
            }

            // Luminescent Borealis Nucleus
            CTX.fillStyle = '#00ffcc';
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            CTX.fill();

            CTX.fillStyle = '#ffffff';
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.25, 0, Math.PI * 2);
            CTX.fill();
            break;
        }

        case 'core_void_king': {
            // Royal Dark Matter Crown with Amethyst Jewel
            CTX.rotate(t * 0.3);
            // 5-point Crown spikes
            CTX.fillStyle = color;
            CTX.beginPath();
            const points = 5;
            for (let i = 0; i < points; i++) {
                const a = (Math.PI * 2 / points) * i;
                const aMid = a + Math.PI / points;
                if (i === 0) CTX.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                else CTX.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                CTX.lineTo(Math.cos(aMid) * (r * 0.7), Math.sin(aMid) * (r * 0.7));
            }
            CTX.closePath();
            CTX.fill();

            // Singularity Void Sphere
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.6, 0, Math.PI * 2);
            CTX.fillStyle = '#080114';
            CTX.fill();
            CTX.strokeStyle = '#c084fc';
            CTX.lineWidth = 2;
            CTX.stroke();

            // Crown Jewel
            CTX.fillStyle = '#ffffff';
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.25, 0, Math.PI * 2);
            CTX.fill();
            break;
        }

        default: {
            // Classic High-Tech Neon Sphere with Conduit Ring
            CTX.beginPath();
            CTX.arc(0, 0, r, 0, Math.PI * 2, false);
            CTX.fillStyle = color;
            CTX.fill();

            CTX.strokeStyle = '#ffffff';
            CTX.lineWidth = 1.8;
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.72, 0, Math.PI * 2);
            CTX.stroke();

            CTX.fillStyle = '#ffffff';
            CTX.beginPath();
            CTX.arc(0, 0, r * 0.38, 0, Math.PI * 2);
            CTX.fill();
            break;
        }
    }

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
