// Track 8: Neon Dreams
// Genre: Lofi Hip Hop / Chillhop
// Description: A relaxing extended track with jazzy chords, swing drums, and vinyl crackle.

class NeonDreamsSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.tempo = 85; // Chill tempo
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.beat = 0;
        this.timerID = null;

        // Eb Major 7 / C Minor 9 Scale
        // C, D, Eb, F, G, Ab, Bb
        this.scale = {
            C2: 65.41, C3: 130.81, C4: 261.63,
            D3: 146.83, D4: 293.66,
            Eb2: 77.78, Eb3: 155.56, Eb4: 311.13,
            F3: 174.61, F4: 349.23,
            G2: 98.00, G3: 196.00, G4: 392.00,
            Ab2: 103.83, Ab3: 207.65, Ab4: 415.30,
            Bb2: 116.54, Bb3: 233.08, Bb4: 466.16
        };

        // Buffers
        this.vinylBuffer = this.createNoiseBuffer(5.0); // Long buffer
        this.snareBuffer = this.createSnareBuffer();
        this.hatBuffer = this.createNoiseBuffer(0.05);
        this.kickBuffer = this.createKickBuffer();

        // Static Vinyl Node
        this.vinylNode = null;
        this.vinylGain = null;
    }

    createNoiseBuffer(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        return buffer;
    }

    createSnareBuffer() {
        // Soft, dry snare
        const duration = 0.15;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const noise = Math.random() * 2 - 1;
            const envelope = Math.pow(1 - (i / bufferSize), 2);
            data[i] = noise * envelope;
        }
        return buffer;
    }

    createKickBuffer() {
        // Soft, boomy kick
        const duration = 0.3;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        const freqStart = 100;
        const freqEnd = 40;
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            const freq = freqStart * Math.exp(-t * 15) + freqEnd;
            data[i] = Math.sin(2 * Math.PI * freq * t);
            let amp = 1;
            if (t < 0.02) amp = t / 0.02;
            else amp = Math.exp(-(t - 0.02) * 8);
            data[i] *= amp;
        }
        return buffer;
    }

    start() {
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.beat = 0;

        // Start Vinyl Crackle
        this.startVinyl();

        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        if (this.timerID) clearTimeout(this.timerID);
        if (this.vinylNode) {
            this.vinylNode.stop();
            this.vinylNode.disconnect();
            this.vinylNode = null;
        }
    }

    startVinyl() {
        const source = this.ctx.createBufferSource();
        source.buffer = this.vinylBuffer;
        source.loop = true;
        const gain = this.ctx.createGain();

        // Lowpass to make it sound "warm" and not harsh
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.value = 0.08; // Quiet background

        source.start(this.ctx.currentTime);
        this.vinylNode = source;
        this.vinylGain = gain;
    }

    scheduler() {
        if (!this.isPlaying) return;

        const lookahead = 25.0;
        const scheduleAheadTime = 0.1;

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            this.playStep(this.nextNoteTime);
            const secondsPerBeat = 60.0 / this.tempo;
            this.nextNoteTime += 0.25 * secondsPerBeat; // 16th notes
            this.beat++;
        }

        this.timerID = setTimeout(() => this.scheduler(), lookahead);
    }

    playStep(time) {
        // Extended Structure: 64 Bars
        const step = this.beat % 16;
        const totalBars = Math.floor(this.beat / 16);
        const bar = totalBars % 64;

        // Swing Logic for drums
        // Delay every even 16th note slightly
        let swingOffset = 0;
        if (step % 2 !== 0) {
            swingOffset = 0.04; // Heavy swing
        }

        // --- DRUMS ---
        // Simple, lazy boom-bap pattern
        // K . . . S . . . . . K . S . . .
        let t = time + swingOffset;

        if (step === 0 && bar % 2 === 0) this.triggerKick(t);
        if (step === 10 && bar % 2 === 0) this.triggerKick(t); // Ghost kick
        if (step === 0 && bar % 2 === 1) this.triggerKick(t);

        // Snare on 2 and 4 (step 4 and 12)
        if (step === 4 || step === 12) {
            this.triggerSnare(t);
        }

        // Hats: constant 8ths or 16ths
        if (step % 2 === 0) {
            this.triggerHat(t, step % 4 === 0);
        }

        // --- INSTRUMENTS ---
        // No swing on these usually, or yes? Lets apply partial swing.
        // Actually for Piano chords, we play on grid usually, meldody swings.

        if (step === 0) {
            this.playRhodesChord(time, bar);

            // Bass on root
            this.playBassline(time, bar);
        }

        // --- MELODY ---
        // Sparse piano licks
        this.playMelody(time + swingOffset, step, bar);
    }

    playRhodesChord(time, bar) {
        // Cm9 - Fm9 - Bb13 - Galt progression (Jazz influence)
        // Simplified to C min / Eb Major relative

        let notes = [];

        // Bar 0-3: Cm9 (C Eb G Bb D)
        if (bar % 8 === 0 || bar % 8 === 1) notes = [this.scale.C3, this.scale.Eb3, this.scale.G3, this.scale.Bb3, this.scale.D4];
        // Bar 4-5: Fm9 (F Ab C Eb G)
        if (bar % 8 === 2 || bar % 8 === 3) notes = [this.scale.F3, this.scale.Ab3, this.scale.C4, this.scale.Eb4, this.scale.G4];
        // Bar 6: Bb13 (Bb D F Ab C G) -> Simplified Bb9
        if (bar % 8 === 4) notes = [this.scale.Bb2, this.scale.D3, this.scale.F3, this.scale.Ab3, this.scale.C4];
        // Bar 7: Galt (G B D F Ab) -> G7#5
        if (bar % 8 === 5) notes = [this.scale.G2, 246.94, this.scale.F3, this.scale.Eb4]; // B3 is 246.94
        // Bar 8-9: AbMaj7 (Ab C Eb G)
        if (bar % 8 === 6 || bar % 8 === 7) notes = [this.scale.Ab2, this.scale.C3, this.scale.Eb3, this.scale.G3];

        // Strum effect
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            // Rhodes-ish: Triangle/Sine mix, creating bell tone
            osc.type = 'triangle';
            osc.frequency.value = freq;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 1000 + (Math.sin(time) * 200); // Tremolo/Phaser ish

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.destination);

            // Strum delay
            const strumT = time + (i * 0.03);

            gain.gain.setValueAtTime(0, strumT);
            gain.gain.linearRampToValueAtTime(0.08, strumT + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, strumT + 2.5); // Long decay

            osc.start(strumT);
            osc.stop(strumT + 3.0);
        });
    }

    playBassline(time, bar) {
        // Simple Sine Bass
        let freq = this.scale.C2;
        if (bar % 8 === 2 || bar % 8 === 3) freq = 43.65; // F1
        if (bar % 8 === 4) freq = 58.27; // Bb1
        if (bar % 8 === 5) freq = 49.00; // G1
        if (bar % 8 === 6 || bar % 8 === 7) freq = 51.91; // Ab1

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        osc.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.2);
        gain.gain.linearRampToValueAtTime(0, time + 1.8);

        osc.start(time);
        osc.stop(time + 2.0);
    }

    playMelody(time, step, bar) {
        // Sparse improvisation
        if (bar % 2 === 0) return; // Only play every other bar

        let play = false;
        let note = this.scale.Eb4;

        // Pentatonic-ish licks
        if (step === 2) { play = true; note = this.scale.G4; }
        if (step === 3) { play = true; note = this.scale.F4; }
        if (step === 5) { play = true; note = this.scale.Eb4; }

        // Random chance to skip
        if (Math.random() > 0.7) play = false;

        if (play) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine'; // Bell like
            osc.frequency.value = note;

            gain.connect(this.destination);
            gain.gain.setValueAtTime(0.05, time);
            gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

            osc.start(time);
            osc.stop(time + 0.6);
        }
    }

    // --- TRIGGERS ---

    triggerKick(time) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.kickBuffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 1.0;

        // Lowpass kick for soft feel
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 600;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);
        source.start(time);
    }

    triggerSnare(time) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.snareBuffer;
        const gain = this.ctx.createGain();

        // Lowpass snare
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.6, time);

        source.start(time);
    }

    triggerHat(time, accent) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.hatBuffer;
        const gain = this.ctx.createGain();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const vol = accent ? 0.08 : 0.04; // Very quiet
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

        source.start(time);
    }
}

const Track8 = {
    name: "Neon Dreams",
    playFunction: (ctx, destination) => {
        const synth = new NeonDreamsSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track8.name, Track8.playFunction);
}
