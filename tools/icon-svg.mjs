// The כדורגלן icon: a classic white football on a deep pitch-green to night-blue tile, with a gold
// question badge (it's a quiz). Used for the launcher icons, the web icons and the in-app logo.
export const COLORS = { bg: '#0B3B2E', top: '#13A262', mid: '#0C5A43', bottom: '#0A1D38', gold1: '#FFE08A', gold2: '#F0A93A', ink: '#0B1830' };

function pentagon(cx, cy, r, rot) {
  const pts = [];
  for (let k = 0; k < 5; k++) {
    const a = ((rot + k * 72) * Math.PI) / 180;
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}
const path = (pts) => 'M' + pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';

// The ball and badge drawn in a 512 box, centered.
function art() {
  const cx = 244, cy = 236, R = 150;
  // Classic pattern: a black pentagon in the middle, five black pentagons around it (cut by the edge),
  // and the seams of the white hexagons between them.
  const center = pentagon(cx, cy, 44, -90);
  const D = 132, r2 = 44;
  const outerP = center.map((v, k) => { const a = -90 + k * 72; const ar = (a * Math.PI) / 180; return pentagon(cx + D * Math.cos(ar), cy + D * Math.sin(ar), r2, a + 180); });
  const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const line = (p, q) => `<path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}"/>`;
  let seams = '', outer = '';
  outerP.forEach((P, k) => {
    outer += `<path d="${path(P)}"/>`;
    seams += line(center[k], P[0]);
    const N = outerP[(k + 1) % 5];
    let best = null;
    P.forEach((p) => N.forEach((q) => { const d = dist(p, q); if (!best || d < best[2]) best = [p, q, d]; }));
    seams += line(best[0], best[1]);
    // a seam from each side vertex out to the edge of the ball
    [P[2], P[3]].forEach((p) => { const a = Math.atan2(p[1] - cy, p[0] - cx); seams += line(p, [cx + (R + 8) * Math.cos(a), cy + (R + 8) * Math.sin(a)]); });
  });
  const bx = 360, by = 352;
  return `
  <defs>
    <clipPath id="ball"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath>
    <radialGradient id="shade" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.7" stop-color="#EEF3F6"/><stop offset="1" stop-color="#C9D4DD"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${COLORS.gold1}"/><stop offset="1" stop-color="${COLORS.gold2}"/></linearGradient>
  </defs>
  <circle cx="${cx}" cy="${cy + 10}" r="${R}" fill="#000" opacity="0.28"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#shade)"/>
  <g clip-path="url(#ball)">
    <g fill="${COLORS.ink}">${outer}<path d="${path(center)}"/></g>
    <g stroke="${COLORS.ink}" stroke-width="7" stroke-linecap="round" opacity="0.85">${seams}</g>
  </g>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${COLORS.ink}" stroke-opacity="0.25" stroke-width="4"/>
  <circle cx="${bx}" cy="${by + 6}" r="76" fill="#000" opacity="0.3"/>
  <circle cx="${bx}" cy="${by}" r="76" fill="url(#gold)" stroke="#FFF6D6" stroke-width="7"/>
  <path d="M${bx - 24} ${by - 20}a24 24 0 1 1 33 22c-9 4-9 9-9 17" fill="none" stroke="${COLORS.ink}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${bx}" cy="${by + 38}" r="9.5" fill="${COLORS.ink}"/>`;
}

// shape: 'square' (rounded tile), 'circle', 'full' (fills the square; iOS / maskable crop it), 'none' (just the art).
export function iconSvg({ size = 512, shape = 'square', scale = 0.76, bg = true } = {}) {
  const s = 512;
  const inner = s * scale, off = (s - inner) / 2;
  const tile = `
  <defs>
    <linearGradient id="bgG" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COLORS.top}"/><stop offset="0.45" stop-color="${COLORS.mid}"/><stop offset="1" stop-color="${COLORS.bottom}"/></linearGradient>
    <radialGradient id="glow" cx="80%" cy="10%" r="70%"><stop offset="0" stop-color="#7CF2B5" stop-opacity="0.45"/><stop offset="1" stop-color="#7CF2B5" stop-opacity="0"/></radialGradient>
  </defs>`;
  let back = '';
  if (bg && shape !== 'none') {
    const shapeEl = shape === 'circle' ? `<circle cx="256" cy="256" r="256" fill="url(#bgG)"/><circle cx="256" cy="256" r="256" fill="url(#glow)"/>`
      : shape === 'full' ? `<rect width="512" height="512" fill="url(#bgG)"/><rect width="512" height="512" fill="url(#glow)"/>`
      : `<rect width="512" height="512" rx="116" fill="url(#bgG)"/><rect width="512" height="512" rx="116" fill="url(#glow)"/>`;
    back = tile + shapeEl + `<circle cx="256" cy="256" r="190" fill="none" stroke="#FFFFFF" stroke-opacity="0.07" stroke-width="6"/><path d="M0 256H512" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="6"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}">${back}<g transform="translate(${off.toFixed(1)} ${off.toFixed(1)}) scale(${scale})">${art()}</g></svg>`;
}
