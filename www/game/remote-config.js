// Dynamic imports keep Firebase/CDN failures out of the offline game startup.
(async () => {
    const balance = window.GameBalance;
    try {
        const [{ app }, sdk] = await Promise.all([
            import('./firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/12.6.0/firebase-remote-config.js')
        ]);
        if (!await sdk.isSupported()) throw new Error('Remote Config storage unavailable');
        const remote = sdk.getRemoteConfig(app);
        const dev = new URLSearchParams(location.search).get('dev') === '1';
        remote.settings.minimumFetchIntervalMillis = dev ? 0 : 3600000;
        remote.settings.fetchTimeoutMillis = 5000;
        remote.defaultConfig = { game_balance_v1: JSON.stringify(balance.defaults()), ...RemoteBalanceFields.sdkDefaults() };
        await sdk.ensureInitialized(remote);
        const read = () => {
            try {
                const value = RemoteBalanceFields.read(key => sdk.getValue(remote, key));
                // A default must never replace a previously validated offline cache.
                if (value) balance.stage(value, 'firebase');
            } catch (error) { balance.status.error = error.message; }
        };
        read();
        const refresh = async () => {
            await sdk.fetchAndActivate(remote);
            read();
            balance.status.fetch = 'ready';
            return balance.status;
        };
        balance.refresh = refresh;
        await refresh();
        // Returning to the menu is a convenient refresh opportunity; SDK throttles fetches.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && !gameState.gameActive) refresh().catch(() => { balance.status.fetch = 'offline'; });
        });
    } catch (error) {
        balance.status.fetch = 'offline';
        console.info('Remote Config: using local/cached balance.', error.message);
    }
})();
