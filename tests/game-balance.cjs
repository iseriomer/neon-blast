const test = require('node:test');
const assert = require('node:assert/strict');
const createContext = require('../scripts/game-balance-context.cjs');
const fs = require('node:fs');
const path = require('node:path');
const load = (h, file) => h.evaluate(fs.readFileSync(path.resolve(__dirname, '../www/game', file), 'utf8'));

test('first boss stays visible and separated from a stationary mobile player', () => {
    for (const [width, height] of [[320, 568], [390, 844], [844, 390]]) {
        const h = createContext();
        h.context.enemyPool = { get: () => ({}) };
        h.evaluate('class BossBase {}');
        load(h, 'boss.js');
        h.evaluate(`CANVAS.width=${width}; CANVAS.height=${height}; GAME_SCALE=.6;
            var player={x:CANVAS.width/2,y:CANVAS.height/2,radius:12};
            boss.x=player.x; boss.y=player.y; boss.radius=48; boss.hp=boss.maxHp;`);
        for (let frame = 0; frame < 900; frame++) {
            h.evaluate('boss.onUpdate(player, 1)');
            assert.ok(h.evaluate('boss.x >= boss.radius && boss.x <= CANVAS.width-boss.radius'));
            assert.ok(h.evaluate('boss.y >= boss.radius && boss.y <= CANVAS.height-boss.radius'));
            if (frame > 90) assert.ok(h.evaluate('Math.hypot(boss.x-player.x,boss.y-player.y)>boss.radius+player.radius'));
        }
    }
});

test('Nexus lasers leave a player-sized corridor and void zones are destructible', () => {
    const h = createContext();
    h.context.spawned = [];
    h.context.enemyPool = { get: (x, y, type, difficulty) => {
        const enemy = { x, y, hp: h.evaluate(`LevelDirector.enemyHp(${type.hp}, ${difficulty})`) };
        h.context.spawned.push(enemy); return enemy;
    } };
    h.evaluate('class BossBase {}');
    load(h, 'boss_2.js');
    h.evaluate('var player={x:160,y:284,radius:12}; CANVAS.width=320; CANVAS.height=568; Math.random=()=>0; boss2.chooseAttack(player)');
    assert.ok(h.evaluate('boss2.laserLines.every(y=>Math.abs(y-player.y)>player.radius+20)'));
    assert.ok(h.evaluate('boss2.telegraphTimer>=90'));
    h.evaluate('var rolls=0; Math.random=()=>rolls++===0?.5:.02; boss2.chooseAttack(player); boss2.executeAttack()');
    assert.ok(h.context.spawned.length > 0);
    for (const zone of h.context.spawned) assert.equal(zone.hp, 1);
});

test('boss contact adds no new grace period and respects existing revive invulnerability', () => {
    const h = createContext();
    h.context.gameState = { playerStats: { shield: 2 } };
    h.context.player = { x: 20, y: 20, radius: 12 };
    let deaths = 0;
    h.context.startDeathSequence = () => deaths++;
    h.context.updateShieldIndicator = () => {};
    load(h, 'managers/BossManager.js');
    h.evaluate('var contact={x:30,y:30,radius:50}; BossManager.checkPlayerCollision(contact)');
    assert.equal(h.context.gameState.playerStats.shield, 1);
    assert.equal(h.context.gameState.invulnerableTimer, undefined);
    assert.ok(h.context.player.x >= 12 && h.context.player.y >= 12);
    h.evaluate('gameState.invulnerableTimer=3000; player.x=30; player.y=30; BossManager.checkPlayerCollision(contact)');
    assert.equal(h.context.gameState.playerStats.shield, 1);
    assert.equal(deaths, 0);
});

test('early Levels leave time to build while keeping a gradual curve and gold rewards', () => {
    const h = createContext();
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), .5);
    const levels = h.balance.defaults().levels;
    assert.equal(levels[0].minibosses[0].atEvolution, 6);
    assert.equal(levels[0].bossAtEvolution, 9);
    assert.equal(levels[1].minibosses[0].atEvolution, 9);
    assert.equal(levels[1].bossAtEvolution, 15);
    assert.deepEqual(Array.from(levels.slice(0, 4), level => level.bossAtEvolution), [9, 15, 16, 18]);
    for (const level of levels) assert.equal(level.difficultyCurve.at(-1)[0], level.bossAtEvolution);
    assert.equal(levels[0].goldReward, 162);
    assert.equal(levels[1].goldReward, 244);
    assert.equal(h.balance.defaults().player.shield, 0);
    assert.ok(h.evaluate('LevelDirector.enemyHp(1, 1.5)') <= 1);
    assert.equal(h.evaluate('LevelDirector.progression().initialStep'), 300);
    assert.ok(levels[0].difficultyCurve.at(-1)[1] < 2.5);
    assert.ok(levels[1].difficultyCurve.at(-1)[1] < 4);
    assert.equal(h.balance.validate(h.balance.defaults()).version, 1);
});

test('remote patches are deferred and saved snapshots survive subsequent remote changes', () => {
    const h = createContext();
    assert.equal(h.balance.stage({ enemies: { SPEEDSTER: { hp: .25 } }, player: { fireRate: 250 } }), true);
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), .5);
    h.balance.startRun();
    const saved = h.balance.snapshot();
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), .25);
    assert.equal(h.balance.stage({ enemies: { SPEEDSTER: { hp: 2 } } }), true);
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), .25);
    h.balance.startRun(saved);
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), .25);
    assert.equal(h.evaluate('DEFAULT_PLAYER_STATS.fireRate'), 250);
    h.balance.startRun();
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), 2);
    assert.equal(h.evaluate('DEFAULT_PLAYER_STATS.fireRate'), 400);
});

