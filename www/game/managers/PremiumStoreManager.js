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
        purchaseHistory: []
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

    static init() {
        this.load();
        this.registerPremiumCosmetics();
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
            description: 'Neon ışıklı fütüristik şehir silüeti.',
            color: '#1a0a2e'
        };
        CosmeticsManager.ITEMS['bg_void_realm'] = {
            id: 'bg_void_realm', type: 'background', categoryName: 'ARKA PLAN',
            name: 'Boşluk Diyarı', rarity: 'PREMIUM', premium: true,
            description: 'Mor-siyah kozmik boşluk portalları.',
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
        if (ms <= 0) return 'SÜRE DOLDU';
        const hours = Math.floor(ms / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}s ${minutes}dk kaldı`;
    }

    // Simulate purchase (in production: use Capacitor IAP plugin)
    static purchase(productId) {
        const product = this.PRODUCTS[productId];
        if (!product) return;

        // Check for native IAP plugin
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppPurchase) {
            // Native purchase flow
            window.Capacitor.Plugins.InAppPurchase.purchase({ productId: productId })
                .then(() => this.grantPurchase(productId))
                .catch(err => console.warn('Purchase failed:', err));
            return;
        }

        // Web simulation: directly grant (for testing)
        this.grantPurchase(productId);
    }

    static grantPurchase(productId) {
        const product = this.PRODUCTS[productId];
        if (!product) return;

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
                    const packResult = CosmeticsManager.openPack('pack_quantum');
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
        if (typeof playSound === 'function') playSound('levelup');
        if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
            ArmoryUI.showToast(`✅ ${product.name} satın alındı!`, true);
        }
        if (typeof ArmoryUI !== 'undefined') ArmoryUI.updateCoinBadges();
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

        const getIcon = (key, size = 32) => typeof IconSystem !== 'undefined' ? IconSystem.get(key, { size }) : '';
        const checkIcon = typeof IconSystem !== 'undefined' ? IconSystem.get('check', { size: 16, color: '#22c55e' }) : '✓';
        const timerIcon = typeof IconSystem !== 'undefined' ? IconSystem.get('timer', { size: 16, color: '#ef4444' }) : '';

        // Starter Pack (with countdown if available)
        const starterPack = this.PRODUCTS.starter_pack;
        if (!this.state.starterPackBought) {
            const timeLeft = this.getStarterPackTimeLeft();
            if (timeLeft > 0) {
                html += `
                    <div class="premium-product-card starter-pack-card">
                        <div class="pp-badge pulse-badge">${starterPack.badge}</div>
                        <div class="pp-timer">${timerIcon} ${this.formatTimeLeft(timeLeft)}</div>
                        <div class="pp-icon">${getIcon(starterPack.iconKey, 48)}</div>
                        <h3 class="pp-name">${starterPack.name}</h3>
                        <ul class="pp-benefits">
                            ${starterPack.benefits.map(b => `<li>${checkIcon} ${b}</li>`).join('')}
                        </ul>
                        <button class="main-btn pp-buy-btn" data-product="starter_pack">
                            ${starterPack.price} İLE SATIN AL
                        </button>
                    </div>
                `;
            }
        }

        // Remove Ads
        const removeAds = this.PRODUCTS.remove_ads;
        html += `
            <div class="premium-product-card ${this.state.adsRemoved ? 'purchased' : 'featured'}">
                <div class="pp-badge">${removeAds.badge}</div>
                <div class="pp-icon">${getIcon(removeAds.iconKey, 48)}</div>
                <h3 class="pp-name">${removeAds.name}</h3>
                <ul class="pp-benefits">
                    ${removeAds.benefits.map(b => `<li>${checkIcon} ${b}</li>`).join('')}
                </ul>
                ${this.state.adsRemoved
                    ? `<div class="pp-purchased">${checkIcon} SATIN ALINDI</div>`
                    : `<button class="main-btn pp-buy-btn" data-product="remove_ads">${removeAds.price} İLE SATIN AL</button>`
                }
            </div>
        `;

        // Premium Cosmetic Pack
        const cosmeticPack = this.PRODUCTS.premium_cosmetic_pack;
        const cosmeticBought = this.state.purchaseHistory.includes('premium_cosmetic_pack');
        html += `
            <div class="premium-product-card ${cosmeticBought ? 'purchased' : ''}">
                <div class="pp-badge">${cosmeticPack.badge}</div>
                <div class="pp-icon">${getIcon(cosmeticPack.iconKey, 48)}</div>
                <h3 class="pp-name">${cosmeticPack.name}</h3>
                <ul class="pp-benefits">
                    ${cosmeticPack.benefits.map(b => `<li>${checkIcon} ${b}</li>`).join('')}
                </ul>
                ${cosmeticBought
                    ? `<div class="pp-purchased">${checkIcon} SATIN ALINDI</div>`
                    : `<button class="main-btn pp-buy-btn" data-product="premium_cosmetic_pack">${cosmeticPack.price} İLE SATIN AL</button>`
                }
            </div>
        `;

        // Coin Packs
        html += `<h3 class="coin-packs-header">${getIcon('coin', 20)} NEON COIN PAKETLERİ</h3>`;
        html += '<div class="coin-packs-grid">';
        ['coin_500', 'coin_1500', 'coin_5000'].forEach(id => {
            const p = this.PRODUCTS[id];
            html += `
                <div class="coin-pack-card">
                    <div class="cp-icon">${getIcon(p.iconKey, 34)}</div>
                    <div class="cp-amount">${p.coins}</div>
                    <div class="cp-label">NEON COIN</div>
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
