// QuestManager.js - Daily Quest System
// 3 daily quests that reset every 24h, driving engagement + ad views

class QuestManager {
    static STORAGE_KEY = 'neonblast_quests_v1';

    // Quest templates pool
    static QUEST_TEMPLATES = [
        { id: 'play_games',    titleKey: 'quest_play_games',   title: '{n} Oyun Oyna',         iconKey: 'gamepad',   type: 'games_played',    targets: [3, 5, 7],    reward: [80, 120, 150] },
        { id: 'reach_level',   titleKey: 'quest_reach_level',  title: 'Level {n}\'e Ulaş',     iconKey: 'trophy',    type: 'max_level',       targets: [10, 15, 20, 25], reward: [100, 150, 200, 250] },
        { id: 'kill_enemies',  titleKey: 'quest_kill_enemies', title: '{n} Düşman Yok Et',      iconKey: 'skull',     type: 'enemies_killed',  targets: [100, 200, 500],  reward: [80, 130, 200] },
        { id: 'kill_boss',     titleKey: 'quest_kill_boss',    title: '{n} Boss Yok Et',        iconKey: 'boss',      type: 'bosses_killed',   targets: [1, 2, 3],    reward: [150, 250, 350] },
        { id: 'earn_coins',    titleKey: 'quest_earn_coins',   title: '{n} Coin Kazan',        iconKey: 'coin',      type: 'coins_earned',    targets: [200, 400, 600],  reward: [80, 120, 180] },
        { id: 'use_perks',     titleKey: 'quest_perks',        title: '{n} Perk Seç',          iconKey: 'lightning', type: 'perks_selected',  targets: [5, 10, 15],  reward: [60, 100, 150] },
        { id: 'survive_min',   titleKey: 'quest_survive',      title: '{n} Saniye Hayatta Kal', iconKey: 'timer',     type: 'survive_seconds', targets: [120, 300, 600], reward: [100, 180, 280] },
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
                iconKey: template.iconKey,
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

        const t = (key, params) => typeof Localization !== 'undefined' ? Localization.t(key, params) : key;

        if (!this.state.quests || this.state.quests.length === 0) {
            container.innerHTML = `<p class="quest-empty">${t('quests_loading')}</p>`;
            return;
        }

        let html = '';
        const getIcon = (key, size = 20) => typeof IconSystem !== 'undefined' ? IconSystem.get(key, { size }) : '';

        this.state.quests.forEach((quest, i) => {
            const pct = Math.min(100, Math.floor((quest.progress / quest.targetValue) * 100));
            const statusClass = quest.completed ? 'quest-done' : '';
            const questIconSvg = getIcon(quest.iconKey || 'quests', 22);
            const rewardIconSvg = quest.completed
                ? getIcon('check', 18)
                : `<span class="quest-coin-badge">${getIcon('coin', 16)} <strong>+${quest.reward}</strong></span>`;

            const displayTitle = quest.titleKey ? t(quest.titleKey, { n: quest.targetValue }) : quest.title;

            html += `
                <div class="quest-row ${statusClass}">
                    <div class="quest-icon-wrap">
                        ${questIconSvg}
                    </div>
                    <div class="quest-info">
                        <span class="quest-title">${displayTitle}</span>
                        <div class="quest-progress-bar">
                            <div class="quest-progress-fill" style="width:${pct}%"></div>
                        </div>
                        <span class="quest-progress-text">${Math.min(quest.progress, quest.targetValue)} / ${quest.targetValue}</span>
                    </div>
                    <div class="quest-reward">
                        ${rewardIconSvg}
                    </div>
                </div>
            `;
        });

        // Bonus for completing all 3
        if (this.state.allCompleted && !this.state.bonusClaimed) {
            html += `
                <div class="quest-bonus-row">
                    <span class="bonus-tag">${getIcon('star', 18)} ${t('all_quests_completed')}</span>
                    <button class="main-btn quest-bonus-btn" id="quest-bonus-claim">
                        ${t('quest_bonus_ad', { coins: 150 })}
                    </button>
                </div>
            `;
        } else if (this.state.bonusClaimed) {
            html += `
                <div class="quest-bonus-row claimed">
                    <span>${getIcon('check', 18)} ${t('quest_bonus_claimed')}</span>
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
