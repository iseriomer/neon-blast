// DailyRewardManager.js - 7-Day Streak Login Reward System
// Drives D1/D7 retention via escalating rewards + rewarded ad multiplier

class DailyRewardManager {
    static STORAGE_KEY = 'neonblast_daily_reward_v1';
    static DAY_MS = 24 * 60 * 60 * 1000;

    // 7-Day Reward Cycle (repeats after day 7)
    static REWARDS = [
        { day: 1, coins: 50,  label: '50 Coin',        icon: '💰', special: false },
        { day: 2, coins: 100, label: '100 Coin',       icon: '💰', special: false },
        { day: 3, coins: 150, label: '150 Coin',       icon: '💰', special: false },
        { day: 4, coins: 200, label: '200 Coin',       icon: '🔥', special: false },
        { day: 5, coins: 0,   label: 'GÜMÜŞ SANDIK',   icon: '🎁', special: 'pack_alpha' },
        { day: 6, coins: 300, label: '300 Coin',       icon: '⚡', special: false },
        { day: 7, coins: 0,   label: 'ALTIN SANDIK ★', icon: '👑', special: 'pack_quantum' }
    ];

    static state = {
        lastClaimDate: null,  // YYYY-MM-DD
        currentStreak: 0,
        totalLogins: 0
    };

    static init() {
        this.load();
        this.checkAndShow();
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
        return new Date().toISOString().split('T')[0];
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
        setTimeout(() => this.showModal(), 800);
    }

    static getCurrentDayIndex() {
        return this.state.currentStreak % 7;
    }

    static showModal() {
        const modal = document.getElementById('daily-reward-modal');
        if (!modal) return;

        const dayIndex = this.getCurrentDayIndex();
        const reward = this.REWARDS[dayIndex];
        const streakDay = this.state.currentStreak + 1;

        // Build day indicators
        let daysHTML = '';
        for (let i = 0; i < 7; i++) {
            const r = this.REWARDS[i];
            const isCurrent = (i === dayIndex);
            const isPast = (i < dayIndex);
            const statusClass = isCurrent ? 'current' : (isPast ? 'claimed' : 'locked');

            daysHTML += `
                <div class="dr-day ${statusClass}">
                    <div class="dr-day-num">GÜN ${i + 1}</div>
                    <div class="dr-day-icon">${isPast ? '✅' : r.icon}</div>
                    <div class="dr-day-label">${r.label}</div>
                </div>
            `;
        }

        modal.innerHTML = `
            <div class="dr-card">
                <div class="dr-header">
                    <div class="dr-streak-badge">${streakDay}. GÜN 🔥</div>
                    <h2 class="dr-title">GÜNLÜK ÖDÜL</h2>
                </div>
                <div class="dr-days-grid">${daysHTML}</div>
                <div class="dr-reward-highlight">
                    <span class="dr-reward-icon">${reward.icon}</span>
                    <span class="dr-reward-text">${reward.label}</span>
                </div>
                <div class="dr-actions">
                    <button class="main-btn dr-claim-btn" id="dr-claim-btn">TOPLA</button>
                    <button class="main-btn dr-double-btn" id="dr-double-btn">
                        ⚡ 2X ÖDÜL (REKLAM İZLE)
                    </button>
                </div>
                <button class="dr-close-btn" id="dr-close-btn">SONRA</button>
            </div>
        `;

        modal.classList.remove('hidden');

        document.getElementById('dr-claim-btn').addEventListener('click', () => {
            this.claimReward(false);
        });

        document.getElementById('dr-double-btn').addEventListener('click', () => {
            if (typeof AdManager !== 'undefined') {
                AdManager.showRewardedAd({
                    rewardType: 'DAILY_DOUBLE',
                    onSuccess: () => this.claimReward(true),
                    onDismiss: () => {}
                });
            } else {
                this.claimReward(true);
            }
        });

        document.getElementById('dr-close-btn').addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    static claimReward(doubled) {
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
        if (typeof playSound === 'function') playSound('levelup');
        const modal = document.getElementById('daily-reward-modal');
        if (modal) modal.classList.add('hidden');

        // Show toast
        const msg = doubled
            ? `🎉 2X ÖDÜL ALINDI! (${reward.label})`
            : `✅ ${reward.label} alındı!`;
        if (typeof ArmoryUI !== 'undefined' && ArmoryUI.showToast) {
            ArmoryUI.showToast(msg, true);
        }
    }
}

window.DailyRewardManager = DailyRewardManager;
