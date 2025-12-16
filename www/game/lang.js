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
            perk_orbitals_desc: "A protective orb orbits around you dealing damage.",
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
            perk_chain_lightning_desc: "Electricity arcs to 2 nearby enemies on hit.",
            perk_chain_lightning_count_title: "High Voltage",
            perk_chain_lightning_count_desc: "Lightning arcs to +1 more enemy.",
            perk_chain_lightning_damage_title: "Overload",
            perk_chain_lightning_damage_desc: "Increases lightning damage.",
            perk_explosive_shot_title: "Explosive Round",
            perk_explosive_shot_desc: "Deals area damage when destroying enemies.",
            perk_energy_shield_title: "Energy Shield",
            perk_energy_shield_desc: "Grants +1 Shield. Clears screen on break! (Max 2)",
            perk_laser_beam_title: "Orbital Laser",
            perk_laser_beam_desc: "Adds a rotating laser beam. (Stackable)",
            perk_singularity_title: "Singularity",
            perk_singularity_desc: "Spawns a black hole every 30s that sucks in enemies.",
            perk_critical_lens_title: "Critical Lens",
            perk_critical_lens_desc: "Increases Critical Chance by 10% and Critical Damage by 50%.",
            perk_laser_damage_title: "Focused Beam",
            perk_laser_damage_desc: "Increases Orbital Laser damage by %100.",
            perk_orbitals_desc_dynamic: "(Current: {value} protection) + 1 Orbital Shield.",
            perk_split_shot_desc_dynamic: "(Current: {value} fragments) + 1 Fragment on hit.",
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
            perk_orbitals_desc: "Etrafınızda dönen ve hasar veren koruyucu bir küre.",
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
            perk_chain_lightning_desc: "İsabet halinde elektrik yakındaki 2 düşmana sıçrar.",
            perk_chain_lightning_count_title: "Yüksek Voltaj",
            perk_chain_lightning_count_desc: "Elektrik +1 düşmana daha sıçrar.",
            perk_chain_lightning_damage_title: "Aşırı Yükleme",
            perk_chain_lightning_damage_desc: "Elektrik hasarını artırır.",
            perk_explosive_shot_title: "Patlayıcı Mermi",
            perk_explosive_shot_desc: "Düşmanları yok ederken alan hasarı verir.",
            perk_energy_shield_title: "Enerji Kalkanı",
            perk_energy_shield_desc: "+1 Kalkan sağlar. Kırıldığında ekranı temizler! (Maks 2)",
            perk_laser_beam_title: "Yörünge Lazeri",
            perk_laser_beam_desc: "Dönen bir lazer ışını ekler. (Birikebilir)",
            perk_singularity_title: "Karadelik",
            perk_singularity_desc: "Her 30 saniyede bir düşmanları içine çeken bir kara delik oluşturur.",
            perk_critical_lens_title: "Kritik Vuruş",
            perk_critical_lens_desc: "Kritik Şansını %10 ve Kritik Hasarı %50 artırır.",
            perk_laser_damage_title: "Odaklanmış Lazer",
            perk_laser_damage_desc: "Yörünge Lazeri hasarını %100 artırır.",
            perk_orbitals_desc_dynamic: "(Mevcut: {value} koruma) + 1 Yörünge Kalkanı.",
            perk_split_shot_desc_dynamic: "(Mevcut: {value} parça) + 1 Düşmanı parçalara ayırır.",
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