test('validated cache works offline; corrupt or future caches use local defaults', () => {
    const first = createContext();
    first.balance.stage({ progression: { initialStep: 350 } });
    const next = createContext(Object.fromEntries(first.storage));
    next.balance.startRun();
    assert.equal(next.balance.get('progression.initialStep'), 350);
    for (const cache of ['{bad', '{"version":2}', '{"scaling":{"spawnBaseMs":0}}']) {
        const h = createContext({ neonblast_balance_v2: cache });
        h.balance.startRun();
        assert.equal(h.balance.get('progression.initialStep'), 600);
    }
});

test('old cached and published tuning cannot silently restore the early difficulty wall', () => {
    const h = createContext({ neonblast_balance_v1: JSON.stringify({ player: { shield: 0 } }) });
    h.balance.startRun();
    assert.equal(h.balance.get('player.shield'), 0);
    const oldServer = key => ({ getSource: () => key === 'game_balance_v1' ? 'remote' : 'default',
        asString: () => key === 'game_balance_v1' ? JSON.stringify({ player: { shield: 0 } }) : '2' });
    assert.equal(h.context.RemoteBalanceFields.read(oldServer), null);
});

test('bad numbers, unknown keys, prototype keys and inconsistent values fail atomically', () => {
    const h = createContext();
    h.balance.stage({ enemies: { SPEEDSTER: { hp: .25 } } });
    for (const patch of [
        { enemies: { SPEEDSTER: { hp: 0 } } }, { enemies: { SPEEDSTER: { hp: '2' } } },
        { enemies: { SPEEDSTER: { hp: Infinity } } }, { enemies: { UNKNOWN: { hp: 1 } } },
        { player: { shotCount: 1.5 } }, { player: { shield: 3 } },
        { scaling: { spawnBaseMs: 200, spawnMinimumMs: 500 } },
        { spawning: { HEALER: { chance: .9 } } }, JSON.parse('{"__proto__":{"x":1}}'), { version: 2 }
    ]) assert.equal(h.balance.stage(patch), false);
    h.balance.startRun();
    assert.equal(h.evaluate('ENEMY_TYPES.SPEEDSTER.hp'), .25);
    assert.equal({}.x, undefined);
});

test('malformed encounter schedules and curves cannot reach combat', () => {
    const h = createContext();
    const mutate = callback => { const value = h.balance.defaults(); callback(value.levels); return h.balance.stage(value); };
    assert.equal(mutate(levels => levels.pop()), false);
    assert.equal(mutate(levels => levels[0].mainBoss = 999), false);
    assert.equal(mutate(levels => levels[0].minibosses[0].atEvolution = 9), false);
    assert.equal(mutate(levels => levels[0].minibosses[0].id = 999), false);
    assert.equal(mutate(levels => levels[0].difficultyCurve = [[1, 1], [1, 2]]), false);
    assert.equal(mutate(levels => levels[0].difficultyCurve = [[1, 1], [10, 2]]), false);
    assert.equal(mutate(levels => levels[0].minibosses.push({ id: 102, atEvolution: 4 })), false);
    assert.equal(mutate(levels => levels[0].bossAtEvolution = 10), true);
});

test('snapshots are detached and boss HP does not compound between attempts', () => {
    const h = createContext();
    const copy = h.balance.snapshot(); copy.enemies.SPEEDSTER.hp = 999;
    assert.equal(h.balance.get('enemies.SPEEDSTER.hp'), .5);
    h.context.gameState = { level: 9 };
    h.context.entity = { maxHp: 1000 };
    h.evaluate('LevelDirector.prepareBoss(entity, 1)');
    assert.equal(h.context.entity.maxHp, 650);
    h.evaluate('LevelDirector.prepareBoss(entity, 1)');
    assert.equal(h.context.entity.maxHp, 650);
    assert.equal(h.evaluate('LevelDirector.enemyHp(.5, .35)'), .5);
});

test('grouped Firebase numbers work without JSON and override a valid legacy value atomically', () => {
    const h = createContext();
    const catalog = h.context.RemoteBalanceFields;
    const values = { balance_revision: '2', enemy_speedster_hp: '.3', level_1_boss_evolution: '11', level_1_miniboss_1_evolution: '7' };
    const read = () => catalog.read(key => ({ getSource: () => Object.hasOwn(values, key) ? 'remote' : 'default',
        asString: () => values[key] || '{}' }));
    assert.equal(read().enemies.SPEEDSTER.hp, .3);
    assert.equal(read().levels[0].bossAtEvolution, 11);
    values.game_balance_v1 = JSON.stringify({ enemies: { SPEEDSTER: { hp: 3 } } });
    assert.equal(read().enemies.SPEEDSTER.hp, .3);
    values.level_1_miniboss_1_evolution = '12';
    assert.throws(read, /range/);
    values.level_1_miniboss_1_evolution = '7';
    values.enemy_speedster_hp = '';
    assert.throws(read);
    const groups = catalog.template();
    const keys = Object.values(groups).flatMap(group => Object.keys(group.parameters));
    assert.equal(keys.length, new Set(keys).size);
    assert.ok(keys.includes('enemy_speedster_hp'));
    for (const group of Object.values(groups)) for (const parameter of Object.values(group.parameters)) {
        assert.equal(parameter.valueType, 'NUMBER');
        assert.ok(parameter.description.length <= 256);
        assert.ok(Number.isFinite(Number(parameter.defaultValue.value)));
    }
});
