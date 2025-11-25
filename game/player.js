// player.js - Player System

const player = {
    x: CANVAS.width / 2,
    y: CANVAS.height / 2,
    radius: 20
};

function drawPlayer(playerStats, lastShotTime) {
    CTX.beginPath();
    CTX.arc(player.x, player.y, player.radius, 0, Math.PI * 2, false);
    CTX.fillStyle = playerStats.color;
    CTX.shadowBlur = 15;
    CTX.shadowColor = playerStats.color;
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
        CTX.shadowBlur = 10;
        CTX.shadowColor = 'white';
    }
    CTX.fill();
    CTX.shadowBlur = 0;

    // Shield indicator around player
    if (playerStats.shield > 0) {
        CTX.beginPath();
        CTX.arc(player.x, player.y, player.radius + 10, 0, Math.PI * 2);
        CTX.strokeStyle = 'rgba(0, 255, 255, 0.6)';
        CTX.lineWidth = 3;
        CTX.shadowBlur = 15;
        CTX.shadowColor = '#00ffff';
        CTX.stroke();
        CTX.shadowBlur = 0;
        CTX.lineWidth = 1;
    }
}

function shoot(targetX, targetY, gameState) {
    const now = Date.now();
    if (now - gameState.lastShotTime < gameState.playerStats.fireRate) return;
    gameState.lastShotTime = now;

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const count = gameState.playerStats.shotCount;
    const spread = gameState.playerStats.spread;
    const startAngle = angle - ((count - 1) * spread) / 2;

    for (let i = 0; i < count; i++) {
        const currentAngle = startAngle + (i * spread);
        const velocity = {
            x: Math.cos(currentAngle) * (gameState.playerStats.shotSpeed * GAME_SCALE),
            y: Math.sin(currentAngle) * (gameState.playerStats.shotSpeed * GAME_SCALE)
        };
        projectilePool.get(player.x, player.y, velocity, false, gameState.playerStats);
    }

    if (gameState.playerStats.backShot) {
        const backAngle = angle + Math.PI;
        const backVel = {
            x: Math.cos(backAngle) * gameState.playerStats.shotSpeed,
            y: Math.sin(backAngle) * gameState.playerStats.shotSpeed
        };
        projectilePool.get(player.x, player.y, backVel, false, gameState.playerStats);
    }

    if (gameState.playerStats.sideCannons) {
        const leftAngle = angle - Math.PI / 2;
        const rightAngle = angle + Math.PI / 2;
        projectilePool.get(player.x, player.y, {
            x: Math.cos(leftAngle) * gameState.playerStats.shotSpeed,
            y: Math.sin(leftAngle) * gameState.playerStats.shotSpeed
        }, false, gameState.playerStats);
        projectilePool.get(player.x, player.y, {
            x: Math.cos(rightAngle) * gameState.playerStats.shotSpeed,
            y: Math.sin(rightAngle) * gameState.playerStats.shotSpeed
        }, false, gameState.playerStats);
    }

    playSound('shoot');
}