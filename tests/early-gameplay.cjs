// Deterministic aim-only playthroughs: real spawning, projectiles, collisions,
// XP and offered perks, with zero purchases or permanent upgrades.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/capacitor.js') return res.end('');
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404); return res.end(); }
        res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream');
        res.end(data);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const report = [];
    try {
        const fairness = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await fairness.route(/^https:\/\//, route => route.abort());
        await fairness.goto(`http://127.0.0.1:${server.address().port}/`);
        await fairness.waitForFunction(() => window.LevelProgress && window.GameBalance);
        await fairness.evaluate(() => {
            initGame(); gameState.isStarting = false; gameState.isPaused = true;
            cancelAnimationFrame(gameState.animationId); clearInterval(gameState.spawnInterval);
            AdManager.showRewardedAd = options => { window.pendingReward = options; };
            levelUpScreen.classList.remove('hidden');
            SpawnManager.rollPerks();
        });
        const first = await fairness.evaluate(() => SpawnManager.currentOfferedPerks.map(p => p.id));
        await fairness.locator('#perk-reroll-btn').click({ force: true });
        assert.equal(await fairness.locator('#perk-reroll-btn').isDisabled(), true);
        assert.deepEqual(await fairness.evaluate(() => SpawnManager.currentOfferedPerks.map(p => p.id)), first);
        assert.equal(await fairness.evaluate(() => pendingReward.rewardType), 'PERK_REROLL');
        await fairness.evaluate(() => pendingReward.onSuccess());
        const second = await fairness.evaluate(() => SpawnManager.currentOfferedPerks.map(p => p.id));
        assert.ok(second.every(id => !first.includes(id)));
        await fairness.evaluate(() => {
            levelUpScreen.classList.add('hidden'); triggerReviveOffer();
        });
        assert.equal(await fairness.locator('.revive-timer-wrapper').isVisible(), true);
        await fairness.locator('#revive-ad-btn').click();
        assert.equal(await fairness.evaluate(() => gameState.hasRevivedThisRun), false);
        assert.equal(await fairness.evaluate(() => pendingReward.rewardType), 'REVIVE');
        await fairness.evaluate(() => pendingReward.onSuccess());
        assert.equal(await fairness.evaluate(() => gameState.hasRevivedThisRun), true);
        assert.equal(await fairness.evaluate(() => JSON.parse(localStorage.getItem(SaveManager.SAVE_KEY)).hasRevivedThisRun), true);
        assert.equal(await fairness.evaluate(() => AdManager.isAdPlaying), false);
        await fairness.close();
        for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
            for (const index of [0, 1]) for (const seed of [17, 83]) {
                const page = await browser.newPage({ viewport });
                const errors = [];
                page.on('pageerror', error => errors.push(error.message));
                await page.route(/^https:\/\//, route => route.abort());
                await page.addInitScript(index => localStorage.setItem('neonblast_level_progress_v2', JSON.stringify({ index })), index);
                await page.goto(`http://127.0.0.1:${server.address().port}/`);
                await page.waitForFunction(() => window.LevelProgress && window.GameBalance);
                const result = await page.evaluate(({ seed }) => {
                    let random = seed, now = 1000000, id = 0;
                    Math.random = () => { random ^= random << 13; random ^= random >>> 17; random ^= random << 5; return (random >>> 0) / 4294967296; };
                    // Drive the normal game loop and its timers at 60 Hz without waiting minutes.
                    const timers = new Map();
                    window.setInterval = (fn, ms) => { timers.set(++id, { fn, ms, due: now + ms }); return id; };
                    window.setTimeout = (fn, ms = 0) => { timers.set(++id, { fn, ms: 0, due: now + ms }); return id; };
                    window.clearInterval = window.clearTimeout = id => timers.delete(id);
                    window.requestAnimationFrame = () => 0;
                    Date.now = () => now;
                    Object.defineProperty(performance, 'now', { value: () => now });
                    initGame();
                    const start = now;
                    let nextAim = now, revives = 0;
                    const choices = ['double_shot', 'rapid_fire', 'machine_gun', 'energy_shield', 'piercing', 'chain_lightning', 'shotgun'];
                    while (gameState.gameActive && now - start < 720000) {
                        now += 1000 / 60;
                        for (const [key, timer] of [...timers]) if (timer.due <= now && timers.has(key)) {
                            if (timer.ms) timer.due = now + timer.ms; else timers.delete(key);
                            timer.fn();
                        }
                        if (!document.getElementById('revive-modal').classList.contains('hidden')) {
                            document.getElementById('revive-ad-btn').click(); revives++;
                        }
                        if (!levelUpScreen.classList.contains('hidden') && SpawnManager.currentOfferedPerks.length) {
                            const offers = SpawnManager.currentOfferedPerks;
                            const pick = choices.map(id => offers.find(p => p.id === id)).find(Boolean) || offers[0];
                            SpawnManager.selectPerk(pick);
                        }
                        // A 200 ms reaction delay and small aiming error; the player never moves.
                        if (now >= nextAim) {
                            const threats = [...enemyPool.getActive()].sort((a, b) =>
                                Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
                            const nearest = threats[0];
                            const target = nearest && Math.hypot(nearest.x - player.x, nearest.y - player.y) < Math.min(CANVAS.width, CANVAS.height) * .45
                                ? nearest : BossManager.activeBoss?.active ? BossManager.activeBoss : nearest;
                            isMouseDown = !!target;
                            if (target) {
                                const angle = Math.atan2(target.y - player.y, target.x - player.x) + (Math.random() - .5) * .08;
                                const distance = Math.hypot(target.x - player.x, target.y - player.y);
                                mouseX = player.x + Math.cos(angle) * distance;
                                mouseY = player.y + Math.sin(angle) * distance;
                            }
                            nextAim = now + 200;
                        }
                        animate(now);
                    }
                    return { won: LevelProgress.getState().phase === 'won', seconds: Math.round((now - start) / 1000), evolution: gameState.level,
                        paused: gameState.isPaused, boss: BossManager.activeBoss ? { name: BossManager.activeBoss.name, hp: BossManager.activeBoss.hp } : null, score: gameState.score,
                        revives, shield: gameState.playerStats.shield, perks: [...gameState.takenPerks], ranks: MetaProgress.ranks(), coins: CosmeticsManager.coins };
                }, { seed });
                report.push({ viewport, level: index + 1, seed, ...result });
                console.log(JSON.stringify(report.at(-1)));
                assert.deepEqual(errors, []);
                await page.close();
            }
        }
        const output = path.resolve(__dirname, '../artifacts/early-gameplay');
        fs.mkdirSync(output, { recursive: true });
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
        for (const level of [1, 2]) {
            const runs = report.filter(run => run.level === level);
            assert.ok(runs.filter(run => run.won).length >= runs.length * .8, `Level ${level}: baseline aim-only completion below 80%`);
            for (const run of runs) assert.deepEqual(run.ranks, { damage: 0, speed: 0, critical: 0, automation: 0 });
        }
        console.log('PASS: early campaign aim-only playthroughs without paid power. This is a balance proxy, not a human retention study.');
    } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
