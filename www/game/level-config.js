// Each run begins at Evolution 1. bossAtEvolution is the final encounter.
// Curve points are [Evolution, difficulty]; intermediate values interpolate.
window.LEVELS = [
    { mainBoss: 1, bossAtEvolution: 9, difficultyCurve: [[1, .15], [9, .9]], bossHpMultiplier: .65, goldReward: 162, minibosses: [{ atEvolution: 6, id: 101, hpMultiplier: .45 }] },
    { mainBoss: 2, bossAtEvolution: 15, difficultyCurve: [[1, .3], [15, 1.5]], bossHpMultiplier: .12, goldReward: 244, minibosses: [{ atEvolution: 9, id: 101, hpMultiplier: .55 }] },
    { mainBoss: 4, bossAtEvolution: 16, difficultyCurve: [[1, .6], [8, 1.4], [16, 2.4]], bossHpMultiplier: .22, minibosses: [{ atEvolution: 6, id: 101, hpMultiplier: .7 }, { atEvolution: 11, id: 102, hpMultiplier: .65 }] },
    { mainBoss: 5, bossAtEvolution: 18, difficultyCurve: [[1, 1], [18, 3.5]], bossHpMultiplier: .24, minibosses: [{ atEvolution: 7, id: 102, hpMultiplier: .85 }, { atEvolution: 13, id: 101, hpMultiplier: .9 }] },
    { mainBoss: 6, bossAtEvolution: 20, difficultyCurve: [[1, 2.5], [20, 7]], bossHpMultiplier: .28, minibosses: [{ atEvolution: 8, id: 102 }, { atEvolution: 15, id: 103 }] },
    { mainBoss: 10, bossAtEvolution: 15, difficultyCurve: [[1, 3], [15, 7.5]], bossHpMultiplier: 1, minibosses: [{ atEvolution: 6, id: 103 }, { atEvolution: 11, id: 102 }] },
    { mainBoss: 7, bossAtEvolution: 23, difficultyCurve: [[1, 3.5], [23, 8.5]], bossHpMultiplier: .4, minibosses: [{ atEvolution: 8, id: 103 }, { atEvolution: 16, id: 102 }] },
    { mainBoss: 8, bossAtEvolution: 25, difficultyCurve: [[1, 4], [25, 9.5]], bossHpMultiplier: .45, minibosses: [{ atEvolution: 7, id: 102 }, { atEvolution: 15, id: 103 }, { atEvolution: 21, id: 101 }] },
    { mainBoss: 9, bossAtEvolution: 27, difficultyCurve: [[1, 4.5], [27, 10.5]], bossHpMultiplier: .45, minibosses: [{ atEvolution: 9, id: 103 }, { atEvolution: 18, id: 102 }, { atEvolution: 23, id: 103 }] },
    { mainBoss: 11, bossAtEvolution: 30, difficultyCurve: [[1, 5], [15, 8], [30, 12]], bossHpMultiplier: 1, minibosses: [{ atEvolution: 8, id: 102 }, { atEvolution: 16, id: 103 }, { atEvolution: 24, id: 103, hpMultiplier: 1.5 }] }
];
window.LevelDirector = {
    config() { return LEVELS[window.LevelProgress ? LevelProgress.getState().index : 0]; },
    isIntro() { return (window.LevelProgress ? LevelProgress.getState().index : 0) < 3; },
    progression() {
        const tuning = GameBalance.get('progression');
        // Early builds arrive before the screen fills. Later Levels keep their endurance curve.
        return this.isIntro() ? { initialStep: Math.min(300, tuning.initialStep), stepGrowth: Math.min(1.06, tuning.stepGrowth), stepAddition: Math.min(100, tuning.stepAddition) } : tuning;
    },
    difficulty(evolution = gameState.level) {
        const points = this.config().difficultyCurve;
        if (evolution <= points[0][0]) return points[0][1];
        for (let i = 1; i < points.length; i++) {
            if (evolution <= points[i][0]) {
                const a = points[i - 1], b = points[i];
                return a[1] + (b[1] - a[1]) * (evolution - a[0]) / (b[0] - a[0]);
            }
        }
        return points.at(-1)[1];
    },
    reward(index) {
        const config = LEVELS[index];
        return config.goldReward ?? Math.round(40 + config.bossAtEvolution * 12 + config.difficultyCurve.at(-1)[1] * 15);
    },
    spawnInterval(difficulty) {
        const s = GameBalance.get('scaling');
        return Math.max(s.spawnMinimumMs, s.spawnBaseMs / (1 + difficulty * s.spawnDifficulty));
    },
    enemyHp(base, difficulty) {
        const s = GameBalance.get('scaling');
        // Integer HP jumps previously doubled basic enemies at difficulty 1.
        const growth = difficulty * (s.hpLinear + difficulty * s.hpQuadratic);
        return base + (this.isIntro() ? Math.floor(growth * .4) : Math.floor(growth));
    },
    prepareBoss(entity, id) {
        if (!entity.campaignBaseHp) entity.campaignBaseHp = entity.baseMaxHp || entity.maxHp;
        const config = this.config();
        const mini = config.minibosses.find(item => item.id === id && item.atEvolution === gameState.level);
        entity.maxHp = Math.max(1, Math.round(entity.campaignBaseHp * (id === config.mainBoss ? config.bossHpMultiplier : (mini?.hpMultiplier ?? (1 + this.difficulty() * GameBalance.get('scaling.minibossHpDifficulty'))))));
    }
};
