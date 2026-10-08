// PremiumStoreManager.js - IAP Products & Premium Store
// Premium-only cosmetics, remove ads, starter pack, coin bundles
// Uses Capacitor In-App Purchases plugin when available, simulation for web

class PremiumStoreManager {
    static STORAGE_KEY = 'neonblast_premium_v1';

    static state = {
        adsRemoved: false,
        starterPackBought: false,
        starterPackFirstSeen: null, // timestamp
        vipStatus: false,
        purchaseHistory: [],
        processedTransactions: []
    };

    // IAP Product Definitions
    static PRODUCTS = {
        remove_ads: {
            id: 'remove_ads',
            name: 'REKLAMSIZ VIP',
            description: 'Tüm interstitial reklamları kaldır. Rewarded reklamlar opsiyonel kalır. Her oturum +100 bonus coin.',
            price: '$2.99',
            priceValue: 2.99,
            type: 'non_consumable',
            iconKey: 'ad_free',
            badge: 'EN POPÜLER',
            benefits: ['Interstitial reklam YOK', 'Her oyun +100 bonus coin', 'VIP rozeti (Leaderboard)', 'Ücretsiz sınırsız Reroll']
        },
        starter_pack: {
            id: 'starter_pack',
            name: 'BAŞLANGIÇ PAKETİ',
            description: '1000 Neon Coin + 1 Altın Sandık + Özel "Neon Dragon" çekirdeği. SINIRLI SÜRE!',
            price: '$1.99',
            priceValue: 1.99,
            type: 'non_consumable',
            iconKey: 'crate',
            badge: 'SINIRLI SÜRE',
            benefits: ['1000 Neon Coin', '1 Altın Sandık', '"Neon Dragon" çekirdeği (ÖZEL)'],
            timeLimit: 72 * 60 * 60 * 1000 // 72 hours
        },
        coin_500: {
            id: 'coin_500',
            name: '500 Neon Coin',
            description: '500 Neon Coin satın al.',
            price: '$0.99',
            priceValue: 0.99,
            type: 'consumable',
            iconKey: 'coin',
            badge: '',
            coins: 500
        },
        coin_1500: {
            id: 'coin_1500',
            name: '1500 Neon Coin',
            description: '1500 Neon Coin. %20 bonus!',
            price: '$2.49',
            priceValue: 2.49,
            type: 'consumable',
            iconKey: 'coin_stack',
            badge: '%20 BONUS',
            coins: 1500
        },
        coin_5000: {
            id: 'coin_5000',
            name: '5000 Neon Coin',
            description: '5000 Neon Coin. EN DEĞERLİ PAKETİ!',
            price: '$4.99',
            priceValue: 4.99,
            type: 'consumable',
            iconKey: 'crown',
            badge: 'EN DEĞERLİ',
            coins: 5000
        },
        premium_cosmetic_pack: {
            id: 'premium_cosmetic_pack',
            name: 'PREMIUM KOZMETİK SETİ',
            description: 'Özel 3 premium kozmetik: Neon Dragon Core, Plasma Storm Mermi, Cyber City Arka Plan.',
            price: '$3.99',
            priceValue: 3.99,
            type: 'non_consumable',
            iconKey: 'gem',
            badge: 'ÖZEL',
            benefits: ['Neon Dragon çekirdeği', 'Plasma Storm mermisi', 'Cyber City arka planı'],
            cosmetics: ['core_dragon', 'proj_storm', 'bg_cybercity']
        }
    };

    static translate(key, params = {}) {
        return typeof Localization !== 'undefined' ? Localization.t(key, params) : key;
    }

