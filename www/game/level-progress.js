// Persistent campaign index; combat builds belong to one Level only.
(() => {
    const key = 'neonblast_level_progress_v2', journal = 'neonblast_level_reward_v2';
    let state = { index: 0, phase: 'playing', completedIndex: -1, reward: 0 };
    try {
        const pending = JSON.parse(localStorage.getItem(journal));
        if (pending && pending.state && Number.isFinite(pending.coins)) {
            localStorage.setItem(CosmeticsManager.COINS_KEY, String(pending.coins));
            localStorage.setItem(key, JSON.stringify(pending.state));
            localStorage.removeItem(SaveManager.SAVE_KEY);
            CosmeticsManager.coins = pending.coins;
            localStorage.removeItem(journal);
        }
        const saved = JSON.parse(localStorage.getItem(key) || localStorage.getItem('neonblast_level_progress_v1'));
        if (saved && Number.isInteger(saved.index) && saved.index >= 0 && saved.index < LEVELS.length) {
            state.index = saved.index;
            if (localStorage.getItem(key)) state = { ...state, ...saved };
        }
    } catch (_) {}
    const persist = () => localStorage.setItem(key, JSON.stringify(state));
    const fought = new Set();
    function updateLabel() {
        const button = document.getElementById('start-btn');
        delete button.dataset.i18n; delete button.dataset.i18nParams;
        const resume = SaveManager.hasSave();
        const prefix = resume ? Localization.t('continue_saved') : state.completedIndex === LEVELS.length - 1 ? Localization.t('hub_replay') : '';
        const text = `${prefix ? prefix + ' · ' : ''}LEVEL ${state.index + 1}`;
        button.dataset.originalText = text; button.textContent = text;
        window.MainHub?.render();
    }
    window.LevelProgress = {
        getState() { return { ...state }; },
        saveMeta() { return { ...state, version: 2, fought: [...fought] }; },
        checkpointJson() { return null; },
        begin() {
            state.phase = 'playing'; state.reward = 0; fought.clear();
            MetaProgress.apply(gameState.playerStats);
            gameState.difficultyMultiplier = LevelDirector.difficulty();
            persist(); updateLevelIndicator(gameState.level); window.MainHub?.hide();
        },
        restore(save) {
            const meta = save.levelProgress;
            if (meta?.version === 2 && Number.isInteger(meta.index) && meta.index >= 0 && meta.index < LEVELS.length) state.index = meta.index;
            state.phase = 'playing'; fought.clear();
            if (meta?.version === 2 && Array.isArray(meta.fought)) meta.fought.forEach(value => fought.add(value));
            gameState.difficultyMultiplier = LevelDirector.difficulty();
            persist(); window.MainHub?.hide();
            if (save.bossActive) {
                const config = LevelDirector.config();
                const mini = config.minibosses.find(item => item.atEvolution === gameState.level);
                // Old saves predate balance snapshots and used earlier first-Level encounters.
                const legacyBossAt = state.index === 0 ? 7 : state.index === 1 ? 12 : config.bossAtEvolution;
                const legacyMini = state.index < 2 && gameState.level < legacyBossAt ? 101 : null;
                const savedId = save.encounterBossId;
                const allowedIds = [config.mainBoss, ...config.minibosses.map(item => item.id)];
                const id = allowedIds.includes(savedId) ? savedId
                    : !save.balance ? (legacyMini ?? mini?.id ?? config.mainBoss) : (mini?.id ?? config.mainBoss);
                BossManager.startBossFight(id);
            }
        },
        encounter(isFromBoss) {
            if (isFromBoss || gameState.bossActive) return false;
            const config = LevelDirector.config();
            const mini = config.minibosses.find(item => item.atEvolution === gameState.level && !fought.has(item.atEvolution));
            const id = gameState.level >= config.bossAtEvolution ? config.mainBoss : mini?.id;
            if (!id) return false;
            fought.add(gameState.level); BossManager.startBossFight(id); SaveManager.saveGame(); return true;
        },
        onBossDefeated(entity) {
            if (state.phase !== 'playing' || entity.campaignBossId !== LevelDirector.config().mainBoss) return false;
            const completedIndex = state.index;
            const reward = LevelDirector.reward(completedIndex) + (window.PremiumStoreManager ? PremiumStoreManager.getVipBonusCoins() : 0);
            const next = { index: Math.min(LEVELS.length - 1, completedIndex + 1), completedIndex, phase: 'won', reward };
            const coins = CosmeticsManager.coins + reward;
            // Commit the boundary and wallet together using a recoverable journal.
            localStorage.setItem(journal, JSON.stringify({ state: next, coins }));
            state = next; persist();
            localStorage.setItem(CosmeticsManager.COINS_KEY, String(coins)); CosmeticsManager.coins = coins;
            localStorage.removeItem(SaveManager.SAVE_KEY); localStorage.removeItem(journal);
            CosmeticsManager.updateUI();
            gameOver(reward); return true;
        },
        dismissWin() { if (state.phase === 'won') { state.phase = 'playing'; persist(); } },
        afterPerk() { gameState.difficultyMultiplier = LevelDirector.difficulty(); },
        onRunEnded() { persist(); updateLabel(); },
        next() { if (!gameState.gameActive) initGame(); },
        mainMenu() {
            SaveManager.saveGame(); gameState.gameActive = false; gameState.isPaused = true;
            cancelAnimationFrame(gameState.animationId); clearInterval(gameState.spawnInterval); InputManager.reset();
            window.MainHub?.show(); updateLabel();
        },
        updateLabel
    };
    const previousLanguage = window.updateUIForLanguage;
    window.updateUIForLanguage = () => { previousLanguage?.(); updateLabel(); };
    document.addEventListener('DOMContentLoaded', updateLabel);
})();
