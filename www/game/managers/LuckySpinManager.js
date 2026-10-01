// LuckySpinManager.js - Daily Lucky Spin Wheel
// Dopamine-driven daily engagement + rewarded ad for extra spins

class LuckySpinManager {
    static STORAGE_KEY = 'neonblast_lucky_spin_v1';
    static MAX_AD_SPINS = 3; // Extra spins via ads per day

    static WHEEL_ITEMS = [
        { label: '50 Coin',       coins: 50,    weight: 25, color: '#475569', icon: '🪙' },
        { label: '100 Coin',      coins: 100,   weight: 20, color: '#0891b2', icon: '💰' },
        { label: '200 Coin',      coins: 200,   weight: 15, color: '#7c3aed', icon: '💎' },
        { label: '500 Coin',      coins: 500,   weight: 5,  color: '#f59e0b', icon: '🔥' },
        { label: '150 Coin',      coins: 150,   weight: 18, color: '#059669', icon: '⚡' },
        { label: '75 Coin',       coins: 75,    weight: 22, color: '#6366f1', icon: '✨' },
        { label: '300 Coin',      coins: 300,   weight: 8,  color: '#ec4899', icon: '🎯' },
        { label: '1000 COİN!',    coins: 1000,  weight: 2,  color: '#eab308', icon: '👑' },
    ];

    static state = {
        lastFreeSpinDate: null,
        adSpinsUsedToday: 0,
        lastAdSpinDate: null,
        totalSpins: 0
    };

    static isSpinning = false;

