// Real browser verification: local assets decode, successful actions play,
// mute silences active sources, and gameplay/perk inputs never emit menu samples.
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../www');
const server = http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (pathname === '/capacitor.js') { res.end(''); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, body) => {
        if (error) { res.writeHead(404); res.end(); return; }
        res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.ogg': 'audio/ogg' }[path.extname(file)] || 'application/octet-stream');
        res.end(body);
    });
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL || 'chrome', headless: true });
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('https://**', route => route.abort());
        await page.addInitScript(() => {
            window.oscillatorStarts = 0;
            const create = AudioContext.prototype.createOscillator;
            AudioContext.prototype.createOscillator = function () {
                const oscillator = create.call(this);
                const start = oscillator.start.bind(oscillator);
                oscillator.start = (...args) => { window.oscillatorStarts++; start(...args); };
                return oscillator;
            };
        });
        await page.goto(`http://127.0.0.1:${server.address().port}/?dev=1`);
        await page.evaluate(() => MenuAudio.preload());
        await page.waitForTimeout(2000);
        assert.equal(await page.evaluate(() => oscillatorStarts), 0, 'startup text animation is silent');
        // Validate every bundled sample with the target browser's decoder.
        const files = fs.readdirSync(path.join(root, 'audio/ui')).filter(file => file.endsWith('.wav'));
        const samples = await page.evaluate(async files => {
            const output = [];
            for (const file of files) {
                const response = await fetch(`audio/ui/${file}`);
                const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
                let peak = 0, energy = 0;
                for (const value of buffer.getChannelData(0)) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
                output.push({ file, duration: buffer.duration, peak, rms: Math.sqrt(energy / buffer.length) });
            }
            window.sampleStarts = 0;
            window.sampleStops = 0;
            window.menuCues = [];
            const play = MenuAudio.play;
            MenuAudio.play = name => { window.menuCues.push(name); return play(name); };
            const create = audioCtx.createBufferSource.bind(audioCtx);
            audioCtx.createBufferSource = () => {
                const source = create();
                const start = source.start.bind(source), stop = source.stop.bind(source);
                source.start = (...args) => { window.sampleStarts++; start(...args); };
                source.stop = (...args) => { window.sampleStops++; stop(...args); };
                return source;
            };
            return output;
        }, files);
        for (const sample of samples) {
            assert.ok(sample.duration > 0 && sample.duration < 3, sample.file);
            assert.ok(Number.isFinite(sample.peak) && sample.peak > 0 && sample.rms > 0.001, sample.file);
        }
        console.table(samples.map(s => ({ file: s.file, seconds: s.duration.toFixed(3), peak: s.peak.toFixed(3) })));
        assert.equal(await page.evaluate(() => sampleStarts), 0, 'no autoplay at startup');
        await page.locator('#daily-rewards-btn').click();
        await page.locator('#dr-claim-btn').click();
        await page.waitForTimeout(100);
        assert.ok(await page.evaluate(() => sampleStarts > 0), 'first gesture plays a real sample');
        assert.ok(await page.evaluate(() => menuCues.includes('reward')), 'successful daily claim has reward cue');
        await page.locator('#armory-btn').click();
        await page.waitForTimeout(100);
        const beforeTab = await page.evaluate(() => sampleStarts);
        await page.locator('[data-tab="cores"]').click();
        await page.waitForTimeout(100);
        assert.ok(await page.evaluate(() => sampleStarts > 0 && audioCtx.state === 'running'));
        assert.ok(await page.evaluate(() => sampleStarts) > beforeTab, 'tab plays sample');
        await page.evaluate(async () => { await MenuAudio.play('reward'); });
        const beforeMute = await page.evaluate(() => sampleStarts);
        // Exercise the actual SFX change listener and ensure a ringing reward stops.
        await page.evaluate(() => {
            const input = document.getElementById('sfx-toggle');
            input.checked = false;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        assert.ok(await page.evaluate(() => sampleStops > 0), 'mute stops existing menu voices');
        await page.waitForTimeout(100);
        await page.locator('[data-tab="projectiles"]').click();
        await page.evaluate(() => MenuAudio.play('reward'));
        assert.equal(await page.evaluate(() => sampleStarts), beforeMute, 'muted interactions stay silent');
        await page.evaluate(() => {
            const input = document.getElementById('sfx-toggle');
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(100);
        await page.evaluate(() => MenuAudio.stop());
        await page.locator('#close-armory-btn').click();
        await page.locator('#lucky-spin-btn').click();
        await page.evaluate(() => { window.menuCues = []; });
        await page.locator('#ls-free-spin').click();
        await page.waitForFunction(() => !LuckySpinManager.isSpinning);
        const wheelCues = await page.evaluate(() => menuCues);
        assert.ok(wheelCues.includes('decrypt') && wheelCues.includes('tick') && wheelCues.includes('reward'), 'wheel start, crossings and reward are audible');
        await page.locator('#ls-close-btn').click();
        await page.locator('#armory-btn').click();
        await page.evaluate(() => {
            window.menuCues = [];
            ArmoryUI.executePackOpening('pack_alpha', true);
        });
        await page.waitForFunction(() => document.querySelector('.stage-revealed'));
        assert.ok(await page.evaluate(() => menuCues.includes('decrypt') && menuCues.includes('reward')), 'crate has decryption and timed reveal cue');
        await page.locator('#reveal-equip-btn').click();
        assert.ok(await page.evaluate(() => menuCues.includes('equip')), 'crate cosmetic equip has confirmation');
        const beforeCombat = await page.evaluate(() => sampleStarts);
        await page.evaluate(() => {
            playSound('hit');
            playSound('levelup');
            playSound('ui_tick');
            playSound('perk_select');
            const perk = document.createElement('button');
            document.getElementById('levelup-screen').appendChild(perk);
            perk.click();
            perk.remove();
            document.getElementById('pause-btn').click();
        });
        assert.equal(await page.evaluate(() => sampleStarts), beforeCombat, 'combat/perks emit no menu samples');
        assert.ok(await page.evaluate(() => oscillatorStarts > 0), 'existing gameplay synthesis still works');
        // The old intro reused a loud gameplay level-up burst, two seconds late.
        await page.evaluate(() => {
            const music = document.getElementById('music-toggle');
            music.checked = false; music.dispatchEvent(new Event('change', { bubbles: true }));
            window.introSounds = [];
            const original = playSound;
            playSound = name => { introSounds.push(name); return original(name); };
            document.getElementById('start-btn').click();
            gameState.godMode = true;
        });
        await page.waitForFunction(() => !gameState.isStarting && gameState.gameActive);
        assert.equal(await page.evaluate(() => introSounds.includes('levelup')), false, 'intro never emits gameplay level-up audio');
        await page.evaluate(() => { gameState.isPaused = true; });
        assert.deepEqual(errors, []);
        console.log('Menu audio browser checks passed (offline assets, playback, mute, gameplay isolation).');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
