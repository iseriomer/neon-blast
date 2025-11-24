// game.js - Main Game Loop and State Management

// Game State
const gameState = {
    animationId: null,
    score: 0,
    level: 1,
    nextLevelThreshold: 1000,
    gameActive: false,
    isPaused: false,
    spawnInterval: null,
    difficultyMultiplier: 1,
    lastShotTime: 0,
    nuclearBombTimer: 0,
    timeWarpActive: false,
    timeWarpTimer: 0,
    lastMouseX: 0,
    lastMouseY: 0,
    playerStats: { ...DEFAULT_PLAYER_STATS }
};

// Input State
let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;

// Spawn Enemies
function spawnEnemies() {
    let spawnRate = 1000 - (gameState.difficultyMultiplier * 50);
    if (spawnRate < 200) spawnRate = 200;

    gameState.spawnInterval = setInterval(() => {
        if (gameState.isPaused || !gameState.gameActive) return;

        let type = ENEMY_TYPES.BASIC;
        const rand = Math.random();

        if (gameState.difficultyMultiplier > 4 && rand < 0.15) type = ENEMY_TYPES.SPAWNER;
        else if (gameState.difficultyMultiplier > 3 && rand < 0.25) type = ENEMY_TYPES.SPLITTER;
        else if (gameState.difficultyMultiplier > 2 && rand < 0.35) type = ENEMY_TYPES.TANK;
        else if (gameState.difficultyMultiplier > 3 && rand < 0.5) type = ENEMY_TYPES.DASHER;
        else if (gameState.difficultyMultiplier > 1 && rand < 0.6) type = ENEMY_TYPES.SPEEDSTER;

        const radius = type.radius;
        let x, y;
        if (Math.random() < 0.5) {
            x = Math.random() < 0.5 ? 0 - radius : CANVAS.width + radius;
            y = Math.random() * CANVAS.height;
        } else {
            x = Math.random() * CANVAS.width;
            y = Math.random() < 0.5 ? 0 - radius : CANVAS.height + radius;
        }

        enemyPool.get(x, y, type, gameState.difficultyMultiplier);
    }, spawnRate);
}

// Level Up System
function triggerLevelUp() {
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);
    playSound('levelup');

    showLevelUpAnimation();

    setTimeout(() => {
        const shuffled = ALL_PERKS.sort(() => 0.5 - Math.random());

        let availablePerks = shuffled;
        if (gameState.playerStats.shield >= gameState.playerStats.maxShields) {
            availablePerks = shuffled.filter(p => p.id !== 'energy_shield');
        }

        const selectedPerks = availablePerks.slice(0, 3);

        perkListEl.innerHTML = '';
        selectedPerks.forEach(perk => {
            const div = document.createElement('div');
            div.className = 'perk-card';
            div.innerHTML = `
                <div class="perk-title">${perk.title}</div>
                <div class="perk-desc">${perk.desc}</div>
            `;
            div.onclick = () => selectPerk(perk);
            perkListEl.appendChild(div);
        });

        levelUpScreen.classList.remove('hidden');
    }, 1200);
}

function selectPerk(perk) {
    perk.apply(gameState.playerStats);

    gameState.level++;
    gameState.nextLevelThreshold += 1000;
    gameState.difficultyMultiplier += 0.5;

    updateLevelIndicator(gameState.level);
    updateShieldIndicator(gameState.playerStats.shield);
    updateProgressBar(gameState.score, gameState.nextLevelThreshold);
    levelUpScreen.classList.add('hidden');

    gameState.isPaused = false;
    spawnEnemies();
    animate();
}

