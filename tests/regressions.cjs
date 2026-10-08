const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const tick = () => new Promise(resolve => setImmediate(resolve));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
test('revive offer remains open beyond five seconds and expires at ten seconds', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../www/game/game-OPTIMIZED.js'), 'utf8');
    const countdown = source.slice(source.indexOf('let reviveCountdownTimer = null;'), source.indexOf('function declineRevive()'));
    let now = 0, onTick, declined = 0, cleared = false;
    const number = { innerText: '' };
    const bar = { style: {} };
    const modal = { classList: { remove() {} } };
    const context = vm.createContext({
        Date: { now: () => now },
        gameState: {}, player: {},
        document: { getElementById: id => ({ 'revive-modal': modal, 'revive-countdown-num': number, 'revive-timer-bar': bar })[id] },
        setInterval: fn => { onTick = fn; return 1; },
        clearInterval: () => { cleared = true; },
        declineRevive: () => { declined++; },
        gameOver: () => { throw new Error('Revive modal unexpectedly missing'); }
    });
    vm.runInContext(countdown + '\ntriggerReviveOffer();', context);
    assert.equal(number.innerText, '10');
    now = 5500; onTick();
    assert.equal(declined, 0);
    assert.equal(number.innerText, '5');
    assert.ok(Math.abs(Number(bar.style.strokeDashoffset) / 276.46 - 0.55) < 0.001);
    now = 9900; onTick();
    assert.equal(declined, 0);
    assert.equal(number.innerText, '1');
    now = 10000; onTick();
    assert.equal(number.innerText, '0');
    assert.equal(declined, 1);
    assert.equal(cleared, true);
});
function harness(native = true) {
    const elements = new Map();
    const events = new Map();
    const storage = new Map();
    const plugin = {
        initialize: async () => {},
        prepareRewardVideoAd: async () => {},
        prepareInterstitial: async () => {},
        showRewardVideoAd: async () => {},
        showInterstitial: async () => {},
        addListener: async (name, fn) => {
            events.set(name, fn);
            return { remove: async () => events.delete(name) };
        }
    };
    const context = vm.createContext({
        console: { log() {}, warn() {}, error() {} },
        setTimeout, clearTimeout, URLSearchParams,
        location: { search: '' },
        Capacitor: { isNativePlatform: () => native, Plugins: { AdMob: plugin } },
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        document: {
            querySelector: () => null,
            getElementById: id => elements.get(id),
            createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, setAttribute() {} }),
            body: { appendChild: el => elements.set(el.id, el) }
        },
        ArmoryUI: { showToast() {}, updateCoinBadges() {}, renderCurrentView() {} }
    });
    context.window = context;
    const load = name => vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../www/game', name), 'utf8'), context);
    load('managers/AdManager.js');
    return { context, plugin, load, emit: (event, payload) => events.get(event)?.(payload), manager: context.AdManager };
}
test('native reward stays locked until dismissal and is delivered exactly once', async () => {
    const h = harness();
    let rewards = 0, cancelled = 0;
    h.manager.showRewardedAd(() => rewards++, () => cancelled++);
    await tick();
    h.emit('onRewardedVideoAdShowed');
    h.emit('onRewardedVideoAdReward', { amount: 1 });
    h.emit('onRewardedVideoAdReward', { amount: 1 });
    assert.equal(rewards, 0);
    assert.equal(h.manager.isAdPlaying, true);
    const dismiss = h.emit;
    dismiss('onRewardedVideoAdDismissed');
    dismiss('onRewardedVideoAdDismissed');
    assert.equal(rewards, 1);
    assert.equal(cancelled, 0);
    assert.equal(h.manager.isAdPlaying, false);
});
test('background preload shares requests and showing uses the prepared ad', async () => {
    const h = harness();
    let loads = 0, shows = 0;
    h.plugin.prepareRewardVideoAd = async () => { loads++; };
    h.plugin.showRewardVideoAd = async () => { shows++; };
    await Promise.all([h.manager.preload(), h.manager.preload()]);
    assert.equal(loads, 1);
    assert.equal(h.manager.isAdPlaying, false);
    assert.equal(h.manager.isReady('rewarded'), true);
    h.manager.showRewardedAd(() => {});
    await tick();
    assert.equal(loads, 1);
    assert.equal(shows, 1);
    assert.equal(h.manager.isReady('rewarded'), false);
    h.emit('onRewardedVideoAdShowed');
    h.emit('onRewardedVideoAdDismissed');
    await tick();
    assert.equal(loads, 2);
    assert.equal(h.manager.isReady('rewarded'), true);
});
test('expired cached ad reloads and failed preload can be retried without rewards', async () => {
    const h = harness();
    let loads = 0;
    h.plugin.prepareRewardVideoAd = async () => { if (++loads === 1) throw new Error('offline'); };
    await h.manager.preload();
    assert.equal(h.manager.isReady('rewarded'), false);
    assert.equal(h.manager.isAdPlaying, false);
    await h.manager.preload();
    assert.equal(h.manager.isReady('rewarded'), true);
    h.manager._cache.rewarded.readyAt = Date.now() - h.manager.CONFIG.cacheLifetimeMs - 1;
    await h.manager.preload();
    assert.equal(loads, 3);
    assert.equal(h.manager.isReady('rewarded'), true);
});
test('interstitial eligibility excludes short games, cooldown, missing ads and VIP', () => {
    const h = harness();
    let now = 1000000;
    h.context.Date = { now: () => now };
    h.manager._cache.interstitial.readyAt = now;
    for (let i = 0; i < 10; i++) assert.equal(h.manager.shouldShowAfterRun(44000), false);
    assert.equal(h.manager._eligibleRuns, 0);
    assert.equal(h.manager.shouldShowAfterRun(45000), false);
    assert.equal(h.manager.shouldShowAfterRun(45000), false);
    assert.equal(h.manager.shouldShowAfterRun(45000), true);
    h.manager._lastFullscreenAt = now;
    assert.equal(h.manager.shouldShowAfterRun(45000), false);
    now += 120001;
    assert.equal(h.manager.shouldShowAfterRun(45000), true);
    h.manager._cache.interstitial.readyAt = 0;
    assert.equal(h.manager.shouldShowAfterRun(45000), false);
    h.manager._cache.interstitial.readyAt = now;
    h.context.PremiumStoreManager = { shouldShowInterstitial: () => false };
    assert.equal(h.manager.shouldShowAfterRun(45000), false);
});
test('closing rewarded ad without reward cancels even if show promise resolved', async () => {
    const h = harness();
    let rewards = 0, cancelled = 0;
    h.manager.showRewardedAd(() => rewards++, () => cancelled++);
    await tick();
    h.emit('onRewardedVideoAdShowed');
    h.emit('onRewardedVideoAdDismissed');
    assert.equal(rewards, 0);
    assert.equal(cancelled, 1);
});
test('visible native ads are not unlocked by the loading deadline', async () => {
    const h = harness();
    h.manager.CONFIG.loadTimeoutMs = 30;
    let cancelled = 0;
    h.manager.showRewardedAd(() => {}, () => cancelled++);
    await tick();
    h.emit('onRewardedVideoAdShowed');
    await delay(50);
    assert.equal(h.manager.isAdPlaying, true);
    assert.equal(cancelled, 0);
    h.emit('onRewardedVideoAdDismissed');
});
test('late load after timeout never shows or grants an ad', async () => {
    const h = harness();
    let resolveLoad, shows = 0, cancelled = 0;
    h.plugin.prepareRewardVideoAd = () => new Promise(resolve => { resolveLoad = resolve; });
    h.plugin.showRewardVideoAd = () => { shows++; return Promise.resolve(); };
    h.manager.CONFIG.loadTimeoutMs = 20;
    h.manager.showRewardedAd(() => assert.fail('No reward allowed'), () => cancelled++);
    await tick();
    await delay(35);
    assert.equal(cancelled, 1);
    resolveLoad();
    await tick();
    assert.equal(shows, 0);
    assert.equal(h.manager.isAdPlaying, false);
});
test('load failure clears lock and calls cancel once, without simulation', async () => {
    const h = harness();
    h.plugin.prepareRewardVideoAd = async () => { throw new Error('no fill'); };
    let cancelled = 0;
    h.manager.showRewardedAd(() => assert.fail('No reward allowed'), () => cancelled++);
    await tick();
    assert.equal(cancelled, 1);
    assert.equal(h.manager.isAdPlaying, false);
});
test('interstitial show resolution does not complete before dismissal', async () => {
    const h = harness();
    let completed = 0;
    h.manager.showInterstitialAd(() => completed++);
    await tick();
    assert.equal(completed, 0);
    h.emit('interstitialAdShowed');
    h.emit('interstitialAdDismissed');
    assert.equal(completed, 1);
});
test('interstitial load failure still completes once', async () => {
    const h = harness();
    h.plugin.prepareInterstitial = async () => { throw new Error('offline'); };
    let completed = 0;
    h.manager.showInterstitialAd(() => completed++);
    await tick();
    assert.equal(completed, 1);
});
test('production web does not simulate rewards', () => {
    const h = harness(false);
    let cancelled = 0;
    h.manager.showRewardedAd(() => assert.fail('No reward allowed'), () => cancelled++);
    assert.equal(cancelled, 1);
    assert.equal(h.manager.isAdPlaying, false);
});
test('a concurrent request is rejected without disturbing the active ad', async () => {
    const h = harness();
    h.manager.showRewardedAd(() => {});
    let cancelled = 0;
    assert.equal(h.manager.showRewardedAd(() => {}, () => cancelled++), false);
    assert.equal(cancelled, 1);
    assert.equal(h.manager.isAdPlaying, true);
    await tick();
    h.emit('onRewardedVideoAdDismissed');
});
test('daily reward cannot be claimed twice and claimed day remains highlighted', () => {
    const h = harness(false);
    h.load('managers/CosmeticsManager.js');
    h.load('managers/DailyRewardManager.js');
    const before = h.context.CosmeticsManager.coins;
    h.context.DailyRewardManager.claimReward(false);
    h.context.DailyRewardManager.claimReward(true);
    assert.equal(h.context.CosmeticsManager.coins, before + 50);
    assert.equal(h.context.DailyRewardManager.getCurrentDayIndex(), 0);
});
test('starter pack grants 1000 coins plus free chest, without repeated grants', () => {
    const h = harness(false);
    h.load('managers/CosmeticsManager.js');
    h.load('managers/PremiumStoreManager.js');
    const before = h.context.CosmeticsManager.coins;
    h.context.PremiumStoreManager.grantPurchase('starter_pack');
    h.context.PremiumStoreManager.grantPurchase('starter_pack');
    assert.equal(h.context.CosmeticsManager.coins, before + 1000);
    assert.ok(h.context.CosmeticsManager.isUnlocked('core_dragon'));
});
test('invalid coin values and cross-category equip are rejected', () => {
    const h = harness(false);
    h.load('managers/CosmeticsManager.js');
    const manager = h.context.CosmeticsManager;
    const before = manager.coins;
    manager.addCoins(NaN);
    manager.addCoins(Infinity);
    assert.equal(manager.spendCoins(-100), false);
    assert.equal(manager.equip('core', 'proj_default'), false);
    assert.equal(manager.coins, before);
});
test('replayed native consumable transactions are not granted twice', () => {
    const h = harness(false);
    h.load('managers/CosmeticsManager.js');
    h.load('managers/PremiumStoreManager.js');
    const transaction = { platform: 'android-playstore', transactionId: 'order-1', products: [{ id: 'coin_500' }] };
    const before = h.context.CosmeticsManager.coins;
    h.context.PremiumStoreManager.grantTransaction(transaction);
    h.context.PremiumStoreManager.grantTransaction(transaction);
    assert.equal(h.context.CosmeticsManager.coins, before + 500);
});
test('partial quest progress persists and perks are not counted twice', () => {
    const h = harness(false);
    h.load('managers/CosmeticsManager.js');
    h.load('managers/DailyRewardManager.js');
    h.load('managers/QuestManager.js');
    const manager = h.context.QuestManager;
    manager.state.lastResetDate = manager.getTodayStr();
    manager.state.quests = [{ type: 'perks_selected', progress: 0, targetValue: 10, completed: false, reward: 50 }];
    manager.trackEvent('perks_selected', 1);
    manager.onGameEnd(1, 0, 0, 0, 1);
    assert.equal(manager.state.quests[0].progress, 1);
    const saved = JSON.parse(h.context.localStorage.getItem(manager.STORAGE_KEY));
    assert.equal(saved.quests[0].progress, 1);
});

