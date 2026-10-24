// Load the exact client defaults/validator without a browser or Firebase account.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
module.exports = function createBalanceContext(initialStorage = {}) {
    const storage = new Map(Object.entries(initialStorage));
    const context = vm.createContext({
        console, innerWidth: 1920, innerHeight: 1080,
        matchMedia: () => ({ matches: false }),
        document: { getElementById: () => ({ getContext: () => ({}) }) },
        localStorage: { getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
    });
    context.window = context;
    for (const file of ['constants.js', 'level-config.js', 'meta-progress.js', 'game-balance.js', 'remote-config-fields.js']) {
        vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../www/game', file), 'utf8'), context, { filename: file });
    }
    return { context, storage, balance: context.GameBalance,
        evaluate: code => vm.runInContext(code, context) };
};
