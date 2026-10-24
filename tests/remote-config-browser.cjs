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
    try {
        let remoteValue = { version: 1, enemies: { SPEEDSTER: { hp: .25 } }, progression: { initialStep: 300 },
            player: { fireRate: 250 }, perks: { rapidFireMultiplier: .5, orbitalCount: 3 } };
        let offline = false;
        let scalarValues = {};
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route(/^https:\/\//, async route => {
            if (offline) return route.abort();
            const url = route.request().url();
            if (url.endsWith('/firebase-app.js')) return route.fulfill({ contentType: 'text/javascript', body:
                "export const getApps=()=>[]; export const initializeApp=config=>({name:'[DEFAULT]',options:config});" });
            if (url.endsWith('/firebase-remote-config.js')) return route.fulfill({ contentType: 'text/javascript', body: `
                export const isSupported=async()=>true;
                export const getRemoteConfig=app=>({app,settings:{},defaultConfig:{}});
                export const ensureInitialized=async()=>{};
                export const fetchAndActivate=async r=>{ const response=await fetch('/mock-remote'); r.value=await response.text(); return true; };
                export const getValue=(r,key)=>({
                    getSource:()=>r.value && (key==='balance_revision' || key==='game_balance_v1' || Object.hasOwn(JSON.parse(r.value).scalars,key))?'remote':'default',
                    asString:()=>key==='balance_revision' ? '2' : r.value && key==='game_balance_v1' ? JSON.stringify(JSON.parse(r.value).legacy)
                        : String(r.value && Object.hasOwn(JSON.parse(r.value).scalars,key) ? JSON.parse(r.value).scalars[key] : r.defaultConfig[key])
                });
            ` });
            return route.abort();
        });
        await page.route('**/mock-remote', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({legacy:remoteValue,scalars:scalarValues}) }));
        await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
        await page.waitForFunction(() => GameBalance.status.fetch === 'ready');
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), .5, 'menu remains stable');
        await page.evaluate(() => { initGame(); gameState.isPaused = true; clearInterval(gameState.spawnInterval); cancelAnimationFrame(gameState.animationId); });
        assert.equal(await page.evaluate(() => gameState.nextLevelThreshold), 300);
        assert.equal(await page.evaluate(() => gameState.playerStats.fireRate), 250);
        assert.equal(await page.evaluate(() => { const e = new Enemy(); e.reset(0, 0, ENEMY_TYPES.SPEEDSTER, .35); return e.hp; }), .25);
        assert.ok(await page.evaluate(() => GameBalance.perkDescription(ALL_PERKS.find(p => p.id === 'rapid_fire')).includes('50')));
        assert.ok(await page.evaluate(() => GameBalance.perkDescription(ALL_PERKS.find(p => p.id === 'orbitals'), gameState.playerStats).includes('+ 3')));
        await page.evaluate(() => { ALL_PERKS.find(p => p.id === 'rapid_fire').apply(gameState.playerStats); SaveManager.saveGame(); });
        assert.equal(await page.evaluate(() => gameState.playerStats.fireRate), 125);
        remoteValue = { version: 1, enemies: { SPEEDSTER: { hp: 2 } }, player: { fireRate: 700 } };
        await page.evaluate(() => GameBalance.refresh());
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), .25, 'fetch cannot change active run');
        await page.reload(); await page.waitForFunction(() => GameBalance.status.fetch === 'ready');
        await page.evaluate(() => initGame());
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), .25, 'resume uses saved tuning');
        assert.equal(await page.evaluate(() => gameState.playerStats.fireRate), 125, 'resume preserves perks');
        assert.equal(await page.evaluate(() => gameState.nextLevelThreshold), 300);
        await page.evaluate(() => { gameState.gameActive = false; SaveManager.clearSave(); initGame(); gameState.isPaused = true; clearInterval(gameState.spawnInterval); cancelAnimationFrame(gameState.animationId); });
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), 2, 'new run applies pending tuning');
        assert.equal(await page.evaluate(() => gameState.playerStats.fireRate), 700);
        scalarValues = { enemy_speedster_hp: .4, level_1_miniboss_1_evolution: 7, level_1_boss_evolution: 11 };
        await page.evaluate(() => GameBalance.refresh());
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), 2, 'scalar update also waits for next run');
        await page.evaluate(() => { gameState.gameActive = false; SaveManager.clearSave(); initGame(); gameState.isPaused = true; clearInterval(gameState.spawnInterval); cancelAnimationFrame(gameState.animationId); });
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), .4, 'numeric parameter overrides legacy JSON');
        assert.equal(await page.evaluate(() => LevelDirector.config().minibosses[0].atEvolution), 7);
        assert.equal(await page.evaluate(() => LevelDirector.config().bossAtEvolution), 11);
        scalarValues = { enemy_speedster_hp: 'not-a-number' };
        await page.evaluate(() => GameBalance.refresh());
        assert.ok(await page.evaluate(() => GameBalance.status.error));
        scalarValues = {};
        remoteValue = { enemies: { SPEEDSTER: { hp: -3 } } };
        await page.evaluate(() => GameBalance.refresh());
        assert.ok(await page.evaluate(() => GameBalance.status.error));
        await page.evaluate(() => { gameState.gameActive = false; SaveManager.clearSave(); });
        offline = true;
        await page.reload(); await page.waitForFunction(() => GameBalance.status.fetch === 'offline');
        await page.evaluate(() => initGame());
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), .4, 'offline uses last valid cache');
        const legacyMini = await page.evaluate(() => {
            gameState.level = 4;
            BossManager.startBossFight(101);
            SaveManager.saveGame();
            const save = JSON.parse(localStorage.getItem(SaveManager.SAVE_KEY));
            delete save.balance; delete save.encounterBossId;
            localStorage.setItem(SaveManager.SAVE_KEY, JSON.stringify(save));
            gameState.gameActive = false; initGame();
            return BossManager.activeBoss.campaignBossId;
        });
        assert.equal(legacyMini, 101, 'pre-snapshot Evolution 4 save resumes Sentinel');
        const legacyBoss = await page.evaluate(() => {
            const save = JSON.parse(localStorage.getItem(SaveManager.SAVE_KEY));
            save.level = 7;
            localStorage.setItem(SaveManager.SAVE_KEY, JSON.stringify(save));
            gameState.gameActive = false; initGame();
            return BossManager.activeBoss.campaignBossId;
        });
        assert.equal(legacyBoss, 1, 'pre-snapshot Evolution 7 save resumes Omega');
        await page.evaluate(() => localStorage.clear());
        await page.reload(); await page.waitForFunction(() => GameBalance.status.fetch === 'offline');
        await page.evaluate(() => initGame());
        assert.equal(await page.evaluate(() => ENEMY_TYPES.SPEEDSTER.hp), .5, 'first-ever offline launch uses defaults');
        assert.deepEqual(errors, []);
        console.log('PASS: mocked Firebase fetch, enemy/perk/XP behavior, deferred updates, saved/legacy boss resume, malformed remote rejection, offline cache and first launch.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
