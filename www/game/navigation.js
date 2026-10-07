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
        if (window.loadLeaderboard) window.loadLeaderboard(timeframe);
        else offline();
    };
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
        if (event.key !== 'Escape' || AdManager.isAdPlaying) return;
        const visible = ['pack-opening-modal', 'armory-modal', 'daily-reward-modal', 'lucky-spin-modal', 'quest-panel-modal', 'leaderboard-screen']
            .map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden'));
        if (!visible) return;
        event.stopImmediatePropagation();
        if (visible.id === 'pack-opening-modal') document.getElementById('reveal-close-btn')?.click();
        else if (visible.id === 'armory-modal') ArmoryUI.closeArmory();
        else visible.classList.add('hidden');
    }, true);
})();
