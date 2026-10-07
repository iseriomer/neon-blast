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
