// ArmoryUI.js - Premium Cyberpunk Armory & Procedural Cosmetic Visualizer
// High-FPS Canvas Previews, Interactive Test Hangar & High-Tech Cipher Pods

function getNeonCoinSVG(size = 18) {
    return `<svg class="neon-coin-svg" viewBox="0 0 24 24" width="${size}" height="${size}" style="display:inline-block; vertical-align:middle; filter:drop-shadow(0 0 6px rgba(245, 158, 11, 0.8));">
        <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fef08a" stroke-width="1.8"/>
        <circle cx="12" cy="12" r="7.2" fill="#d97706" stroke="#fbbf24" stroke-width="1.2"/>
        <text x="12" y="16" text-anchor="middle" font-size="11" font-weight="900" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif">N</text>
    </svg>`;
}
window.getNeonCoinSVG = getNeonCoinSVG;

function getLockSVG(size = 22) {
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; opacity:0.85;">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="rgba(15, 23, 42, 0.6)"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>`;
}
window.getLockSVG = getLockSVG;

// Safe roundRect polyfill for CanvasRenderingContext2D
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r = 0) {
        if (typeof r === 'number') r = [r, r, r, r];
        const [tl, tr, br, bl] = r;
        this.beginPath();
        this.moveTo(x + tl, y);
        this.lineTo(x + w - tr, y);
        this.arcTo(x + w, y, x + w, y + tr, tr);
        this.lineTo(x + w, y + h - br);
        this.arcTo(x + w, y + h, x + w - br, y + h, br);
        this.lineTo(x + bl, y + h);
        this.arcTo(x, y + h, x, y + h - bl, bl);
        this.lineTo(x, y + tl);
        this.arcTo(x, y, x + tl, y, tl);
        this.closePath();
        return this;
    };
}

