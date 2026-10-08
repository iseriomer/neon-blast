// DailyRewardManager.js - 7-Day Streak Login Reward System
// Drives D1/D7 retention via escalating rewards + rewarded ad multiplier

class DailyRewardManager {
    static STORAGE_KEY = 'neonblast_daily_reward_v1';
    static DAY_MS = 24 * 60 * 60 * 1000;

    // 7-Day Reward Cycle (repeats after day 7)
    static REWARDS = [
        { day: 1, coins: 50,  label: '50 Coin',        iconKey: 'coin',      special: false },
        { day: 2, coins: 100, label: '100 Coin',       iconKey: 'coin',      special: false },
        { day: 3, coins: 150, label: '150 Coin',       iconKey: 'coin_stack', special: false },
        { day: 4, coins: 200, label: '200 Coin',       iconKey: 'fire',      special: false },
        { day: 5, coins: 0,   label: 'GÜMÜŞ SANDIK',   iconKey: 'crate',     special: 'pack_alpha' },
        { day: 6, coins: 300, label: '300 Coin',       iconKey: 'lightning', special: false },
        { day: 7, coins: 0,   label: 'ALTIN SANDIK ★', iconKey: 'crown',     special: 'pack_quantum' }
    ];

    static state = {
        lastClaimDate: null,  // YYYY-MM-DD
        currentStreak: 0,
        totalLogins: 0
    };

    static init() {
        this.load();
        // First-time players reach the game before encountering a reward popup.
        if (this.state.totalLogins > 0) this.checkAndShow();
        if (!this.hasClaimedToday()) {
            const button = document.getElementById('daily-rewards-btn');
            if (button && !button.querySelector('.reward-ready-dot')) {
                const dot = document.createElement('span');
                dot.className = 'reward-ready-dot';
                dot.setAttribute('aria-hidden', 'true');
                button.appendChild(dot);
            }
        }
    }

