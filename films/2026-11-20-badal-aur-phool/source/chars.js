// chars.js — Badal (cloud), Phool (sunflower in a pot), the Sun, small tulips and bushes. World units, y down.
import * as T from './toon.js';
import { P, pieEye, brow, mouth, glove, hose, union } from './parts.js';
import { clamp, lerp, TAU } from '/core/lib.js';
const { shape, stroke, ell, arc, spline, noodle, quad, push, pop, translate, rotate, scale, tx, S } = T;

export const C = {
  cloud: '#F6FBFF', cloudSh: '#BCD6EE', rainCloud: '#DCE6F2', rainSh: '#8EA9C8',
  cheek: '#FF8FA0', petal: '#FFC928', petalSh: '#F09A12', face: '#B5622B', faceSh: '#8E4520',
  stem: '#46A442', stemSh: '#2F7D30', pot: '#DB5F38', potSh: '#AE4024', potRim: '#E9774E',
  sun: '#FFB52A', sunSh: '#FF8A1F', ray: '#FFD34D', drop: '#5FB7F0', dropSh: '#2F86C9',
};
const mixC = (a, b, u) => { const p = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(u))).toString(16).padStart(2, '0')).join(''); };
export { mixC };

function fillLocal(pts, col) { const s = pts.map(p => tx(p[0], p[1])), g = T.g; g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = col; g.beginPath(); g.moveTo(s[0][0], s[0][1]); for (const q of s) g.lineTo(q[0], q[1]); g.closePath(); g.fill(); }
function cheeks(x, y, r, a = .75) { const g = T.g; for (const s of [-1, 1]) { const [cx, cy] = tx(x * s, y); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; g.fillStyle = C.cheek; g.beginPath(); g.ellipse(cx, cy, r * T.zoom(), r * .62 * T.zoom(), 0, 0, TAU); g.fill(); g.globalAlpha = 1; } }
function face(o, ex, ey, erx, ery, my, mw, lidCol) {
  const eyes = o.eyes || {};
  for (const s of [-1, 1]) {
    const type = eyes.wink && s === 1 ? 'shut' : eyes.type;
    pieEye(ex * s, ey, erx, ery, { ...eyes, type, side: -s, lidCol, lid: eyes.lid });
  }
  if (o.brows) for (const s of [-1, 1]) brow(ex * s, ey - ery * 1.55, erx * 1.5, o.brows, s);
  const m = o.mouth || { type: 'smile' };
  mouth(0, my, m.w || mw, m.type, m);
}

// ——— Badal: a puffy cloud whose whole body is the character ———
// p: {x,y,k,sx,sy,lean,rain 0..1 (darker underside), grey 0..1 (sad), eyes, brows, mouth, armL, armR {x,y,hand,front,bend}, tear}
export function badal(p) {
  push(); translate(p.x, p.y); scale(p.k || 1); if (p.lean) rotate(p.lean); scale(p.sx || 1, p.sy || 1);
  const body = mixC(mixC(C.cloud, C.rainCloud, p.rain || 0), '#C9CFD8', (p.grey || 0) * .8);
  const sh = mixC(mixC(C.cloudSh, C.rainSh, p.rain || 0), '#98A2B0', (p.grey || 0) * .8);
  const arm = (A, s) => {
    const shp = [s * 98, 18];
    hose(shp, [A.x, A.y], A.bend ?? s * -18, 15);
    glove(A.x, A.y, A.rot ?? Math.atan2(A.y - shp[1], A.x - shp[0]), A.hand || 'open', 1.05, { flip: A.flip ?? s < 0 });
  };
  for (const [k, s] of [['armL', -1], ['armR', 1]]) if (p[k] && !p[k].front) arm(p[k], s);
  const puffs = [ell(0, -15, 100, 82), ell(-82, 18, 62, 54), ell(84, 16, 64, 56), ell(-45, -68, 56, 50), ell(48, -72, 60, 54), ell(0, 42, 96, 48)];
  const ps = union(puffs, body, S.lw);
  // underside shadow band (hard-edged), clipped to the body
  const g = T.g, clip = new Path2D(); ps.forEach(q => clip.addPath(q));
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clip(clip); fillLocal(ell(25, 92, 170, 52, 40), sh); fillLocal(ell(-70, -60, 30, 18, 20), '#FFFFFF'); g.restore();
  cheeks(56, 18, 15);
  face(p, 30, -22, 19, 26, 22, 46, body);
  if (p.tear) { const ty = 10 + p.tear * 60; shape(spline([[-34, ty - 14], [-27, ty], [-34, ty + 7], [-41, ty]], true, 5), { fill: C.drop, lw: S.lw * .6 }); }
  for (const [k, s] of [['armL', -1], ['armR', 1]]) if (p[k] && p[k].front) arm(p[k], s);
  pop();
}

