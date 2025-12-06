// particle.js - Particle System (OPTIMIZED)

class Particle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.color = 'white';
        this.velocity = { x: 0, y: 0 };
        this.alpha = 1;
    }

    reset(x, y, radius, color, velocity, type = 'default') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.type = type; // 'default', 'spark', 'smoke', 'text'
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;

        if (type === 'spark') {
            // Sparks align with velocity
            this.rotation = Math.atan2(velocity.y, velocity.x);
            this.rotationSpeed = 0;
            this.radius *= 2; // Longer
        }
    }

    // draw() METODUNU SİLDİK! 
    // Çizim işlemi artık tamamen RenderOptimizer'da yapılacak.

    update(dt = 1) {
        // Gereksiz draw() çağrısı kaldırıldı.
        // Sadece fizik hesaplamaları kaldı.

        this.velocity.x *= Math.pow(FRICTION, dt);
        this.velocity.y *= Math.pow(FRICTION, dt);
        this.x += this.velocity.x * dt;
        this.y += this.velocity.y * dt;
        this.alpha -= 0.03 * dt;
        // ADD: Cull off-screen particles (saves draw calls)
        const margin = 100;
        if (this.x < -margin || this.x > CANVAS.width + margin ||
            this.y < -margin || this.y > CANVAS.height + margin) {
            return true; // Remove
        }
        // Return true if particle should be removed
        return this.alpha <= 0;
    }
}

// Particle Pool (Aynen kalıyor)
const particlePool = new ObjectPool(
    () => new Particle(),
    (particle, x, y, radius, color, velocity, type) => {
        particle.reset(x, y, radius, color, velocity, type);
    },
    POOL_SIZES.PARTICLE
);

// Helper function (Aynen kalıyor)
// Add particle cap to spawn function
function spawnParticles(x, y, count, radius, color, velocityMultiplier = 1, type = 'default') {
    // ADD THIS CHECK
    if (particlePool.getActiveCount() >= MAX_PARTICLES) {
        return; // Don't spawn if at cap
    }

    // Reduce actual spawn count if near cap
    const remaining = MAX_PARTICLES - particlePool.getActiveCount();
    count = Math.min(count, remaining);

    for (let i = 0; i < count; i++) {
        particlePool.get(
            x, y,
            (Math.random() * radius) * GAME_SCALE,
            color,
            {
                x: (Math.random() - 0.5) * (Math.random() * 8 * velocityMultiplier) * GAME_SCALE,
                y: (Math.random() - 0.5) * (Math.random() * 8 * velocityMultiplier) * GAME_SCALE
            },
            type
        );
    }
}