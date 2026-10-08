// Gameplay funnel events. No remote collection without a player's explicit opt-in.
(() => {
    const consentKey = 'neonblast_analytics_consent_v1';
    const allowed = new Set(['run_start', 'run_resume', 'run_end', 'aim_learned', 'perk_picked', 'store_open', 'purchase_begin', 'purchase_granted', 'ad_request', 'ad_complete', 'ad_cancel']);
    const fields = new Set(['score', 'level', 'duration_seconds', 'kills', 'bosses', 'perk_count', 'perk_id', 'product_id', 'ad_type', 'reward_type']);
    let consent = false;
    let sender;
    try { consent = localStorage.getItem(consentKey) === '1'; } catch (_) {}
    const native = !!(window.Capacitor && window.Capacitor.isNativePlatform());
    const dev = !native && (new URLSearchParams(location.search).get('dev') === '1' || ['localhost', '127.0.0.1'].includes(location.hostname));
    const recent = [];
    window.GameTelemetry = {
        hasConsent: () => consent,
        setConsent(value) {
            consent = !!value;
            try { localStorage.setItem(consentKey, consent ? '1' : '0'); } catch (_) {}
            document.dispatchEvent(new CustomEvent('neonblast-analytics-consent', { detail: consent }));
        },
        setSender(callback) { sender = callback; },
        track(name, parameters = {}) {
            if (!allowed.has(name)) return;
            const safe = {};
            for (const [key, value] of Object.entries(parameters)) {
                if (!fields.has(key)) continue;
                if (typeof value === 'number' && Number.isFinite(value) && value >= 0) safe[key] = Math.round(value);
                else if (typeof value === 'string' && /^[a-zA-Z0-9_]{1,48}$/.test(value)) safe[key] = value;
            }
            if (dev) {
                recent.push({ name, parameters: safe });
                if (recent.length > 100) recent.shift();
            }
            if (consent && !dev && sender) {
                try { sender(name, safe); } catch (_) { /* Measurement never blocks play. */ }
            }
        },
        getDebugEvents: () => recent.map(event => ({ name: event.name, parameters: { ...event.parameters } }))
    };
})();
