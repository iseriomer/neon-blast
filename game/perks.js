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
        title: 'Mermi Manyağı',
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
        desc: 'Tek tıklamada +1 fazla mermi atarsın.', //bu perkin bir sınırı olsun max shotcount sayısı olsun yani, bu sayıya ulaşınca bu perk çıkamasın bidaha
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
        apply: (stats) => { stats.knockback += 5; } //knockback oyuncudan uzağa doğru olsun her zaman.
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
        apply: (stats) => { stats.orbitals += 1; } // orbitals olunca kaç tane yörünge koruma olacağını ayarlar. perk ekranında da örneğin "(şuanki yörünge koruma sayısı) + 1" yörünge koruma olarak yaz.
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
        desc: 'Vuruş noktasında patlayan mayınlar bırakır. (Tekrar alındığında sayısı artar)',
        apply: (stats) => {
            // Eğer daha önce alınmadıysa 0 kabul et, her alışta +1 ekle
            stats.clusterCount = (stats.clusterCount || 0) + 1;
        }
    },
    {
        id: 'homing',
        title: 'Güdümlü Mermi',
        desc: 'Mermilerin düşmanlara doğru kavis çizer.',
        apply: (stats) => {
            stats.homing += 0.1;
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
        apply: (stats) => { stats.splitShotCount += 1; } //bunu splitshot olunca kaç parçaya ayrılcağını ayarlamak için kullan perk ekranında da örneğin "(şuanki parça sayısı) + 1" parçaya ayrılır şeklinde yaz. 
    },
    {
        id: 'back_shot',
        title: 'Arka Koruma',
        desc: 'Ateş ettiğinde arkana da bir mermi atarsın.',
        apply: (stats) => { stats.backShot = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede.
    },
    {
        id: 'giant_bullet',
        title: 'Gülle Atışı',
        desc: 'Mermiler %30 büyür ve vurması kolaylaşır.',
        apply: (stats) => { stats.shotSize *= 1.3; }
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
        desc: 'Vuruş sonrası yakındaki 2 düşmana elektrik zıplar. (Aktifleşir)',
        apply: (stats) => {
            stats.chainLightning = 2;
            stats.chainLightningDamage = 1;
            stats.color = '#ffff00';
        }
    },
    {
        id: 'chain_lightning_count',
        title: 'Yüksek Voltaj',
        desc: 'Yıldırım 1 fazladan düşmana daha zıplar.',
        apply: (stats) => {
            stats.chainLightning += 1;
        }
    },
    {
        id: 'chain_lightning_damage',
        title: 'Aşırı Yükleme',
        desc: 'Yıldırım hasarını arttırır.',
        apply: (stats) => {
            stats.chainLightningDamage += 1;
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
            stats.color = '#ff0000';   //lazer ışını saat yönünde dönsün otomatik belli bir hızda. 1 kere alınırsa bidaha çıkmasın perk seçmede.
        }
    },
    {
        id: 'singularity',
        title: 'Singularite',
        desc: 'Her 30 saniyede bir kara delik oluşur! Düşmanları emer ve yok eder.',
        apply: (stats) => { stats.singularity = true; } //1 kere alınırsa bidaha çıkmasın perk seçmede. singularite sırasında yeni düşman spawn olmasın.
    },
    {
        id: 'critical_lens',
        title: 'Lazer Gözlük',
        desc: 'Mermilerin Kritik Vurma şansını %10, hasarını %50 arttırır.',
        apply: (stats) => {
            stats.critChance += 0.1;
            stats.critMultiplier += 0.5;
            stats.color = '#ff00ff'; // Morumsu lazer etkisi
        }
    },
    {
        id: 'poison_shot',
        title: 'Asit Yağmuru',
        desc: 'Mermiler zehirler (Yavaş hasar). (Alev ile alınamaz)',
        apply: (stats) => {
            stats.poison = true;
            stats.color = '#32cd32';
        }
    },
    {
        id: 'burn_shot',
        title: 'Alev Makinesi',
        desc: 'Mermiler yakar (Hızlı hasar). (Zehir ile alınamaz)',
        apply: (stats) => {
            stats.burn = true;
            stats.color = '#ff4500';
        }
    }
];