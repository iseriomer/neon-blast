(() => {
    const keys = ['lose_title','lose_retry','lose_menu','lose_note'];
    const rows = {
        tr: ['KAYBETTİN','TEKRAR DENE','ANA MENÜ','Aynı Level, yeni build. Kalıcı gelişimlerin seninle.'],
        en: ['DEFEAT','RETRY','MAIN MENU','Same Level, fresh build. Your permanent upgrades stay.'],
        fr: ['DÉFAITE','RÉESSAYER','MENU PRINCIPAL','Même niveau, nouveau build. Améliorations conservées.'],
        es: ['DERROTA','REINTENTAR','MENÚ PRINCIPAL','Mismo nivel, nuevo build. Conservas las mejoras.'],
        de: ['NIEDERLAGE','ERNEUT VERSUCHEN','HAUPTMENÜ','Gleiches Level, neuer Build. Deine Upgrades bleiben.'],
        it: ['SCONFITTA','RIPROVA','MENU PRINCIPALE','Stesso livello, nuovo build. Potenziamenti conservati.']
    };
    for (const [lang, values] of Object.entries(rows)) keys.forEach((key,i)=>Localization.translations[lang][key]=values[i]);
    const screen = document.createElement('section');
    screen.id = 'level-lose-screen'; screen.className = 'hidden';
    screen.setAttribute('role','dialog'); screen.setAttribute('aria-modal','true'); screen.setAttribute('aria-labelledby','lose-title');
    screen.innerHTML = '<div class="win-layout lose-layout"><div class="win-mark" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M32 6 58 32 32 58 6 32Z M23 23l18 18 M41 23 23 41" stroke="currentColor" stroke-width="2"/></svg></div><p id="lose-level"></p><h1 id="lose-title"></h1><strong id="lose-boss"></strong><p id="lose-evolution"></p><p id="lose-note"></p><button id="lose-retry-btn"></button><button id="lose-menu-btn"></button></div>';
    document.body.appendChild(screen);
    let result = null;
    const entities = {1:boss,2:boss2,4:boss4,5:boss5,6:boss6,7:boss7,8:boss8,9:boss9,10:boss10,11:boss11};
    window.LevelLose = {
        show() {
            MainHub.hide();
            result = { index:LevelProgress.getState().index, evolution:gameState.level };
            for (const id of ['pause-menu','levelup-screen','revive-modal','game-over-screen']) document.getElementById(id).classList.add('hidden');
            document.getElementById('boss-hud').style.display = 'none';
            document.getElementById('ui-layer').style.filter = 'none';
            cancelAnimationFrame(gameState.animationId); musicManager.stop();
            document.body.classList.add('lose-open'); screen.classList.remove('hidden');
            this.render(); document.getElementById('lose-retry-btn').focus({preventScroll:true});
        },
        hide() { screen.classList.add('hidden'); document.body.classList.remove('lose-open'); result = null; },
        render() {
            if (!result) return;
            document.getElementById('lose-level').textContent = `LEVEL ${result.index+1} / ${LEVELS.length}`;
            document.getElementById('lose-title').textContent = Localization.t('lose_title');
            document.getElementById('lose-boss').textContent = entities[LEVELS[result.index].mainBoss].name;
            document.getElementById('lose-evolution').textContent = `EVOLUTION ${result.evolution}`;
            document.getElementById('lose-note').textContent = Localization.t('lose_note');
            document.getElementById('lose-retry-btn').textContent = Localization.t('lose_retry');
            document.getElementById('lose-menu-btn').textContent = Localization.t('lose_menu');
        },
        menu() { if (window.AdManager?.isAdPlaying) return; this.hide(); MainHub.show(); document.getElementById('start-btn').focus({preventScroll:true}); }
    };
    document.getElementById('lose-retry-btn').onclick = () => {
        if (window.AdManager?.isAdPlaying) return;
        LevelLose.hide(); document.getElementById('start-btn').click();
    };
    document.getElementById('lose-menu-btn').onclick = () => LevelLose.menu();
    screen.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); LevelLose.menu(); }
        if (event.key === 'Tab') {
            const first = document.getElementById('lose-retry-btn'), last = document.getElementById('lose-menu-btn');
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
    });
    const previousLanguage = window.updateUIForLanguage;
    window.updateUIForLanguage = () => { previousLanguage?.(); LevelLose.render(); };
})();
