// player-OPTIMIZED.js - Player System with Projectile Cap

const player = {
    x: CANVAS.width / 2,
    y: CANVAS.height / 2,
    radius: 20
};

function drawPlayer(playerStats, lastShotTime) {
    CTX.beginPath();
    CTX.arc(player.x, player.y, player.radius, 0, Math.PI * 2, false);
    CTX.fillStyle = playerStats.color;
    
    // OPTIMIZATION: Only shadow when few objects
    if (RenderOptimizer.useShadows) {
        CTX.shadowBlur = 15;
        CTX.shadowColor = playerStats.color;
    }
    
    CTX.fill();
    CTX.shadowBlur = 0;

    // Reload indicator
    const now = Date.now();
    const timeSinceLast = now - lastShotTime;
    const reloadRatio = Math.min(timeSinceLast / playerStats.fireRate, 1);

    CTX.beginPath();
    CTX.arc(player.x, player.y, player.radius * reloadRatio, 0, Math.PI * 2, false);

    if (reloadRatio < 1) {
        CTX.fillStyle = 'rgba(255, 255, 255, 0.4)';
    } else {
        CTX.fillStyle = 'rgba(255, 255, 255, 0.9)';
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
        CTX.strokeStyle = 'rgba(0, 255, 255, 0.6)';
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

    playSound('shoot');
}