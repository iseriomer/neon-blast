// particle.js - Particle System

class Particle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.color = 'white';
        this.velocity = { x: 0, y: 0 };
        this.alpha = 1;
    }

    reset(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    draw() {
        CTX.save();
        CTX.globalAlpha = this.alpha;
        CTX.beginPath();
        CTX.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        CTX.fillStyle = this.color;
        CTX.shadowBlur = 10;
        CTX.shadowColor = this.color;
        CTX.fill();
        CTX.shadowBlur = 0;
        CTX.restore();
    }

    update() {
        this.draw();
        this.velocity.x *= FRICTION;
        this.velocity.y *= FRICTION;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.015;

        // Return true if particle should be removed
        return this.alpha <= 0;
    }
}

// Particle Pool
const particlePool = new ObjectPool(
    () => new Particle(),
    (particle, x, y, radius, color, velocity) => {
        particle.reset(x, y, radius, color, velocity);
    },
    POOL_SIZES.PARTICLE
);

// Helper function to spawn particles
function spawnParticles(x, y, count, radius, color, velocityMultiplier = 1) {
    for (let i = 0; i < count; i++) {
        particlePool.get(
            x, y,
            Math.random() * radius,
            color,
            {
                x: (Math.random() - 0.5) * (Math.random() * 8 * velocityMultiplier),
                y: (Math.random() - 0.5) * (Math.random() * 8 * velocityMultiplier)
            }
        );
    }
}