// One validated balance snapshot per run. Remote updates are staged for the next run.
(() => {
    const CACHE_KEY = 'neonblast_balance_v2';
    const clone = value => JSON.parse(JSON.stringify(value));
    const defaults = {
        version: 1,
        levels: LEVELS.map((level, index) => ({ ...clone(level), goldReward: LevelDirector.reward(index) })),
        enemies: Object.fromEntries(Object.entries(ENEMY_TYPES).map(([id, type]) => [id, {
            hp: type.hp, speed: type.speed, radius: type.radius, score: type.score
        }])),
        player: Object.fromEntries(['shotCount', 'shotSpeed', 'shotSize', 'piercing', 'fireRate', 'spread',
            'shield', 'maxShields', 'critChance', 'critMultiplier', 'damageMultiplier', 'bossDamageMultiplier']
            .map(key => [key, DEFAULT_PLAYER_STATS[key]])),
        progression: { initialStep: 600, stepGrowth: 1.1, stepAddition: 200 },
        scaling: { spawnBaseMs: 1100, spawnMinimumMs: 240, spawnDifficulty: .25,
            hpLinear: 1, hpQuadratic: .12, enemySpeedDifficulty: .05, minibossHpDifficulty: .12 },
        spawning: {
            HEALER: { difficulty: 5, chance: .04, cap: 3 },
            SUPERTANK: { difficulty: 9, chance: .08 },
            SPAWNER: { difficulty: 4, chance: .15, cap: 3 },
            SPLITTER: { difficulty: 3, chance: .25 },
            TANK: { difficulty: 2, chance: .35 },
            DASHER: { difficulty: 3, chance: .5 },
            SPEEDSTER: { difficulty: 1, chance: .6 }
        },
        perks: { rapidFireMultiplier: .8, machineGunMultiplier: .7, sniperSpeedMultiplier: 1.5,
            sniperFireMultiplier: 1.3, freezeFrames: 60, knockback: 5, orbitalCount: 2,
            giantBulletMultiplier: 1.3, explosiveRadius: 40, synergyChance: .6 },
        meta: Object.fromEntries(Object.entries(MetaProgress.definitions).map(([id, def]) => [id, { step: def.step, baseCost: def.baseCost }])),
        metaCostGrowth: 1.32,
        miniboss: { initialCooldown: 100, maxNodes: 7, telegraphFrames: 72, waveEarly: 320,
            waveMiddle: 260, waveLate: 210, nodeMinimumHp: 2, nodeProtectionMultiplier: .58 }
    };
    const ranges = {
        hp: [.1, 10000], speed: [.05, 10], radius: [5, 100], score: [1, 10000, true],
        shotCount: [1, 15, true], shotSpeed: [1, 50], shotSize: [1, 30], piercing: [1, 30, true],
        fireRate: [50, 2000], spread: [0, 1], shield: [0, 10, true], maxShields: [0, 10, true],
        critChance: [0, 1], critMultiplier: [1, 10], damageMultiplier: [.1, 10], bossDamageMultiplier: [.1, 10],
        initialStep: [50, 10000, true], stepGrowth: [1, 2], stepAddition: [0, 5000, true],
        spawnBaseMs: [100, 10000], spawnMinimumMs: [100, 10000], spawnDifficulty: [0, 2],
        hpLinear: [0, 10], hpQuadratic: [0, 2], enemySpeedDifficulty: [0, 1], minibossHpDifficulty: [0, 2],
        difficulty: [0, 100], chance: [0, 1], cap: [0, 20, true],
        rapidFireMultiplier: [.1, 1], machineGunMultiplier: [.1, 1], sniperSpeedMultiplier: [1, 5],
        sniperFireMultiplier: [1, 5], freezeFrames: [1, 600, true], knockback: [0, 30],
        orbitalCount: [1, 8, true], giantBulletMultiplier: [1, 3], explosiveRadius: [1, 200], synergyChance: [0, 1],
        step: [0, 1], baseCost: [1, 100000, true], metaCostGrowth: [1, 3],
        initialCooldown: [30, 1000], maxNodes: [1, 20, true], telegraphFrames: [30, 300],
        waveEarly: [60, 1200], waveMiddle: [60, 1200], waveLate: [60, 1200],
        nodeMinimumHp: [.1, 100], nodeProtectionMultiplier: [.1, 1]
    };
    function number(value, min, max, integer = false) {
        if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))
            throw new Error('Numeric value outside allowed range');
        return value;
    }
    function object(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected object');
    }
    function levels(input) {
        if (!Array.isArray(input) || input.length !== defaults.levels.length) throw new Error('Expected ten Levels');
        return input.map((entry, index) => {
            object(entry);
            const allowed = ['mainBoss', 'bossAtEvolution', 'difficultyCurve', 'bossHpMultiplier', 'goldReward', 'minibosses'];
            if (Object.keys(entry).some(key => !allowed.includes(key))) throw new Error('Unknown Level field');
            const level = { ...clone(defaults.levels[index]), ...clone(entry) };
            if (level.mainBoss !== defaults.levels[index].mainBoss) throw new Error('Boss identity cannot change');
            number(level.bossAtEvolution, 3, 100, true);
            number(level.bossHpMultiplier, .05, 10);
            number(level.goldReward, 0, 100000, true);
            if (!Array.isArray(level.difficultyCurve) || !level.difficultyCurve.length || level.difficultyCurve.length > 20) throw new Error('Invalid curve');
            let previous = 0;
            for (const point of level.difficultyCurve) {
                if (!Array.isArray(point) || point.length !== 2) throw new Error('Invalid curve point');
                number(point[0], previous + 1, level.bossAtEvolution, true); number(point[1], 0, 100);
                previous = point[0];
            }
            if (level.difficultyCurve[0][0] !== 1) throw new Error('Curve must start at Evolution 1');
            if (!Array.isArray(level.minibosses) || level.minibosses.length > 10) throw new Error('Invalid miniboss list');
            previous = 1;
            for (const mini of level.minibosses) {
                object(mini);
                if (Object.keys(mini).some(key => !['atEvolution', 'id', 'hpMultiplier'].includes(key)) || ![101, 102, 103].includes(mini.id)) throw new Error('Invalid miniboss');
                number(mini.atEvolution, previous + 1, level.bossAtEvolution - 1, true);
                if (mini.hpMultiplier !== undefined) number(mini.hpMultiplier, .05, 10);
                previous = mini.atEvolution;
            }
            return level;
        });
    }
    function merge(base, patch) {
        object(patch);
        const result = clone(base);
        for (const [key, value] of Object.entries(patch)) {
            if (!Object.hasOwn(base, key)) throw new Error(`Unknown balance key: ${key}`);
            if (key === 'version') { if (value !== 1) throw new Error('Unsupported balance version'); }
            else if (key === 'levels') result[key] = levels(value);
            else if (typeof base[key] === 'object') result[key] = merge(base[key], value);
            else {
                if (!ranges[key]) throw new Error(`No rule for ${key}`);
                result[key] = number(value, ...ranges[key]);
            }
        }
        return result;
    }
    function validate(value) {
        const result = merge(defaults, value);
        if (result.player.shield > result.player.maxShields || result.scaling.spawnMinimumMs > result.scaling.spawnBaseMs) throw new Error('Inconsistent balance');
        let chance = 0;
        for (const rule of Object.values(result.spawning)) {
            if (rule.chance < chance) throw new Error('Spawn chances must be cumulative and ordered');
            chance = rule.chance;
        }
        return result;
    }
    let active = clone(defaults), pending = clone(defaults);
    const status = { source: 'defaults', fetch: 'loading', error: null };
    function apply(value) {
        active = clone(value);
        window.LEVELS = clone(active.levels);
        for (const [id, values] of Object.entries(active.enemies)) Object.assign(ENEMY_TYPES[id], values);
        Object.assign(DEFAULT_PLAYER_STATS, active.player);
        for (const [id, values] of Object.entries(active.meta)) Object.assign(MetaProgress.definitions[id], values);
    }
    window.GameBalance = {
        status,
        defaults: () => clone(defaults),
        snapshot: () => clone(active),
        validate,
        get(path) { return path.split('.').reduce((value, key) => value[key], active); },
        perkDescription(perk, stats) {
            if (perk.id === 'orbitals') return Localization.t(stats ? 'perk_orbitals_desc_dynamic' : perk.desc,
                { value: stats?.orbitals, gain: active.perks.orbitalCount });
            if (perk.id === 'rapid_fire') return Localization.t(perk.desc, { value: Math.round((1 - active.perks.rapidFireMultiplier) * 100) });
            if (perk.id === 'giant_bullet') return Localization.t(perk.desc, { value: Math.round((active.perks.giantBulletMultiplier - 1) * 100) });
            if (perk.id === 'split_shot' && stats) return Localization.t('perk_split_shot_desc_dynamic', { value: stats.splitShotCount });
            return Localization.t(perk.desc);
        },
        stage(value, source = 'local') {
            try {
                pending = validate(value);
                status.source = source; status.error = null;
                try { localStorage.setItem(CACHE_KEY, JSON.stringify(pending)); } catch (_) {}
                // Only starting a run activates pending tuning; an open menu is stable too.
                return true;
            } catch (error) { status.error = error.message; return false; }
        },
        startRun(saved) {
            if (saved) {
                try { apply(validate(saved)); return; } catch (_) { /* Invalid save snapshot uses safe defaults. */ }
            }
            apply(pending);
        }
    };
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
        if (cached) GameBalance.stage(cached, 'cache');
    } catch (_) {}
})();