// ——— Phool: sunflower in a clay pot. Origin = pot bottom on the ground. ———
// p: {x,y,k,droop 0..1,sway(rad),eyes,brows,mouth,armL,armR {x,y,hand} relative to the head-less stem (local), wilt 0..1 colour, squash}
export function phoolHead(p) {
  const d = p.droop || 0, k = p.k || 1, sq = p.squash || 1;
  const hx = lerp(0, 75, d) + Math.sin(p.sway || 0) * 60, hy = lerp(-395, -255, d) * sq;
  return [p.x + hx * k, p.y + hy * k];
}
export function phool(p) {
  const d = p.droop || 0, sq = p.squash || 1;
  push(); translate(p.x, p.y); scale(p.k || 1);
  const hx = lerp(0, 75, d) + Math.sin(p.sway || 0) * 60, hy = lerp(-395, -255, d) * sq;
  const base = [0, -120], ctrl = [lerp(0, -40, d) - Math.sin(p.sway || 0) * 20, lerp(-260, -250, d) * sq];
  const stemC = quad(base, ctrl, [hx, hy + 40], 16);
  const mid = stemC[7];
  // leaf-arms (behind the stem) with white gloves
  const arm = (A, s) => {
    const sh = [mid[0] + s * 6, mid[1] + 10];
    shape(noodle(sh, [A.x, A.y], A.bend ?? s * 20, 14, 14), { fill: C.stem, lw: S.lw * .8 });
    glove(A.x, A.y, A.rot ?? Math.atan2(A.y - sh[1], A.x - sh[0]), A.hand || 'open', .95, { flip: A.flip ?? s < 0 });
  };
  // stem
  const stemPts = [];
  { const L = [], R = []; for (let i = 0; i < stemC.length; i++) { const a = stemC[Math.max(0, i - 1)], b = stemC[Math.min(stemC.length - 1, i + 1)]; let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l; const w = lerp(24, 17, i / (stemC.length - 1)) / 2; L.push([stemC[i][0] - dy * w, stemC[i][1] + dx * w]); R.push([stemC[i][0] + dy * w, stemC[i][1] - dx * w]); } stemPts.push(...L, ...R.reverse()); }
  for (const [k, s] of [['armL', -1], ['armR', 1]]) if (p[k] && !p[k].front) arm(p[k], s);
  shape(stemPts, { fill: C.stem, lw: S.lw * .85 });
  // a still leaf near the base
  shape(spline([[0, -150], [-40, -175], [-78, -168], [-50, -148]], true, 6), { fill: C.stem, lw: S.lw * .8 });
  // pot
  shape([[-58, 0], [58, 0], [70, -112], [-70, -112]], { fill: C.pot, lw: S.lw, shade: () => fillLocal([[24, 0], [58, 0], [70, -112], [36, -112]], C.potSh) });
  shape(T.rr(-80, -140, 160, 34, 10), { fill: C.potRim, lw: S.lw, shade: () => fillLocal(T.rect(34, -140, 50, 34), C.pot) });
  T.dot(-42, -62, 6, '#F6A07A'); T.dot(-30, -40, 4, '#F6A07A');
  // head
  push(); translate(hx, hy); rotate(d * .75 + Math.sin(p.sway || 0) * .4 + (p.tilt || 0));
  const wilt = p.wilt ?? d, pc = mixC(C.petal, '#C9A548', wilt * .7), psh = mixC(C.petalSh, '#A07A30', wilt * .7);
  const n = 14, pl = lerp(64, 50, wilt) * (p.bloom || 1);
  for (let layer = 0; layer < 2; layer++) for (let i = 0; i < n; i++) {
    const a = (i + layer * .5) / n * TAU + (p.spin || 0), droopA = wilt * .35 * Math.cos(a - Math.PI / 2);
    push(); rotate(a + droopA); translate(58 + pl * .55, 0);
    shape(ell(0, 0, pl * .62, 19, 18), { fill: layer ? pc : psh, lw: S.lw * .75 });
    pop();
  }
  shape(ell(0, 0, 66, 64, 48), { fill: C.face, lw: S.lw, shade: () => fillLocal(ell(14, 34, 70, 34, 30), C.faceSh) });
  cheeks(40, 14, 11, .8);
  face(p, 22, -14, 15, 20, 22, 36, C.face);
  pop();
  for (const [k, s] of [['armL', -1], ['armR', 1]]) if (p[k] && p[k].front) arm(p[k], s);
  pop();
}

