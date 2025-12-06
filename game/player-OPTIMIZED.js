// player-OPTIMIZED.js - Player System with Projectile Cap

const player = {
    x: CANVAS.width / 2,
    y: CANVAS.height / 2,
    radius: 20
};

// Player Visual State
player.rotation = 0;
player.trail = [];

function drawPlayer(playerStats, lastShotTime) {
    // 1. Calculate Rotation (Face Mouse)
    const targetAngle = Math.atan2(gameState.lastMouseY - player.y, gameState.lastMouseX - player.x);
    // Smooth rotation lerp could be added here, but instant is better for twitch shooters
    player.rotation = targetAngle;

    // 2. Update Trail
    if (gameState.gameActive && !gameState.isPaused) {
        player.trail.push({ x: player.x, y: player.y });
        if (player.trail.length > 8) player.trail.shift();
    }

    // 3. Draw Trail
    if (player.trail.length > 2) {
        CTX.beginPath();
        CTX.moveTo(player.trail[0].x, player.trail[0].y);
        for (let i = 1; i < player.trail.length; i++) {
            CTX.lineTo(player.trail[i].x, player.trail[i].y);
        }
        CTX.strokeStyle = `rgba(0, 255, 255, 0.3)`;
        CTX.lineWidth = player.radius;
        CTX.lineCap = 'round';
        CTX.stroke();
    }

    CTX.save();
    CTX.translate(player.x, player.y);
    CTX.rotate(player.rotation);

    // 4. Draw Ship Body (Composite Neon)
    // Main Body (Triangle)
    CTX.beginPath();
    CTX.moveTo(player.radius, 0); // Nose
    CTX.lineTo(-player.radius, player.radius * 0.8); // Left Wing
    CTX.lineTo(-player.radius * 0.5, 0); // Engine indent
    CTX.lineTo(-player.radius, -player.radius * 0.8); // Right Wing
    CTX.closePath();

    CTX.shadowBlur = 15;
    CTX.shadowColor = playerStats.color;
    CTX.fillStyle = '#000'; // Black core
    CTX.fill();

    CTX.strokeStyle = playerStats.color;
    CTX.lineWidth = 2;
    CTX.stroke();

    // Inner Energy Core (Pulsing)
    const pulse = 1 + Math.sin(Date.now() / 100) * 0.2;
    CTX.fillStyle = '#fff';
    CTX.shadowBlur = 20;
    CTX.beginPath();
    CTX.arc(0, 0, 4 * pulse, 0, Math.PI * 2);
    CTX.fill();

    // 5. Draw Engine Glow
    CTX.shadowColor = '#ff4400';
    CTX.shadowBlur = 20;
    CTX.fillStyle = '#ff4400';
    CTX.beginPath();
    CTX.moveTo(-player.radius * 0.5, 0);
    CTX.lineTo(-player.radius * 1.5 - (Math.random() * 10), 0); // Flicker flame
    CTX.lineWidth = 4;
    CTX.strokeStyle = '#ff4400';
    CTX.stroke();

    CTX.restore();
    CTX.shadowBlur = 0; // Reset

    // Reload indicator (Ring around ship)
    const now = Date.now();
    const timeSinceLast = now - lastShotTime;
    const reloadRatio = Math.min(timeSinceLast / playerStats.fireRate, 1);

    if (reloadRatio < 1) {
        // Cooldown Arc
        CTX.beginPath();
        CTX.arc(player.x, player.y, player.radius * 1.5, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * reloadRatio));
        CTX.strokeStyle = `rgba(255, 255, 255, 0.5)`;
        CTX.lineWidth = 2;
        CTX.stroke();
    }

    // Shield indicator
    if (playerStats.shield > 0) {
        const shieldTime = Date.now() / 500;
        CTX.strokeStyle = `rgba(0, 255, 255, ${0.4 + Math.sin(shieldTime) * 0.2})`;
        CTX.lineWidth = 2;
        CTX.shadowBlur = 10;
        CTX.shadowColor = '#00ffff';

        CTX.beginPath();
        // Hexagon Shield
        for (let i = 0; i < 6; i++) {
            const angle = shieldTime + (i * Math.PI / 3);
            const r = player.radius * 2;
            const sx = player.x + Math.cos(angle) * r;
            const sy = player.y + Math.sin(angle) * r;
            if (i === 0) CTX.moveTo(sx, sy);
            else CTX.lineTo(sx, sy);
        }
        CTX.closePath();
        CTX.stroke();
        CTX.shadowBlur = 0;
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

    playSound('shoot');
}