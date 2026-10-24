// Menu controls remain usable even when the remote leaderboard SDK is offline.
(() => {
    const screen = document.getElementById('leaderboard-screen');
    const offline = () => {
        for (const id of ['main-leaderboard-list', 'leaderboard-list']) {
            const list = document.getElementById(id);
            if (list) {
                list.replaceChildren();
                const row = document.createElement('li');
                row.textContent = Localization.t('lb_connection_error');
                list.appendChild(row);
            }
        }
    };
    const load = timeframe => {
        for (const [filter, value] of [['all','all'], ['monthly','monthly'], ['weekly','weekly']]) {
            for (const suffix of ['', '-go']) {
                document.getElementById(`lb-filter-${filter}${suffix}`)?.classList.toggle('active', value === timeframe);
            }
        }
        if (window.loadLeaderboard) window.loadLeaderboard(timeframe);
        else offline();
    };
    window.refreshMenuLeaderboard = () => load('all');
    document.getElementById('leaderboard-btn').addEventListener('click', () => {
        screen.classList.remove('hidden');
        screen.style.display = 'flex';
        load('all');
    });
    document.getElementById('close-leaderboard-btn').addEventListener('click', () => screen.classList.add('hidden'));
    for (const [filter, timeframe] of [['all', 'all'], ['monthly', 'monthly'], ['weekly', 'weekly']]) {
        for (const suffix of ['', '-go']) {
            document.getElementById(`lb-filter-${filter}${suffix}`)?.addEventListener('click', () => load(timeframe));
        }
    }
    document.getElementById('submit-score-btn').addEventListener('click', () => {
        if (!window.fetchLeaderboard) ArmoryUI.showToast(Localization.t('lb_connection_error'), false);
    });
    window.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || window.AdManager?.isAdPlaying) return;
        if (document.body.classList.contains('win-open') || document.body.classList.contains('lose-open')) return;
        const visible = ['player-options-modal', 'pack-opening-modal', 'daily-reward-modal', 'lucky-spin-modal', 'quest-panel-modal', 'armory-modal', 'leaderboard-screen']
            .map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
        if (!visible) {
            if (document.body.classList.contains('hub-open') && window.MainHub && MainHub.getTab() !== 'play') MainHub.select('play');
            return;
        }
        event.stopImmediatePropagation();
        if (visible.id === 'player-options-modal') PlayerOptions.close();
        else if (visible.id === 'pack-opening-modal') document.getElementById('reveal-close-btn')?.click();
        else if (visible.id === 'armory-modal') { ArmoryUI.closeArmory(); window.MainHub?.select('play'); }
        else if (visible.id === 'leaderboard-screen' && window.MainHub) MainHub.select('play');
        else visible.classList.add('hidden');
    }, true);
})();
