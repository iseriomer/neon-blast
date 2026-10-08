// Non-blocking first-run guidance and persistent player options.
(() => {
    const guideKey = 'neonblast_aim_learned_v1';
    const settingsKey = 'neonblast_settings_v1';
    const read = key => { try { return localStorage.getItem(key); } catch (_) { return null; } };
    const write = (key, value) => { try { localStorage.setItem(key, value); } catch (_) {} };
    const touch = () => window.matchMedia('(pointer: coarse)').matches;
    let pending = false;
    let hint;
    window.FirstRunGuide = {
        start() { pending = read(guideKey) !== '1'; },
        update(state) {
            if (!pending || state.isStarting || state.isDying || state.isPaused) return;
            if (!hint) {
                hint = document.createElement('div');
                hint.id = 'first-run-hint';
                hint.setAttribute('role', 'status');
                hint.textContent = Localization.t(touch() ? 'aim_short_touch' : 'aim_short_mouse');
                document.body.appendChild(hint);
            }
        },
        onAim() {
            if (!pending || (typeof gameState !== 'undefined' && gameState.isStarting)) return;
            pending = false;
            write(guideKey, '1');
            this.finish();
            if (window.GameTelemetry) GameTelemetry.track('aim_learned');
        },
        finish() { hint?.remove(); hint = null; pending = false; }
    };

    function persistSettings() {
        const settings = {};
        for (const id of ['sfx-toggle', 'music-toggle', 'music-volume', 'screenshake-toggle', 'joystick-toggle']) {
            const el = document.getElementById(id);
            if (el) settings[id] = el.type === 'range' ? Number(el.value) : el.checked;
        }
        write(settingsKey, JSON.stringify(settings));
    }
    window.PlayerOptions = {
        init() {
            if (typeof SaveManager !== 'undefined' && SaveManager.hasSave()) {
                const start = document.getElementById('start-btn');
                start.dataset.i18n = 'continue_saved';
                start.dataset.originalText = Localization.t('continue_saved');
                start.textContent = Localization.t('continue_saved');
            }
            try {
                const settings = JSON.parse(read(settingsKey) || '{}');
                for (const id of ['sfx-toggle', 'music-toggle', 'screenshake-toggle', 'joystick-toggle']) {
                    if (typeof settings[id] !== 'boolean') continue;
                    const el = document.getElementById(id);
                    el.checked = settings[id];
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (Number.isFinite(settings['music-volume'])) {
                    const el = document.getElementById('music-volume');
                    el.value = Math.max(0, Math.min(1, settings['music-volume']));
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                }
            } catch (_) {}
            document.addEventListener('change', event => {
                if (event.target.matches('#sfx-toggle, #music-toggle, #music-volume, #screenshake-toggle, #joystick-toggle')) persistSettings();
            });
            document.getElementById('player-options-btn').addEventListener('click', () => this.open());
            document.getElementById('player-options-close').addEventListener('click', () => this.close());
            document.getElementById('options-sfx-toggle').addEventListener('change', event => {
                const original = document.getElementById('sfx-toggle');
                original.checked = event.target.checked;
                original.dispatchEvent(new Event('change', { bubbles: true }));
                if (!original.checked && window.MenuAudio) MenuAudio.stop();
            });
            document.getElementById('analytics-choice').addEventListener('change', event => GameTelemetry.setConsent(event.target.checked));
            document.getElementById('ad-privacy-options').addEventListener('click', async () => {
                await AdManager.showPrivacyOptions();
            });
            document.getElementById('restore-purchases-btn').addEventListener('click', async event => {
                event.currentTarget.disabled = true;
                try { await PremiumStoreManager.restorePurchases(); }
                finally { document.getElementById('restore-purchases-btn').disabled = false; }
            });
            document.addEventListener('keydown', event => {
                const modal = document.getElementById('player-options-modal');
                if (modal.classList.contains('hidden')) return;
                if (event.key === 'Escape') this.close();
                if (event.key === 'Tab') {
                    const controls = [...modal.querySelectorAll('button:not(:disabled), a[href], input')].filter(el => el.getClientRects().length);
                    const first = controls[0], last = controls.at(-1);
                    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
                    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
                }
            });
        },
        open() {
            const modal = document.getElementById('player-options-modal');
            document.getElementById('options-sfx-toggle').checked = getSFXEnabled();
            document.getElementById('analytics-choice').checked = GameTelemetry.hasConsent();
            document.getElementById('ad-privacy-options').classList.toggle('hidden', !AdManager.privacyOptionsRequired);
            document.getElementById('restore-purchases-btn').classList.toggle('hidden', !AdManager.isNative());
            const instructions = document.getElementById('aim-instructions');
            instructions.dataset.i18n = touch() ? 'aim_touch' : 'aim_mouse';
            Localization.apply();
            modal.classList.remove('hidden');
            this.returnFocus = document.activeElement;
            document.getElementById('player-options-close').focus();
        },
        close() {
            document.getElementById('player-options-modal').classList.add('hidden');
            this.returnFocus?.focus();
        }
    };
})();
