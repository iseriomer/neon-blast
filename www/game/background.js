// --- MINIMAL ATMOSPHERIC BACKGROUND SYSTEM ---
// Each background is just a very subtle dark tone shift — no distracting animations.
const BackgroundManager = {
    activeType: 'nebula',
    
    // Each config is just a base color with a very faint accent
    configs: {
        nebula: {
            base: [5, 5, 16],      // very dark blue-purple
            accent: [20, 8, 40],    // faint purple hint
            accentAlpha: 0.04
        },
        magma: {
            base: [10, 4, 3],       // very dark warm
            accent: [40, 10, 5],    // faint warm red hint
            accentAlpha: 0.04
        },
        toxic: {
            base: [4, 8, 4],        // very dark green
            accent: [8, 30, 8],     // faint green hint
            accentAlpha: 0.04
        },
        bokeh: {
            base: [8, 8, 10],       // neutral dark cool
            accent: [15, 18, 25],   // faint cool hint
            accentAlpha: 0.03
        },
        synthgrid: {
            base: [7, 3, 12],       // very dark purple-pink
            accent: [25, 5, 20],    // faint magenta hint
            accentAlpha: 0.04
        },
        digitalrain: {
            base: [3, 8, 5],        // very dark green
            accent: [5, 20, 10],    // faint matrix green
            accentAlpha: 0.03
        },
        hyperspace: {
            base: [4, 4, 10],       // very dark deep blue
            accent: [10, 12, 30],   // faint blue hint
            accentAlpha: 0.04
        }
    },

    init() {
        if (window.CosmeticsManager) {
            this.applyCosmeticBackground(window.CosmeticsManager.equipped.background);
        } else {
            this.setEffect(this.activeType);
        }
    },

    applyCosmeticBackground(cosmeticId) {
        const map = {
            'bg_nebula': 'nebula',
            'bg_magma': 'magma',
            'bg_toxic': 'toxic',
            'bg_bokeh': 'bokeh',
            'bg_synthgrid': 'synthgrid',
            'bg_digitalrain': 'digitalrain',
            'bg_hyperspace': 'hyperspace'
        };
        const targetType = map[cosmeticId] || 'nebula';
        this.setEffect(targetType);
    },

    setEffect(type) {
        this.activeType = this.configs[type] ? type : 'nebula';
    },

    updateAndDraw(dt = 1) {
        const config = this.configs[this.activeType] || this.configs.nebula;
        const [r, g, b] = config.base;

        // Simple semi-transparent fill with the skin's dark tone
        CTX.fillStyle = `rgba(${r}, ${g}, ${b}, 0.12)`;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        // Ultra-subtle center accent glow (barely visible)
        const [ar, ag, ab] = config.accent;
        const cx = CANVAS.width / 2;
        const cy = CANVAS.height / 2;
        const radius = Math.max(CANVAS.width, CANVAS.height) * 0.6;

        const grad = CTX.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(${ar}, ${ag}, ${ab}, ${config.accentAlpha})`);
        grad.addColorStop(1, 'transparent');

        CTX.fillStyle = grad;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    }
};

window.BackgroundManager = BackgroundManager;