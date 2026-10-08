// Offline asset preparation. CC0 source pack is passed as a directory argument.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const source = process.argv[2];
if (!source) throw new Error('Pass the extracted Kenney Casino Audio directory.');
const output = path.resolve(__dirname, '../www/audio/ui');
const recipes = [
    ['press', 'card-place-1.ogg', .12, 1800],
    ['select', 'chip-lay-1.ogg', .10, 1500],
    ['open', 'card-slide-1.ogg', .18, 1600],
    ['back', 'card-slide-2.ogg', .14, 1300],
    ['equip', 'chips-stack-1.ogg', .20, 1700],
    ['reward', 'chips-stack-2.ogg', .30, 1800],
    ['reveal', 'card-fan-1.ogg', .24, 1400],
    ['tick', 'card-place-2.ogg', .065, 1100]
];
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        for (const [name, file, length, cutoff] of recipes) {
            const raw = fs.readFileSync(path.join(source, 'Audio', file)).toString('base64');
            const samples = await page.evaluate(async ({ raw, length, cutoff, name }) => {
                const rate = 44100;
                const decode = new OfflineAudioContext(1, rate, rate);
                const data = await decode.decodeAudioData(Uint8Array.from(atob(raw), c => c.charCodeAt(0)).buffer);
                // Trim leading silence so button feedback is immediate.
                const channel = data.getChannelData(0);
                let onset = 0;
                while (onset < channel.length && Math.abs(channel[onset]) < .005) onset++;
                const duration = Math.min(length, (data.length - onset) / data.sampleRate / .9);
                const ctx = new OfflineAudioContext(1, Math.ceil(length * rate), rate);
                const src = ctx.createBufferSource(); src.buffer = data; src.playbackRate.value = .9;
                const low = ctx.createBiquadFilter(); low.type = 'lowpass'; low.frequency.value = cutoff; low.Q.value = .5;
                const high = ctx.createBiquadFilter(); high.type = 'highpass'; high.frequency.value = 120;
                const gain = ctx.createGain(); gain.gain.setValueAtTime(0, 0);
                gain.gain.linearRampToValueAtTime(1, .006);
                gain.gain.setValueAtTime(1, Math.max(.006, duration - .025));
                gain.gain.linearRampToValueAtTime(0, duration);
                src.connect(low); low.connect(high); high.connect(gain); gain.connect(ctx.destination);
                src.start(0, onset / data.sampleRate, Math.max(.01, duration * .9));
                const rendered = await ctx.startRendering();
                const values = rendered.getChannelData(0);
                // Consistent loudness without compressing combat or music.
                let peak = 0, energy = 0;
                for (const v of values) { peak = Math.max(peak, Math.abs(v)); energy += v*v; }
                const rms = Math.sqrt(energy / values.length);
                const scale = Math.min(.48 / Math.max(peak,.001), .12 / Math.max(rms,.001));
                return Array.from(values, v => Math.max(-1, Math.min(1, v * scale)));
            }, { raw, length, cutoff, name });
            const wav = Buffer.alloc(44 + samples.length * 2);
            wav.write('RIFF',0); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
            wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
            wav.writeUInt32LE(44100,24); wav.writeUInt32LE(88200,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
            wav.write('data',36); wav.writeUInt32LE(samples.length*2,40);
            samples.forEach((v,i) => wav.writeInt16LE(Math.round(v*32767),44+i*2));
            fs.writeFileSync(path.join(output, name + '.wav'), wav);
            console.log(name, samples.length, 'samples');
        }
        fs.copyFileSync(path.join(source,'License.txt'), path.join(output,'LICENSE-CASINO-AUDIO.txt'));
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
