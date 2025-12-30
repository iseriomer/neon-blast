// perks.js - Perk System

const ALL_PERKS = [
    {
        id: 'rapid_fire',
        title: 'perk_rapid_fire_title',
        desc: 'perk_rapid_fire_desc',
        icon: '⚡',
        theme: '#00ffff',
        apply: (stats) => { stats.fireRate *= 0.8; }
    },
    {
        id: 'machine_gun',
        title: 'perk_machine_gun_title',
        desc: 'perk_machine_gun_desc',
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
        title: 'perk_sniper_title',
        desc: 'perk_sniper_desc',
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
        title: 'perk_double_shot_title',
        desc: 'perk_double_shot_desc', //bu perkin bir sınırı olsun max shotcount sayısı olsun yani, bu sayıya ulaşınca bu perk çıkamasın bidaha
        icon: '✌️',
        theme: '#ffff00',
        apply: (stats) => {
            stats.shotCount += 1;
            stats.spread += 0.02;
        }
    },
    {
        id: 'freeze',
        title: 'perk_freeze_title',
        desc: 'perk_freeze_desc',
        icon: '❄️',
        theme: '#0088ff',
        apply: (stats) => {
            stats.freeze += 60;
            stats.color = '#00ffff';
        }
    },
    {
        id: 'knockback',
        title: 'perk_knockback_title',
        desc: 'perk_knockback_desc',
        icon: '🥊',
        theme: '#ff8800',
        apply: (stats) => { stats.knockback += 5; } //knockback oyuncudan uzağa doğru olsun her zaman.
    },
    {
        id: 'side_cannons',
        title: 'perk_side_cannons_title',
        desc: 'perk_side_cannons_desc',
        icon: '⚓',
        theme: '#ff00cc',
        singleUse: true,
        apply: (stats) => { stats.sideCannons = true; }
    },
    {
        id: 'orbitals',
        title: 'perk_orbitals_title',
        desc: 'perk_orbitals_desc',
        icon: '🪐',
        theme: '#8800ff',
        apply: (stats) => { stats.orbitals += 2; } // orbitals olunca kaç tane yörünge koruma olacağını ayarlar. perk ekranında da örneğin "(şuanki yörünge koruma sayısı) + 1" yörünge koruma olarak yaz.
    },
    {
        id: 'orbital_size',
        title: 'perk_orbital_size_title',
        desc: 'perk_orbital_size_desc',
        icon: '⚛️',
        theme: '#aa44ff',
        apply: (stats) => {
            stats.orbitalSizeMultiplier *= 1.3;
            stats.orbitalDamage *= 1.5;
        }
    },
    {
        id: 'screen_wrap',
        title: 'perk_screen_wrap_title',
        desc: 'perk_screen_wrap_desc',
        icon: '🌀',
        theme: '#4b0082',
        singleUse: true,
        apply: (stats) => { stats.screenWrap = true; }
    },
    {
        id: 'execute',
        title: 'perk_execute_title',
        desc: 'perk_execute_desc',
        icon: '☠️',
        theme: '#ff0000',
        singleUse: true,
        apply: (stats) => { stats.execute = true; }
    },

    {
        id: 'homing',
        title: 'perk_homing_title',
        desc: 'perk_homing_desc',
        icon: '🚀',
        theme: '#00ff88',
        apply: (stats) => {
            stats.homing += 0.007;
            stats.color = '#0f0';
        }
    },
    {
        id: 'ricochet',
        title: 'perk_ricochet_title',
        desc: 'perk_ricochet_desc',
        icon: '🎱',
        theme: '#ff0088',
        singleUse: true,
        apply: (stats) => { stats.ricochet += 1; }
    },
    {
        id: 'split_shot',
        title: 'perk_split_shot_title',
        desc: 'perk_split_shot_desc',
        icon: '🎇',
        theme: '#ffaa88',
        apply: (stats) => { stats.splitShotCount += 1; } //bunu splitshot olunca kaç parçaya ayrılcağını ayarlamak için kullan perk ekranında da örneğin "(şuanki parça sayısı) + 1" parçaya ayrılır şeklinde yaz. 
    },
    {
        id: 'back_shot',
        title: 'perk_back_shot_title',
        desc: 'perk_back_shot_desc',
        icon: '🔙',
        theme: '#888888',
        singleUse: true,
        apply: (stats) => { stats.backShot = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede.
    },
    {
        id: 'giant_bullet',
        title: 'perk_giant_bullet_title',
        desc: 'perk_giant_bullet_desc',
        icon: '🌑',
        theme: '#eeeeee',
        apply: (stats) => { stats.shotSize *= 1.3; }
    },
    {
        id: 'shotgun',
        title: 'perk_shotgun_title',
        desc: 'perk_shotgun_desc',
        icon: '💥',
        theme: '#cc8800',
        apply: (stats) => {
            stats.shotCount += 2;
            stats.spread += 0.06;
        }
    },
    {
        id: 'chain_lightning',
        title: 'perk_chain_lightning_title',
        desc: 'perk_chain_lightning_desc',
        icon: '🌩️',
        theme: '#ffff00',
        apply: (stats) => {
            stats.chainLightning = 1;
            stats.chainLightningDamage = 1;
            stats.color = '#ffff00';
        }
    },
    {
        id: 'chain_lightning_count',
        title: 'perk_chain_lightning_count_title',
        desc: 'perk_chain_lightning_count_desc',
        icon: '⚡',
        theme: '#ffff88',
        apply: (stats) => {
            stats.chainLightning += 1;
        }
    },
    {
        id: 'chain_lightning_damage',
        title: 'perk_chain_lightning_damage_title',
        desc: 'perk_chain_lightning_damage_desc',
        icon: '🔋',
        theme: '#ffdd00',
        apply: (stats) => {
            stats.chainLightningDamage += 1;
        }
    },
    {
        id: 'explosive_shot',
        title: 'perk_explosive_shot_title',
        desc: 'perk_explosive_shot_desc',
        icon: '🧨',
        theme: '#ff2200',
        apply: (stats) => {
            stats.explosiveRadius += 40;
            stats.color = '#ff6600';
        }
    },
    {
        id: 'energy_shield',
        title: 'perk_energy_shield_title',
        desc: 'perk_energy_shield_desc',
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
        title: 'perk_laser_beam_title',
        desc: 'perk_laser_beam_desc',
        icon: '🔦',
        theme: '#ff0000',
        apply: (stats) => {
            stats.laserBeam += 2;
            stats.color = '#ff0000';   //lazer ışını saat yönünde dönsün otomatik belli bir hızda.
        }
    },
    {
        id: 'singularity',
        title: 'perk_singularity_title',
        desc: 'perk_singularity_desc',
        icon: '⚫',
        theme: '#8a2be2',
        apply: (stats) => { stats.singularity = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede. singularite sırasında yeni düşman spawn olmasın.
    },
    {
        id: 'critical_lens',
        title: 'perk_critical_lens_title',
        desc: 'perk_critical_lens_desc',
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
        title: 'perk_laser_damage_title',
        desc: 'perk_laser_damage_desc',
        icon: '🔅',
        theme: '#ff5555',
        apply: (stats) => {
            stats.laserDamage += stats.laserDamage;
        }
    },
    // ELECTRIC AURA PERKS
    {
        id: 'electric_aura',
        title: 'perk_electric_aura_title',
        desc: 'perk_electric_aura_desc',
        icon: '⚡',
        theme: '#00ffff',
        singleUse: true,
        apply: (stats) => {
            stats.electricAura = true;
            stats.auraDamage = 0.3; // Base damage
            stats.auraRadius = 200; // Base radius
            stats.auraTickRate = 200; // ms
        }
    },
    {
        id: 'electric_aura_damage',
        title: 'perk_electric_aura_damage_title',
        desc: 'perk_electric_aura_damage_desc',
        icon: '🌩️',
        theme: '#00ccff',
        apply: (stats) => {
            stats.auraDamage *= 1.5;
        }
    },
    {
        id: 'electric_aura_rate',
        title: 'perk_electric_aura_rate_title',
        desc: 'perk_electric_aura_rate_desc',
        icon: '⏱️',
        theme: '#0099ff',
        apply: (stats) => {
            stats.auraTickRate *= 0.8; // 20% faster
            if (stats.auraTickRate < 100) stats.auraTickRate = 100; // Cap
        }
    },
    {
        id: 'electric_aura_area',
        title: 'perk_electric_aura_area_title',
        desc: 'perk_electric_aura_area_desc',
        icon: '🌐',
        theme: '#00ffff',
        apply: (stats) => {
            stats.auraRadius *= 1.25; // 25% bigger
        }
    }
];