// Export, validate, or publish game_balance_v1 without replacing other parameters.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const createContext = require('./game-balance-context.cjs');
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
const project = option('--project') || 'neon-blast-8a945';
async function main() {
    const { balance, context } = createContext();
    const input = option('--input');
    const value = balance.validate(input ? JSON.parse(fs.readFileSync(path.resolve(input), 'utf8')) : balance.defaults());
    const parameter = { defaultValue: { value: JSON.stringify(value) }, valueType: 'JSON',
        description: 'Eski JSON uyumluluğu. Günlük ayarlar için Level, Düşmanlar, Spawn ve Perkler gruplarındaki sayıları düzenle.' };
    const managedGroups = context.RemoteBalanceFields.template(value);
    if (args.includes('--export')) {
        fs.writeFileSync(path.join(root, 'docs/remote-config.defaults.json'), JSON.stringify(value, null, 2) + '\n');
        fs.writeFileSync(path.join(root, 'docs/firebase-remote-config.template.json'), JSON.stringify({ parameters: { game_balance_v1: parameter }, parameterGroups: managedGroups }, null, 2) + '\n');
        console.log('Exported validated defaults and grouped numeric Firebase import template to docs/.');
    }
    if (!args.includes('--publish') && !args.includes('--validate-server')) {
        console.log('Balance valid. No server changes.'); return;
    }
    if (!/^[a-z0-9-]+$/.test(project)) throw new Error('Invalid project ID');
    let token = process.env.FIREBASE_ACCESS_TOKEN;
    if (!token) {
        try {
            // PowerShell can find .cmd wrappers; do not pass config values to a shell.
            token = process.platform === 'win32'
                ? execFileSync('powershell.exe', ['-NoProfile', '-Command', 'gcloud auth print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
                : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        } catch (_) { throw new Error('Firebase login required: use gcloud auth login or set FIREBASE_ACCESS_TOKEN (OAuth access token).'); }
    }
    if (!token) throw new Error('Empty OAuth access token');
    const url = `https://firebaseremoteconfig.googleapis.com/v1/projects/${project}/remoteConfig`;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    async function request(url, options) {
        const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error(`Firebase HTTP ${response.status}: ${await response.text()}`);
        return response;
    }
    const current = await request(url, { headers });
    const etag = current.headers.get('etag');
    if (!etag) throw new Error('Missing ETag; refusing an unguarded publish');
    const template = await current.json();
    delete template.version;
    template.parameters ||= {};
    // Preserve conditional overrides for this parameter and every unrelated parameter/group.
    if (Object.values(template.parameterGroups || {}).some(group => group.parameters?.game_balance_v1))
        throw new Error('game_balance_v1 is in a parameter group; edit that group in Firebase Console.');
    template.parameters.game_balance_v1 = { ...template.parameters.game_balance_v1, ...parameter };
    template.parameterGroups ||= {};
    for (const [groupName, group] of Object.entries(managedGroups)) {
        const destination = template.parameterGroups[groupName] ||= { description: group.description, parameters: {} };
        destination.parameters ||= {};
        for (const [key, parameter] of Object.entries(group.parameters)) {
            let previous = template.parameters[key];
            delete template.parameters[key];
            // Parameters are globally unique, even when moved between groups.
            for (const existing of Object.values(template.parameterGroups)) {
                if (existing.parameters?.[key]) {
                    previous = existing.parameters[key]; delete existing.parameters[key];
                }
            }
            destination.parameters[key] = { ...previous, ...parameter };
        }
    }
    const options = { method: 'PUT', headers: { ...headers, 'If-Match': etag }, body: JSON.stringify(template) };
    await request(url + '?validate_only=true', options);
    if (args.includes('--publish')) {
        const published = await (await request(url, options)).json();
        console.log(`Published grouped game balance to ${project}, template version ${published.version?.versionNumber}.`);
    } else console.log(`Firebase template validated for ${project}. No server changes.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
