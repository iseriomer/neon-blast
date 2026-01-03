// Track 6: Cosmic Overdrive
// Genre: Cinematic Space Synthwave
// Description: A high-energy "masterpiece" with complex layers, dynamic build-ups, and a heroic melody.
// VARIATION UPDATE: Extended 32-bar structure with Bridge and Climax.

class CosmicOverdriveSynth {
    constructor(ctx, destination) {
        this.ctx = ctx;
        this.destination = destination;
        this.tempo = 124; // Driving tempo
        this.isPlaying = false;
        this.nextNoteTime = 0;
        this.beat = 0;
        this.timerID = null;

        // C Minor Scale (C3 = ~130.81)
        // C, D, Eb, F, G, Ab, Bb
        this.scale = {
            C1: 32.70, C2: 65.41, C3: 130.81, C4: 261.63, C5: 523.25, C6: 1046.50, C7: 2093.00,
            D3: 146.83, D4: 293.66, D5: 587.33,
            Eb3: 155.56, Eb4: 311.13, Eb5: 622.25, Eb6: 1244.51,
            F3: 174.61, F4: 349.23, F5: 698.46,
            G1: 49.00, G2: 98.00, G3: 196.00, G4: 392.00, G5: 783.99, G6: 1567.98,
            Ab3: 207.65, Ab4: 415.30, Ab5: 830.61,
            Bb3: 233.08, Bb4: 466.16, Bb5: 932.32, Bb5: 932.32
        };

        // Pre-generate noise buffers
        this.snareBuffer = this.createNoiseBuffer(0.3);
        this.hatBuffer = this.createNoiseBuffer(0.05);
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
        this.beat = 0; // 16th notes
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
        // Song Structure (Extended to 32 Bars):
        // 1 Bar = 16 steps
        const step = this.beat % 16;
        const bar = Math.floor(this.beat / 16) % 32; // 32 Bar Macro Loop

        // Structure Overview:
        // Bars 0-3:   Intro/Verse 1 (Basic Groove)
        // Bars 4-7:   Verse 2 (Lead enters)
        // Bars 8-15:  Chorus (Full power)
        // Bars 16-19: Bridge Part 1 (Breakdown - Pads & Arps only)
        // Bars 20-23: Bridge Part 2 (Build-up - Snare roll / Filter open)
        // Bars 24-31: Climax (Chorus with Counter-Melody)

        // --- DRUMS ---
        this.playDrums(time, step, bar);

        // --- BASS ---
        this.playBass(time, step, bar);

        // --- ARPEGGIO ---
        this.playArp(time, step, bar);

        // --- PADS ---
        if (step === 0) {
            this.playPad(time, bar);
        }

        // --- LEAD MELODY ---
        this.playLead(time, step, bar);
    }

    // ==========================================
    // INSTRUMENTS
    // ==========================================

    playDrums(time, step, bar) {
        // SILENCE during Bridge Part 1 (16-19)
        if (bar >= 16 && bar < 20) return;

        // BUILD UP during Bridge Part 2 (20-23)
        if (bar >= 20 && bar < 24) {
            // Snare roll on last bar
            if (bar === 23) {
                if (step % 2 === 0) this.playSnare(time, false); // 8th note roll
            } else if (step === 4 || step === 12) {
                this.playSnare(time, false); // Regular beat
            }
            // Add rising hats
            if (step % 4 === 0) this.playHat(time, false);
            return;
        }

        // --- KICK ---
        // 4-on-floor
        if (step % 4 === 0) {
            this.playKick(time);
        }
        // Double kick variations
        if (step === 14) {
            if (bar % 4 === 3) this.playKick(time);
        }

        // --- SNARE ---
        // 2 and 4
        if (step === 4 || step === 12) {
            let heavy = (bar >= 24); // Heavy snare during climax
            this.playSnare(time, heavy);
        }

        // --- HI-HATS ---
        // Running 16ths
        if (step % 2 === 0) {
            this.playHat(time, false); // Closed
        } else {
            // Open on offbeats during Chorus & Climax
            let open = (bar >= 8 && bar < 16) || (bar >= 24);
            this.playHat(time, open);
        }

        // --- FILLS & CRASH ---
        // Crash on 0, 8, 24
        if ((bar === 0 || bar === 8 || bar === 24) && step === 0) {
            this.playCrash(time);
        }

        // Drum Fills at end of sections
        if (step > 12) {
            // End of Verse 1
            if (bar === 3) {
                this.playSnare(time, false);
            }
            // Pre-Chorus Fill
            if (bar === 7) {
                if (step === 13) this.playKick(time);
                if (step === 14) this.playSnare(time, true);
                if (step === 15) this.playSnare(time, true);
            }
            // Pre-Climax Fill (Big)
            if (bar === 23) {
                // Handled in build-up block
            }
            // Loop turnaround
            if (bar === 31) {
                if (step === 12) this.playSnare(time, true);
                if (step === 14) this.playKick(time);
                if (step === 15) this.playCrash(time);
            }
        }
    }

