
// --- VISUAL EFFECTS ENGINE ---
// Handles post-processing, camera shake, and aesthetic rendering

const FX = {
    // Canvas & Contexts for Post-Processing
    offscreenCanvas: null,
    oCtx: null,

    // Shake State
    shakeIntensity: 0,
    shakeDecay: 0.9,
    shakeX: 0,
    shakeY: 0,

    // Glitch State
    glitchIntensity: 0,
    glitchTimer: 0,

    // Pulse for Neon
    pulseTime: 0,

    init(width, height) {
        // Create offscreen canvas for Bloom/Glow composition
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = width;
        this.offscreenCanvas.height = height;
        this.oCtx = this.offscreenCanvas.getContext('2d', { alpha: false }); // Opt for speed
    },

    resize(width, height) {
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = width;
            this.offscreenCanvas.height = height;
        }
    },

    update(dt) {
        // Screen Shake Decay
        if (this.shakeIntensity > 0) {
            this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
            this.shakeIntensity *= this.shakeDecay;
            if (this.shakeIntensity < 0.5) {
                this.shakeIntensity = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            }
        }

        // Pulse Update (0.0 to 1.0 sine wave)
        this.pulseTime += dt * 2;

        // Glitch Decay
        if (this.glitchIntensity > 0) {
            this.glitchIntensity *= 0.95;
            if (this.glitchIntensity < 0.1) this.glitchIntensity = 0;
        }
    },

    // Call this BEFORE drawing anything for shake effect
    applyShake(ctx) {
        if (this.shakeIntensity > 0) {
            ctx.save();
            ctx.translate(this.shakeX, this.shakeY);
        }
    },

    // Call this AFTER drawing for restore
    restoreShake(ctx) {
        if (this.shakeIntensity > 0) {
            ctx.restore();
        }
    },

    // Trigger a screen shake
    shake(amount) {
        this.shakeIntensity = Math.min(this.shakeIntensity + amount, 50); // Max shake cap
    },

    // Trigger a digital glitch
    glitch(amount) {
        this.glitchIntensity = Math.min(this.glitchIntensity + amount, 1.0);
    },

    // THE MAGIC: Post-Processing Render
    // Takes the source canvas and applies Bloom + Aberration + Glitch
    process(ctx, width, height) {
        // 1. Draw current game state to offline buffer for processing
        this.oCtx.globalCompositeOperation = 'copy';
        this.oCtx.drawImage(ctx.canvas, 0, 0);

        // 2. BLOOM (Simulated via multiple low-opacity additive draws with blur)
        // Note: Real Gaussian blur is too slow in JS. We use a "cheap" bloom by drawing
        // the offscreen canvas back on top with additive blending and slight scaling/offset.

        ctx.globalCompositeOperation = 'screen'; // 'lighter' or 'screen' for glow
        ctx.globalAlpha = 0.4;

        // Fast-Blur: Draw scaled versions
        // Layer 1: Wide Blur
        // ctx.drawImage(this.offscreenCanvas, -10, -10, width + 20, height + 20); 
        // Layer 2: Core Glow
        ctx.drawImage(this.offscreenCanvas, 0, 0);

        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'source-over';

        // 3. CHROMATIC ABERRATION
        // Only if there is trauma/glitch
        if (this.glitchIntensity > 0 || this.shakeIntensity > 5) {
            const splitAmount = (this.glitchIntensity * 10) + (this.shakeIntensity * 0.5);

            // Red Channel Shift
            ctx.globalCompositeOperation = 'lighter';

            ctx.save();
            ctx.translate(splitAmount, 0);
            // Draw RED tint only (simulate by drawing with red filter?) 
            // Better: Draw the image again with a Multiply that keeps only red, then add.
            // Simplified for performance: Just draw the whole scene again with low opacity red? 
            // No, that's messy.
            // Correct way in clean 2D is hard. 
            // Hacky way: Just draw the full scene again with 'lighter' and slight offset. 
            // Ideally we separate channels but that needs pixel manipulation (too slow).

            // RGB Split Hack:
            // 1. Draw Cyan version to Left
            // 2. Draw Red version to Right
            // We can't easily recolor the canvas without pixel access. 
            // INSTANT TRICK: Use globalCompositeOperation 'xor' or 'multiply' with a color? No.

            // Let's stick to simple Scanline Glitch for 2D Canvas:
            // Random horizontal slices shifted
            if (Math.random() < this.glitchIntensity) {
                const sliceH = Math.random() * 50 + 10;
                const sliceY = Math.random() * height;
                const sliceOffset = (Math.random() - 0.5) * 50 * this.glitchIntensity;

                ctx.drawImage(this.offscreenCanvas,
                    0, sliceY, width, sliceH,
                    sliceOffset, sliceY, width, sliceH
                );

                // Add digital noise lines
                ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
                ctx.fillRect(0, sliceY, width, Math.random() * 2);
            }

            ctx.restore();
        }

        // 4. VIGNETTE & SCANLINES (Static overlay)
        // Better done in CSS (we did this in style.css), but we can add dynamic flash here.
        if (this.shakeIntensity > 20) {
            ctx.fillStyle = `rgba(255, 0, 0, ${this.shakeIntensity / 100})`;
            ctx.fillRect(0, 0, width, height);
        }
    },

    // --- HELPER RENDERING METHODS ---

    // Neon Line: Draws a line with inner white and outer glow color
    drawNeonLine(ctx, x1, y1, x2, y2, color, width = 2) {
        ctx.lineCap = 'round';

        // Outer Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = width + 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Inner Core
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, width - 1); // Make sure it's visible
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    },

    // Neon Circle
    drawNeonCircle(ctx, x, y, radius, color) {
        // Outer Glow
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner Core (White center for "hot" look)
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
        ctx.fill();
    },

    drawNeonPoly(ctx, x, y, sides, radius, color, rotation = 0) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const angle = rotation + (i * 2 * Math.PI / sides);
            const px = x + Math.cos(angle) * radius;
            const py = y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner thin line
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
};