    static getLocalizedProduct(id) {
        const definition = this.PRODUCTS[id];
        if (!definition) return null;
        const native = !!(window.Capacitor && window.Capacitor.isNativePlatform());
        const nativeProduct = window.CdvPurchase?.store?.get(id, window.CdvPurchase?.Platform?.GOOGLE_PLAY);
        const storePrice = nativeProduct?.pricing?.price;
        const product = { ...definition, canPurchase: !native || !!(nativeProduct?.canPurchase && storePrice),
            price: native ? (storePrice || this.translate('store_price_pending')) : definition.price };
        if (!product || typeof Localization === 'undefined') return product;
        const t = (key, params) => this.translate(key, params);
        const metadata = {
            remove_ads: ['prod_remove_ads_title', 'prod_remove_ads_desc', 'badge_most_popular',
                ['benefit_no_interstitials', 'benefit_bonus_coins', 'benefit_vip_badge', 'benefit_rerolls']],
            starter_pack: ['prod_starter_pack_title', 'prod_starter_pack_desc', 'badge_limited_time',
                ['currency_count', 'benefit_gold_crate', 'benefit_dragon_core']],
            premium_cosmetic_pack: ['prod_cosmetic_pack_title', 'prod_cosmetic_pack_desc', 'badge_special',
                ['benefit_dragon_core', 'benefit_storm_projectile', 'benefit_cyber_background']]
        };
        if (product.coins) return {
            ...product,
            name: t('currency_count', { count: product.coins.toLocaleString(Localization.currentLang) }),
            description: t('coin_product_desc', { count: product.coins }),
            badge: id === 'coin_1500' ? t('badge_bonus_20') : id === 'coin_5000' ? t('badge_best_value') : ''
        };
        const [nameKey, descriptionKey, badgeKey, benefitKeys] = metadata[id];
        return { ...product, name: t(nameKey), description: t(descriptionKey), badge: t(badgeKey),
            benefits: benefitKeys.map(key => t(key, { count: 1000 })) };
    }

