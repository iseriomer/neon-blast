// Discovery is observational: it never spawns enemies, applies perks or changes balance.
(() => {
    const storageKey = 'neonblast_encyclopedia_v1';
    const enemyEntries = Object.entries(ENEMY_TYPES);
    const bossEntries = Object.entries({1:boss,2:boss2,4:boss4,5:boss5,6:boss6,7:boss7,8:boss8,9:boss9,10:boss10,11:boss11,101:miniSentinel,102:miniWarden,103:miniHarvester});
    const knownIds = new Set([...enemyEntries.map(([id])=>'enemy:'+id), ...bossEntries.map(([id])=>'boss:'+id), ...ALL_PERKS.map(p=>'perk:'+p.id)]);
    let records = {}, category = 'enemy', dirty = false, saveTimer = null;
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey));
        if (saved && saved.version === 1 && saved.records && typeof saved.records === 'object') {
            for (const [id, record] of Object.entries(saved.records)) {
                if (!knownIds.has(id) || !record || record.seen !== true) continue;
                records[id] = {seen:true};
                if (Number.isFinite(record.hp) && record.hp > 0) records[id].hp = record.hp;
                if (typeof record.image === 'string' && record.image.startsWith('data:image/png;base64,') && record.image.length < 100000) records[id].image = record.image;
            }
        }
    } catch (_) {}
    const keys = ['hub_archive','ency_note','ency_enemy','ency_boss','ency_perk','ency_empty','ency_count','ency_base_hp','ency_speed','ency_score','ency_seen_hp','ency_base_note','ency_mini'];
    const rows = {
        tr:['Ansiklopedi','Karşılaştığın düşmanlar, bosslar ve gördüğün perkler burada saklanır.','Düşmanlar','Bosslar','Perkler','Henüz keşif yok. Oynadıkça bu sayfa dolacak.','{n} keşif','Temel can','Hız','XP','Karşılaşma canı','Düşman değerleri temeldir; Level zorluğu ile artabilir.','Miniboss'],
        en:['Encyclopedia','Enemies and bosses you encounter, and perks you see, are recorded here.','Enemies','Bosses','Perks','No discoveries yet. Play to fill this page.','{n} discovered','Base HP','Speed','XP','Encounter HP','Enemy values are base values; Level difficulty can increase them.','Miniboss'],
        fr:['Encyclopédie','Les ennemis, boss rencontrés et atouts vus sont enregistrés ici.','Ennemis','Boss','Atouts','Aucune découverte. Jouez pour remplir cette page.','{n} découvertes','PV de base','Vitesse','XP','PV rencontrés','Valeurs de base : la difficulté du niveau peut les augmenter.','Mini-boss'],
        es:['Enciclopedia','Aquí se registran enemigos, jefes y ventajas que has visto.','Enemigos','Jefes','Ventajas','Sin descubrimientos. Juega para llenar esta página.','{n} descubiertos','Vida base','Velocidad','XP','Vida del encuentro','Valores base: la dificultad del nivel puede aumentarlos.','Minijefe'],
        de:['Enzyklopädie','Begegnete Gegner und Bosse sowie gesehene Perks werden hier gespeichert.','Gegner','Bosse','Perks','Noch keine Entdeckungen. Spiele, um diese Seite zu füllen.','{n} entdeckt','Basis-HP','Tempo','XP','Begegnungs-HP','Basiswerte: Die Level-Schwierigkeit kann diese erhöhen.','Miniboss'],
        it:['Enciclopedia','Qui trovi i nemici, boss incontrati e vantaggi che hai visto.','Nemici','Boss','Vantaggi','Nessuna scoperta. Gioca per riempire questa pagina.','{n} scoperti','Vita base','Velocità','XP','Vita incontrata','Valori base: la difficoltà del livello può aumentarli.','Miniboss']
    };
    for (const [lang, values] of Object.entries(rows)) keys.forEach((key,i)=>Localization.translations[lang][key]=values[i]);
    // Order follows ENEMY_TYPES; descriptions explain existing behavior.
    const enemyTraits = {
        tr:['Sana doğru yaklaşır.','Hızlı ilerler; yaklaşmadan vur.','Yavaş ve dayanıklı.','Aralıklarla sana doğru atılır.','Yenilince küçük parçalara ayrılır.','Splitter’dan çıkan küçük, hızlı düşman.','Yeni düşmanlar üretir.','Yakındaki düşmanlara kalkan desteği sağlar.','Çok dayanıklı; dondurma ve geri itmeye bağışık.'],
        en:['Moves toward you.','Fast approach; shoot before it reaches you.','Slow and durable.','Dashes toward you at intervals.','Splits into smaller enemies on defeat.','Small, fast offspring of a Splitter.','Spawns additional enemies.','Provides shield support to nearby enemies.','Very durable; immune to freeze and knockback.'],
        fr:['Avance vers vous.','Très rapide : tirez avant son arrivée.','Lent et résistant.','Fonce vers vous par intervalles.','Se divise en petits ennemis à sa mort.','Petit ennemi rapide issu du Splitter.','Crée de nouveaux ennemis.','Protège les ennemis proches avec un bouclier.','Très résistant, insensible au gel et au recul.'],
        es:['Avanza hacia ti.','Rápido: dispárale antes de que llegue.','Lento y resistente.','Se lanza hacia ti periódicamente.','Se divide en enemigos pequeños al morir.','Cría pequeña y rápida del Splitter.','Genera más enemigos.','Protege con escudos a enemigos cercanos.','Muy resistente; inmune a hielo y retroceso.'],
        de:['Bewegt sich auf dich zu.','Schnell; schieße vor seiner Ankunft.','Langsam und widerstandsfähig.','Stürmt in Abständen auf dich zu.','Zerfällt beim Tod in kleine Gegner.','Kleiner, schneller Abkömmling des Splitters.','Erzeugt weitere Gegner.','Schützt nahe Gegner mit Schilden.','Sehr robust; immun gegen Einfrieren und Rückstoß.'],
        it:['Si avvicina a te.','Veloce: colpiscilo prima che arrivi.','Lento e resistente.','Scatta verso di te a intervalli.','Si divide in piccoli nemici alla morte.','Piccolo nemico veloce generato dal Splitter.','Genera altri nemici.','Fornisce scudi ai nemici vicini.','Molto resistente; immune a gelo e contraccolpo.']
    };
    const bossTraits = {
        tr:['İki faz; minyonlar, füzeler ve spiral saldırılar.','Saldırılarını önceden gösterir; üç renkli faz.','Drone sürüleri üretir.','Zaman temalı saldırılarını takip et.','Void orbitalleri, klonlar ve dört saldırı fazı.','Orbitaller, klonlar ve son fazda kalkan direkleri.','Kozmik saldırılar ve çekim kuyuları.','Veri saldırıları, güvenlik duvarları ve virüs sürüleri.','Yaklaşan birlikler üretir; birlikler varken korunur.','Üç faz; zırhlı birlikler ve hızlı düşman dalgaları.','İşaretli noktalardan Basic ve Speedster üretir.','İşaretli noktalardan Tank ve Splitter üretir.','İşaretli noktalardan Dasher ve Spawner üretir.'],
        en:['Two phases; minions, missiles and spiral attacks.','Telegraphed attacks across three colored phases.','Deploys drone swarms.','Watch its time-themed attacks.','Void orbitals, clones and four attack phases.','Orbitals, clones and shield pylons in its final phase.','Cosmic attacks and gravity wells.','Data attacks, firewalls and virus swarms.','Deploys approaching sentries; protected while they remain.','Three phases; armored units and fast enemy waves.','Telegraphs Basic and Speedster deployment points.','Telegraphs Tank and Splitter deployment points.','Telegraphs Dasher and Spawner deployment points.'],
        fr:['Deux phases : serviteurs, missiles et spirales.','Attaques annoncées, trois phases colorées.','Déploie des essaims de drones.','Surveillez ses attaques temporelles.','Orbitales du vide, clones et quatre phases.','Orbitales, clones et pylônes de bouclier en phase finale.','Attaques cosmiques et puits gravitationnels.','Attaques de données, pare-feu et virus.','Déploie des sentinelles ; protégé tant qu’elles restent.','Trois phases : unités blindées et vagues rapides.','Annonce les points de déploiement Basic et Speedster.','Annonce les points de déploiement Tank et Splitter.','Annonce les points de déploiement Dasher et Spawner.'],
        es:['Dos fases: esbirros, misiles y espirales.','Ataques anunciados en tres fases de colores.','Despliega enjambres de drones.','Observa sus ataques temporales.','Orbitales del vacío, clones y cuatro fases.','Orbitales, clones y pilares de escudo en la fase final.','Ataques cósmicos y pozos gravitatorios.','Ataques de datos, cortafuegos y virus.','Despliega centinelas; protegido mientras permanecen.','Tres fases: unidades blindadas y oleadas rápidas.','Anuncia puntos de despliegue de Basic y Speedster.','Anuncia puntos de despliegue de Tank y Splitter.','Anuncia puntos de despliegue de Dasher y Spawner.'],
        de:['Zwei Phasen: Diener, Raketen und Spiralen.','Angekündigte Angriffe in drei farbigen Phasen.','Erzeugt Drohnenschwärme.','Achte auf seine zeitbasierten Angriffe.','Leere-Orbitale, Klone und vier Angriffsphasen.','Orbitale, Klone und Schildpylonen in der letzten Phase.','Kosmische Angriffe und Gravitationsbrunnen.','Datenangriffe, Firewalls und Virenschwärme.','Erzeugt herannahende Wächter; geschützt, solange sie leben.','Drei Phasen: gepanzerte Einheiten und schnelle Wellen.','Markiert Einsatzpunkte für Basic und Speedster.','Markiert Einsatzpunkte für Tank und Splitter.','Markiert Einsatzpunkte für Dasher und Spawner.'],
        it:['Due fasi: servitori, missili e spirali.','Attacchi annunciati in tre fasi colorate.','Genera sciami di droni.','Osserva i suoi attacchi temporali.','Orbitali del vuoto, cloni e quattro fasi.','Orbitali, cloni e piloni scudo nella fase finale.','Attacchi cosmici e pozzi gravitazionali.','Attacchi di dati, firewall e virus.','Genera sentinelle; protetto finché rimangono.','Tre fasi: unità corazzate e ondate rapide.','Segnala punti di schieramento Basic e Speedster.','Segnala punti di schieramento Tank e Splitter.','Segnala punti di schieramento Dasher e Spawner.']
    };
    enemyEntries.forEach(([id],i)=>Object.keys(rows).forEach(lang=>Localization.translations[lang]['ency_enemy_'+id]=enemyTraits[lang][i]));
    // Numeric keys are enumerated in ascending order, including the two new bosses.
    // Keep the descriptions indexed by explicit IDs rather than display ordering.
    const traitOrder = [1,2,4,5,6,7,8,9,10,11,101,102,103];
    traitOrder.forEach((id,i)=>Object.keys(rows).forEach(lang=>Localization.translations[lang]['ency_boss_'+id]=bossTraits[lang][i]));
    const t = (key, params) => Localization.t(key, params);
    function flush() {
        clearTimeout(saveTimer); saveTimer = null;
        if (!dirty) return;
        try { localStorage.setItem(storageKey, JSON.stringify({version:1,records})); dirty = false; }
        catch (_) {
            // Images are optional; retain discoveries if storage is near its quota.
            try { localStorage.setItem(storageKey, JSON.stringify({version:1,records:Object.fromEntries(Object.entries(records).map(([id,r])=>[id,{seen:true,hp:r.hp}]))})); dirty = false; } catch (_) {}
        }
    }
    function changed() { dirty = true; if (!saveTimer) saveTimer = setTimeout(flush, 250); }
    function discover(id, hp) {
        if (!knownIds.has(id) || records[id]) return;
        records[id] = {seen:true}; if (hp > 0 && Number.isFinite(hp)) records[id].hp = hp;
        changed();
    }
    function observe(entity, id) {
        if (!gameState.gameActive || gameState.isStarting || !entity || entity.isDead) return;
        const r = entity.radius, x = entity.x, y = entity.y;
        if (!Number.isFinite(r) || r <= 0 || x + r <= 0 || y + r <= 0 || x - r >= CANVAS.width || y - r >= CANVAS.height) return;
        discover(id, entity.maxHp);
        const record = records[id];
        if (!record || record.image || x-r<0 || y-r<0 || x+r>CANVAS.width || y+r>CANVAS.height) return;
        // One small image per discovered type, taken from the actual game drawing.
        const preview = document.createElement('canvas'); preview.width = preview.height = 128;
        const size = r * 3.6;
        preview.getContext('2d').drawImage(CANVAS,x-size/2,y-size/2,size,size,0,0,128,128);
        try { record.image = preview.toDataURL('image/png'); changed(); } catch (_) {}
    }
    const enemyId = new Map(enemyEntries.map(([id,type])=>[type,'enemy:'+id]));
    function observeEnemy(enemy) {
        // Boss projectiles often borrow ENEMY_TYPES but have custom behavior/visuals.
        if (Object.prototype.hasOwnProperty.call(enemy,'draw') && enemy.type?.name !== 'SUPERTANK') return;
        const id = enemyId.get(enemy.type); if (id) observe(enemy,id);
    }
    const originalEnemyDraw = RenderOptimizer.drawEnemy;
    RenderOptimizer.drawEnemy = function(enemy) { originalEnemyDraw.call(this,enemy); observeEnemy(enemy); };
    const originalBatch = RenderOptimizer.drawEnemiesBatched;
    RenderOptimizer.drawEnemiesBatched = function(enemies) { originalBatch.call(this,enemies); for (const enemy of enemies) observeEnemy(enemy); };
    function observeBoss() { const entity = BossManager.activeBoss; if (entity?.active) observe(entity,'boss:'+entity.campaignBossId); }
    for (const name of ['draw','updateAndDraw']) {
        const original = BossManager[name];
        BossManager[name] = function(...args) { original.apply(this,args); observeBoss(); };
    }
    window.Encyclopedia = {
        has(id) { return !!records[id]; },
        discovered() { return Object.keys(records); },
        flush,
        discoverPerk(perk) {
            if (gameState.gameActive && !levelUpScreen.classList.contains('hidden')) discover('perk:'+perk.id);
        },
        render(panel) {
            const lists = {
                enemy: enemyEntries.filter(([id])=>records['enemy:'+id]).map(([id,type])=>({id:'enemy:'+id,title:type.name,desc:t('ency_enemy_'+id),stats:`${t('ency_base_hp')}: ${type.hp} · ${t('ency_speed')}: ×${type.speed} · ${t('ency_score')}: ${type.score}`})),
                boss: bossEntries.filter(([id])=>records['boss:'+id]).map(([id,entity])=>({id:'boss:'+id,title:entity.name,desc:t('ency_boss_'+id),stats:`${Number(id)>=100 ? t('ency_mini')+' · ' : ''}${t('ency_seen_hp')}: ${Math.round(records['boss:'+id].hp || entity.maxHp).toLocaleString(Localization.currentLang)}`})),
                perk: ALL_PERKS.filter(p=>records['perk:'+p.id]).map(p=>({id:'perk:'+p.id,title:t(p.title),desc:GameBalance.perkDescription(p),perk:p}))
            };
            panel.innerHTML = '<div class="hub-panel-inner encyclopedia"><h1></h1><p class="hub-description"></p><div class="ency-filters" role="group"></div><p class="ency-count"></p><div class="ency-list"></div><p class="ency-footnote"></p></div>';
            panel.querySelector('h1').textContent = t('hub_archive');
            panel.querySelector('.hub-description').textContent = t('ency_note');
            const filters = panel.querySelector('.ency-filters'); filters.setAttribute('aria-label',t('hub_archive'));
            for (const name of ['enemy','boss','perk']) {
                const button = document.createElement('button'); button.type = 'button'; button.dataset.encyCategory = name;
                button.textContent = t('ency_'+name); button.setAttribute('aria-pressed',String(name===category));
                button.onclick = () => { category = name; MenuAudio.play('click'); this.render(panel); panel.querySelector(`[data-ency-category="${name}"]`).focus({preventScroll:true}); };
                filters.appendChild(button);
            }
            panel.querySelector('.ency-count').textContent = t('ency_count',{n:lists[category].length});
            const list = panel.querySelector('.ency-list');
            if (!lists[category].length) { const empty = document.createElement('p'); empty.className = 'ency-empty'; empty.textContent = t('ency_empty'); list.appendChild(empty); }
            for (const entry of lists[category]) {
                const card = document.createElement('article'); card.className = 'ency-card'; card.dataset.encyId = entry.id;
                card.innerHTML = '<div class="ency-image"></div><div class="ency-copy"><h2></h2><p></p><small></small></div>';
                card.querySelector('h2').textContent = entry.title; card.querySelector('p').textContent = entry.desc;
                card.querySelector('small').textContent = entry.stats || '';
                const image = card.querySelector('.ency-image');
                if (entry.perk) image.innerHTML = IconSystem.getPerkIcon(entry.perk.id,entry.perk.theme || '#00ffff',52);
                else if (records[entry.id].image) { const img = document.createElement('img'); img.src = records[entry.id].image; img.alt = entry.title; img.width = img.height = 128; image.appendChild(img); }
                else { image.textContent = '◈'; image.setAttribute('aria-hidden','true'); }
                list.appendChild(card);
            }
            panel.querySelector('.ency-footnote').textContent = category === 'enemy' && lists.enemy.length ? t('ency_base_note') : '';
        }
    };
    // A saved, previously selected perk is evidence of an existing player's discovery.
    const savedRun = SaveManager.loadGame();
    for (const id of savedRun?.takenPerks || []) discover('perk:'+id);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)flush();});
    window.addEventListener('pagehide',flush);
})();
