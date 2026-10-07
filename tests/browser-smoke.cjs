const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/capacitor.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end(''); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, body) => {
        if (error) { res.writeHead(404); res.end(); return; }
        res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream');
        res.end(body);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => { errors.push(error.message); console.error(error.stack); });
        // Exercise offline menus; never submit a score or purchase to a remote service.
        await page.route('https://**', route => route.abort());
        await page.goto(url + '/?dev=1');
        await page.waitForTimeout(1000);
        console.log('startup errors:', errors);
        await page.locator('#dr-close-btn').click();
        await page.locator('#armory-btn').click();
        assert.equal(await page.evaluate(() => ArmoryUI.currentTab), 'store');
        assert.equal(await page.locator('#armory-store-view').isVisible(), true);
        await page.locator('[data-tab="cores"]').click();
        assert.equal(await page.locator('.armory-item-card').count() > 0, true);
        await page.evaluate(() => {
            const item = CosmeticsManager.getAll('core').find(item => item.id !== 'core_default');
            CosmeticsManager.unlock(item.id);
            ArmoryUI.renderItems('core');
            ArmoryUI.inspectedItem = item;
            ArmoryUI.updateHangarHUD();
        });
        await page.locator('#hangar-quick-equip').click();
        assert.equal(await page.locator('.armory-item-card').count() > 0, true);
        for (const tab of ['projectiles', 'backgrounds', 'store']) {
            await page.locator(`[data-tab="${tab}"]`).click();
            if (tab !== 'store') assert.ok(await page.locator('.armory-item-card').count());
        }
        // Exercise actual rendered store, inventory and daily rewards in every supported language.
        for (const language of ['tr', 'en', 'fr', 'es', 'de', 'it']) {
            const failures = await page.evaluate(language => {
                Localization.setLanguage(language);
                const failures = [];
                const translations = Localization.translations[language];
                for (const item of Object.values(CosmeticsManager.ITEMS)) {
                    for (const suffix of ['name', 'desc']) {
                        if (!translations[`cosmetic_${item.id}_${suffix}`]) failures.push(`${item.id}_${suffix}`);
                    }
                }
                ArmoryUI.switchTab('store');
                const titles = [...document.querySelectorAll('.offer-title')].map(el => el.textContent);
                const ids = ['remove_ads', 'starter_pack', 'premium_cosmetic_pack'];
                ids.forEach((id, index) => {
                    const p = PremiumStoreManager.getLocalizedProduct(id);
                    if (titles[index] !== p.name) failures.push(id);
                    if (p.benefits.some(text => text.startsWith('benefit_'))) failures.push(`${id} benefits`);
                });
                CosmeticsManager.CIPHER_PACKS.forEach((pack, index) => {
                    const badge = document.querySelectorAll('.pack-badge')[index].textContent;
                    if (badge !== translations[`rarity_${pack.rarities.at(-1).toLowerCase()}`]) failures.push(`${pack.id} badge`);
                });
                if (document.querySelector('.store-section-badge').textContent !== translations.store_guaranteed) failures.push('store badge');
                if (document.getElementById('player-name-input').placeholder !== translations.enter_initials) failures.push('placeholder');
                DailyRewardManager.showModal();
                if (document.querySelectorAll('.dr-day-label')[4].textContent !== CosmeticsManager.getPackName(CosmeticsManager.CIPHER_PACKS[0])) failures.push('daily crate');
                document.getElementById('daily-reward-modal').classList.add('hidden');
                for (const tab of ['cores', 'projectiles', 'backgrounds']) {
                    ArmoryUI.switchTab(tab);
                    for (const card of document.querySelectorAll('.armory-item-card')) {
                        const item = CosmeticsManager.ITEMS[card.dataset.id];
                        if (card.querySelector('.card-title').textContent !== translations[`cosmetic_${item.id}_name`]) failures.push(`${item.id} title`);
                        if (card.querySelector('.card-desc').textContent !== translations[`cosmetic_${item.id}_desc`]) failures.push(`${item.id} description`);
                    }
                }
                ArmoryUI.closeArmory();
                ArmoryUI.openArmory();
                if (ArmoryUI.currentTab !== 'store') failures.push('reopened tab');
                return failures;
            }, language);
            assert.deepEqual(failures, [], language);
        }
        await page.evaluate(() => {
            animateTextScramble(document.getElementById('start-btn'), { duration: 100, useSound: false });
            Localization.setLanguage('de');
        });
        await page.waitForTimeout(150);
        assert.equal(await page.locator('#start-btn').innerText(), await page.evaluate(() => Localization.t(document.getElementById('start-btn').dataset.i18n)));
        await page.evaluate(() => Localization.setLanguage('en'));
        await page.locator('#header-watch-ad-coin-btn').click();
        await page.locator('#ad-cancel-btn').click();
        assert.equal(await page.evaluate(() => AdManager.isAdPlaying), false);
        const coins = await page.evaluate(() => CosmeticsManager.coins);
        await page.locator('#airdrop-free-coins-btn').click();
        await page.locator('#ad-collect-btn').click();
        assert.equal(await page.evaluate(() => CosmeticsManager.coins), coins + 150);
        assert.equal(await page.locator('#neon-ad-loading-overlay').isVisible(), false);
        await page.locator('#airdrop-free-crate-btn').click();
        await page.locator('#ad-collect-btn').click();
        await page.locator('#reveal-equip-btn').waitFor();
        for (const language of ['fr', 'es', 'de', 'it', 'tr', 'en']) {
            assert.equal(await page.evaluate(language => {
                Localization.setLanguage(language);
                const item = ArmoryUI._revealedResult.item;
                return document.querySelector('.reveal-item-title').textContent === Localization.translations[language][`cosmetic_${item.id}_name`]
                    && document.getElementById('reveal-equip-btn').textContent === Localization.t('btn_equip');
            }, language), true, `reveal ${language}`);
        }
        await page.locator('#reveal-equip-btn').click();
        assert.equal(await page.evaluate(() => ArmoryUI.isOpeningPack), false);
        for (const size of [{ width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
            await page.setViewportSize(size);
            await page.locator('[data-tab="cores"]').click();
            const layout = await page.evaluate(() => {
                const panel = document.querySelector('.armory-panel');
                const header = document.querySelector('.armory-header');
                const close = document.getElementById('close-armory-btn').getBoundingClientRect();
                return { overflow: panel.scrollWidth > panel.clientWidth + 2 || header.scrollWidth > header.clientWidth + 2, closeVisible: close.right <= innerWidth && close.bottom <= innerHeight };
            });
            assert.equal(layout.overflow, false, JSON.stringify(size));
            assert.equal(layout.closeVisible, true);
            for (const language of ['tr', 'en', 'fr', 'es', 'de', 'it']) {
                const overflow = await page.evaluate(language => {
                    Localization.setLanguage(language);
                    ArmoryUI.switchTab('store');
                    const content = document.querySelector('.armory-content');
                    return content.scrollWidth > content.clientWidth + 2;
                }, language);
                assert.equal(overflow, false, `store ${language} ${JSON.stringify(size)}`);
            }
        }
        await page.evaluate(() => { Localization.setLanguage('en'); ArmoryUI.switchTab('cores'); });
        await page.setViewportSize({ width: 390, height: 844 });
        fs.mkdirSync(path.resolve(__dirname, '../artifacts'), { recursive: true });
        await page.screenshot({ path: path.resolve(__dirname, '../artifacts/armory-mobile.png') });
        await page.locator('#close-armory-btn').click();
        await page.locator('#lucky-spin-btn').click();
        await page.locator('#ls-free-spin').click();
        await page.locator('#ls-close-btn').click();
        await page.waitForTimeout(6500);
        assert.equal(await page.locator('#lucky-spin-modal').isVisible(), false);
        await page.evaluate(() => {
            for (const item of Object.values(CosmeticsManager.ITEMS)) CosmeticsManager.unlock(item.id);
            ArmoryUI.openArmory();
            for (const tab of ['cores', 'projectiles', 'backgrounds']) ArmoryUI.switchTab(tab);
            ArmoryUI.closeArmory();
        });
        await page.locator('#leaderboard-btn').click();
        assert.equal(await page.locator('#leaderboard-screen').isVisible(), true);
        await page.locator('#close-leaderboard-btn').click();
        await page.locator('#start-btn').click();
        await page.waitForTimeout(2800);
        await page.locator('#pause-btn').click();
        assert.equal(await page.evaluate(() => gameState.isPaused), true);
        await page.locator('#resume-btn').click();
        assert.equal(await page.evaluate(() => gameState.isPaused), false);
        await page.evaluate(() => triggerReviveOffer());
        await page.locator('#revive-ad-btn').click();
        await page.waitForTimeout(5200);
        assert.equal(await page.evaluate(() => gameState.gameActive), true);
        await page.locator('#ad-collect-btn').click();
        assert.equal(await page.evaluate(() => gameState.hasRevivedThisRun && !gameState.isPaused), true);
        assert.equal(await page.evaluate(() => gameState.playerStats.shield), 2);
        await page.evaluate(() => gameOver());
        await page.locator('#double-coins-btn').click();
        await page.locator('#ad-collect-btn').click();
        assert.equal(await page.locator('#double-coins-btn').isDisabled(), true);
        await page.locator('#restart-btn').click();
        await page.evaluate(() => gameOver());
        assert.equal(await page.locator('#double-coins-btn').isDisabled(), false);
        const resetFailures = await page.evaluate(() => {
            Localization.setLanguage('fr');
            return document.getElementById('earned-coins-amount').textContent !== `+${window.lastEarnedCoins}`
                || document.querySelector('#double-coins-btn [data-i18n]').textContent !== Localization.t('double_coins_btn');
        });
        assert.equal(resetFailures, false, 'new game clears previous doubled reward translation');
        assert.deepEqual(errors, []);
        await page.goto(url);
        await page.waitForTimeout(1000);
        await page.locator('#dr-close-btn').click();
        const before = await page.evaluate(() => CosmeticsManager.coins);
        await page.locator('#armory-btn').click();
        await page.locator('#header-watch-ad-coin-btn').click();
        assert.equal(await page.evaluate(() => CosmeticsManager.coins), before);
        assert.equal(await page.locator('#neon-ad-loading-overlay').isVisible(), false);
        console.log('PASS: six languages, live translations, store entry, responsive store/inventory, ads, pause/revive, double coins, offline leaderboard');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
