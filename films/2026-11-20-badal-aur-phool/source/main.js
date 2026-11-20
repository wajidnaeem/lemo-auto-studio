// main.js — Badal aur Phool: every shot, lip-sync, rain, titles, subtitles, sound events
import * as T from './toon.js';
import { P } from './parts.js';
import { badal, phool, phoolHead, sun, tulip, bush, C, mixC } from './chars.js';
import { paintGarden, BX, BY, BS, GROUND } from './bg.js';
import { makeFilm, post } from './film.js';
import { fatTitle, subPlate } from './ui.js';
import * as ST from './story.js';
import { clamp, lerp, seg, ss, eio, eo, back, spring, hash, TAU } from '/core/lib.js';

const Q = new URLSearchParams(location.search);
const cv = document.getElementById('c');
await document.fonts.ready;
for (const f of ['60px Shrikhand', '40px Limelight', '38px "IM Fell English SC"']) await document.fonts.load(f);
const LIPS = await (await fetch('lips.json')).json();
const F = makeFilm(cv); T.init(F.scene);
const BG = { hot: paintGarden('hot'), fresh: paintGarden('fresh') };
const { BEAT, K, VO, WHO } = ST;
const SUBS = ST.subs(LIPS.dur);

// ——— time helpers ———
const twos = t => Math.floor(t * 12 + 1e-6) / 12;
const FREEZES = [[K.hold, K.squeeze], [K.breath, K.songIn]];   // band stops: everything freezes
function musicTime(t) { for (const [a, b] of FREEZES) if (t >= a && t < b) return a; return t; }
function breath(t) { const tm = twos(musicTime(t)); return Math.cos(TAU * tm / BEAT); }
// lip-sync: mouth openness 0..1 for a speaker (on twos)
function lip(who, t) {
  for (const id in VO) {
    if (WHO[id] !== who) continue;
    const t0 = VO[id], d = LIPS.dur[id];
    if (t >= t0 && t < t0 + d) { const f = Math.floor((t - t0) * 12) * 2, a = LIPS.lips[id]; return a[Math.min(a.length - 1, f)] || 0; }
  }
  return -1;   // not speaking
}
const talkMouth = (who, t, rest) => { const v = lip(who, t); return v < 0 ? rest : v < .08 ? { type: 'flat' } : { type: 'open', open: .18 + .62 * v }; };
const sing = (t, ph = 0) => { const b = (musicTime(t) / BEAT + ph) % 1; return { type: 'open', open: b < .5 ? .75 : .3 }; };
const blink = (t, seed) => { const c = (t + seed) % 3.7; return c < .12 ? 1 : 0; };

// ——— camera ———
const g = () => T.g;
function cam(t, cx, cy, z) {
  T.frame(t); T.translate(960, 540); T.scale(z); T.translate(-cx, -cy);
}
const world2screen = (x, y) => T.tx(x, y);