// ——— The Sun ———
export function sun(p) {
  push(); translate(p.x, p.y); scale(p.k || 1);
  const n = 12;
  for (let i = 0; i < n; i++) { const a = i / n * TAU + (p.spin || 0), r0 = 92, r1 = 135 + (i % 2) * 18; shape([[Math.cos(a - .12) * r0, Math.sin(a - .12) * r0], [Math.cos(a) * r1, Math.sin(a) * r1], [Math.cos(a + .12) * r0, Math.sin(a + .12) * r0]], { fill: C.ray, lw: S.lw * .7 }); }
  shape(ell(0, 0, 96, 94, 50), { fill: C.sun, lw: S.lw, shade: () => fillLocal(ell(22, 40, 100, 50, 30), C.sunSh) });
  cheeks(55, 18, 13, .7);
  face(p, 30, -18, 17, 22, 26, 42, C.sun);
  if (p.sweat) for (const [x, y, s] of [[-80, -40, 1], [84, -30, .8]]) { const yy = y + (p.sweat * 40) % 40; shape(spline([[x, yy - 14 * s], [x + 8 * s, yy + 4 * s], [x, yy + 10 * s], [x - 8 * s, yy + 4 * s]], true, 5), { fill: '#BFE6FF', lw: S.lw * .6 }); }
  pop();
}

// ——— small tulip (no face), breathing ———
export function tulip(x, y, col, droop, br, k = 1) {
  push(); translate(x, y); scale(k, k * (1 + br));
  const hx = droop * 38, hy = -120 + droop * 45;
  shape(noodle([0, 0], [hx, hy], -droop * 18, 9, 8), { fill: C.stem, lw: S.lw * .7 });
  shape(spline([[0, -30], [-26, -50], [-40, -44], [-14, -24]], true, 5), { fill: C.stem, lw: S.lw * .7 });
  push(); translate(hx, hy); rotate(droop * 1.1);
  shape([[-22, 0], [-26, -30], [-12, -18], [0, -36], [12, -18], [26, -30], [22, 0], [0, 12]], { fill: col, lw: S.lw * .75 });
  pop(); pop();
}
export function bush(x, y, r, col, br) {
  push(); translate(x, y); scale(1 - br * .6, 1 + br);
  union([ell(0, -r * .7, r, r * .7), ell(-r * .8, -r * .4, r * .6, r * .45), ell(r * .8, -r * .4, r * .6, r * .45)], col, S.lw * .8);
  pop();
}
