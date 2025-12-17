// Joystick.js - Virtual Joystick for Mobile Aiming
// Designed to be simple and plug-and-play

class Joystick {
    constructor() {
        this.active = false;
        this.vector = { x: 0, y: 0 }; // Normalized vector (-1 to 1)
        this.angle = 0; // In radians
        this.baseElement = null;
        this.stickElement = null;
        this.maxRadius = 50; // Max distance stick can move from center
        this.center = { x: 0, y: 0 };
        this.pointerId = null;

        // Optimization: Separate visual state
        this.currentStickX = 0;
        this.currentStickY = 0;
        this.rafId = null;
    }

    init() {
        this.zone = document.getElementById('joystick-zone');
        this.baseElement = document.getElementById('joystick-base');
        this.stickElement = document.getElementById('joystick-stick');

        if (!this.zone || !this.baseElement || !this.stickElement) {
            console.error('Joystick elements not found!');
            return;
        }

        // Use pointer events for better compatibility (mouse + touch)
        this.zone.addEventListener('pointerdown', this.handleStart.bind(this));
        window.addEventListener('pointermove', this.handleMove.bind(this));
        window.addEventListener('pointerup', this.handleEnd.bind(this));
        window.addEventListener('pointercancel', this.handleEnd.bind(this));

        // Bind render function once
        this.render = this.render.bind(this);
    }

    handleStart(e) {
        if (this.pointerId !== null) return; // Already active

        e.preventDefault();
        this.pointerId = e.pointerId;
        this.active = true;
        this.zone.setPointerCapture(e.pointerId);

        // Position the base where the user touched within the zone
        // If the zone is full screen or large, this allows "floating" joystick behavior
        const rect = this.zone.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        // Show joystick at touch position
        this.baseElement.style.display = 'block';
        this.baseElement.style.left = x + 'px';
        this.baseElement.style.top = y + 'px';

        // Center for calculations
        this.center.x = x;
        this.center.y = y;

        // Reset stick data
        this.currentStickX = 0;
        this.currentStickY = 0;

        // Start render loop
        if (!this.rafId) {
            this.rafId = requestAnimationFrame(this.render);
        }
    }

    handleMove(e) {
        if (!this.active || e.pointerId !== this.pointerId) return;
        e.preventDefault();

        const x = e.clientX;
        const y = e.clientY;

        const dx = x - this.center.x;
        const dy = y - this.center.y;
        const distance = Math.hypot(dx, dy);

        // Calculate normalized vector
        const angle = Math.atan2(dy, dx);
        this.angle = angle;

        // Cap the stick movement
        const cappedDistance = Math.min(distance, this.maxRadius);

        // Update logical state (cheap)
        this.currentStickX = Math.cos(angle) * cappedDistance;
        this.currentStickY = Math.sin(angle) * cappedDistance;

        // Update logical vector for game loop usage
        this.vector.x = Math.cos(angle);
        this.vector.y = Math.sin(angle);
    }

    render() {
        if (!this.active) {
            this.rafId = null;
            return;
        }

        // Apply visual transform (expensive part, done on RAF)
        this.stickElement.style.transform = `translate(-50%, -50%) translate(${this.currentStickX}px, ${this.currentStickY}px)`;

        this.rafId = requestAnimationFrame(this.render);
    }

    handleEnd(e) {
        if (e.pointerId !== this.pointerId) return;
        e.preventDefault();

        this.active = false;
        this.pointerId = null;
        this.vector.x = 0;
        this.vector.y = 0;

        // Hide joystick
        this.baseElement.style.display = 'none';
        this.stickElement.style.transform = `translate(-50%, -50%) translate(0px, 0px)`;

        // Stop Loop
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }
}

// Global instance
window.joystick = new Joystick();