test('survival quest uses active play time and excludes long pauses', () => {
    const h = harness(false);
    h.load('managers/DailyRewardManager.js');
    h.load('managers/QuestManager.js');
    const manager = h.context.QuestManager;
    manager.state.lastResetDate = manager.getTodayStr();
    manager.state.quests = [{ id: 'survive_min', type: 'survive_seconds', progress: 0, targetValue: 120, reward: 100, completed: false }];
    manager.session.gameStartTime = Date.now() - 600000;
    manager.onGameEnd(2, 0, 0, 0, 0, 55000);
    assert.equal(manager.state.quests[0].progress, 55);
    assert.equal(manager.state.quests[0].completed, false);
});

test('legacy run saves keep stats; corrupt saves and result screens never resume', () => {
    const storage = new Map();
    const state = { gameActive: false, isPaused: true };
    const context = vm.createContext({
        console: { log() {}, error() {}, warn() {} }, gameState: state,
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
    });
    context.window = context;
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../www/game/managers/SaveManager.js'), 'utf8'), context);
    const manager = context.SaveManager;
    const legacy = { score: 2500, level: 3, nextLevelThreshold: 2800, previousLevelThreshold: 1400, currentLevelStep: 1400, difficultyMultiplier: 1,
        playerStats: { shotCount: 4, fireRate: 180, shield: 2 }, takenPerks: ['double_shot'], hasRevivedThisRun: true };
    storage.set(manager.SAVE_KEY, JSON.stringify(legacy));
    const restored = manager.loadGame();
    assert.equal(restored.playerStats.shotCount, 4);
    assert.equal(restored.hasRevivedThisRun, true);
    assert.equal(restored.activeRunMs, 0);
    const before = storage.get(manager.SAVE_KEY);
    manager.saveGame();
    assert.equal(storage.get(manager.SAVE_KEY), before, 'results screen cannot overwrite saved run');
    for (const data of ['null', '[]', '{}', '{bad json', JSON.stringify({ ...legacy, score: null })]) {
        storage.set(manager.SAVE_KEY, data);
        assert.equal(manager.hasSave(), false);
        assert.equal(storage.get(manager.SAVE_KEY), data, 'corrupt data preserved for recovery');
    }
});