// Collision Detection (Optimized)
function checkCollisions() {
    const projectiles = projectilePool.getActive();
    const enemies = enemyPool.getActive();
    
    // Check enemy-player collisions
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        
        if (distPlayer - enemy.radius - player.radius < 1) {
            if (gameState.playerStats.shield > 0) {
                gameState.playerStats.shield--;
                updateShieldIndicator(gameState.playerStats.shield);

                CTX.fillStyle = 'rgba(0, 255, 255, 0.3)';
                CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

                enemies.forEach(e => spawnParticles(e.x, e.y, 20, 5, '#00ffff'));
                enemyPool.releaseAll();
                playSound('levelup');
            } else {
                gameOver();
                return;
            }
        }

        // Check projectile-enemy collisions
        for (let j = projectiles.length - 1; j >= 0; j--) {
            const projectile = projectiles[j];
            
            if (projectile.hitList.includes(enemy.id)) continue;

            const distProj = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y);

            if (distProj - enemy.radius - projectile.radius < 1) {
                projectile.hitList.push(enemy.id);
                projectile.penetration--;

                let damage = 1;
                if (gameState.playerStats.execute && enemy.hp / enemy.maxHp < 0.3) {
                    damage = 999;
                    spawnParticles(enemy.x, enemy.y, 10, 3, 'red', 2);
                }
                enemy.hp -= damage;

                if (gameState.playerStats.knockback > 0) {
                    const kbAngle = Math.atan2(enemy.y - projectile.y, enemy.x - projectile.x);
                    enemy.x += Math.cos(kbAngle) * gameState.playerStats.knockback;
                    enemy.y += Math.sin(kbAngle) * gameState.playerStats.knockback;
                }

                if (gameState.playerStats.freeze > 0) {
                    enemy.freezeTimer = gameState.playerStats.freeze;
                }

                playSound('hit');
                
                const particleCount = enemy.radius * gameState.playerStats.explosionSize * 0.5;
                spawnParticles(projectile.x, projectile.y, particleCount, 3, enemy.color);

                if (gameState.playerStats.cluster && !projectile.isSplit) {
                    spawnParticles(projectile.x, projectile.y, 3, 4, 'orange');
                }

                if (gameState.playerStats.splitShot && !projectile.isSplit) {
                    for (let s = 0; s < 3; s++) {
                        const splitAngle = Math.random() * Math.PI * 2;
                        const splitVel = {
                            x: Math.cos(splitAngle) * gameState.playerStats.shotSpeed * 0.8,
                            y: Math.sin(splitAngle) * gameState.playerStats.shotSpeed * 0.8
                        };
                        projectilePool.get(projectile.x, projectile.y, splitVel, true, gameState.playerStats);
                    }
                }

                if (projectile.penetration <= 0) {
                    projectilePool.release(projectile);
                }

                if (enemy.hp <= 0) {
                    gameState.score += enemy.type.score;

                    // Splitter logic
                    if (enemy.type.name === 'Splitter') {
                        const splitCount = 2 + Math.floor(Math.random() * 2);
                        for (let s = 0; s < splitCount; s++) {
                            const splitAngle = (Math.PI * 2 / splitCount) * s;
                            const splitX = enemy.x + Math.cos(splitAngle) * 30;
                            const splitY = enemy.y + Math.sin(splitAngle) * 30;
                            enemyPool.get(splitX, splitY, ENEMY_TYPES.MINI_SPLITTER, gameState.difficultyMultiplier);
                        }
                    }

                    // Chain Lightning
                    if (gameState.playerStats.chainLightning > 0) {
                        let chainTargets = [];
                        enemies.forEach(e => {
                            if (e.id !== enemy.id) {
                                const dist = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                                if (dist < 150) {
                                    chainTargets.push({ enemy: e, dist: dist });
                                }
                            }
                        });

                        chainTargets.sort((a, b) => a.dist - b.dist);
                        const chainCount = Math.min(gameState.playerStats.chainLightning, chainTargets.length);

                        for (let c = 0; c < chainCount; c++) {
                            const target = chainTargets[c].enemy;
                            target.hp -= 1;
                            spawnParticles(
                                enemy.x + (target.x - enemy.x) * 0.5,
                                enemy.y + (target.y - enemy.y) * 0.5,
                                5, 3, '#ffff00'
                            );
                        }
                    }

                    // Explosive Radius
                    if (gameState.playerStats.explosiveRadius > 0) {
                        enemies.forEach(e => {
                            if (e.id !== enemy.id) {
                                const dist = Math.hypot(e.x - enemy.x, e.y - enemy.y);
                                if (dist < gameState.playerStats.explosiveRadius) {
                                    e.hp -= 1;
                                    spawnParticles(e.x, e.y, 1, 4, '#ff6600');
                                }
                            }
                        });

                        for (let i = 0; i < 20; i++) {
                            const angle = (i / 20) * Math.PI * 2;
                            particlePool.get(
                                enemy.x + Math.cos(angle) * 20,
                                enemy.y + Math.sin(angle) * 20,
                                3, '#ff6600',
                                {
                                    x: Math.cos(angle) * 3,
                                    y: Math.sin(angle) * 3
                                }
                            );
                        }
                    }

                    enemyPool.release(enemy);
                    spawnParticles(enemy.x, enemy.y, 10, 5, enemy.color, 2);
                }

                updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                if (gameState.score >= gameState.nextLevelThreshold) {
                    triggerLevelUp();
                }
            }
        }
    }
}

