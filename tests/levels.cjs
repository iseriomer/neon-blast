// Offline mobile runtime, existing-player upgrade, first-run guidance and results.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const output = path.resolve(__dirname, '../artifacts/levels');
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
        for (const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1366,height:768}]) {
            const context = await browser.newContext({ viewport, hasTouch: true });
            const page = await context.newPage(), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route(/^https:\/\//, route => route.abort());
            await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
            await page.waitForTimeout(1100);
            assert.deepEqual(errors, [], 'startup errors');
            assert.equal(await page.locator('.lang-selector, .menu-languages').count(), 0);
            await page.waitForFunction(()=>!document.querySelector('#start-screen .btn-shuffling'));
            const fit = await page.evaluate(()=>{
                const lower=document.getElementById('hub-nav').getBoundingClientRect().top;
                const upper=document.getElementById('hub-header').getBoundingClientRect().bottom;
                return ['start-btn','daily-rewards-btn','lucky-spin-btn','daily-quests-btn'].map(id=>{
                    const r=document.getElementById(id).getBoundingClientRect();
                    return {id,fits:r.top>=upper&&r.bottom<=lower&&r.left>=0&&r.right<=innerWidth};
                });
            });
            for (const button of fit) assert.ok(button.fits, `${viewport.width} hub action ${button.id} must fit above navbar`);
            await page.screenshot({path:path.join(output,`hub-${viewport.width}.png`)});
            for (const tab of ['meta','archive','armory','leaderboard','play']) {
                await page.locator(`[data-hub-tab="${tab}"]`).click();
                assert.equal(await page.evaluate(()=>MainHub.getTab()),tab);
                await page.screenshot({path:path.join(output,`${tab}-${viewport.width}.png`)});
            }
            await page.locator('[data-hub-tab="armory"]').click();await page.locator('#hub-settings').click();
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#player-options-modal').isVisible(),false);
            assert.equal(await page.evaluate(()=>MainHub.getTab()),'armory');
            await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>MainHub.getTab()),'play');
            await page.locator('[data-hub-tab="leaderboard"]').click();await page.keyboard.press('Escape');
            assert.equal(await page.evaluate(()=>MainHub.getTab()),'play');
            await page.locator('#hub-settings').click();
            for (const lang of ['tr','en','fr','es','de','it']) {
                await page.locator('#settings-language').selectOption(lang);
                assert.equal(await page.evaluate(()=>Localization.currentLang),lang);
            }
            await page.locator('#settings-language').selectOption('tr');
            await page.screenshot({path:path.join(output,`settings-${viewport.width}.png`)});
            await page.locator('#player-options-close').click();
            await page.evaluate(()=>{CosmeticsManager.addCoins(100000); QuestManager.state.quests=[]; QuestManager.save();});
            const before = await page.evaluate(()=>CosmeticsManager.coins);
            const bought = await page.evaluate(()=>['damage','speed','critical','automation'].map(id=>MetaProgress.buy(id)));
            assert.deepEqual(bought,[true,true,true,true]);
            assert.equal(await page.evaluate(()=>CosmeticsManager.coins),before-540);
            assert.equal(await page.evaluate(()=>MetaProgress.buy('invalid')),false);
            const bossIds = await page.evaluate(()=>LEVELS.map(x=>x.mainBoss));
            assert.equal(new Set(bossIds).size,10);
            for (let i=0;i<10;i++) {
                await page.locator('#start-btn').click();
                await page.evaluate(()=>{gameState.isPaused=true; gameState.isStarting=false; cancelAnimationFrame(gameState.animationId); clearInterval(gameState.spawnInterval);});
                const entry = await page.evaluate(()=>({level:gameState.level,perks:gameState.takenPerks.length,damage:gameState.playerStats.damageMultiplier,speed:gameState.playerStats.fireRate,crit:gameState.playerStats.critChance,automation:gameState.playerStats.automationMultiplier}));
                assert.equal(entry.level,1);assert.equal(entry.perks,0);assert.equal(entry.damage,1.06);assert.equal(entry.crit,.01);assert.equal(entry.automation,1.07);
                assert.ok(Math.abs(entry.speed-400/1.025)<1e-8);
                const wallet = await page.evaluate(()=>CosmeticsManager.coins);
                const reward = await page.evaluate(i=>LevelDirector.reward(i),i);
                await page.evaluate(()=>{
                    const config=LevelDirector.config(); gameState.level=config.minibosses[0].atEvolution;
                    LevelProgress.encounter(false);
                });
                assert.equal(await page.evaluate(()=>BossManager.activeBoss.isMiniboss),true);
                await page.evaluate(()=>{BossManager.activeBoss.die();});
                assert.equal(await page.evaluate(()=>LevelProgress.getState().index),i);
                await page.waitForTimeout(560);
                await page.evaluate(()=>{
                    levelUpScreen.classList.add('hidden'); gameState.level=LevelDirector.config().bossAtEvolution;
                    gameState.justDefeatedBoss=false; LevelProgress.encounter(false);
                    gameState.isPaused=true; cancelAnimationFrame(gameState.animationId);
                });
                const hp = await page.evaluate(()=>BossManager.activeBoss.maxHp);
                await page.evaluate(()=>{BossManager.activeBoss.die();});
                assert.equal(await page.evaluate(()=>LevelProgress.getState().index),Math.min(9,i+1));
                assert.equal(await page.evaluate(()=>CosmeticsManager.coins),wallet+reward);
                assert.equal(await page.locator('#game-over-screen').isVisible(),false);
                assert.equal(await page.locator('#level-win-screen').isVisible(),true);
                assert.equal(await page.locator('#hub-nav').isVisible(),false);
                assert.equal(await page.locator('#win-level').textContent(),`LEVEL ${i+1} / 10`);
                assert.ok((await page.locator('#win-reward').textContent()).includes(String(reward)));
                for (const lang of ['tr','en','fr','es','de','it']) {
                    await page.evaluate(lang=>Localization.setLanguage(lang),lang);
                    const fit=await page.evaluate(()=>['win-next-btn','win-hub-btn'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}));
                    assert.deepEqual(fit,[true,true],`win actions fit ${viewport.width} ${lang}`);
                }
                await page.evaluate(()=>Localization.setLanguage('tr'));
                if(i===0 || i===9) await page.screenshot({path:path.join(output,`win-${i+1}-${viewport.width}.png`)});
                assert.equal(await page.evaluate(()=>SaveManager.hasSave()),false);
                await page.evaluate(id=>{const entity=({1:boss,2:boss2,4:boss4,5:boss5,6:boss6,7:boss7,8:boss8,9:boss9,10:boss10,11:boss11})[id];entity.die();},bossIds[i]);
                assert.equal(await page.evaluate(()=>CosmeticsManager.coins),wallet+reward,'no repeated reward');
                assert.ok(hp>0);
                if (i===0) {
                    await page.reload();await page.waitForTimeout(500);
                    assert.equal(await page.locator('#level-win-screen').isVisible(),true,'persisted win reopens');
                    assert.equal(await page.evaluate(()=>CosmeticsManager.coins),wallet+reward,'reload never repeats gold');
                    await page.locator('#win-next-btn').click();
                    assert.equal(await page.locator('#hub-nav').isVisible(),false);
                    assert.equal(await page.evaluate(()=>gameState.takenPerks.length),0);
                    await page.evaluate(()=>{gameState.isStarting=false;gameState.isPaused=true;cancelAnimationFrame(gameState.animationId);clearInterval(gameState.spawnInterval);gameOver();});
                    await page.locator('#lose-menu-btn').click();
                } else {
                    await page.locator('#win-hub-btn').click();
                    assert.equal(await page.locator('#level-win-screen').isVisible(),false);
                    assert.equal(await page.locator('#hub-nav').isVisible(),true);
                }
            }
            await page.reload();await page.waitForTimeout(500);
            assert.equal(await page.evaluate(()=>LevelProgress.getState().index),9);
            assert.deepEqual(await page.evaluate(()=>MetaProgress.ranks()),{damage:1,speed:1,critical:1,automation:1});
            await page.locator('#start-btn').click();
            const lossWallet=await page.evaluate(()=>CosmeticsManager.coins);
            await page.evaluate(()=>{gameState.isStarting=false;gameState.isPaused=true;gameState.level=25;clearInterval(gameState.spawnInterval);cancelAnimationFrame(gameState.animationId);window.originalVipBonus=PremiumStoreManager.getVipBonusCoins;PremiumStoreManager.getVipBonusCoins=()=>1000;gameOver();PremiumStoreManager.getVipBonusCoins=window.originalVipBonus;delete window.originalVipBonus;});
            assert.equal(await page.evaluate(()=>LevelProgress.getState().index),9,'failure retains current Level');
            assert.equal(await page.evaluate(()=>CosmeticsManager.coins),lossWallet,'loss grants no gold, including VIP bonuses');
            assert.equal(await page.evaluate(()=>window.lastEarnedCoins),0);
            assert.equal(await page.evaluate(()=>SaveManager.hasSave()),false);
            assert.equal(await page.locator('#hub-nav').isVisible(),false);
            assert.equal(await page.locator('#start-screen').isVisible(),false);
            assert.equal(await page.locator('#level-lose-screen').isVisible(),true);
            assert.equal(await page.locator('#double-coins-btn').isVisible(),false);
            for (const lang of ['tr','en','fr','es','de','it']) {
                await page.evaluate(lang=>Localization.setLanguage(lang),lang);
                const fit=await page.evaluate(()=>['lose-retry-btn','lose-menu-btn'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}));
                assert.deepEqual(fit,[true,true],`lose actions fit ${viewport.width} ${lang}`);
            }
            await page.evaluate(()=>Localization.setLanguage('tr'));
            await page.screenshot({path:path.join(output,`lose-${viewport.width}.png`)});
            await page.locator('#lose-retry-btn').click();
            assert.equal(await page.locator('#level-lose-screen').isVisible(),false);
            assert.equal(await page.evaluate(()=>LevelProgress.getState().index),9);
            assert.equal(await page.evaluate(()=>gameState.level),1);
            assert.equal(await page.evaluate(()=>gameState.takenPerks.length),0);
            assert.equal(await page.evaluate(()=>gameState.playerStats.damageMultiplier),1.06);
            await page.evaluate(()=>{gameState.isStarting=false;gameState.isPaused=true;cancelAnimationFrame(gameState.animationId);clearInterval(gameState.spawnInterval);gameOver();});
            await page.locator('#lose-menu-btn').click();
            assert.equal(await page.locator('#hub-nav').isVisible(),true);
            assert.equal(await page.locator('#hub-recap').isVisible(),false,'no loss reward summary left in hub');
            assert.equal(await page.evaluate(()=>CosmeticsManager.coins),lossWallet);
            if (viewport.width===390) {
                await page.evaluate(()=>{CosmeticsManager.coins=0;CosmeticsManager.save();MainHub.render();});
                assert.equal(await page.evaluate(()=>MetaProgress.buy('speed')),false);
                await page.locator('#start-btn').click();
                assert.equal(await page.evaluate(()=>MetaProgress.buy('damage')),false,'no upgrades in active run');
                const snapshot = await page.evaluate(()=>{
                    gameState.isStarting=false;gameState.isPaused=true;clearInterval(gameState.spawnInterval);cancelAnimationFrame(gameState.animationId);
                    SpawnManager.selectPerk(ALL_PERKS.find(p=>p.id==='rapid_fire'));
                    gameState.isPaused=true;cancelAnimationFrame(gameState.animationId);clearInterval(gameState.spawnInterval);
                    gameState.level=LevelDirector.config().bossAtEvolution;LevelProgress.encounter(false);SaveManager.saveGame();
                    return {stats:{...gameState.playerStats},hp:BossManager.activeBoss.maxHp};
                });
                await page.reload();await page.waitForTimeout(500);await page.locator('#start-btn').click();
                assert.deepEqual(await page.evaluate(()=>gameState.playerStats),snapshot.stats,'resume retains build; meta never reapplied');
                assert.equal(await page.evaluate(()=>BossManager.activeBoss.name),'AURORA FORGE','boss reload resumes the actual encounter');
                assert.equal(await page.evaluate(()=>BossManager.activeBoss.maxHp),snapshot.hp,'boss HP does not compound');
                await page.evaluate(()=>gameOver());
                const inventory = await page.evaluate(()=>[...CosmeticsManager.unlocked]);
                await page.evaluate(()=>{
                    localStorage.setItem('neonblast_meta_transaction_v1',JSON.stringify({coins:1234,ranks:{damage:2,speed:1,critical:1,automation:1}}));
                });
                await page.reload();await page.waitForTimeout(300);
                assert.equal(await page.evaluate(()=>CosmeticsManager.coins),1234);
                assert.equal(await page.evaluate(()=>MetaProgress.ranks().damage),2);
                assert.deepEqual(await page.evaluate(()=>[...CosmeticsManager.unlocked]),inventory,'upgrade journal preserves cosmetics');
                await page.reload();await page.waitForTimeout(300);
                assert.equal(await page.evaluate(()=>CosmeticsManager.coins),1234,'journal replay is idempotent');
                // Exercise both new bosses through their attacks and all phases;
                // hit testing uses real projectile damage, not just forced death.
                const encounters = await page.evaluate(()=>{
                    initGame(); gameState.isStarting=false;gameState.isPaused=true;clearInterval(gameState.spawnInterval);cancelAnimationFrame(gameState.animationId);
                    const results=[];
                    for (const id of [10,11]) {
                        if (BossManager.activeBoss) BossManager.activeBoss.active=false;
                        gameState.bossActive=false;CollisionManager.clearBossRegistry();enemyPool.releaseAll();
                        BossManager.startBossFight(id);const entity=BossManager.activeBoss;
                        const initialHp=entity.hp;
                        const projectile=projectilePool.get(entity.x,entity.y,{x:0,y:0},false,gameState.playerStats);
                        CollisionManager.checkSingleBossHit(projectile,entity,entity.color);
                        const hit=entity.hp<initialHp;
                        for (const ratio of [.9,.5,.2]) {
                            entity.hp=entity.maxHp*ratio;
                            for (let frame=0;frame<380;frame++) {entity.update(player,1);entity.draw();}
                        }
                        results.push({id,hit,spawned:enemyPool.getActiveCount()>0,finite:Number.isFinite(entity.x)&&Number.isFinite(entity.y),phase:entity.phase});
                    }
                    gameOver();return results;
                });
                for (const boss of encounters) {assert.ok(boss.hit&&boss.spawned&&boss.finite);assert.equal(boss.phase,3);}
                const damage = await page.evaluate(()=>{gameState.playerStats.automationMultiplier=1.07;return MetaProgress.passiveDamage(2);});
                assert.equal(damage,2.14);
            }
            assert.deepEqual(errors, [],'runtime errors');
            report.push({viewport,levels:10,uniqueBosses:10,meta:'gold purchase and persistence, once per fresh run',perks:'zero at each level',languages:6,errors});
            await context.close();
        }
        fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
        console.log('PASS: 10 unique boss Levels, minibosses, gold once, fresh builds, permanent upgrades, reload/retry, hub tabs and settings in 6 languages / 4 screen sizes.');
    } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