const ArmoryUI = {
    currentTab: 'store',
    isOpeningPack: false,
    inspectedItem: null,
    animFrameId: null,
    testProjectiles: [],
    lastShotTime: 0,
    cardCanvases: [],

    init() {
        if (this._initialized) return;
        this._initialized = true;
        this.bindEvents();
        this.updateCoinBadges();
    },

    bindEvents() {
        // Ana Menü Mağaza Butonu
        const openArmoryBtn = document.getElementById('armory-btn');
        if (openArmoryBtn) {
            openArmoryBtn.addEventListener('click', () => this.openArmory());
        }

        // Game Over (Lose) Ekranı Mağaza Butonu
        const goArmoryBtn = document.getElementById('game-over-armory-btn');
        if (goArmoryBtn) {
            goArmoryBtn.addEventListener('click', () => this.openArmory());
        }

        // Mağaza Kapat Butonu
        const closeArmoryBtn = document.getElementById('close-armory-btn');
        if (closeArmoryBtn) {
            closeArmoryBtn.addEventListener('click', () => this.closeArmory());
        }

        // Üst Bar: Reklam İzle +150 Coin Kazan
        const headerAdCoinBtn = document.getElementById('header-watch-ad-coin-btn');
        if (headerAdCoinBtn) {
            headerAdCoinBtn.addEventListener('click', () => this.handleWatchAdForCoins(150));
        }

        // Ücretsiz Ödül Kutusu: Reklamla +150 Coin
        const airdropCoinBtn = document.getElementById('airdrop-free-coins-btn');
        if (airdropCoinBtn) {
            airdropCoinBtn.addEventListener('click', () => this.handleWatchAdForCoins(150));
        }

        // Ücretsiz Ödül Kutusu: Reklamla Ücretsiz Sandık
        const airdropCrateBtn = document.getElementById('airdrop-free-crate-btn');
        if (airdropCrateBtn) {
            airdropCrateBtn.addEventListener('click', () => this.handleWatchAdForFreePack());
        }

        // Sekmeler
        const tabBtns = document.querySelectorAll('.armory-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });

        // Hangar Hızlı Kuşan Butonu
        const quickEquipBtn = document.getElementById('hangar-quick-equip');
        if (quickEquipBtn) {
            quickEquipBtn.addEventListener('click', () => {
                if (this.inspectedItem && !CosmeticsManager.isUnlocked(this.inspectedItem.id)) {
                    this.switchTab('store');
                    if (window.MenuAudio) MenuAudio.play('select');
                } else if (this.inspectedItem && CosmeticsManager.isUnlocked(this.inspectedItem.id)) {
                    CosmeticsManager.equip(this.inspectedItem.type, this.inspectedItem.id);
                    if (window.MenuAudio) MenuAudio.play('equip');
                    this.showToast(Localization.t('item_equipped_toast', { name: CosmeticsManager.getItemName(this.inspectedItem) }), true);
                    this.renderItems(this.inspectedItem.type);
                    this.updateHangarHUD();
                }
            });
        }
    },

    updateCoinBadges() {
        if (typeof CosmeticsManager === 'undefined') return;
        const coins = CosmeticsManager.coins;

        const startCoinEl = document.getElementById('start-coin-amount');
        if (startCoinEl) startCoinEl.innerText = coins.toLocaleString(Localization.currentLang);

        const armoryCoinEl = document.getElementById('armory-coin-balance');
        if (armoryCoinEl) armoryCoinEl.innerText = coins.toLocaleString(Localization.currentLang);
    },

    showToast(message, isSuccess = true) {
        let toast = document.getElementById('armory-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'armory-toast';
            toast.className = 'armory-toast';
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<span class="toast-msg">${message}</span>`;
        toast.className = `armory-toast show ${isSuccess ? 'toast-success' : 'toast-warn'}`;
        if (!isSuccess && window.MenuAudio) MenuAudio.play('error');

        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.className = 'armory-toast';
        }, 2600);
    },

    handleWatchAdForCoins(amount = 150) {
        if (typeof AdManager === 'undefined') return;
        AdManager.showRewardedAd({
            rewardType: 'FREE_COINS',
            onSuccess: () => {
                CosmeticsManager.addCoins(amount);
                this.updateCoinBadges();
                this.showToast(Localization.t('coins_added', { count: amount }), true);
                if (window.MenuAudio) MenuAudio.play('reward');
                this.renderCurrentView();
            },
            onDismiss: () => {
                this.showToast(Localization.t('ad_incomplete'), false);
            }
        });
    },

    handleWatchAdForFreePack() {
        if (typeof AdManager === 'undefined' || this.isOpeningPack) return;
        AdManager.showRewardedAd({
            rewardType: 'FREE_CIPHER',
            onSuccess: () => {
                this.showToast(Localization.t('free_pack_opening'), true);
                this.executePackOpening('pack_alpha', true);
            },
            onDismiss: () => {
                this.showToast(Localization.t('ad_incomplete'), false);
            }
        });
    },

    openArmory() {
        if (window.GameTelemetry) GameTelemetry.track('store_open');
        this.testProjectiles = [];
        this.lastShotTime = Date.now();
        this.updateCoinBadges();
        this.switchTab('store');
        const modal = document.getElementById('armory-modal');
        if (modal) modal.classList.remove('hidden');
        if (window.MenuAudio) MenuAudio.play('open');
        this.startAnimationLoop();
    },

    closeArmory() {
        if (this.isOpeningPack || (typeof AdManager !== 'undefined' && AdManager.isAdPlaying)) return;
        const modal = document.getElementById('armory-modal');
        if (modal) modal.classList.add('hidden');
        this.testProjectiles = [];
        this.updateCoinBadges();
        this.stopAnimationLoop();
    },

    switchTab(tabName) {
        if (tabName === 'packs') tabName = 'store';
        if (!['store', 'cores', 'projectiles', 'backgrounds'].includes(tabName)) return;
        this.currentTab = tabName;

        const tabBtns = document.querySelectorAll('.armory-tab-btn');
        tabBtns.forEach(btn => {
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        const gridView = document.getElementById('armory-items-grid');
        const storeView = document.getElementById('armory-store-view');
        const hangarDeck = document.getElementById('armory-hangar-deck');

        this.testProjectiles = [];
        this.lastShotTime = Date.now();
        const content = document.querySelector('.armory-content');
        if (content) content.scrollTop = 0;

        if (tabName === 'store' || tabName === 'packs') {
            if (storeView) storeView.classList.remove('hidden');
            if (gridView) gridView.classList.add('hidden');
            if (hangarDeck) hangarDeck.classList.add('hidden');
            this.renderStore();
        } else {
            if (storeView) storeView.classList.add('hidden');
            if (hangarDeck) hangarDeck.classList.remove('hidden');
            if (gridView) gridView.classList.remove('hidden');

            // Category normalization ('cores' -> 'core', 'projectiles' -> 'projectile', 'backgrounds' -> 'background')
            const cat = tabName.replace(/s$/, '');
            const equippedId = CosmeticsManager.getEquipped(cat);
            this.inspectedItem = CosmeticsManager.ITEMS[equippedId] || null;
            this.updateHangarHUD();
            this.renderItems(cat);
        }
    },

    renderStore() {
        this.renderPacks();
        this.renderPremiumOffers();
        this.renderCoinOffers();
    },

    renderPremiumOffers() {
        const grid = document.getElementById('store-premium-offers-grid');
        if (!grid || typeof PremiumStoreManager === 'undefined') return;
        grid.innerHTML = '';

        const offerIds = ['remove_ads', 'starter_pack', 'premium_cosmetic_pack'];
        offerIds.forEach(id => {
            const prod = PremiumStoreManager.getLocalizedProduct(id);
            if (!prod) return;

            const isOwned = (id === 'remove_ads' && PremiumStoreManager.state.adsRemoved) ||
                            (id === 'starter_pack' && PremiumStoreManager.state.starterPackBought) ||
                            (PremiumStoreManager.state.purchaseHistory && PremiumStoreManager.state.purchaseHistory.includes(id));

            const card = document.createElement('div');
            card.className = `premium-offer-card ${isOwned ? 'is-owned' : ''}`;

            let benefitsHtml = '';
            if (prod.benefits && prod.benefits.length > 0) {
                benefitsHtml = `<ul class="offer-benefits-list">` +
                    prod.benefits.map(b => `<li><span class="bullet-check">✓</span> ${b}</li>`).join('') +
                    `</ul>`;
            }

            const buyBtnText = isOwned ? Localization.t('purchased_label') : prod.canPurchase ? Localization.t('buy_with_price', { price: prod.price }) : prod.price;

            card.innerHTML = `
                <div class="offer-badge">${prod.badge || Localization.t('badge_special')}</div>
                <h4 class="offer-title">${prod.name}</h4>
                <p class="offer-desc">${prod.description}</p>
                ${benefitsHtml ? `<details class="offer-details"><summary data-i18n="menu_pack_contents">${Localization.t('menu_pack_contents')}</summary>${benefitsHtml}</details>` : ''}
                <div class="offer-footer">
                    <button class="main-btn offer-buy-btn ${isOwned ? 'owned-btn' : ''}" data-prod-id="${id}" ${isOwned || !prod.canPurchase ? 'disabled' : ''}>
                        ${buyBtnText}
                    </button>
                </div>
            `;

            grid.appendChild(card);
        });

        grid.querySelectorAll('.offer-buy-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prodId = e.currentTarget.getAttribute('data-prod-id');
                if (prodId && typeof PremiumStoreManager !== 'undefined') {
                    PremiumStoreManager.purchase(prodId);
                }
            });
        });
    },

    renderCoinOffers() {
        const grid = document.getElementById('store-coin-offers-grid');
        if (!grid || typeof PremiumStoreManager === 'undefined') return;
        grid.innerHTML = '';

        const coinIds = ['coin_500', 'coin_1500', 'coin_5000'];
        coinIds.forEach(id => {
            const prod = PremiumStoreManager.getLocalizedProduct(id);
            if (!prod) return;

            const card = document.createElement('div');
            card.className = 'coin-offer-card';

            card.innerHTML = `
                ${prod.badge ? `<div class="coin-badge-pill">${prod.badge}</div>` : ''}
                <div class="coin-offer-amount">
                    ${getNeonCoinSVG(24)}
                    <span>${prod.coins.toLocaleString(Localization.currentLang)}</span>
                </div>
                <div class="coin-offer-name">${prod.name}</div>
                <button class="main-btn coin-buy-btn" data-prod-id="${id}" ${prod.canPurchase ? '' : 'disabled'}>
                    ${prod.price}
                </button>
            `;

            grid.appendChild(card);
        });

        grid.querySelectorAll('.coin-buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prodId = e.currentTarget.getAttribute('data-prod-id');
                if (prodId && typeof PremiumStoreManager !== 'undefined') {
                    PremiumStoreManager.purchase(prodId);
                }
            });
        });
    },

    renderCurrentView() {
        this.switchTab(this.currentTab);
    },

    updateLanguage() {
        this.updateCoinBadges();
        this.renderCurrentView();
        const result = this._revealedResult;
        const modal = document.getElementById('pack-opening-modal');
        if (result && modal && !modal.classList.contains('hidden') && modal.querySelector('.stage-revealed')) {
            const item = result.item;
            modal.querySelector('.reveal-category-pill').textContent = Localization.t(`category_${item.type}`);
            modal.querySelector('.reveal-rarity-banner').textContent = Localization.t(`rarity_${item.rarity.toLowerCase()}`);
            modal.querySelector('.reveal-item-title').textContent = CosmeticsManager.getItemName(item);
            modal.querySelector('.reveal-item-desc').textContent = result.duplicate
                ? Localization.t('currency_count', { count: `+${result.refund}` }) : CosmeticsManager.getItemDesc(item);
        }
    },

    updateHangarHUD() {
        const titleEl = document.getElementById('hangar-title');
        const badgeEl = document.getElementById('hangar-badge');
        const quickBtn = document.getElementById('hangar-quick-equip');

        if (!this.inspectedItem) return;

        const isUnlocked = CosmeticsManager.isUnlocked(this.inspectedItem.id);
        const equippedId = CosmeticsManager.getEquipped(this.inspectedItem.type);
        const isEquipped = (equippedId === this.inspectedItem.id);

        if (titleEl) {
            titleEl.innerText = CosmeticsManager.getItemName(this.inspectedItem);
            titleEl.style.color = isUnlocked ? (this.inspectedItem.color || '#00f0ff') : '#94a3b8';
        }

        if (badgeEl) {
            badgeEl.style.borderColor = '';
            badgeEl.style.color = '';
            if (isEquipped) {
                badgeEl.innerText = (typeof Localization !== 'undefined' ? Localization.t('badge_equipped') : 'KUŞANILDI');
                badgeEl.className = 'hangar-preview-badge';
            } else if (isUnlocked) {
                badgeEl.innerText = (typeof Localization !== 'undefined' ? Localization.t('badge_preview') : 'ÖNİZLEME');
                badgeEl.className = 'hangar-preview-badge previewing';
            } else {
                badgeEl.innerText = (typeof Localization !== 'undefined' ? Localization.t('badge_locked') : 'KİLİTLİ');
                badgeEl.className = 'hangar-preview-badge';
                badgeEl.style.borderColor = '#ef4444';
                badgeEl.style.color = '#f87171';
            }
        }

        if (quickBtn) {
            quickBtn.classList.remove('hidden');
            quickBtn.disabled = isEquipped;
            quickBtn.innerText = Localization.t(isEquipped ? 'btn_equipped' : isUnlocked ? 'btn_equip' : 'tab_store');
        }
    },

    renderItems(category) {
        const grid = document.getElementById('armory-items-grid');
        if (!grid || typeof CosmeticsManager === 'undefined') return;
        grid.innerHTML = '';
        this.cardCanvases = [];

        const items = CosmeticsManager.getAll(category);
        const equippedId = CosmeticsManager.getEquipped(category);

        items.forEach(item => {
            const isUnlocked = CosmeticsManager.isUnlocked(item.id);
            const isEquipped = (equippedId === item.id);
            const isInspecting = (this.inspectedItem && this.inspectedItem.id === item.id);

            const card = document.createElement('div');
            card.className = `armory-item-card rarity-${item.rarity.toLowerCase()} ${isUnlocked ? 'unlocked' : 'locked'} ${isEquipped ? 'is-equipped-active' : ''} ${isInspecting ? 'is-inspecting' : ''}`;
            card.setAttribute('data-id', item.id);
            card.setAttribute('role', 'button');
            card.tabIndex = 0;
            card.setAttribute('aria-label', CosmeticsManager.getItemName(item));

            const displayName = CosmeticsManager.getItemName(item);
            const displayDesc = CosmeticsManager.getItemDesc(item);
            const activeText = typeof Localization !== 'undefined' ? Localization.t('badge_active') : 'AKTİF';
            const equippedText = typeof Localization !== 'undefined' ? Localization.t('btn_equipped') : 'SEÇİLİ';
            const equipText = typeof Localization !== 'undefined' ? Localization.t('btn_equip') : 'KUŞAN';
            const lockedText = typeof Localization !== 'undefined' ? Localization.t('badge_locked') : 'KİLİTLİ';

            card.innerHTML = `
                ${!isUnlocked ? `<span class="collection-lock">${getLockSVG(16)}</span>` : ''}
                <div class="card-top-row">
                    <span class="card-rarity-tag ${item.rarity.toLowerCase()}">${Localization.t(`rarity_${item.rarity.toLowerCase()}`)}</span>
                    ${isEquipped ? `<span class="equipped-pill">${activeText}</span>` : ''}
                </div>
                <div class="card-icon-area">
                    <canvas class="card-item-canvas" data-id="${item.id}" width="220" height="120"></canvas>
                </div>
                <div class="card-info">
                    <h4 class="card-title">${displayName}</h4>
                    <p class="card-desc">${displayDesc}</p>
                </div>
                <div class="card-action">
                    ${isUnlocked ? (
                        isEquipped 
                            ? `<button class="card-btn active-equipped-btn" disabled>${equippedText}</button>`
                            : `<button class="card-btn equip-action-btn" data-cat="${category}" data-id="${item.id}">${equipText}</button>`
                    ) : (
                        `<button class="card-btn go-to-chest-btn" data-shop="true">${item.premium ? 'PREMIUM' : (typeof Localization !== 'undefined' ? Localization.t('tab_store') : 'MAĞAZA')}</button>`
                    )}
                </div>
            `;

            // Card click: inspects item in Hangar preview
            card.addEventListener('click', (e) => {
                if (e.target.closest('.equip-action-btn') || e.target.closest('.go-to-chest-btn')) return;
                this.inspectedItem = item;
                this.updateHangarHUD();
                grid.querySelectorAll('.armory-item-card').forEach(c => c.classList.remove('is-inspecting'));
                card.classList.add('is-inspecting');
            });

            card.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); card.click(); }
            });
            grid.appendChild(card);

            const cvs = card.querySelector('.card-item-canvas');
            if (cvs) {
                this.cardCanvases.push({ canvas: cvs, item: item, isUnlocked: isUnlocked, isEquipped: isEquipped });
            }
        });

        // Draw initial frames on all card canvases
        this.drawAllCards(0);

        // Kuşanma Buton Dinleyicileri
        const equipBtns = grid.querySelectorAll('.equip-action-btn');
        equipBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cat = e.currentTarget.getAttribute('data-cat');
                const id = e.currentTarget.getAttribute('data-id');
                if (cat && id) {
                    CosmeticsManager.equip(cat, id);
                    if (window.MenuAudio) MenuAudio.play('equip');
                    this.inspectedItem = CosmeticsManager.ITEMS[id] || null;
                    this.showToast(Localization.t('item_equipped_toast', { name: CosmeticsManager.getItemName(CosmeticsManager.ITEMS[id]) }), true);
                    this.renderItems(cat);
                    this.updateHangarHUD();
                }
            });
        });

        // Kilitli tasarımlar için sandığa yönlendirme
        const shopBtns = grid.querySelectorAll('.go-to-chest-btn');
        shopBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchTab('packs');
            });
        });
    },

    renderPacks() {
        const grid = document.getElementById('cipher-packs-grid');
        if (!grid || typeof CosmeticsManager === 'undefined') return;
        grid.innerHTML = '';
        this.cardCanvases = [];

        const packs = CosmeticsManager.cipherPacks;

        packs.forEach(pack => {
            const canAfford = CosmeticsManager.coins >= pack.cost;

            const packCard = document.createElement('div');
            packCard.className = `cipher-pack-card pack-${pack.id} ${canAfford ? 'can-afford' : 'cannot-afford'}`;

            const packName = CosmeticsManager.getPackName(pack);
            const packGuarantee = CosmeticsManager.getPackGuarantee(pack);
            const openText = typeof Localization !== 'undefined' ? Localization.t('btn_open') : 'AÇ';
            const needCoinsText = typeof Localization !== 'undefined' ? Localization.t('ad_coins_badge') : '+150 COIN (REKLAM)';

            packCard.innerHTML = `
                <div class="pack-badge">${Localization.t(`rarity_${pack.rarities[pack.rarities.length - 1].toLowerCase()}`)}</div>
                <div class="pack-visual">
                    <canvas class="pack-pod-canvas" data-pack-id="${pack.id}" width="140" height="130"></canvas>
                </div>
                <h3 class="pack-name">${packName}</h3>
                <div class="pack-guarantee">${packGuarantee}</div>
                <div class="pack-cost-row">
                    ${getNeonCoinSVG(20)}
                    <span class="cost-val">${pack.cost}</span>
                </div>
                <div class="pack-btn-stack">
                    ${canAfford ? (
                        `<button class="main-btn pack-decrypt-btn" data-pack-id="${pack.id}">${openText}</button>`
                    ) : (
                        `<button class="main-btn pack-need-coins-btn" data-pack-id="${pack.id}">${needCoinsText}</button>`
                    )}
                </div>
            `;

            grid.appendChild(packCard);

            const cvs = packCard.querySelector('.pack-pod-canvas');
            if (cvs) {
                this.cardCanvases.push({ canvas: cvs, packId: pack.id, isPack: true });
            }
        });

        // Draw initial pack frames
        this.drawAllPacks(0);

        // Sandık Aç Butonları
        const decryptBtns = grid.querySelectorAll('.pack-decrypt-btn');
        decryptBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packId = e.currentTarget.getAttribute('data-pack-id');
                if (packId) this.handleOpenPack(packId);
            });
        });

        // Para Yetmiyorsa Reklam İzle Butonu
        const needCoinsBtns = grid.querySelectorAll('.pack-need-coins-btn');
        needCoinsBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleWatchAdForCoins(150);
            });
        });
    },

    handleOpenPack(packId) {
        if (this.isOpeningPack || typeof CosmeticsManager === 'undefined') return;
        this.executePackOpening(packId, false);
    },

    executePackOpening(packId, isFree = false) {
        if (this.isOpeningPack) return;
        const modal = document.getElementById('pack-opening-modal');
        if (!modal) return;
        this.isOpeningPack = true;

        let result;
        if (isFree) {
            const pack = CosmeticsManager.CIPHER_PACKS.find(p => p.id === packId) || CosmeticsManager.CIPHER_PACKS[0];
            const validItems = Object.values(CosmeticsManager.ITEMS).filter(item => {
                if (item.id === 'core_default' || item.id === 'proj_default' || item.id === 'bg_nebula') return false;
                return pack.rarities.includes(item.rarity);
            });
            const unownedItems = validItems.filter(item => !CosmeticsManager.isUnlocked(item.id));
            if (unownedItems.length > 0) {
                const picked = unownedItems[Math.floor(Math.random() * unownedItems.length)];
                CosmeticsManager.unlock(picked.id);
                result = { success: true, item: picked, category: picked.type, duplicate: false, refund: 0 };
            } else {
                CosmeticsManager.addCoins(100);
                const fallbackItem = validItems[Math.floor(Math.random() * validItems.length)];
                result = { success: true, item: fallbackItem, category: fallbackItem.type, duplicate: true, refund: 100 };
            }
        } else {
            result = CosmeticsManager.openPack(packId);
        }

        if (!result.success) {
            this.showToast(Localization.t(result.messageKey || 'pack_open_failed'), false);
            this.isOpeningPack = false;
            return;
        }

        this.updateCoinBadges();

        modal.classList.remove('hidden');

        const item = result.item;

        // Aşama 1: Titreyen Kapsül Animasyonu
        modal.innerHTML = `
            <div class="pack-opening-card stage-shaking">
                <h3 class="decrypt-pack-title">${CosmeticsManager.getPackName(CosmeticsManager.CIPHER_PACKS.find(pack => pack.id === packId))}</h3>
                <div class="shaking-chest-visual">
                    <canvas id="unboxing-shaking-canvas" width="160" height="150"></canvas>
                    <div class="concept-scan"></div>
                </div>
                <h3 class="opening-headline" data-i18n="pack_decrypting">${Localization.t('pack_decrypting')}</h3>
                <div class="decrypt-progress"></div>
                <span class="decrypt-code">A7 2F C8 91</span>
            </div>
        `;

        const shakeCanvas = document.getElementById('unboxing-shaking-canvas');
        if (shakeCanvas) {
            const sCtx = shakeCanvas.getContext('2d');
            this.drawPackGraphic(sCtx, packId, Date.now() * 0.005);
        }

        if (window.MenuAudio) MenuAudio.play('decrypt');

        // Aşama 2: Büyük Patlama ve Yeni Tasarım Kartının Ortaya Çıkışı (1100ms sonra)
        setTimeout(() => {
            if (window.MenuAudio) MenuAudio.play('reward');

            this._revealedResult = result;
            const categoryLabel = Localization.t(`category_${item.type}`);

            modal.innerHTML = `
                <div class="pack-opening-card stage-revealed">
                    <div class="reveal-category-pill">${categoryLabel}</div>
                    <h2 class="reveal-headline" data-i18n="menu_new_design">${Localization.t('menu_new_design')}</h2>
                    <div class="reveal-rarity-banner rarity-${item.rarity.toLowerCase()}">${Localization.t(`rarity_${item.rarity.toLowerCase()}`)}</div>
                    
                    <div class="reveal-icon-stage">
                        <canvas id="reveal-canvas" width="180" height="140"></canvas>
                    </div>

                    <h2 class="reveal-item-title">${CosmeticsManager.getItemName(item)}</h2>
                    <p class="reveal-item-desc">${result.duplicate ? Localization.t('currency_count', { count: `+${result.refund}` }) : CosmeticsManager.getItemDesc(item)}</p>

                    <div class="reveal-actions-stack">
                        <button class="main-btn reveal-equip-now-btn" id="reveal-equip-btn" data-i18n="btn_equip">${Localization.t('btn_equip')}</button>
                        <button class="main-btn reveal-ad-again-btn" id="reveal-ad-again-btn" data-i18n="open_again_ad">${Localization.t('open_again_ad')}</button>
                        <button class="reveal-close-text-btn" id="reveal-close-btn" data-i18n="close_btn">${Localization.t('close_btn')}</button>
                    </div>
                </div>
            `;

            // Draw revealed item on canvas
            const rCanvas = document.getElementById('reveal-canvas');
            if (rCanvas) {
                const rCtx = rCanvas.getContext('2d');
                this.drawItemGraphic(rCtx, item, true, true, 0);
            }

            // Buton Dinleyicileri
            const equipBtn = document.getElementById('reveal-equip-btn');
            if (equipBtn) {
                equipBtn.addEventListener('click', () => {
                    if (CosmeticsManager.isUnlocked(item.id)) {
                        CosmeticsManager.equip(item.type, item.id);
                        if (window.MenuAudio) MenuAudio.play('equip');
                        const itemName = CosmeticsManager.getItemName(item);
                        const toastMsg = typeof Localization !== 'undefined' ? Localization.t('item_equipped_toast', { name: itemName }) : `${itemName} kuşanıldı`;
                        this.showToast(toastMsg, true);
                    }
                    modal.classList.add('hidden');
                    this.isOpeningPack = false;
                    this.renderCurrentView();
                    this.updateCoinBadges();
                });
            }

            const adAgainBtn = document.getElementById('reveal-ad-again-btn');
            if (adAgainBtn) {
                adAgainBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    this.isOpeningPack = false;
                    this.handleWatchAdForFreePack();
                });
            }

            const closeBtn = document.getElementById('reveal-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    this.isOpeningPack = false;
                    this.renderCurrentView();
                    this.updateCoinBadges();
                });
            }

        }, 1050);
    },

    // =========================================================================
    // ANIMATION & CANVAS RENDERING ENGINE
    // =========================================================================

    startAnimationLoop() {
        if (this.animFrameId) return;

        const loop = (timestamp) => {
            const modal = document.getElementById('armory-modal');
            if (!modal || modal.classList.contains('hidden')) {
                this.stopAnimationLoop();
                return;
            }

            const time = timestamp * 0.002;

            if (this.currentTab === 'store' || this.currentTab === 'packs') {
                this.drawAllPacks(time);
            } else {
                this.drawHangarPreview(time);
                this.drawAllCards(time);
            }

            this.animFrameId = requestAnimationFrame(loop);
        };

        this.animFrameId = requestAnimationFrame(loop);
    },

    stopAnimationLoop() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    },

    drawAllCards(time) {
        if (!this.cardCanvases || this.cardCanvases.length === 0) return;
        for (let i = 0; i < this.cardCanvases.length; i++) {
            const entry = this.cardCanvases[i];
            if (!entry || !entry.canvas) continue;
            const ctx = entry.canvas.getContext('2d');
            if (!ctx) continue;
            this.drawItemGraphic(ctx, entry.item, true, entry.isEquipped, time);
        }
    },

    drawAllPacks(time) {
        if (!this.cardCanvases || this.cardCanvases.length === 0) return;
        for (let i = 0; i < this.cardCanvases.length; i++) {
            const entry = this.cardCanvases[i];
            if (!entry || !entry.isPack || !entry.canvas) continue;
            const ctx = entry.canvas.getContext('2d');
            if (!ctx) continue;
            this.drawPackGraphic(ctx, entry.packId, time);
        }
    },

    // Hangar Holographic Test Rig: real-time preview of ship + projectile firing
    drawHangarPreview(time) {
        const canvas = document.getElementById('hangar-preview-canvas');
        if (!canvas || !this.inspectedItem) return;
        this.drawItemGraphic(canvas.getContext('2d'), this.inspectedItem, true, false, time, 1.6);
    },

    drawCoreInstance(ctx, coreId, time, isLocked = false) {
        const item = CosmeticsManager.ITEMS[coreId] || CosmeticsManager.ITEMS.core_default;
        const color = isLocked ? '#475569' : (item.color || '#00ffff');
        ctx.save();
        if (CosmeticVisuals.isShip(coreId)) ctx.rotate(-Math.PI / 8);
        drawSpacecraftHull(ctx, coreId, color, 18, time, true);
        ctx.restore();
    },

    drawProjectileInstance(ctx, projId, color, time) {
        CosmeticVisuals.drawProjectile(ctx, projId, color || '#00ffff', 7, time);
    },

    preparePreviewCanvas(ctx) {
        if (!ctx) return null;
        const canvas = ctx.canvas;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (!width || !height) return null;
        const density = Math.min(window.devicePixelRatio || 1, 2);
        const pixelWidth = Math.max(1, Math.round(width * density));
        const pixelHeight = Math.max(1, Math.round(height * density));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }
        // Draw in CSS pixels, with the same scale on both axes.
        ctx.setTransform(density, 0, 0, density, 0, 0);
        ctx.clearRect(0, 0, width, height);
        return { width, height };
    },

    drawItemGraphic(ctx, item, isUnlocked, isEquipped, time, previewScale = 1) {
        const size = this.preparePreviewCanvas(ctx);
        if (!size) return;
        const { width: w, height: h } = size;

        const cx = w / 2;
        const cy = h / 2;
        const scale = Math.max(0.1, Math.min(previewScale * 1.5, (w - 20) / 100, (h - 16) / 76));

        // If LOCKED: render holographic silhouette + padlock
        if (!isUnlocked) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);

            // Subtle silhouette of the real item
            ctx.globalAlpha = 0.25;
            if (item.type === 'core') {
                this.drawCoreInstance(ctx, item.id, time, true);
            } else if (item.type === 'projectile') {
                this.drawProjectileInstance(ctx, item.id, '#475569', time);
            } else {
                ctx.fillStyle = '#1e293b';
                ctx.fillRect(-35, -25, 70, 50);
            }
            ctx.globalAlpha = 1;

            // Rarity color rim glow
            const rColor = item.color || '#60a5fa';
            ctx.strokeStyle = rColor;
            ctx.lineWidth = 1.2;
            ctx.shadowColor = rColor;
            ctx.shadowBlur = 10;
            ctx.strokeRect(-42, -32, 84, 64);
            ctx.shadowBlur = 0;

            // Padlock glyph
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.fillRect(-14, -7, 28, 22);
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.strokeRect(-14, -7, 28, 22);

            ctx.beginPath();
            ctx.arc(0, -7, 8, Math.PI, 0);
            ctx.stroke();

            // Keyhole
            ctx.fillStyle = '#94a3b8';
            ctx.beginPath();
            ctx.arc(0, 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillRect(-1.5, 2, 3, 6);

            ctx.restore();
            return;
        }

        // UNLOCKED: Render crisp, beautiful visual
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        if (item.type === 'core') {
            this.drawCoreInstance(ctx, item.id, time, false);
        } else if (item.type === 'projectile') {
            // Draw 2 flying bolts with speed trails
            ctx.save();
            ctx.translate(-14, 0);
            this.drawProjectileInstance(ctx, item.id, item.color, time);
            ctx.restore();

            ctx.save();
            ctx.translate(14, 0);
            this.drawProjectileInstance(ctx, item.id, item.color, time);
            ctx.restore();
        } else if (item.type === 'background') {
            // Background scenic preview box
            ctx.restore(); // cancel translate
            this.drawBackgroundThumbnail(ctx, item.id, w, h, time);
            return;
        }

        ctx.restore();
    },

    // Background Scenic Window Preview - Smooth Atmospheric Blurred Color-Gradient Nebula
    drawBackgroundThumbnail(ctx, bgId, w, h, time) {
        const pad = 10;
        const bw = w - pad * 2;
        const bh = h - pad * 2;

        ctx.save();
        ctx.beginPath();
        ctx.rect(pad, pad, bw, bh);
        ctx.clip();

        const bgKey = (bgId || '').replace('bg_', '');
        const bgCfg = (window.BackgroundManager && window.BackgroundManager.configs[bgKey])
            ? window.BackgroundManager.configs[bgKey]
            : (window.BackgroundManager ? window.BackgroundManager.configs.nebula : null);

        if (bgCfg) {
            const [br, bg, bb] = bgCfg.base;
            // Base dark tone
            ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
            ctx.fillRect(pad, pad, bw, bh);

            const t = time * 1.5;

            // Cloud 1 - Drifting & breathing softly
            const c1x = pad + bw * 0.35 + Math.sin(t * 0.85) * bw * 0.20;
            const c1y = pad + bh * 0.40 + Math.cos(t * 0.70) * bh * 0.18;
            const c1r = bh * (0.75 + Math.sin(t * 1.1) * 0.18);
            const g1 = ctx.createRadialGradient(c1x, c1y, 2, c1x, c1y, c1r);
            g1.addColorStop(0, bgCfg.clouds[0]?.color || 'transparent');
            g1.addColorStop(0.65, bgCfg.clouds[0]?.stop || 'transparent');
            g1.addColorStop(1, 'transparent');
            ctx.fillStyle = g1;
            ctx.fillRect(pad, pad, bw, bh);

            // Cloud 2 - Counter drifting & expanding
            if (bgCfg.clouds[1]) {
                const c2x = pad + bw * 0.68 + Math.cos(t * 0.75) * bw * 0.20;
                const c2y = pad + bh * 0.62 + Math.sin(t * 0.85) * bh * 0.18;
                const c2r = bh * (0.80 + Math.cos(t * 0.95) * 0.18);
                const g2 = ctx.createRadialGradient(c2x, c2y, 2, c2x, c2y, c2r);
                g2.addColorStop(0, bgCfg.clouds[1].color);
                g2.addColorStop(0.65, bgCfg.clouds[1].stop);
                g2.addColorStop(1, 'transparent');
                ctx.fillStyle = g2;
                ctx.fillRect(pad, pad, bw, bh);
            }

            // Cloud 3 - Center depth
            if (bgCfg.clouds[2]) {
                const c3x = pad + bw * 0.50 + Math.sin(t * 0.5) * bw * 0.12;
                const c3y = pad + bh * 0.48 + Math.cos(t * 0.6) * bh * 0.12;
                const c3r = bh * (0.65 + Math.sin(t * 1.3) * 0.18);
                const g3 = ctx.createRadialGradient(c3x, c3y, 2, c3x, c3y, c3r);
                g3.addColorStop(0, bgCfg.clouds[2].color);
                g3.addColorStop(0.60, bgCfg.clouds[2].stop);
                g3.addColorStop(1, 'transparent');
                ctx.fillStyle = g3;
                ctx.fillRect(pad, pad, bw, bh);
            }

            // Ambient Cosmic Dust motes (faint, soft, out-of-focus, drifting upward)
            ctx.fillStyle = bgCfg.dustColor || 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < 9; i++) {
                const dx = pad + ((i * 37 + time * 18) % bw);
                const dy = pad + ((i * 47 - time * 24 + bh * 10) % bh);
                const da = 0.18 + Math.sin(time * 3 + i) * 0.12;
                ctx.globalAlpha = Math.max(0.06, da);
                ctx.beginPath();
                ctx.arc(dx, dy, 1.3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }

        ctx.restore();

        // Border frame with subtle color tint
        const frameColor = (bgCfg && bgCfg.dustColor) ? bgCfg.dustColor : 'rgba(255, 255, 255, 0.25)';
        ctx.strokeStyle = frameColor;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.rect(pad, pad, bw, bh);
        ctx.stroke();
    },

    // Procedural High-Tech Holographic Cipher Pods
    drawPackGraphic(ctx, packId, time) {
        const size = this.preparePreviewCanvas(ctx);
        if (!size) return;
        const { width: w, height: h } = size;
        const color = packId === 'pack_void' ? '#be76ff' : packId === 'pack_quantum' ? '#ffd45b' : '#bac2cf';
        ctx.save();
        ctx.translate(w / 2, h / 2);
        const r = Math.min(w, h) * .30;
        const points = [[0,-r], [r,-r*.45], [r,r*.65], [0,r*1.15], [-r,r*.65], [-r,-r*.45]];
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
        ctx.closePath();
        ctx.moveTo(-r,-r*.45);ctx.lineTo(0,r*.1);ctx.lineTo(r,-r*.45);
        ctx.moveTo(0,r*.1);ctx.lineTo(0,r*1.15);
        ctx.stroke();
        ctx.restore();
    }

};

window.ArmoryUI = ArmoryUI;

// DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ArmoryUI.init());
} else {
    ArmoryUI.init();
}
