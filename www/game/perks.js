// perks.js - Perk System

const ALL_PERKS = [
    {
        id: 'rapid_fire',
        title: 'Rapid Fire',
        desc: 'Increases fire rate by 20%.',
        icon: '⚡',
        theme: '#00ffff',
        apply: (stats) => { stats.fireRate *= 0.8; }
    },
    {
        id: 'machine_gun',
        title: 'Machine Gun',
        desc: 'Greatly increases fire rate but less spread',
        icon: '🦾',
        theme: '#ff00ff',
        apply: (stats) => {
            stats.fireRate *= 0.7;
            stats.spread -= 0.05;
            //if spread is less than 0, set it to 0.02
            if (stats.spread < 0) stats.spread = 0.02;
            stats.color = '#ff00ff';
        }
    },
    {
        id: 'sniper',
        title: 'Sniper Shot',
        desc: 'Increases bullet speed and damage, decreases fire rate.',
        icon: '🎯',
        theme: '#00ff00',
        apply: (stats) => {
            stats.shotSpeed *= 1.5;
            stats.piercing += 1;
            stats.fireRate *= 1.3;
        }
    },
    {
        id: 'double_shot',
        title: 'Double Barrel',
        desc: 'Fires +1 extra bullet per shot.', //bu perkin bir sınırı olsun max shotcount sayısı olsun yani, bu sayıya ulaşınca bu perk çıkamasın bidaha
        icon: '✌️',
        theme: '#ffff00',
        apply: (stats) => {
            stats.shotCount += 1;
            stats.spread += 0.02;
        }
    },
    {
        id: 'freeze',
        title: 'Frost Bite',
        desc: 'Slows down enemies on hit.',
        icon: '❄️',
        theme: '#0088ff',
        apply: (stats) => {
            stats.freeze += 60;
            stats.color = '#00ffff';
        }
    },
    {
        id: 'knockback',
        title: 'Knockback',
        desc: 'Bullets push enemies back.',
        icon: '🥊',
        theme: '#ff8800',
        apply: (stats) => { stats.knockback += 5; } //knockback oyuncudan uzağa doğru olsun her zaman.
    },
    {
        id: 'side_cannons',
        title: 'Side Cannons',
        desc: 'Fires additional shots to the left and right.',
        icon: '⚓',
        theme: '#ff00cc',
        singleUse: true,
        apply: (stats) => { stats.sideCannons = true; }
    },
    {
        id: 'orbitals',
        title: 'Orbital Shield',
        desc: 'A protective orb orbits around you dealing damage.',
        icon: '🪐',
        theme: '#8800ff',
        apply: (stats) => { stats.orbitals += 1; } // orbitals olunca kaç tane yörünge koruma olacağını ayarlar. perk ekranında da örneğin "(şuanki yörünge koruma sayısı) + 1" yörünge koruma olarak yaz.
    },
    {
        id: 'orbital_size',
        title: 'Massive Orbitals',
        desc: 'Increases the size of Orbital Shields by 50%.',
        icon: '⚛️',
        theme: '#aa44ff',
        apply: (stats) => { stats.orbitalSizeMultiplier *= 1.5; }
    },
    {
        id: 'screen_wrap',
        title: 'Wormhole Bullets',
        desc: 'Bullets wrap around the screen once.',
        icon: '🌀',
        theme: '#4b0082',
        singleUse: true,
        apply: (stats) => { stats.screenWrap = true; }
    },
    {
        id: 'execute',
        title: 'Executioner',
        desc: 'Instantly destroys enemies below 20% HP.',
        icon: '☠️',
        theme: '#ff0000',
        singleUse: true,
        apply: (stats) => { stats.execute = true; }
    },

    {
        id: 'homing',
        title: 'Homing Missiles',
        desc: 'Bullets home in on nearby enemies.',
        icon: '🚀',
        theme: '#00ff88',
        apply: (stats) => {
            stats.homing += 0.03;
            stats.color = '#0f0';
        }
    },
    {
        id: 'ricochet',
        title: 'Ricochet',
        desc: 'Bullets bounce off walls.',
        icon: '🎱',
        theme: '#ff0088',
        apply: (stats) => { stats.ricochet += 1; }
    },
    {
        id: 'split_shot',
        title: 'Frag Shot',
        desc: 'Bullets split into smaller pieces on impact.',
        icon: '🎇',
        theme: '#ffaa88',
        apply: (stats) => { stats.splitShotCount += 1; } //bunu splitshot olunca kaç parçaya ayrılcağını ayarlamak için kullan perk ekranında da örneğin "(şuanki parça sayısı) + 1" parçaya ayrılır şeklinde yaz. 
    },
    {
        id: 'back_shot',
        title: 'Rear Guard',
        desc: 'Fires an additional bullet backwards.',
        icon: '🔙',
        theme: '#888888',
        singleUse: true,
        apply: (stats) => { stats.backShot = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede.
    },
    {
        id: 'giant_bullet',
        title: 'Cannonball',
        desc: 'Bullets become 30% larger and easier to hit.',
        icon: '🌑',
        theme: '#eeeeee',
        apply: (stats) => { stats.shotSize *= 1.3; }
    },
    {
        id: 'shotgun',
        title: 'Shotgun',
        desc: 'Fires +2 more bullets but spreads more.',
        icon: '💥',
        theme: '#cc8800',
        apply: (stats) => {
            stats.shotCount += 2;
            stats.spread += 0.06;
        }
    },
    {
        id: 'chain_lightning',
        title: 'Chain Lightning',
        desc: 'Electricity arcs to 2 nearby enemies on hit. (Actives)',
        icon: '🌩️',
        theme: '#ffff00',
        apply: (stats) => {
            stats.chainLightning = 2;
            stats.chainLightningDamage = 1;
            stats.color = '#ffff00';
        }
    },
    {
        id: 'chain_lightning_count',
        title: 'High Voltage',
        desc: 'Lightning arcs to +1 more enemy.',
        icon: '⚡',
        theme: '#ffff88',
        apply: (stats) => {
            stats.chainLightning += 1;
        }
    },
    {
        id: 'chain_lightning_damage',
        title: 'Overload',
        desc: 'Increases lightning damage.',
        icon: '🔋',
        theme: '#ffdd00',
        apply: (stats) => {
            stats.chainLightningDamage += 1;
        }
    },
    {
        id: 'explosive_shot',
        title: 'Explosive Round',
        desc: 'Deals area damage when destroying enemies.',
        icon: '🧨',
        theme: '#ff2200',
        apply: (stats) => {
            stats.explosiveRadius += 80;
            stats.color = '#ff6600';
        }
    },
    {
        id: 'energy_shield',
        title: 'Energy Shield',
        desc: 'Grants +1 Shield. Clears screen on break! (Max 2)',
        icon: '🛡️',
        theme: '#00ffff',
        apply: (stats) => {
            if (stats.shield < stats.maxShields) {
                stats.shield += 1;
            }
        }
    },
    {
        id: 'laser_beam',
        title: 'Orbital Laser',
        desc: 'Adds a rotating laser beam. (Stackable)',
        icon: '🔦',
        theme: '#ff0000',
        apply: (stats) => {
            stats.laserBeam += 1;
            stats.color = '#ff0000';   //lazer ışını saat yönünde dönsün otomatik belli bir hızda.
        }
    },
    {
        id: 'singularity',
        title: 'Singularity',
        desc: 'Spawns a black hole every 30s that sucks in enemies.',
        icon: '⚫',
        theme: '#8a2be2',
        apply: (stats) => { stats.singularity = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede. singularite sırasında yeni düşman spawn olmasın.
    },
    {
        id: 'critical_lens',
        title: 'Critical Lens',
        desc: 'Increases Critical Chance by 10% and Critical Damage by 50%.',
        icon: '🔍',
        theme: '#ff00ff',
        apply: (stats) => {
            stats.critChance += 0.1;
            stats.critMultiplier += 0.5;
            stats.color = '#ff00ff'; // Morumsu lazer etkisi
        }
    },


    {
        id: 'laser_damage',
        title: 'Focused Beam',
        desc: 'Increases Orbital Laser damage.',
        icon: '🔅',
        theme: '#ff5555',
        apply: (stats) => {
            stats.laserDamage += 0.08;
        }
    }
];