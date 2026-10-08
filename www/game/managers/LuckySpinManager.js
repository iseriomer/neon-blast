// LuckySpinManager.js - Daily Lucky Spin Wheel
// Dopamine-driven daily engagement + rewarded ad for extra spins

class LuckySpinManager {
    static STORAGE_KEY = 'neonblast_lucky_spin_v1';
    static MAX_AD_SPINS = 3; // Extra spins via ads per day

    static WHEEL_ITEMS = [
        { label: '50',    coins: 50,    weight: 25, color: '#0f172a', accent: '#00f0ff', border: 'rgba(0,240,255,0.3)' },
        { label: '100',   coins: 100,   weight: 20, color: '#111827', accent: '#38bdf8', border: 'rgba(56,189,248,0.3)' },
        { label: '200',   coins: 200,   weight: 15, color: '#1e1b4b', accent: '#c084fc', border: 'rgba(192,132,252,0.3)' },
        { label: '500',   coins: 500,   weight: 5,  color: '#311042', accent: '#f43f5e', border: 'rgba(244,63,94,0.4)' },
        { label: '150',   coins: 150,   weight: 18, color: '#064e3b', accent: '#34d399', border: 'rgba(52,211,153,0.3)' },
        { label: '75',    coins: 75,    weight: 22, color: '#1e293b', accent: '#818cf8', border: 'rgba(129,140,248,0.3)' },
        { label: '300',   coins: 300,   weight: 8,  color: '#451a03', accent: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
        { label: '1000 ★', coins: 1000, weight: 2,  color: '#581c87', accent: '#facc15', border: 'rgba(250,204,21,0.6)' },
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
        return DailyRewardManager.getTodayStr();
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
        if (this.isSpinning) return;
        clearTimeout(this._refreshTimer);
        const modal = document.getElementById('lucky-spin-modal');
        if (!modal) return;

        const hasFree = this.hasFreeSpinToday();
        const canAd = this.canAdSpin();
        const remainingAd = this.MAX_AD_SPINS - (this.state.lastAdSpinDate === this.getTodayStr() ? this.state.adSpinsUsedToday : 0);

        const wheelSvg = typeof IconSystem !== 'undefined'
            ? IconSystem.get('wheel', { size: 24, color: '#00f0ff' })
            : '';

        const t = (key, params) => typeof Localization !== 'undefined' ? Localization.t(key, params) : key;

        modal.innerHTML = `
            <div class="ls-card">
                <h2 class="ls-title">
                    ${wheelSvg}
                    <span>${t('wheel_title')}</span>
                </h2>
                <div class="ls-wheel-container">
                    <div class="ls-pointer"><svg width="24" height="24" viewBox="0 0 24 24" style="filter: drop-shadow(0 0 6px #f59e0b);"><polygon points="4,4 20,4 12,22" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"/></svg></div>
                    <canvas id="ls-wheel-canvas" width="300" height="300"></canvas>
                </div>
                <div class="ls-result hidden" id="ls-result">
                    <span class="ls-result-icon" id="ls-result-icon"></span>
                    <span class="ls-result-text" id="ls-result-text"></span>
                </div>
                <div class="ls-actions">
                    ${hasFree
                        ? `<button class="main-btn ls-spin-btn" id="ls-free-spin">${t('wheel_spin_free')}</button>`
                        : `<div class="ls-free-used">${t('wheel_free_used')}</div>`
                    }
                    ${canAd
                        ? `<button class="main-btn ls-ad-spin-btn" id="ls-ad-spin">${t('wheel_spin_ad', { n: remainingAd })}</button>`
                        : `<div class="ls-ad-used">${t('wheel_ad_exhausted')}</div>`
                    }
                </div>
                <button class="ls-close-btn" id="ls-close-btn">${t('close_btn')}</button>
            </div>
        `;

        modal.classList.remove('hidden');
        this.drawWheel(0);

        const freeBtn = document.getElementById('ls-free-spin');
        if (freeBtn) {
            freeBtn.addEventListener('click', () => {
                if (this.isSpinning || AdManager.isAdPlaying || !this.hasFreeSpinToday()) return;
                this.state.lastFreeSpinDate = this.getTodayStr();
                this.save();
                this.executeSpin();
            });
        }

        const adBtn = document.getElementById('ls-ad-spin');
        if (adBtn) {
            adBtn.addEventListener('click', () => {
                if (this.isSpinning || AdManager.isAdPlaying || !this.canAdSpin()) return;
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
        const cx = canvas.width / 2, cy = canvas.height / 2, r = 138;
        const items = this.WHEEL_ITEMS;
        const sliceAngle = Math.PI * 2 / items.length;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < items.length; i++) {
            const start = rotation + i * sliceAngle;
            const middle = start + sliceAngle / 2;
            ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+sliceAngle);ctx.closePath();
            ctx.fillStyle = items[i].coins === 1000 ? '#201b0d' : '#080c10';ctx.fill();
            ctx.strokeStyle = '#3c434d';ctx.lineWidth = .8;ctx.stroke();
            ctx.fillStyle = items[i].coins === 1000 ? '#ffd45b' : '#edf1f5';
            ctx.font = '500 23px MenuText, monospace';ctx.textAlign = 'center';ctx.textBaseline = 'middle';
            ctx.fillText(String(items[i].coins), cx + Math.cos(middle)*r*.70, cy + Math.sin(middle)*r*.70);
        }
        ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='#00efff';ctx.lineWidth=1.2;ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy,18,0,Math.PI*2);ctx.fillStyle='#050709';ctx.fill();ctx.lineWidth=.8;ctx.stroke();
        ctx.beginPath();ctx.arc(cx,cy,7,0,Math.PI*2);ctx.fillStyle='#00efff';ctx.fill();
    }

    static executeSpin() {
        if (this.isSpinning) return;
        this.isSpinning = true;

        const winIndex = this.getWeightedRandom();
        const items = this.WHEEL_ITEMS;
        const sliceAngle = (Math.PI * 2) / items.length;

        const fullSpins = 5 + Math.floor(Math.random() * 3);
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

        if (window.MenuAudio) MenuAudio.play('decrypt');

        let lastSoundSegment = 0;
        const animateSpin = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing: cubic ease-out
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentRotation = startRotation + (finalRotation - startRotation) * eased;

            this.drawWheel(currentRotation);
            const soundSegment = Math.floor(Math.abs(currentRotation) / sliceAngle);
            if (soundSegment !== lastSoundSegment && progress < 1) {
                lastSoundSegment = soundSegment;
                if (window.MenuAudio) MenuAudio.play('tick');
            }

            if (progress < 1) {
                requestAnimationFrame(animateSpin);
            } else {
                // Spin complete!
                this.isSpinning = false;
                const reward = items[winIndex];

                if (typeof CosmeticsManager !== 'undefined') {
                    CosmeticsManager.addCoins(reward.coins);
                }
                if (window.MenuAudio) MenuAudio.play('reward');

                this.state.totalSpins++;
                this.save();

                // Show result
                if (resultEl) {
                    const iconEl = document.getElementById('ls-result-icon');
                    const textEl = document.getElementById('ls-result-text');
                    if (iconEl && typeof IconSystem !== 'undefined') {
                        iconEl.innerHTML = IconSystem.get('coin', { size: 32 });
                    }
                    if (textEl) {
                        textEl.innerText = typeof Localization !== 'undefined'
                            ? Localization.t('wheel_won_coins', { n: reward.coins })
                            : `+${reward.coins} NEON COIN!`;
                    }
                    resultEl.classList.remove('hidden');
                }

                this._refreshTimer = setTimeout(() => {
                    if (!document.getElementById('lucky-spin-modal').classList.contains('hidden')) this.showWheel();
                }, 2000);
            }
        };

        requestAnimationFrame(animateSpin);
    }
}

window.LuckySpinManager = LuckySpinManager;
