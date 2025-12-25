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

function updateProgressBar(score, nextLevelThreshold, previousLevelThreshold = 0) {
    // Calculate progress within current level (starts from 0 after level up)
    const currentProgress = score - previousLevelThreshold;
    const levelRange = nextLevelThreshold - previousLevelThreshold;
    const xpPercentage = (currentProgress / levelRange) * 100;
    xpFillEl.style.width = `${Math.min(xpPercentage, 100)}%`;
    xpTextEl.innerText = `${currentProgress} / ${levelRange}`;
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

let currentLevelDisplayed = 1;

function updateLevelIndicator(level) {
    currentLevelDisplayed = level;
    levelEl.innerText = `${Localization.t('level')}: ${level}`;
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
        fpsCounterEl.innerText = `${Localization.t('fps')}: ${fps}`;
        frameCount = 0;
        lastFrameTime = currentTime;
    }
}

// Global function for Localization system to call
window.updateUIForLanguage = function () {
    updateLevelIndicator(currentLevelDisplayed);
    // FPS will update automatically on next frame
    // Any other manual updates?
};

function showLevelUpAnimation() {
    // Check if an existing animation is running and remove it to prevent overlap
    const existingAnim = document.getElementById('levelup-floating-text');
    if (existingAnim) {
        existingAnim.remove();
    }

    const levelUpAnim = document.createElement('div');
    levelUpAnim.id = 'levelup-floating-text';
    levelUpAnim.innerText = Localization.t('level_up');

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
        text-shadow: 4px 4px 0 #b8860b;
        z-index: 100;
        pointer-events: none;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: -2px;
        opacity: 0;
        will-change: transform, opacity;
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
                }
                15% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) skew(-5deg) scale(1.1); 
                }
                30% { 
                    transform: translate(-50%, -50%) skew(-5deg) scale(1); 
                }
                80% { 
                    opacity: 1; 
                    transform: translate(-50%, -50%) skew(-5deg) scale(1); 
                }
                100% { 
                    opacity: 0; 
                    transform: translate(-50%, -100%) skew(-5deg) scale(1.2); 
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

// --- NEW: General Text Scramble Logic ---
const randomChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!%&";

/**
 * Scrambles text of an element
 * @param {HTMLElement} el 
 * @param {Object} options { finalColor, duration, useSound, onComplete }
 */
function animateTextScramble(el, options = {}) {
    if (!el) return;

    const {
        finalColor = null,
        duration = 600 + Math.random() * 400,
        useSound = true,
        onComplete = null
    } = options;

    // Reset/Prepare state
    el.classList.add('btn-shuffling');

    // Store original text if not already stored
    if (!el.dataset.originalText) {
        el.dataset.originalText = el.innerText;
    }
    const originalText = el.dataset.originalText;
    const themeColor = finalColor || getComputedStyle(el).getPropertyValue('--perk-theme').trim() || '#fff';

    let tickCount = 0;
    const shuffleInterval = setInterval(() => {
        tickCount++;
        if (useSound && tickCount % 3 === 0) {
            if (typeof playSound === 'function') playSound('ui_tick');
        }

        // Randomize color during shuffle (only if it's a themeable element)
        const randomColor = `hsl(${Math.random() * 360}, 70%, 50%)`;
        el.style.setProperty('--perk-theme', randomColor);

        // Scramble text
        let scrambled = "";
        const len = originalText.length;
        for (let i = 0; i < len; i++) {
            scrambled += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
        }
        el.innerText = scrambled;
    }, 40);

    // Stop after duration
    setTimeout(() => {
        clearInterval(shuffleInterval);
        el.classList.remove('btn-shuffling');

        el.innerText = originalText;
        if (finalColor || el.style.getPropertyValue('--perk-theme')) {
            el.style.setProperty('--perk-theme', themeColor);
        }

        if (useSound && typeof playSound === 'function') playSound('ui_lock');
        if (onComplete) onComplete();
    }, duration);
}

function animateButton(buttonEl, finalColor = null) {
    if (!buttonEl) return;
    buttonEl.classList.remove('locked-in');
    buttonEl.style.pointerEvents = 'none';

    animateTextScramble(buttonEl, {
        finalColor: finalColor,
        useSound: true,
        onComplete: () => {
            buttonEl.classList.add('locked-in');
            buttonEl.style.pointerEvents = 'auto';
        }
    });
}

// Global Exports
window.animateTextScramble = animateTextScramble;
window.animateButton = animateButton;