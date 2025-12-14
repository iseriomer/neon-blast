// Track 2: Cyber Chase
// Genre: Dark Wave / Industrial
// Description: Fast tempo anxious pursuit music

class CyberChaseSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.tempo = 142; // Fast!
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.beat = 0;
        this.timerID = null;

        // D Minor (D, E, F, G, A, Bb, C)
        // Frequencies for D2
        this.root = 73.42;
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
        const step = this.beat % 16;
        const bar = Math.floor(this.beat / 16) % 4;

        // --- RHYTHM ---
        // Kick: Driving 4/4 but with double kicks occasionally
        if (step % 4 === 0) this.playKick(time);
        if (step % 16 === 14) this.playKick(time); // Double kick at end of bar

        // Snare: Tight and metallic
        if (step % 8 === 4) this.playSnare(time);

        // Hi-Hat: 8th notes open/close interplay
        if (step % 2 === 0) {
            this.playHiHat(time, step % 4 === 2);
        }

        // Percussion: Glitch noises
        if (Math.random() < 0.1) {
            this.playGlitch(time);
        }

        // --- BASS ---
        // 16th note acid bass
        this.playBass(time, step, bar);

        // --- ARP ---
        // High speed sequencing
        this.playArp(time, step, bar);
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        // Punchy kick
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.3);

        gain.gain.setValueAtTime(1, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

        osc.start(time);
        osc.stop(time + 0.3);
    }

    playSnare(time) {
        // Metallic FM Snare
        const osc = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        // FM Synthesis
        mod.type = 'square';
        mod.frequency.setValueAtTime(300, time);
        mod.connect(modGain);
        modGain.connect(osc.frequency);
        modGain.gain.setValueAtTime(500, time);
        modGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, time);
        osc.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.6, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        mod.start(time);
        osc.start(time);
        mod.stop(time + 0.2);
        osc.stop(time + 0.2);

        // Add noise layer
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const nGain = this.ctx.createGain();
        noise.connect(nGain);
        nGain.connect(this.destination);
        nGain.gain.value = 0.4;
        nGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        noise.start(time);
    }

    playHiHat(time, open) {
        // High pass noise
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;

        const gain = this.ctx.createGain();
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const decay = open ? 0.1 : 0.03;
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

        noise.start(time);
    }

    playGlitch(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        osc.type = Math.random() > 0.5 ? 'sawtooth' : 'square';
        osc.frequency.setValueAtTime(1000 + Math.random() * 2000, time);

        gain.gain.setValueAtTime(0.1, time);
        gain.gain.linearRampToValueAtTime(0, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
    }

    playBass(time, step, bar) {
        // Dm - Bb - F - C
        // D2 - Bb1 - F1 - C2

        let freq = this.root;
        if (bar === 1) freq = 58.27; // Bb1
        if (bar === 2) freq = 43.65; // F1
        if (bar === 3) freq = 65.41; // C2

        // Random octave jumps
        if (Math.random() > 0.7) freq *= 2;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        // Sawtooth passing through resonant lowpass
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);
        filter.frequency.exponentialRampToValueAtTime(1200, time + 0.05);
        filter.frequency.exponentialRampToValueAtTime(200, time + 0.2);
        filter.Q.value = 5 + Math.sin(time) * 3; // Modulate resonance

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    }

    playArp(time, step, bar) {
        // Fast 32nd note feel? No, 16ths are fine at 142bpm
        const notes = [0, 3, 7, 10, 12]; // D Minor pentatonic intervals
        if (bar === 1) { // Bb Major: Bb D F A
            // Relative to D root? Let's just hardcode offsets
            // Bb is -4 semitones from D
        }

        // Procedural Melody
        // Just randomizing within scale for "Chase" feeling
        const scale = [73.42, 82.41, 87.31, 98.00, 110.00, 116.54, 130.81]; // D natural minor scale D2-C3

        // Play higher octaves
        const baseFreq = scale[step % 7] * 4; // High pitch

        // Only 50% chance to play
        if (step % 2 !== 0) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        osc.type = 'triangle';
        osc.frequency.value = baseFreq;

        gain.gain.setValueAtTime(0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

        osc.start(time);
        osc.stop(time + 0.1);
    }
}


const Track2 = {
    name: "Cyber Chase",
    playFunction: (ctx, destination) => {
        const synth = new CyberChaseSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track2.name, Track2.playFunction);
}
