// --- ADVANCED ATMOSPHERIC BACKGROUND SYSTEM ---
const BackgroundManager = {
    activeType: 'nebula', // Varsayılan
    elements: [],

    // Her modun renk paletleri ve ayarları
    configs: {
        nebula: {
            colors: ['#2a003b', '#00163b', '#3b0000', '#0f0026'],
            speed: 0.5,
            blendMode: 'screen',
            baseColor: '#050510',
            count: 6
        },
        magma: {
            colors: ['#3b0000', '#ff4400', '#ff8800', '#550000'],
            speed: 1.2, // Daha hareketli
            blendMode: 'lighter', // Daha parlak/yakıcı
            baseColor: '#1a0500',
            count: 8
        },
        toxic: {
            colors: ['#003b00', '#00ff00', '#445500', '#001a00'],
            speed: 0.3, // Yavaş ve sinsi
            blendMode: 'overlay', // Dumanlı his
            baseColor: '#001000',
            count: 10
        },
        bokeh: {
            colors: ['#ffffff', '#00ffff', '#ff00ff', '#ffff00'],
            speed: 0.8,
            blendMode: 'source-over', // Net daireler
            baseColor: '#101015',
            count: 20 // Daha fazla ama küçük
        }
    },

    init() {
        this.setEffect(this.activeType);

        // Menü değişikliğini dinle
        const selector = document.getElementById('bg-select');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.setEffect(e.target.value);
                // Oyunu odaktan kaybetmemek için canvas'a geri odaklan
                CANVAS.focus();
            });
        }
    },

    setEffect(type) {
        this.activeType = type;
        this.elements = [];
        const config = this.configs[type];

        for (let i = 0; i < config.count; i++) {
            this.elements.push({
                x: Math.random() * CANVAS.width,
                y: Math.random() * CANVAS.height,
                radius: (type === 'bokeh' ? 20 + Math.random() * 50 : 200 + Math.random() * 400),
                color: config.colors[Math.floor(Math.random() * config.colors.length)],
                vx: (Math.random() - 0.5) * config.speed,
                vy: (Math.random() - 0.5) * config.speed,
                pulseOffset: Math.random() * Math.PI * 2,
                alpha: Math.random() // Sadece bokeh için kullanılır
            });
        }
    },

    updateAndDraw(dt = 1) {
        const config = this.configs[this.activeType];

        // 1. Zemin Rengi
        CTX.fillStyle = config.baseColor;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);

        // 2. Elementleri Çiz
        CTX.globalCompositeOperation = config.blendMode;

        const time = Date.now() / 2000;

        for (let el of this.elements) {
            // Hareket
            el.x += el.vx * dt;
            el.y += el.vy * dt;

            // Kenarlardan taşma (Wrap)
            const margin = 200;
            if (el.x < -margin) el.x = CANVAS.width + margin;
            if (el.x > CANVAS.width + margin) el.x = -margin;
            if (el.y < -margin) el.y = CANVAS.height + margin;
            if (el.y > CANVAS.height + margin) el.y = -margin;

            CTX.beginPath();

            if (this.activeType === 'bokeh') {
                // Bokeh stili: Net kenarlı, saydam daireler
                CTX.arc(el.x, el.y, el.radius, 0, Math.PI * 2);
                CTX.fillStyle = el.color;
                CTX.globalAlpha = el.alpha * 0.3; // Saydamlık
                CTX.fill();
                CTX.globalAlpha = 1;
            } else {
                // Nebula/Gaz stili: Gradyanlı yumuşak geçişler
                const pulse = Math.sin(time + el.pulseOffset) * 20;
                const r = Math.max(0, el.radius + pulse);

                const gradient = CTX.createRadialGradient(el.x, el.y, 0, el.x, el.y, r);
                gradient.addColorStop(0, el.color);
                gradient.addColorStop(1, 'transparent');

                CTX.fillStyle = gradient;
                CTX.arc(el.x, el.y, r, 0, Math.PI * 2);
                CTX.fill();
            }
        }

        // 3. Vignette (Kenar Karartma) - Hepsinde olsun, sinematik duruyor
        CTX.globalCompositeOperation = 'source-over';
        const vignette = CTX.createRadialGradient(
            CANVAS.width / 2, CANVAS.height / 2, CANVAS.height / 3,
            CANVAS.width / 2, CANVAS.height / 2, CANVAS.height
        );
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, 'rgba(0,0,0,0.8)');

        CTX.fillStyle = vignette;
        CTX.fillRect(0, 0, CANVAS.width, CANVAS.height);
    }
};