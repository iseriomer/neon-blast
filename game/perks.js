// perks.js - Perk System

const ALL_PERKS = [
    {
        id: 'rapid_fire',
        title: 'Rapid Fire',
        desc: 'Increases fire rate by 20%.',
        apply: (stats) => { stats.fireRate *= 0.8; }
    },
    {
        id: 'machine_gun',
        title: 'Machine Gun',
        desc: 'Greatly increases fire rate but decreases accuracy.',
        apply: (stats) => {
            stats.fireRate *= 0.5;
            stats.spread += 0.2;
            stats.color = '#ff00ff';
        }
    },
    {
        id: 'sniper',
        title: 'Sniper Shot',
        desc: 'Increases bullet speed and damage, decreases fire rate.',
        apply: (stats) => {
            stats.shotSpeed *= 1.5;
            stats.piercing += 2;
            stats.fireRate *= 1.3;
        }
    },
    {
        id: 'double_shot',
        title: 'Double Barrel',
        desc: 'Fires +1 extra bullet per shot.', //bu perkin bir sınırı olsun max shotcount sayısı olsun yani, bu sayıya ulaşınca bu perk çıkamasın bidaha
        apply: (stats) => {
            stats.shotCount += 1;
            stats.spread += 0.05;
        }
    },
    {
        id: 'freeze',
        title: 'Frost Bite',
        desc: 'Slows down enemies on hit.',
        apply: (stats) => {
            stats.freeze += 60;
            stats.color = '#00ffff';
        }
    },
    {
        id: 'knockback',
        title: 'Knockback',
        desc: 'Bullets push enemies back.',
        apply: (stats) => { stats.knockback += 5; } //knockback oyuncudan uzağa doğru olsun her zaman.
    },
    {
        id: 'side_cannons',
        title: 'Side Cannons',
        desc: 'Fires additional shots to the left and right.',
        apply: (stats) => { stats.sideCannons = true; }
    },
    {
        id: 'orbitals',
        title: 'Orbital Shield',
        desc: 'A protective orb orbits around you dealing damage.',
        apply: (stats) => { stats.orbitals += 1; } // orbitals olunca kaç tane yörünge koruma olacağını ayarlar. perk ekranında da örneğin "(şuanki yörünge koruma sayısı) + 1" yörünge koruma olarak yaz.
    },
    {
        id: 'orbital_size',
        title: 'Massive Orbitals',
        desc: 'Increases the size of Orbital Shields by 50%.',
        apply: (stats) => { stats.orbitalSizeMultiplier *= 1.5; }
    },
    {
        id: 'screen_wrap',
        title: 'Wormhole Bullets',
        desc: 'Bullets wrap around the screen once.',
        apply: (stats) => { stats.screenWrap = true; }
    },
    {
        id: 'execute',
        title: 'Executioner',
        desc: 'Instantly destroys enemies below 30% HP.',
        apply: (stats) => { stats.execute = true; }
    },
    {
        id: 'cluster',
        title: 'Cluster Bomb',
        desc: 'Leaves mines that explode on contact. (Stackable)',
        apply: (stats) => {
            // Eğer daha önce alınmadıysa 0 kabul et, her alışta +1 ekle
            stats.clusterCount = (stats.clusterCount || 0) + 1;
        }
    },
    {
        id: 'homing',
        title: 'Homing Missiles',
        desc: 'Bullets home in on nearby enemies.',
        apply: (stats) => {
            stats.homing += 0.1;
            stats.color = '#0f0';
        }
    },
    {
        id: 'ricochet',
        title: 'Ricochet',
        desc: 'Bullets bounce off walls.',
        apply: (stats) => { stats.ricochet += 1; }
    },
    {
        id: 'split_shot',
        title: 'Frag Shot',
        desc: 'Bullets split into smaller pieces on impact.',
        apply: (stats) => { stats.splitShotCount += 1; } //bunu splitshot olunca kaç parçaya ayrılcağını ayarlamak için kullan perk ekranında da örneğin "(şuanki parça sayısı) + 1" parçaya ayrılır şeklinde yaz. 
    },
    {
        id: 'back_shot',
        title: 'Rear Guard',
        desc: 'Fires an additional bullet backwards.',
        apply: (stats) => { stats.backShot = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede.
    },
    {
        id: 'giant_bullet',
        title: 'Cannonball',
        desc: 'Bullets become 30% larger and easier to hit.',
        apply: (stats) => { stats.shotSize *= 1.3; }
    },
    {
        id: 'shotgun',
        title: 'Shotgun',
        desc: 'Fires +2 more bullets but spreads more.',
        apply: (stats) => {
            stats.shotCount += 2;
            stats.spread += 0.15;
        }
    },
    {
        id: 'chain_lightning',
        title: 'Chain Lightning',
        desc: 'Electricity arcs to 2 nearby enemies on hit. (Actives)',
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
        apply: (stats) => {
            stats.chainLightning += 1;
        }
    },
    {
        id: 'chain_lightning_damage',
        title: 'Overload',
        desc: 'Increases lightning damage.',
        apply: (stats) => {
            stats.chainLightningDamage += 1;
        }
    },
    {
        id: 'explosive_shot',
        title: 'Explosive Round',
        desc: 'Deals area damage when destroying enemies.',
        apply: (stats) => {
            stats.explosiveRadius += 80;
            stats.color = '#ff6600';
        }
    },
    {
        id: 'energy_shield',
        title: 'Energy Shield',
        desc: 'Grants +1 Shield. Clears screen on break! (Max 2)',
        apply: (stats) => {
            if (stats.shield < stats.maxShields) {
                stats.shield += 1;
            }
        }
    },
    {
        id: 'laser_beam',
        title: 'Orbital Laser',
        desc: 'Adds a rotating laser beam that deals continuous damage.',
        apply: (stats) => {
            stats.laserBeam = true;
            stats.color = '#ff0000';   //lazer ışını saat yönünde dönsün otomatik belli bir hızda. 1 kere alınırsa bidaha çıkmasın perk seçmede.
        }
    },
    {
        id: 'singularity',
        title: 'Singularity',
        desc: 'Spawns a black hole every 30s that sucks in enemies.',
        apply: (stats) => { stats.singularity = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede. singularite sırasında yeni düşman spawn olmasın.
    },
    {
        id: 'critical_lens',
        title: 'Critical Lens',
        desc: 'Increases Critical Chance by 10% and Critical Damage by 50%.',
        apply: (stats) => {
            stats.critChance += 0.1;
            stats.critMultiplier += 0.5;
            stats.color = '#ff00ff'; // Morumsu lazer etkisi
        }
    },
    {
        id: 'poison_shot',
        title: 'Acid Rain',
        desc: 'Bullets poison enemies (DoT). (Incompatible with Fire)',
        apply: (stats) => {
            stats.poison = true;
            stats.color = '#32cd32';
        }
    },
    {
        id: 'burn_shot',
        title: 'Flamethrower',
        desc: 'Bullets burn enemies (Fast DoT). (Incompatible with Poison)',
        apply: (stats) => {
            stats.burn = true;
            stats.color = '#ff4500';
        }
    }
];