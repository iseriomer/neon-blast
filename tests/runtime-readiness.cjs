// Offline mobile runtime, existing-player upgrade, first-run guidance and results.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const output = path.resolve(__dirname, '../artifacts/readiness');
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/capacitor.js') { res.end(''); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404); res.end(); return; }
        res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ogg': 'audio/ogg' }[path.extname(file)] || 'application/octet-stream');
        res.end(data);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const report = [];
    try {
        for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
            const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
            const page = await context.newPage();
            const errors = [];
            const missing = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('response', response => { if (response.url().includes('127.0.0.1') && response.status() === 404) missing.push(response.url()); });
            await page.route('https://**', route => route.abort());
            await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
            await page.waitForTimeout(1300);
            assert.equal(await page.locator('#daily-reward-modal').isVisible(), false);
            await page.locator('#player-options-btn').click();
            for (const lang of ['tr', 'en', 'fr', 'es', 'de', 'it']) {
                const failures = await page.evaluate(lang => {
                    Localization.setLanguage(lang);
                    const modal = document.getElementById('player-options-modal');
                    const rect = modal.getBoundingClientRect();
                    const card = modal.querySelector('.player-options-card');
                    const problems = [];
                    if (rect.left < 0 || rect.right > innerWidth + 1 || card.scrollWidth > card.clientWidth + 1) problems.push('overflow');
                    for (const el of modal.querySelectorAll('[data-i18n]')) {
                        if (!el.textContent.trim() || el.textContent === el.dataset.i18n) problems.push(el.dataset.i18n);
                    }
                    return problems;
                }, lang);
                assert.deepEqual(failures, [], `${viewport.width} ${lang}`);
            }
            await page.screenshot({ path: path.join(output, `options-${viewport.width}.png`) });
            await page.locator('#player-options-close').click();
            await page.locator('#start-btn').click();
            await page.evaluate(() => { gameState.godMode = true; });
            await page.waitForFunction(() => !gameState.isStarting);
            await page.waitForFunction(() => document.getElementById('first-run-hint'));
            assert.equal(await page.locator('#first-run-hint').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
            await page.touchscreen.tap(40, 140);
            await page.waitForFunction(() => !document.getElementById('first-run-hint'));
            await page.waitForFunction(() => enemyPool.getActiveCount() > 0);
            if (viewport.width === 390) {
                const bossChecks = await page.evaluate(() => {
                    gameState.isPaused = true;
                    const checks = [];
                    for (const id of [1, 2, 3, 4, 5, 6, 7, 8, 9, 101, 102, 103]) {
                        if (BossManager.activeBoss) BossManager.activeBoss.active = false;
                        CollisionManager.clearBossRegistry();
                        gameState.bossActive = false;
                        gameState.isDying = false;
                        player.x = CANVAS.width / 2; player.y = CANVAS.height / 2;
                        projectilePool.releaseAll(); enemyPool.releaseAll(); particlePool.releaseAll();
                        BossManager.startBossFight(id);
                        const encounter = BossManager.activeBoss;
                        for (let frame = 0; frame < 90; frame++) BossManager.updateAndDraw(1);
                        checks.push({ id, active: !!encounter?.active, finite: Number.isFinite(encounter?.x) && Number.isFinite(encounter?.y) });
                    }
                    if (BossManager.activeBoss) BossManager.activeBoss.active = false;
                    CollisionManager.clearBossRegistry();
                    gameState.bossActive = false;
                    BossManager.activeBoss = null;
                    gameState.isDying = false;
                    gameState.isPaused = false;
                    requestAnimationFrame(animate);
                    return checks;
                });
                for (const boss of bossChecks) assert.ok(boss.active && boss.finite, `boss ${boss.id}`);
            }
            // Save a legitimate progressed run, then reopen the app and resume it.
            const preserved = await page.evaluate(() => {
                gameState.activeRunMs = 123000;
                gameState.totalEnemiesKilled = 99;
                gameState.totalBossesKilled = 2;
                gameState.playerStats.shotCount = 3;
                SaveManager.saveGame();
                return { coins: CosmeticsManager.coins, inventory: [...CosmeticsManager.unlocked], premium: { ...PremiumStoreManager.state } };
            });
            await page.reload();
            await page.waitForTimeout(1300);
            await page.locator('#start-btn').click();
            assert.equal(await page.evaluate(() => gameState.isPaused), true);
            const restored = await page.evaluate(() => ({
                time: gameState.activeRunMs, kills: gameState.totalEnemiesKilled, bosses: gameState.totalBossesKilled,
                shots: gameState.playerStats.shotCount, coins: CosmeticsManager.coins,
                inventory: [...CosmeticsManager.unlocked], premium: { ...PremiumStoreManager.state }
            }));
            assert.equal(restored.time, 123000);
            assert.equal(restored.kills, 99);
            assert.equal(restored.bosses, 2);
            assert.equal(restored.shots, 3);
            assert.equal(restored.coins, preserved.coins);
            assert.deepEqual(restored.inventory, preserved.inventory);
            assert.deepEqual(restored.premium, preserved.premium);
            await page.locator('#resume-btn').click();
            await page.evaluate(() => { gameState.godMode = true; });
            await page.waitForTimeout(2000);
            assert.equal(await page.locator('#first-run-hint').count(), 0, 'learned controls stay learned');
            await page.evaluate(() => {
                gameState.score = 18450;
                gameState.level = 12;
                gameState.activeRunMs = 123000;
                gameState.totalEnemiesKilled = 99;
                gameOver();
                SaveManager.saveGame();
            });
            assert.equal(await page.evaluate(() => SaveManager.hasSave()), false, 'a completed run cannot return after reopening');
            assert.ok((await page.locator('#result-run-detail').innerText()).includes('2:03'));
            assert.ok((await page.locator('#result-run-detail').innerText()).includes('99'));
            assert.ok(await page.evaluate(() => GameTelemetry.getDebugEvents().some(event => event.name === 'run_resume')));
            await page.waitForFunction(() => !document.querySelector('#game-over-screen .btn-shuffling'));
            await page.screenshot({ path: path.join(output, `results-${viewport.width}.png`) });
            assert.deepEqual(errors, []);
            assert.deepEqual(missing, []);
            report.push({ viewport, offlineGame: 'pass', legacyPlayerData: 'pass', resumedCounters: 'pass', guidance: 'pass', optionsSixLanguages: 'pass', errors });
            await context.close();
        }
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
        console.log('PASS: offline mobile runtime, six-language options, touch guidance, saved-run upgrade and results across three phone sizes.');
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