// ——— background with props ———
function drawBG(t, fresh, joy = 0) {
  const G = g(), M = T.getM();
  const br = breath(t), sq = joy * .025 * br;
  // squash the whole painting around the floor line at the peak
  G.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  G.translate(0, GROUND); G.scale(1 - sq * .5, 1 + sq); G.translate(0, -GROUND);
  G.drawImage(BG.hot, BX, BY, BG.hot.width / BS, BG.hot.height / BS);
  if (fresh > 0) { G.globalAlpha = fresh; G.drawImage(BG.fresh, BX, BY, BG.fresh.width / BS, BG.fresh.height / BS); G.globalAlpha = 1; }
  G.setTransform(1, 0, 0, 1, 0, 0);
}
function rainbow(a, t) {
  if (a <= 0) return;
  const G = g(), cols = ['#E8463E', '#F49A2C', '#F7D33A', '#5DBB4A', '#3A8FD8', '#7A55C2'];
  const [cx, cy] = world2screen(1150, 1050), z = T.zoom();
  G.setTransform(1, 0, 0, 1, 0, 0); G.save(); G.globalAlpha = a * .85; G.lineWidth = 34 * z;
  cols.forEach((c, i) => { G.strokeStyle = c; G.beginPath(); G.arc(cx, cy, (900 - i * 32) * z, Math.PI * 1.04, Math.PI * (1.04 + .92 * eo(a))); G.stroke(); });
  G.restore();
}
function props(t, perk, joy) {
  const br = breath(t) * .06 * (1 + joy * 2);
  const cols = ['#F25C8A', '#9B6BE0', '#F0513C', '#FF9A3C', '#F25C8A', '#5A8CF0'];
  const xs = [380, 560, 1480, 1640, 1830, 2050];
  bush(150, 990, 90, mixC('#9A9C45', '#3E9E45', perk), br * .6);
  bush(2250, 995, 100, mixC('#9A9C45', '#3E9E45', perk), br * .6);
  xs.forEach((x, i) => tulip(x, 1005 + (i % 2) * 18, mixC('#B9907A', cols[i], .35 + .65 * perk), (1 - perk) * (.85 + .15 * Math.sin(i)), br * (i % 2 ? 1 : -1) * .7 + (joy ? Math.sin(TAU * musicTime(t) / BEAT / 2 + i) * .04 * joy : 0), 1.1));
}
function heatLines(t, a) {
  if (a <= 0) return;
  for (let i = 0; i < 6; i++) {
    const x = 300 + i * 330, ph = twos(t) * 2 + i;
    const pts = []; for (let j = 0; j <= 10; j++) pts.push([x + Math.sin(j * .9 + ph * 3) * 14, 780 - j * 30 - (ph * 40) % 60]);
    T.stroke(pts, T.S.lw * .55, { line: '#F28C28', alpha: .55 * a });
  }
}
function rain(t, a, bx, by, w) {
  if (a <= 0) return;
  const G = g(), z = T.zoom(), N = Math.round(160 * a);
  G.setTransform(1, 0, 0, 1, 0, 0); G.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    const x = bx + (hash(i * 3.1) - .5) * w, span = GROUND - by, sp = 900 + hash(i) * 300;
    const y = by + ((twos(t) * sp + hash(i * 7.7) * span) % span);
    const [sx, sy] = world2screen(x, y), [ex, ey] = world2screen(x - 6, y + 34);
    G.strokeStyle = C.dropSh; G.lineWidth = 11 * z; G.beginPath(); G.moveTo(sx, sy); G.lineTo(ex, ey); G.stroke();
    G.strokeStyle = '#E4F6FF'; G.lineWidth = 5 * z; G.beginPath(); G.moveTo(sx, sy); G.lineTo(ex, ey); G.stroke();
    if (y > GROUND - 60) { const [px, py] = world2screen(x, GROUND + 6); G.strokeStyle = C.dropSh; G.lineWidth = 3 * z; G.beginPath(); G.ellipse(px, py, 16 * z, 5 * z, 0, Math.PI, TAU); G.stroke(); }
  }
}
function drop(x, y, k = 1) { T.shape(T.spline([[x, y - 22 * k], [x + 12 * k, y + 2 * k], [x, y + 14 * k], [x - 12 * k, y + 2 * k]], true, 6), { fill: C.drop, lw: T.S.lw * .8 }); T.dot(x - 4 * k, y + 1 * k, 3 * k, '#E8F7FF'); }
function iris(cx, cy, r) {
  const G = g(); G.setTransform(1, 0, 0, 1, 0, 0); G.fillStyle = '#0A0706';
  G.beginPath(); G.rect(0, 0, 1920, 1080); G.arc(cx, cy, Math.max(0, r), 0, TAU, true); G.fill('evenodd');
}

