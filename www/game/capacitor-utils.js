// game/capacitor-utils.js

const CapacitorUtils = {
    async init() {
        console.log('[Capacitor] Initializing...');

        // Check if running in Capacitor environment
        if (typeof window.Capacitor === 'undefined') {
            console.log('[Capacitor] Not running in Capacitor environment.');
            return;
        }

        try {
            await this.hideStatusBar();
            await this.hideNavigationBar();

            // Add listeners to keep immersive mode active
            this.addListeners();

            console.log('[Capacitor] Initialization complete.');
        } catch (error) {
            console.error('[Capacitor] Initialization failed:', error);
        }
    },

    async hideStatusBar() {
        try {
            const { StatusBar } = window.Capacitor.Plugins;
            if (StatusBar) {
                await StatusBar.hide();
                await StatusBar.setOverlaysWebView({ overlay: true });
                console.log('[Capacitor] Status Bar hidden.');
            }
        } catch (e) {
            console.warn('[Capacitor] StatusBar plugin not available or failed:', e);
        }
    },

    async hideNavigationBar() {
        try {
            // Try standard Capacitor plugin approach
            const { NavigationBar } = window.Capacitor.Plugins;
            if (NavigationBar) {
                await NavigationBar.hide();
                console.log('[Capacitor] Navigation Bar hidden.');
            } else {
                // Fallback: This might be the community plugin which sometimes attaches differently
                // or just log that it's missing.
                console.warn('[Capacitor] NavigationBar plugin not found.');
            }
        } catch (e) {
            console.warn('[Capacitor] NavigationBar plugin interaction failed:', e);
        }
    },

    addListeners() {
        try {
            const { App } = window.Capacitor.Plugins;
            if (App) {
                App.addListener('appStateChange', async (state) => {
                    if (state.isActive) {
                        console.log('[Capacitor] App resumed, ensuring full screen...');
                        await this.hideStatusBar();
                        await this.hideNavigationBar();
                    }
                });
            }
        } catch (e) {
            console.warn('[Capacitor] App plugin listener failed:', e);
        }
    }
};

// Initialize on load
window.addEventListener('load', () => {
    // Wait a brief moment to ensure Capacitor plugins are ready
    setTimeout(() => {
        CapacitorUtils.init();
    }, 500);
});
