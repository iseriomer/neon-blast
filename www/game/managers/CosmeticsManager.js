// CosmeticsManager.js - Manages Skins, Cores, Projectiles, Backgrounds, Neon Coins & Mystery Packs

class CosmeticsManager {
    static COINS_KEY = 'neonblast_neon_coins_v2';
    static INVENTORY_KEY = 'neonblast_cosmetics_inventory_v2';

    static _coins = 50; // Starter coins (balanced for monetization)
    static unlocked = new Set(['core_default', 'proj_default', 'bg_nebula']);
    static equipped = {
        core: 'core_default',
        projectile: 'proj_default',
        background: 'bg_nebula'
    };

    static get coins() {
        return this._coins;
    }

    static set coins(val) {
        this._coins = Math.max(0, val);
    }

    // ITEM DATABASE - Crisp, minimal, aesthetic
    static ITEMS = {
        // --- GEMİ ÇEKİRDEKLERİ (CORES) ---
        'core_default': {
            id: 'core_default',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Klasik Neon',
            rarity: 'COMMON',
            description: 'Standart neon enerji çekirdeği.',
            color: '#00ffff'
        },
        'core_prism': {
            id: 'core_prism',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Kristal Prizma',
            rarity: 'RARE',
            description: 'Dönen prizma kristal zırhı.',
            color: '#32e8ff'
        },
        'core_pulsar': {
            id: 'core_pulsar',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Pulsar Yıldızı',
            rarity: 'RARE',
            description: 'Çift yörünge halkası efekti.',
            color: '#ffe600'
        },
        'core_singularity': {
            id: 'core_singularity',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Mor Kara Delik',
            rarity: 'EPIC',
            description: 'Girdaplı mor çekim alanı.',
            color: '#b844ff'
        },
        'core_chrono': {
            id: 'core_chrono',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Zaman Çarkı',
            rarity: 'EPIC',
            description: 'Altın saat mekanizması ve ibreler.',
            color: '#ffaa00'
        },
        'core_glitch': {
            id: 'core_glitch',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Siber Glitch',
            rarity: 'LEGENDARY',
            description: 'Kromatik piksel kayması.',
            color: '#00ff66'
        },
        'core_solar': {
            id: 'core_solar',
            type: 'core',
            categoryName: 'ÇEKİRDEK',
            name: 'Güneş Alevi',
            rarity: 'LEGENDARY',
            description: 'Alevli kor halkası.',
            color: '#ff3366'
        },

        // --- MERMİ TASARIMLARI (PROJECTILES) ---
        'proj_default': {
            id: 'proj_default',
            type: 'projectile',
            categoryName: 'MERMİ',
            name: 'Standart Atış',
            rarity: 'COMMON',
            description: 'Klasik neon enerji küreleri.',
            color: '#00ffff'
        },
        'proj_laser': {
            id: 'proj_laser',
            type: 'projectile',
            categoryName: 'MERMİ',
            name: 'Lazer Işını',
            rarity: 'RARE',
            description: 'Kesintisiz neon lazer çizgileri.',
            color: '#00ffcc'
        },
        'proj_plasma': {
            id: 'proj_plasma',
            type: 'projectile',
            categoryName: 'MERMİ',
            name: 'Plazma Halkası',
            rarity: 'RARE',
            description: 'Halka biçimli plazma atışları.',
            color: '#ff55ee'
        },
        'proj_shuriken': {
            id: 'proj_shuriken',
            type: 'projectile',
            categoryName: 'MERMİ',
            name: 'Ninja Yıldızı',
            rarity: 'EPIC',
            description: 'Dönen 4 köşeli siber yıldızlar.',
            color: '#ffea00'
        },
        'proj_pixel': {
            id: 'proj_pixel',
            type: 'projectile',
            categoryName: 'MERMİ',
            name: '8-Bit Piksel',
            rarity: 'EPIC',
            description: 'Retro kare piksel atışları.',
            color: '#22c55e'
        },
        'proj_void': {
            id: 'proj_void',
            type: 'projectile',
            categoryName: 'MERMİ',
            name: 'Karanlık Ok',
            rarity: 'LEGENDARY',
            description: 'Mor karanlık madde okları.',
            color: '#a855f7'
        },

        // --- ARKA PLANLAR (BACKGROUNDS) ---
        'bg_nebula': {
            id: 'bg_nebula',
            type: 'background',
            categoryName: 'ARKA PLAN',
            name: 'Derin Uzay',
            rarity: 'COMMON',
            description: 'Klasik yıldızlı derin uzay.',
            color: '#050518'
        },
        'bg_synthgrid': {
            id: 'bg_synthgrid',
            type: 'background',
            categoryName: 'ARKA PLAN',
            name: 'Synthwave Şafak',
            rarity: 'RARE',
            description: 'Retro neon alacakaranlık ve mor günbatımı nebulası.',
            color: '#1a0033'
        },
        'bg_digitalrain': {
            id: 'bg_digitalrain',
            type: 'background',
            categoryName: 'ARKA PLAN',
            name: 'Matrix Siber Sis',
            rarity: 'EPIC',
            description: 'Derin zümrüt ve biyo-camgöbeği siber sis nebulası.',
            color: '#021206'
        },
        'bg_hyperspace': {
            id: 'bg_hyperspace',
            type: 'background',
            categoryName: 'ARKA PLAN',
            name: 'Işık Hızı Tüneli',
            rarity: 'LEGENDARY',
            description: 'Derin kobalt mavisi ve safir kozmik akış bulutsusu.',
            color: '#00081a'
        }
    };

