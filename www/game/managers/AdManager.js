// AdManager.js - Centralized Rewarded & Interstitial Ads + Monetization Provider
// Supports Web Simulation and Native Capacitor/AdMob bridge seamlessly.

const AdManager = {
    isAdPlaying: false,

    init() {
        console.log('⚡ AdManager Initialized');
        // Pre-load ads if native
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            try {
                // Prepare rewarded ad
                window.Capacitor.Plugins.AdMob.prepareRewardVideoAd({
                    adId: 'ca-app-pub-XXXXXXXX/YYYYYYYY' // Replace with real ad unit ID
                });
                // Prepare interstitial
                window.Capacitor.Plugins.AdMob.prepareInterstitial({
                    adId: 'ca-app-pub-XXXXXXXX/ZZZZZZZZ' // Replace with real ad unit ID
                });
            } catch (e) {
                console.warn('AdMob prep error:', e);
            }
        }
    },

    // Show a Rewarded Ad (Revive, Double Coins, Free Pack, Daily Reward, Quest Bonus, Lucky Spin)
    showRewardedAd(param1, param2) {
        if (this.isAdPlaying) return;

        const onReward = typeof param1 === 'function' ? param1 : (param1 && param1.onSuccess);
        const onCancel = typeof param2 === 'function' ? param2 : (param1 && param1.onDismiss);

        // Check for Native Capacitor AdMob plugin if integrated
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            // Native bridge hook
            try {
                window.Capacitor.Plugins.AdMob.showRewardVideoAd()
                    .then(() => {
                        // Reload next rewarded ad
                        try {
                            window.Capacitor.Plugins.AdMob.prepareRewardVideoAd({
                                adId: 'ca-app-pub-XXXXXXXX/YYYYYYYY'
                            });
                        } catch (e) {}
                        if (onReward) onReward();
                    })
                    .catch((err) => {
                        console.warn('Native ad failed, falling back to simulation', err);
                        this._showSimulatedAd(onReward, onCancel);
                    });
                return;
            } catch (e) {
                console.warn('AdMob exception', e);
            }
        }

        // Standard / Web / Dev Simulation Overlay
        this._showSimulatedAd(onReward, onCancel);
    },

    // Show an Interstitial Ad (between game overs)
    showInterstitialAd(onComplete) {
        if (this.isAdPlaying) {
            if (onComplete) onComplete();
            return;
        }

        // Check for Native Capacitor AdMob
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            try {
                this.isAdPlaying = true;
                window.Capacitor.Plugins.AdMob.showInterstitial()
                    .then(() => {
                        this.isAdPlaying = false;
                        // Reload next interstitial
                        try {
                            window.Capacitor.Plugins.AdMob.prepareInterstitial({
                                adId: 'ca-app-pub-XXXXXXXX/ZZZZZZZZ'
                            });
                        } catch (e) {}
                        if (onComplete) onComplete();
                    })
                    .catch((err) => {
                        console.warn('Interstitial failed:', err);
                        this.isAdPlaying = false;
                        if (onComplete) onComplete();
                    });
                return;
            } catch (e) {
                console.warn('Interstitial exception:', e);
            }
        }

        // Web simulation: brief flash overlay then continue
        this._showSimulatedInterstitial(onComplete);
    },

    _showSimulatedInterstitial(onComplete) {
        this.isAdPlaying = true;

        let overlay = document.getElementById('neon-interstitial-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'neon-interstitial-overlay';
            overlay.className = 'neon-ad-overlay interstitial-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="neon-ad-box interstitial-box">
                <div class="ad-tag">REKLAM</div>
                <div class="ad-terminal-scan">
                    <div class="scan-line"></div>
                </div>
                <h3 class="ad-title">SPONSOR MESAJI</h3>
                <p class="ad-desc">Reklamsız deneyim için Premium'a geçin!</p>
                <div class="ad-timer-bar">
                    <div id="interstitial-progress" class="ad-progress-fill"></div>
                </div>
                <button id="interstitial-close-btn" class="ad-skip-btn" style="display:none;">KAPAT ✕</button>
            </div>
        `;

        overlay.style.display = 'flex';

        const progressFill = document.getElementById('interstitial-progress');
        if (progressFill) progressFill.style.transition = 'width 3s linear';
        setTimeout(() => {
            if (progressFill) progressFill.style.width = '100%';
        }, 30);

        // Show close button after 3 seconds
        setTimeout(() => {
            const closeBtn = document.getElementById('interstitial-close-btn');
            if (closeBtn) {
                closeBtn.style.display = 'inline-block';
                closeBtn.onclick = () => {
                    this._closeInterstitial(overlay);
                    if (onComplete) onComplete();
                };
            }
        }, 3000);
    },

    _closeInterstitial(overlay) {
        this.isAdPlaying = false;
        if (overlay) overlay.style.display = 'none';
    },

    _showSimulatedAd(onReward, onCancel) {
        this.isAdPlaying = true;

        let overlay = document.getElementById('neon-ad-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'neon-ad-overlay';
            overlay.className = 'neon-ad-overlay';
            document.body.appendChild(overlay);
        }

        overlay.innerHTML = `
            <div class="neon-ad-box">
                <div class="ad-tag">SPONSORED BROADCAST</div>
                <div class="ad-terminal-scan">
                    <div class="scan-line"></div>
                </div>
                <h3 class="ad-title">SYNTHWAVE NEURAL LINK</h3>
                <p class="ad-desc">ESTABLISHING QUANTUM SATELLITE HANDSHAKE...</p>
                <div class="ad-timer-bar">
                    <div id="ad-progress-fill" class="ad-progress-fill"></div>
                </div>
                <div class="ad-reward-notice">REWARD GRANTED IN: <span id="ad-countdown">2</span>s</div>
                <button id="ad-skip-btn" class="ad-skip-btn" style="display: none;">SKIP AD</button>
            </div>
        `;

        overlay.style.display = 'flex';

        let duration = 2; // 2 seconds high-tempo simulation
        const progressFill = document.getElementById('ad-progress-fill');
        const countdownEl = document.getElementById('ad-countdown');
        const skipBtn = document.getElementById('ad-skip-btn');

        if (progressFill) progressFill.style.transition = `width ${duration}s linear`;
        setTimeout(() => {
            if (progressFill) progressFill.style.width = '100%';
        }, 30);

        let remaining = duration;
        const timer = setInterval(() => {
            remaining--;
            if (countdownEl) countdownEl.innerText = remaining;
            if (remaining <= 0) {
                clearInterval(timer);
                if (skipBtn) {
                    skipBtn.style.display = 'inline-block';
                    skipBtn.innerText = 'COLLECT REWARD ✓';
                    skipBtn.onclick = () => {
                        this._closeAd(overlay);
                        if (onReward) onReward();
                    };
                } else {
                    this._closeAd(overlay);
                    if (onReward) onReward();
                }
            }
        }, 1000);
    },

    _closeAd(overlay) {
        this.isAdPlaying = false;
        if (overlay) {
            overlay.style.display = 'none';
        }
    }
};

window.AdManager = AdManager;