    playBass(time, step, bar) {
        // Breakdown silence (partial)
        if (bar >= 16 && bar < 20) {
            // Just play root notes on beat 1 for texture, long release
            if (step === 0 && bar % 2 === 0) {
                this.playBassNote(time, this.scale.C2, 2.0, 0.3); // Long drone
            }
            return;
        }

        // Determine notes
        let note = this.scale.C2;

        // Progression Logic
        // Bars 0-3: Cm - Ab - Fm - G
        // Bars 4-7: Cm - Eb - Ab - Bb
        // Bars 8-15 (Chorus): Cm - Bb - Ab - G (Descending heroics)
        // Bars 16-23 (Bridge): Cm drone... then G build
        // Bars 24-31 (Climax): Cm - Eb - F - Ab (Uplifting)

        if (bar < 8) {
            // Verses
            if (bar % 4 === 1) note = this.scale.Ab3 / 2; // Ab1
            if (bar % 4 === 2) note = (bar < 4) ? this.scale.F3 / 2 : this.scale.Ab3 / 2;
            if (bar % 4 === 3) note = (bar < 4) ? this.scale.G1 : this.scale.Bb3 / 2;
        } else if (bar < 16) {
            // Chorus
            if (bar % 4 === 0) note = this.scale.C2;
            if (bar % 4 === 1) note = this.scale.Bb3 / 2;
            if (bar % 4 === 2) note = this.scale.Ab3 / 2;
            if (bar % 4 === 3) note = this.scale.G1;
        } else if (bar >= 24) {
            // Climax
            if (bar % 4 === 0) note = this.scale.C2;
            if (bar % 4 === 1) note = this.scale.Eb3 / 2;
            if (bar % 4 === 2) note = this.scale.F3 / 2;
            if (bar % 4 === 3) note = this.scale.Ab3 / 2;
        }

        // Pattern
        let freq = note;
        // Octave jump
        if (step % 4 === 2) freq *= 2;

        // 16th note rolling bass
        this.playBassNote(time, freq, 0.25, 0.5);
    }

    playBassNote(time, freq, duration, intensity) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(100, time);
        filter.frequency.exponentialRampToValueAtTime(100 + (1000 * intensity), time + 0.05);
        filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(intensity, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.start(time);
        osc.stop(time + duration + 0.1);
    }

    playPad(time, bar) {
        // Chords
        let notes = [this.scale.C3, this.scale.Eb3, this.scale.G3]; // Cm

        // Logic matches bass roughly
        if (bar < 8) {
            if (bar % 4 === 1) notes = [this.scale.Ab3, this.scale.C4, this.scale.Eb4];
            if (bar % 4 === 2) notes = (bar < 4) ? [this.scale.F3, this.scale.Ab3, this.scale.C4] : [this.scale.Ab3, this.scale.C4, this.scale.Eb4];
            if (bar % 4 === 3) notes = (bar < 4) ? [this.scale.G3, this.scale.Bb3, this.scale.D4] : [this.scale.Bb3, this.scale.D4, this.scale.F4];
        } else if (bar >= 24) {
            if (bar % 4 === 1) notes = [this.scale.Eb3, this.scale.G3, this.scale.Bb3];
            if (bar % 4 === 2) notes = [this.scale.F3, this.scale.Ab3, this.scale.C4];
            if (bar % 4 === 3) notes = [this.scale.Ab3, this.scale.C4, this.scale.Eb4];
        }

        // BRIDGE: Higher inversion, atmospheric
        if (bar >= 16 && bar < 24) {
            notes = notes.map(n => n * 2); // Octave up
        }

        notes.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = (bar >= 16 && bar < 24) ? 'sine' : 'triangle'; // Sine for bridge
            osc.frequency.value = freq;

            gain.connect(this.destination);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.1, time + 1.0);
            gain.gain.setValueAtTime(0.1, time + 2.0);
            gain.gain.linearRampToValueAtTime(0, time + 3.8);

