// Track 7: Cosmic Depths
// Genre: Dark Ambient / Space Drone / Cinematic
// Description: An infinite, evolving soundscape of the cold void. 
// Features: Algorithmic Reverb, Sub-Bass Drones, Evolving Pads, Celestial Textures.

class CosmicDepthsSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.isPlaying = false;
        this.timerIDs = [];

        // Master FX Bus
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.8; // Headroom

        // Dynamic Compressor to glue everything together and prevent clipping
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -20;
        this.compressor.knee.value = 30;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.05;
        this.compressor.release.value = 0.25;

        // Connect Chain
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.destination);

        // Reverb Bus (The "Void")
        this.reverbNode = this.createSpaceReverb();
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.6; // Wet mix

        // Send everything to master, and optionally to reverb
        this.reverbGain.connect(this.masterGain);

        // Scale: C Phrygian (Dark, mysterious)
        // C, Db, Eb, F, G, Ab, Bb
        // But we'll focus on the open 5ths and minor intervals
        this.scale = [
            130.81, // C3
            138.59, // Db3
            155.56, // Eb3
            174.61, // F3
            196.00, // G3
            207.65, // Ab3
            233.08, // Bb3
            261.63, // C4
            311.13, // Eb4
            392.00  // G4
        ];
    }

    createSpaceReverb() {
        // Generating a synthetic impulse response for a massive, cold space
        const duration = 8.0; // 8 seconds tail
        const decay = 4.0;
        const rate = this.ctx.sampleRate;
        const length = rate * duration;
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            // Exponential decay
            const n = i / length;
            const env = Math.pow(1 - n, decay);

            // Decorrelated noise for stereo width
            left[i] = (Math.random() * 2 - 1) * env;
            right[i] = (Math.random() * 2 - 1) * env;
        }

        const convolver = this.ctx.createConvolver();
        convolver.buffer = impulse;
        return convolver;
    }

    start() {
        if (this.isPlaying) return;
        this.isPlaying = true;

        // Launch Layers
        this.startDroneLayer(); // The constant sub-bass
        this.startPadLayer();   // The swelling chords
        this.startTextureLayer(); // Random sprinkles
    }

    stop() {
        this.isPlaying = false;
        this.timerIDs.forEach(id => clearTimeout(id));
        this.timerIDs = [];

        // Fade out master to avoid clicks
        try {
            this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5);
        } catch (e) { /* ignore if already disconnected */ }

        // Disconnect after fade
        setTimeout(() => {
            this.masterGain.disconnect();
            this.reverbNode.disconnect();
        }, 2000);
    }

    // ==========================================
    // LAYER 1: THE DRONE (Sub-Bass)
    // ==========================================
    startDroneLayer() {
        if (!this.isPlaying) return;

        // Dual Oscillator Drone used for AM modulation (throbbing effect)
        const carrier = this.ctx.createOscillator();
        const modulator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const pan = this.ctx.createStereoPanner();

        // Deep C (C1 = 32.7Hz, C2 = 65.4Hz)
        const root = 65.41;

        carrier.type = 'sawtooth'; // Richer harmonics than sine
        carrier.frequency.value = root;

        // Slow modulation for "breathing"
        modulator.type = 'sine';
        modulator.frequency.value = 0.15; // Very slow pulse

        // Filter to darken it
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 180;
        filter.Q.value = 1;

        // AM Synthesis set up
        const amGain = this.ctx.createGain();
        amGain.gain.value = 0.3; // Depth of modulation

        // Connect graph
        carrier.connect(filter);
        filter.connect(gain);

        // Modulator controls volume of carrier slightly
        modulator.connect(amGain);
        amGain.connect(gain.gain);

        gain.connect(pan);
        pan.connect(this.masterGain);

        // Constant low rumble volume
        gain.gain.value = 0.4;

        // Start
        carrier.start();
        modulator.start();

        // Occasional pitch shifting details for the drone (The "reactor core" sound)
        this.animateDrone(carrier);

        // Save reference to stop if needed (not implemented for simple stop() method above which kills master)
    }

    animateDrone(osc) {
        if (!this.isPlaying) return;

        // Subtle drift
        const now = this.ctx.currentTime;
        const drift = (Math.random() - 0.5) * 2; // +/- 1Hz
        osc.frequency.linearRampToValueAtTime(65.41 + drift, now + 5);

        const nextTime = 5000 + Math.random() * 5000;
        this.timerIDs.push(setTimeout(() => this.animateDrone(osc), nextTime));
    }

    // ==========================================
    // LAYER 2: THE PADS (Evolving Chords)
    // ==========================================
    startPadLayer() {
        this.schedulePadChord();
    }

    schedulePadChord() {
        if (!this.isPlaying) return;

        // Ethereal Chords
        // Pick 3-4 notes from scale
        const notes = [];
        const count = 3;

        // Base note (Root or Fifth)
        notes.push(Math.random() > 0.6 ? 130.81 : 196.00);

        // Add extensions
        for (let i = 0; i < count - 1; i++) {
            notes.push(this.scale[Math.floor(Math.random() * this.scale.length)]);
        }

        const dur = 10 + Math.random() * 8; // Long chords (10-18s)

        notes.forEach(freq => this.playPadVoice(freq, dur));

        // Schedule next chord overlap
        const nextTime = (dur * 0.7) * 1000;
        this.timerIDs.push(setTimeout(() => this.schedulePadChord(), nextTime));
    }

    playPadVoice(freq, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const panner = this.ctx.createStereoPanner();

        // Complex wave shapes via detuned stacked sines approximation or just triangle
        osc.type = 'triangle';
        osc.frequency.value = freq;

        // Detune slightly for chorus effect
        osc.detune.value = (Math.random() - 0.5) * 15;

        // Filter sweep
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 0.5;

        const now = this.ctx.currentTime;

        // Automation
        filter.frequency.linearRampToValueAtTime(600 + Math.random() * 400, now + duration * 0.5); // Open up
        filter.frequency.linearRampToValueAtTime(200, now + duration); // Close down

        // Envelope (Swell)
        const attack = duration * 0.4;
        const release = duration * 0.4;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + attack);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        // Pan Position
        panner.pan.value = (Math.random() - 0.5) * 1.5;

        // Routing
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panner);

        // Send to Reverb Bus mostly!
        panner.connect(this.reverbNode);
        this.reverbNode.connect(this.reverbGain); // Ensure reverb is connected
        // Also a little dry signal
        panner.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + duration + 1); // +1 safety
    }

    // ==========================================
    // LAYER 3: CELESTIAL TEXTURES (Random FX)
    // ==========================================
    startTextureLayer() {
        this.scheduleTexture();
    }

    scheduleTexture() {
        if (!this.isPlaying) return;

        const type = Math.floor(Math.random() * 3);

        switch (type) {
            case 0: this.playGlimmer(); break; // High sine blips
            case 1: this.playSpaceDebris(); break; // Noise sweeps
            case 2: this.playSonar(); break; // Ping
        }

        const wait = 3000 + Math.random() * 8000; // Sparse events
        this.timerIDs.push(setTimeout(() => this.scheduleTexture(), wait));
    }

    playGlimmer() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        osc.type = 'sine';
        // High frequencies
        const note = this.scale[Math.floor(Math.random() * this.scale.length)] * 4; // 2 octaves up
        osc.frequency.value = note;

        const now = this.ctx.currentTime;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

        panner.pan.value = Math.random() * 2 - 1;

        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.reverbNode); // Full wet

        osc.start(now);
        osc.stop(now + 2);
    }

    playSpaceDebris() {
        const bufferSize = this.ctx.sampleRate * 2.0;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400 + Math.random() * 1000;
        filter.Q.value = 5;

        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner();

        const now = this.ctx.currentTime;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 1.0); // Slow fade in
        gain.gain.linearRampToValueAtTime(0, now + 4.0);

        // Filter movement
        filter.frequency.linearRampToValueAtTime(200, now + 4.0);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(panner);
        panner.connect(this.reverbNode);

        panner.pan.value = Math.random() * 2 - 1;

        noise.start(now);
        noise.stop(now + 4.0);
    }

    playSonar() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const delay = this.ctx.createDelay();
        const fb = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1200; // High ping

        delay.delayTime.value = 0.4;
        fb.gain.value = 0.4;

        const now = this.ctx.currentTime;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        osc.connect(gain);
        gain.connect(delay);
        delay.connect(fb);
        fb.connect(delay);
        delay.connect(this.reverbNode);

        osc.start(now);
        osc.stop(now + 1);
    }
}

const Track7 = {
    name: "Cosmic Depths",
    playFunction: (ctx, destination) => {
        const synth = new CosmicDepthsSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track7.name, Track7.playFunction);
}
