// QuestManager.js - Daily Quest System
// 3 daily quests that reset every 24h, driving engagement + ad views

class QuestManager {
    static STORAGE_KEY = 'neonblast_quests_v1';

    // Quest templates pool
    static QUEST_TEMPLATES = [
        { id: 'play_games',    title: '🎮 {n} Oyun Oyna',         type: 'games_played',    targets: [3, 5, 7],    reward: [80, 120, 150] },
        { id: 'reach_level',   title: '🏆 Level {n}\'e Ulaş',     type: 'max_level',       targets: [10, 15, 20, 25], reward: [100, 150, 200, 250] },
        { id: 'kill_enemies',  title: '💀 {n} Düşman Öldür',      type: 'enemies_killed',  targets: [100, 200, 500],  reward: [80, 130, 200] },
        { id: 'kill_boss',     title: '👹 {n} Boss Öldür',        type: 'bosses_killed',   targets: [1, 2, 3],    reward: [150, 250, 350] },
        { id: 'earn_coins',    title: '💰 {n} Coin Kazan',        type: 'coins_earned',    targets: [200, 400, 600],  reward: [80, 120, 180] },
        { id: 'use_perks',     title: '⚡ {n} Perk Seç',          type: 'perks_selected',  targets: [5, 10, 15],  reward: [60, 100, 150] },
        { id: 'survive_min',   title: '⏱️ {n} Dakika Hayatta Kal', type: 'survive_seconds', targets: [120, 300, 600], reward: [100, 180, 280] },
    ];

    static state = {
        lastResetDate: null,
        quests: [],        // Current active quests [{templateId, targetValue, reward, progress, completed}]
        allCompleted: false,
        bonusClaimed: false
    };

    // Session trackers (reset each game)
    static session = {
        gamesPlayed: 0,
        maxLevel: 0,
        enemiesKilled: 0,
        bossesKilled: 0,
        coinsEarned: 0,
        perksSelected: 0,
        surviveSeconds: 0,
        gameStartTime: 0
    };

    static init() {
        this.load();
        if (this.shouldReset()) {
            this.generateDailyQuests();
        }
    }

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
        } catch (e) { console.error('QuestManager load:', e); }
    }

    static save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) { console.error('QuestManager save:', e); }
    }

    static getTodayStr() {
        return new Date().toISOString().split('T')[0];
    }

    static shouldReset() {
        return this.state.lastResetDate !== this.getTodayStr();
    }

    static generateDailyQuests() {
        // Pick 3 unique quest types
        const shuffled = [...this.QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, 3);

        this.state.quests = picked.map(template => {
            const diffIdx = Math.floor(Math.random() * template.targets.length);
            return {
                templateId: template.id,
                type: template.type,
                title: template.title.replace('{n}', template.targets[diffIdx]),
                targetValue: template.targets[diffIdx],
                reward: template.reward[diffIdx],
                progress: 0,
                completed: false
            };
        });

        this.state.lastResetDate = this.getTodayStr();
        this.state.allCompleted = false;
        this.state.bonusClaimed = false;
        this.save();
    }

    // Called from game events
    static trackEvent(type, value = 1) {
        if (!this.state.quests || this.state.quests.length === 0) return;

        let changed = false;
        this.state.quests.forEach(quest => {
            if (quest.completed) return;
            if (quest.type !== type) return;

            if (type === 'max_level') {
                quest.progress = Math.max(quest.progress, value);
            } else if (type === 'survive_seconds') {
                quest.progress = Math.max(quest.progress, value);
            } else {
                quest.progress += value;
            }

            if (quest.progress >= quest.targetValue && !quest.completed) {
                quest.completed = true;
                // Auto-grant reward
                if (typeof CosmeticsManager !== 'undefined') {
                    CosmeticsManager.addCoins(quest.reward);
                }
                if (typeof playSound === 'function') playSound('levelup');
                changed = true;
            }
        });

        // Check if all 3 completed
        if (this.state.quests.every(q => q.completed) && !this.state.allCompleted) {
            this.state.allCompleted = true;
            changed = true;
        }

        if (changed) this.save();
    }

    // Called when a game starts
    static onGameStart() {
        this.session.gameStartTime = Date.now();
    }

    // Called when a game ends
    static onGameEnd(level, enemiesKilled, bossesKilled, coinsEarned, perksCount) {
        this.trackEvent('games_played', 1);
        this.trackEvent('max_level', level);
        this.trackEvent('enemies_killed', enemiesKilled);
        this.trackEvent('bosses_killed', bossesKilled);
        this.trackEvent('coins_earned', coinsEarned);
        this.trackEvent('perks_selected', perksCount);

        if (this.session.gameStartTime > 0) {
            const seconds = Math.floor((Date.now() - this.session.gameStartTime) / 1000);
            this.trackEvent('survive_seconds', seconds);
        }
    }

    // UI Rendering
    static renderQuestPanel() {
        const container = document.getElementById('quest-panel-content');
        if (!container) return;

        if (!this.state.quests || this.state.quests.length === 0) {
            container.innerHTML = '<p class="quest-empty">Görevler yükleniyor...</p>';
            return;
        }

        let html = '';
        this.state.quests.forEach((quest, i) => {
            const pct = Math.min(100, Math.floor((quest.progress / quest.targetValue) * 100));
            const statusClass = quest.completed ? 'quest-done' : '';

            html += `
                <div class="quest-row ${statusClass}">
                    <div class="quest-info">
                        <span class="quest-title">${quest.title}</span>
                        <div class="quest-progress-bar">
                            <div class="quest-progress-fill" style="width:${pct}%"></div>
                        </div>
                        <span class="quest-progress-text">${Math.min(quest.progress, quest.targetValue)} / ${quest.targetValue}</span>
                    </div>
                    <div class="quest-reward">
                        ${quest.completed ? '✅' : `+${quest.reward} 🪙`}
                    </div>
                </div>
            `;
        });

        // Bonus for completing all 3
        if (this.state.allCompleted && !this.state.bonusClaimed) {
            html += `
                <div class="quest-bonus-row">
                    <span>🎯 TÜM GÖREVLER TAMAMLANDI!</span>
                    <button class="main-btn quest-bonus-btn" id="quest-bonus-claim">
                        BONUS SANDIK AL (REKLAM)
                    </button>
                </div>
            `;
        } else if (this.state.bonusClaimed) {
            html += `
                <div class="quest-bonus-row claimed">
                    <span>🎯 BONUS ALINDI ✅</span>
                </div>
            `;
        }

        container.innerHTML = html;

        // Bind bonus button
        const bonusBtn = document.getElementById('quest-bonus-claim');
        if (bonusBtn) {
            bonusBtn.addEventListener('click', () => {
                if (typeof AdManager !== 'undefined') {
                    AdManager.showRewardedAd({
                        rewardType: 'QUEST_BONUS',
                        onSuccess: () => {
                            this.state.bonusClaimed = true;
                            this.save();
                            // Give a free crate
                            if (typeof CosmeticsManager !== 'undefined') {
                                CosmeticsManager.addCoins(400);
                            }
                            if (typeof playSound === 'function') playSound('levelup');
                            this.renderQuestPanel();
                        }
                    });
                }
            });
        }
    }
}

window.QuestManager = QuestManager;
