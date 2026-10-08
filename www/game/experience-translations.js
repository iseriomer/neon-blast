// Player-facing release additions, in the same six supported languages.
(() => {
    const rows = {
        player_options: ['YARDIM VE SEÇENEKLER', 'HELP & OPTIONS', 'AIDE ET OPTIONS', 'AYUDA Y OPCIONES', 'HILFE UND OPTIONEN', 'AIUTO E OPZIONI'],
        continue_saved: ['DEVAM ET', 'CONTINUE', 'CONTINUER', 'CONTINUAR', 'FORTSETZEN', 'CONTINUA'],
        perk_build_fit: ['UYUMLU', 'SYNERGY', 'SYNERGIE', 'SINERGIA', 'SYNERGIE', 'SINERGIA'],
        how_to_play: ['NASIL OYNANIR', 'HOW TO PLAY', 'COMMENT JOUER', 'CÓMO JUGAR', 'SO SPIELST DU', 'COME GIOCARE'],
        aim_touch: ['Basılı tut ve düşmanlara nişan al.', 'Hold your finger down and aim at enemies.', 'Maintiens ton doigt et vise les ennemis.', 'Mantén el dedo y apunta a los enemigos.', 'Halte den Finger gedrückt und ziele auf Gegner.', 'Tieni premuto e mira ai nemici.'],
        aim_mouse: ['Fareyi basılı tut ve düşmanlara nişan al.', 'Hold the mouse button and aim at enemies.', 'Maintiens le clic et vise les ennemis.', 'Mantén el clic y apunta a los enemigos.', 'Halte die Maustaste gedrückt und ziele auf Gegner.', 'Tieni premuto il mouse e mira ai nemici.'],
        core_stays: ['Çekirdek sabit kalır. Düşmanları merkeze ulaşmadan durdur.', 'Your core stays still. Stop enemies before they reach the center.', 'Le noyau reste immobile. Arrête les ennemis avant le centre.', 'Tu núcleo no se mueve. Detén a los enemigos antes del centro.', 'Dein Kern bleibt stehen. Stoppe Gegner vor der Mitte.', 'Il nucleo resta fermo. Ferma i nemici prima del centro.'],
        evolve_guide: ['XP çubuğunu doldur, bir geliştirme seç ve yeni kombinasyonlar dene.', 'Fill the XP bar, pick an upgrade and try new combinations.', 'Remplis la barre XP, choisis un bonus et combine les pouvoirs.', 'Llena la barra XP, elige una mejora y prueba combinaciones.', 'Fülle die XP-Leiste, wähle ein Upgrade und teste Kombinationen.', 'Riempi la barra XP, scegli un potenziamento e prova combinazioni.'],
        aim_short_touch: ['BASILI TUT · NİŞAN AL', 'HOLD · AIM', 'MAINTIENS · VISE', 'MANTÉN · APUNTA', 'HALTEN · ZIELEN', 'TIENI PREMUTO · MIRA'],
        aim_short_mouse: ['FAREYİ BASILI TUT · NİŞAN AL', 'HOLD CLICK · AIM', 'MAINTIENS LE CLIC · VISE', 'MANTÉN EL CLIC · APUNTA', 'MAUS HALTEN · ZIELEN', 'TIENI IL CLIC · MIRA'],
        new_record: ['YENİ REKOR', 'NEW BEST', 'NOUVEAU RECORD', 'NUEVO RÉCORD', 'NEUER REKORD', 'NUOVO RECORD'],
        record_gap: ['Rekoruna {n} puan kaldı', '{n} points from your best', 'À {n} points de ton record', 'A {n} puntos de tu récord', '{n} Punkte bis zu deinem Rekord', 'A {n} punti dal tuo record'],
        next_target: ['Sonraki hedef: {n}. seviye', 'Next target: level {n}', 'Prochain objectif : niveau {n}', 'Próximo objetivo: nivel {n}', 'Nächstes Ziel: Level {n}', 'Prossimo obiettivo: livello {n}'],
        run_kills: ['{n} DÜŞMAN', '{n} ENEMIES', '{n} ENNEMIS', '{n} ENEMIGOS', '{n} GEGNER', '{n} NEMICI'],
        options_sound: ['Ses efektleri', 'Sound effects', 'Effets sonores', 'Efectos de sonido', 'Soundeffekte', 'Effetti sonori'],
        analytics_choice: ['Oyunu geliştirmek için kullanım verilerini paylaş', 'Share usage data to help improve the game', 'Partager les données pour améliorer le jeu', 'Compartir datos para mejorar el juego', 'Nutzungsdaten zur Spielverbesserung teilen', 'Condividi dati per migliorare il gioco'],
        analytics_note: ['İsteğe bağlıdır. Oyun ve reklam tercihlerini etkilemez.', 'Optional. Your game and ad preferences are unaffected.', 'Facultatif. Le jeu et tes choix publicitaires restent identiques.', 'Opcional. No afecta al juego ni a tus preferencias de anuncios.', 'Optional. Spiel und Werbeauswahl bleiben unverändert.', 'Facoltativo. Non cambia il gioco o le preferenze pubblicitarie.'],
        privacy_policy: ['Gizlilik politikası', 'Privacy policy', 'Confidentialité', 'Privacidad', 'Datenschutz', 'Informativa sulla privacy'],
        ad_privacy_options: ['Reklam gizlilik tercihleri', 'Ad privacy choices', 'Choix de confidentialité des pubs', 'Privacidad de los anuncios', 'Werbe-Datenschutzauswahl', 'Privacy degli annunci'],
        restore_purchases: ['Satın almaları geri yükle', 'Restore purchases', 'Restaurer les achats', 'Restaurar compras', 'Käufe wiederherstellen', 'Ripristina acquisti'],
        restore_done: ['Satın alma kontrolü tamamlandı.', 'Purchase check complete.', 'Vérification des achats terminée.', 'Comprobación de compras completa.', 'Kaufprüfung abgeschlossen.', 'Verifica acquisti completata.'],
        restore_failed: ['Mağazaya bağlanılamadı. Tekrar dene.', 'Could not connect to the store. Try again.', 'Connexion à la boutique impossible. Réessaie.', 'No se pudo conectar a la tienda. Inténtalo de nuevo.', 'Store-Verbindung fehlgeschlagen. Versuche es erneut.', 'Connessione allo store non riuscita. Riprova.'],
        store_price_pending: ['MAĞAZAYA BAĞLANIYOR', 'CONNECTING TO STORE', 'CONNEXION À LA BOUTIQUE', 'CONECTANDO A LA TIENDA', 'STORE WIRD VERBUNDEN', 'CONNESSIONE ALLO STORE'],
        available_reward: ['ÖDÜL HAZIR', 'REWARD READY', 'RÉCOMPENSE PRÊTE', 'RECOMPENSA LISTA', 'BELOHNUNG BEREIT', 'PREMIO PRONTO']
    };
    for (const [key, values] of Object.entries(rows)) {
        ['tr', 'en', 'fr', 'es', 'de', 'it'].forEach((lang, i) => { Localization.translations[lang][key] = values[i]; });
    }
})();
