// Sample-based presentation audio. Combat and perk sounds remain in audio.js.
(() => {
    const cues = {
        click: ['press.wav', 0.16],
        select: ['select.wav', 0.12],
        open: ['open.wav', 0.14],
        back: ['back.wav', 0.12],
        toggle: ['press.wav', 0.12],
        equip: ['equip.wav', 0.18],
        reward: ['reward.wav', 0.20],
        error: ['back.wav', 0.09],
        decrypt: ['reveal.wav', 0.13],
        tick: ['tick.wav', 0.06]
    };
    const baseURL = new URL('../audio/ui/', document.currentScript.src);
    const buffers = new Map();
    const active = new Set();
    const lastPlayed = new Map();
    let lastInteraction = -Infinity;
    let loading;
    let unlocked = false;
    let generation = 0;
    const enabled = () => getSFXEnabled() && !document.hidden;

    async function preload() {
        if (loading) return loading;
        loading = Promise.all([...new Set(Object.values(cues).map(([file]) => file))].map(async file => {
            if (buffers.has(file)) return;
            try {
                const response = await fetch(new URL(file, baseURL));
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                const buffer = await audioCtx.decodeAudioData(await response.arrayBuffer());
                // Lossy decoding can overshoot the original peak; keep the mix predictable.
                let peak = 0;
                for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                    for (const sample of buffer.getChannelData(channel)) peak = Math.max(peak, Math.abs(sample));
                }
                if (peak > 0.8) {
                    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                        const samples = buffer.getChannelData(channel);
                        for (let i = 0; i < samples.length; i++) samples[i] *= 0.8 / peak;
                    }
                }
                buffers.set(file, buffer);
            } catch (error) {
                console.warn(`Menu audio unavailable: ${file}`, error);
            }
        }));
        await loading;
        loading = null;
    }

    function stop() {
        generation++;
        for (const source of active) source.stop();
        active.clear();
    }

    async function play(name) {
        if (!unlocked || !enabled() || !cues[name]) return;
        const requested = performance.now();
        // Ignore a generic click if its action also emits a semantic cue.
        const semantic = ['equip', 'reward', 'decrypt', 'error'].includes(name);
        if (!semantic && requested - lastInteraction < 75) return;
        const cooldown = name === 'tick' ? 240 : 100;
        if (requested - (lastPlayed.get(name) ?? -Infinity) < cooldown) return;
        if (semantic) stop();
        lastInteraction = requested;
        const token = generation;
        lastPlayed.set(name, requested);
        try {
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            const [file, volume] = cues[name];
            if (!buffers.has(file)) await preload();
            // Never replay stale gestures after a slow download, mute or backgrounding.
            if (!enabled() || token !== generation || performance.now() - requested > 250) return;
            const buffer = buffers.get(file);
            if (!buffer || audioCtx.state !== 'running') return;
            if (active.size >= 2) {
                const oldest = active.values().next().value;
                oldest.stop();
                active.delete(oldest);
            }
            const source = audioCtx.createBufferSource();
            const gain = audioCtx.createGain();
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 2400;
            filter.Q.value = 0.5;
            source.buffer = buffer;
            source.playbackRate.value = 1;
            const now = audioCtx.currentTime;
            const duration = buffer.duration / source.playbackRate.value;
            const attack = Math.min(0.004, duration / 4);
            const release = Math.min(0.012, duration / 4);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + attack);
            gain.gain.setValueAtTime(volume, now + duration - release);
            gain.gain.linearRampToValueAtTime(0, now + duration);
            source.connect(filter);
            filter.connect(gain);
            gain.connect(audioCtx.destination);
            active.add(source);
            source.onended = () => {
                active.delete(source);
                source.disconnect();
                filter.disconnect();
                gain.disconnect();
            };
            source.start();
        } catch (_) { /* Presentation audio must never interrupt navigation. */ }
    }

    window.MenuAudio = { play, preload, stop };
    const menuScope = '#start-screen, #pause-menu, #leaderboard-screen, #game-over-screen, #armory-modal, #daily-reward-modal, #lucky-spin-modal, #quest-panel-modal, #pack-opening-modal, #player-options-modal';
    const openButtons = new Set(['leaderboard-btn', 'daily-rewards-btn', 'lucky-spin-btn', 'daily-quests-btn', 'player-options-btn']);
    const closeButtons = new Set(['resume-btn', 'close-leaderboard-btn', 'close-armory-btn', 'dr-close-btn', 'ls-close-btn', 'quest-close-btn', 'reveal-close-btn', 'player-options-close']);

    // Capture runs before navigation hides a menu or replaces a dynamic card.
    document.addEventListener('click', event => {
        const button = event.target.closest('button, [role="button"]');
        if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return;
        const scope = button.closest(menuScope);
        if (!scope || scope.classList.contains('hidden')) return;
        unlocked = true;
        // These actions emit a cue only when their own handler succeeds.
        if (['armory-btn', 'game-over-armory-btn', 'hangar-quick-equip', 'reveal-equip-btn'].includes(button.id) || button.matches('.equip-action-btn')) return;
        if (['prev-track-btn', 'next-track-btn'].includes(button.id)) return;
        if (['dr-claim-btn', 'ls-free-spin', 'ls-ad-spin', 'reveal-claim-btn'].includes(button.id) || button.matches('.pack-decrypt-btn, .pack-need-coins-btn')) return;
        const cue = openButtons.has(button.id) ? 'open'
            : closeButtons.has(button.id) ? 'back'
            : button.matches('.armory-tab-btn, .filter-btn, .menu-languages button, .armory-item-card') ? 'select'
            : 'click';
        play(cue);
    }, true);

    document.addEventListener('pointerdown', () => { unlocked = true; }, { capture: true });
    document.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') unlocked = true;
    }, { capture: true });
    document.addEventListener('change', event => {
        if (!event.target.matches('#pause-menu input[type="checkbox"]')) return;
        if (!event.isTrusted) { if (!getSFXEnabled()) stop(); return; }
        unlocked = true;
        if (!getSFXEnabled()) stop();
        else play('toggle');
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    preload();
})();