    // ŞANS SANDIKLARI - Clean & Focused
    static CIPHER_PACKS = [
        {
            id: 'pack_alpha',
            name: 'GÜMÜŞ SANDIK',
            cost: 400,
            badge: 'NADİR',
            guarantee: 'Nadir Tasarımlar',
            description: 'Nadir seviye görsel içerikler.',
            rarities: ['RARE']
        },
        {
            id: 'pack_quantum',
            name: 'ALTIN SANDIK',
            cost: 900,
            badge: 'DESTANSI',
            guarantee: 'Nadir & Destansı',
            description: 'Nadir ve destansı görsel içerikler.',
            rarities: ['RARE', 'EPIC']
        },
        {
            id: 'pack_void',
            name: 'ELMAS SANDIK',
            cost: 2000,
            badge: 'EFSANEVİ',
            guarantee: 'Destansı & Efsanevi',
            description: 'Üst seviye efsanevi görsel içerikler.',
            rarities: ['EPIC', 'LEGENDARY']
        }
    ];

    static get cipherPacks() {
        return this.CIPHER_PACKS;
    }

    static init() {
        this.load();
        this.updateUI();
    }

    static getItemName(item) {
        if (!item) return '';
        const key = `cosmetic_${item.id}_name`;
        if (typeof Localization !== 'undefined' && Localization.translations && Localization.translations[Localization.currentLang]) {
            const val = Localization.translations[Localization.currentLang][key] || Localization.translations.en?.[key];
            if (val) return val;
        }
        return item.name;
    }

    static getItemDesc(item) {
        if (!item) return '';
        const key = `cosmetic_${item.id}_desc`;
        if (typeof Localization !== 'undefined' && Localization.translations && Localization.translations[Localization.currentLang]) {
            const val = Localization.translations[Localization.currentLang][key] || Localization.translations.en?.[key];
            if (val) return val;
        }
        return item.description;
    }

    static getPackName(pack) {
        if (!pack) return '';
        const key = `pack_${pack.id}_name`;
        if (typeof Localization !== 'undefined' && Localization.translations && Localization.translations[Localization.currentLang]) {
            const val = Localization.translations[Localization.currentLang][key] || Localization.translations.en?.[key];
            if (val) return val;
        }
        return pack.name;
    }

    static getPackGuarantee(pack) {
        if (!pack) return '';
        const key = `pack_${pack.id}_guarantee`;
        if (typeof Localization !== 'undefined' && Localization.translations && Localization.translations[Localization.currentLang]) {
            const val = Localization.translations[Localization.currentLang][key] || Localization.translations.en?.[key];
            if (val) return val;
        }
        return pack.guarantee;
    }

    // Pure Level-Based Coin Formula (Balanced for monetization)
    static calculateCoinsForLevel(level) {
        if (!level || level < 1) return 0;
        return Math.floor(level * 12 + Math.pow(level, 1.2) * 4);
    }

    static addCoins(amount) {
        if (!Number.isFinite(amount) || amount <= 0) return;
        amount = Math.floor(amount);
        this.coins += Math.max(0, amount);
        this.save();
        this.updateUI();
    }

    static spendCoins(amount) {
        if (!Number.isFinite(amount) || amount < 0) return false;
        if (this.coins < amount) return false;
        this.coins -= amount;
        this.save();
        this.updateUI();
        return true;
    }

    static isUnlocked(catOrId, maybeId) {
        const id = maybeId || catOrId;
        return this.unlocked.has(id);
    }

    static unlock(itemId) {
        this.unlocked.add(itemId);
        this.save();
        this.updateUI();
    }

    // NORMALIZED GETTER: Handles 'cores', 'core', 'projectiles', 'projectile', 'backgrounds', 'background'
    static getEquipped(type) {
        const normalized = (type === 'cores' || type === 'core') ? 'core' :
                           (type === 'projectiles' || type === 'projectile') ? 'projectile' :
                           (type === 'backgrounds' || type === 'background') ? 'background' : type;
        return this.equipped[normalized] || (normalized === 'core' ? 'core_default' : normalized === 'projectile' ? 'proj_default' : 'bg_nebula');
    }

