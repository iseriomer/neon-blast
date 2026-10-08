// One fullscreen ad at a time. Rewards are delivered only after dismissal.
const AdManager = {
    isAdPlaying: false,
    _initPromise: null,
    _active: null,
    privacyOptionsRequired: false,
    _consentVersion: 0,
    _privacyActive: false,
    _cache: {
        rewarded: { readyAt: 0, pending: null },
        interstitial: { readyAt: 0, pending: null }
    },
    _eligibleRuns: 0,
    _lastFullscreenAt: 0,
    CONFIG: {
        isTesting: false,
        testRewardedId: 'ca-app-pub-3940256099942544/5224354917',
        testInterstitialId: 'ca-app-pub-3940256099942544/1033173712',
        prodRewardedId: 'ca-app-pub-8309052672141776/7177520893',
        prodInterstitialId: 'ca-app-pub-8309052672141776/5559680299',
        loadTimeoutMs: 15000,
        cacheLifetimeMs: 45 * 60 * 1000,
        minRunDurationMs: 45000,
        interstitialEveryRuns: 3,
        fullscreenCooldownMs: 120000
    },
    getRewardedAdId() {
        return !this.CONFIG.isTesting && this.CONFIG.prodRewardedId
            ? this.CONFIG.prodRewardedId : this.CONFIG.testRewardedId;
    },
    getInterstitialAdId() {
        return !this.CONFIG.isTesting && this.CONFIG.prodInterstitialId
            ? this.CONFIG.prodInterstitialId : this.CONFIG.testInterstitialId;
    },
    isNative() {
        return !!(window.Capacitor && window.Capacitor.isNativePlatform());
    },
    isDev() {
        return !this.isNative() && new URLSearchParams(location.search).get('dev') === '1';
    },
    isReady(type) {
        const slot = this._cache[type];
        return !!slot?.readyAt && Date.now() - slot.readyAt < this.CONFIG.cacheLifetimeMs;
    },
    async preload() {
        if (!this.isNative() || this.isAdPlaying || !await this.init()) return;
        const types = ['rewarded'];
        if (typeof PremiumStoreManager === 'undefined' || PremiumStoreManager.shouldShowInterstitial()) types.push('interstitial');
        await Promise.allSettled(types.map(type => this._prepare(type)));
    },
    _prepare(type) {
        if (this._privacyActive) return Promise.resolve(false);
        const slot = this._cache[type];
        if (this.isReady(type)) return Promise.resolve(true);
        if (slot.pending) return slot.pending;
        slot.pending = (async () => {
            const consentVersion = this._consentVersion;
            try {
                if (!await this.init()) return false;
                const plugin = window.Capacitor.Plugins.AdMob;
                const options = { adId: type === 'rewarded' ? this.getRewardedAdId() : this.getInterstitialAdId(), isTesting: this.CONFIG.isTesting };
                if (type === 'rewarded') await plugin.prepareRewardVideoAd(options);
                else await plugin.prepareInterstitial(options);
                if (consentVersion !== this._consentVersion) return false;
                slot.readyAt = Date.now();
                return true;
            } catch (error) {
                slot.readyAt = 0;
                console.warn('Ad preload failed:', error);
                return false;
            } finally { slot.pending = null; }
        })();
        return slot.pending;
    },
    shouldShowAfterRun(activeDurationMs) {
        if (typeof PremiumStoreManager !== 'undefined' && !PremiumStoreManager.shouldShowInterstitial()) return false;
        if (!Number.isFinite(activeDurationMs) || activeDurationMs < this.CONFIG.minRunDurationMs) return false;
        this._eligibleRuns++;
        if (this._eligibleRuns < this.CONFIG.interstitialEveryRuns || this.isAdPlaying) return false;
        if (this._lastFullscreenAt && Date.now() - this._lastFullscreenAt < this.CONFIG.fullscreenCooldownMs) return false;
        // Never make the game-over screen wait for an unsolicited ad to load.
        return this.isDev() || (this.isNative() && this.isReady('interstitial'));
    },
    async init() {
        if (!this.isNative()) return true;
        if (!this._initPromise) {
            this._initPromise = (async () => {
                const plugin = window.Capacitor.Plugins?.AdMob;
                if (!plugin) throw new Error('AdMob plugin unavailable');
                await plugin.initialize({ initializeForTesting: this.CONFIG.isTesting });
                if (plugin.requestConsentInfo) {
                    let consent = await plugin.requestConsentInfo();
                    if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') {
                        consent = await plugin.showConsentForm();
                    }
                    this.privacyOptionsRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
                    if (consent.canRequestAds === false) throw new Error('Ads are not available');
                }
                return true;
            })().catch(error => {
                this._initPromise = null;
                console.warn('Ad initialization failed:', error);
                return false;
            });
        }
        return this._initPromise;
    },
    async showPrivacyOptions() {
        const plugin = window.Capacitor?.Plugins?.AdMob;
        if (!this.isNative() || this.isAdPlaying || this._privacyActive || !plugin?.showPrivacyOptionsForm) return false;
        this._privacyActive = true;
        try {
            await plugin.showPrivacyOptionsForm();
            this._consentVersion++;
            for (const slot of Object.values(this._cache)) slot.readyAt = 0;
            this._initPromise = null;
            return true;
        } catch (error) {
            console.warn('Ad privacy choices unavailable:', error);
            if (typeof ArmoryUI !== 'undefined') ArmoryUI.showToast(this._message('ad_unavailable', 'Please try again.'), false);
            return false;
        } finally {
            this._privacyActive = false;
            this.preload();
        }
    },
    _message(key, fallback) {
        return typeof Localization !== 'undefined' ? Localization.t(key) : fallback;
    },
    _showLoadingOverlay() {
        let overlay = document.getElementById('neon-ad-loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'neon-ad-loading-overlay';
            overlay.className = 'neon-ad-overlay';
            overlay.setAttribute('role', 'status');
            document.body.appendChild(overlay);
        }
        overlay.textContent = this._message('ad_loading', 'LOADING AD…');
        overlay.classList.remove('hidden');
        overlay.style.display = 'flex';
    },
    _hideLoadingOverlay() {
        const overlay = document.getElementById('neon-ad-loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    },
    showRewardedAd(param1, param2) {
        const success = typeof param1 === 'function' ? param1 : param1?.onSuccess;
        const dismiss = typeof param2 === 'function' ? param2 : param1?.onDismiss;
        return this._show('rewarded', success, dismiss, typeof param1 === 'object' ? param1.rewardType : undefined);
    },
    showInterstitialAd(onComplete) {
        if (typeof PremiumStoreManager !== 'undefined' && !PremiumStoreManager.shouldShowInterstitial()) {
            onComplete?.();
            return false;
        }
        return this._show('interstitial', onComplete, onComplete);
    },
    _show(type, onSuccess, onDismiss, rewardType) {
        if (this.isAdPlaying || this._privacyActive) {
            onDismiss?.();
            return false;
        }
        const op = { type, onSuccess, onDismiss, rewardType, handles: [], shown: false, rewarded: false, done: false };
        if (window.GameTelemetry) GameTelemetry.track('ad_request', { ad_type: type, reward_type: rewardType });
        this._active = op;
        this.isAdPlaying = true;
        this._showLoadingOverlay();
        if (typeof InputManager !== 'undefined') InputManager.reset();
        op.timer = setTimeout(() => this._finish(op, false, true), this.CONFIG.loadTimeoutMs);
        if (this.isNative()) this._showNative(op);
        else if (this.isDev()) this._showDevAd(op);
        else this._finish(op, false, type === 'rewarded');
        return true;
    },
    async _showNative(op) {
        try {
            if (!await this.init()) throw new Error('AdMob initialization failed');
            if (op.done) return;
            const plugin = window.Capacitor.Plugins.AdMob;
            const prefix = op.type === 'rewarded' ? 'onRewardedVideoAd' : 'interstitialAd';
            const listen = async (suffix, callback) => {
                const handle = await plugin.addListener(prefix + suffix, callback);
                if (op.done) await handle.remove();
                else op.handles.push(handle);
            };
            await listen('Showed', () => {
                if (op.done) return;
                op.shown = true;
                this._lastFullscreenAt = Date.now();
                if (op.type === 'interstitial') this._eligibleRuns = 0;
                clearTimeout(op.timer);
                this._hideLoadingOverlay();
            });
            await listen('Dismissed', () => this._finish(op, op.type === 'interstitial' || op.rewarded));
            await listen('FailedToShow', () => this._finish(op, false, true));
            if (op.type === 'rewarded') {
                await listen('Reward', reward => {
                    if (!op.done) { op.rewarded = true; op.reward = reward; }
                });
            }
            if (op.done) return;
            if (!await this._prepare(op.type)) throw new Error('Ad could not be prepared');
            if (op.done) return;
            this._cache[op.type].readyAt = 0;
            // Show promises resolve before dismissal on Android. Only events complete the flow.
            const showing = op.type === 'rewarded' ? plugin.showRewardVideoAd() : plugin.showInterstitial();
            Promise.resolve(showing).catch(error => {
                console.warn('Ad show failed:', error);
                this._finish(op, false, true);
            });
        } catch (error) {
            console.warn('Ad unavailable:', error);
            this._finish(op, false, true);
        }
    },
    _finish(op, success, unavailable = false) {
        if (op.done) return;
        op.done = true;
        if (window.GameTelemetry) GameTelemetry.track(success ? 'ad_complete' : 'ad_cancel', { ad_type: op.type, reward_type: op.rewardType });
        clearTimeout(op.timer);
        clearTimeout(op.devTimer);
        const removal = Promise.allSettled(op.handles.map(handle => handle.remove()));
        op.overlay?.remove();
        this._hideLoadingOverlay();
        this._active = null;
        this.isAdPlaying = false;
        if (unavailable && op.type === 'rewarded' && typeof ArmoryUI !== 'undefined') {
            ArmoryUI.showToast(this._message('ad_unavailable', 'Ad unavailable. Please try again.'), false);
        }
        const callback = success ? op.onSuccess : op.onDismiss;
        try { callback?.(op.reward); } catch (error) { console.error('Ad callback failed:', error); }
        if (op.shown) removal.then(() => this.preload());
    },
    _showDevAd(op) {
        this._lastFullscreenAt = Date.now();
        if (op.type === 'interstitial') this._eligibleRuns = 0;
        this._hideLoadingOverlay();
        clearTimeout(op.timer);
        const overlay = document.createElement('div');
        overlay.className = 'neon-ad-overlay';
        overlay.id = 'neon-ad-overlay';
        overlay.innerHTML = `<div class="neon-ad-box"><h3 class="ad-title">DEV / TEST</h3><p class="ad-desc" data-i18n="ad_test_desc">${this._message('ad_test_desc', 'This is a test ad.')}</p><button class="ad-skip-btn" id="ad-collect-btn" data-i18n="please_wait" disabled>${this._message('please_wait', 'Please wait…')}</button><button class="ad-skip-btn" id="ad-cancel-btn" data-i18n="cancel_action">${this._message('cancel_action', 'CANCEL')}</button></div>`;
        document.body.appendChild(overlay);
        op.overlay = overlay;
        overlay.querySelector('#ad-cancel-btn').onclick = () => this._finish(op, false);
        op.devTimer = setTimeout(() => {
            const button = overlay.querySelector('#ad-collect-btn');
            button.disabled = false;
            button.dataset.i18n = op.type === 'rewarded' ? 'collect_reward' : 'continue_action';
            button.textContent = this._message(button.dataset.i18n, op.type === 'rewarded' ? 'COLLECT REWARD' : 'CONTINUE');
            button.onclick = () => this._finish(op, true);
        }, 2000);
    }
};
window.AdManager = AdManager;
