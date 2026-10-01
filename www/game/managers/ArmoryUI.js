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
    currentTab: 'packs',
    isOpeningPack: false,
    inspectedItem: null,
    animFrameId: null,
    testProjectiles: [],
    lastShotTime: 0,
    cardCanvases: [],

    init() {
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
                if (this.inspectedItem && CosmeticsManager.isUnlocked(this.inspectedItem.id)) {
                    CosmeticsManager.equip(this.inspectedItem.type, this.inspectedItem.id);
                    if (typeof playSound === 'function') playSound('shoot');
                    this.showToast(`${this.inspectedItem.name} kuşanıldı`, true);
                    this.renderItems(this.currentTab);
                    this.updateHangarHUD();
                }
            });
        }
    },

    updateCoinBadges() {
        if (typeof CosmeticsManager === 'undefined') return;
        const coins = CosmeticsManager.coins;

        const startCoinEl = document.getElementById('start-coin-amount');
        if (startCoinEl) startCoinEl.innerText = coins.toLocaleString();

        const armoryCoinEl = document.getElementById('armory-coin-balance');
        if (armoryCoinEl) armoryCoinEl.innerText = coins.toLocaleString();
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
                this.showToast(`+${amount} NEON COIN EKLENDİ`, true);
                if (typeof playSound === 'function') playSound('levelup');
                this.renderCurrentView();
            },
            onDismiss: () => {
                this.showToast('Reklam tamamlanmadı, ödül verilmedi.', false);
            }
        });
    },

    handleWatchAdForFreePack() {
        if (typeof AdManager === 'undefined' || this.isOpeningPack) return;
        AdManager.showRewardedAd({
            rewardType: 'FREE_CIPHER',
            onSuccess: () => {
                this.showToast('Ücretsiz Sandık Açılıyor', true);
                this.executePackOpening('pack_alpha', true);
            },
            onDismiss: () => {
                this.showToast('Reklam tamamlanmadı.', false);
            }
        });
    },

    openArmory() {
        this.updateCoinBadges();
        this.switchTab(this.currentTab);
        const modal = document.getElementById('armory-modal');
        if (modal) modal.classList.remove('hidden');
        if (typeof playSound === 'function') playSound('levelup');
        this.startAnimationLoop();
    },

    closeArmory() {
        const modal = document.getElementById('armory-modal');
        if (modal) modal.classList.add('hidden');
        this.updateCoinBadges();
        this.stopAnimationLoop();
    },

    switchTab(tabName) {
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
        const packsView = document.getElementById('armory-packs-view');
        const hangarDeck = document.getElementById('armory-hangar-deck');
        const premiumView = document.getElementById('armory-premium-view');

        // Hide all views first
        if (gridView) gridView.classList.add('hidden');
        if (packsView) packsView.classList.add('hidden');
        if (hangarDeck) hangarDeck.classList.add('hidden');
        if (premiumView) premiumView.classList.add('hidden');

        if (tabName === 'packs') {
            if (packsView) packsView.classList.remove('hidden');
            this.renderPacks();
        } else if (tabName === 'premium') {
            if (premiumView) premiumView.classList.remove('hidden');
            if (typeof PremiumStoreManager !== 'undefined') {
                PremiumStoreManager.renderStore();
            }
        } else {
            if (hangarDeck) hangarDeck.classList.remove('hidden');
            if (gridView) gridView.classList.remove('hidden');

            // Default inspected item is currently equipped item in this category
            const equippedId = CosmeticsManager.getEquipped(tabName);
            this.inspectedItem = CosmeticsManager.ITEMS[equippedId] || null;
            this.updateHangarHUD();
            this.renderItems(tabName);
        }
    },

    renderCurrentView() {
        this.switchTab(this.currentTab);
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
            titleEl.innerText = isUnlocked ? this.inspectedItem.name : '???';
            titleEl.style.color = isUnlocked ? (this.inspectedItem.color || '#00f0ff') : '#94a3b8';
        }

        if (badgeEl) {
            if (isEquipped) {
                badgeEl.innerText = 'KUŞANILDI';
                badgeEl.className = 'hangar-preview-badge';
            } else if (isUnlocked) {
                badgeEl.innerText = 'ÖNİZLEME';
                badgeEl.className = 'hangar-preview-badge previewing';
            } else {
                badgeEl.innerText = 'KİLİTLİ';
                badgeEl.className = 'hangar-preview-badge';
                badgeEl.style.borderColor = '#ef4444';
                badgeEl.style.color = '#f87171';
            }
        }

        if (quickBtn) {
            if (isUnlocked && !isEquipped) {
                quickBtn.classList.remove('hidden');
            } else {
                quickBtn.classList.add('hidden');
            }
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

            const displayName = isUnlocked ? item.name : '???';
            const displayDesc = isUnlocked ? item.description : 'Sandık açarak kilidini açabilirsin.';

            card.innerHTML = `
                <div class="card-top-row">
                    <span class="card-rarity-tag ${item.rarity.toLowerCase()}">${item.rarity}</span>
                    ${isEquipped ? `<span class="equipped-pill">AKTİF</span>` : ''}
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
                            ? `<button class="card-btn active-equipped-btn" disabled>SEÇİLİ</button>`
                            : `<button class="card-btn equip-action-btn" data-cat="${category}" data-id="${item.id}">KUŞAN</button>`
                    ) : (
                        `<button class="card-btn go-to-chest-btn" data-shop="true">KİLİTLİ</button>`
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
                    if (typeof playSound === 'function') playSound('shoot');
                    this.inspectedItem = CosmeticsManager.ITEMS[id] || null;
                    this.showToast(`${CosmeticsManager.ITEMS[id]?.name || 'Tasarım'} kuşanıldı`, true);
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

            packCard.innerHTML = `
                <div class="pack-badge">${pack.badge}</div>
                <div class="pack-visual">
                    <canvas class="pack-pod-canvas" data-pack-id="${pack.id}" width="140" height="130"></canvas>
                </div>
                <h3 class="pack-name">${pack.name}</h3>
                <div class="pack-guarantee">${pack.guarantee}</div>
                <div class="pack-cost-row">
                    ${getNeonCoinSVG(20)}
                    <span class="cost-val">${pack.cost}</span>
                </div>
                <div class="pack-btn-stack">
                    ${canAfford ? (
                        `<button class="main-btn pack-decrypt-btn" data-pack-id="${pack.id}">AÇ</button>`
                    ) : (
                        `<button class="main-btn pack-need-coins-btn" data-pack-id="${pack.id}">+150 COIN (REKLAM)</button>`
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
            this.showToast(result.message || 'Sandık açılamadı.', false);
            this.isOpeningPack = false;
            return;
        }

        this.updateCoinBadges();

        const modal = document.getElementById('pack-opening-modal');
        if (!modal) return;
        modal.classList.remove('hidden');

        const item = result.item;

        // Aşama 1: Titreyen Kapsül Animasyonu
        modal.innerHTML = `
            <div class="pack-opening-card stage-shaking">
                <div class="shaking-chest-visual">
                    <canvas id="unboxing-shaking-canvas" width="160" height="150"></canvas>
                </div>
                <h3 class="opening-headline">KİLİT ÇÖZÜLÜYOR...</h3>
            </div>
        `;

        const shakeCanvas = document.getElementById('unboxing-shaking-canvas');
        if (shakeCanvas) {
            const sCtx = shakeCanvas.getContext('2d');
            this.drawPackGraphic(sCtx, packId, Date.now() * 0.005);
        }

        if (typeof playSound === 'function') playSound('spark_long');

        // Aşama 2: Büyük Patlama ve Yeni Tasarım Kartının Ortaya Çıkışı (1100ms sonra)
        setTimeout(() => {
            if (typeof playSound === 'function') playSound('levelup');

            let categoryLabel = 'YENİ TASARIM';
            if (item.type === 'core') categoryLabel = 'ÇEKİRDEK';
            else if (item.type === 'projectile') categoryLabel = 'MERMİ';
            else if (item.type === 'background') categoryLabel = 'ARKA PLAN';

            modal.innerHTML = `
                <div class="pack-opening-card stage-revealed">
                    <div class="reveal-category-pill">${categoryLabel}</div>
                    <div class="reveal-rarity-banner rarity-${item.rarity.toLowerCase()}">${item.rarity}</div>
                    
                    <div class="reveal-icon-stage">
                        <canvas id="reveal-canvas" width="180" height="140"></canvas>
                    </div>

                    <h2 class="reveal-item-title">${item.name}</h2>
                    <p class="reveal-item-desc">${result.duplicate ? `Tüm havuz açıldı — iade: +${result.refund} Coin` : item.description}</p>

                    <div class="reveal-actions-stack">
                        <button class="main-btn reveal-equip-now-btn" id="reveal-equip-btn">KUŞAN</button>
                        <button class="main-btn reveal-ad-again-btn" id="reveal-ad-again-btn">BİR DAHA AÇ (REKLAM)</button>
                        <button class="reveal-close-text-btn" id="reveal-close-btn">KAPAT</button>
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
                    if (!result.duplicate) {
                        CosmeticsManager.equip(item.type, item.id);
                        this.showToast(`${item.name} kuşanıldı`, true);
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

            if (this.currentTab === 'packs') {
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
            this.drawItemGraphic(ctx, entry.item, entry.isUnlocked, entry.isEquipped, time);
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
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Determine what to preview
        const previewCore = (this.inspectedItem && this.inspectedItem.type === 'core')
            ? this.inspectedItem.id
            : CosmeticsManager.getEquipped('core');

        const previewProj = (this.inspectedItem && this.inspectedItem.type === 'projectile')
            ? this.inspectedItem.id
            : CosmeticsManager.getEquipped('projectile');

        const previewBg = (this.inspectedItem && this.inspectedItem.type === 'background')
            ? this.inspectedItem.id
            : CosmeticsManager.getEquipped('background');

        // 1. Ambient Background with Smooth Blurred Nebula Atmosphere
        const bgKey = (previewBg || '').replace('bg_', '');
        const bgCfg = (window.BackgroundManager && window.BackgroundManager.configs[bgKey])
            ? window.BackgroundManager.configs[bgKey]
            : (window.BackgroundManager ? window.BackgroundManager.configs.nebula : null);

        if (bgCfg) {
            const [br, bg, bb] = bgCfg.base;
            ctx.fillStyle = `rgb(${br}, ${bg}, ${bb})`;
            ctx.fillRect(0, 0, w, h);

            if (bgCfg.clouds && bgCfg.clouds.length > 0) {
                const hGrad = ctx.createRadialGradient(w * 0.7, h * 0.45, 10, w * 0.7, h * 0.45, w * 0.65);
                hGrad.addColorStop(0, bgCfg.clouds[0].color);
                hGrad.addColorStop(0.6, bgCfg.clouds[0].stop);
                hGrad.addColorStop(1, 'transparent');
                ctx.fillStyle = hGrad;
                ctx.fillRect(0, 0, w, h);

                if (bgCfg.clouds[1]) {
                    const hGrad2 = ctx.createRadialGradient(w * 0.25, h * 0.6, 5, w * 0.25, h * 0.6, w * 0.45);
                    hGrad2.addColorStop(0, bgCfg.clouds[1].color);
                    hGrad2.addColorStop(1, 'transparent');
                    ctx.fillStyle = hGrad2;
                    ctx.fillRect(0, 0, w, h);
                }
            }
        } else {
            ctx.fillStyle = '#060410';
            ctx.fillRect(0, 0, w, h);
        }

        // 2. Holographic Landing Grid
        const cx = w * 0.28;
        const cy = h * 0.52;

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(cx, cy, 40, time * 0.5, time * 0.5 + Math.PI * 1.2);
        ctx.stroke();

        // 3. Firing range line to the right
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(cx + 40, cy);
        ctx.lineTo(w - 20, cy);
        ctx.stroke();
        ctx.setLineDash([]);

        // 4. Update and draw test projectiles
        const now = Date.now();
        if (now - this.lastShotTime > 420) {
            this.testProjectiles.push({
                x: cx + 24,
                y: cy,
                vx: 5.5,
                color: CosmeticsManager.ITEMS[previewProj]?.color || '#00ffff'
            });
            this.lastShotTime = now;
        }

        for (let i = this.testProjectiles.length - 1; i >= 0; i--) {
            const p = this.testProjectiles[i];
            p.x += p.vx;

            // Draw projectile based on preview skin
            ctx.save();
            ctx.translate(p.x, p.y);
            this.drawProjectileInstance(ctx, previewProj, p.color, time);
            ctx.restore();

            if (p.x > w - 10) {
                this.testProjectiles.splice(i, 1);
            }
        }

        // 5. Draw the Floating Ship Core
        const floatY = cy + Math.sin(time * 3) * 3;
        ctx.save();
        ctx.translate(cx, floatY);
        this.drawCoreInstance(ctx, previewCore, time, false);
        ctx.restore();
    },

    // Draw single Core in canvas context
    drawCoreInstance(ctx, coreId, time, isLocked = false) {
        const item = CosmeticsManager.ITEMS[coreId] || CosmeticsManager.ITEMS.core_default;
        const color = isLocked ? '#475569' : (item.color || '#00ffff');
        const r = 18;

        if (isLocked) {
            ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            return;
        }

        switch (coreId) {
            case 'core_prism': {
                ctx.rotate(time * 0.8);
                const sides = 6;
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const a = (Math.PI * 2 / sides) * i;
                    const px = Math.cos(a) * r;
                    const py = Math.sin(a) * r;
                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 12;
                ctx.fill();

                // Facet lines
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                for (let i = 0; i < sides; i++) {
                    const a = (Math.PI * 2 / sides) * i;
                    ctx.moveTo(0, 0);
                    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
                }
                ctx.stroke();

                // Center diamond
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'core_pulsar': {
                const pulse = 1 + Math.sin(time * 4) * 0.08;
                ctx.shadowColor = color;
                ctx.shadowBlur = 14;

                ctx.lineWidth = 2.2;
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.25 * pulse, r * 0.45, time * 1.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#ffffff';
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 1.25 * pulse, r * 0.45, -time * 1.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.65 * pulse, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'core_singularity': {
                ctx.rotate(time * 1.4);
                const grad = ctx.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 1.4);
                grad.addColorStop(0, 'rgba(184, 68, 255, 0.95)');
                grad.addColorStop(0.7, 'rgba(0, 240, 255, 0.6)');
                grad.addColorStop(1, 'transparent');

                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
                ctx.fill();

                // Swirl Jets
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 1.8;
                for (let i = 0; i < 4; i++) {
                    const off = (Math.PI / 2) * i;
                    ctx.beginPath();
                    ctx.arc(0, 0, r * 0.9, off, off + 0.85);
                    ctx.stroke();
                }

                // Black Event Horizon
                ctx.fillStyle = '#04020a';
                ctx.strokeStyle = '#d946ef';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                break;
            }

            case 'core_chrono': {
                ctx.rotate(time * 0.5);
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.fill();

                ctx.shadowBlur = 0;
                ctx.strokeStyle = '#ffd700';
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const a = (Math.PI * 2 / 8) * i;
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * (r * 0.65), Math.sin(a) * (r * 0.65));
                    ctx.lineTo(Math.cos(a) * (r * 1.05), Math.sin(a) * (r * 1.05));
                    ctx.stroke();
                }

                ctx.fillStyle = '#170f03';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
                ctx.fill();

                // Needles
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(-time * 2.5) * (r * 0.35), Math.sin(-time * 2.5) * (r * 0.35));
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(time * 1.2) * (r * 0.4), Math.sin(time * 1.2) * (r * 0.4));
                ctx.stroke();
                break;
            }

            case 'core_glitch': {
                const jitter = (Math.floor(Date.now() / 80) % 2 === 0) ? (Math.random() - 0.5) * 3 : 0;
                ctx.fillStyle = 'rgba(0, 240, 255, 0.75)';
                ctx.beginPath();
                ctx.arc(jitter, -jitter, r, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(255, 0, 100, 0.75)';
                ctx.beginPath();
                ctx.arc(-jitter, jitter, r * 0.95, 0, Math.PI * 2);
                ctx.fill();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1;
                for (let y = -r; y <= r; y += 6) {
                    ctx.beginPath();
                    ctx.moveTo(-r * 0.7, y);
                    ctx.lineTo(r * 0.7, y);
                    ctx.stroke();
                }
                break;
            }

            case 'core_solar': {
                ctx.shadowColor = '#ff5500';
                ctx.shadowBlur = 18;
                ctx.fillStyle = '#ff8800';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
                ctx.fill();

                // Corona flares
                ctx.strokeStyle = '#ff3366';
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const a = (Math.PI * 2 / 8) * i + time;
                    const len = r * (1.1 + Math.sin(time * 4 + i) * 0.2);
                    ctx.beginPath();
                    ctx.moveTo(Math.cos(a) * (r * 0.8), Math.sin(a) * (r * 0.8));
                    ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len);
                    ctx.stroke();
                }

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'core_dragon': {
                const pulse = 1 + Math.sin(time * 4) * 0.08;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(0, -r * 1.35 * pulse);
                ctx.quadraticCurveTo(r * 0.8, -r * 0.7, r * 1.2, -r * 0.1);
                ctx.quadraticCurveTo(r * 0.6, -r * 0.2, 0, 0);
                ctx.quadraticCurveTo(-r * 0.6, -r * 0.2, -r * 1.2, -r * 0.1);
                ctx.quadraticCurveTo(-r * 0.8, -r * 0.7, 0, -r * 1.35 * pulse);
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, r * 0.75, 0, Math.PI * 2);
                ctx.fillStyle = '#ff2200';
                ctx.fill();

                ctx.fillStyle = '#ffea00';
                ctx.beginPath();
                ctx.ellipse(0, 0, r * 0.35, r * 0.55 * pulse, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'core_aurora': {
                ctx.rotate(time * 0.6);
                for (let i = 0; i < 3; i++) {
                    const off = (Math.PI * 2 / 3) * i;
                    const waveR = r * (0.85 + Math.sin(time * 3 + i) * 0.15);
                    ctx.strokeStyle = (i === 0) ? '#00ff88' : (i === 1) ? '#00e5ff' : '#a855f7';
                    ctx.lineWidth = 2.5;
                    ctx.beginPath();
                    ctx.arc(0, 0, waveR, off, off + Math.PI * 0.9);
                    ctx.stroke();
                }

                ctx.fillStyle = '#00ffcc';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            case 'core_void_king': {
                ctx.rotate(time * 0.3);
                ctx.fillStyle = color;
                ctx.beginPath();
                const points = 5;
                for (let i = 0; i < points; i++) {
                    const a = (Math.PI * 2 / points) * i;
                    const aMid = a + Math.PI / points;
                    if (i === 0) ctx.moveTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                    else ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3);
                    ctx.lineTo(Math.cos(aMid) * (r * 0.7), Math.sin(aMid) * (r * 0.7));
                }
                ctx.closePath();
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
                ctx.fillStyle = '#080114';
                ctx.fill();
                ctx.strokeStyle = '#c084fc';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
                ctx.fill();
                break;
            }

            default: { // core_default
                ctx.shadowColor = color;
                ctx.shadowBlur = 14;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.arc(0, 0, r, 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
    },

    // Draw single Projectile instance in canvas context
    drawProjectileInstance(ctx, projId, color, time) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;

        switch (projId) {
            case 'proj_laser':
                ctx.fillStyle = color;
                ctx.fillRect(-18, -3, 36, 6);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-12, -1.5, 26, 3);
                break;

            case 'proj_plasma':
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(0, 0, 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'proj_shuriken':
                ctx.rotate(time * 12);
                ctx.fillStyle = color;
                ctx.beginPath();
                for (let s = 0; s < 4; s++) {
                    const a = s * (Math.PI / 2);
                    const aMid = a + Math.PI / 4;
                    if (s === 0) ctx.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
                    else ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
                    ctx.lineTo(Math.cos(aMid) * 4, Math.sin(aMid) * 4);
                }
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'proj_pixel':
                ctx.fillStyle = color;
                ctx.fillRect(-7, -7, 14, 14);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-3.5, -3.5, 7, 7);
                break;

            case 'proj_void':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(13, 0);
                ctx.lineTo(-9, -6);
                ctx.lineTo(-3, 0);
                ctx.lineTo(-9, 6);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'proj_storm':
                ctx.strokeStyle = color;
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(-14, 0);
                ctx.lineTo(-5, -5);
                ctx.lineTo(0, 4);
                ctx.lineTo(14, 0);
                ctx.stroke();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.2;
                ctx.stroke();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(6, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'proj_phoenix':
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(14, 0);
                ctx.quadraticCurveTo(0, -8, -10, -5);
                ctx.lineTo(-5, 0);
                ctx.lineTo(-10, 5);
                ctx.quadraticCurveTo(0, 8, 14, 0);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = '#fff7cc';
                ctx.beginPath();
                ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
                ctx.fill();
                break;

            default: // proj_default
                ctx.beginPath();
                ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    },

    // Procedural Card Canvas Generator: Renders each item in crisp vector style
    drawItemGraphic(ctx, item, isUnlocked, isEquipped, time) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;

        // Background grid pattern
        ctx.fillStyle = 'rgba(12, 10, 25, 0.95)';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 20) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
        }
        for (let y = 0; y <= h; y += 20) {
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
        }
        ctx.stroke();

        // If LOCKED: render holographic silhouette + padlock
        if (!isUnlocked) {
            ctx.save();
            ctx.translate(cx, cy);

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
        ctx.roundRect(pad, pad, bw, bh, 8);
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

            // Cloud 1 - Drifting softly
            const c1x = pad + bw * 0.35 + Math.sin(time * 0.8) * bw * 0.12;
            const c1y = pad + bh * 0.40 + Math.cos(time * 0.6) * bh * 0.12;
            const g1 = ctx.createRadialGradient(c1x, c1y, 2, c1x, c1y, bh * 0.75);
            g1.addColorStop(0, bgCfg.clouds[0].color);
            g1.addColorStop(0.65, bgCfg.clouds[0].stop);
            g1.addColorStop(1, 'transparent');
            ctx.fillStyle = g1;
            ctx.fillRect(pad, pad, bw, bh);

            // Cloud 2 - Counter drifting
            if (bgCfg.clouds[1]) {
                const c2x = pad + bw * 0.70 + Math.cos(time * 0.7) * bw * 0.12;
                const c2y = pad + bh * 0.62 + Math.sin(time * 0.9) * bh * 0.12;
                const g2 = ctx.createRadialGradient(c2x, c2y, 2, c2x, c2y, bh * 0.8);
                g2.addColorStop(0, bgCfg.clouds[1].color);
                g2.addColorStop(0.65, bgCfg.clouds[1].stop);
                g2.addColorStop(1, 'transparent');
                ctx.fillStyle = g2;
                ctx.fillRect(pad, pad, bw, bh);
            }

            // Cloud 3 - Center depth
            if (bgCfg.clouds[2]) {
                const c3x = pad + bw * 0.50;
                const c3y = pad + bh * 0.48;
                const g3 = ctx.createRadialGradient(c3x, c3y, 2, c3x, c3y, bh * 0.65);
                g3.addColorStop(0, bgCfg.clouds[2].color);
                g3.addColorStop(1, 'transparent');
                ctx.fillStyle = g3;
                ctx.fillRect(pad, pad, bw, bh);
            }

            // Ambient Cosmic Dust motes (faint, soft, out-of-focus)
            ctx.fillStyle = bgCfg.dustColor || 'rgba(255, 255, 255, 0.2)';
            for (let i = 0; i < 9; i++) {
                const dx = pad + ((i * 37 + time * 14) % bw);
                const dy = pad + ((i * 47) % bh);
                const da = 0.15 + (i % 3) * 0.12;
                ctx.globalAlpha = da;
                ctx.beginPath();
                ctx.arc(dx, dy, 1.2, 0, Math.PI * 2);
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
        ctx.roundRect(pad, pad, bw, bh, 8);
        ctx.stroke();
    },

    // Procedural High-Tech Cipher Pods
    drawPackGraphic(ctx, packId, time) {
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;

        let primaryColor = '#00f0ff';
        let coreColor = 'rgba(0, 240, 255, 0.4)';
        if (packId === 'pack_quantum') {
            primaryColor = '#d946ef';
            coreColor = 'rgba(217, 70, 239, 0.45)';
        } else if (packId === 'pack_void') {
            primaryColor = '#ffd700';
            coreColor = 'rgba(255, 215, 0, 0.5)';
        }

        ctx.save();
        ctx.translate(cx, cy);

        // Orbital ring 1
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.shadowColor = primaryColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(0, 0, 48, 16, time, 0, Math.PI * 2);
        ctx.stroke();

        // Orbital ring 2 (counter-rotating)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 44, 15, -time * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        // Center Cyber Pod Capsule
        const podW = 34;
        const podH = 46;
        ctx.fillStyle = 'rgba(10, 8, 24, 0.92)';
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-podW / 2, -podH / 2, podW, podH, 8);
        ctx.fill();
        ctx.stroke();

        // Glowing core crystal inside
        ctx.fillStyle = coreColor;
        ctx.beginPath();
        ctx.roundRect(-podW / 2 + 4, -podH / 2 + 4, podW - 8, podH - 8, 5);
        ctx.fill();

        // Biometric / High-tech cross tick
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, 0);
        ctx.lineTo(6, 0);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 6);
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