// ——— shared character states ———
const PHOOL_X = 1000, BADAL_X = 1330, BADAL_Y = 470, PK = 1.1;
function phoolState(t, extra = {}) {
  const br = breath(t) * .05;
  return { x: PHOOL_X, y: GROUND, k: PK, droop: 1, sway: Math.sin(TAU * musicTime(t) / BEAT / 4) * .04, squash: 1 + br * .5, eyes: { type: 'open', lid: .35 + .65 * blink(t, .3) }, brows: 'sad', mouth: { type: 'frown' }, armL: { x: -60, y: -160, hand: 'open' }, armR: { x: 60, y: -150, hand: 'open' }, ...extra };
}
function badalState(t, extra = {}) {
  const br = breath(t) * .06, bob = Math.sin(TAU * musicTime(t) / BEAT / 2) * 10;
  return { x: BADAL_X, y: BADAL_Y + bob, k: 1, sx: 1 - br * .6, sy: 1 + br, eyes: { type: 'open', lx: -.6, ly: .3, lid: blink(t, 1.1) }, mouth: { type: 'smile' }, armL: { x: -150, y: 60, hand: 'open' }, armR: { x: 150, y: 50, hand: 'open' }, ...extra };
}
function sunAt(t, x, y, hot, extra = {}) {
  sun({ x, y, k: 1, spin: twos(t) * .15, eyes: hot ? { type: 'open', lid: .55, ly: .4 } : { type: 'happy' }, mouth: hot ? { type: 'bleh' } : { type: 'grin', open: .5 }, sweat: hot ? twos(t) : 0, ...extra });
}

