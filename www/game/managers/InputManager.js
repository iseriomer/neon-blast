// InputManager.js - Handles mouse and touch inputs

let touchStartX = 0;
let touchStartY = 0;
let isTouching = false;
let isMouseDown = false;

class InputManager {
    static init() {
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

        // Unified Auto-Fire Interval (approx 60 FPS)
        setInterval(() => {
            if ((isTouching || isMouseDown) && gameState.gameActive && !gameState.isPaused) {
                const targetX = isTouching ? touchStartX : gameState.lastMouseX;
                const targetY = isTouching ? touchStartY : gameState.lastMouseY;
                shoot(targetX, targetY, gameState);
            }
        }, 16);

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('.perk-card')) return;
            if (!gameState.gameActive || gameState.isPaused) return;
            isMouseDown = true;
            gameState.lastMouseX = e.clientX;
            gameState.lastMouseY = e.clientY;
            shoot(e.clientX, e.clientY, gameState);
        });

        window.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        window.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            gameState.lastMouseX = e.clientX;
            gameState.lastMouseY = e.clientY;
        });

        window.addEventListener('resize', () => {
            CANVAS.width = window.innerWidth;
            CANVAS.height = window.innerHeight;
            GAME_SCALE = Math.max(window.innerWidth / BASE_SCREEN_WIDTH, 0.6);
            player.x = CANVAS.width / 2;
            player.y = CANVAS.height / 2;
            player.radius = 20 * GAME_SCALE;
        });
    }
}
