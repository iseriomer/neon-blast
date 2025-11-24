// perks.js - Perk System

const ALL_PERKS = [
    {
        id: 'rapid_fire',
        title: 'Seri Atış',
        desc: 'Atış hızın %20 artar.',
        apply: (stats) => { stats.fireRate *= 0.8; }
    },
    {
        id: 'machine_gun',
        title: 'Makineli Tüfek',
        desc: 'Atış hızı ÇOK artar ama isabet azalır.',
        apply: (stats) => { 
            stats.fireRate *= 0.5; 
            stats.spread += 0.2; 
            stats.color = '#ff00ff'; 
        }
    },
    {
        id: 'sniper',
        title: 'Nuri Yarra',
        desc: 'Mermi hızı ve hasarı artar, atış hızı düşer.',
        apply: (stats) => { 
            stats.shotSpeed *= 1.5; 
            stats.piercing += 2; 
            stats.fireRate *= 1.3; 
        }
    },
    {
        id: 'double_shot',
        title: 'Çift Namlu',
        desc: 'Tek tıklamada +1 fazla mermi atarsın.',
        apply: (stats) => { 
            stats.shotCount += 1; 
            stats.spread += 0.05; 
        }
    },
    {
        id: 'freeze',
        title: 'Buz Mermisi',
        desc: 'Vurulan düşmanlar kısa süre yavaşlar.',
        apply: (stats) => { 
            stats.freeze += 60; 
            stats.color = '#00ffff'; 
        }
    },
    {
        id: 'knockback',
        title: 'Geri Tepme',
        desc: 'Mermiler düşmanları geriye iter.',
        apply: (stats) => { stats.knockback += 5; }
    },
    {
        id: 'side_cannons',
        title: 'Yan Toplar',
        desc: 'Sağa ve sola da ateş edersin.',
        apply: (stats) => { stats.sideCannons = true; }
    },
    {
        id: 'orbitals',
        title: 'Yörünge Koruması',
        desc: 'Etrafında dönen ve düşmanlara hasar veren bir küre.',
        apply: (stats) => { stats.orbitals += 1; }
    },
    {
        id: 'screen_wrap',
        title: 'Portal Mermi',
        desc: 'Mermiler ekrandan çıkınca diğer taraftan girer (1 kez).',
        apply: (stats) => { stats.screenWrap = true; }
    },
    {
        id: 'execute',
        title: 'İnfazcı',
        desc: 'Canı %30\'un altındaki düşmanları tek atışta yok et.',
        apply: (stats) => { stats.execute = true; }
    },
    {
        id: 'cluster',
        title: 'Misket Bombası',
        desc: 'Patlamalar etrafa küçük bombalar saçar.',
        apply: (stats) => { stats.cluster = true; }
    },
    {
        id: 'homing',
        title: 'Güdümlü Mermi',
        desc: 'Mermilerin düşmanlara doğru kavis çizer.',
        apply: (stats) => { 
            stats.homing += 0.05; 
            stats.color = '#0f0'; 
        }
    },
    {
        id: 'ricochet',
        title: 'Seken Mermi',
        desc: 'Mermilerin duvarlardan seker.',
        apply: (stats) => { stats.ricochet += 1; }
    },
    {
        id: 'split_shot',
        title: 'Parça Tesirli',
        desc: 'Mermiler düşmana çarpınca küçük parçalara ayrılır.',
        apply: (stats) => { stats.splitShot = true; }
    },
    {
        id: 'back_shot',
        title: 'Arka Koruma',
        desc: 'Ateş ettiğinde arkana da bir mermi atarsın.',
        apply: (stats) => { stats.backShot = true; }
    },
    {
        id: 'giant_bullet',
        title: 'Gülle Atışı',
        desc: 'Mermiler %50 büyür ve vurması kolaylaşır.',
        apply: (stats) => { stats.shotSize *= 1.5; }
    },
    {
        id: 'shotgun',
        title: 'Pompalı',
        desc: 'Mermi sayısı +2 artar ama saçılma çok artar.',
        apply: (stats) => { 
            stats.shotCount += 2; 
            stats.spread += 0.15; 
        }
    },
    {
        id: 'chain_lightning',
        title: 'Yıldırım Zinciri',
        desc: 'Vuruş sonrası yakındaki 2 düşmana elektrik zıplar.',
        apply: (stats) => { 
            stats.chainLightning += 2; 
            stats.color = '#ffff00'; 
        }
    },
    {
        id: 'explosive_shot',
        title: 'Patlayıcı Mermi',
        desc: 'Düşman öldürünce alan hasarı verir.',
        apply: (stats) => { 
            stats.explosiveRadius += 80; 
            stats.color = '#ff6600'; 
        }
    },
    {
        id: 'energy_shield',
        title: 'Enerji Kalkanı',
        desc: 'Sana 1 kalkan verir. Vurulunca tüm ekranı temizler! (Max 2)',
        apply: (stats) => {
            if (stats.shield < stats.maxShields) {
                stats.shield += 1;
            }
        }
    },
    {
        id: 'laser_beam',
        title: 'Lazer Işını',
        desc: 'Sürekli hasar veren bir lazer ışını ekler.',
        apply: (stats) => { 
            stats.laserBeam = true; 
            stats.color = '#ff0000'; 
        }
    },
    {
        id: 'nuclear_bomb',
        title: 'Nükleer Bomba',
        desc: 'Her 10 saniyede bir devasa patlama! Tüm ekrana hasar.',
        apply: (stats) => { stats.nuclearBomb = true; }
    }
];