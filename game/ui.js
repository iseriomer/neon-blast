// ui.js - UI Management

const xpFillEl = document.getElementById('xp-fill');
const xpTextEl = document.getElementById('xp-text');
const shieldIndicatorEl = document.getElementById('shield-indicator');
const levelEl = document.getElementById('level-indicator');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const levelUpScreen = document.getElementById('levelup-screen');
const perkListEl = document.getElementById('perk-list');
const finalScoreEl = document.getElementById('final-score');
const fpsCounterEl = document.getElementById('fps-counter');

function updateProgressBar(score, nextLevelThreshold) {
    const xpPercentage = (score / nextLevelThreshold) * 100;
    xpFillEl.style.width = `${Math.min(xpPercentage, 100)}%`;
    xpTextEl.innerText = `${score} / ${nextLevelThreshold}`;
}

function updateXPBarColor(color) {
    if (color) {
        xpFillEl.style.background = color;
        // Also update the glow if possible, but simple background change is effective
        xpFillEl.style.boxShadow = `0 0 15px ${color}`;
    }
}

function updateShieldIndicator(shield) {
    shieldIndicatorEl.innerHTML = '';
    for (let i = 0; i < shield; i++) {
        const shieldIcon = document.createElement('div');
        shieldIcon.innerText = '🛡️';
        shieldIcon.style.filter = 'drop-shadow(0 0 5px cyan)';
        shieldIndicatorEl.appendChild(shieldIcon);
    }
}

function updateLevelIndicator(level) {
    levelEl.innerText = `Seviye: ${level}`;
}

// FPS Counter
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 60;

function updateFPS() {
    frameCount++;
    const currentTime = performance.now();
    const elapsed = currentTime - lastFrameTime;

    if (elapsed >= 1000) {
        fps = Math.round((frameCount * 1000) / elapsed);
        fpsCounterEl.innerText = `FPS: ${fps}`;
        frameCount = 0;
        lastFrameTime = currentTime;
    }
}

function showLevelUpAnimation() {
    const levelUpAnim = document.createElement('div');
    levelUpAnim.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 5rem;
        font-weight: bold;
        color: #ffd700;
        text-shadow: 0 0 30px #ffd700;
        z-index: 40;
        animation: levelUpPulse 1.2s ease-out;
        pointer-events: none;
    `;
    levelUpAnim.innerText = 'LEVEL UP!';
    document.body.appendChild(levelUpAnim);

    if (!document.getElementById('levelup-anim-style')) {
        const style = document.createElement('style');
        style.id = 'levelup-anim-style';
        style.innerHTML = `
            @keyframes levelUpPulse {
                0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
                50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                100% { opacity: 0; transform: translate(-50%, -50%) scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        document.body.removeChild(levelUpAnim);
    }, 1200);
}