test('native store displays localized prices and restoration preserves the coin balance', async () => {
    const h = harness(true);
    h.load('managers/CosmeticsManager.js');
    h.load('managers/PremiumStoreManager.js');
    h.context.CdvPurchase = { Platform: { GOOGLE_PLAY: 'android-playstore' }, store: {
        get: id => id === 'remove_ads' ? { canPurchase: true, pricing: { price: '₺89,99' } } : undefined,
        restorePurchases: async () => undefined,
        owned: id => ['remove_ads', 'starter_pack', 'premium_cosmetic_pack'].includes(id)
    } };
    const manager = h.context.PremiumStoreManager;
    assert.equal(manager.getLocalizedProduct('remove_ads').price, '₺89,99');
    assert.equal(manager.getLocalizedProduct('remove_ads').canPurchase, true);
    assert.equal(manager.getLocalizedProduct('coin_500').canPurchase, false);
    const before = h.context.CosmeticsManager.coins;
    assert.equal(await manager.restorePurchases(), true);
    assert.equal(await manager.restorePurchases(), true);
    assert.equal(manager.state.adsRemoved, true);
    assert.equal(manager.state.starterPackBought, true);
    assert.equal(h.context.CosmeticsManager.coins, before, 'restore must not mint coins or crates');
    assert.equal(h.context.CosmeticsManager.isUnlocked('core_dragon'), true);
});

