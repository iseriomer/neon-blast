const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const output = path.resolve(__dirname, '../artifacts/menus');
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/capacitor.js') { res.end(''); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, body) => {
        if (error) { res.writeHead(404); res.end(); return; }
        res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ttf': 'font/ttf' }[path.extname(file)] || 'application/octet-stream');
        res.end(body);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://**', route => route.abort());
        await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
        await page.waitForTimeout(1200);
        await page.evaluate(() => {
            document.getElementById('daily-reward-modal').classList.add('hidden');
            Localization.setLanguage('tr');
            CosmeticsManager.addCoins(1200);
        });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => !document.querySelector('#start-screen .btn-shuffling'));
        // The new stylesheet must not alter any computed combat HUD or canvas style.
        const unchangedHUD = await page.evaluate(() => {
            const nodes = [...document.querySelectorAll('#ui-layer, #ui-layer *, #gameCanvas, #joystick-zone, #joystick-base, #joystick-stick, #tracer-overlay')];
            const snapshot = () => nodes.map(node => {
                const style = getComputedStyle(node);
                return [...style].map(key => [key, style.getPropertyValue(key)]).filter(([key]) => !key.startsWith('--'));
            });
            const sheets = [...document.styleSheets].filter(sheet => /\/(menus|menu-viewport)\.css$/.test(sheet.href || ''));
            const before = snapshot(); sheets.forEach(sheet => sheet.disabled = true);
            const after = snapshot(); sheets.forEach(sheet => sheet.disabled = false);
            return JSON.stringify(before) === JSON.stringify(after);
        });
        assert.equal(unchangedHUD, true, 'combat HUD/canvas styles unchanged');
        const shot = async name => {
            await page.waitForTimeout(250);
            const textOnly = await page.evaluate(() => [...document.querySelectorAll('button')]
                .filter(el => el.getClientRects().length && !el.closest('#admin-panel'))
                .filter(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)')
                .map(el => el.id || el.className));
            assert.deepEqual(textOnly, [], `${name}: buttons have a visible surface: ${textOnly.join(', ')}`);
            return page.screenshot({ path: path.join(output, name + '.png') });
        };
        await shot('01-ana-menu');
        await page.click('#armory-btn');
        await shot('07-armory-magaza');
        for (const [tab, name] of [['cores','08-armory-cekirdek'],['projectiles','09-armory-mermiler'],['backgrounds','10-armory-arka-plan']]) {
            await page.click(`[data-tab="${tab}"]`);
            await shot(name);
        }
        await page.click('[data-tab="cores"]');
        await page.locator('.armory-item-card.locked').first().click();
        await page.click('#hangar-quick-equip');
        assert.equal(await page.evaluate(() => ArmoryUI.currentTab), 'store', 'locked preview opens store');
        await page.click('#close-armory-btn');
        for (const [button, close, name] of [['daily-rewards-btn','dr-close-btn','11-gunluk-oduller'],['lucky-spin-btn','ls-close-btn','12-sans-carki'],['daily-quests-btn','quest-close-btn','13-gunluk-gorevler'],['leaderboard-btn','close-leaderboard-btn','04-lider-tablosu']]) {
            await page.click('#' + button); await shot(name); await page.click('#' + close);
        }
        await page.click('#start-btn');
        await page.waitForTimeout(2500);
        await page.click('#pause-btn'); await page.waitForFunction(() => !document.querySelector('#pause-menu .btn-shuffling')); await shot('03-duraklatma'); await page.click('#resume-btn');
        await page.evaluate(() => { gameState.score = 18450; gameState.level = 12; triggerReviveOffer(); });
        await shot('06-revive');
        await page.click('#revive-skip-btn');
        await page.waitForFunction(() => !document.querySelector('#game-over-screen .btn-shuffling'));
        assert.equal(await page.locator('#game-over-screen .leaderboard-container').isVisible(), true);
        await page.click('#lb-filter-weekly-go');
        assert.equal(await page.locator('#lb-filter-weekly-go').evaluate(el => el.classList.contains('active')), true);
        await page.evaluate(() => {
            // Render ten realistic rows without contacting or writing to the live database.
            const list = document.getElementById('leaderboard-list');
            list.replaceChildren();
            for (let i = 0; i < 10; i++) {
                const row = document.createElement('li');
                const name = document.createElement('span'), score = document.createElement('span');
                name.textContent = `#${i + 1} PLAYER${i + 1}`;
                score.textContent = String(987650 - i * 18250);
                row.append(name, score); list.append(row);
            }
        });
        await shot('05-oyun-sonu');
        await page.setViewportSize({width:320,height:568});
        await shot('19-oyun-sonu-kucuk-telefon');
        await page.setViewportSize({width:390,height:844});
        assert.equal(await page.locator('#final-score').textContent(), await page.evaluate(() => gameState.score.toLocaleString(Localization.currentLang)));
        const perkGeometry = await page.evaluate(async () => {
            gameOverScreen.classList.add('hidden'); levelUpScreen.classList.remove('hidden');
            SpawnManager.rollPerks([]);
            const measure = () => [...document.querySelectorAll('.perk-card')].map(card => {
                const rect = card.getBoundingClientRect();
                return {left:rect.left, width:rect.width};
            });
            const initial = measure();
            const samples = [];
            const started = performance.now();
            while (performance.now() - started < 1300) {
                await new Promise(requestAnimationFrame);
                samples.push(measure());
            }
            return {initial,samples};
        });
        for (const sample of perkGeometry.samples) sample.forEach((rect,index) => {
            assert.ok(Math.abs(rect.width - perkGeometry.initial[index].width) < 1, 'perk width stays fixed throughout decryption');
            assert.ok(Math.abs(rect.left - perkGeometry.initial[index].left) < 1, 'perk never expands sideways');
        });
        await page.waitForTimeout(1600); await shot('16-perk-secimi');
        await page.evaluate(() => { levelUpScreen.classList.add('hidden'); ArmoryUI.openArmory(); ArmoryUI.executePackOpening('pack_alpha', true); });
        await shot('14-sandik-sifre-cozme');
        const shakingHTML = await page.locator('#pack-opening-modal').innerHTML();
        await page.locator('#reveal-equip-btn').waitFor(); await shot('15-sandik-sonucu');
        await page.click('#reveal-close-btn');
        // Every language and phone size keeps content and top-level controls inside the viewport.
        for (const size of [{width:320,height:568},{width:390,height:844},{width:430,height:932},{width:844,height:390}]) {
            await page.setViewportSize(size);
            for (const language of ['tr','en','fr','es','de','it']) {
                const failures = await page.evaluate(({language, shakingHTML}) => {
                    Localization.setLanguage(language);
                    const failures = [];
                    const ranking = document.getElementById('leaderboard-list');
                    ranking.replaceChildren();
                    for (let i = 0; i < 10; i++) {
                        const row = document.createElement('li');
                        const name = document.createElement('span'), score = document.createElement('span');
                        name.textContent = `#${i + 1} PLAYER${i + 1}`;
                        score.textContent = '987650';
                        row.append(name, score); ranking.append(row);
                    }
                    const check = id => {
                        const element = document.getElementById(id);
                        if (element.scrollWidth > element.clientWidth + 2) failures.push(id + ': horizontal');
                        if (!['armory-modal','leaderboard-screen'].includes(id)) {
                            if (element.scrollHeight > element.clientHeight + 2) failures.push(id + ': vertical ' + element.scrollHeight + '/' + element.clientHeight);
                            for (const label of element.querySelectorAll('h1,h2,h3,p,.reveal-rarity-banner,.reveal-category-pill')) {
                                if (!label.getClientRects().length) continue;
                                const rect = label.getBoundingClientRect();
                                if (rect.bottom > innerHeight + 1 || rect.top < -1) failures.push(id + ': clipped copy ' + label.className);
                            }
                            for (const control of element.querySelectorAll('button,.perk-card')) {
                                if (!control.getClientRects().length) continue;
                                const rect = control.getBoundingClientRect();
                                if (rect.bottom > innerHeight + 1 || rect.top < -1) failures.push(id + ': clipped ' + (control.id || control.className));
                                if (control.classList.contains('perk-card')) {
                                    if (control.scrollHeight > control.clientHeight + 1) failures.push(id + ': clipped perk copy');
                                    for (const label of control.querySelectorAll('.perk-title,.perk-desc')) {
                                        const textBox = label.getBoundingClientRect();
                                        if (textBox.right > rect.right + 1 || textBox.bottom > rect.bottom + 1) failures.push(id + ': clipped perk label');
                                    }
                                }
                            }
                        }
                    };
                    for (const tab of ['store','cores','projectiles','backgrounds']) { ArmoryUI.switchTab(tab); check('armory-modal'); }
                    // Exercise the longest actual perk copy in the selected language.
                    const longPerks = [...ALL_PERKS].sort((a,b) => (Localization.t(b.title).length + Localization.t(b.desc).length) - (Localization.t(a.title).length + Localization.t(a.desc).length));
                    [...document.querySelectorAll('.perk-card')].forEach((card,index) => {
                        card.querySelector('.perk-title').textContent = Localization.t(longPerks[index].title);
                        card.querySelector('.perk-desc').textContent = Localization.t(longPerks[index].desc);
                    });
                    for (const id of ['start-screen','pause-menu','game-over-screen','leaderboard-screen','levelup-screen','revive-modal','pack-opening-modal']) {
                        const el = document.getElementById(id), hidden = el.classList.contains('hidden');
                        el.classList.remove('hidden'); check(id); if (hidden) el.classList.add('hidden');
                        if (id === 'game-over-screen') {
                            el.classList.remove('hidden');
                            const list = document.getElementById('leaderboard-list');
                            if (list.clientHeight < 28) failures.push('game-over-screen: no visible ranking row');
                            if (getComputedStyle(list).overflowY !== 'auto') failures.push('game-over-screen: rankings cannot scroll');
                            if (hidden) el.classList.add('hidden');
                        }
                    }
                    const packModal = document.getElementById('pack-opening-modal');
                    packModal.classList.remove('hidden');
                    for (const item of Object.values(CosmeticsManager.ITEMS)) {
                        const failureCount = failures.length;
                        packModal.querySelector('.reveal-category-pill').textContent = Localization.t(`category_${item.type}`);
                        packModal.querySelector('.reveal-item-title').textContent = CosmeticsManager.getItemName(item);
                        packModal.querySelector('.reveal-item-desc').textContent = CosmeticsManager.getItemDesc(item);
                        check(packModal.id);
                        for (let i = failureCount; i < failures.length; i++) failures[i] += ' ' + item.id;
                    }
                    const revealHTML = packModal.innerHTML;
                    packModal.innerHTML = shakingHTML;
                    Localization.apply();
                    check(packModal.id);
                    packModal.innerHTML = revealHTML;
                    packModal.classList.add('hidden');
                    DailyRewardManager.showModal(); check('daily-reward-modal'); document.getElementById('daily-reward-modal').classList.add('hidden');
                    LuckySpinManager.showWheel(); check('lucky-spin-modal'); document.getElementById('lucky-spin-modal').classList.add('hidden');
                    const quest = document.getElementById('quest-panel-modal'); quest.classList.remove('hidden'); check(quest.id); quest.classList.add('hidden');
                    return failures;
                }, {language, shakingHTML});
                assert.deepEqual(failures, [], `${language} ${JSON.stringify(size)} ${JSON.stringify(failures)}`);
            }
        }
        assert.deepEqual(errors, []);
        console.log('PASS: 15 menu screenshots, locked-item navigation, results, six languages/four phone sizes without menu scrolling, untouched gameplay styles');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
