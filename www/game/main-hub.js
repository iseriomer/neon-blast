(() => {
    const keys = ['hub_play','hub_meta','hub_archive','hub_settings','hub_damage','hub_speed','hub_critical','hub_automation','hub_meta_note','hub_upgrade','hub_max','hub_target','hub_fresh','hub_failed','hub_won','hub_archive_note','hub_gold','hub_language','hub_current','hub_no_score'];
    const rows = {
        tr: ['Oyna','Gelişim','Ansiklopedi','Ayarlar','Temel hasar','Atış hızı','Kritik şansı','Otomasyon gücü','Gold ile kalıcı gelişim. Yeni Level: sıfır perk, kalıcı güç.','Geliştir','MAKSİMUM','Final · Evolution {n}','Her Level yeni bir build. Perklerini Evolution ile seç.','Tekrar dene','Level tamamlandı','Boss rehberi. Hareket gerekmez: nişan al, yaklaşan tehditleri vur.','Gold','Dil','Şu anki Level','Bir Level oynadıktan sonra skorunu kaydedebilirsin.'],
        en: ['Play','Upgrades','Encyclopedia','Settings','Base damage','Attack speed','Critical chance','Automation power','Permanent upgrades with gold. New Level: zero perks, permanent power.','Upgrade','MAXIMUM','Final · Evolution {n}','Every Level, a fresh build. Choose perks through Evolution.','Try again','Level complete','Boss guide. No movement required: aim and shoot incoming threats.','Gold','Language','Current Level','Play a Level to submit your score.'],
        fr: ['Jouer','Améliorer','Encyclopedias','Réglages','Dégâts de base','Cadence de tir','Chance critique','Automatisation','Améliorations permanentes avec de l’or. Chaque niveau commence sans atout.','Améliorer','MAXIMUM','Final · Evolution {n}','Un nouveau build par niveau. Choisissez vos atouts avec Evolution.','Réessayer','Niveau terminé','Guide des boss. Visez et détruisez les menaces sans vous déplacer.','Or','Langue','Niveau actuel','Jouez un niveau pour enregistrer votre score.'],
        es: ['Jugar','Mejoras','Enciclopedia','Ajustes','Daño base','Cadencia','Probabilidad crítica','Automatización','Mejoras permanentes con oro. Cada nivel comienza sin ventajas.','Mejorar','MÁXIMO','Final · Evolution {n}','Un nuevo build por nivel. Elige ventajas con Evolution.','Reintentar','Nivel completado','Guía de jefes. Apunta y destruye las amenazas sin moverte.','Oro','Idioma','Nivel actual','Juega un nivel para guardar tu puntuación.'],
        de: ['Spielen','Upgrades','Enzyklopädie','Optionen','Basisschaden','Feuerrate','Kritische Chance','Automatisierung','Dauerhafte Upgrades mit Gold. Jedes Level beginnt ohne Perks.','Verbessern','MAXIMUM','Final · Evolution {n}','Jedes Level ein neuer Build. Wähle Perks durch Evolution.','Erneut spielen','Level geschafft','Boss-Handbuch. Ziele und zerstöre Bedrohungen ohne Bewegung.','Gold','Sprache','Aktuelles Level','Spiele ein Level, um deinen Punktestand zu speichern.'],
        it: ['Gioca','Potenziamenti','Enciclopedia','Impostazioni','Danno base','Cadenza di fuoco','Probabilità critica','Automazione','Potenziamenti permanenti con oro. Ogni livello inizia senza vantaggi.','Potenzia','MASSIMO','Finale · Evolution {n}','Un nuovo build per livello. Scegli vantaggi tramite Evolution.','Riprova','Livello completato','Guida ai boss. Mira e distruggi le minacce senza muoverti.','Oro','Lingua','Livello attuale','Gioca un livello per salvare il punteggio.']
    };
    for (const [lang, values] of Object.entries(rows)) keys.forEach((key, i) => Localization.translations[lang][key] = values[i]);
    for (const lang of Object.keys(rows)) { Localization.translations[lang].level = 'Evolution'; Localization.translations[lang].level_up = 'EVOLUTION'; }
    for (const [lang, label] of Object.entries({tr:'Sıralama',en:'Ranking',fr:'Classement',es:'Ranking',de:'Rangliste',it:'Classifica'})) Localization.translations[lang].hub_ranking = label;
    for (const [lang, label] of Object.entries({tr:'TEKRAR OYNA',en:'REPLAY',fr:'REJOUER',es:'REPETIR',de:'ERNEUT SPIELEN',it:'RIGIOCA'})) Localization.translations[lang].hub_replay = label;
    const t = (key, params) => Localization.t(key, params);
    const icons = {
        play: '<path d="m9 5 11 7-11 7Z"/>',
        meta: '<path d="M12 3v18M5 8l7-5 7 5M5 16l7 5 7-5"/>',
        armory: '<path d="m12 3 8 17-8-4-8 4Z"/>',
        leaderboard: '<path d="M4 20V12h4v8m2 0V4h4v16m2 0V8h4v12"/>',
        archive: '<path d="M4 4h7l1 2 1-2h7v16h-7l-1 1-1-1H4Z"/>'
    };
    const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">${icons[name]}</svg>`;
    const root = document.createElement('div'); root.id = 'hub-chrome';
    root.innerHTML = `<header id="hub-header"><button id="hub-settings" aria-label="${t('hub_settings')}">⚙</button><span class="hub-brand">NEON BLAST</span><span class="hub-wallet"></span></header><nav id="hub-nav" aria-label="Main hub">${[['armory','armory_btn'],['meta','hub_meta'],['play','hub_play'],['leaderboard','hub_ranking'],['archive','hub_archive']].map(([id, label]) => `<button data-hub-tab="${id}">${icon(id)}<span data-i18n="${label}"></span></button>`).join('')}</nav>`;
    document.body.appendChild(root);
    const panel = document.createElement('section'); panel.id = 'hub-panel'; panel.className = 'hidden'; document.body.appendChild(panel);
    const start = document.querySelector('#start-screen .start-layout');
    const brief = document.createElement('div'); brief.id = 'hub-level-brief'; document.getElementById('start-btn').before(brief);
    const recap = document.createElement('section'); recap.id = 'hub-recap'; recap.className = 'hidden';
    recap.innerHTML = '<h2></h2><p></p><div id="hub-recap-actions"></div>';
    start.appendChild(recap);
    for (const id of ['game-over-coins','double-coins-btn','double-coins-hint']) document.getElementById('hub-recap-actions').appendChild(document.getElementById(id));
    const submission = document.createElement('div'); submission.id = 'hub-score-submission';
    const lb = document.querySelector('#leaderboard-screen .leaderboard-layout');
    submission.innerHTML = '<p data-i18n="hub_no_score"></p>';
    for (const id of ['player-name-input','submit-score-btn']) submission.appendChild(document.getElementById(id));
    lb.insertBefore(submission, lb.querySelector('.leaderboard-filters'));
    let tab = 'play', result = null;
    const bosses = () => [boss,boss2,boss4,boss5,boss6,boss7,boss8,boss9,boss10,boss11];
    window.MainHub = {
        getTab() { return tab; },
        hide() {
            document.body.classList.remove('hub-open');
            window.LevelWin?.hide();
            window.LevelLose?.hide();
            for (const id of ['hub-panel','hub-chrome','hub-recap','start-screen','armory-modal','leaderboard-screen','player-options-modal']) document.getElementById(id).classList.add('hidden');
            ArmoryUI.stopAnimationLoop();
            result = null;
        },
        show(summary) {
            window.LevelLose?.hide();
            if (summary) result = summary;
            gameOverScreen.classList.add('hidden'); document.getElementById('pause-menu').classList.add('hidden');
            levelUpScreen.classList.add('hidden'); document.getElementById('revive-modal').classList.add('hidden');
            document.getElementById('ui-layer').style.filter = 'none';
            document.getElementById('boss-hud').style.display = 'none';
            clearInterval(gameState.spawnInterval); cancelAnimationFrame(gameState.animationId);
            document.body.classList.add('hub-open'); root.classList.remove('hidden');
            musicManager.stop(); this.select('play');
            LevelProgress.updateLabel();
        },
        select(next) {
            if (gameState.gameActive || ArmoryUI.isOpeningPack || window.AdManager?.isAdPlaying) return;
            if (tab === 'armory' && next !== 'armory') ArmoryUI.closeArmory();
            tab = next; document.body.dataset.hubTab = tab;
            startScreen.classList.toggle('hidden', tab !== 'play');
            document.getElementById('leaderboard-screen').classList.toggle('hidden', tab !== 'leaderboard');
            panel.classList.toggle('hidden', !['meta','archive'].includes(tab));
            if (tab === 'armory') ArmoryUI.openArmory();
            if (tab === 'leaderboard') document.getElementById('leaderboard-btn').click();
            this.render();
        },
        render() {
            const state = LevelProgress.getState(), config = LEVELS[state.index];
            document.querySelector('.hub-wallet').textContent = `${CosmeticsManager.coins.toLocaleString()} ${t('hub_gold')}`;
            document.getElementById('hub-settings').setAttribute('aria-label', t('hub_settings'));
            brief.innerHTML = `<span>${t('hub_current')} · ${state.index + 1} / ${LEVELS.length}</span><strong>${bosses().find(b => b.campaignBossId === config.mainBoss)?.name || ({1:boss,2:boss2,4:boss4,5:boss5,6:boss6,7:boss7,8:boss8,9:boss9,10:boss10,11:boss11})[config.mainBoss].name}</strong><small>${t('hub_target', { n: config.bossAtEvolution })} · ${LevelDirector.reward(state.index)} ${t('hub_gold')}</small><small class="hub-fresh-note">${t('hub_fresh')}</small>`;
            for (const button of root.querySelectorAll('[data-hub-tab]')) {
                const active = button.dataset.hubTab === tab;
                button.setAttribute('aria-current', active ? 'page' : 'false');
                button.querySelector('span').textContent = t(button.querySelector('span').dataset.i18n);
            }
            recap.classList.toggle('hidden', !result);
            if (result) {
                recap.querySelector('h2').textContent = t(result.won ? 'hub_won' : 'hub_failed');
                recap.querySelector('p').textContent = `EVOLUTION ${result.evolution} · +${result.gold} ${t('hub_gold')}`;
            }
            submission.querySelector('p').classList.toggle('hidden', Number.isFinite(window.lastGameScore));
            for (const id of ['player-name-input','submit-score-btn']) document.getElementById(id).style.display = Number.isFinite(window.lastGameScore) ? '' : 'none';
            if (tab === 'meta') {
                const ranks = MetaProgress.ranks();
                panel.innerHTML = `<div class="hub-panel-inner"><p class="hub-eyebrow">NEON LAB</p><h1>${t('hub_meta')}</h1><p class="hub-description">${t('hub_meta_note')}</p><div class="meta-grid">${Object.entries(MetaProgress.definitions).map(([id, def]) => {
                    const rank = ranks[id], cost = MetaProgress.cost(id), max = rank >= def.max;
                    const bonus = Number((rank * def.step * 100).toFixed(1)), next = Number(((rank + 1) * def.step * 100).toFixed(1));
                    return `<article class="meta-card meta-${id}"><span class="meta-symbol">${{damage:'✧',speed:'»',critical:'◎',automation:'⌬'}[id]}</span><div><h2>${t('hub_' + id)}</h2><span class="meta-rank">${rank} / ${def.max}</span></div><strong>+${bonus}${'%'}</strong><small>${max ? t('hub_max') : `→ +${next}${'%'}`}</small><div class="meta-track"><i style="width:${rank / def.max * 100}%"></i></div><button data-meta-buy="${id}" ${max || CosmeticsManager.coins < cost || gameState.gameActive ? 'disabled' : ''}>${max ? t('hub_max') : `${t('hub_upgrade')} · ${cost} ${t('hub_gold')}`}</button></article>`;
                }).join('')}</div></div>`;
                for (const button of panel.querySelectorAll('[data-meta-buy]')) button.onclick = () => MetaProgress.buy(button.dataset.metaBuy);
            } else if (tab === 'archive') {
                Encyclopedia.render(panel);
            }
        }
    };
    for (const button of root.querySelectorAll('[data-hub-tab]')) button.onclick = () => { MenuAudio.play('click'); MainHub.select(button.dataset.hubTab); };
    document.getElementById('hub-settings').onclick = () => PlayerOptions.open();
    document.getElementById('close-armory-btn').addEventListener('click', () => { if (!ArmoryUI.isOpeningPack && !window.AdManager?.isAdPlaying) MainHub.select('play'); });
    document.getElementById('close-leaderboard-btn').addEventListener('click', () => MainHub.select('play'));
    // Use one language control in Settings. Existing language shortcuts disappear.
    for (const bar of document.querySelectorAll('.lang-selector, .menu-languages')) bar.remove();
    const options = document.querySelector('.player-options-card');
    const language = document.createElement('label'); language.className = 'settings-language';
    language.innerHTML = `<span data-i18n="hub_language">${t('hub_language')}</span><select id="settings-language" aria-label="${t('hub_language')}">${[['tr','Türkçe'],['en','English'],['fr','Français'],['es','Español'],['de','Deutsch'],['it','Italiano']].map(([id,label])=>`<option value="${id}">${label}</option>`).join('')}</select>`;
    options.querySelector('h2').after(language);
    language.querySelector('select').onchange = event => Localization.setLanguage(event.target.value);
    for (const [id, key] of [['music-toggle','music'],['music-volume','music_volume'],['screenshake-toggle','screen_shake'],['joystick-toggle','joystick']]) {
        const original = document.getElementById(id), row = document.createElement('label');
        const clone = original.cloneNode(); clone.id = 'settings-' + id;
        row.innerHTML = `<span data-i18n="${key}">${t(key)}</span>`; row.appendChild(clone); language.after(row);
        clone.addEventListener(original.type === 'range' ? 'input' : 'change', () => {
            if (original.type === 'range') original.value = clone.value; else original.checked = clone.checked;
            original.dispatchEvent(new Event(original.type === 'range' ? 'input' : 'change', { bubbles: true }));
            if (original.type === 'range') original.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }
    const oldOpen = PlayerOptions.open.bind(PlayerOptions);
    PlayerOptions.open = () => {
        document.getElementById('settings-language').value = Localization.currentLang;
        for (const id of ['music-toggle','music-volume','screenshake-toggle','joystick-toggle']) {
            const original = document.getElementById(id), clone = document.getElementById('settings-' + id);
            clone.value = original.value; clone.checked = original.checked;
        }
        oldOpen();
    };
    for (const [lang, label] of Object.entries({tr:'ANA MENÜ',en:'MAIN HUB',fr:'ACCUEIL',es:'MENÚ PRINCIPAL',de:'HAUPTMENÜ',it:'MENU PRINCIPALE'})) Localization.translations[lang].hub_return = label;
    const pauseHub = document.createElement('button'); pauseHub.className = 'main-btn'; pauseHub.dataset.i18n = 'hub_return'; pauseHub.textContent = t('hub_return'); pauseHub.onclick = () => LevelProgress.mainMenu(); document.getElementById('resume-btn').after(pauseHub);
    const title = document.getElementById('player-options-title'); title.dataset.i18n = 'hub_settings';
    const previousLanguage = window.updateUIForLanguage;
    window.updateUIForLanguage = () => { previousLanguage?.(); MainHub.render(); };
    // Currency changes from rewarded ads, packs and IAP refresh the hub too.
    const oldUpdate = CosmeticsManager.updateUI.bind(CosmeticsManager);
    CosmeticsManager.updateUI = () => { oldUpdate(); MainHub.render(); };
    document.addEventListener('DOMContentLoaded', () => {
        if (gameState.gameActive) { MainHub.hide(); return; }
        document.body.classList.add('hub-open'); MainHub.render();
    });
})();
