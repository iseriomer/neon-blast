// Track 4: Neon Horizon
// Genre: Generative Cyberpunk / Dystopian Synthwave
// Description: Driving procedural basslines, evolving arpeggios, and aggressive neon atmosphere.
// Vibe: Fast-paced, Dark, Energetic.

class NeonHorizonSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.isPlaying = false;
        this.tempo = 125; // BPM
        this.nextNoteTime = 0;
        this.timerID = null;
        this.beatCount = 0;
        this.measureCount = 0;

        // Master Bus with Compressor (to glue sounds together and prevent clipping)
        this.masterBus = this.ctx.createDynamicsCompressor();
        this.masterBus.threshold.value = -20;
        this.masterBus.knee.value = 30;
        this.masterBus.ratio.value = 12;
        this.masterBus.attack.value = 0.003;
        this.masterBus.release.value = 0.25;
        this.masterBus.connect(this.destination);

        // Scales (D Minor natural & harmonic flavors)
        this.scaleLow = [36.71, 41.20, 43.65, 49.00, 55.00, 65.41]; // D1, E1, F1, G1, A1, C2
        this.scaleHigh = [293.66, 349.23, 392.00, 440.00, 523.25, 587.33, 698.46]; // High synth notes

        // State Machine for song structure
        this.intensity = 0; // 0: Intro, 1: Build, 2: Drop, 3: Chaos
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.nextNoteTime = this.ctx.currentTime + 0.1;
        this.measureCount = 0;
        this.intensity = 0;
        this.scheduler();
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    // The heart of the rhythm
    scheduler() {
        // while there are notes that will need to play before the next interval,
        // schedule them and advance the pointer.
        const secondsPerBeat = 60.0 / this.tempo;
        const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

        while (this.nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
            this.scheduleBeat(this.beatCount, this.nextNoteTime);
            this.nextNoteTime += secondsPerBeat / 4; // 16th notes
            this.beatCount++;

            if (this.beatCount % 16 === 0) {
                this.measureCount++;
                this.evolveSongStructure();
            }
        }

        if (this.isPlaying) {
            this.timerID = setTimeout(() => this.scheduler(), 25);
        }
    }

    // Logic to make the song "A Masterpiece" that changes over time
    evolveSongStructure() {
        // Every 8 measures, change intensity or shift focus
        if (this.measureCount % 8 === 0) {
            this.intensity = (this.intensity + 1) % 4;
            // Add randomness to prevent pure loops
            if (Math.random() > 0.7) this.intensity = 2; // Force drop sometimes
        }
    }

    scheduleBeat(beatNumber, time) {
        const step = beatNumber % 16;

        // 1. KICK DRUM (Four on the floor)
        // Only plays in intensity 1, 2, 3
        if (this.intensity > 0) {
            if (step === 0 || step === 4 || step === 8 || step === 12) {
                this.playKick(time);
            }
        }

        // 2. DRIVING BASS (The "Rolling" Bassline)
        // Plays off-beat 16th notes
        if (step !== 0 && step !== 4 && step !== 8 && step !== 12) {
            // Procedural note selection based on D Minor
            const rootFreq = 36.71; // D1
            let freq = rootFreq;

            // Occasionally switch chord logic
            if (this.measureCount % 4 === 3) freq = 43.65; // F1
            if (this.measureCount % 8 === 7) freq = 32.70; // C1

            this.playBass(time, freq);
        }

        // 3. ARPEGGIATOR (Neon Rain)
        // More active in higher intensity
        if (this.intensity >= 1) {
            if (step % 2 === 0) { // 8th notes
                // Pick a random note from high scale, but biased towards harmony
                const note = this.scaleHigh[Math.floor(Math.random() * this.scaleHigh.length)];
                // Panning effect simulated by slightly different volumes if we had stereo (kept simple here)
                this.playArp(time, note, step);
            }
        }

        // 4. LEAD / FX (The "Glitch" Elements)
        // Random sparse hits
        if (this.intensity === 3 || (this.intensity === 2 && step === 0)) {
            if (Math.random() > 0.85) {
                this.playGlitch(time);
            }
        }
    }

    // --- SYNTHESIS INSTRUMENTS ---

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.connect(gain);
        gain.connect(this.masterBus);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    playBass(time, freq) {
        // Dual Sawtooth for "Reese" bass feel
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';

        osc1.frequency.value = freq;
        osc2.frequency.value = freq + 0.5; // Detune for thickness

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, time);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.15); // Plucky filter

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterBus);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc1.start(time);
        osc2.start(time);
        osc1.stop(time + 0.2);
        osc2.stop(time + 0.2);
    }

    playArp(time, freq, step) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        osc.type = 'square';
        osc.frequency.value = freq;

        // Simple Ping-Pong effect based on step
        if (pan) {
            pan.pan.value = (step % 4 === 0) ? -0.6 : 0.6;
            osc.connect(gain);
            gain.connect(pan);
            pan.connect(this.masterBus);
        } else {
            osc.connect(gain);
            gain.connect(this.masterBus);
        }

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    playGlitch(time) {
        // High pitched FM noise
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const mainGain = this.ctx.createGain();

        modulator.frequency.value = Math.random() * 1000;
        modulator.connect(modGain);
        modGain.gain.value = 500;
        modGain.connect(carrier.frequency);

        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(800, time);
        carrier.frequency.linearRampToValueAtTime(200, time + 0.2); // Slide down

        carrier.connect(mainGain);
        mainGain.connect(this.masterBus);

        mainGain.gain.setValueAtTime(0.15, time);
        mainGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

        carrier.start(time);
        modulator.start(time);
        carrier.stop(time + 0.2);
        modulator.stop(time + 0.2);
    }
}

const Track4 = {
    name: "Neon Horizon",
    playFunction: (ctx, destination) => {
        const synth = new NeonHorizonSynth(ctx, destination);
        synth.start();
        return () => {
            synth.stop();
        };
    }
};

// Manager entegrasyonu
if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track4.name, Track4.playFunction);
}