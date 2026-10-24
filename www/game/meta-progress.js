(() => {
    const key = 'neonblast_meta_v1', journalKey = 'neonblast_meta_transaction_v1';
    const definitions = {
        damage: { step: .06, max: 15, baseCost: 120 },
        speed: { step: .025, max: 15, baseCost: 150 },
        critical: { step: .01, max: 15, baseCost: 150 },
        automation: { step: .07, max: 15, baseCost: 120 }
    };
    let ranks = {};
    try {
        // Replay a pending absolute wallet + rank transaction before any UI purchase.
        const pending = JSON.parse(localStorage.getItem(journalKey));
        if (pending && Number.isFinite(pending.coins) && pending.coins >= 0 && pending.ranks) {
            localStorage.setItem(CosmeticsManager.COINS_KEY, String(pending.coins));
            localStorage.setItem(key, JSON.stringify(pending.ranks));
            CosmeticsManager.coins = pending.coins;
            localStorage.removeItem(journalKey);
        }
        ranks = JSON.parse(localStorage.getItem(key)) || {};
    } catch (_) {}
    if (!ranks || typeof ranks !== 'object' || Array.isArray(ranks)) ranks = {};
    for (const [id, def] of Object.entries(definitions)) ranks[id] = Number.isInteger(ranks[id]) ? Math.max(0, Math.min(def.max, ranks[id])) : 0;
    window.MetaProgress = {
        definitions,
        ranks() { return { ...ranks }; },
        cost(id) { return Math.round(definitions[id].baseCost * Math.pow(GameBalance.get('metaCostGrowth'), ranks[id])); },
        buy(id) {
            const def = definitions[id];
            if (!def || ranks[id] >= def.max || gameState.gameActive || (window.AdManager && AdManager.isAdPlaying)) return false;
            const cost = this.cost(id);
            if (CosmeticsManager.coins < cost) return false;
            const next = { ...ranks, [id]: ranks[id] + 1 }, coins = CosmeticsManager.coins - cost;
            try {
                localStorage.setItem(journalKey, JSON.stringify({ ranks: next, coins }));
                localStorage.setItem(CosmeticsManager.COINS_KEY, String(coins));
                localStorage.setItem(key, JSON.stringify(next));
                ranks = next; CosmeticsManager.coins = coins;
                localStorage.removeItem(journalKey);
            } catch (_) { return false; }
            CosmeticsManager.updateUI();
            if (window.MenuAudio) MenuAudio.play('reward');
            window.MainHub?.render();
            return true;
        },
        apply(stats) {
            stats.permanentDamageMultiplier = 1 + ranks.damage * definitions.damage.step;
            stats.damageMultiplier *= stats.permanentDamageMultiplier;
            stats.fireRate /= 1 + ranks.speed * definitions.speed.step;
            stats.critChance = Math.min(1, stats.critChance + ranks.critical * definitions.critical.step);
            stats.automationMultiplier = 1 + ranks.automation * definitions.automation.step;
        },
        passiveDamage(amount) { return amount * (gameState.playerStats.automationMultiplier || 1); }
    };
})();
