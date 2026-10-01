// --- SMOOTH ATMOSPHERIC BLURRED NEBULA BACKGROUND SYSTEM ---
// Designed for maximum aesthetic beauty with ZERO distraction and guaranteed high contrast readability.
// Uses low-frequency procedural radial gradients blended via low-res bilinear interpolation
// to produce silky-smooth, blurred space nebulas that rest quietly behind gameplay.

const BackgroundManager = {
    activeType: 'nebula',
    bufferCanvas: null,
    bufferCtx: null,
    dustParticles: [],
    lastTime: 0,

    // Curated deep-cosmic atmospheric palettes
    // Base lightness is strictly kept < 10% to ensure neon player, bullets, and enemies remain 100% readable.
    configs: {
        nebula: {
            name: 'Derin Uzay',
            base: [0, 0, 0],          // #000000 Pure Pitch Black Space
            bufferBase: '#000000',
            nebulaAlpha: 0,
            dustColor: 'transparent',
            clouds: []
        },
        synthgrid: {
            name: 'Synthwave Şafak',
            base: [8, 4, 15],          // #08040f deep twilight purple
            bufferBase: '#06030b',
            nebulaAlpha: 0.40,
            dustColor: 'rgba(244, 114, 182, 0.18)',
            clouds: [
                { color: 'rgba(105, 20, 80, 0.45)', stop: 'rgba(48, 10, 42, 0.20)' },  // Dusky Sunset Magenta
                { color: 'rgba(60, 16, 85, 0.42)', stop: 'rgba(26, 8, 45, 0.16)' },    // Twilight Violet
                { color: 'rgba(110, 42, 55, 0.35)', stop: 'rgba(50, 18, 28, 0.12)' }   // Warm Rose Bloom
            ]
        },
        digitalrain: {
            name: 'Matrix Siber Sis',
            base: [3, 9, 6],           // #030906 abyssal cyber dark
            bufferBase: '#020704',
            nebulaAlpha: 0.42,
            dustColor: 'rgba(52, 211, 153, 0.18)',
            clouds: [
                { color: 'rgba(14, 68, 38, 0.48)', stop: 'rgba(8, 34, 20, 0.20)' },    // Deep Cyber Emerald
                { color: 'rgba(10, 52, 58, 0.42)', stop: 'rgba(6, 26, 30, 0.16)' },    // Bio-Teal Mist
                { color: 'rgba(22, 55, 28, 0.35)', stop: 'rgba(10, 28, 14, 0.12)' }    // Abyssal Moss
            ]
        },
        hyperspace: {
            name: 'Işık Hızı Tüneli',
            base: [3, 7, 18],          // #030712 deep oceanic navy
            bufferBase: '#02050e',
            nebulaAlpha: 0.45,
            dustColor: 'rgba(96, 165, 250, 0.20)',
            clouds: [
                { color: 'rgba(16, 52, 120, 0.48)', stop: 'rgba(8, 26, 68, 0.22)' },   // Deep Cobalt
                { color: 'rgba(12, 36, 88, 0.45)', stop: 'rgba(6, 18, 48, 0.18)' },    // Sapphire Stream
                { color: 'rgba(20, 68, 115, 0.38)', stop: 'rgba(10, 32, 60, 0.14)' }   // Cyan Mist
            ]
        },
        cybercity: {
            name: 'Siber Şehir',
            base: [9, 5, 16],          // #090510 metropolis twilight
            bufferBase: '#07030c',
            nebulaAlpha: 0.42,
            dustColor: 'rgba(251, 191, 36, 0.18)',
            clouds: [
                { color: 'rgba(95, 24, 75, 0.46)', stop: 'rgba(42, 10, 38, 0.20)' },   // Neon Fuchsia Aura
                { color: 'rgba(88, 48, 16, 0.38)', stop: 'rgba(42, 22, 8, 0.15)' },    // Warm Amber Bokeh
                { color: 'rgba(40, 18, 72, 0.42)', stop: 'rgba(18, 8, 38, 0.16)' }     // Midnight Purple
            ]
        },
        void_realm: {
            name: 'Boşluk Diyarı',
            base: [5, 2, 12],          // #05020c singularity black
            bufferBase: '#04010a',
            nebulaAlpha: 0.45,
            dustColor: 'rgba(192, 132, 252, 0.20)',
            clouds: [
                { color: 'rgba(78, 16, 108, 0.48)', stop: 'rgba(36, 8, 55, 0.22)' },   // Amethyst Rift
                { color: 'rgba(16, 26, 65, 0.40)', stop: 'rgba(8, 14, 35, 0.16)' },    // Void Dark Blue
                { color: 'rgba(92, 18, 80, 0.38)', stop: 'rgba(42, 8, 40, 0.14)' }     // Phantom Magenta
            ]
        },
        magma: {
            name: 'Magma Kor',
            base: [11, 4, 3],          // #0b0403 volcanic obsidian
            bufferBase: '#080202',
            nebulaAlpha: 0.42,
            dustColor: 'rgba(251, 146, 60, 0.18)',
            clouds: [
                { color: 'rgba(95, 22, 14, 0.46)', stop: 'rgba(45, 10, 6, 0.20)' },    // Smoldering Crimson
                { color: 'rgba(85, 38, 10, 0.38)', stop: 'rgba(40, 18, 5, 0.15)' },    // Molten Amber Glow
                { color: 'rgba(50, 14, 10, 0.40)', stop: 'rgba(24, 6, 5, 0.16)' }      // Charred Charcoal
            ]
        },
        toxic: {
            name: 'Radyoaktif Bulutsu',
            base: [3, 9, 4],           // #030904 deep bio-dark
            bufferBase: '#020603',
            nebulaAlpha: 0.42,
            dustColor: 'rgba(163, 230, 53, 0.18)',
            clouds: [
                { color: 'rgba(22, 75, 34, 0.48)', stop: 'rgba(10, 36, 16, 0.20)' },   // Phosphorescent Viridian
                { color: 'rgba(44, 72, 16, 0.38)', stop: 'rgba(20, 35, 8, 0.16)' },    // Alien Bio-Lime
                { color: 'rgba(15, 42, 22, 0.40)', stop: 'rgba(6, 20, 10, 0.14)' }     // Dark Moss Swamp
            ]
        },
        bokeh: {
            name: 'Sessiz Boşluk',
            base: [6, 7, 12],
            bufferBase: '#04050a',
            nebulaAlpha: 0.38,
            dustColor: 'rgba(148, 163, 184, 0.16)',
            clouds: [
                { color: 'rgba(32, 42, 75, 0.42)', stop: 'rgba(15, 20, 40, 0.18)' },
                { color: 'rgba(45, 30, 68, 0.38)', stop: 'rgba(22, 14, 36, 0.15)' },
                { color: 'rgba(26, 48, 65, 0.35)', stop: 'rgba(12, 24, 35, 0.12)' }
            ]
        }
    },

    init() {
        this.initBuffer();
        this.initDust();
        if (window.CosmeticsManager) {
            this.applyCosmeticBackground(window.CosmeticsManager.getEquipped('background'));
        } else {
            this.setEffect(this.activeType);
        }
    },

    initBuffer() {
        if (!this.bufferCanvas) {
            this.bufferCanvas = document.createElement('canvas');
            // Low-res offscreen canvas: Bilinear upscaling to full-screen guarantees silky soft blur!
            this.bufferCanvas.width = 320;
            this.bufferCanvas.height = 180;
            this.bufferCtx = this.bufferCanvas.getContext('2d');
        }
    },

    initDust() {
        this.dustParticles = [];
        const count = 28;
        for (let i = 0; i < count; i++) {
            this.dustParticles.push({
                x: Math.random(),
                y: Math.random(),
                radius: 1.2 + Math.random() * 1.8,
                speedX: (Math.random() - 0.5) * 0.0003,
                speedY: -0.0004 - Math.random() * 0.0006, // Gracefully drifting upward (~18s across screen)
                alphaPhase: Math.random() * Math.PI * 2,
                swayPhase: Math.random() * Math.PI * 2,
                baseAlpha: 0.12 + Math.random() * 0.16
            });
        }
    },

    applyCosmeticBackground(cosmeticId) {
        const map = {
            'bg_nebula': 'nebula',
            'bg_synthgrid': 'synthgrid',
            'bg_digitalrain': 'digitalrain',
            'bg_hyperspace': 'hyperspace',
            'bg_cybercity': 'cybercity',
            'bg_void_realm': 'void_realm',
            'bg_magma': 'magma',
            'bg_toxic': 'toxic',
            'bg_bokeh': 'bokeh'
        };
        const targetType = map[cosmeticId] || cosmeticId || 'nebula';
        this.setEffect(targetType);
    },

    setEffect(type) {
        this.activeType = this.configs[type] ? type : 'nebula';
    },

    updateAndDraw(dt = 1) {
        if (!CANVAS || !CTX) return;
        this.initBuffer();

        const config = this.configs[this.activeType] || this.configs.nebula;
        const [r, g, b] = config.base;
        const now = Date.now();
        // 0.0011 rad/ms: ~5.5s per complete harmonic swell (clearly perceptible and alive, yet calming and non-distracting)
        const t = now * 0.0011;

        // 1. Motion Trail Decay Fill (semi-transparent base on primary canvas)
        CTX.fillStyle = `rgba(${r}, ${g}, ${b}, 0.18)`;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        // 2. Render Silky Blurred Nebula Clouds in Low-Res Offscreen Buffer (if clouds defined)
        const cloudDefs = config.clouds;
        if (cloudDefs && cloudDefs.length > 0 && config.nebulaAlpha > 0) {
            const bCtx = this.bufferCtx;
            const bw = this.bufferCanvas.width;
            const bh = this.bufferCanvas.height;

            bCtx.fillStyle = config.bufferBase;
            bCtx.fillRect(0, 0, bw, bh);

            // Cloud 1: Drifting & breathing in upper-left / central region
            if (cloudDefs[0]) {
                const c1x = bw * 0.35 + Math.sin(t * 0.85) * bw * 0.22;
                const c1y = bh * 0.38 + Math.cos(t * 0.70) * bh * 0.18;
                const c1r = bh * (0.85 + Math.sin(t * 1.1) * 0.22);
                const grad1 = bCtx.createRadialGradient(c1x, c1y, 0, c1x, c1y, c1r);
                grad1.addColorStop(0, cloudDefs[0].color);
                grad1.addColorStop(0.55, cloudDefs[0].stop);
                grad1.addColorStop(1, 'transparent');
                bCtx.fillStyle = grad1;
                bCtx.fillRect(0, 0, bw, bh);
            }

            // Cloud 2: Counter-drifting & expanding in lower-right region
            if (cloudDefs[1]) {
                const c2x = bw * 0.68 + Math.cos(t * 0.75) * bw * 0.22;
                const c2y = bh * 0.62 + Math.sin(t * 0.85) * bh * 0.20;
                const c2r = bh * (0.95 + Math.cos(t * 0.95) * 0.22);
                const grad2 = bCtx.createRadialGradient(c2x, c2y, 0, c2x, c2y, c2r);
                grad2.addColorStop(0, cloudDefs[1].color);
                grad2.addColorStop(0.55, cloudDefs[1].stop);
                grad2.addColorStop(1, 'transparent');
                bCtx.fillStyle = grad2;
                bCtx.fillRect(0, 0, bw, bh);
            }

            // Cloud 3: Harmonic core nexus breathing in center
            if (cloudDefs[2]) {
                const c3x = bw * 0.50 + Math.sin(t * 0.55) * bw * 0.16;
                const c3y = bh * 0.50 + Math.cos(t * 0.65) * bh * 0.16;
                const c3r = bh * (0.80 + Math.sin(t * 1.3) * 0.25);
                const grad3 = bCtx.createRadialGradient(c3x, c3y, 0, c3x, c3y, c3r);
                grad3.addColorStop(0, cloudDefs[2].color);
                grad3.addColorStop(0.50, cloudDefs[2].stop);
                grad3.addColorStop(1, 'transparent');
                bCtx.fillStyle = grad3;
                bCtx.fillRect(0, 0, bw, bh);
            }

            // 3. Blit blurred buffer onto main canvas using bilinear smoothing
            CTX.save();
            CTX.globalAlpha = config.nebulaAlpha || 0.44;
            CTX.drawImage(this.bufferCanvas, 0, 0, CANVAS.width, CANVAS.height);
            CTX.restore();
        }

        // 4. Ambient Cosmic Dust Motes (only if dustColor is not transparent)
        if (config.dustColor && config.dustColor !== 'transparent' && this.dustParticles.length > 0) {
            CTX.save();
            const w = CANVAS.width;
            const h = CANVAS.height;
            const dustColor = config.dustColor || 'rgba(255, 255, 255, 0.18)';

            for (let i = 0; i < this.dustParticles.length; i++) {
                const p = this.dustParticles[i];
                p.x = (p.x + p.speedX * dt + Math.sin(t * 1.5 + p.swayPhase) * 0.00015 + 1) % 1;
                p.y = (p.y + p.speedY * dt + 1) % 1;

                const pulse = Math.sin(t * 2.5 + p.alphaPhase);
                const alpha = Math.max(0.05, p.baseAlpha + pulse * 0.08);

                CTX.fillStyle = dustColor;
                CTX.globalAlpha = alpha;
                CTX.beginPath();
                CTX.arc(p.x * w, p.y * h, p.radius, 0, Math.PI * 2);
                CTX.fill();
            }
            CTX.restore();
        }
    }
};

window.BackgroundManager = BackgroundManager;