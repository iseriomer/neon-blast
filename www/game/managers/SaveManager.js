// SaveManager.js - Handles Saving and Loading Game State

class SaveManager {
    static SAVE_KEY = 'neonblast_save_data_v1';

    static saveGame() {
        if (!gameState.gameActive && !gameState.isPaused) return; // Don't save if game over or not started

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
            console.log('Game Loaded', data);
            return data;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    static clearSave() {
        localStorage.removeItem(this.SAVE_KEY);
        console.log('Save Data Cleared');
    }

    static hasSave() {
        return !!localStorage.getItem(this.SAVE_KEY);
    }
}

// Global Export
window.SaveManager = SaveManager;
