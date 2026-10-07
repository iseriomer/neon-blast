// Store and cosmetic copy. Columns: English, Turkish, French, Spanish, German, Italian.
// Keep identifiers separate from translated display text.
(() => {
    const languages = ['en', 'tr', 'fr', 'es', 'de', 'it'];
    const rows = `
rarity_common|COMMON|YAYGIN|COMMUN|COMÚN|GEWÖHNLICH|COMUNE
rarity_rare|RARE|NADİR|RARE|RARO|SELTEN|RARO
rarity_epic|EPIC|DESTANSI|ÉPIQUE|ÉPICO|EPISCH|EPICO
rarity_legendary|LEGENDARY|EFSANEVİ|LÉGENDAIRE|LEGENDARIO|LEGENDÄR|LEGGENDARIO
rarity_premium|PREMIUM|PREMIUM|PREMIUM|PRÉMIUM|PREMIUM|PREMIUM
category_core|CORE|ÇEKİRDEK|NOYAU|NÚCLEO|KERN|NUCLEO
category_projectile|PROJECTILE|MERMİ|PROJECTILE|PROYECTIL|PROJEKTIL|PROIETTILE
category_background|BACKGROUND|ARKA PLAN|ARRIÈRE-PLAN|FONDO|HINTERGRUND|SFONDO
category_design|NEW DESIGN|YENİ TASARIM|NOUVEAU DESIGN|NUEVO DISEÑO|NEUES DESIGN|NUOVO DESIGN
currency_name|Neon Coins|Neon Coin|Pièces néon|Monedas neón|Neon-Münzen|Monete neon
currency_count|{count} Neon Coins|{count} Neon Coin|{count} pièces néon|{count} monedas neón|{count} Neon-Münzen|{count} monete neon
coins_added|+{count} Neon Coins added|+{count} Neon Coin eklendi|+{count} pièces néon ajoutées|+{count} monedas neón añadidas|+{count} Neon-Münzen erhalten|+{count} monete neon aggiunte
ad_incomplete|Ad not completed. No reward granted.|Reklam tamamlanmadı, ödül verilmedi.|Publicité incomplète. Aucune récompense.|Anuncio incompleto. Sin recompensa.|Werbung nicht abgeschlossen. Keine Belohnung.|Pubblicità incompleta. Nessuna ricompensa.
free_pack_opening|Opening free crate|Ücretsiz sandık açılıyor|Ouverture du coffre gratuit|Abriendo cofre gratis|Kostenlose Kiste wird geöffnet|Apertura del forziere gratuito
pack_open_failed|Unable to open crate.|Sandık açılamadı.|Impossible d’ouvrir le coffre.|No se pudo abrir el cofre.|Kiste konnte nicht geöffnet werden.|Impossibile aprire il forziere.
invalid_pack|Invalid crate.|Geçersiz sandık.|Coffre invalide.|Cofre no válido.|Ungültige Kiste.|Forziere non valido.
insufficient_coins|Not enough Neon Coins!|Yetersiz Neon Coin!|Pas assez de pièces néon !|¡No tienes suficientes monedas neón!|Nicht genug Neon-Münzen!|Monete neon insufficienti!
pack_decrypting|DECRYPTING…|KİLİT ÇÖZÜLÜYOR…|DÉCRYPTAGE…|DESCIFRANDO…|ENTSCHLÜSSELUNG…|DECIFRAZIONE…
store_guaranteed|GUARANTEED CONTENT|GÜVENCELİ İÇERİK|CONTENU GARANTI|CONTENIDO GARANTIZADO|GARANTIERTE INHALTE|CONTENUTO GARANTITO
store_economy|COINS|EKONOMİ|MONNAIE|MONEDAS|MÜNZEN|MONETE
badge_bonus_20|20% BONUS|%20 BONUS|BONUS DE 20 %|20 % EXTRA|20 % BONUS|BONUS DEL 20 %
benefit_no_interstitials|No interstitial ads|Geçiş reklamı yok|Aucune publicité interstitielle|Sin anuncios intersticiales|Keine Zwischenwerbung|Nessuna pubblicità interstiziale
benefit_bonus_coins|+100 coins per game|Her oyun +100 coin|+100 pièces par partie|+100 monedas por partida|+100 Münzen pro Spiel|+100 monete a partita
benefit_vip_badge|VIP leaderboard badge|Liderlik tablosunda VIP rozeti|Badge VIP au classement|Insignia VIP en la clasificación|VIP-Abzeichen in der Rangliste|Distintivo VIP in classifica
benefit_rerolls|Unlimited free rerolls|Sınırsız ücretsiz yeniden seçim|Relances gratuites illimitées|Cambios gratis ilimitados|Unbegrenzt kostenlos neu wählen|Nuove scelte gratuite illimitate
benefit_gold_crate|1 Gold Crate|1 Altın Sandık|1 coffre en or|1 cofre de oro|1 Goldkiste|1 forziere d’oro
benefit_dragon_core|Exclusive Neon Dragon core|Özel Neon Ejderha çekirdeği|Noyau Dragon néon exclusif|Núcleo Dragón neón exclusivo|Exklusiver Neon-Drachen-Kern|Nucleo Drago neon esclusivo
benefit_storm_projectile|Plasma Storm projectile|Plazma Fırtınası mermisi|Projectile Tempête de plasma|Proyectil Tormenta de plasma|Plasmasturm-Projektil|Proiettile Tempesta al plasma
benefit_cyber_background|Cyber City background|Siber Şehir arka planı|Fond Ville cybernétique|Fondo Ciudad cibernética|Cyberstadt-Hintergrund|Sfondo Città cibernetica
purchase_cancelled|Purchase cancelled|Satın alma iptal edildi|Achat annulé|Compra cancelada|Kauf abgebrochen|Acquisto annullato
store_connecting|Connecting to Google Play. Please try again.|Google Play bağlantısı kuruluyor. Lütfen tekrar deneyin.|Connexion à Google Play. Réessayez.|Conectando con Google Play. Inténtalo de nuevo.|Verbindung zu Google Play. Bitte erneut versuchen.|Connessione a Google Play. Riprova.
purchase_native_only|Purchases are available in the Google Play app.|Satın alma yalnızca Google Play uygulamasında kullanılabilir.|Les achats sont disponibles dans l’application Google Play.|Las compras están disponibles en la app de Google Play.|Käufe sind in der Google-Play-App verfügbar.|Gli acquisti sono disponibili nell’app di Google Play.
purchase_test|Test purchase (web simulation)|Test satın alma (web simülasyonu)|Achat de test (simulation web)|Compra de prueba (simulación web)|Testkauf (Websimulation)|Acquisto di prova (simulazione web)
purchase_completed|{name} purchased!|{name} satın alındı!|{name} acheté !|¡{name} comprado!|{name} gekauft!|{name} acquistato!
coin_product_desc|Buy {count} Neon Coins.|{count} Neon Coin satın al.|Achetez {count} pièces néon.|Compra {count} monedas neón.|Kaufe {count} Neon-Münzen.|Acquista {count} monete neon.
daily_claimed|Reward claimed: {reward}|Ödül alındı: {reward}|Récompense reçue : {reward}|Recompensa recibida: {reward}|Belohnung erhalten: {reward}|Ricompensa ricevuta: {reward}
daily_doubled|2X reward claimed: {reward}|2X ödül alındı: {reward}|Récompense x2 reçue : {reward}|Recompensa x2 recibida: {reward}|Doppelte Belohnung erhalten: {reward}|Ricompensa x2 ricevuta: {reward}
ad_loading|LOADING AD…|REKLAM YÜKLENİYOR…|CHARGEMENT DE LA PUBLICITÉ…|CARGANDO ANUNCIO…|WERBUNG WIRD GELADEN…|CARICAMENTO PUBBLICITÀ…
ad_unavailable|Ad unavailable. Please try again.|Reklam şu an kullanılamıyor. Lütfen tekrar deneyin.|Publicité indisponible. Réessayez.|Anuncio no disponible. Inténtalo de nuevo.|Werbung nicht verfügbar. Bitte erneut versuchen.|Pubblicità non disponibile. Riprova.
ad_test_desc|This is a test ad.|Bu bir test reklamıdır.|Ceci est une publicité de test.|Este es un anuncio de prueba.|Dies ist eine Testwerbung.|Questa è una pubblicità di prova.
please_wait|Please wait…|Bekleyin…|Veuillez patienter…|Espera…|Bitte warten…|Attendi…
cancel_action|CANCEL|İPTAL|ANNULER|CANCELAR|ABBRECHEN|ANNULLA
collect_reward|COLLECT REWARD|ÖDÜLÜ AL|RÉCUPÉRER|RECOGER RECOMPENSA|BELOHNUNG ABHOLEN|RITIRA RICOMPENSA
continue_action|CONTINUE|DEVAM|CONTINUER|CONTINUAR|WEITER|CONTINUA
system_reboot|SYSTEM REBOOT…|SİSTEM YENİDEN BAŞLATILIYOR…|REDÉMARRAGE DU SYSTÈME…|REINICIANDO SISTEMA…|SYSTEMNEUSTART…|RIAVVIO DEL SISTEMA…
system_online|ONLINE|ÇEVRİMİÇİ|EN LIGNE|EN LÍNEA|ONLINE|ONLINE
coins_doubled_amount|+{count} (2X BONUS!)|+{count} (2X BONUS!)|+{count} (BONUS X2 !)|+{count} (¡BONUS X2!)|+{count} (DOPPELTER BONUS!)|+{count} (BONUS X2!)
cosmetic_core_default_name|Classic Neon|Klasik Neon|Néon classique|Neón clásico|Klassisches Neon|Neon classico
cosmetic_core_default_desc|Standard neon energy core.|Standart neon enerji çekirdeği.|Noyau d’énergie néon standard.|Núcleo de energía neón estándar.|Standard-Neonenergiekern.|Nucleo energetico neon standard.
cosmetic_core_prism_name|Crystal Prism|Kristal Prizma|Prisme de cristal|Prisma de cristal|Kristallprisma|Prisma di cristallo
cosmetic_core_prism_desc|Rotating crystal prism armor.|Dönen prizma kristal zırhı.|Armure de cristal prismatique tournante.|Armadura de prisma de cristal giratorio.|Rotierende Kristallprisma-Rüstung.|Armatura di cristallo prismatico rotante.
cosmetic_core_pulsar_name|Pulsar Star|Pulsar Yıldızı|Étoile pulsar|Estrella púlsar|Pulsarstern|Stella pulsar
cosmetic_core_pulsar_desc|Twin orbital ring effect.|Çift yörünge halkası efekti.|Deux anneaux orbitaux.|Dos anillos orbitales.|Zwei Orbitalringe.|Due anelli orbitali.
cosmetic_core_singularity_name|Purple Black Hole|Mor Kara Delik|Trou noir violet|Agujero negro violeta|Violettes schwarzes Loch|Buco nero viola
cosmetic_core_singularity_desc|Swirling purple gravity field.|Girdaplı mor çekim alanı.|Champ gravitationnel violet tourbillonnant.|Campo gravitatorio violeta en espiral.|Wirbelndes violettes Schwerkraftfeld.|Campo gravitazionale viola vorticoso.
cosmetic_core_chrono_name|Time Wheel|Zaman Çarkı|Roue du temps|Rueda del tiempo|Zeitrad|Ruota del tempo
cosmetic_core_chrono_desc|Golden clockwork and hands.|Altın saat mekanizması ve ibreler.|Mécanisme et aiguilles d’horloge dorés.|Mecanismo y agujas de reloj dorados.|Goldenes Uhrwerk und Zeiger.|Meccanismo e lancette dorati.
cosmetic_core_glitch_name|Cyber Glitch|Siber Glitch|Bug cybernétique|Fallo cibernético|Cyberstörung|Distorsione cibernetica
cosmetic_core_glitch_desc|Chromatic pixel displacement.|Kromatik piksel kayması.|Décalage chromatique des pixels.|Desplazamiento cromático de píxeles.|Chromatische Pixelverschiebung.|Spostamento cromatico dei pixel.
cosmetic_core_solar_name|Solar Flare|Güneş Alevi|Éruption solaire|Llamarada solar|Sonnenflamme|Eruzione solare
cosmetic_core_solar_desc|Flaming ember ring.|Alevli kor halkası.|Anneau de braises enflammé.|Anillo de brasas ardientes.|Flammender Glutring.|Anello di braci ardenti.
cosmetic_proj_default_name|Standard Shot|Standart Atış|Tir standard|Disparo estándar|Standardschuss|Colpo standard
cosmetic_proj_default_desc|Classic neon energy spheres.|Klasik neon enerji küreleri.|Sphères d’énergie néon classiques.|Esferas clásicas de energía neón.|Klassische Neonenergiekugeln.|Sfere classiche di energia neon.
cosmetic_proj_laser_name|Laser Beam|Lazer Işını|Rayon laser|Rayo láser|Laserstrahl|Raggio laser
cosmetic_proj_laser_desc|Continuous neon laser lines.|Kesintisiz neon lazer çizgileri.|Lignes laser néon continues.|Líneas continuas de láser neón.|Durchgehende Neonlaserlinien.|Linee laser neon continue.
cosmetic_proj_plasma_name|Plasma Ring|Plazma Halkası|Anneau de plasma|Anillo de plasma|Plasmaring|Anello al plasma
cosmetic_proj_plasma_desc|Ring-shaped plasma shots.|Halka biçimli plazma atışları.|Tirs de plasma en anneau.|Disparos de plasma en anillo.|Ringförmige Plasmaschüsse.|Colpi al plasma ad anello.
cosmetic_proj_shuriken_name|Ninja Star|Ninja Yıldızı|Étoile ninja|Estrella ninja|Ninjastern|Stella ninja
cosmetic_proj_shuriken_desc|Rotating four-point cyber stars.|Dönen dört köşeli siber yıldızlar.|Étoiles cybernétiques tournantes à quatre branches.|Estrellas cibernéticas giratorias de cuatro puntas.|Rotierende vierzackige Cybersterne.|Stelle cibernetiche rotanti a quattro punte.
cosmetic_proj_pixel_name|8-Bit Pixel|8-Bit Piksel|Pixel 8 bits|Píxel de 8 bits|8-Bit-Pixel|Pixel a 8 bit
cosmetic_proj_pixel_desc|Retro square pixel shots.|Retro kare piksel atışları.|Tirs rétro en pixels carrés.|Disparos retro de píxeles cuadrados.|Quadratische Retro-Pixelschüsse.|Colpi retrò di pixel quadrati.
cosmetic_proj_void_name|Dark Arrow|Karanlık Ok|Flèche sombre|Flecha oscura|Dunkler Pfeil|Freccia oscura
cosmetic_proj_void_desc|Purple dark matter arrows.|Mor karanlık madde okları.|Flèches violettes de matière noire.|Flechas violetas de materia oscura.|Violette Dunkelmaterie-Pfeile.|Frecce viola di materia oscura.
cosmetic_bg_nebula_name|Deep Space|Derin Uzay|Espace profond|Espacio profundo|Tiefer Weltraum|Spazio profondo
cosmetic_bg_nebula_desc|Classic starry deep space.|Klasik yıldızlı derin uzay.|Espace profond étoilé classique.|Espacio profundo estrellado clásico.|Klassischer sternenreicher Weltraum.|Spazio profondo stellato classico.
cosmetic_bg_synthgrid_name|Synthwave Dawn|Synthwave Şafak|Aube synthwave|Amanecer synthwave|Synthwave-Morgendämmerung|Alba synthwave
cosmetic_bg_synthgrid_desc|Retro neon dusk and purple sunset nebula.|Retro neon alacakaranlık ve mor günbatımı nebulası.|Crépuscule néon rétro et nébuleuse violette.|Crepúsculo neón retro y nebulosa violeta.|Retro-Neondämmerung und violetter Nebel.|Crepuscolo neon retrò e nebulosa viola.
cosmetic_bg_digitalrain_name|Cyber Mist|Siber Sis|Brume cybernétique|Niebla cibernética|Cybernebel|Nebbia cibernetica
cosmetic_bg_digitalrain_desc|Emerald and cyan cyber mist nebula.|Zümrüt ve camgöbeği siber sis nebulası.|Nébuleuse cybernétique émeraude et cyan.|Nebulosa cibernética esmeralda y cian.|Smaragdgrüner und cyanfarbener Cybernebel.|Nebulosa cibernetica smeraldo e ciano.
cosmetic_bg_hyperspace_name|Light-Speed Tunnel|Işık Hızı Tüneli|Tunnel à vitesse lumière|Túnel de velocidad de la luz|Lichtgeschwindigkeitstunnel|Tunnel alla velocità della luce
cosmetic_bg_hyperspace_desc|Cobalt and sapphire cosmic flow nebula.|Kobalt ve safir kozmik akış bulutsusu.|Nébuleuse cosmique cobalt et saphir.|Nebulosa cósmica cobalto y zafiro.|Kobaltblauer und saphirfarbener kosmischer Nebel.|Nebulosa cosmica cobalto e zaffiro.
cosmetic_core_dragon_name|Neon Dragon|Neon Ejderha|Dragon néon|Dragón neón|Neon-Drache|Drago neon
cosmetic_core_dragon_desc|Fire-breathing neon dragon core. Premium exclusive.|Ateş soluyan neon ejderha çekirdeği. Premium özel.|Noyau Dragon néon cracheur de feu. Exclusivité premium.|Núcleo de dragón neón que escupe fuego. Exclusivo prémium.|Feuerspeiender Neon-Drachen-Kern. Premium-exklusiv.|Nucleo Drago neon sputafuoco. Esclusiva premium.
cosmetic_core_aurora_name|Northern Lights|Kuzey Işıkları|Aurore boréale|Aurora boreal|Nordlicht|Aurora boreale
cosmetic_core_aurora_desc|Aurora borealis effect. Premium exclusive.|Kuzey ışıkları efekti. Premium özel.|Effet d’aurore boréale. Exclusivité premium.|Efecto de aurora boreal. Exclusivo prémium.|Nordlichteffekt. Premium-exklusiv.|Effetto aurora boreale. Esclusiva premium.
cosmetic_core_void_king_name|Void King|Boşluk Kralı|Roi du vide|Rey del vacío|König der Leere|Re del vuoto
cosmetic_core_void_king_desc|Dark matter crown effect. Premium exclusive.|Karanlık madde taç efekti. Premium özel.|Couronne de matière noire. Exclusivité premium.|Corona de materia oscura. Exclusivo prémium.|Dunkelmaterie-Krone. Premium-exklusiv.|Corona di materia oscura. Esclusiva premium.
cosmetic_proj_storm_name|Plasma Storm|Plazma Fırtınası|Tempête de plasma|Tormenta de plasma|Plasmasturm|Tempesta al plasma
cosmetic_proj_storm_desc|Electric plasma waves. Premium exclusive.|Elektrikli plazma dalgaları. Premium özel.|Vagues de plasma électrique. Exclusivité premium.|Ondas de plasma eléctrico. Exclusivo prémium.|Elektrische Plasmawellen. Premium-exklusiv.|Onde di plasma elettrico. Esclusiva premium.
cosmetic_proj_phoenix_name|Phoenix|Anka Kuşu|Phénix|Fénix|Phönix|Fenice
cosmetic_proj_phoenix_desc|Fire trails. Premium exclusive.|Alev izleri. Premium özel.|Traînées de feu. Exclusivité premium.|Estelas de fuego. Exclusivo prémium.|Feuerspuren. Premium-exklusiv.|Scie di fuoco. Esclusiva premium.
cosmetic_bg_cybercity_name|Cyber City|Siber Şehir|Ville cybernétique|Ciudad cibernética|Cyberstadt|Città cibernetica
cosmetic_bg_cybercity_desc|Amber and purple Neo-Tokyo nebula. Premium exclusive.|Kehribar ve mor Neo-Tokyo nebulası. Premium özel.|Nébuleuse Néo-Tokyo ambre et violette. Exclusivité premium.|Nebulosa Neo-Tokio ámbar y violeta. Exclusivo prémium.|Bernsteinfarbener und violetter Neo-Tokio-Nebel. Premium-exklusiv.|Nebulosa Neo-Tokyo ambra e viola. Esclusiva premium.
cosmetic_bg_void_realm_name|Void Realm|Boşluk Diyarı|Royaume du vide|Reino del vacío|Reich der Leere|Regno del vuoto
cosmetic_bg_void_realm_desc|Amethyst cosmic void. Premium exclusive.|Ametist kozmik boşluk. Premium özel.|Vide cosmique améthyste. Exclusivité premium.|Vacío cósmico amatista. Exclusivo prémium.|Amethystfarbene kosmische Leere. Premium-exklusiv.|Vuoto cosmico ametista. Esclusiva premium.
`;
    for (const row of rows.trim().split('\n')) {
        const [key, ...values] = row.split('|');
        if (values.length !== languages.length) throw new Error(`Incomplete translation: ${key}`);
        languages.forEach((language, index) => {
            Localization.translations[language][key] = values[index];
        });
    }
    Localization.apply();
})();
