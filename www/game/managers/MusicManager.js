class MusicManager {
    constructor() {
        this.tracks = []; // Array of track objects/functions
        this.currentTrackIndex = 0;
        this.currentTrackNode = null; // The AudioNode or object playing the current track
        this.isPlaying = false;
        this.musicEnabled = false;
        this.audioCtx = null;
        this.gainNode = null;
    }

    init(audioCtx) {
        this.audioCtx = audioCtx;
        this.gainNode = this.audioCtx.createGain();
        this.gainNode.gain.value = 0.3; // Master music volume
        this.gainNode.connect(this.audioCtx.destination);
    }

    setVolume(value) {
        if (this.gainNode) {
            // value is 0.0 to 1.0. We map it to 0.0 to 0.5 (max volume cap) to avoid clipping/loudness
            const maxVol = 0.5;
            this.gainNode.gain.value = value * maxVol;
        }
    }

    addTrack(name, playFunction) {
        this.tracks.push({ name, playFunction });
    }

    play() {
        if (!this.musicEnabled || this.tracks.length === 0) return;

        // If already playing, stop first
        if (this.currentTrackNode) {
            this.stop();
        }

        this.isPlaying = true;

        // Start the track
        // The playFunction should return a "stop" function or an object with a stop method
        const track = this.tracks[this.currentTrackIndex];

        console.log(`Playing track: ${track.name}`);

        try {
            this.currentTrackNode = track.playFunction(this.audioCtx, this.gainNode);
        } catch (e) {
            console.error("Error playing track:", e);
        }
    }

    stop() {
        if (this.currentTrackNode) {
            if (typeof this.currentTrackNode === 'function') {
                this.currentTrackNode(); // Call the stop function
            } else if (this.currentTrackNode && typeof this.currentTrackNode.stop === 'function') {
                this.currentTrackNode.stop();
            }
            this.currentTrackNode = null;
        }
        this.isPlaying = false;
    }

    nextTrack() {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
        if (this.isPlaying) {
            this.play();
        }
        return this.getCurrentTrackName();
    }

    prevTrack() {
        this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
        if (this.isPlaying) {
            this.play();
        }
        return this.getCurrentTrackName();
    }

    toggleMusic(enabled) {
        this.musicEnabled = enabled;
        if (this.musicEnabled) {
            if (!this.isPlaying) this.play();
        } else {
            this.stop();
        }
    }

    getCurrentTrackName() {
        if (this.tracks.length === 0) return "No Tracks";
        return this.tracks[this.currentTrackIndex].name;
    }
}

const musicManager = new MusicManager();