    static init() {
        this.load();
        this.registerPremiumCosmetics();
        this.initNativeStore();
    }

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) this.state = { ...this.state, ...JSON.parse(saved) };
        } catch (e) { console.error('PremiumStore load:', e); }
    }

    static save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) { console.error('PremiumStore save:', e); }
    }

    // Register premium-only cosmetics in CosmeticsManager
    static registerPremiumCosmetics() {
        if (typeof CosmeticsManager === 'undefined') return;

        // Premium Cores
        CosmeticsManager.ITEMS['core_dragon'] = {
            id: 'core_dragon', type: 'core', categoryName: 'ÇEKİRDEK',
            name: 'Neon Ejderha', rarity: 'PREMIUM', premium: true,
            description: 'Ateş soluyan neon ejderha çekirdeği. Sadece satın alarak elde edilir.',
            color: '#ff4500'
        };
        CosmeticsManager.ITEMS['core_aurora'] = {
            id: 'core_aurora', type: 'core', categoryName: 'ÇEKİRDEK',
            name: 'Kuzey Işıkları', rarity: 'PREMIUM', premium: true,
            description: 'Aurora borealis efekti. Sadece premium.',
            color: '#00ff88'
        };
        CosmeticsManager.ITEMS['core_void_king'] = {
            id: 'core_void_king', type: 'core', categoryName: 'ÇEKİRDEK',
            name: 'Boşluk Kralı', rarity: 'PREMIUM', premium: true,
            description: 'Karanlık madde taç efekti. Efsanevi premium.',
            color: '#8b00ff'
        };

        // Premium Projectiles
        CosmeticsManager.ITEMS['proj_storm'] = {
            id: 'proj_storm', type: 'projectile', categoryName: 'MERMİ',
            name: 'Plazma Fırtınası', rarity: 'PREMIUM', premium: true,
            description: 'Elektrikli plazma dalgaları. Premium özel.',
            color: '#00ccff'
        };
        CosmeticsManager.ITEMS['proj_phoenix'] = {
            id: 'proj_phoenix', type: 'projectile', categoryName: 'MERMİ',
            name: 'Anka Kuşu', rarity: 'PREMIUM', premium: true,
            description: 'Alev izleri bırakan ateş mermileri.',
            color: '#ff6600'
        };

        // Premium Backgrounds
        CosmeticsManager.ITEMS['bg_cybercity'] = {
            id: 'bg_cybercity', type: 'background', categoryName: 'ARKA PLAN',
            name: 'Siber Şehir', rarity: 'PREMIUM', premium: true,
            description: 'Neo-Tokyo şehir ışıkları ve kehribar-mor bokeh nebulası.',
            color: '#1a0a2e'
        };
        CosmeticsManager.ITEMS['bg_void_realm'] = {
            id: 'bg_void_realm', type: 'background', categoryName: 'ARKA PLAN',
            name: 'Boşluk Diyarı', rarity: 'PREMIUM', premium: true,
            description: 'Ametist karanlık madde yarığı ve derin kozmik boşluk nebulası.',
            color: '#0d001a'
        };

        // Apply unlocked premium items from save state
        if (this.state.purchaseHistory.includes('premium_cosmetic_pack')) {
            ['core_dragon', 'proj_storm', 'bg_cybercity'].forEach(id => CosmeticsManager.unlock(id));
        }
        if (this.state.purchaseHistory.includes('starter_pack')) {
            CosmeticsManager.unlock('core_dragon');
        }
    }

    // Get remaining time for starter pack offer
    static getStarterPackTimeLeft() {
        if (this.state.starterPackBought) return 0;

        if (!this.state.starterPackFirstSeen) {
            this.state.starterPackFirstSeen = Date.now();
            this.save();
        }

        const elapsed = Date.now() - this.state.starterPackFirstSeen;
        const remaining = this.PRODUCTS.starter_pack.timeLimit - elapsed;
        return Math.max(0, remaining);
    }

    static formatTimeLeft(ms) {
        const t = (key, params) => typeof Localization !== 'undefined' ? Localization.t(key, params) : key;
        if (ms <= 0) return t('timer_expired');
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return t('time_remaining', { hours, minutes });
    }

    // Initialize native IAP store if available (CdvPurchase / Capacitor InAppPurchase)
    static initNativeStore() {
        if (typeof window !== 'undefined' && window.CdvPurchase && window.CdvPurchase.store) {
            const store = window.CdvPurchase.store;
            try {
                // Register all products for Google Play Billing
                const products = [
                    { id: 'remove_ads', type: window.CdvPurchase.ProductType.NON_CONSUMABLE, platform: window.CdvPurchase.Platform.GOOGLE_PLAY },
                    { id: 'starter_pack', type: window.CdvPurchase.ProductType.NON_CONSUMABLE, platform: window.CdvPurchase.Platform.GOOGLE_PLAY },
                    { id: 'premium_cosmetic_pack', type: window.CdvPurchase.ProductType.NON_CONSUMABLE, platform: window.CdvPurchase.Platform.GOOGLE_PLAY },
                    { id: 'coin_500', type: window.CdvPurchase.ProductType.CONSUMABLE, platform: window.CdvPurchase.Platform.GOOGLE_PLAY },
                    { id: 'coin_1500', type: window.CdvPurchase.ProductType.CONSUMABLE, platform: window.CdvPurchase.Platform.GOOGLE_PLAY },
                    { id: 'coin_5000', type: window.CdvPurchase.ProductType.CONSUMABLE, platform: window.CdvPurchase.Platform.GOOGLE_PLAY }
                ];
                store.register(products);

                // Listen for approved purchases
                store.when().approved(transaction => {
                    this.grantTransaction(transaction);
                    Promise.resolve(transaction.finish()).catch(error => console.warn('Purchase finish failed:', error));
                });
                store.when().productUpdated(() => {
                    if (typeof ArmoryUI !== 'undefined' && !document.getElementById('armory-modal')?.classList.contains('hidden')) ArmoryUI.renderCurrentView();
                });

                Promise.resolve(store.initialize([window.CdvPurchase.Platform.GOOGLE_PLAY])).catch(error => console.warn('Store connection failed:', error));
                console.log('⚡ Native Google Play Billing Store Initialized');
            } catch (e) {
                console.warn('Native IAP store init error:', e);
            }
        }
    }

    // Purchase product (supports Native Google Play Billing & Dev Simulation)
    static grantTransaction(transaction) {
        const key = `${transaction.platform}:${transaction.transactionId}`;
        if (!transaction.transactionId || this.state.processedTransactions.includes(key)) return;
        transaction.products.forEach(product => this.grantPurchase(product.id));
        this.state.processedTransactions.push(key);
        this.save();
    }

    static purchase(productId) {
        const product = this.PRODUCTS[productId];
        if (!product) return;
        if (window.GameTelemetry) GameTelemetry.track('purchase_begin', { product_id: productId });

        // 1. Check for standard CdvPurchase (Google Play Billing)
        if (typeof window !== 'undefined' && window.CdvPurchase && window.CdvPurchase.store) {
            const store = window.CdvPurchase.store;
            const p = store.get(productId);
            if (p && p.canPurchase) {
                store.order(p.getOffer())
                    .then(() => console.log('IAP order submitted for', productId))
                    .catch(err => {
                        console.warn('Google Play purchase cancelled or failed:', err);
                        if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
                            ArmoryUI.showToast(this.translate('purchase_cancelled'), false);
                        }
                    });
                return;
            }
        }

        // 2. Check for Capacitor native InAppPurchase plugin
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppPurchase) {
            window.Capacitor.Plugins.InAppPurchase.purchase({ productId: productId })
                .then(() => this.grantPurchase(productId))
                .catch(err => {
                    console.warn('Purchase failed:', err);
                    if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
                        ArmoryUI.showToast(this.translate('purchase_cancelled'), false);
                    }
                });
            return;
        }

        // 3. Native Guard: On real Android/iOS, never grant free purchases without Play Store confirmation!
        const isNative = (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform());
        if (isNative) {
            console.warn('Google Play Store is connecting or product not loaded yet:', productId);
            if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
                ArmoryUI.showToast(this.translate('store_connecting'), false);
            }
            return;
        }

        if (!AdManager.isDev()) {
            ArmoryUI.showToast(this.translate('purchase_native_only'), false);
            return;
        }
        // Explicit web development mode only.
        console.log('Web browser simulation: granting test purchase for', productId);
        this.grantPurchase(productId);
        if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
            ArmoryUI.showToast(this.translate('purchase_test'), true);
        }
    }

    static grantPurchase(productId) {
        const product = this.PRODUCTS[productId];
        if (!product) return;
        if (product.type === 'non_consumable' && this.state.purchaseHistory.includes(productId)) return;

        switch (productId) {
            case 'remove_ads':
                this.state.adsRemoved = true;
                this.state.vipStatus = true;
                break;

            case 'starter_pack':
                this.state.starterPackBought = true;
                if (typeof CosmeticsManager !== 'undefined') {
                    CosmeticsManager.addCoins(1000);
                    CosmeticsManager.unlock('core_dragon');
                    // Open an Altın Sandık
                    CosmeticsManager.openPack('pack_quantum', true);
                }
                break;

            case 'coin_500':
            case 'coin_1500':
            case 'coin_5000':
                if (typeof CosmeticsManager !== 'undefined') {
                    CosmeticsManager.addCoins(product.coins);
                }
                break;

            case 'premium_cosmetic_pack':
                if (typeof CosmeticsManager !== 'undefined') {
                    product.cosmetics.forEach(id => CosmeticsManager.unlock(id));
                }
                break;
        }

        if (!this.state.purchaseHistory.includes(productId) && product.type === 'non_consumable') {
            this.state.purchaseHistory.push(productId);
        }

        this.save();
        if (window.GameTelemetry) GameTelemetry.track('purchase_granted', { product_id: productId });
        if (window.MenuAudio) MenuAudio.play('reward');
        if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
            ArmoryUI.showToast(this.translate('purchase_completed', { name: this.getLocalizedProduct(productId).name }), true);
        }
        if (typeof ArmoryUI !== 'undefined') ArmoryUI.updateCoinBadges();
        if (typeof ArmoryUI !== 'undefined') ArmoryUI.renderCurrentView();
    }

    static async restorePurchases() {
        const store = window.CdvPurchase?.store;
        if (!store || typeof store.restorePurchases !== 'function') {
            if (typeof ArmoryUI !== 'undefined') ArmoryUI.showToast(this.translate('restore_failed'), false);
            return false;
        }
        try {
            const error = await store.restorePurchases();
            if (error) throw error;
            // Restore durable entitlements without replaying coin/crate grants.
            for (const id of ['remove_ads', 'starter_pack', 'premium_cosmetic_pack']) {
                if (!store.owned(id)) continue;
                if (!this.state.purchaseHistory.includes(id)) this.state.purchaseHistory.push(id);
                if (id === 'remove_ads') { this.state.adsRemoved = true; this.state.vipStatus = true; }
                if (id === 'starter_pack') this.state.starterPackBought = true;
            }
            this.save();
            this.registerPremiumCosmetics();
            if (typeof ArmoryUI !== 'undefined') {
                ArmoryUI.updateCoinBadges();
                ArmoryUI.renderCurrentView();
                ArmoryUI.showToast(this.translate('restore_done'), true);
            }
            return true;
        } catch (error) {
            console.warn('Purchase restoration failed:', error);
            if (typeof ArmoryUI !== 'undefined') ArmoryUI.showToast(this.translate('restore_failed'), false);
            return false;
        }
    }

    // Should we show interstitial ads?
    static shouldShowInterstitial() {
        return !this.state.adsRemoved;
    }

    // Bonus coins for VIP users each game
    static getVipBonusCoins() {
        return this.state.adsRemoved ? 100 : 0;
    }

    // Render premium store tab
    static renderStore() {
        const container = document.getElementById('premium-store-content');
        if (!container) return;

        let html = '';

        const t = (key, params) => typeof Localization !== 'undefined' ? Localization.t(key, params) : key;
        const getIcon = (key, size = 32) => typeof IconSystem !== 'undefined' ? IconSystem.get(key, { size }) : '';
        const checkIcon = typeof IconSystem !== 'undefined' ? IconSystem.get('check', { size: 16, color: '#22c55e' }) : '✓';
        const timerIcon = typeof IconSystem !== 'undefined' ? IconSystem.get('timer', { size: 16, color: '#ef4444' }) : '';

        // Starter Pack (with countdown if available)
        const starterPack = this.getLocalizedProduct('starter_pack');
        if (!this.state.starterPackBought) {
            const timeLeft = this.getStarterPackTimeLeft();
            if (timeLeft > 0) {
                html += `
                    <div class="premium-product-card starter-pack-card">
                        <div class="pp-badge pulse-badge">${t(starterPack.badgeKey || 'badge_limited_time')}</div>
                        <div class="pp-timer">${timerIcon} ${this.formatTimeLeft(timeLeft)}</div>
                        <div class="pp-icon">${getIcon(starterPack.iconKey, 48)}</div>
                        <h3 class="pp-name">${t('prod_starter_pack_title')}</h3>
                        <ul class="pp-benefits">
                            ${starterPack.benefits.map(b => `<li>${checkIcon} ${b}</li>`).join('')}
                        </ul>
                        <button class="main-btn pp-buy-btn" data-product="starter_pack">
                            ${t('buy_with_price', { price: starterPack.price })}
                        </button>
                    </div>
                `;
            }
        }

        // Remove Ads
        const removeAds = this.getLocalizedProduct('remove_ads');
        html += `
            <div class="premium-product-card ${this.state.adsRemoved ? 'purchased' : 'featured'}">
                <div class="pp-badge">${t(removeAds.badgeKey || 'badge_most_popular')}</div>
                <div class="pp-icon">${getIcon(removeAds.iconKey, 48)}</div>
                <h3 class="pp-name">${t('prod_remove_ads_title')}</h3>
                <ul class="pp-benefits">
                    ${removeAds.benefits.map(b => `<li>${checkIcon} ${b}</li>`).join('')}
                </ul>
                ${this.state.adsRemoved
                    ? `<div class="pp-purchased">${checkIcon} ${t('purchased_label')}</div>`
                    : `<button class="main-btn pp-buy-btn" data-product="remove_ads">${t('buy_with_price', { price: removeAds.price })}</button>`
                }
            </div>
        `;

        // Premium Cosmetic Pack
        const cosmeticPack = this.getLocalizedProduct('premium_cosmetic_pack');
        const cosmeticBought = this.state.purchaseHistory.includes('premium_cosmetic_pack');
        html += `
            <div class="premium-product-card ${cosmeticBought ? 'purchased' : ''}">
                <div class="pp-badge">${t(cosmeticPack.badgeKey || 'badge_special')}</div>
                <div class="pp-icon">${getIcon(cosmeticPack.iconKey, 48)}</div>
                <h3 class="pp-name">${t('prod_cosmetic_pack_title')}</h3>
                <ul class="pp-benefits">
                    ${cosmeticPack.benefits.map(b => `<li>${checkIcon} ${b}</li>`).join('')}
                </ul>
                ${cosmeticBought
                    ? `<div class="pp-purchased">${checkIcon} ${t('purchased_label')}</div>`
                    : `<button class="main-btn pp-buy-btn" data-product="premium_cosmetic_pack">${t('buy_with_price', { price: cosmeticPack.price })}</button>`
                }
            </div>
        `;

        // Coin Packs
        html += `<h3 class="coin-packs-header">${getIcon('coin', 20)} ${t('prod_coin_packs_title')}</h3>`;
        html += '<div class="coin-packs-grid">';
        ['coin_500', 'coin_1500', 'coin_5000'].forEach(id => {
            const p = this.getLocalizedProduct(id);
            html += `
                <div class="coin-pack-card">
                    <div class="cp-icon">${getIcon(p.iconKey, 34)}</div>
                    <div class="cp-amount">${p.coins}</div>
                    <div class="cp-label">${t('currency_name')}</div>
                    ${p.badge ? `<div class="cp-badge">${p.badge}</div>` : ''}
                    <button class="main-btn cp-buy-btn" data-product="${id}">${p.price}</button>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;

        // Bind buy buttons
        container.querySelectorAll('.pp-buy-btn, .cp-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.getAttribute('data-product');
                if (productId) this.purchase(productId);
            });
        });
    }
}

window.PremiumStoreManager = PremiumStoreManager;
