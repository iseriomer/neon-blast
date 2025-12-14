// Track 3: Digital Dreams
// Genre: Space Ambient / Ethereal
// Description: Evolving pads and random crystalline chimes.

class DigitalDreamsSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.isPlaying = false;
        this.timerIDs = [];

        // Pentatonic Scale (F# Major Pentatonic: F#, G#, A#, C#, D#)
        // Soft and dreamy
        this.scale = [185.00, 207.65, 233.08, 277.18, 311.13, 369.99, 415.30, 466.16];
    }

    start() {
        this.isPlaying = true;
        this.startPadLayers();
        this.scheduleRandomChimes();
    }

    stop() {
        this.isPlaying = false;
        this.timerIDs.forEach(id => clearTimeout(id));
        this.timerIDs = [];
    }

    startPadLayers() {
        // Create 3 drifting drone layers
        const rootFreqs = [92.50, 138.59, 185.00]; // F#2, C#3, F#3

        rootFreqs.forEach((freq, index) => {
            this.playDrone(freq, index);
        });
    }

    playDrone(freq, index) {
        if (!this.isPlaying) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine'; // Pure sine for spacey feel
        osc.frequency.value = freq;

        // Slow FM modulation for "drifting" feel
        const lfo = this.ctx.createOscillator();
        lfo.frequency.value = 0.1 + (Math.random() * 0.1); // Very slow
        const lfoGain = this.ctx.createGain();
        lfoGain.gain.value = 2; // Slight pitch drift
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        filter.type = 'lowpass';
        filter.frequency.value = 400;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        // Long attack and infinite sustain (until stop)
        const now = this.ctx.currentTime;
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 4); // 4s Fade in

        osc.start(now);

        // We need to stop these manually when track stops, 
        // but since we don't keep ref to nodes in this simple architecture, 
        // we'll rely on the fact that when `stop()` is called on Manager, it disconnects/stops context? 
        // No, manager calls stop() on us. We need to store nodes if we want to stop them gracefully.
        // Or just let them play? No, they must stop.

        // BETTER: Use a loop that play short overlapping segments if we want to be safe, 
        // or just store these nodes. 
        // Let's store them in a list for this specific track instance.
        this.activeNodes = this.activeNodes || [];
        this.activeNodes.push({ osc, gain, lfo });

        // Auto-pan effect?
        // Let's keep it simple mono for now, Web Audio handles stereo if we use PannerNode but keeping it light.
    }

    scheduleRandomChimes() {
        if (!this.isPlaying) return;

        const delay = 1000 + Math.random() * 3000; // 1-4 seconds
        const timer = setTimeout(() => {
            this.playChime();
            this.scheduleRandomChimes();
        }, delay);
        this.timerIDs.push(timer);
    }

    playChime() {
        if (!this.isPlaying) return;

        const now = this.ctx.currentTime;
        const note = this.scale[Math.floor(Math.random() * this.scale.length)];

        // Glassy FM Bell
        const osc = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator(); // Modulator
        const modGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        // FM Setup
        mod.type = 'sine';
        mod.frequency.value = note * 2.5; // Non-integer ratio for metallic sound
        mod.connect(modGain);

        modGain.gain.setValueAtTime(note * 1.5, now);
        modGain.gain.exponentialRampToValueAtTime(0.01, now + 2);
        modGain.connect(osc.frequency);

        osc.type = 'sine';
        osc.frequency.value = note;
        osc.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.05); // Soft attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + 3); // Long tail

        osc.start(now);
        mod.start(now);
        osc.stop(now + 3);
        mod.stop(now + 3);
    }

    cleanup() {
        if (this.activeNodes) {
            const now = this.ctx.currentTime;
            this.activeNodes.forEach(node => {
                try {
                    node.gain.gain.cancelScheduledValues(now);
                    node.gain.gain.setValueAtTime(node.gain.gain.value, now);
                    node.gain.gain.linearRampToValueAtTime(0, now + 1); // 1s fade out
                    node.osc.stop(now + 1.1);
                    if (node.lfo) node.lfo.stop(now + 1.1);
                } catch (e) { }
            });
            this.activeNodes = [];
        }
    }
}

const Track3 = {
    name: "Digital Dreams",
    playFunction: (ctx, destination) => {
        const synth = new DigitalDreamsSynth(ctx, destination);
        synth.start();
        return () => {
            synth.stop();
            synth.cleanup();
        };
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track3.name, Track3.playFunction);
}
