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
        if (this.isAdPlaying) {
            console.warn('⚡ Ad already playing, ignoring redundant request');
            return;
        }

        const onReward = typeof param1 === 'function' ? param1 : (param1 && param1.onSuccess);
        const onCancel = typeof param2 === 'function' ? param2 : (param1 && param1.onDismiss);

        this.isAdPlaying = true;

        // Failsafe watchdog timer: ensure isAdPlaying is never stuck forever
        const watchdog = setTimeout(() => {
            if (this.isAdPlaying) {
                console.warn('⚡ AdManager watchdog timeout triggered, releasing lock');
                this.isAdPlaying = false;
            }
        }, 10000);

        const safeReward = (reward) => {
            clearTimeout(watchdog);
            this.isAdPlaying = false;
            if (onReward) onReward(reward);
        };

        const safeCancel = () => {
            clearTimeout(watchdog);
            this.isAdPlaying = false;
            if (onCancel) onCancel();
        };

        // Check for Native Capacitor AdMob plugin if running on real Android device
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                AdMob.prepareRewardVideoAd({ adId: this.getRewardedAdId() })
                    .then(() => AdMob.showRewardVideoAd())
                    .then((reward) => {
                        safeReward(reward);
                        // Reload next rewarded ad in background
                        AdMob.prepareRewardVideoAd({ adId: this.getRewardedAdId() }).catch(() => {});
                    })
                    .catch((err) => {
                        console.warn('Native rewarded ad unavailable (or no fill yet), falling back to instant simulation:', err);
                        this._showSimulatedAd(safeReward, safeCancel);
                    });
                return;
            } catch (e) {
                console.warn('AdMob exception, falling back to simulation:', e);
            }
        }

        // Standard / Web / Dev Simulation Overlay
        this._showSimulatedAd(safeReward, safeCancel);
    },

    // Show an Interstitial Ad (every 3rd game over, if user is not VIP)
    showInterstitialAd(onComplete) {
        if (this.isAdPlaying) {
            if (onComplete) onComplete();
            return;
        }

        this.isAdPlaying = true;

        const watchdog = setTimeout(() => {
            if (this.isAdPlaying) {
                this.isAdPlaying = false;
            }
        }, 8000);

        const safeComplete = () => {
            clearTimeout(watchdog);
            this.isAdPlaying = false;
            if (onComplete) onComplete();
        };

        // Check for Native Capacitor AdMob
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            const AdMob = window.Capacitor.Plugins.AdMob;
            try {
                AdMob.prepareInterstitial({ adId: this.getInterstitialAdId() })
                    .then(() => AdMob.showInterstitial())
                    .then(() => {
                        safeComplete();
                        // Reload next interstitial in background
                        AdMob.prepareInterstitial({ adId: this.getInterstitialAdId() }).catch(() => {});
                    })
                    .catch((err) => {
                        console.warn('Native interstitial unavailable, falling back to simulation:', err);
                        this._showSimulatedInterstitial(safeComplete);
                    });
                return;
            } catch (e) {
                console.warn('Interstitial exception:', e);
            }
        }

        // Web simulation: brief atmospheric banner then continue
        this._showSimulatedInterstitial(safeComplete);
    },

    _showSimulatedInterstitial(onComplete) {
        let overlay = document.getElementById('neon-interstitial-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'neon-interstitial-overlay';
            overlay.className = 'neon-ad-overlay interstitial-overlay';
            document.body.appendChild(overlay);
        }

        // Fail-safe inline styles to guarantee visibility over any modal or canvas
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(5, 5, 12, 0.95)',
            zIndex: '99999999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            webkitBackdropFilter: 'blur(10px)'
        });

        overlay.innerHTML = `
            <div class="neon-ad-box interstitial-box">
                <div class="ad-tag">SPONSOR</div>
                <div class="ad-terminal-scan">
                    <div class="scan-line"></div>
                </div>
                <h3 class="ad-title">NEON BLAST VIP</h3>
                <p class="ad-desc">Uninterrupted gameplay & exclusive perks await in the Armory!</p>
                <div class="ad-timer-bar">
                    <div id="interstitial-progress" class="ad-progress-fill"></div>
                </div>
                <button id="interstitial-close-btn" class="ad-skip-btn" style="display:none;">CONTINUE ✕</button>
            </div>
        `;

        const progressFill = document.getElementById('interstitial-progress');
        if (progressFill) progressFill.style.transition = 'width 2.2s linear';
        setTimeout(() => {
            if (progressFill) progressFill.style.width = '100%';
        }, 30);

        // Show close button after 2.2 seconds
        setTimeout(() => {
            const closeBtn = document.getElementById('interstitial-close-btn');
            if (closeBtn) {
                closeBtn.style.display = 'inline-block';
                closeBtn.onclick = () => {
                    this._closeInterstitial(overlay);
                    if (onComplete) onComplete();
                };
            } else {
                this._closeInterstitial(overlay);
                if (onComplete) onComplete();
            }
        }, 2200);
    },

    _closeInterstitial(overlay) {
        this.isAdPlaying = false;
        if (overlay) overlay.style.display = 'none';
    },

    _showSimulatedAd(onReward, onCancel) {
        let overlay = document.getElementById('neon-ad-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'neon-ad-overlay';
            overlay.className = 'neon-ad-overlay';
            document.body.appendChild(overlay);
        }

        // Fail-safe inline styles to guarantee visibility over any modal or canvas
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100vw',
            height: '100vh',
            background: 'rgba(5, 5, 12, 0.95)',
            zIndex: '99999999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            webkitBackdropFilter: 'blur(10px)'
        });

        const isTr = (typeof Localization !== 'undefined' && Localization.currentLang === 'tr');
        const tagText = isTr ? 'REKLAM YAYINI' : 'SPONSORED BROADCAST';
        const titleText = isTr ? 'SYNTHWAVE NEURAL LINK' : 'SYNTHWAVE NEURAL LINK';
        const descText = isTr ? 'ÖDÜL VERİSİ ŞİFRELENİYOR...' : 'ESTABLISHING QUANTUM SATELLITE HANDSHAKE...';
        const rewardText = isTr ? 'ÖDÜL KAZANILIYOR: ' : 'REWARD GRANTED IN: ';
        const collectText = isTr ? 'ÖDÜLÜ AL ✓' : 'COLLECT REWARD ✓';

        overlay.innerHTML = `
            <div class="neon-ad-box">
                <div class="ad-tag">${tagText}</div>
                <div class="ad-terminal-scan">
                    <div class="scan-line"></div>
                </div>
                <h3 class="ad-title">${titleText}</h3>
                <p class="ad-desc">${descText}</p>
                <div class="ad-timer-bar">
                    <div id="ad-progress-fill" class="ad-progress-fill"></div>
                </div>
                <div class="ad-reward-notice">${rewardText}<span id="ad-countdown">2</span>s</div>
                <button id="ad-skip-btn" class="ad-skip-btn" style="display: none;">${collectText}</button>
            </div>
        `;

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
                    skipBtn.onclick = () => {
                        this._closeAd(overlay);
                        if (onReward) onReward();
                    };
                }
                // Auto-claim after brief delay if user doesn't tap
                setTimeout(() => {
                    if (this.isAdPlaying) {
                        this._closeAd(overlay);
                        if (onReward) onReward();
                    }
                }, 1000);
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
