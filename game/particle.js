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

    reset(x, y, radius, color, velocity) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.velocity = velocity;
        this.alpha = 1;
    }

    // draw() METODUNU SİLDİK! 
    // Çizim işlemi artık tamamen RenderOptimizer'da yapılacak.

    update() {
        // Gereksiz draw() çağrısı kaldırıldı.
        // Sadece fizik hesaplamaları kaldı.
        
        this.velocity.x *= FRICTION;
        this.velocity.y *= FRICTION;
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        this.alpha -= 0.015;

        // Return true if particle should be removed
        return this.alpha <= 0;
    }
}

// Particle Pool (Aynen kalıyor)
const particlePool = new ObjectPool(
    () => new Particle(),
    (particle, x, y, radius, color, velocity) => {
        particle.reset(x, y, radius, color, velocity);
    },
    POOL_SIZES.PARTICLE
);

// Helper function (Aynen kalıyor)
function spawnParticles(x, y, count, radius, color, velocityMultiplier = 1) {
    for (let i = 0; i < count; i++) {
        particlePool.get(
            x, y,
            (Math.random() * radius) * GAME_SCALE,
            color,
            {
                x: (Math.random() - 0.5) * (Math.random() * 8 * velocityMultiplier) * GAME_SCALE,
                y: (Math.random() - 0.5) * (Math.random() * 8 * velocityMultiplier) * GAME_SCALE
            }
        );
    }
}