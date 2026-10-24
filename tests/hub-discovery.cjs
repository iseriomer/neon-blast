const { chromium } = require('playwright');
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname,'../www'), output = path.resolve(__dirname,'../artifacts/discovery');
const server = http.createServer((req,res)=>{
    const name = new URL(req.url,'http://localhost').pathname;
    if(name==='/capacitor.js'){res.end('');return;}
    const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
    if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',{'.js':'text/javascript','.css':'text/css','.html':'text/html'}[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    fs.mkdirSync(output,{recursive:true});
    const browser=await chromium.launch({channel:'chrome',headless:true});
    const url=`http://127.0.0.1:${server.address().port}/?dev=1`;
    try {
        for(const viewport of [{width:320,height:568},{width:390,height:844},{width:844,height:390},{width:1366,height:768}]) {
            const context=await browser.newContext({viewport,hasTouch:true}), page=await context.newPage(), errors=[];
            page.on('pageerror',error=>errors.push(error.message));
            await page.route('https://**',route=>route.abort());
            await page.goto(url);await page.waitForTimeout(1100);
            assert.deepEqual(await page.evaluate(()=>Encyclopedia.discovered()),[],'pool prewarming never unlocks entries');
            await page.locator('[data-hub-tab="archive"]').click();
            for(const name of ['enemy','boss','perk']) {
                await page.locator(`[data-ency-category="${name}"]`).click();
                assert.equal(await page.locator('.ency-card').count(),0,'no names, icons or descriptions before seeing them');
                assert.equal(await page.locator('.ency-empty').isVisible(),true);
            }
            await page.locator('[data-hub-tab="play"]').click();await page.locator('#start-btn').click();
            assert.equal(await page.locator('#hub-nav').isVisible(),false,'hub gone immediately during intro');
            assert.equal(await page.locator('#hub-header').isVisible(),false);
            await page.evaluate(()=>{gameState.isStarting=false;gameState.isPaused=true;cancelAnimationFrame(gameState.animationId);clearInterval(gameState.spawnInterval);});
            // Offscreen spawns do not count as seen. Onscreen rendered types do.
            await page.evaluate(()=>{
                const enemy=enemyPool.get(-200,-200,ENEMY_TYPES.BASIC,1);RenderOptimizer.drawEnemiesBatched([enemy]);
            });
            assert.equal(await page.evaluate(()=>Encyclopedia.has('enemy:BASIC')),false);
            await page.evaluate(()=>{CTX.clearRect(0,0,CANVAS.width,CANVAS.height);const enemy=enemyPool.getActive()[0];enemy.x=CANVAS.width/2;enemy.y=CANVAS.height/2;RenderOptimizer.drawEnemiesBatched([enemy]);});
            assert.equal(await page.evaluate(()=>Encyclopedia.has('enemy:BASIC')),true);
            // Boss support objects borrowing an enemy type must not unlock that enemy.
            await page.evaluate(()=>{const minion=enemyPool.get(100,100,ENEMY_TYPES.SPEEDSTER,1);minion.draw=()=>{};RenderOptimizer.drawEnemiesBatched([minion]);});
            assert.equal(await page.evaluate(()=>Encyclopedia.has('enemy:SPEEDSTER')),false);
            await page.evaluate(()=>{const bullet=enemyPool.get(100,100,ENEMY_TYPES.TANK,1);bullet.type={...ENEMY_TYPES.TANK,score:0};RenderOptimizer.drawEnemiesBatched([bullet]);});
            assert.equal(await page.evaluate(()=>Encyclopedia.has('enemy:TANK')),false,'a boss projectile with a copied type is not a normal enemy discovery');
            await page.evaluate(()=>BossManager.startBossFight(1));
            assert.equal(await page.evaluate(()=>Encyclopedia.has('boss:1')),false,'starting an encounter does not reveal an offscreen boss');
            await page.evaluate(()=>{CTX.clearRect(0,0,CANVAS.width,CANVAS.height);BossManager.activeBoss.y=Math.max(80,CANVAS.height*.22);BossManager.draw();});
            assert.equal(await page.evaluate(()=>Encyclopedia.has('boss:1')),true);
            await page.evaluate(()=>{levelUpScreen.classList.remove('hidden');SpawnManager.rollPerks([]);});
            const offered=await page.evaluate(()=>SpawnManager.currentOfferedPerks.map(p=>'perk:'+p.id));
            assert.equal(await page.evaluate(()=>Encyclopedia.discovered().filter(id=>id.startsWith('perk:')).length),0,'decrypt animation does not reveal random perks');
            await page.waitForTimeout(1300);
            assert.deepEqual((await page.evaluate(()=>Encyclopedia.discovered().filter(id=>id.startsWith('perk:')))).sort(),offered.sort());
            await page.evaluate(()=>{Encyclopedia.flush();gameOver();});
            await page.locator('#lose-menu-btn').click();
            await page.locator('[data-hub-tab="archive"]').click();
            await page.locator('[data-ency-category="enemy"]').click();
            assert.equal(await page.locator('.ency-card').count(),1);
            assert.equal(await page.locator('.ency-image img').count(),1,'uses actual enemy image');
            assert.equal(await page.locator('.ency-image img').evaluate(img=>img.complete&&img.naturalWidth===128),true);
            await page.screenshot({path:path.join(output,`enemies-${viewport.width}.png`)});
            await page.locator('[data-ency-category="boss"]').click();assert.equal(await page.locator('.ency-card').count(),1);
            assert.equal(await page.locator('.ency-image img').count(),1);
            await page.screenshot({path:path.join(output,`bosses-${viewport.width}.png`)});
            await page.locator('[data-ency-category="perk"]').click();assert.equal(await page.locator('.ency-card').count(),3);
            assert.equal(await page.locator('.ency-image svg').count(),3);
            for(const lang of ['tr','en','fr','es','de','it']) {
                await page.evaluate(lang=>Localization.setLanguage(lang),lang);
                assert.equal(await page.locator('.ency-card').count(),3);
                assert.equal(await page.evaluate(()=>document.getElementById('hub-panel').scrollWidth<=innerWidth),true,'no horizontal overflow');
            }
            await page.evaluate(()=>Localization.setLanguage('tr'));
            await page.screenshot({path:path.join(output,`perks-${viewport.width}.png`)});
            await page.reload();await page.waitForTimeout(1100);
            assert.equal(await page.evaluate(()=>Encyclopedia.discovered().length),5,'discoveries survive reload');
            assert.equal(await page.evaluate(()=>Encyclopedia.has('boss:11')),false,'later bosses remain hidden');
            assert.deepEqual(errors,[]);await context.close();
        }
        // Reproduce delayed module startup: DOMContentLoaded must not bring the hub back.
        const context=await browser.newContext(), page=await context.newPage(), errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://**',route=>route.abort());
        let release;const gate=new Promise(resolve=>release=resolve);
        await page.route('**/game/leaderboard.js*',async route=>{await gate;await route.fulfill({status:200,contentType:'text/javascript',body:''});});
        await page.goto(url,{waitUntil:'commit'});
        await page.waitForFunction(()=>!!window.LevelWin&&!!window.MainHub);
        await page.evaluate(()=>document.getElementById('start-btn').click());
        release();await page.waitForLoadState('domcontentloaded');
        assert.equal(await page.evaluate(()=>gameState.gameActive),true);
        assert.equal(await page.locator('#hub-nav').isVisible(),false,'late DOMContentLoaded cannot reopen hub');
        assert.deepEqual(errors,[]);await context.close();
        // Simulate a missing optional ad script: menus/game work, rewarded actions fail closed.
        const missing=await browser.newContext(), adPage=await missing.newPage(), adErrors=[];
        adPage.on('pageerror',error=>adErrors.push(error.message));
        await adPage.route('https://**',route=>route.abort());
        await adPage.route('**/game/managers/AdManager.js*',route=>route.fulfill({status:200,contentType:'text/javascript',body:''}));
        await adPage.goto(url);await adPage.waitForTimeout(1100);
        await adPage.locator('#hub-settings').click();await adPage.locator('#player-options-close').click();
        await adPage.locator('#daily-rewards-btn').click();
        const coins=await adPage.evaluate(()=>CosmeticsManager.coins);
        await adPage.locator('#dr-double-btn').click();assert.equal(await adPage.evaluate(()=>CosmeticsManager.coins),coins,'missing ads never grant doubled rewards');
        await adPage.locator('#dr-close-btn').click();
        await adPage.locator('#lucky-spin-btn').click();await adPage.locator('#ls-ad-spin').click();
        assert.equal(await adPage.evaluate(()=>LuckySpinManager.isSpinning),false);
        await adPage.keyboard.press('Escape');await adPage.locator('#start-btn').click();
        assert.equal(await adPage.evaluate(()=>gameState.gameActive),true);
        assert.equal(await adPage.locator('#hub-nav').isVisible(),false);
        assert.deepEqual(adErrors,[]);await missing.close();
        console.log('PASS: actual visible discoveries, hidden unseen entries, images, perk offers, persistence, 6 languages / 4 sizes, delayed startup and missing-ad resilience.');
    } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
