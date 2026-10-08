// Presentation only. No combat state, reward amount or purchase flow lives here.
(() => {
    const copy = {
        tr: ['Merkezi koru.<br>Evrim geçir.', 'EN İYİ SKOR', 'ÇEKİRDEK', 'YENİ TASARIM', 'Tüm görevleri tamamla', 'PAKET İÇERİĞİ'],
        en: ['Protect the center.<br>Evolve.', 'BEST SCORE', 'CORE', 'NEW DESIGN', 'Complete all quests', 'PACK CONTENTS'],
        fr: ['Protège le centre.<br>Évolue.', 'MEILLEUR SCORE', 'NOYAU', 'NOUVEAU DESIGN', 'Termine toutes les missions', 'CONTENU DU PACK'],
        es: ['Protege el centro.<br>Evoluciona.', 'MEJOR PUNTUACIÓN', 'NÚCLEO', 'NUEVO DISEÑO', 'Completa todas las misiones', 'CONTENIDO DEL PAQUETE'],
        de: ['Schütze das Zentrum.<br>Entwickle dich.', 'BESTER PUNKTSTAND', 'KERN', 'NEUES DESIGN', 'Schließe alle Aufgaben ab', 'PAKETINHALT'],
        it: ['Proteggi il centro.<br>Evolvi.', 'MIGLIOR PUNTEGGIO', 'NUCLEO', 'NUOVO DESIGN', 'Completa tutte le missioni', 'CONTENUTO DEL PACCHETTO']
    };
    const keys = ['menu_tagline', 'menu_best_score', 'menu_tab_cores', 'menu_new_design', 'menu_quest_remaining', 'menu_pack_contents'];
    for (const [lang, values] of Object.entries(copy)) {
        keys.forEach((key, index) => { Localization.translations[lang][key] = values[index]; });
    }
    let result = null;
    window.MenuUI = {
        renderResults(score, level) {
            let best = score;
            let previousBest = 0;
            try {
                previousBest = Number(localStorage.getItem('neonblast_best_score')) || 0;
                best = Math.max(score, previousBest);
                localStorage.setItem('neonblast_best_score', String(best));
            } catch (_) { /* Scores still render when storage is unavailable. */ }
            const state = typeof gameState !== 'undefined' ? gameState : {};
            result = { score, level, best, previousBest, duration: Math.floor((state.activeRunMs || 0) / 1000), kills: state.totalEnemiesKilled || 0 };
            this.update();
        },
        update() {
            document.querySelectorAll('.menu-languages button').forEach(button => {
                button.setAttribute('aria-pressed', String(button.textContent.trim().toLowerCase() === Localization.currentLang));
            });
            const tagline = document.querySelector('[data-i18n="menu_tagline"]');
            if (tagline) tagline.innerHTML = Localization.t('menu_tagline');
            if (result) {
                document.getElementById('final-score').textContent = result.score.toLocaleString(Localization.currentLang);
                document.getElementById('result-level-value').textContent = result.level;
                document.getElementById('result-best-value').textContent = result.best.toLocaleString(Localization.currentLang);
                const minutes = Math.floor(result.duration / 60);
                const seconds = String(result.duration % 60).padStart(2, '0');
                const isRecord = result.score > result.previousBest;
                const nextTarget = Math.floor(result.level / 5) * 5 + 5;
                const message = isRecord ? Localization.t('new_record')
                    : result.previousBest > 0 && result.score >= result.previousBest * .8
                        ? Localization.t('record_gap', { n: (result.previousBest - result.score).toLocaleString(Localization.currentLang) })
                        : Localization.t('next_target', { n: nextTarget });
                const detail = document.getElementById('result-run-detail');
                if (detail) {
                    detail.replaceChildren();
                    const stats = document.createElement('span');
                    stats.textContent = `${minutes}:${seconds} · ${Localization.t('run_kills', { n: result.kills.toLocaleString(Localization.currentLang) })}`;
                    const target = document.createElement('span');
                    target.textContent = message;
                    if (isRecord) target.className = 'record';
                    detail.append(stats, document.createElement('br'), target);
                }
            }
        }
    };
    const previousUpdate = window.updateUIForLanguage;
    window.updateUIForLanguage = function () {
        if (previousUpdate) previousUpdate();
        MenuUI.update();
    };
    // Preserve the existing six languages while keeping only the selected one cyan.
    Localization.apply();
    for (const filter of ['all', 'monthly', 'weekly']) {
        document.getElementById('lb-filter-' + filter).addEventListener('click', () => {
            document.querySelectorAll('#leaderboard-screen .filter-btn').forEach(button => button.classList.toggle('active', button.id === 'lb-filter-' + filter));
        });
    }
    document.getElementById('lb-filter-all').classList.add('active');
    const icons = {
        'daily-rewards-btn': '<path d="M3 10h18v11H3zM2 6h20v4H2zM12 6v15M12 6C5-2 1 6 12 6ZM12 6C19-2 23 6 12 6Z"/>',
        'lucky-spin-btn': '<circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20M5 5l14 14M5 19L19 5"/>',
        'daily-quests-btn': '<rect x="4" y="4" width="16" height="18" rx="1"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M8 10h8M8 14h8M8 18h6"/>'
    };
    for (const [id, paths] of Object.entries(icons)) {
        document.querySelector('#' + id + ' .engage-icon-slot').innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">${paths}</svg>`;
    }
})();
