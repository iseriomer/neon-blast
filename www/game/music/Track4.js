// Track 4: Tech Groove
// Advanced Lookahead Scheduler provided by User

class TechGrooveSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.musicGain = destination;
        this.tempo = 128;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.beat = 0;
        this.bgmInterval = null;

        // A Minor Scale (approx frequencies)
        this.scale = [
            55.00,  // A1
            65.41,  // C2
            73.42,  // D2
            82.41,  // E2
            98.00,  // G2
            110.00, // A2
            130.81, // C3
            146.83  // D3
        ];
    }

    start() {
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.beat = 0;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        if (this.bgmInterval) clearTimeout(this.bgmInterval);
    }

    // Lookahead scheduler for precise timing
    scheduler() {
        if (!this.isPlaying) return;

        const lookahead = 25.0; // ms
        const scheduleAheadTime = 0.1; // seconds

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            this.playStep(this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.tempo;
            this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
            this.beat = (this.beat + 1) % 16;
        }

        this.bgmInterval = setTimeout(() => this.scheduler(), lookahead);
    }

    playStep(time) {
        const beat = this.beat;

        // 1. KICK (On beats 0, 4, 8, 12 + variance)
        if (beat % 4 === 0) {
            this.playKick(time);
        }

        // 2. SNARE (On beats 4, 12 - Backbeat)
        if (beat % 8 === 4) {
            this.playSnare(time);
        }

        // 3. HI-HAT (16th notes, accented off-beats)
        if (beat % 2 === 0) {
            this.playHiHat(time, beat % 4 === 2); // Accent off-beats
        }

        // 4. BASSLINE (Rolling 16ths, sidechained)
        this.playBass(time, beat);

        // 5. ARPEGGIO / MELODY (Sparse)
        if (beat % 4 === 0 && Math.random() > 0.4) {
            this.playArp(time, beat);
        }
    }

    // --- SYNTHESIZERS ---

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicGain);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playSnare(time) {
        // Noise Burst
        const bufferSize = this.ctx.sampleRate * 0.2; // 0.2s duration
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;

        const noiseGain = this.ctx.createGain();
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.musicGain);

        noiseGain.gain.setValueAtTime(0.7, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.start(time);
        // Add body tone
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, time);
        osc.connect(oscGain);
        oscGain.connect(this.musicGain);
        oscGain.gain.setValueAtTime(0.5, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playHiHat(time, accent) {
        const bufferSize = this.ctx.sampleRate * 0.05;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        const gain = this.ctx.createGain();

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        const vol = accent ? 0.3 : 0.1;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        noise.start(time);
    }

    playBass(time, step) {
        // Simple rolling bass following root notes
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        // Base note changes every 16 steps (1 bar)
        const noteIdx = Math.floor(step / 16) % 2 === 0 ? 0 : 3; // Toggle root notes
        let freq = this.scale[noteIdx];

        // Octave jump for rhythmic interest
        if (step % 4 === 2) freq *= 2;

        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(800, time + 0.05); // Pluck effect
        filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        gain.gain.setValueAtTime(0.5, time);
        // Sidechain effect (ducking on kick beats)
        if (step % 4 === 0) {
            gain.gain.setValueAtTime(0.1, time);
            gain.gain.linearRampToValueAtTime(0.5, time + 0.1);
        }
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playArp(time, step) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = this.ctx.createDelay();
        const feedback = this.ctx.createGain();

        osc.type = 'square';
        // Pick random note from scale
        const note = this.scale[Math.floor(Math.random() * this.scale.length)] * 4; // High octave
        osc.frequency.value = note;

        // Delay setup
        delay.delayTime.value = 0.3; // Dotted 8th-ish
        feedback.gain.value = 0.4;

        osc.connect(gain);
        gain.connect(this.musicGain); // Dry
        gain.connect(delay);          // Wet send
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(this.musicGain);

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }
}

const Track4 = {
    name: "Tech Groove",
    playFunction: (ctx, destination) => {
        const synth = new TechGrooveSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track4.name, Track4.playFunction);
}
