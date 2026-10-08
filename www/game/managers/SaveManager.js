// SaveManager.js - Handles Saving and Loading Game State

class SaveManager {
    static SAVE_KEY = 'neonblast_save_data_v1';

    static saveGame() {
        if (!gameState.gameActive) return; // A paused results screen must never become a resumable run.

        const data = {
            score: gameState.score,
            level: gameState.level,
            nextLevelThreshold: gameState.nextLevelThreshold,
            previousLevelThreshold: gameState.previousLevelThreshold,
            currentLevelStep: gameState.currentLevelStep,
            difficultyMultiplier: gameState.difficultyMultiplier,
            playerStats: gameState.playerStats,
            takenPerks: gameState.takenPerks,
            hasRevivedThisRun: !!gameState.hasRevivedThisRun,
            activeRunMs: gameState.activeRunMs || 0,
            totalEnemiesKilled: gameState.totalEnemiesKilled || 0,
            totalBossesKilled: gameState.totalBossesKilled || 0,

            // Save Boss State if active
            bossActive: gameState.bossActive,
            // We might need more complex logic for bosses, but for now let's save basic state
            // If a boss is active, we might just want to restart the boss fight or save its HP?
            // For simplicity in V1: If boss is active, we save the state BEFORE the boss fight starts?
            // Actually, the user wants "continue where left off".
            // Saving exact boss state is complex (minions, phases, etc).
            // Strategy: If boss is active, save that we are in a boss fight, and maybe current boss ID if possible?
            // For now, let's stick to player stats and level progression. 
            // If the player quits during a boss, they might restart the boss or the level segment.
            // Let's rely on level/difficultyMultiplier to respawn things.

            timestamp: Date.now()
        };

        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(this.SAVE_KEY, serialized);
            console.log('Game Saved', data);

            // Visual feedback (optional)
            if (window.showSaveIcon) window.showSaveIcon();
        } catch (e) {
            console.error('Failed to save game:', e);
        }
    }

    static loadGame() {
        try {
            const serialized = localStorage.getItem(this.SAVE_KEY);
            if (!serialized) return null;

            const data = JSON.parse(serialized);
            if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
            for (const key of ['score', 'level', 'nextLevelThreshold', 'previousLevelThreshold', 'currentLevelStep', 'difficultyMultiplier']) {
                if (!Number.isFinite(data[key]) || data[key] < 0) return null;
            }
            if (data.level < 1 || data.currentLevelStep <= 0 || data.nextLevelThreshold <= data.previousLevelThreshold) return null;
            if (!data.playerStats || typeof data.playerStats !== 'object' || Array.isArray(data.playerStats)) return null;
            // Preserve the v1 format and valid legacy stats; reject corrupt numeric stats.
            if (Object.values(data.playerStats).some(value => typeof value === 'number' && !Number.isFinite(value))) return null;
            if (typeof DEFAULT_PLAYER_STATS !== 'undefined') {
                for (const [key, value] of Object.entries(DEFAULT_PLAYER_STATS)) {
                    if (typeof value === 'number' && key in data.playerStats && !Number.isFinite(data.playerStats[key])) data.playerStats[key] = value;
                }
            }
            data.takenPerks = Array.isArray(data.takenPerks) ? data.takenPerks.filter(id => typeof id === 'string') : [];
            for (const key of ['activeRunMs', 'totalEnemiesKilled', 'totalBossesKilled']) {
                data[key] = Number.isFinite(data[key]) && data[key] >= 0 ? data[key] : 0;
            }
            console.log('Game Loaded', data);
            return data;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    static clearSave() {
        try { localStorage.removeItem(this.SAVE_KEY); } catch (e) { console.warn('Save removal unavailable:', e); }
        console.log('Save Data Cleared');
    }

    static hasSave() {
        return !!this.loadGame();
    }
}

// Global Export
window.SaveManager = SaveManager;
