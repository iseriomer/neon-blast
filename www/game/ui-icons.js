// ui-icons.js - Cyberpunk Vector SVG Icon System for Neon Blast
// Replaces amateur emojis with sharp, scalable, neon-glow vector iconography.

const IconSystem = {
    // Registry of custom SVG paths
    ICONS: {
        shield: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00ffff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L3 6v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V6l-9-4z" fill="${c ? c + '22' : 'rgba(0,255,255,0.15)'}"/>
                <path d="M12 6l-5 2.2v4.3c0 3.3 2.1 6.4 5 7.5 2.9-1.1 5-4.2 5-7.5V8.2L12 6z" fill="${c || '#00ffff'}" opacity="0.6"/>
                <circle cx="12" cy="12" r="1.5" fill="#fff"/>
            </svg>
        `,

        reroll: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#a855f7'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                <path d="M21 21v-5h-5"/>
                <circle cx="12" cy="12" r="2.5" fill="${c || '#a855f7'}" opacity="0.8"/>
            </svg>
        `,

        wheel: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00f0ff'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" stroke-dasharray="4 2"/>
                <circle cx="12" cy="12" r="5" fill="${c ? c + '33' : 'rgba(0,240,255,0.2)'}"/>
                <line x1="12" y1="2" x2="12" y2="7"/>
                <line x1="12" y1="17" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="7" y2="12"/>
                <line x1="17" y1="12" x2="22" y2="12"/>
                <circle cx="12" cy="12" r="2" fill="#fff"/>
            </svg>
        `,

        quests: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00f0ff'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="12 2 21 7 21 17 12 22 3 17 3 7" fill="${c ? c + '22' : 'rgba(0,240,255,0.1)'}"/>
                <line x1="8" y1="9" x2="16" y2="9"/>
                <line x1="8" y1="12" x2="16" y2="12"/>
                <line x1="8" y1="15" x2="13" y2="15"/>
                <circle cx="6" cy="9" r="1" fill="${c || '#00f0ff'}"/>
                <circle cx="6" cy="12" r="1" fill="${c || '#00f0ff'}"/>
                <circle cx="6" cy="15" r="1" fill="${c || '#00f0ff'}"/>
            </svg>
        `,

        gem: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#c084fc'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="6 3 18 3 22 9 12 22 2 9" fill="${c ? c + '28' : 'rgba(192,132,252,0.15)'}"/>
                <polyline points="2 9 12 22 22 9"/>
                <polyline points="6 3 12 9 18 3"/>
                <line x1="12" y1="9" x2="12" y2="22"/>
            </svg>
        `,

        coin: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%">
                <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fef08a" stroke-width="1.6"/>
                <circle cx="12" cy="12" r="7.5" fill="#d97706" stroke="#fbbf24" stroke-width="1.2"/>
                <circle cx="12" cy="12" r="6" fill="#b45309" opacity="0.4"/>
                <text x="12" y="16" text-anchor="middle" font-size="11" font-weight="900" fill="#ffffff" font-family="'Segoe UI', Roboto, sans-serif">N</text>
            </svg>
        `,

        coin_stack: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#fbbf24'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="6" rx="8" ry="3" fill="#f59e0b" fill-opacity="0.3"/>
                <path d="M4 6v5c0 1.66 3.58 3 8 3s8-1.34 8-3V6" fill="#d97706" fill-opacity="0.2"/>
                <path d="M4 11v5c0 1.66 3.58 3 8 3s8-1.34 8-3v-5" fill="#b45309" fill-opacity="0.3"/>
                <ellipse cx="12" cy="6" rx="5" ry="1.8" stroke="#fef08a"/>
            </svg>
        `,

        ad_free: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ef4444'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9" stroke="${c || '#ef4444'}" fill="rgba(239,68,68,0.1)"/>
                <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke-width="2.5"/>
                <text x="12" y="15" text-anchor="middle" font-size="7.5" font-weight="900" fill="#ffffff" stroke="none" font-family="sans-serif">ADS</text>
            </svg>
        `,

        crate: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#f59e0b'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="2" fill="${c ? c + '22' : 'rgba(245,158,11,0.15)'}"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="12" y1="4" x2="12" y2="20"/>
                <rect x="9.5" y="8" width="5" height="4" rx="1" fill="${c || '#f59e0b'}"/>
                <circle cx="12" cy="10" r="0.8" fill="#fff"/>
            </svg>
        `,

        lightning: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c || '#eab308'}" stroke="${c || '#fef08a'}" stroke-width="1.2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
        `,

        fire: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c || '#f97316'}" stroke="${c || '#ffedd5'}" stroke-width="1">
                <path d="M12 2c-.5 2-1 3.5-3 5-2 1.5-3 3.5-3 6a7 7 0 0 0 14 0c0-3-2-5.5-4-7.5-1.5-1.5-2.5-3-3-3.5-.3 1-.7 1.8-1 2z"/>
                <path d="M12 14c-1 0-2 1-2 2a2 2 0 0 0 4 0c0-1-1-2-2-2z" fill="#fef08a"/>
            </svg>
        `,

        crown: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c || '#fbbf24'}" stroke="${c || '#fef08a'}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 18h18l-2-11-5 5-2-7-2 7-5-5-2 11z"/>
                <circle cx="3" cy="7" r="1.5" fill="#fef08a"/>
                <circle cx="8" cy="12" r="1.2" fill="#fff"/>
                <circle cx="12" cy="5" r="1.8" fill="#fff"/>
                <circle cx="16" cy="12" r="1.2" fill="#fff"/>
                <circle cx="21" cy="7" r="1.5" fill="#fef08a"/>
            </svg>
        `,

        star: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c || '#fbbf24'}" stroke="${c || '#fef08a'}" stroke-width="1">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
        `,

        check: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#22c55e'}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
        `,

        crosshair: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ff0055'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="8"/>
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="2" x2="12" y2="6"/>
                <line x1="12" y1="18" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="6" y2="12"/>
                <line x1="18" y1="12" x2="22" y2="12"/>
            </svg>
        `,

        skull: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ff0055'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2C7 2 4 5.5 4 10c0 3 1.5 5 3 6v4h10v-4c1.5-1 3-3 3-6 0-4.5-3-8-8-8z" fill="${c ? c + '22' : 'rgba(255,0,85,0.15)'}"/>
                <circle cx="8.5" cy="10" r="2" fill="${c || '#ff0055'}"/>
                <circle cx="15.5" cy="10" r="2" fill="${c || '#ff0055'}"/>
                <line x1="9.5" y1="17" x2="9.5" y2="19"/>
                <line x1="12" y1="17" x2="12" y2="19"/>
                <line x1="14.5" y1="17" x2="14.5" y2="19"/>
            </svg>
        `,

        boss: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ff0055'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M2 7l4 2 2-5 4 4 4-4 2 5 4-2-2 11-6 4-6-4L2 7z" fill="${c ? c + '33' : 'rgba(255,0,85,0.2)'}"/>
                <circle cx="9" cy="11" r="1.5" fill="#ff0055"/>
                <circle cx="15" cy="11" r="1.5" fill="#ff0055"/>
                <line x1="10" y1="16" x2="14" y2="16"/>
            </svg>
        `,

        gamepad: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00f0ff'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="6" fill="${c ? c + '22' : 'rgba(0,240,255,0.1)'}"/>
                <line x1="6" y1="12" x2="10" y2="12"/>
                <line x1="8" y1="10" x2="8" y2="14"/>
                <circle cx="15.5" cy="10.5" r="1" fill="${c || '#00f0ff'}"/>
                <circle cx="17.5" cy="12.5" r="1" fill="${c || '#00f0ff'}"/>
            </svg>
        `,

        trophy: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#fbbf24'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 3h12v7a6 6 0 0 1-12 0V3z" fill="${c ? c + '22' : 'rgba(251,191,36,0.15)'}"/>
                <path d="M6 5H3a2 2 0 0 0-2 2v1a4 4 0 0 0 4 4h1"/>
                <path d="M18 5h3a2 2 0 0 1 2 2v1a4 4 0 0 1-4 4h-1"/>
                <line x1="12" y1="16" x2="12" y2="20"/>
                <line x1="8" y1="20" x2="16" y2="20"/>
            </svg>
        `,

        timer: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ef4444'}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="13" r="8"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="13" x2="15" y2="13"/>
                <line x1="12" y1="2" x2="12" y2="4"/>
                <line x1="10" y1="2" x2="14" y2="2"/>
            </svg>
        `,

        // --- SPECIFIC PERK ICONS ---
        perk_rapid_fire: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00ffff'}" stroke-width="2" stroke-linecap="round">
                <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="${c || '#00ffff'}" fill-opacity="0.3"/>
            </svg>
        `,

        perk_machine_gun: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ff00ff'}" stroke-width="1.8">
                <rect x="3" y="9" width="18" height="6" rx="2" fill="${c || '#ff00ff'}" fill-opacity="0.2"/>
                <line x1="7" y1="6" x2="7" y2="9"/>
                <line x1="12" y1="6" x2="12" y2="9"/>
                <line x1="17" y1="6" x2="17" y2="9"/>
                <circle cx="21" cy="12" r="1.5" fill="${c || '#ff00ff'}"/>
            </svg>
        `,

        perk_sniper: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00ff00'}" stroke-width="1.8">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="5" stroke-dasharray="2 2"/>
                <circle cx="12" cy="12" r="1.5" fill="${c || '#00ff00'}"/>
                <line x1="12" y1="1" x2="12" y2="5"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="1" y1="12" x2="5" y2="12"/>
                <line x1="19" y1="12" x2="23" y2="12"/>
            </svg>
        `,

        perk_multishot: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ffff00'}" stroke-width="2" stroke-linecap="round">
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="12" y1="20" x2="6" y2="7"/>
                <line x1="12" y1="20" x2="18" y2="7"/>
                <circle cx="12" cy="4" r="1.5" fill="${c || '#ffff00'}"/>
                <circle cx="6" cy="7" r="1.5" fill="${c || '#ffff00'}"/>
                <circle cx="18" cy="7" r="1.5" fill="${c || '#ffff00'}"/>
            </svg>
        `,

        perk_freeze: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#0088ff'}" stroke-width="1.8" stroke-linecap="round">
                <line x1="12" y1="2" x2="12" y2="22"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                <line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/>
                <circle cx="12" cy="12" r="3" fill="${c || '#0088ff'}" fill-opacity="0.3"/>
            </svg>
        `,

        perk_knockback: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ff8800'}" stroke-width="2" stroke-linecap="round">
                <path d="M4 12h14m0 0l-5-5m5 5l-5 5"/>
                <path d="M2 7v10" stroke-width="3"/>
            </svg>
        `,

        perk_orbitals: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#8800ff'}" stroke-width="1.8">
                <circle cx="12" cy="12" r="4" fill="${c || '#8800ff'}"/>
                <ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-30 12 12)"/>
                <circle cx="4" cy="9" r="2" fill="${c || '#8800ff'}"/>
                <circle cx="20" cy="15" r="2" fill="${c || '#8800ff'}"/>
            </svg>
        `,

        perk_laser: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#ff0033'}" stroke-width="2" stroke-linecap="round">
                <line x1="12" y1="2" x2="12" y2="22" stroke-width="3"/>
                <circle cx="12" cy="12" r="7" stroke-dasharray="3 3"/>
                <circle cx="12" cy="12" r="2" fill="#fff"/>
            </svg>
        `,

        perk_lightning: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#00e5ff'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="13 2 4 13 11 13 9 22 20 9 13 9 15 2" fill="${c || '#00e5ff'}" fill-opacity="0.3"/>
            </svg>
        `,

        perk_singularity: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="${c || '#7928ca'}" stroke-width="1.8">
                <circle cx="12" cy="12" r="5" fill="#000" stroke="${c || '#7928ca'}" stroke-width="2.5"/>
                <circle cx="12" cy="12" r="8" stroke-dasharray="4 2"/>
                <circle cx="12" cy="12" r="10.5" stroke-dasharray="2 3"/>
            </svg>
        `,

        perk_explosive: (c) => `
            <svg viewBox="0 0 24 24" width="100%" height="100%" fill="${c || '#f97316'}" stroke="${c || '#fef08a'}" stroke-width="1.2">
                <polygon points="12 2 14.5 8 21 8.5 16 13 18 19.5 12 16 6 19.5 8 13 3 8.5 9.5 8 12 2"/>
            </svg>
        `
    },

    // Return HTML string for an icon
    get(name, options = {}) {
        const size = options.size || 22;
        const color = options.color || null;
        const className = options.className || '';
        const fn = this.ICONS[name] || this.ICONS['star'];
        const svgContent = fn(color);

        return `<span class="neon-icon-badge ${className}" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;vertical-align:middle;flex-shrink:0;">${svgContent}</span>`;
    },

    // Return perk icon by perk ID
    getPerkIcon(perkId, color = '#00ffff', size = 32) {
        const mapping = {
            rapid_fire: 'perk_rapid_fire',
            pulse_accelerator: 'perk_rapid_fire',
            machine_gun: 'perk_machine_gun',
            sniper: 'perk_sniper',
            critical_lens: 'perk_sniper',
            critical_cascade: 'perk_sniper',
            double_shot: 'perk_multishot',
            split_shot: 'perk_multishot',
            shotgun: 'perk_multishot',
            back_shot: 'perk_multishot',
            side_cannons: 'perk_multishot',
            freeze: 'perk_freeze',
            cryo_fracture: 'perk_freeze',
            knockback: 'perk_knockback',
            kinetic_core: 'perk_knockback',
            orbitals: 'perk_orbitals',
            orbital_size: 'perk_orbitals',
            screen_wrap: 'perk_singularity',
            singularity: 'perk_singularity',
            execute: 'skull',
            titan_protocol: 'boss',
            homing: 'crosshair',
            ricochet: 'crosshair',
            giant_bullet: 'perk_explosive',
            explosive_shot: 'perk_explosive',
            demolition_matrix: 'perk_explosive',
            pulse_payload: 'perk_explosive',
            chain_lightning: 'perk_lightning',
            chain_lightning_count: 'perk_lightning',
            chain_lightning_damage: 'perk_lightning',
            electric_aura: 'perk_lightning',
            electric_aura_damage: 'perk_lightning',
            electric_aura_rate: 'perk_lightning',
            electric_aura_area: 'perk_lightning',
            energy_shield: 'shield',
            laser_beam: 'perk_laser',
            laser_damage: 'perk_laser',
            pulse_core: 'perk_laser'
        };

        const iconKey = mapping[perkId] || 'star';
        return this.get(iconKey, { size: size, color: color, className: 'perk-card-icon-svg' });
    }
};

window.IconSystem = IconSystem;
