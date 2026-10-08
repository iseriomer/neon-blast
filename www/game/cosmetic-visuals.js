// Geometry belongs to the cosmetic; energy colour belongs to the current build.
(() => {
    const ships = new Set(['core_dragon', 'core_aurora', 'core_void_king', 'core_raptor', 'core_manta', 'core_seraph', 'core_eclipse', 'core_monarch']);
    const newShips = new Set(['core_raptor', 'core_manta', 'core_seraph', 'core_eclipse', 'core_monarch']);
    const detailedShots = new Set(['proj_storm', 'proj_phoenix', 'proj_comet', 'proj_helix', 'proj_razor', 'proj_nova', 'proj_lance']);
    const colorCache = new Map();
    let colorProbe;
    const alpha = (color, opacity) => {
        color = color || '#00ffff';
        let channels = colorCache.get(color);
        if (!channels) {
            if (/^#(?:[a-f\d]{3}|[a-f\d]{6})$/i.test(color)) {
                let hex = color.slice(1);
                if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
                channels = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
            } else {
                // Default builds use "white"; also support legacy CSS rgb/hsl colours.
                if (!colorProbe) {
                    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
                    colorProbe = canvas.getContext('2d', { willReadFrequently: true });
                }
                colorProbe.clearRect(0, 0, 1, 1);
                colorProbe.fillStyle = '#00ffff'; colorProbe.fillStyle = color;
                colorProbe.fillRect(0, 0, 1, 1);
                channels = Array.from(colorProbe.getImageData(0, 0, 1, 1).data).slice(0, 3);
            }
            colorCache.set(color, channels);
        }
        return `rgba(${channels.join(',')},${opacity})`;
    };
    const polygon = (ctx, points, scale) => {
        ctx.beginPath();
        points.forEach(([x, y], i) => i ? ctx.lineTo(x * scale, y * scale) : ctx.moveTo(x * scale, y * scale));
        ctx.closePath();
    };
    const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); };
    function drawShip(ctx, id, color, r, t) {
        if (!newShips.has(id)) return false;
        ctx.save();
        // Short, bounded exhaust: no extra particles or gameplay changes.
        const jet = r * (0.85 + Math.sin(t * 19) * 0.12);
        for (const y of [-0.44, 0.44]) {
            ctx.fillStyle = alpha(color, 0.28);
            polygon(ctx, [[-0.65, y - 0.16], [-0.65 - jet / r, y], [-0.65, y + 0.16]], r); ctx.fill();
            ctx.strokeStyle = color; ctx.lineWidth = r * 0.09;
            ctx.beginPath(); ctx.moveTo(-r * 0.65, y * r); ctx.lineTo(-r * 0.65 - jet * 0.65, y * r); ctx.stroke();
        }
        const hulls = {
            core_raptor: [[1.7,0],[0.3,-0.28],[-0.55,-1.1],[-0.35,-0.28],[-0.85,-0.4],[-0.6,0],[-0.85,0.4],[-0.35,0.28],[-0.55,1.1],[0.3,0.28]],
            core_manta: [[1.35,0],[0.15,-0.4],[-0.2,-1.32],[-0.92,-0.95],[-0.48,-0.2],[-0.8,0],[-0.48,0.2],[-0.92,0.95],[-0.2,1.32],[0.15,0.4]],
            core_seraph: [[1.5,0],[0.5,-0.25],[0.1,-1.22],[-0.65,-0.92],[-0.25,-0.65],[-0.75,-0.4],[-0.6,0],[-0.75,0.4],[-0.25,0.65],[-0.65,0.92],[0.1,1.22],[0.5,0.25]],
            core_eclipse: [[1.42,0],[0.3,-0.48],[-0.45,-0.72],[-0.86,-0.32],[-0.55,0],[-0.86,0.32],[-0.45,0.72],[0.3,0.48]],
            core_monarch: [[1.6,0],[0.55,-0.38],[0.35,-1.2],[-0.25,-0.72],[-0.9,-0.85],[-0.66,-0.25],[-0.85,0],[-0.66,0.25],[-0.9,0.85],[-0.25,0.72],[0.35,1.2],[0.55,0.38]]
        };
        polygon(ctx, hulls[id], r);
        ctx.fillStyle = '#0b141c'; ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = Math.max(1.4, r * 0.09); ctx.stroke();
        ctx.fillStyle = alpha(color, 0.35);
        polygon(ctx, [[1.35,0],[0,-0.17],[-0.55,0],[0,0.17]], r); ctx.fill();
        // Each ship has a distinct animated silhouette/detail.
        if (id === 'core_manta' || id === 'core_seraph') {
            for (const sign of [-1, 1]) {
                ctx.beginPath(); ctx.moveTo(r * 0.45, 0);
                ctx.lineTo(-r * 0.35, sign * r * 0.85);
                ctx.lineTo(-r * 0.6, sign * r * 0.63); ctx.stroke();
                circle(ctx, -r * 0.23, sign * r * 0.65, r * (0.08 + Math.sin(t * 4) * 0.015));
                ctx.fillStyle = '#ffffff'; ctx.fill();
            }
        } else if (id === 'core_eclipse') {
            ctx.save(); ctx.rotate(t * 0.45);
            ctx.strokeStyle = alpha(color, 0.65); ctx.lineWidth = r * 0.1;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.arc(0, 0, r * 1.03, i * Math.PI * 2 / 3, i * Math.PI * 2 / 3 + 1.3); ctx.stroke();
            }
            ctx.restore();
        } else if (id === 'core_monarch') {
            ctx.fillStyle = color;
            for (const sign of [-1, 1]) {
                polygon(ctx, [[0.6,sign * 0.4],[0.9,sign * 0.76],[0.25,sign * 0.6]], r); ctx.fill();
            }
        } else {
            ctx.strokeStyle = alpha(color, 0.65);
            for (const sign of [-1, 1]) {
                ctx.beginPath(); ctx.moveTo(-r * 0.35, sign * r * 0.7); ctx.lineTo(r * 0.2, sign * r * 0.24); ctx.stroke();
            }
        }
        ctx.fillStyle = color; circle(ctx, r * 0.16, 0, r * 0.23); ctx.fill();
        ctx.fillStyle = '#ffffff'; circle(ctx, r * 0.2, 0, r * 0.11); ctx.fill();
        ctx.restore();
        return true;
    }
    function drawProjectile(ctx, id, color, r, t) {
        ctx.save();
        ctx.fillStyle = color; ctx.strokeStyle = color;
        ctx.lineWidth = Math.max(1, r * 0.28);
        switch (id) {
            case 'proj_laser':
            case 'proj_lance':
                polygon(ctx, [[2.5,0],[-1.4,-0.48],[-0.85,0],[-1.4,0.48]], r); ctx.fill();
                if (id === 'proj_lance') {
                    ctx.strokeStyle = alpha(color, 0.5);
                    ctx.beginPath(); ctx.moveTo(-r * 2.6,-r * 0.6); ctx.lineTo(-r * 1.4,0); ctx.lineTo(-r * 2.6,r * 0.6); ctx.stroke();
                }
                ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.6,-r * 0.12,r * 2,r * 0.24); break;
            case 'proj_comet': {
                const tail = ctx.createLinearGradient(-r * 3.8,0,r,0);
                tail.addColorStop(0, alpha(color,0)); tail.addColorStop(0.8,alpha(color,0.6)); tail.addColorStop(1,color);
                ctx.fillStyle = tail;
                polygon(ctx, [[1,0],[-3.8,-0.15],[-1,-0.75],[-0.2,-0.8],[1,0],[-0.2,0.8],[-1,0.75],[-3.8,0.15]], r); ctx.fill();
                ctx.fillStyle = color; circle(ctx,0,0,r * 0.8); ctx.fill();
                ctx.fillStyle = '#ffffff'; circle(ctx,r * 0.15,0,r * 0.35); ctx.fill(); break;
            }
            case 'proj_helix':
                for (const sign of [-1,1]) {
                    ctx.strokeStyle = sign === 1 ? color : alpha(color,0.45);
                    ctx.beginPath();
                    for (let i=0;i<=12;i++) {
                        const x = -2 + i/3, y = Math.sin(i * 0.6 + t * 6) * 0.65 * sign;
                        if (i===0) ctx.moveTo(x*r,y*r); else ctx.lineTo(x*r,y*r);
                    } ctx.stroke();
                }
                ctx.fillStyle = '#ffffff'; circle(ctx,r*1.5,0,r*0.28); ctx.fill(); break;
            case 'proj_razor':
                ctx.rotate(t * 5);
                for (let i=0;i<3;i++) {
                    ctx.rotate(Math.PI*2/3);
                    polygon(ctx, [[1.65,0],[0.3,-0.3],[-0.2,-0.95],[0,0]], r); ctx.fill();
                }
                ctx.fillStyle = '#ffffff'; circle(ctx,0,0,r*0.3); ctx.fill(); break;
            case 'proj_nova':
            case 'proj_plasma':
                circle(ctx,0,0,r * (id === 'proj_nova' ? 1.15 : 1)); ctx.stroke();
                if (id === 'proj_nova') {
                    ctx.save(); ctx.rotate(t*3);
                    for (let i=0;i<4;i++) { ctx.rotate(Math.PI/2); ctx.fillRect(r*0.7,-r*0.12,r*0.9,r*0.24); }
                    ctx.restore();
                }
                ctx.fillStyle = '#ffffff'; circle(ctx,0,0,r*0.35); ctx.fill(); break;
            case 'proj_shuriken':
                ctx.rotate(t*8);
                polygon(ctx, [[1.6,0],[0.4,0.4],[0,1.6],[-0.4,0.4],[-1.6,0],[-0.4,-0.4],[0,-1.6],[0.4,-0.4]], r); ctx.fill();
                ctx.fillStyle = '#ffffff'; circle(ctx,0,0,r*0.3); ctx.fill(); break;
            case 'proj_pixel':
                ctx.fillStyle = alpha(color,0.3); ctx.fillRect(-r*2.8,-r*0.3,r*0.6,r*0.6);
                ctx.fillStyle = color; ctx.fillRect(-r,-r,r*2,r*2);
                ctx.fillStyle = '#ffffff'; ctx.fillRect(-r*0.35,-r*0.35,r*0.7,r*0.7); break;
            case 'proj_void':
                polygon(ctx, [[1.9,0],[-1.4,-0.9],[-0.6,0],[-1.4,0.9]], r); ctx.fill();
                ctx.fillStyle = '#ffffff'; circle(ctx,0,0,r*0.3); ctx.fill(); break;
            case 'proj_storm':
                ctx.lineWidth = Math.max(2, r * 0.5);
                ctx.beginPath(); ctx.moveTo(-r*2,0); ctx.lineTo(-r*0.7,-r*0.8); ctx.lineTo(0,r*0.6); ctx.lineTo(r*2,0); ctx.stroke();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(0.7,r*0.12); ctx.stroke(); break;
            case 'proj_phoenix':
                ctx.beginPath(); ctx.moveTo(r*2,0); ctx.quadraticCurveTo(0,-r*1.2,-r*1.5,-r*0.8);
                ctx.lineTo(-r*0.8,0); ctx.lineTo(-r*1.5,r*0.8); ctx.quadraticCurveTo(0,r*1.2,r*2,0); ctx.closePath(); ctx.fill();
                ctx.fillStyle = '#ffffff'; circle(ctx,0,0,r*0.4); ctx.fill(); break;
            default:
                circle(ctx,0,0,r); ctx.fill(); ctx.fillStyle = '#ffffff'; circle(ctx,0,0,r*0.4); ctx.fill();
        }
        ctx.restore();
    }
    window.CosmeticVisuals = { alpha, isShip: id => ships.has(id), detailedShot: id => detailedShots.has(id), drawShip, drawProjectile };
})();