test('analytics respects opt-in, filters personal data and measures native localhost', () => {
    for (const native of [false, true]) {
        const context = vm.createContext({
            URLSearchParams, location: { search: '', hostname: 'localhost' },
            localStorage: { getItem: () => null, setItem() {} },
            CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
            document: { dispatchEvent() {} }, Capacitor: { isNativePlatform: () => native }
        });
        context.window = context;
        vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../www/game/telemetry.js'), 'utf8'), context);
        const sent = [];
        const manager = context.GameTelemetry;
        manager.setSender((name, params) => sent.push({ name, params }));
        manager.track('run_end', { level: 3 });
        assert.equal(sent.length, 0);
        manager.setConsent(true);
        manager.track('run_end', { level: 3, name: 'Player', email: 'person@example.com', score: NaN });
        assert.equal(sent.length, native ? 1 : 0);
        if (native) assert.equal(JSON.stringify(sent[0].params), JSON.stringify({ level: 3 }));
        manager.setConsent(false);
        manager.track('run_start');
        assert.equal(sent.length, native ? 1 : 0);
    }
});

test('ad privacy changes invalidate preloaded ads and do not grant rewards', async () => {
    const h = harness(true);
    h.plugin.requestConsentInfo = async () => ({ canRequestAds: true, privacyOptionsRequirementStatus: 'REQUIRED' });
    h.plugin.showPrivacyOptionsForm = async () => {};
    await h.manager.preload();
    assert.equal(h.manager.privacyOptionsRequired, true);
    const previousVersion = h.manager._consentVersion;
    assert.equal(await h.manager.showPrivacyOptions(), true);
    assert.equal(h.manager._consentVersion, previousVersion + 1);
    assert.equal(h.manager.isAdPlaying, false);
});

