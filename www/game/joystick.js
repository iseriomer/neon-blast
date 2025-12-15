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
    }

    handleStart(e) {
        if (this.pointerId !== null) return; // Already active

        e.preventDefault();
        this.pointerId = e.pointerId;
        this.active = true;
        this.zone.setPointerCapture(e.pointerId);

        // Position the base where the user touched within the zone
        // If the zone is full screen or large, this allows "floating" joystick behavior
        // But for this request, let's keep it fixed or semi-dynamic.
        // Let's implement a "Dynamic Center" - the joystick appears where you touch inside the zone

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

        // Reset stick
        this.stickElement.style.transform = `translate(0px, 0px)`;
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
        const stickX = Math.cos(angle) * cappedDistance;
        const stickY = Math.sin(angle) * cappedDistance;

        // Update visual
        this.stickElement.style.transform = `translate(${stickX}px, ${stickY}px)`;

        // Update logical vector
        // Normalize 0-1 based on how far we pulled (optional, or just use angle)
        // Usually for shooting, we just want direction. But "how far" can determine firing?
        // Let's rely on simply "active" = firing, and angle = direction.

        this.vector.x = Math.cos(angle);
        this.vector.y = Math.sin(angle);
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
        this.stickElement.style.transform = `translate(0px, 0px)`;
    }
}

// Global instance
window.joystick = new Joystick();
