// Track 5: Electro Masterpiece
// Genre: Electro / Complextro
// Description: Heavy bass, aggressive leads, and dynamic drops.

class ElectroMasterpieceSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.tempo = 128;
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.beat = 0;
        this.timerID = null;

        // Key: F Minor (F, G, Ab, Bb, C, Db, Eb)
        this.rootFreq = 43.65; // F1

        // Pre-generate buffers
        this.noiseBuffer = this.createNoiseBuffer(1.0);
    }

    createNoiseBuffer(duration) {
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1);
        }
        return buffer;
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
        const globalStep = this.beat;
        const step = this.beat % 16;      // 1 bar loop
        const bar = Math.floor(this.beat / 16);
        const phraseBar = bar % 16; // 16 bar phrases

        // ARRANGEMENT STRUCTURE
        // 0-3: Intro (4 bars) - Simple Kick + Bass
        // 4-7: Buildup (4 bars) - Snare roll, rising pitch
        // 8-15: DROP (8 bars) - Heavy Bass, Full Drums
        // 16-19: Breakdown (4 bars) - Pads, minimal drums
        // 20-27: DROP 2 (8 bars) - Max energy
        // Loop back conceptually via modulo

        const isIntro = phraseBar < 4;
        const isBuildup = phraseBar >= 4 && phraseBar < 8;
        const isDrop = phraseBar >= 8 && phraseBar < 16;
        // Keep it simple for now, just cycle these 3 states effectively 
        // actually let's do a full 16 bar loop logic

        // --- KICK ---
        // 4-on-the-floor usually
        if (isIntro || isDrop) {
            if (step % 4 === 0) this.playKick(time);
        }
        if (isBuildup) {
            // Kick pattern speeds up
            if (phraseBar < 6) {
                if (step % 4 === 0) this.playKick(time);
            } else if (phraseBar === 6) {
                if (step % 2 === 0) this.playKick(time);
            } else {
                // Bar 7: rapid fire
                this.playKick(time); // Every 16th
            }
        }

        // --- SNARE / CLAP ---
        if (isIntro || isDrop) {
            // Standard backbeat on 2 and 4 (beats 4 and 12)
            if (step === 4 || step === 12) {
                this.playClap(time);
            }
        }
        if (isBuildup && phraseBar >= 6) {
            // Rising snare roll paired with kick
            if (step % 2 === 0) this.playSnare(time, true);
        }

        // --- BASS ---
        // The growl!
        if (isDrop) {
            this.playGrowlBass(time, step, phraseBar);
        }
        if (isIntro) {
            // Simple offbeat bass
            if (step % 4 === 2) this.playOffbeatBass(time);
        }

        // --- LEAD / FX ---
        if (isBuildup) {
            this.playRiser(time, phraseBar, step);
        }
        if (isDrop) {
            // Occasional vocal chop or high synth hit
            if (step === 0 || step === 12) this.playLeadHit(time, step);
        }

        // --- HI-HATS ---
        if (isDrop || (isIntro && phraseBar >= 2)) {
            if (step % 2 === 0) { // 8ths
                // Open hat on offbeats
                if (step % 4 === 2) {
                    this.playDoofHiHat(time, true);
                } else {
                    this.playDoofHiHat(time, false);
                }
            }
        }
    }

    // --- INSTRUMENTS ---

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        // Pitch sweep
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

        // Amplitude envelope
        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    playClap(time) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1500;
        filter.Q.value = 1;
        const gain = this.ctx.createGain();

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        // Clap envelope (multiple transients ideally, but simple decay here)
        gain.gain.setValueAtTime(0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.start(time);
        noise.stop(time + 0.2);
    }

    playOffbeatBass(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = this.rootFreq; // F1

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.8, time + 0.05);
        gain.gain.linearRampToValueAtTime(0, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.25);
    }

    playGrowlBass(time, step, bar) {
        // Complex FM Bass
        // Modulator -> Carrier

        // Rhythmic Pattern for Drop:
        // Boom - Wub - Wub - Wub
        const isWub = (step === 2 || step === 6 || step === 10 || step === 14);
        const isHit = (step === 0 || step === 8);

        if (!isWub && !isHit) return;

        const dur = isHit ? 0.4 : 0.2;

        // Carrier
        const car = this.ctx.createOscillator();
        car.type = 'sawtooth';
        car.frequency.value = this.rootFreq; // F1

        // Modulator
        const mod = this.ctx.createOscillator();
        mod.type = 'sine';
        mod.frequency.value = this.rootFreq * 2; // Octave up

        const modGain = this.ctx.createGain();
        modGain.gain.value = 300; // FM Index

        mod.connect(modGain);
        modGain.connect(car.frequency);

        // Filter (Formant-ish)
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = 5;

        // Envelope
        const masterGain = this.ctx.createGain();

        car.connect(filter);
        filter.connect(masterGain);
        masterGain.connect(this.destination);

        // Wub wow filter
        if (isWub) {
            filter.frequency.setValueAtTime(200, time);
            filter.frequency.linearRampToValueAtTime(1200, time + dur / 2);
            filter.frequency.linearRampToValueAtTime(200, time + dur);
        } else {
            filter.frequency.setValueAtTime(800, time);
            filter.frequency.exponentialRampToValueAtTime(100, time + dur);
        }

        masterGain.gain.setValueAtTime(0.8, time);
        masterGain.gain.exponentialRampToValueAtTime(0.01, time + dur);

        car.start(time);
        mod.start(time);
        car.stop(time + dur);
        mod.stop(time + dur);
    }

    playSnare(time, roll) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        osc.frequency.setValueAtTime(200, time);
        osc.frequency.linearRampToValueAtTime(100, time + 0.1);

        gain.gain.setValueAtTime(roll ? 0.5 : 0.8, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playRiser(time, phraseBar, step) {
        // Continuous rising pitch element
        // In a step sequencer, we just simulate snippets or play a long note at bar start
        // Let's do snippets
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';

        // Pitch depends on progress through buildup (bars 4-7)
        const buildupProgress = ((phraseBar - 4) * 16 + step) / (4 * 16); // 0 to 1
        const startFreq = 400;
        const endFreq = 1200;
        const currentFreq = startFreq + (endFreq - startFreq) * buildupProgress;

        osc.frequency.setValueAtTime(currentFreq, time);
        osc.frequency.linearRampToValueAtTime(currentFreq + 50, time + 0.1);

        osc.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.2 * buildupProgress, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.1);

        osc.start(time);
        osc.stop(time + 0.15);
    }

    playLeadHit(time, step) {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'square';
        osc2.type = 'sawtooth';

        osc1.frequency.value = this.rootFreq * 8; // F4
        osc2.frequency.value = this.rootFreq * 8;
        osc2.detune.value = 15;

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.35);
        osc2.stop(time + 0.35);
    }

    playDoofHiHat(time, open) {
        const bufferSource = this.ctx.createBufferSource();
        bufferSource.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 8000;
        const gain = this.ctx.createGain();

        bufferSource.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const decay = open ? 0.3 : 0.05;
        const vol = open ? 0.3 : 0.1;

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

        bufferSource.start(time);
        bufferSource.stop(time + decay + 0.1);
    }
}

const Track5 = {
    name: "Electro Masterpiece",
    playFunction: (ctx, destination) => {
        const synth = new ElectroMasterpieceSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track5.name, Track5.playFunction);
}
