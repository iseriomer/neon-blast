// Track 1: Neon Nights
// Genre: Synthwave / Retrowave
// Description: A driving, nostalgic beat with a fat bassline and airy pads.

class NeonNightsSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.tempo = 105;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.beat = 0;
        this.timerID = null;

        // E Minor Scale
        this.rootFreq = 41.20; // E1
    }

    start() {
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.beat = 0;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isPlaying) return;

        const lookahead = 25.0; // ms
        const scheduleAheadTime = 0.1; // seconds

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            this.playStep(this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.tempo;
            this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
            this.beat++;
        }

        this.timerID = setTimeout(() => this.scheduler(), lookahead);
    }

    playStep(time) {
        const step = this.beat % 16;      // 1 bar loop (16th notes)
        const bar = Math.floor(this.beat / 16) % 8; // 8 bar phrases

        // --- DRUMS ---
        // Kick: Four-on-the-floor
        if (step % 4 === 0) {
            // Drop kickoff at the very end (Bar 8, beat 4)
            if (!(bar === 7 && step === 12)) {
                this.playKick(time);
            }
        }

        // Snare: Huge gated reverb snare on 2 and 4 (beats 4 and 12 in 16th steps)
        if (step === 4 || step === 12) {
            this.playSnare(time);
        }

        // Kick/Snare Fills
        if (bar === 7) {
            // Fill at the end of the 8th bar
            if (step === 14 || step === 15) {
                this.playSnare(time);
            }
        }

        // Hi-Hat: 16th notes, closed
        if (step % 2 === 0) {
            // Accent the off-beat 8ths slightly
            this.playHiHat(time, step % 4 === 2);
        }

        // --- BASS ---
        // Rolling bassline (E - E - G - A progression over 4 bars)
        this.playBass(time, step, bar);

        // --- PAD / CHORDS ---
        // Sustained chords sidechained to the kick
        if (step === 0) {
            this.playPad(time, bar);
        }

        // --- ARPEGGIO / LEAD ---
        // Plucky melody
        this.playArp(time, step, bar);
    }

    // --- SYNTHESIS METHODS ---

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        osc.frequency.setValueAtTime(120, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        // White noise burst
        const bufferSize = this.ctx.sampleRate * 0.25;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.8;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        // Gated Reverb effect simulation (just a squared envelope)
        const noiseGain = this.ctx.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(this.destination);

        noiseGain.gain.setValueAtTime(0.8, time);
        noiseGain.gain.linearRampToValueAtTime(0.8, time + 0.15); // Hold
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25); // Gate shut

        noise.start(time);

        // Toner for body
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.destination);
        osc.frequency.setValueAtTime(180, time);
        osc.frequency.linearRampToValueAtTime(120, time + 0.1);
        oscGain.gain.setValueAtTime(0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playHiHat(time, accent) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        // High pass noise approximation using high frequency square wave mess
        // Actually lets use logic to make a quick noise buffer, better for hats
        // (Reusing buffer could be optimization but creating small buffer is cheap enough here)

        // Simpler: oscillator tangle
        osc.type = 'square';
        osc.frequency.setValueAtTime(8000, time);
        // Bandpass to thin it out
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 7000;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const vol = accent ? 0.25 : 0.1;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.1);
    }

    playBass(time, step, bar) {
        // Octave switching rolling bass: Root - Octave - Root - Root
        // 16th notes

        // Progression: E - C - D - E | C - Am - D - Bm
        let freq = this.rootFreq; // E1
        if (bar === 1 || bar === 4) freq = 32.70; // C1
        if (bar === 2 || bar === 6) freq = 36.71; // D1
        if (bar === 5) freq = 55.00; // A1 (Am)
        if (bar === 7) freq = 61.74; // B1 (Bm)

        // Octave Pattern: Low - High - Low - Low
        let currentFreq = freq;
        if (step % 4 === 1) currentFreq *= 2;

        // Synth sound
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = currentFreq;

        // Detune slightly for fatness
        osc.detune.value = Math.random() * 10 - 5;

        // Filter envelope (Pluck)
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(1500, time + 0.02);
        filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);
        filter.Q.value = 2;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.6, time);

        // Sidechain ducking on kick beats (0, 4, 8, 12)
        if (step % 4 === 0) {
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.linearRampToValueAtTime(0.6, time + 0.1);
        }

        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.22);
    }

    playPad(time, bar) {
        // Chords: Em - Cmaj - Dmaj - Em
        // Em: E G B
        // Cmaj: C E G
        // Dmaj: D F# A

        let notes = [];
        if (bar === 0 || bar === 3) notes = [164.81, 196.00, 246.94]; // Em: E3 G3 B3
        if (bar === 1 || bar === 4) notes = [130.81, 164.81, 196.00]; // Cmaj: C3 E3 G3
        if (bar === 2 || bar === 6) notes = [146.83, 185.00, 220.00]; // Dmaj: D3 F#3 A3
        if (bar === 5) notes = [220.00, 261.63, 329.63]; // Am: A3 C4 E4
        if (bar === 7) notes = [246.94, 293.66, 369.99]; // Bm: B3 D4 F#4

        // Play 3 oscillators for chord
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = (i * 5) - 5; // Spread

            // Lowpass to make it warm
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000;

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.destination);

            // ADSR - Long Sustain
            // Sidechain pump effect 4 times per bar
            const barDuration = (60 / this.tempo) * 4;
            const beatDuration = 60 / this.tempo;

            const now = time;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.2, now + 0.1); // Attack

            // Sidechain LFO effect manually
            for (let b = 0; b < 16; b += 4) { // Every beat
                // Duck volume at beat start
                // Just keeping it simple: Constant volume with slight tremolo might be safer/easier
                // But let's try a simple manual curve for ducking
            }
            // Actually, simple static volume is safer for now, pads are background
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0, now + barDuration - 0.1);

            osc.start(now);
            osc.stop(now + barDuration);
        });
    }

    playArp(time, step, bar) {
        // Only play on some 16ths
        // Pattern: x - x - - x - - -
        const pat = [1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0];
        if (!pat[step]) return;

        // Arp Notes: 1 - 3 - 5 - 8
        // Em Scale: E G B E
        let freqs = [659.25, 783.99, 987.77, 1318.51]; // E5 G5 B5 E6
        // Adjust for chords loosely
        if (bar === 1 || bar === 4) freqs = [523.25, 659.25, 783.99, 1046.50]; // C
        if (bar === 2 || bar === 6) freqs = [587.33, 739.99, 880.00, 1174.66]; // D
        if (bar === 5) freqs = [440.00, 523.25, 659.25, 880.00]; // Am
        if (bar === 7) freqs = [493.88, 587.33, 739.99, 987.77]; // Bm

        const note = freqs[step % 4];

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.value = note;

        // Delay effect (Pretend) - actually just long release on a separate low volume node?
        // Let's just do a simple plucky lead

        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    }
}

const Track1 = {
    name: "Neon Nights",
    playFunction: (ctx, destination) => {
        const synth = new NeonNightsSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track1.name, Track1.playFunction);
}
