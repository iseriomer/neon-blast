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
    levelEl.innerText = `Level: ${level}`;
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
    // Check if an existing animation is running and remove it to prevent overlap
    const existingAnim = document.getElementById('levelup-floating-text');
    if (existingAnim) {
        existingAnim.remove();
    }

    const levelUpAnim = document.createElement('div');
    levelUpAnim.id = 'levelup-floating-text';
    levelUpAnim.innerText = 'LEVEL UP!';

    // Dynamic styles for the element
    levelUpAnim.style.cssText = `
        position: fixed;
        top: 40%;
        left: 50%;
        transform: translate(-50%, -50%) skew(-5deg);
        font-size: clamp(4rem, 12vw, 8rem);
        font-weight: 900;
        font-family: 'Arial Black', Impact, sans-serif;
        color: #ffd700;
        text-shadow: 6px 6px 0 #b8860b, 0 0 30px rgba(255, 215, 0, 0.8);
        z-index: 100;
        pointer-events: none;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: -2px;
        opacity: 0;
        animation: levelUpPop 1.5s cubic-bezier(0.19, 1, 0.22, 1) forwards;
    `;

    document.body.appendChild(levelUpAnim);

    // Inject styles for the animation if not already present
    if (!document.getElementById('levelup-anim-style')) {
        const style = document.createElement('style');
        style.id = 'levelup-anim-style';
        style.innerHTML = `
            @keyframes levelUpPop {
                0% { 
                    opacity: 0; 
                    transform: translate(-50%, -20%) skew(-10deg) scale(0.5); 
                    filter: blur(10px);
                }
                15% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) skew(-5deg) scale(1.1); 
                    filter: blur(0px);
                }
                30% { 
                    transform: translate(-50%, -50%) skew(-5deg) scale(1); 
                }
                80% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) skew(-5deg) scale(1); 
                    filter: blur(0px);
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -100%) skew(-5deg) scale(1.2); 
                    filter: blur(4px);
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Cleanup after animation finishes
    setTimeout(() => {
        if (levelUpAnim.parentNode) {
            levelUpAnim.parentNode.removeChild(levelUpAnim);
        }
    }, 1500);
}