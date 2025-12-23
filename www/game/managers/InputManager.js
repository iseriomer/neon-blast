// InputManager.js - Handles mouse and touch inputs

const activeTouches = new Map();
let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;

class InputManager {
    static init() {
        if (window.joystick) {
            window.joystick.init();
        }

        // --- Touch Event Listeners ---

        // Helpher for coordinate mapping
        function getCanvasCoordinates(clientX, clientY) {
            const rect = CANVAS.getBoundingClientRect();
            const scaleX = CANVAS.width / rect.width;
            const scaleY = CANVAS.height / rect.height; // Should be same as scaleX if aspect preserved
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        }

        CANVAS.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!gameState.gameActive || gameState.isPaused) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
                activeTouches.set(touch.identifier, {
                    x: coords.x,
                    y: coords.y,
                    timestamp: Date.now()
                });
            }
        });

        CANVAS.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!gameState.gameActive || gameState.isPaused) return;

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (activeTouches.has(touch.identifier)) {
                    const t = activeTouches.get(touch.identifier);
                    const coords = getCanvasCoordinates(touch.clientX, touch.clientY);
                    t.x = coords.x;
                    t.y = coords.y;
                    // Update timestamp to keep it "fresh" if we wanted sort by activity, 
                    // but usually creation time is enough for "latest finger" logic.
                    // Let's NOT update timestamp on move to prioritize the *physically latest added* finger
                    // regardless of which one moved last, OR we can prioritize movement.
                    // User asked: "1st finger firing, add 2nd finger -> fire at 2nd, remove 1st -> fire at 2nd".
                    // This implies a "stack" of touches.
                }
            }
        });

        CANVAS.addEventListener('touchend', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                activeTouches.delete(touch.identifier);
            }
        });

        CANVAS.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                activeTouches.delete(touch.identifier);
            }
        });

        // --- Mouse Event Listeners ---

        window.addEventListener('mousedown', (e) => {
            if (e.target.closest('button') || e.target.closest('.perk-card')) return;
            if (!gameState.gameActive || gameState.isPaused) return;
            isMouseDown = true;
            const coords = getCanvasCoordinates(e.clientX, e.clientY);
            mouseX = coords.x;
            mouseY = coords.y;
            // Immediate shot on click is fine, but continuous holding is handled in update()
            shoot(coords.x, coords.y, gameState);
        });

        window.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        window.addEventListener('mouseleave', () => {
            isMouseDown = false;
        });

        window.addEventListener('mousemove', (e) => {
            const coords = getCanvasCoordinates(e.clientX, e.clientY);
            mouseX = coords.x;
            mouseY = coords.y;
            gameState.lastMouseX = coords.x; // Keep legacy support if needed
            gameState.lastMouseY = coords.y;
        });

        window.addEventListener('resize', () => {
            const TARGET_HEIGHT = 1080;
            const ASPECT_RATIO = window.innerWidth / window.innerHeight;

            CANVAS.width = TARGET_HEIGHT * ASPECT_RATIO;
            CANVAS.height = TARGET_HEIGHT;

            GAME_SCALE = 1.0; // Always 1.0 for internally scaled

            // Re-center player if valid
            if (typeof player !== 'undefined') {
                // Optional: Keep player relative position or just center?
                // Let's keep it simple as per original logic
                player.x = CANVAS.width / 2;
                player.y = CANVAS.height / 2;
                player.radius = 20 * GAME_SCALE;
            }
        });
    }

    // Called every frame from main game loop
    static update(gameState) {
        if (!gameState.gameActive || gameState.isPaused) return;

        // 1. Joystick Priority
        if (window.joystick && window.joystick.active) {
            const aimDistance = 500;
            const targetX = player.x + window.joystick.vector.x * aimDistance;
            const targetY = player.y + window.joystick.vector.y * aimDistance;
            shoot(targetX, targetY, gameState);
            return;
        }

        // 2. Touch Priority (Multi-touch handling)
        if (activeTouches.size > 0) {
            // Find the touch with the latest timestamp (most recently added)
            let latestTouch = null;
            let maxTime = -1;

            for (const t of activeTouches.values()) {
                if (t.timestamp > maxTime) {
                    maxTime = t.timestamp;
                    latestTouch = t;
                }
            }

            if (latestTouch) {
                shoot(latestTouch.x, latestTouch.y, gameState);
                return;
            }
        }

        // 3. Mouse Priority
        if (isMouseDown) {
            shoot(mouseX, mouseY, gameState);
        }
    }
}