// ——— shots ———
function shotTitle(t) {
  const G = F.sg; G.setTransform(1, 0, 0, 1, 0, 0);
  G.fillStyle = '#FF9E3D'; G.fillRect(0, 0, 1920, 1080);
  const rot = twos(t) * .25;
  G.save(); G.translate(960, 520);
  for (let i = 0; i < 24; i++) { G.fillStyle = i % 2 ? '#FFCF4A' : '#FFB23D'; G.beginPath(); G.moveTo(0, 0); G.arc(0, 0, 1400, rot + i / 24 * TAU, rot + (i + 1) / 24 * TAU); G.fill(); }
  G.restore();
  T.init(F.scene); T.frame(t);
  // the two heroes peek in on the beat
  const bt = musicTime(t) / BEAT, hop = Math.abs(Math.sin(Math.PI * bt)) * 14;
  badal({ x: 520, y: 250 - hop, k: .7, eyes: { type: 'open', lx: .6, lid: blink(t, .2) }, mouth: { type: 'grin', open: .5 }, armL: { x: -150, y: -30, hand: 'wave' }, armR: { x: 150, y: 40, hand: 'open' } });
  phool({ x: 1430, y: 1110, k: .7, droop: 0, sway: Math.sin(TAU * bt / 4) * .15, eyes: { type: 'open', lx: -.5, lid: blink(t, 1.7) }, mouth: { type: 'grin', open: .5 }, armL: { x: -110, y: -270, hand: 'wave' }, armR: { x: 80, y: -170, hand: 'open' } });
  const land = eo(seg(t, .2, .9));
  fatTitle(G, 'Badal aur Phool', 960, 540 - (1 - land) * 600, 118, { bounce: i => -Math.max(0, Math.sin(Math.PI * (bt * 1 - i * .12))) * 22 * seg(t, .9, 1.2), face: '#FFFDF6' });
  if (t > 1.2) { G.save(); G.setTransform(1, 0, 0, 1, 0, 0); G.font = '40px Limelight'; G.textAlign = 'center'; G.lineJoin = 'round'; G.lineWidth = 9; G.strokeStyle = P.ink; G.strokeText('THE  CLOUD  AND  THE  FLOWER', 960, 680); G.fillStyle = '#FFFDF6'; G.fillText('THE  CLOUD  AND  THE  FLOWER', 960, 680); G.restore(); }
}
function shotHeat(t) {
  const u = eio(seg(t, 4.5, 10.5));
  cam(t, lerp(1150, 1010, u), lerp(620, 690, u), lerp(.92, 1.2, u));
  drawBG(t, 0); heatLines(t, 1);
  sunAt(t, 1560, 260, true, { k: 1.05 });
  props(t, 0, 0);
  const tilt = Math.sin(twos(t) * 1.5) * .05;
  phool(phoolState(t, { tilt, eyes: { type: 'open', lid: .55, ly: .6 }, mouth: { type: 'wavy', open: .5 }, armL: { x: -95, y: -120, hand: 'open' }, armR: { x: 30, y: -310, hand: 'open', rot: -1.6 } }));
  // opening iris
  const [sx, sy] = world2screen(1040, 720); if (t < 5.3) iris(sx, sy, 1300 * ei2(seg(t, 4.5, 5.3)));
}
const ei2 = x => x * x;
function shotArrive(t) {
  const u = eio(seg(t, K.arriveIn, K.arriveStop));
  const bx = lerp(2350, BADAL_X, u), boing = t > K.arriveStop ? spring(t - K.arriveStop, 9, .3) : 1;
  cam(t, lerp(1800, 1160, eio(seg(t, 10.5, 14.4))), 600, 1.1);
  drawBG(t, 0); heatLines(t, .6);
  sunAt(t, 1560, 260, true, { k: 1.05 });
  props(t, 0, 0);
  const lookB = seg(t, 12.6, 13.2);
  phool(phoolState(t, { eyes: { type: lookB > .5 ? 'wide' : 'open', lx: lookB, ly: .2, lid: lookB > .5 ? 0 : .5 }, brows: lookB > .5 ? 'up' : 'sad', mouth: lookB > .5 ? { type: 'o' } : { type: 'frown' } }));
  const sw = Math.sin(TAU * t / BEAT / 2);
  badal(badalState(t, { x: bx, sx: (2 - boing) * 1, sy: boing, lean: (1 - u) * -.18, eyes: { type: 'open', lx: u > .95 ? -.7 : -.3, lid: blink(t, .5) }, mouth: t < K.arriveStop ? { type: 'o', open: .7 } : { type: 'grin', open: .45 }, armL: { x: -150 + sw * 20, y: 30 - sw * 50, hand: 'open' }, armR: { x: 150 - sw * 20, y: 30 + sw * 50, hand: 'open' } }));
}
function shotAsk(t) {
  const u = eio(seg(t, 15, 19.5));
  cam(t, 1165, lerp(640, 620, u), lerp(1.25, 1.35, u));
  drawBG(t, 0);
  sunAt(t, 1560, 260, true, { k: 1.05 });
  props(t, 0, 0);
  const plead = Math.sin(TAU * t / BEAT) * 10;
  phool(phoolState(t, { droop: .78, tilt: -.25, eyes: { type: 'open', lx: .8, ly: -.6, lid: blink(t, .3) }, brows: 'sad', mouth: talkMouth('phool', t, { type: 'smile' }), armL: { x: 80, y: -330 + plead, hand: 'open' }, armR: { x: 120, y: -300 - plead, hand: 'open' } }));
  const nod = t > 18.6 ? Math.sin((t - 18.6) * 14) * .06 * (1 - seg(t, 18.6, 19.4)) : 0;
  badal(badalState(t, { lean: nod, eyes: { type: 'open', lx: -.8, ly: .7, lid: blink(t, .9) }, brows: t > 18.6 ? 'up' : null, mouth: t > 18.6 ? { type: 'grin', open: .5 } : { type: 'smile' }, armL: { x: -110, y: 110, hand: 'open' }, armR: { x: 140, y: 80, hand: 'open' } }));
}
function shotSqueeze(t) {
  const down = eio(seg(t, 23.0, 23.8));
  cam(t, lerp(1260, 1120, down), lerp(520, 640, down), lerp(1.55, 1.6, down));
  drawBG(t, 0);
  props(t, 0, 0);
  const head = phoolHead({ x: PHOOL_X, y: GROUND, k: PK, droop: .78 });
  const hit = t >= K.dropHit, after = t - K.dropHit;
  phool(phoolState(t, { droop: .78, tilt: -.25 + (hit ? Math.sin(after * 30) * .05 * (1 - seg(after, 0, .5)) : 0), eyes: hit ? { type: after < .5 ? 'shut' : 'wide', lx: .2, ly: -.9 } : { type: 'open', lx: .8, ly: -.7, lid: t > K.dropFall ? 0 : .2 }, brows: 'up', mouth: hit ? (after < .6 ? { type: 'o' } : { type: 'flat' }) : { type: 'o', open: .6 }, armL: { x: -40, y: -280, hand: 'open' }, armR: { x: 140, y: -250, hand: 'open' } }));
  // Badal: thumbs-up line, crouch (anticipation), hold, squeeze
  const cr = seg(t, K.crouch, K.hold), sqz = t >= K.squeeze ? 1 : 0, shake = sqz && t < 23.5 ? Math.sin(t * 90) * 5 : 0;
  let st;
  if (t < K.crouch) st = { mouth: talkMouth('badal', t, { type: 'grin', open: .45 }), brows: 'up', armR: { x: 150, y: -40, hand: 'thumb', rot: -1.4 }, eyes: { type: 'open', lx: -.6, ly: .7, lid: blink(t, .2) } };
  else if (!sqz) st = { sx: 1 + cr * .12, sy: 1 - cr * .16, brows: 'angry', mouth: { type: 'flat' }, eyes: { type: 'open', lx: 0, ly: 0, lid: .45 * cr }, armL: { x: -170, y: 40, hand: 'fist' }, armR: { x: 170, y: 40, hand: 'fist' } };
  else { const rel = seg(t, 23.5, 24.0); st = { x: BADAL_X + shake, sx: lerp(1.22, 1, rel), sy: lerp(.76, 1, rel), brows: rel > .5 ? 'up' : 'angry', eyes: { type: rel > .5 ? 'open' : 'squeeze', lx: 0, ly: .9 }, mouth: rel > .5 ? { type: 'o', open: .5 } : { type: 'flat' }, armL: { x: -62, y: 52, hand: 'grab', front: true, bend: 12 }, armR: { x: 62, y: 52, hand: 'grab', front: true, bend: -12, flip: true } }; }
  badal(badalState(t, { ...st, ...(t >= K.hold && t < K.squeeze ? { y: BADAL_Y } : {}) }));
  // the tiny drop
  if (t >= K.dropFall && t < K.dropHit + .05) {
    const u = ei2(seg(t, K.dropFall, K.dropHit)), x0 = BADAL_X - 10, y0 = BADAL_Y + 80;
    drop(lerp(x0, head[0] + 8, u), lerp(y0, head[1] - 10, u), lerp(.5, 1, seg(t, K.dropFall, K.dropFall + .2)));
  }
  if (hit && after < .5) for (let i = 0; i < 5; i++) { const a = -Math.PI * (.15 + i * .17), r = 20 + after * 120; T.dot(head[0] + 8 + Math.cos(a) * r, head[1] - 10 + Math.sin(a) * r * .7 + after * after * 200, 6 * (1 - after * 1.6), C.drop); }
}
function shotSad(t) {
  const u = ss(seg(t, 25, 30));
  cam(t, 1330, lerp(470, 490, u), lerp(2.3, 2.45, u));
  drawBG(t, 0);
  const look = (t > 28.4 && t < 29.2) ? 0 : 1;   // a held glance down at Phool and back
  badal(badalState(t, { y: BADAL_Y + 14, sy: .93, sx: 1.03, lean: .06, grey: seg(t, 25, 26.5), eyes: { type: 'open', lx: -.5 * look, ly: .85 * look, lid: .35 }, brows: 'sad', mouth: talkMouth('badal', t, { type: 'frown' }), armL: { x: -135, y: 85, hand: 'open' }, armR: { x: 135, y: 85, hand: 'open' }, tear: t > 27.6 ? seg(t, 27.6, 29.6) : 0 }));
}
function shotTurn(t) {
  const u = eio(seg(t, 30, 35));
  cam(t, lerp(1020, 1060, u), lerp(660, 610, u), lerp(1.75, 1.6, u));
  drawBG(t, 0);
  props(t, 0, 0);
  const perk = eo(seg(t, 30.2, 30.8)), pointUp = t > 33.2;
  phool(phoolState(t, { droop: lerp(.78, .5, perk), tilt: -.3, eyes: { type: 'open', lx: .7, ly: -.7, lid: blink(t, .6) }, brows: 'up', mouth: talkMouth('phool', t, { type: 'grin', open: .5 }), armL: pointUp ? { x: 60, y: -460, hand: 'point', rot: -1.2 } : { x: -130, y: -300, hand: 'fist' }, armR: { x: 150, y: -330 + Math.sin(TAU * t / BEAT) * 12, hand: pointUp ? 'wave' : 'fist' } }));
  // Badal's underside peeks in at top right, still sad but listening
  badal(badalState(t, { grey: 1 - seg(t, 33.5, 34.4), eyes: { type: 'open', lx: -.7, ly: .8, lid: .2 }, brows: t > 33.5 ? 'up' : 'sad', mouth: t > 33.6 ? { type: 'smile' } : { type: 'frown' } }));
}
// song: Badal swells on every beat, then rain; the whole garden dances
function swell(t) { const b = Math.floor((t - K.songIn) / BEAT); const n = clamp(b, 0, 10); const frac = (t - K.songIn - n * BEAT) / BEAT; return 1 + .12 * n + (b >= 0 && b < 10 ? .12 * back(clamp(frac * 2.5), 2) : 0); }
function shotSong(t) {
  const sz = Math.min(swell(t), 2.2), pull = eio(seg(t, 35, 40));
  cam(t, 1160, lerp(600, 540, pull), lerp(1.3, .86, pull));
  const rainA = seg(t, K.rain, K.rain + .6), fresh = eio(seg(t, K.rain + .5, 43.5)), joy = seg(t, K.rain, K.rain + 1);
  drawBG(t, fresh, joy);
  sunAt(t, lerp(1560, 1720, pull), lerp(260, 330, pull), fresh < .5, {});
  props(t, fresh, joy);
  const by = lerp(BADAL_Y, 300, eio(seg(t, 35, 39))), bx = lerp(BADAL_X, 1250, eio(seg(t, 35, 39)));
  rain(t, rainA, bx - 90, by + 70 * sz, 300 * sz);
  const ph = phoolState(t, { droop: lerp(.5, 0, eo(seg(t, K.rain + .3, 42))), wilt: lerp(.6, 0, fresh), tilt: -.2 * (1 - fresh), sway: Math.sin(TAU * musicTime(t) / BEAT / 2) * (.08 + .1 * joy), eyes: { type: t > K.rain + .2 ? 'happy' : 'open', lx: .6, ly: -.8 }, brows: 'up', mouth: sing(t), armL: { x: -150, y: -330 + Math.sin(TAU * t / BEAT) * 30, hand: 'wave' }, armR: { x: 150, y: -330 - Math.sin(TAU * t / BEAT) * 30, hand: 'wave' } });
  phool(ph);
  const sw = Math.sin(TAU * musicTime(t) / BEAT);
  const bmouth = talkMouth('badal', t, null) || (t > K.rain ? { type: 'grin', open: .55 } : sing(t, .5));
  badal(badalState(t, { x: bx, y: by, k: sz, rain: seg(t, 36, 40) * (1 - seg(t, 43, 44)), eyes: { type: t > K.rain + .2 && t < 41.5 ? 'happy' : 'open', lx: -.5, ly: .6, lid: blink(t, .4) }, brows: 'up', mouth: bmouth, armL: { x: -170, y: -60 + sw * 40, hand: 'wave' }, armR: { x: 170, y: -60 - sw * 40, hand: 'wave' } }));
}
function shotFinale(t) {
  cam(t, 1150, lerp(560, 600, eio(seg(t, 44, 50.5))), lerp(.86, .95, eio(seg(t, 44, 50.5))));
  drawBG(t, 1, 1);
  rainbow(seg(t, K.rainbow, K.rainbow + 1.5), t);
  sunAt(t, 1720, 330, false, {});
  props(t, 1, 1);
  const shrink = eio(seg(t, 44, 46.5)), sz = lerp(2.2, 1.25, shrink), by = lerp(300, 520, shrink), bx = lerp(1250, 1270, shrink);
  rain(t, 1 - seg(t, 44, 45.5), bx, by + 70 * sz, 300 * sz);
  const sw = Math.sin(TAU * musicTime(t) / BEAT / 2), kick = Math.sin(TAU * musicTime(t) / BEAT);
  phool(phoolState(t, { droop: 0, wilt: 0, bloom: 1 + .06 * breath(t), sway: sw * .15, eyes: { type: 'happy' }, brows: 'up', mouth: { type: 'grin', open: .55 }, armL: { x: -150, y: -330 + kick * 30, hand: 'wave' }, armR: { x: 150, y: -330 - kick * 30, hand: 'wave' } }));
  badal(badalState(t, { x: bx + sw * 20, y: by, k: sz, eyes: { type: 'happy' }, brows: 'up', mouth: { type: 'grin', open: .55 }, lean: sw * .08, armL: { x: -170, y: -40 + kick * 40, hand: 'wave' }, armR: { x: 170, y: -40 - kick * 40, hand: 'wave' } }));
}
function shotIris(t) {
  shotFinale(Math.min(t, 50.49) + (t - 50.49 > 0 ? 0 : 0));
  // after the iris settles, Badal winks
  const [cx, cy] = world2screen(1150, 560);
  const r = t < 52.0 ? lerp(1300, 300, eio(seg(t, K.irisIn, 52.0))) : t < K.irisShut ? 300 : lerp(300, 0, ei2(seg(t, K.irisShut, 52.95)));
  iris(cx, cy, r);
}
function shotEnd(t) {
  const G = F.sg; G.setTransform(1, 0, 0, 1, 0, 0);
  const o = eo(seg(t, K.endCard, K.endCard + .7));
  G.fillStyle = '#0A0706'; G.fillRect(0, 0, 1920, 1080);
  G.save(); G.beginPath(); G.arc(960, 540, 1300 * o, 0, TAU); G.clip();
  G.fillStyle = '#5FB7F0'; G.fillRect(0, 0, 1920, 1080);
  const rot = twos(t) * .2; G.translate(960, 540);
  for (let i = 0; i < 24; i++) { G.fillStyle = i % 2 ? '#8FD3F4' : '#6CC3EE'; G.beginPath(); G.moveTo(0, 0); G.arc(0, 0, 1400, rot + i / 24 * TAU, rot + (i + 1) / 24 * TAU); G.fill(); }
  G.restore();
  T.frame(t);
  const bt = musicTime(t) / BEAT;
  badal({ x: 560, y: 380 + Math.sin(TAU * bt / 2) * 10, k: .75, eyes: { type: 'happy' }, mouth: { type: 'grin', open: .5 }, armL: { x: -150, y: 20, hand: 'open' }, armR: { x: 150, y: -60, hand: 'wave' } });
  phool({ x: 1470, y: 1120, k: .72, droop: 0, sway: Math.sin(TAU * bt / 4) * .15, eyes: { type: 'happy' }, mouth: { type: 'grin', open: .5 }, armL: { x: -150, y: -300, hand: 'wave' }, armR: { x: 100, y: -170, hand: 'open' } });
  fatTitle(G, 'The End', 960, 560, 170, { bounce: i => -Math.max(0, Math.sin(Math.PI * (bt - i * .12))) * 18 });
}