            osc.start(time);
            osc.stop(time + 4.0);
        });
    }

    playArp(time, step, bar) {
        // New Arp Logic
        // Intro/Verses: Sparse
        // Chorus/Climax: Fast
        // Bridge: Flowing

        if (bar < 4) return; // No arp only bass in intro

        let pattern = [0, 1, 2, 3, 2, 1, 0, 1]; // 8th note base
        let rate = 2; // trigger on even steps

        if (bar >= 8 && bar < 16) { rate = 1; } // 16ths in Chorus
        if (bar >= 20 && bar < 24) { rate = 1; } // 16ths in Bridge Build
        if (bar >= 24) { rate = 1; } // 16ths in Climax

        if (step % rate !== 0) return;

        let noteIdx = (step / rate) % 4; // Simple ups
        // Use pentatonic notes relative to root? 
        // Let's stick to C Minor Pentatonic across the board for cohesive "glue"
        // C Eb F G Bb
        const scale = [this.scale.C5, this.scale.Eb5, this.scale.F5, this.scale.G5, this.scale.Bb5, this.scale.C6];

        // Variation: Shift index over time
        let idx = (noteIdx + (bar % 4)) % scale.length;
        let note = scale[idx];

        // Climax high arp
        if (bar >= 24) note *= 2;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(note, time);

        // Bridge Filter Sweep
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        let cut = 2000;
        if (bar >= 16 && bar < 20) cut = 800; // Muffled in bridge start
        if (bar >= 20 && bar < 24) cut = 800 + ((bar - 20) * 1000); // Opening up
        filter.frequency.setValueAtTime(cut, time);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.04, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + (0.15 * rate));

        osc.start(time);
        osc.stop(time + 0.3);
    }

    playLead(time, step, bar) {
        // Lead melody definition
        // Bars 4-7: Intro Melody
        // Bars 8-15: Main Chorus
        // Bars 24-31: Climax Counter-Melody

        if (bar < 4 || (bar >= 16 && bar < 24)) return; // Silence in Intro & Bridge

        let note = null;
        let duration = 0.5;

        // MAIN THEME (Bars 4-15)
        if (bar < 16) {
            // Simple catchy hook
            if (bar % 4 === 0) {
                if (step === 0) { note = this.scale.C5; duration = 1.0; }
                if (step === 6) { note = this.scale.Eb5; }
                if (step === 10) { note = this.scale.G5; }
                if (step === 14) { note = this.scale.F5; duration = 0.25; }
            }
            if (bar % 4 === 1) {
                if (step === 0) { note = this.scale.D5; duration = 1.5; }
            }
            if (bar % 4 === 2) {
                if (step === 0) note = this.scale.B3; // G Major chord tone? B3 is not in scale map, use Bb or G
                // Stick to Cm natural
                if (step === 0) note = this.scale.Eb5;
                if (step === 4) note = this.scale.C5;
                if (step === 8) note = this.scale.Bb4;
            }
            if (bar % 4 === 3) {
                if (step === 0) { note = this.scale.G4; duration = 2.0; }
            }
        }

        // CLIMAX COUNTER-MELODY (Bars 24-31)
        // High pitched sustain notes soaring over everything
        if (bar >= 24) {
            if (bar % 2 === 0 && step === 0) {
                note = this.scale.C6; duration = 2.0;
            }
            if (bar % 2 === 1 && step === 0) {
                note = (bar % 4 === 1) ? this.scale.Bb5 : this.scale.G5; duration = 2.0;
            }
            // Add rhythmic flourishes
            if (step === 12) {
                note = this.scale.C6; duration = 0.2;
            }
        }

        if (note) {
            this.playLeadNote(time, note, duration, (bar >= 24));
        }
    }

    playLeadNote(time, freq, duration, isHigh) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc2.type = 'square';
        osc.frequency.value = freq;
        osc2.frequency.value = freq;
        osc2.detune.value = isHigh ? 15 : 8;

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.linearRampToValueAtTime(isHigh ? 6000 : 3000, time + 0.1);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const vol = isHigh ? 0.15 : 0.2;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(vol, time + 0.05);
        gain.gain.setValueAtTime(vol, time + duration - 0.05);
        gain.gain.linearRampToValueAtTime(0, time + duration + 0.1);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + duration + 0.2);
        osc2.stop(time + duration + 0.2);
    }

    // ==========================================
    // SYNTHESIS HELPERS
    // ==========================================

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.destination);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.4);

        gain.gain.setValueAtTime(1.0, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);

        osc.start(time);
        osc.stop(time + 0.4);
    }

    playSnare(time, heavy = false) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.snareBuffer;
        const gain = this.ctx.createGain();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const vol = heavy ? 0.7 : 0.5;
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        noise.start(time);

        const osc = this.ctx.createOscillator();
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.1);
        const oscGain = this.ctx.createGain();
        osc.connect(oscGain);
        oscGain.connect(this.destination);
        oscGain.gain.setValueAtTime(0.3, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
        osc.start(time);
        osc.stop(time + 0.2);
    }

    playHat(time, open) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.hatBuffer;
        const gain = this.ctx.createGain();

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 10000;
        filter.Q.value = 1;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        const duration = open ? 0.3 : 0.05;
        const vol = open ? 0.2 : 0.1;

        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noise.start(time);
    }

    playCrash(time) {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.snareBuffer;
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.destination);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 2.0);

        noise.start(time);
    }
}

const Track6 = {
    name: "Cosmic Overdrive",
    playFunction: (ctx, destination) => {
        const synth = new CosmicOverdriveSynth(ctx, destination);
        synth.start();
        return () => synth.stop();
    }
};

if (typeof musicManager !== 'undefined') {
    musicManager.addTrack(Track6.name, Track6.playFunction);
}
