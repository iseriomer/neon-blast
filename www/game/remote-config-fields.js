// A single field catalog drives both Firebase's editable groups and client reads.
(() => {
    const defaults = GameBalance.defaults(), fields = [];
    const snake = text => text.replace(/[A-Z]/g, letter => '_' + letter.toLowerCase());
    const at = (object, path) => path.reduce((value, key) => value[key], object);
    function add(key, path, group, description) {
        fields.push({ key, path, group, description, value: at(defaults, path) });
    }
    defaults.levels.forEach((level, index) => {
        const prefix = `level_${index + 1}`, group = `${String(index + 1).padStart(2, '0')} - Level ${index + 1}`;
        const base = ['levels', index];
        add(`${prefix}_boss_evolution`, [...base, 'bossAtEvolution'], group, 'Ana boss hangi Evolution sonunda gelsin? Büyük sayı = build için daha çok seçim.');
        add(`${prefix}_boss_hp_multiplier`, [...base, 'bossHpMultiplier'], group, 'Ana boss can çarpanı. Küçük sayı = daha kolay boss.');
        add(`${prefix}_gold_reward`, [...base, 'goldReward'], group, 'Level kazanılınca verilen altın.');
        level.minibosses.forEach((mini, i) => {
            const path = [...base, 'minibosses', i];
            add(`${prefix}_miniboss_${i + 1}_evolution`, [...path, 'atEvolution'], group, `${i + 1}. miniboss hangi Evolution sonunda gelsin? Ana boss öncesinde olmalı.`);
            // Absent multipliers stay derived from difficulty unless explicitly configured.
            if (mini.hpMultiplier !== undefined) add(`${prefix}_miniboss_${i + 1}_hp_multiplier`, [...path, 'hpMultiplier'], group, 'Miniboss can çarpanı. Küçük sayı = daha kolay.');
        });
        level.difficultyCurve.forEach((point, i) => {
            const label = i === 0 ? 'start' : i === level.difficultyCurve.length - 1 ? 'end' : `point_${i + 1}`;
            add(`${prefix}_difficulty_${label}`, [...base, 'difficultyCurve', i, 1], group,
                `${i === 0 ? 'Başlangıç' : i === level.difficultyCurve.length - 1 ? 'Son' : 'Ara'} zorluk (Evolution ${point[0]}). Küçük sayı = daha az can/hız/yoğunluk.`);
        });
    });
    for (const [id, enemy] of Object.entries(defaults.enemies)) {
        for (const [field, label] of Object.entries({ hp: 'temel canı', speed: 'temel hız çarpanı', score: 'öldürme XP/skoru', radius: 'temel yarıçapı' })) {
            add(`enemy_${id.toLowerCase()}_${field}`, ['enemies', id, field], '11 - Dusmanlar', `${id}: ${label}. ${field === 'hp' || field === 'speed' ? 'Küçük sayı = daha kolay düşman.' : ''}`);
        }
    }
    const sections = {
        player: ['12 - Baslangic build', 'player', {
            shotCount: 'Başlangıç mermi adedi', shotSpeed: 'Mermi hızı', shotSize: 'Mermi boyutu', piercing: 'Merminin delme adedi',
            fireRate: 'Atışlar arası milisaniye. Küçük sayı = daha hızlı atış', spread: 'Mermi saçılması', shield: 'Başlangıç kalkanı',
            maxShields: 'Kalkan sınırı', critChance: 'Kritik ihtimali: 0.1 = %10', critMultiplier: 'Kritik hasar çarpanı',
            damageMultiplier: 'Genel hasar çarpanı', bossDamageMultiplier: 'Boss hasar çarpanı'
        }],
        progression: ['13 - XP ve Evolution', 'xp', {
            initialStep: 'İlk perk seçimi için gereken XP', stepGrowth: 'Her perkten sonra XP adımının büyüme çarpanı',
            stepAddition: 'Her perkten sonra XP adımına eklenen miktar'
        }],
        scaling: ['14 - Spawn ve zorluk', 'scaling', {
            spawnBaseMs: 'Temel düşman spawn aralığı, milisaniye. Büyük sayı = daha seyrek',
            spawnMinimumMs: 'Spawn aralığının alt sınırı, milisaniye', spawnDifficulty: 'Zorluk arttıkça spawn hızlanması',
            hpLinear: 'Zorluğun düşman canına doğrusal etkisi', hpQuadratic: 'Zorluğun düşman canına karesel etkisi',
            enemySpeedDifficulty: 'Zorluk arttıkça düşman hız artışı', minibossHpDifficulty: 'Özel can çarpanı olmayan minibossların zorluğa göre can artışı'
        }],
        perks: ['15 - Perkler', 'perk', {
            rapidFireMultiplier: 'Rapid Fire: atış aralığı çarpanı. 0.8 = %20 daha kısa aralık',
            machineGunMultiplier: 'Machine Gun: atış aralığı çarpanı. Küçük sayı = daha güçlü',
            sniperSpeedMultiplier: 'Sniper: mermi hız çarpanı', sniperFireMultiplier: 'Sniper: atış aralığı çarpanı',
            freezeFrames: 'Freeze süresi. 60 frame yaklaşık 1 saniye', knockback: 'Knockback itme gücü',
            orbitalCount: 'Orbitals perkinde eklenen küre adedi', giantBulletMultiplier: 'Giant Bullet: mermi boyutu çarpanı',
            explosiveRadius: 'Explosive Shot: patlama yarıçapı', synergyChance: 'Build ile uyumlu perk teklif ihtimali: 0.6 = %60'
        }],
        miniboss: ['16 - Miniboss dalgalari', 'miniboss', {
            initialCooldown: 'İlk dalgaya kadar bekleme: 60 frame yaklaşık 1 saniye', maxNodes: 'Yeni dalga başlatmayı durduran aktif birlik eşiği',
            telegraphFrames: 'Dalgadan önce uyarı süresi: 60 frame yaklaşık 1 saniye', waveEarly: 'İlk faz dalga aralığı, frame',
            waveMiddle: 'Orta faz dalga aralığı, frame', waveLate: 'Son faz dalga aralığı, frame',
            nodeMinimumHp: 'Miniboss birliklerinin minimum temel canı', nodeProtectionMultiplier: 'Birlikler varken minibossun aldığı hasar çarpanı. Büyük sayı = daha kolay'
        }]
    };
    for (const [section, [group, prefix, labels]] of Object.entries(sections)) {
        for (const [field, label] of Object.entries(labels)) add(`${prefix}_${snake(field)}`, [section, field], group, label + '.');
    }
    for (const [id, definition] of Object.entries(defaults.meta)) {
        add(`meta_${id}_step`, ['meta', id, 'step'], '17 - Kalici yukseltmeler', `${id}: her satın alınan kademenin etkisi.`);
        add(`meta_${id}_base_cost`, ['meta', id, 'baseCost'], '17 - Kalici yukseltmeler', `${id}: ilk kademe altın fiyatı.`);
    }
    add('meta_cost_growth', ['metaCostGrowth'], '17 - Kalici yukseltmeler', 'Kalıcı yükseltmelerde her kademenin fiyat çarpanı.');
    for (const [id, rule] of Object.entries(defaults.spawning)) {
        for (const field of Object.keys(rule)) {
            const label = { difficulty: 'Görünmeye başladığı zorluk eşiği', chance: 'Kümülatif spawn ihtimali, 0–1', cap: 'Aynı anda aktif adet sınırı' }[field];
            add(`spawn_${id.toLowerCase()}_${field}`, ['spawning', id, field], '18 - Dusman secimi - ileri ayarlar', `${id}: ${label}. İhtimaller HEALER → SUPERTANK → SPAWNER → SPLITTER → TANK → DASHER → SPEEDSTER sırasıyla artmalıdır.`);
        }
    }
    window.RemoteBalanceFields = {
        catalog: () => fields.map(field => ({ ...field, path: [...field.path] })),
        sdkDefaults(value = defaults) {
            return { balance_revision: 2, ...Object.fromEntries(fields.map(field => [field.key, at(value, field.path)])) };
        },
        template(value = defaults) {
            const groups = { '00 - Denge surumu': { description: 'İstemci denge uyumluluğu.', parameters: {
                balance_revision: { defaultValue: { value: '2' }, valueType: 'NUMBER',
                    description: 'Bu istemci için 2 olmalı. Eski sunucu ayarlarının yeni başlangıç dengesini geri almasını önler.' }
            } } };
            for (const field of fields) {
                groups[field.group] ||= { description: 'Sayıyı değiştirip Publish changes ile yayınla. Yeni koşuda uygulanır.', parameters: {} };
                groups[field.group].parameters[field.key] = { defaultValue: { value: String(at(value, field.path)) },
                    valueType: 'NUMBER', description: field.description };
            }
            return groups;
        },
        read(getValue) {
            // Old published values include the former Level 2 difficulty wall.
            // Ignore them until the matching template has been published, using local defaults.
            const revision = getValue('balance_revision');
            if (revision.getSource() !== 'remote' || revision.asString().trim() !== '2') return null;
            const legacy = getValue('game_balance_v1');
            let hasRemote = legacy.getSource() === 'remote';
            const candidate = GameBalance.validate(hasRemote ? JSON.parse(legacy.asString()) : {});
            for (const field of fields) {
                const value = getValue(field.key);
                if (value.getSource() !== 'remote') continue;
                hasRemote = true;
                const raw = value.asString().trim(), numeric = Number(raw);
                if (!raw || !Number.isFinite(numeric)) throw new Error(`Geçersiz sayı: ${field.key}`);
                const parent = at(candidate, field.path.slice(0, -1));
                parent[field.path.at(-1)] = numeric;
            }
            return hasRemote ? GameBalance.validate(candidate) : null;
        }
    };
})();