    static load() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                this.state = { ...this.state, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.error('DailyReward load error:', e);
        }
    }

    static save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
        } catch (e) {
            console.error('DailyReward save error:', e);
        }
    }

    static getTodayStr() {
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    static hasClaimedToday() {
        return this.state.lastClaimDate === this.getTodayStr();
    }

    static checkAndShow() {
        if (this.hasClaimedToday()) return;

        // Check streak continuity
        if (this.state.lastClaimDate) {
            const lastDate = new Date(this.state.lastClaimDate);
            const today = new Date(this.getTodayStr());
            const diffDays = Math.floor((today - lastDate) / this.DAY_MS);

            if (diffDays > 1) {
                // Streak broken
                this.state.currentStreak = 0;
            }
        }

        // Show after a slight delay so the start screen is visible
        setTimeout(() => {
            if (!gameState.gameActive && !AdManager.isAdPlaying &&
                document.getElementById('armory-modal').classList.contains('hidden')) this.showModal();
        }, 800);
    }

    static getCurrentDayIndex() {
        const streak = this.state.currentStreak - (this.hasClaimedToday() ? 1 : 0);
        return Math.max(0, streak) % 7;
    }

    static showModal() {
        const modal = document.getElementById('daily-reward-modal');
        if (!modal) return;

        const dayIndex = this.getCurrentDayIndex();
        const reward = this.REWARDS[dayIndex];
        const streakDay = this.state.currentStreak + 1;

        const getIcon = (key, size = 20) => typeof IconSystem !== 'undefined' ? IconSystem.get(key, { size }) : '';
        const checkIcon = typeof IconSystem !== 'undefined' ? IconSystem.get('check', { size: 16, color: '#22c55e' }) : '✓';

        const t = (key, params) => typeof Localization !== 'undefined' ? Localization.t(key, params) : key;
        const alreadyClaimed = this.hasClaimedToday();

        // Build day indicators
        let daysHTML = '';
        for (let i = 0; i < 7; i++) {
            const r = this.REWARDS[i];
            const isCurrent = (i === dayIndex);
            const isPast = (i < dayIndex) || (alreadyClaimed && i === dayIndex);
            const statusClass = (alreadyClaimed && isCurrent) ? 'claimed' : (isCurrent ? 'current' : (isPast ? 'claimed' : 'locked'));
            const daySvg = isPast ? checkIcon : r.special ? getIcon('crate', 28) : getNeonCoinSVG(28);

            daysHTML += `
                <div class="dr-day ${statusClass}">
                    <div class="dr-day-num">${t('daily_day_badge', { day: i + 1 })}</div>
                    <div class="dr-day-icon">${daySvg}</div>
                    <div class="dr-day-label">${r.special ? this.getRewardLabel(r) : r.coins.toLocaleString(Localization.currentLang)}</div>
                </div>
            `;
        }

        const streakIcon = getIcon('fire', 16);
        const rewardHighlightSvg = reward.special ? getIcon('crate', 54) : getNeonCoinSVG(54);
        const boltSvg = getIcon('lightning', 18);

        modal.innerHTML = `
            <div class="dr-card">
                <div class="dr-header">
                    <div class="dr-streak-badge">
                        ${streakIcon}
                        <span>${t('daily_streak', { streak: streakDay })}</span>
                    </div>
                    <h2 class="dr-title">${t('daily_rewards_title')}</h2>
                </div>
                <div class="dr-days-grid">${daysHTML}</div>
                <div class="dr-reward-highlight">
                    <span class="dr-reward-icon">${rewardHighlightSvg}</span>
                    <span class="dr-reward-text">${this.getRewardLabel(reward)}</span>
                </div>
                <div class="dr-actions">
                    ${alreadyClaimed
                        ? `<div class="ls-free-used" style="padding: 10px; font-weight: bold; color: #22c55e;">${t('come_back_tomorrow')}</div>`
                        : `
                            <button class="main-btn dr-claim-btn" id="dr-claim-btn">${t('claim_reward')}</button>
                            <button class="main-btn dr-double-btn" id="dr-double-btn">
                                ${boltSvg} <span>${t('double_reward_ad')}</span>
                            </button>
                        `
                    }
                </div>
                <button class="dr-close-btn" id="dr-close-btn">${t('close_btn')}</button>
            </div>
        `;

        modal.classList.remove('hidden');

        const closeBtn = document.getElementById('dr-close-btn');
        if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        if (!alreadyClaimed) {
            const claimBtn = document.getElementById('dr-claim-btn');
            if (claimBtn) claimBtn.addEventListener('click', () => this.claimReward(false));

            const doubleBtn = document.getElementById('dr-double-btn');
            if (doubleBtn) {
                doubleBtn.addEventListener('click', () => {
                    if (typeof AdManager !== 'undefined') {
                        AdManager.showRewardedAd({
                            rewardType: 'DAILY_REWARD_2X',
                            onSuccess: () => this.claimReward(true),
                            onDismiss: () => {}
                        });
                    } else {
                        this.claimReward(true);
                    }
                });
            }
        }
    }

    static getRewardLabel(reward) {
        if (typeof Localization === 'undefined') return reward.label;
        if (!reward.special) return Localization.t('currency_count', { count: reward.coins });
        const pack = CosmeticsManager.CIPHER_PACKS.find(pack => pack.id === reward.special);
        return CosmeticsManager.getPackName(pack) + (reward.day === 7 ? ' ★' : '');
    }

    static claimReward(doubled) {
        if (this.hasClaimedToday()) return;
        const dayIndex = this.getCurrentDayIndex();
        const reward = this.REWARDS[dayIndex];
        const multiplier = doubled ? 2 : 1;

        if (reward.special) {
            // Open a crate
            if (typeof CosmeticsManager !== 'undefined') {
                const pack = CosmeticsManager.CIPHER_PACKS.find(p => p.id === reward.special);
                if (pack) {
                    const validItems = Object.values(CosmeticsManager.ITEMS).filter(item => {
                        if (['core_default', 'proj_default', 'bg_nebula'].includes(item.id)) return false;
                        return pack.rarities.includes(item.rarity);
                    });
                    const unowned = validItems.filter(item => !CosmeticsManager.isUnlocked(item.id));
                    if (unowned.length > 0) {
                        const picked = unowned[Math.floor(Math.random() * unowned.length)];
                        CosmeticsManager.unlock(picked.id);
                    } else {
                        CosmeticsManager.addCoins(200 * multiplier);
                    }
                }
            }
            // If doubled, also give bonus coins
            if (doubled && typeof CosmeticsManager !== 'undefined') {
                CosmeticsManager.addCoins(150);
            }
        } else {
            // Give coins
            if (typeof CosmeticsManager !== 'undefined') {
                CosmeticsManager.addCoins(reward.coins * multiplier);
            }
        }

        // Update state
        this.state.lastClaimDate = this.getTodayStr();
        this.state.currentStreak++;
        this.state.totalLogins++;
        this.save();

        // Close modal with feedback
        document.querySelector('#daily-rewards-btn .reward-ready-dot')?.remove();
        if (window.MenuAudio) MenuAudio.play('reward');
        const modal = document.getElementById('daily-reward-modal');
        if (modal) modal.classList.add('hidden');

        // Show toast
        const msg = typeof Localization !== 'undefined'
            ? Localization.t(doubled ? 'daily_doubled' : 'daily_claimed', { reward: this.getRewardLabel(reward) })
            : this.getRewardLabel(reward);
        if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
            ArmoryUI.showToast(msg, true);
        }
    }
}

window.DailyRewardManager = DailyRewardManager;
