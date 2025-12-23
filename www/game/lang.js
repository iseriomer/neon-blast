// lang.js - Localization System

const Localization = {
    currentLang: 'tr',
    translations: {
        en: {
            // UI
            level: "Level",
            score: "Score",
            fps: "FPS",
            game_over: "GAME OVER",
            start_title: "NEON BLAST",
            start_desc: "Protect the center. Destroy enemies.<br>Fill the XP bar to EVOLVE.",
            start_btn: "START GAME",
            leaderboard_btn: "LEADERBOARD",
            resume_btn: "RESUME",
            loading: "Loading...",
            save_score: "SAVE SCORE",
            play_again: "PLAY AGAIN",
            back_btn: "BACK",
            enter_initials: "ENTER INITIALS",
            lb_monthly: "Monthly",
            lb_weekly: "Weekly",
            lb_all_time: "All Time",
            boss_coming: "WAVE {wave} - BOSS INCOMING!",
            choose_perk: "Choose a perk:",
            level_up: "LEVEL UP!",

            // Settings
            paused: "PAUSED",
            show_fps: "Show FPS",
            sfx: "SFX",
            music: "Music",
            joystick: "Joystick Mode",
            music_volume: "Music Volume",

            // Perks
            perk_rapid_fire_title: "Rapid Fire",
            perk_rapid_fire_desc: "Increases fire rate by 20%.",
            perk_machine_gun_title: "Machine Gun",
            perk_machine_gun_desc: "Greatly increases fire rate but less spread",
            perk_sniper_title: "Sniper Shot",
            perk_sniper_desc: "Increases bullet speed and piercing, decreases fire rate.",
            perk_double_shot_title: "Double Barrel",
            perk_double_shot_desc: "Fires +1 extra bullet per shot.",
            perk_freeze_title: "Frost Bite",
            perk_freeze_desc: "Slows down enemies on hit.",
            perk_knockback_title: "Knockback",
            perk_knockback_desc: "Bullets push enemies back.",
            perk_side_cannons_title: "Side Cannons",
            perk_side_cannons_desc: "Fires additional shots to the left and right.",
            perk_orbitals_title: "Orbital Shield",
            perk_orbitals_desc: "2 protective orbs orbit around you dealing damage.",
            perk_orbital_size_title: "Massive Orbitals",
            perk_orbital_size_desc: "Increases the size of Orbital Shields by 50%.",
            perk_screen_wrap_title: "Wormhole Bullets",
            perk_screen_wrap_desc: "Bullets wrap around the screen once.",
            perk_execute_title: "Executioner",
            perk_execute_desc: "Instantly destroys enemies below 20% HP.",
            perk_homing_title: "Homing Missiles",
            perk_homing_desc: "Bullets home in on nearby enemies.",
            perk_ricochet_title: "Ricochet",
            perk_ricochet_desc: "Bullets bounce off walls.",
            perk_split_shot_title: "Frag Shot",
            perk_split_shot_desc: "Bullets split into smaller pieces on impact.",
            perk_back_shot_title: "Rear Guard",
            perk_back_shot_desc: "Fires an additional bullet backwards.",
            perk_giant_bullet_title: "Cannonball",
            perk_giant_bullet_desc: "Bullets become 30% larger and easier to hit.",
            perk_shotgun_title: "Shotgun",
            perk_shotgun_desc: "Fires +2 more bullets but spreads more.",
            perk_chain_lightning_title: "Chain Lightning",
            perk_chain_lightning_desc: "Electricity arcs to 1 nearby enemy on hit.",
            perk_chain_lightning_count_title: "High Voltage",
            perk_chain_lightning_count_desc: "Lightning arcs to +1 more enemy.",
            perk_chain_lightning_damage_title: "Overload",
            perk_chain_lightning_damage_desc: "Increases lightning damage.",
            perk_explosive_shot_title: "Explosive Round",
            perk_explosive_shot_desc: "Deals area damage when destroying enemies.",
            perk_energy_shield_title: "Energy Shield",
            perk_energy_shield_desc: "Grants +1 Shield. Clears screen on break! (Max 2)",
            perk_laser_beam_title: "Orbital Laser",
            perk_laser_beam_desc: "Adds 2 rotating laser beams.",
            perk_singularity_title: "Singularity",
            perk_singularity_desc: "Spawns a black hole every 30s that sucks in enemies.",
            perk_critical_lens_title: "Critical Lens",
            perk_critical_lens_desc: "Increases Critical Chance by 10% and Critical Damage by 50%.",
            perk_laser_damage_title: "Focused Beam",
            perk_laser_damage_desc: "Increases Orbital Laser damage by %100.",
            perk_orbitals_desc_dynamic: "(Current: {value} protection) + 1 Orbital Shield.",
            perk_split_shot_desc_dynamic: "(Current: {value} fragments) + 1 Fragment on hit.",

            // Electric Aura
            perk_electric_aura_title: "Electric Aura",
            perk_electric_aura_desc: "Surrounds you with a damaging electric field.",
            perk_electric_aura_damage_title: "High Voltage",
            perk_electric_aura_damage_desc: "Increases Electric Aura damage by 50%.",
            perk_electric_aura_rate_title: "Rapid Discharge",
            perk_electric_aura_rate_desc: "Electric Aura ticks 20% faster.",
            perk_electric_aura_area_title: "Static Field",
            perk_electric_aura_area_desc: "Increases Electric Aura range by 25%.",
        },
        tr: {
            // UI
            level: "Seviye",
            score: "Skor",
            fps: "FPS",
            game_over: "OYUN BİTTİ",
            start_title: "NEON BLAST",
            start_desc: "Merkezi koru. Düşmanları yok et.<br>EVRİM GEÇİRMEK için XP çubuğunu doldur.",
            start_btn: "OYUNA BAŞLA",
            leaderboard_btn: "LİDER TABLOSU",
            resume_btn: "DEVAM ET",
            loading: "Yükleniyor...",
            save_score: "SKORU KAYDET",
            play_again: "TEKRAR OYNA",
            back_btn: "GERİ",
            enter_initials: "İSİM GİRİN",
            lb_monthly: "Aylık",
            lb_weekly: "Haftalık",
            lb_all_time: "Genel",
            boss_coming: "DALGA {wave} - BOSS GELİYOR!",
            choose_perk: "Bir güçlendirme seç:",
            level_up: "SEVİYE ATLADIN!",

            // Settings
            paused: "DURAKLATILDI",
            show_fps: "FPS Göster",
            sfx: "Ses Efektleri",
            music: "Müzik",
            joystick: "Joystick Modu",
            music_volume: "Müzik Sesi",

            // Perks
            perk_rapid_fire_title: "Seri Atış",
            perk_rapid_fire_desc: "Atış hızını %20 artırır.",
            perk_machine_gun_title: "Makineli Tüfek",
            perk_machine_gun_desc: "Atış hızını büyük ölçüde artırır ama isabeti azaltır.",
            perk_sniper_title: "Keskin Nişancı",
            perk_sniper_desc: "Mermi hızını ve delmeyi artırır, atış hızını düşürür.",
            perk_double_shot_title: "Çifte Namlu",
            perk_double_shot_desc: "Her atışta +1 fazla mermi atar.",
            perk_freeze_title: "Dondurmaca",
            perk_freeze_desc: "Düşmanları isabet halinde yavaşlatır.",
            perk_knockback_title: "Geri Tepme",
            perk_knockback_desc: "Mermiler düşmanları geri iter.",
            perk_side_cannons_title: "Yan Toplar",
            perk_side_cannons_desc: "Sola ve sağa ek atışlar yapar.",
            perk_orbitals_title: "Yörünge Kalkanı",
            perk_orbitals_desc: "Etrafınızda dönen ve hasar veren koruyucu 2 küre.",
            perk_orbital_size_title: "Devasa Yörüngeler",
            perk_orbital_size_desc: "Yörünge Kalkanlarının boyutunu %50 artırır.",
            perk_screen_wrap_title: "Solucan Deliği",
            perk_screen_wrap_desc: "Mermiler ekrandan bir kez seker.",
            perk_execute_title: "İnfazcı",
            perk_execute_desc: "Canı %20'nin altındaki düşmanları anında yok eder.",
            perk_homing_title: "Güdümlü Füzeler",
            perk_homing_desc: "Mermiler yakındaki düşmanlara kilitlenir.",
            perk_ricochet_title: "Sekme",
            perk_ricochet_desc: "Mermiler duvarlardan seker.",
            perk_split_shot_title: "Şarapnel Atışı",
            perk_split_shot_desc: "Mermiler çarpma anında daha küçük parçalara ayrılır.",
            perk_back_shot_title: "Arka Koruma",
            perk_back_shot_desc: "Arkaya doğru ek bir mermi atar.",
            perk_giant_bullet_title: "Gülle",
            perk_giant_bullet_desc: "Mermiler %30 büyür ve vurması kolaylaşır.",
            perk_shotgun_title: "Pompalı",
            perk_shotgun_desc: "+2 mermi atar ama dağılım artar.",
            perk_chain_lightning_title: "Elektrik",
            perk_chain_lightning_desc: "İsabet halinde elektrik yakındaki 1 düşmana sıçrar.",
            perk_chain_lightning_count_title: "Yüksek Voltaj",
            perk_chain_lightning_count_desc: "Elektrik +1 düşmana daha sıçrar.",
            perk_chain_lightning_damage_title: "Aşırı Yükleme",
            perk_chain_lightning_damage_desc: "Elektrik hasarını artırır.",
            perk_explosive_shot_title: "Patlayıcı Mermi",
            perk_explosive_shot_desc: "Düşmanları yok ederken alan hasarı verir.",
            perk_energy_shield_title: "Enerji Kalkanı",
            perk_energy_shield_desc: "+1 Kalkan sağlar. Kırıldığında ekranı temizler! (Maks 2)",
            perk_laser_beam_title: "Yörünge Lazeri",
            perk_laser_beam_desc: "Dönen iki lazer ışını ekler.",
            perk_singularity_title: "Karadelik",
            perk_singularity_desc: "Her 30 saniyede bir düşmanları içine çeken bir kara delik oluşturur.",
            perk_critical_lens_title: "Kritik Vuruş",
            perk_critical_lens_desc: "Kritik Şansını %10 ve Kritik Hasarı %50 artırır.",
            perk_laser_damage_title: "Odaklanmış Lazer",
            perk_laser_damage_desc: "Yörünge Lazeri hasarını %100 artırır.",
            perk_orbitals_desc_dynamic: "(Mevcut: {value} koruma) + 1 Yörünge Kalkanı.",
            perk_split_shot_desc_dynamic: "(Mevcut: {value} parça) + 1 Düşmanı parçalara ayırır.",

            // Electric Aura
            perk_electric_aura_title: "Elektrik Aurası",
            perk_electric_aura_desc: "Etrafınızı hasar veren bir elektrik alanı ile kaplar.",
            perk_electric_aura_damage_title: "Yüksek Gerilim",
            perk_electric_aura_damage_desc: "Elektrik Aurası hasarını %50 artırır.",
            perk_electric_aura_rate_title: "Hızlı Deşarj",
            perk_electric_aura_rate_desc: "Elektrik Aurası %20 daha hızlı hasar verir.",
            perk_electric_aura_area_title: "Statik Alan",
            perk_electric_aura_area_desc: "Elektrik Aurası menzilini %25 artırır.",
        },
        fr: {
            // UI
            level: "Niveau",
            score: "Score",
            fps: "FPS",
            game_over: "JEU TERMINÉ",
            start_title: "NEON BLAST",
            start_desc: "Protégez le centre. Détruisez les ennemis.<br>Remplissez la barre d'XP pour ÉVOLUER.",
            start_btn: "DÉMARRER",
            leaderboard_btn: "CLASSEMENT",
            resume_btn: "REPRENDRE",
            loading: "Chargement...",
            save_score: "SAUVEGARDER",
            play_again: "REJOUER",
            back_btn: "RETOUR",
            enter_initials: "INITIALES",
            lb_monthly: "Mensuel",
            lb_weekly: "Hebdomadaire",
            lb_all_time: "Toujours",
            boss_coming: "VAGUE {wave} - BOSS EN APPROCHE !",
            choose_perk: "Choisissez une amélioration :",
            level_up: "NIVEAU SUPÉRIEUR !",

            // Settings
            paused: "PAUSE",
            show_fps: "Afficher FPS",
            sfx: "Effets Sonores",
            music: "Musique",
            joystick: "Mode Joystick",
            music_volume: "Volume Musique",

            // Perks
            perk_rapid_fire_title: "Tir Rapide",
            perk_rapid_fire_desc: "Augmente la cadencé de 20%.",
            perk_machine_gun_title: "Mitrailleuse",
            perk_machine_gun_desc: "Augmente grandement la cadence mais réduit la précision.",
            perk_sniper_title: "Sniper",
            perk_sniper_desc: "Augmente vitesse et pénétration, réduit la cadence.",
            perk_double_shot_title: "Double Canon",
            perk_double_shot_desc: "Tire +1 projectile supplémentaire par coup.",
            perk_freeze_title: "Gel",
            perk_freeze_desc: "Ralentit les ennemis touchés.",
            perk_knockback_title: "Recul",
            perk_knockback_desc: "Les tirs repoussent les ennemis.",
            perk_side_cannons_title: "Canons Latéraux",
            perk_side_cannons_desc: "Tire des coups supplémentaires à gauche et à droite.",
            perk_orbitals_title: "Bouclier Orbital",
            perk_orbitals_desc: "2 boules protecteurs tourne autour de vous inflige des dégâts.",
            perk_orbital_size_title: "Orbites Massives",
            perk_orbital_size_desc: "Augmente la taille des Boucliers Orbitaux de 50%.",
            perk_screen_wrap_title: "Trou de Ver",
            perk_screen_wrap_desc: "Les tirs traversent l'écran une fois.",
            perk_execute_title: "Exécuteur",
            perk_execute_desc: "Détruit instantanément les ennemis sous 20% PV.",
            perk_homing_title: "Têtes Chercheuses",
            perk_homing_desc: "Les tirs cherchent les ennemis proches.",
            perk_ricochet_title: "Ricochet",
            perk_ricochet_desc: "Les tirs rebondissent sur les murs.",
            perk_split_shot_title: "Tir à Fragmentation",
            perk_split_shot_desc: "Les tirs se divisent en plus petits morceaux à l'impact.",
            perk_back_shot_title: "Arrière-Garde",
            perk_back_shot_desc: "Tire un projectile supplémentaire vers l'arrière.",
            perk_giant_bullet_title: "Boulet de Canon",
            perk_giant_bullet_desc: "Les tirs sont 30% plus gros et plus faciles à toucher.",
            perk_shotgun_title: "Fusil à Pompe",
            perk_shotgun_desc: "Tire +2 projectiles mais plus dispersés.",
            perk_chain_lightning_title: "Chaîne d'Éclairs",
            perk_chain_lightning_desc: "L'électricité saute sur 1 ennemi proche à l'impact.",
            perk_chain_lightning_count_title: "Haute Tension",
            perk_chain_lightning_count_desc: "L'éclair saute sur +1 ennemi supplémentaire.",
            perk_chain_lightning_damage_title: "Surcharge",
            perk_chain_lightning_damage_desc: "Augmente les dégâts des éclairs.",
            perk_explosive_shot_title: "Tir Explosif",
            perk_explosive_shot_desc: "Inflige des dégâts de zone en détruisant les ennemis.",
            perk_energy_shield_title: "Bouclier Énergétique",
            perk_energy_shield_desc: "Donne +1 Bouclier. Vide l'écran si brisé ! (Max 2)",
            perk_laser_beam_title: "Laser Orbital",
            perk_laser_beam_desc: "Ajoute 2 rayons laser rotatif.",
            perk_singularity_title: "Singularité",
            perk_singularity_desc: "Crée un trou noir toutes les 30s qui aspire les ennemis.",
            perk_critical_lens_title: "Lentille Critique",
            perk_critical_lens_desc: "Augmente la Chance Critique de 10% et les Dégâts Critiques de 50%.",
            perk_laser_damage_title: "Rayon Concentré",
            perk_laser_damage_desc: "Augmente les dégâts du Laser Orbital de 100%.",
            perk_orbitals_desc_dynamic: "(Actuel : {value} protection) + 1 Bouclier Orbital.",
            perk_split_shot_desc_dynamic: "(Actuel : {value} fragments) + 1 Fragment à l'impact.",
        }
    },

    init() {
        // Load saved language or default to user agent or 'en'
        const savedLang = localStorage.getItem('neonblast_lang');
        if (savedLang && this.translations[savedLang]) {
            this.currentLang = savedLang;
        } else {
            // Default check (could expand to check navigator.language)
            this.currentLang = 'tr'; // Setting Turkish as requested initial default or just 'tr' active
        }

        // Apply translations on load
        this.apply();
    },

    t(key, params = {}) {
        let text = this.translations[this.currentLang][key] || key;

        // Simple parameter replacement {param}
        for (const [param, value] of Object.entries(params)) {
            text = text.replace(`{${param}}`, value);
        }

        return text;
    },

    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('neonblast_lang', lang);
            this.apply();
        }
    },

    apply() {
        // Update document language for CSS text-transform (fixes i -> İ issue in English)
        document.documentElement.lang = this.currentLang;

        // Update static DOM elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (el.tagName === 'INPUT' && el.type === 'placeholder') {
                el.placeholder = this.t(key);
            } else {
                // Keep existing HTML structure if needed, but usually innerText replacement is safer unless we expect HTML
                // For start_desc we have <br>, so innerHTML is better there
                if (key === 'start_desc') {
                    el.innerHTML = this.t(key);
                } else {
                    el.innerText = this.t(key);
                }
            }
        });

        // Update specific dynamic elements if they exist
        if (typeof updateUIForLanguage === 'function') {
            updateUIForLanguage();
        }
    }
};

// Initialize manually if needed, or wait for   
Localization.init(); 