    static getAll(type) {
        const normalized = (type === 'cores' || type === 'core') ? 'core' :
                           (type === 'projectiles' || type === 'projectile') ? 'projectile' :
                           (type === 'backgrounds' || type === 'background') ? 'background' : type;
        return Object.values(this.ITEMS).filter(item => item.type === normalized);
    }

    // NORMALIZED EQUIP: Equips the target item and automatically marks previous as unequipped!
    static equip(type, itemId) {
        const normalized = (type === 'cores' || type === 'core') ? 'core' :
                           (type === 'projectiles' || type === 'projectile') ? 'projectile' :
                           (type === 'backgrounds' || type === 'background') ? 'background' : type;

        if (!this.ITEMS[itemId] || this.ITEMS[itemId].type !== normalized || !this.isUnlocked(itemId)) return false;
        
        this.equipped[normalized] = itemId;
        this.save();

        if (normalized === 'background' && window.BackgroundManager) {
            window.BackgroundManager.applyCosmeticBackground(itemId);
        }

        // Live update in-game player and projectile styles immediately without requiring restart!
        if (normalized === 'core') {
            const item = this.ITEMS[itemId];
            if (typeof player !== 'undefined') {
                player.skin = itemId;
            }
            if (item && item.color && typeof gameState !== 'undefined' && gameState.playerStats) {
                gameState.playerStats.color = item.color;
                if (typeof updateXPBarColor === 'function') updateXPBarColor(item.color);
            }
        } else if (normalized === 'projectile') {
            const item = this.ITEMS[itemId];
            if (typeof projectilePool !== 'undefined') {
                const active = projectilePool.getActive();
                for (let i = 0; i < active.length; i++) {
                    active[i].skinId = itemId;
                    if (item && item.color) active[i].color = item.color;
                }
            }
        }

        this.updateUI();
        return true;
    }

    // PACK OPENING LOGIC
    // STRICT RULE: No duplicates as long as unowned items exist in that pack's pool!
    // Refund occurs ONLY if EVERYTHING in that pool is already unlocked!
    static openPack(packId, isFree = false) {
        const pack = this.CIPHER_PACKS.find(p => p.id === packId);
        if (!pack) return { success: false, messageKey: 'invalid_pack' };

        if (!isFree && !this.spendCoins(pack.cost)) {
            return { success: false, messageKey: 'insufficient_coins' };
        }

        // 1. Gather all items in this pack's rarity pool
        const validItems = Object.values(this.ITEMS).filter(item => {
            if (item.id === 'core_default' || item.id === 'proj_default' || item.id === 'bg_nebula') return false;
            return pack.rarities.includes(item.rarity);
        });

        // 2. Strict Filter: ONLY unowned items
        const unownedItems = validItems.filter(item => !this.isUnlocked(item.id));

        if (unownedItems.length > 0) {
            // GUARANTEED NEW UNLOCK!
            const picked = unownedItems[Math.floor(Math.random() * unownedItems.length)];
            this.unlock(picked.id);
            return {
                success: true,
                item: picked,
                category: picked.type,
                duplicate: false,
                refund: 0
            };
        } else {
            // EVERYTHING in this pool is unlocked!
            // Completed collections receive a coin rebate.
            const refund = isFree ? 100 : Math.floor(pack.cost * 0.20);
            this.addCoins(refund);
            const fallbackItem = validItems[Math.floor(Math.random() * validItems.length)];
            return {
                success: true,
                item: fallbackItem,
                category: fallbackItem.type,
                duplicate: true,
                refund: refund
            };
        }
    }

    static save() {
        try {
            localStorage.setItem(this.COINS_KEY, this.coins.toString());
            const data = {
                unlocked: Array.from(this.unlocked),
                equipped: this.equipped
            };
            localStorage.setItem(this.INVENTORY_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('Failed to save cosmetics state', e);
        }
    }

    static load() {
        try {
            const savedCoins = localStorage.getItem(this.COINS_KEY);
            if (savedCoins !== null) {
                this.coins = parseInt(savedCoins, 10) || 0;
            }

            const savedInventory = localStorage.getItem(this.INVENTORY_KEY);
            if (savedInventory) {
                const data = JSON.parse(savedInventory);
                if (data.unlocked && Array.isArray(data.unlocked)) {
                    this.unlocked = new Set(data.unlocked);
                    this.unlocked.add('core_default');
                    this.unlocked.add('proj_default');
                    this.unlocked.add('bg_nebula');
                }
                if (data.equipped) {
                    this.equipped = { ...this.equipped, ...data.equipped };
                }
            }
        } catch (e) {
            console.error('Failed to load cosmetics state', e);
        }
    }

    static updateUI() {
        if (window.ArmoryUI && window.ArmoryUI.updateCoinBadges) {
            window.ArmoryUI.updateCoinBadges();
        }
    }
}

window.CosmeticsManager = CosmeticsManager;

// Initialize on script load
CosmeticsManager.init();
