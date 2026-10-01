// AdManager.js - Centralized Rewarded & Interstitial Ads + Monetization Provider
// Supports Web Simulation and Native Capacitor/AdMob bridge seamlessly.

const AdManager = {
    isAdPlaying: false,
    _isInitialized: false,

    // AdMob Configuration:
    // Uses Google's official Android Test Ad Unit IDs by default so ads work out-of-the-box in testing.
    // When deploying to Google Play Store: set isTesting: false and paste your real AdMob Ad Unit IDs!
    CONFIG: {
        isTesting: false, // Live production mode with real AdMob ads
        // Official Google Sample/Test Ad Units for Android:
        testRewardedId: 'ca-app-pub-3940256099942544/5224354917',
        testInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
        // Real Production Ad Units (Google AdMob):
        prodRewardedId: 'ca-app-pub-8309052672141776/7177520893',
        prodInterstitialId: 'ca-app-pub-8309052672141776/5559680299'
    },

    getRewardedAdId() {
        if (!this.CONFIG.isTesting && this.CONFIG.prodRewardedId) {
            return this.CONFIG.prodRewardedId;
        }
        return this.CONFIG.testRewardedId;
    },

    getInterstitialAdId() {
        if (!this.CONFIG.isTesting && this.CONFIG.prodInterstitialId) {
            return this.CONFIG.prodInterstitialId;
        }
        return this.CONFIG.testInterstitialId;
    },

    async init() {
        if (this._isInitialized) return;
        this._isInitialized = true;
        console.log('⚡ AdManager Initialized (Testing Mode:', this.CONFIG.isTesting, ')');

        // Pre-load ads if native Capacitor AdMob is available
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                if (AdMob.initialize) {
                    await AdMob.initialize({
                        initializeForTesting: this.CONFIG.isTesting
                    });
                }
                // Prepare initial rewarded video
                AdMob.prepareRewardVideoAd({
                    adId: this.getRewardedAdId()
                }).catch(e => console.warn('Rewarded ad preload info:', e));

                // Prepare initial interstitial
                AdMob.prepareInterstitial({
                    adId: this.getInterstitialAdId()
                }).catch(e => console.warn('Interstitial preload info:', e));
            } catch (e) {
                console.warn('AdMob initialization notice:', e);
            }
        }
    },

    // Show a Rewarded Ad (Revive, Double Coins, Free Pack, Daily Reward, Quest Bonus, Lucky Spin, Perk Reroll)
    showRewardedAd(param1, param2) {
        if (this.isAdPlaying) return;

        const onReward = typeof param1 === 'function' ? param1 : (param1 && param1.onSuccess);
        const onCancel = typeof param2 === 'function' ? param2 : (param1 && param1.onDismiss);

        // Check for Native Capacitor AdMob plugin if running on real Android device
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                this.isAdPlaying = true;
                AdMob.showRewardVideoAd()
                    .then((reward) => {
                        this.isAdPlaying = false;
                        // Reload next rewarded ad in background
                        AdMob.prepareRewardVideoAd({ adId: this.getRewardedAdId() }).catch(() => {});
                        if (onReward) onReward(reward);
                    })
                    .catch((err) => {
                        console.warn('Native rewarded ad unavailable, falling back to simulated ad:', err);
                        this.isAdPlaying = false;
                        this._showSimulatedAd(onReward, onCancel);
                    });
                return;
            } catch (e) {
                console.warn('AdMob exception, falling back to simulation:', e);
                this.isAdPlaying = false;
            }
        }

        // Standard / Web / Dev Simulation Overlay
        this._showSimulatedAd(onReward, onCancel);
    },

    // Show an Interstitial Ad (every 3rd game over, if user is not VIP)
    showInterstitialAd(onComplete) {
        if (this.isAdPlaying) {
            if (onComplete) onComplete();
            return;
        }

        // Check for Native Capacitor AdMob
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                this.isAdPlaying = true;
                AdMob.showInterstitial()
                    .then(() => {
                        this.isAdPlaying = false;
                        // Reload next interstitial in background
                        AdMob.prepareInterstitial({ adId: this.getInterstitialAdId() }).catch(() => {});
                        if (onComplete) onComplete();
                    })
                    .catch((err) => {
                        console.warn('Native interstitial unavailable, falling back to simulation:', err);
                        this.isAdPlaying = false;
                        this._showSimulatedInterstitial(onComplete);
                    });
                return;
            } catch (e) {
                console.warn('Interstitial exception:', e);
                this.isAdPlaying = false;
            }
        }

        // Web simulation: brief atmospheric banner then continue
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