const FN = { title: shotTitle, heat: shotHeat, arrive: shotArrive, ask: shotAsk, squeeze: shotSqueeze, sad: shotSad, turn: shotTurn, song: shotSong, finale: shotFinale, iris: shotIris, end: shotEnd };
function subtitles(t) {
  for (const [t0, t1, id] of SUBS) if (t >= t0 && t < t1) subPlate(F.sg, ST.EN[id], 960, 985, { size: 36 });
}
const cutAt = ST.SHOTS.map(s => s[0]);
function render(t) {
  t = Math.min(t, ST.DUR - 1e-4);
  const sg = F.sg; sg.setTransform(1, 0, 0, 1, 0, 0); sg.fillStyle = '#000'; sg.fillRect(0, 0, 1920, 1080);
  T.init(F.scene);
  const sh = ST.shotAt(t); FN[sh[2]](t);
  if (Q.get('nosub') !== '1') subtitles(t);
  const f = Math.round(t * 24), jump = cutAt.some(c => c > 0 && Math.round(c * 24) === f) ? 3 : 0;
  post(F, t, { jump });
}

// sound / cue events for the mixer
const EV = [
  { t: .35, type: 'cymbal' }, { t: 4.5, type: 'iris' },
  { t: 10.6, type: 'slideUp' }, { t: K.arriveStop, type: 'boing' },
  { t: 12.9, type: 'tick' }, { t: 18.6, type: 'tick' },
  { t: K.crouch, type: 'creak' }, { t: K.hold, type: 'stop' }, { t: K.squeeze, type: 'strain' },
  { t: K.dropFall, type: 'slideDown' }, { t: K.dropHit, type: 'plip' },
  { t: 28.4, type: 'tick' }, { t: 29.2, type: 'tick' }, { t: 30.2, type: 'boing' }, { t: K.breath, type: 'stop' },
  ...Array.from({ length: 10 }, (_, i) => ({ t: K.songIn + i * BEAT, type: 'puff', i })),
  { t: K.rain, type: 'thunder' }, { t: K.rain, type: 'rainOn' }, { t: 45.5, type: 'rainOff' },
  { t: K.rainbow, type: 'shimmer' }, { t: 46.5, type: 'chirp' }, { t: 48.2, type: 'chirp' },
  { t: K.irisIn, type: 'iris' }, { t: 52.15, type: 'wink' }, { t: K.irisShut, type: 'slideDown' }, { t: K.endCard, type: 'cymbal' },
];
SUBS.forEach(([a, b, id]) => EV.push({ t: a, type: 'line', id, who: WHO[id] }));
window.EV = EV.sort((a, b) => a.t - b.t);
window.SUBS = SUBS.map(([t0, t1, id]) => ({ t0, t1, text: ST.EN[id] }));
window.TEXTS = t => {
  if (t > .9 && t < 4.5) return [{ id: 'title', text: 'Badal aur Phool', x0: 480, y0: 450, x1: 1440, y1: 620 }, ...(t > 1.2 ? [{ id: 'sub', text: 'THE CLOUD AND THE FLOWER', x0: 600, y0: 640, x1: 1320, y1: 700 }] : [])];
  if (t > K.endCard + .7) return [{ id: 'end', text: 'The End', x0: 640, y0: 450, x1: 1280, y1: 680 }];
  return [];
};
window.DUR = ST.DUR;
window.render = render;
window.READY = true;
