// Real canvas colour checks across every cosmetic, both rendering paths and UI actions.
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const output = path.resolve(__dirname, '../artifacts/cosmetics');
const server = http.createServer((req,res) => {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname === '/capacitor.js') {res.end('');return;}
    const file = path.resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
    if (!file.startsWith(root+path.sep)) {res.writeHead(403);res.end();return;}
    fs.readFile(file,(error,body) => {
        if(error){res.writeHead(404);res.end();return;}
        res.setHeader('Content-Type', {'.html':'text/html','.js':'text/javascript','.css':'text/css','.wav':'audio/wav','.ogg':'audio/ogg'}[path.extname(file)]||'application/octet-stream');
        res.end(body);
    });
});
(async()=>{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    fs.mkdirSync(output,{recursive:true});
    const browser = await chromium.launch({channel:'chrome',headless:true});
    try {
        const page = await browser.newPage({viewport:{width:1200,height:1050}});
        const errors=[];
        page.on('pageerror',error=>errors.push(error.message));
        await page.route('https://**',route=>route.abort());
        await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
        await page.waitForTimeout(1400);
        const result = await page.evaluate(()=>{
            const items=Object.values(CosmeticsManager.ITEMS).filter(item=>['core','projectile'].includes(item.type));
            const newIds=['core_raptor','core_manta','core_seraph','core_eclipse','core_monarch','proj_comet','proj_helix','proj_razor','proj_nova','proj_lance'];
            const failures=[];
            if(CosmeticVisuals.alpha('white',.5)!=='rgba(255,255,255,0.5)')failures.push('named default colour');
            if(CosmeticVisuals.alpha('rgb(255, 0, 0)',.5)!=='rgba(255,0,0,0.5)')failures.push('legacy rgb colour');
            if(CosmeticVisuals.alpha('hsl(120, 100%, 50%)',.5)!=='rgba(0,255,0,0.5)')failures.push('legacy hsl colour');
            for(const lang of ['en','tr','fr','es','de','it']) {
                for(const id of newIds) {
                    for(const suffix of ['name','desc']) if(!Localization.translations[lang][`cosmetic_${id}_${suffix}`]) failures.push(`${lang}/${id}/${suffix}`);
                }
            }
            const coins=CosmeticsManager.coins;
            const originalUpdate=CosmeticsManager.updateUI;
            CosmeticsManager.updateUI=()=>{};
            // Verify hue from rendered pixels, not just the source variable.
            const canvas=document.getElementById('gameCanvas');
            const hasEnergy=(ctx,x,y,w,h,color,label)=>{
                const hex=color.slice(1), expected=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));
                const data=ctx.getImageData(x,y,w,h).data;
                let matching=0,foreign=0;
                // White-hot centres blend with the tint at antialiased edges.
                const norm=v=>{const min=Math.min(...v), range=Math.max(...v)-min;return v.map(c=>(c-min)/range);};
                const want=norm(expected);
                for(let i=0;i<data.length;i+=4){
                    const rgb=[data[i],data[i+1],data[i+2]];
                    const max=Math.max(...rgb),min=Math.min(...rgb);
                    if(data[i+3]<100||max<90||(max-min)/max<.35)continue;
                    const actual=norm(rgb);
                    const difference=Math.max(...actual.map((v,j)=>Math.abs(v-want[j])));
                    if(difference<.2)matching++;else foreign++;
                }
                if(matching<4||foreign>matching*.1)failures.push(`${label}: matching=${matching}, foreign=${foreign}`);
            };
            for(const color of ['#ff0000','#00ff00','#00ffff','#ff00ff','#ff6600','#ffff00']) {
                gameState.playerStats.color=color;
                for(const item of items){
                    CosmeticsManager.unlocked.add(item.id);
                    CosmeticsManager.equip(item.type,item.id);
                    if(gameState.playerStats.color!==color)failures.push(`equip reset ${item.id}`);
                    CTX.clearRect(0,0,canvas.width,canvas.height);
                    if(item.type==='core') {
                        CTX.save();CTX.translate(100,100);drawSpacecraftHull(CTX,item.id,color,20,2);CTX.restore();
                        hasEnergy(CTX,45,45,110,110,color,`hull ${item.id}/${color}`);
                    }else{
                        const shot=new Projectile();
                        shot.reset(100,100,{x:10,y:0},false,{...gameState.playerStats,color,shotSize:8});
                        shot.draw();hasEnergy(CTX,45,70,110,60,color,`single ${item.id}/${color}`);
                        CTX.clearRect(0,0,canvas.width,canvas.height);
                        RenderOptimizer.useShadows=false;
                        RenderOptimizer.drawProjectilesBatched([shot]);
                        hasEnergy(CTX,45,70,110,60,color,`batch ${item.id}/${color}`);
                        // Equipping mid-run preserves in-flight perk colour too.
                        projectilePool.releaseAll();
                        const active=projectilePool.get(100,100,{x:10,y:0},false,{...gameState.playerStats,color});
                        CosmeticsManager.equip('projectile',item.id);
                        if(active.color!==color)failures.push(`in-flight reset ${item.id}`);
                        projectilePool.releaseAll();
                    }
                }
            }
            if(coins!==CosmeticsManager.coins)failures.push('equip changed balance');
            // A real new run begins white, before the first colour-changing perk.
            for(const item of items) {
                CosmeticsManager.equipped[item.type]=item.id;
                CTX.clearRect(0,0,canvas.width,canvas.height);
                if(item.type==='core') {
                    CTX.save();CTX.translate(100,100);drawSpacecraftHull(CTX,item.id,'white',20,2);CTX.restore();
                }else{
                    const shot=new Projectile();shot.reset(100,100,{x:10,y:0},false,{...gameState.playerStats,color:'white'});
                    shot.draw();RenderOptimizer.drawProjectilesBatched([shot]);
                }
            }
            for(const id of newIds) {
                const item=CosmeticsManager.ITEMS[id];
                const pack=CosmeticsManager.CIPHER_PACKS.find(p=>p.rarities.includes(item.rarity));
                if(!pack) {failures.push(`unobtainable ${id}`);continue;}
                CosmeticsManager.unlocked=new Set(Object.keys(CosmeticsManager.ITEMS).filter(key=>key!==id));
                if(CosmeticsManager.openPack(pack.id,true).item?.id!==id) failures.push(`chest cannot grant ${id}`);
            }
            const renderTimes={};
            const shots=Array.from({length:500},(_,i)=>({x:50+(i%40)*25,y:50+Math.floor(i/40)*25,radius:4,color:'#ff0000',velocity:{x:8,y:2}}));
            for(const id of newIds.filter(id=>id.startsWith('proj_'))) {
                CosmeticsManager.equipped.projectile=id;
                const times=[];
                for(let i=0;i<5;i++) {
                    CTX.clearRect(0,0,canvas.width,canvas.height);
                    const start=performance.now();RenderOptimizer.drawProjectilesBatched(shots);times.push(performance.now()-start);
                }
                times.sort((a,b)=>a-b);renderTimes[id]=times[2];
            }
            const stats={...DEFAULT_PLAYER_STATS};
            ALL_PERKS.find(p=>p.id==='laser_beam').apply(stats);
            if(stats.color!=='#ff0000')failures.push('laser perk changed');
            CosmeticsManager.updateUI=originalUpdate;
            return {failures,cores:items.filter(i=>i.type==='core').length,projectiles:items.filter(i=>i.type==='projectile').length,renderTimes};
        });
        assert.deepEqual(result.failures,[]);
        assert.equal(result.cores,15);assert.equal(result.projectiles,13);
        await page.evaluate(()=>{
            const ids=['core_raptor','core_manta','core_seraph','core_eclipse','core_monarch','proj_comet','proj_helix','proj_razor','proj_nova','proj_lance'];
            const gallery=document.createElement('div');gallery.id='cosmetic-gallery';
            Object.assign(gallery.style,{position:'fixed',inset:'0',background:'#070b11',zIndex:99999,padding:'32px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'12px',fontFamily:'MenuText',color:'#dbe7ef'});
            for(const id of ids){
                const item=CosmeticsManager.ITEMS[id];
                const card=document.createElement('div');card.style.cssText='border:1px solid #2b3b49;background:#0e1620;padding:16px;display:flex;align-items:center;flex-direction:column;justify-content:center;gap:14px';
                const title=document.createElement('div');title.textContent=CosmeticsManager.getItemName(item);title.style.cssText='font-size:22px;color:#e3eaf0;text-transform:uppercase';card.appendChild(title);
                const label=document.createElement('div');label.textContent=item.rarity;label.style.cssText='font-size:11px;color:#8295a5';card.appendChild(label);
                for(const color of [item.color,'#ff0000']) {
                    const canvas=document.createElement('canvas');canvas.width=190;canvas.height=140;card.appendChild(canvas);
                    const ctx=canvas.getContext('2d');ctx.translate(95,70);ctx.shadowColor=color;ctx.shadowBlur=12;
                    if(item.type==='core'){ctx.rotate(-Math.PI/8);drawSpacecraftHull(ctx,id,color,32,2,true);}
                    else CosmeticVisuals.drawProjectile(ctx,id,color,16,2);
                }
                const caption=document.createElement('div');caption.textContent='HANGAR / LASER PERK';caption.style.cssText='font-size:11px;color:#8295a5';card.appendChild(caption);gallery.appendChild(card);
            }
            document.body.appendChild(gallery);
        });
        await page.screenshot({path:path.join(output,'new-designs.png')});
        await page.evaluate(()=>document.getElementById('cosmetic-gallery').remove());
        await page.setViewportSize({width:390,height:844});
        await page.click('#armory-btn');
        await page.screenshot({path:path.join(output,'button-surfaces.png')});
        const buttons=await page.evaluate(()=>{
            return [...document.querySelectorAll('#armory-modal button')].filter(el=>el.getClientRects().length).map(el=>{const s=getComputedStyle(el);return {id:el.id||el.className,bg:s.backgroundColor,border:s.borderTopWidth};});
        });
        buttons.forEach(b=>{assert.notEqual(b.bg,'rgba(0, 0, 0, 0)',b.id);assert.notEqual(b.border,'0px',b.id);});
        await page.click('[data-tab="cores"]');
        await page.screenshot({path:path.join(output,'ships-hangar.png')});
        await page.click('[data-tab="projectiles"]');
        await page.screenshot({path:path.join(output,'bullets-hangar.png')});
        assert.deepEqual(errors,[]);
        const responsive=[];
        // Inspect actual displayed pixels: a round core must remain round after
        // CSS sizing, high-density backing resolution and a live rotation resize.
        for(const [width,height,density] of [[320,568,2],[390,844,3],[844,390,2],[768,1024,2],[1440,900,1]]) {
            const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:density});
            const view=await context.newPage();
            const viewErrors=[];view.on('pageerror',error=>viewErrors.push(error.message));
            await view.route('https://**',route=>route.abort());
            await view.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
            await view.waitForTimeout(1000);
            await view.click('#armory-btn');await view.click('[data-tab="cores"]');
            const inspect=()=>view.evaluate(()=>{
                ArmoryUI.stopAnimationLoop();
                ArmoryUI.inspectedItem=CosmeticsManager.ITEMS.core_default;
                ArmoryUI.drawHangarPreview(2);ArmoryUI.drawAllCards(2);
                const problems=[];
                for(const canvas of document.querySelectorAll('#hangar-preview-canvas,.card-item-canvas')) {
                    const rect=canvas.getBoundingClientRect();
                    const parent=canvas.parentElement.getBoundingClientRect();
                    const dpr=Math.min(devicePixelRatio,2);
                    if(Math.abs(canvas.width-canvas.clientWidth*dpr)>1||Math.abs(canvas.height-canvas.clientHeight*dpr)>1)problems.push('backing resolution');
                    if(canvas.classList.contains('card-item-canvas')&&(rect.top<parent.top-1||rect.bottom>parent.bottom+1||rect.left<parent.left-1||rect.right>parent.right+1))problems.push('card overflow');
                }
                const canvas=document.getElementById('hangar-preview-canvas');
                const ctx=canvas.getContext('2d'),rect=canvas.getBoundingClientRect();
                const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
                let minX=canvas.width,minY=canvas.height,maxX=-1,maxY=-1;
                for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++) {
                    const i=(y*canvas.width+x)*4;
                    if(data[i]<100&&data[i+1]>120&&data[i+2]>120&&data[i+3]>100){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
                }
                const sx=rect.width/canvas.width,sy=rect.height/canvas.height;
                const physicalWidth=(maxX-minX+1)*sx,physicalHeight=(maxY-minY+1)*sy;
                if(maxX<0||Math.abs(physicalWidth/physicalHeight-1)>.06)problems.push('round core stretched');
                if(Math.abs((minX+maxX+1)*sx/2-rect.width/2)>2||Math.abs((minY+maxY+1)*sy/2-rect.height/2)>2)problems.push('core off centre');
                // All animated hulls/shots fit the usable canvas, at several phases.
                for(const item of Object.values(CosmeticsManager.ITEMS).filter(i=>['core','projectile'].includes(i.type))) {
                    for(const time of [0,2,5]) {
                        ArmoryUI.drawItemGraphic(ctx,item,true,false,time,1.6);
                        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
                        let edge=false;
                        for(let x=0;x<canvas.width;x++) if(pixels[x*4+3]>16||pixels[((canvas.height-1)*canvas.width+x)*4+3]>16)edge=true;
                        for(let y=0;y<canvas.height;y++) if(pixels[(y*canvas.width)*4+3]>16||pixels[(y*canvas.width+canvas.width-1)*4+3]>16)edge=true;
                        if(edge)problems.push(`clipped ${item.id}`);
                    }
                }
                ArmoryUI.drawHangarPreview(2);
                return {problems,physicalWidth,physicalHeight,canvas:[canvas.width,canvas.height],display:[rect.width,rect.height]};
            });
            const portrait=await inspect();assert.deepEqual(portrait.problems,[],`${width}x${height}@${density}`);
            await view.screenshot({path:path.join(output,`responsive-${width}.png`)});
            await view.setViewportSize({width:height,height:width});
            const rotated=await inspect();assert.deepEqual(rotated.problems,[],`live resize ${height}x${width}: ${JSON.stringify(rotated)}`);
            assert.deepEqual(viewErrors,[]);
            responsive.push({width,height,density,portrait,rotated});await context.close();
        }
        fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({result,buttons,responsive},null,2));
        console.log(`PASS: ${result.cores} cores, ${result.projectiles} projectiles, six perk hues, both renderers, button surfaces; five responsive sizes/densities and live rotation without stretch or clipping.`);
    }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
