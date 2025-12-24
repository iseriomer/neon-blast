// particle.js - Particle System (OPTIMIZED)

class Particle {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.radius = 0;
        this.color = 'white';
        this.velocity = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.alpha = 1;
        this.type = 'default'; // default, shockwave, star
        this.life = 0;
        this.maxLife = 0;
        this.rotation = 0;
        // OPTIMIZATION: Integer coordinates for rendering (eliminate anti-aliasing)
        this.renderX = 0;
        this.renderY = 0;
    }

    reset(x, y, radius, color, velocity, type = 'default') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
        this.type = type;
        this.life = 1.0;
        this.maxLife = 1.0;
        this.rotation = Math.random() * Math.PI * 2;
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

        // OPTIMIZATION: Round coordinates for rendering (fast bitwise truncation)
        this.renderX = this.x | 0;
        this.renderY = this.y | 0;
        // ADD: Cull off-screen particles (saves draw calls)
        const margin = 100;
        if (this.x < -margin || this.x > CANVAS.width + margin ||
            this.y < -margin || this.y > CANVAS.height + margin) {
            return true; // Remove
        }

        // Type specific updates
        if (this.type === 'shockwave') {
            this.radius += 10 * dt; // Expand quickly
            this.alpha -= 0.05 * dt;
        } else if (this.type === 'star') {
            this.radius += 2 * dt; // Elongate or move
            this.rotation += 0.1 * dt;
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
function spawnParticles(x, y, count, radius, color, velocityMultiplier = 1) {
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
            'default'
        );
    }
}

function spawnShockwave(x, y, color) {
    // Single expanding ring
    particlePool.get(x, y, 10, color, { x: 0, y: 0 }, 'shockwave');
}

function spawnCritStars(x, y, color) {
    const count = 5;
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i;
        const speed = 5;
        particlePool.get(x, y, 8, color, {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        }, 'star');
    }
}