    static init() {
        this.load();
    }

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) this.state = { ...this.state, ...JSON.parse(saved) };
        } catch (e) { console.error('LuckySpin load:', e); }
    }

    static save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) { console.error('LuckySpin save:', e); }
    }

    static getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    static hasFreeSpinToday() {
        return this.state.lastFreeSpinDate !== this.getTodayStr();
    }

    static canAdSpin() {
        if (this.state.lastAdSpinDate !== this.getTodayStr()) {
            this.state.adSpinsUsedToday = 0;
        }
        return this.state.adSpinsUsedToday < this.MAX_AD_SPINS;
    }

    static getWeightedRandom() {
        const totalWeight = this.WHEEL_ITEMS.reduce((sum, item) => sum + item.weight, 0);
        let rand = Math.random() * totalWeight;
        for (let i = 0; i < this.WHEEL_ITEMS.length; i++) {
            rand -= this.WHEEL_ITEMS[i].weight;
            if (rand <= 0) return i;
        }
        return 0;
    }

    static showWheel() {
        const modal = document.getElementById('lucky-spin-modal');
        if (!modal) return;

        const hasFree = this.hasFreeSpinToday();
        const canAd = this.canAdSpin();
        const remainingAd = this.MAX_AD_SPINS - (this.state.lastAdSpinDate === this.getTodayStr() ? this.state.adSpinsUsedToday : 0);

        modal.innerHTML = `
            <div class="ls-card">
                <h2 class="ls-title">🎰 ŞANS ÇARKI</h2>
                <div class="ls-wheel-container">
                    <div class="ls-pointer">▼</div>
                    <canvas id="ls-wheel-canvas" width="300" height="300"></canvas>
                </div>
                <div class="ls-result hidden" id="ls-result">
                    <span class="ls-result-icon" id="ls-result-icon"></span>
                    <span class="ls-result-text" id="ls-result-text"></span>
                </div>
                <div class="ls-actions">
                    ${hasFree
                        ? `<button class="main-btn ls-spin-btn" id="ls-free-spin">ÜCRETSİZ ÇEVİR 🎲</button>`
                        : `<div class="ls-free-used">Günlük ücretsiz hak kullanıldı ✅</div>`
                    }
                    ${canAd
                        ? `<button class="main-btn ls-ad-spin-btn" id="ls-ad-spin">REKLAM İZLE → ÇEVİR (${remainingAd} hak)</button>`
                        : `<div class="ls-ad-used">Reklam hakları tükendi</div>`
                    }
                </div>
                <button class="ls-close-btn" id="ls-close-btn">KAPAT</button>
            </div>
        `;

        modal.classList.remove('hidden');
        this.drawWheel(0);

        const freeBtn = document.getElementById('ls-free-spin');
        if (freeBtn) {
            freeBtn.addEventListener('click', () => {
                this.state.lastFreeSpinDate = this.getTodayStr();
                this.save();
                this.executeSpin();
            });
        }

        const adBtn = document.getElementById('ls-ad-spin');
        if (adBtn) {
            adBtn.addEventListener('click', () => {
                if (typeof AdManager !== 'undefined') {
                    AdManager.showRewardedAd({
                        rewardType: 'LUCKY_SPIN',
                        onSuccess: () => {
                            if (this.state.lastAdSpinDate !== this.getTodayStr()) {
                                this.state.adSpinsUsedToday = 0;
                            }
                            this.state.adSpinsUsedToday++;
                            this.state.lastAdSpinDate = this.getTodayStr();
                            this.save();
                            this.executeSpin();
                        }
                    });
                } else {
                    this.state.adSpinsUsedToday++;
                    this.state.lastAdSpinDate = this.getTodayStr();
                    this.save();
                    this.executeSpin();
                }
            });
        }

        document.getElementById('ls-close-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    static drawWheel(rotation) {
        const canvas = document.getElementById('ls-wheel-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const r = 140;
        const items = this.WHEEL_ITEMS;
        const sliceAngle = (Math.PI * 2) / items.length;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw slices
        for (let i = 0; i < items.length; i++) {
            const startAngle = rotation + (i * sliceAngle);
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = items[i].color;
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 13px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(items[i].icon, r * 0.55, 5);
            ctx.font = '10px "Segoe UI", sans-serif';
            ctx.fillText(items[i].label, r * 0.78, 5);
            ctx.restore();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(cx, cy, 22, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎰', cx, cy);
    }

    static executeSpin() {
        if (this.isSpinning) return;
        this.isSpinning = true;

        const winIndex = this.getWeightedRandom();
        const items = this.WHEEL_ITEMS;
        const sliceAngle = (Math.PI * 2) / items.length;

        // Calculate final rotation: multiple full rotations + land on winIndex
        // Pointer is at top (12 o'clock = -PI/2), so we need the winning slice to align there
        const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
        const targetAngle = -(winIndex * sliceAngle) - (sliceAngle / 2) - (Math.PI / 2);
        const finalRotation = (fullSpins * Math.PI * 2) + targetAngle;

        const duration = 4000;
        const startTime = Date.now();
        const startRotation = 0;

        const resultEl = document.getElementById('ls-result');
        if (resultEl) resultEl.classList.add('hidden');

        // Disable buttons during spin
        const btns = document.querySelectorAll('.ls-spin-btn, .ls-ad-spin-btn');
        btns.forEach(b => b.disabled = true);

        if (typeof playSound === 'function') playSound('spark_long');

        const animateSpin = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: cubic ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentRotation = startRotation + (finalRotation - startRotation) * eased;

            this.drawWheel(currentRotation);

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                // Spin complete!
                this.isSpinning = false;
                const reward = items[winIndex];

                // Give reward
                if (typeof CosmeticsManager !== 'undefined') {
                    CosmeticsManager.addCoins(reward.coins);
                }
                if (typeof playSound === 'function') playSound('levelup');

                this.state.totalSpins++;
                this.save();

                // Show result
                if (resultEl) {
                    const iconEl = document.getElementById('ls-result-icon');
                    const textEl = document.getElementById('ls-result-text');
                    if (iconEl) iconEl.innerText = reward.icon;
                    if (textEl) textEl.innerText = `+${reward.coins} NEON COIN!`;
                    resultEl.classList.remove('hidden');
                }

                // Refresh buttons after delay
                setTimeout(() => this.showWheel(), 2000);
            }
        };

        requestAnimationFrame(animateSpin);
    }
}

window.LuckySpinManager = LuckySpinManager;