test('first perk offers include firepower, remain unique and respect reroll exclusions', () => {
    const h = harness(false);
    h.context.gameState = { level: 1, takenPerks: [], playerStats: { shotCount: 1, shield: 0, maxShields: 2, laserBeam: 0, chainLightning: 0, orbitals: 0,
        electricAura: false, pulseCore: false, freeze: 0, explosiveRadius: 0, critChance: 0 } };
    h.context.MAX_SHOT_COUNT = 15;
    h.load('perks.js');
    h.load('managers/SpawnManager.js');
    const manager = vm.runInContext('SpawnManager', h.context);
    const offense = new Set(['rapid_fire', 'machine_gun', 'double_shot', 'shotgun']);
    for (let i = 0; i < 100; i++) {
        const offer = manager.choosePerks(manager.getAvailablePerks());
        assert.equal(offer.length, 3);
        assert.equal(new Set(offer.map(perk => perk.id)).size, 3);
        assert.ok(offer.some(perk => offense.has(perk.id)));
        const next = manager.choosePerks(manager.getAvailablePerks().filter(perk => !offer.some(previous => previous.id === perk.id)));
        assert.equal(next.some(perk => offer.some(previous => previous.id === perk.id)), false);
    }
    assert.equal(manager.fitsBuild({ id: 'cryo_fracture' }), false);
    h.context.gameState.playerStats.freeze = 60;
    assert.equal(manager.fitsBuild({ id: 'cryo_fracture' }), true);
});
