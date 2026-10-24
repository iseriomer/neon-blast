(() => {
    const keys = ['win_title','win_all','win_next','win_hub','win_replay','win_fresh'];
    const rows = {
        tr: ['LEVEL TAMAMLANDI','TÜM LEVELLAR TAMAMLANDI','SONRAKİ LEVEL','ANA MENÜ','LEVEL 10’U TEKRAR OYNA','Yeni deneme: sıfır perk, kalıcı gelişimlerin seninle.'],
        en: ['LEVEL COMPLETE','ALL LEVELS COMPLETE','NEXT LEVEL','MAIN HUB','REPLAY LEVEL 10','Fresh attempt: zero perks, permanent upgrades stay.'],
        fr: ['NIVEAU TERMINÉ','TOUS LES NIVEAUX TERMINÉS','NIVEAU SUIVANT','ACCUEIL','REJOUER LE NIVEAU 10','Nouvel essai : aucun atout, améliorations conservées.'],
        es: ['NIVEL COMPLETADO','TODOS LOS NIVELES COMPLETADOS','SIGUIENTE NIVEL','MENÚ PRINCIPAL','REPETIR NIVEL 10','Nuevo intento: sin ventajas, mejoras conservadas.'],
        de: ['LEVEL GESCHAFFT','ALLE LEVEL GESCHAFFT','NÄCHSTES LEVEL','HAUPTMENÜ','LEVEL 10 WIEDERHOLEN','Neuer Versuch: keine Perks, permanente Upgrades bleiben.'],
        it: ['LIVELLO COMPLETATO','TUTTI I LIVELLI COMPLETATI','LIVELLO SUCCESSIVO','MENU PRINCIPALE','RIGIOCA LIVELLO 10','Nuovo tentativo: zero vantaggi, potenziamenti conservati.']
    };
    for (const [lang, values] of Object.entries(rows)) keys.forEach((key,i)=>Localization.translations[lang][key]=values[i]);
    const screen = document.createElement('section');
    screen.id = 'level-win-screen'; screen.className = 'hidden';
    screen.setAttribute('role','dialog'); screen.setAttribute('aria-modal','true'); screen.setAttribute('aria-labelledby','win-title');
    screen.innerHTML = '<div class="win-layout"><div class="win-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M20 8h24v15c0 14-24 14-24 0Z M20 12H10v9c0 8 10 9 10 9 M44 12h10v9c0 8-10 9-10 9 M32 34v14 M22 54h20 M26 48h12" stroke="currentColor" stroke-width="2"/></svg></div><p id="win-level"></p><h1 id="win-title"></h1><strong id="win-boss"></strong><div id="win-reward"></div><p id="win-note"></p><button id="win-next-btn"></button><button id="win-hub-btn"></button></div>';
    document.body.appendChild(screen);
    let victory = null;
    const background = ['hub-chrome','start-screen','hub-panel','armory-modal','leaderboard-screen'];
    const entities = {1:boss,2:boss2,4:boss4,5:boss5,6:boss6,7:boss7,8:boss8,9:boss9,10:boss10,11:boss11};
    window.LevelWin = {
        show(state) {
            if (state.phase !== 'won') return;
            victory = { ...state };
            background.forEach(id => document.getElementById(id).inert = true);
            document.body.classList.add('win-open'); screen.classList.remove('hidden');
            this.render(); document.getElementById('win-next-btn').focus({preventScroll:true});
            if (window.MenuAudio) MenuAudio.play('reward');
        },
        hide() { screen.classList.add('hidden'); document.body.classList.remove('win-open'); background.forEach(id => document.getElementById(id).inert = false); victory = null; },
        render() {
            if (!victory) return;
            const index = victory.completedIndex, final = index === LEVELS.length - 1;
            document.getElementById('win-level').textContent = `LEVEL ${index + 1} / ${LEVELS.length}`;
            document.getElementById('win-title').textContent = Localization.t(final ? 'win_all' : 'win_title');
            document.getElementById('win-boss').textContent = entities[LEVELS[index].mainBoss].name;
            document.getElementById('win-reward').textContent = `+${victory.reward.toLocaleString(Localization.currentLang)} ${Localization.t('hub_gold')}`;
            document.getElementById('win-note').textContent = Localization.t('win_fresh');
            document.getElementById('win-next-btn').textContent = Localization.t(final ? 'win_replay' : 'win_next');
            document.getElementById('win-hub-btn').textContent = Localization.t('win_hub');
        },
        hub() { LevelProgress.dismissWin(); this.hide(); MainHub.show(); document.getElementById('start-btn').focus({preventScroll:true}); }
    };
    document.getElementById('win-next-btn').onclick = () => {
        if (window.AdManager?.isAdPlaying) return;
        LevelProgress.dismissWin(); LevelWin.hide(); document.getElementById('start-btn').click();
    };
    document.getElementById('win-hub-btn').onclick = () => { if (!window.AdManager?.isAdPlaying) LevelWin.hub(); };
    screen.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !window.AdManager?.isAdPlaying) { event.preventDefault(); LevelWin.hub(); }
        if (event.key === 'Tab') {
            const next = document.getElementById('win-next-btn'), hub = document.getElementById('win-hub-btn');
            if (event.shiftKey && document.activeElement === next) { event.preventDefault(); hub.focus(); }
            else if (!event.shiftKey && document.activeElement === hub) { event.preventDefault(); next.focus(); }
        }
    });
    const previousLanguage = window.updateUIForLanguage;
    window.updateUIForLanguage = () => { previousLanguage?.(); LevelWin.render(); };
    document.addEventListener('DOMContentLoaded', () => { if (!gameState.gameActive) LevelWin.show(LevelProgress.getState()); });
})();