// Main Animation Loop
function animate() {
    if (!gameState.gameActive || gameState.isPaused) return;
    gameState.animationId = requestAnimationFrame(animate);

    updateFPS();

    CTX.fillStyle = 'rgba(5, 5, 5, 0.1)';
    CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

    drawPlayer(gameState.playerStats, gameState.lastShotTime);

    // Laser Beam
    if (gameState.playerStats.laserBeam && (isTouching || gameState.lastMouseX)) {
        const angle = Math.atan2(
            (gameState.lastMouseY || touchStartY) - player.y,
            (gameState.lastMouseX || touchStartX) - player.x
        );
        const laserEndX = player.x + Math.cos(angle) * 2000;
        const laserEndY = player.y + Math.sin(angle) * 2000;

        CTX.beginPath();
        CTX.moveTo(player.x, player.y);
        CTX.lineTo(laserEndX, laserEndY);
        CTX.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        CTX.lineWidth = 3;
        CTX.shadowBlur = 15;
        CTX.shadowColor = '#ff0000';
        CTX.stroke();
        CTX.shadowBlur = 0;
        CTX.lineWidth = 1;

        enemyPool.getActive().forEach(enemy => {
            const distToLine = Math.abs(
                (laserEndY - player.y) * enemy.x - 
                (laserEndX - player.x) * enemy.y + 
                laserEndX * player.y - laserEndY * player.x
            ) / Math.hypot(laserEndY - player.y, laserEndX - player.x);
            const distToPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);

            if (distToLine < enemy.radius + 10 && distToPlayer < 2000) {
                enemy.hp -= 0.02;
                if (enemy.hp <= 0) {
                    gameState.score += enemy.type.score;
                    enemyPool.release(enemy);
                    updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                }
            }
        });
    }

    // Nuclear Bomb
    if (gameState.playerStats.nuclearBomb) {
        gameState.nuclearBombTimer++;
        if (gameState.nuclearBombTimer >= 600) {
            gameState.nuclearBombTimer = 0;
            spawnParticles(player.x, player.y, 100, 8, '#ff6600', 3);
            enemyPool.getActive().forEach(enemy => { enemy.hp -= 3; });
            playSound('hit');
        }
    }

    // Orbitals
    if (gameState.playerStats.orbitals > 0) {
        const orbitalTime = Date.now() / 500;
        for (let i = 0; i < gameState.playerStats.orbitals; i++) {
            const angle = orbitalTime + (i * (Math.PI * 2 / gameState.playerStats.orbitals));
            const ox = player.x + Math.cos(angle) * 60;
            const oy = player.y + Math.sin(angle) * 60;

            CTX.beginPath();
            CTX.arc(ox, oy, 10, 0, Math.PI * 2);
            CTX.fillStyle = '#00ffff';
            CTX.shadowBlur = 10;
            CTX.shadowColor = '#00ffff';
            CTX.fill();
            CTX.shadowBlur = 0;

            enemyPool.getActive().forEach(enemy => {
                const dist = Math.hypot(ox - enemy.x, oy - enemy.y);
                if (dist < enemy.radius + 10) {
                    enemy.hp -= 0.1;
                    if (enemy.hp <= 0) {
                        gameState.score += enemy.type.score;
                        enemyPool.release(enemy);
                        updateProgressBar(gameState.score, gameState.nextLevelThreshold);
                    }
                }
            });
        }
    }

    // Update particles
    particlePool.update(particle => particle.update());

    // Update projectiles
    projectilePool.update(projectile => {
        return projectile.update(enemyPool.getActive(), gameState.playerStats);
    });

    // Update enemies
    enemyPool.getActive().forEach(enemy => enemy.update(player));

    // Check collisions
    checkCollisions();
}

// Initialize Game
function initGame() {
    gameState.score = 0;
    gameState.level = 1;
    gameState.nextLevelThreshold = 1000;
    gameState.difficultyMultiplier = 0;
    gameState.nuclearBombTimer = 0;
    gameState.timeWarpActive = false;
    gameState.timeWarpTimer = 0;

    projectilePool.releaseAll();
    enemyPool.releaseAll();
    particlePool.releaseAll();

    gameState.playerStats = { ...DEFAULT_PLAYER_STATS };

    updateLevelIndicator(1);
    updateProgressBar(0, 1000);
    updateShieldIndicator(0);
    
    gameState.gameActive = true;
    gameState.isPaused = false;

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    animate();
    spawnEnemies();
}

function gameOver() {
    gameState.gameActive = false;
    gameState.isPaused = true;
    clearInterval(gameState.spawnInterval);
    finalScoreEl.innerText = `Toplam Skor: ${gameState.score} - Seviye: ${gameState.level}`;
    gameOverScreen.classList.remove('hidden');
}

// Event Listeners
CANVAS.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameState.gameActive || gameState.isPaused) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isTouching = true;

    shoot(touchStartX, touchStartY, gameState);
});

CANVAS.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!gameState.gameActive || gameState.isPaused || !isTouching) return;

    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

CANVAS.addEventListener('touchend', (e) => {
    e.preventDefault();
    isTouching = false;
});

setInterval(() => {
    if (isTouching && gameState.gameActive && !gameState.isPaused) {
        shoot(touchStartX, touchStartY, gameState);
    }
}, 100);

window.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.perk-card')) return;
    if (!gameState.gameActive || gameState.isPaused) return;
    gameState.lastMouseX = e.clientX;
    gameState.lastMouseY = e.clientY;
    shoot(e.clientX, e.clientY, gameState);
});

window.addEventListener('mousemove', (e) => {
    gameState.lastMouseX = e.clientX;
    gameState.lastMouseY = e.clientY;
});

window.addEventListener('resize', () => {
    CANVAS.width = window.innerWidth;
    CANVAS.height = window.innerHeight;
    player.x = CANVAS.width / 2;
    player.y = CANVAS.height / 2;
});

document.getElementById('start-btn').addEventListener('click', initGame);
document.getElementById('restart-btn').addEventListener('click', initGame);