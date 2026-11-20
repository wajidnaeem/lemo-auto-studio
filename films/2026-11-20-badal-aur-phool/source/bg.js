// bg.js — painted garden backgrounds (cached canvases, never boil): 'hot' (dry, before the rain) and 'fresh' (after)
import { mulberry, vnoise, lerp } from '/core/lib.js';
export const BX = -300, BY = -400, BW = 3000, BH = 1800, BS = 1.2;   // world domain and paint scale
export const GROUND = 1000;

const PAL = {
  hot:   { sky: ['#FFE7A8', '#FFD98C', '#FFC877'], hillFar: '#C9B46A', hill: '#B7B456', tree: '#9C9A45', grass: '#BDB458', grass2: '#A99F48', path: '#E8CF96', fence: '#FFF6E2' },
  fresh: { sky: ['#8FD3F4', '#B5E3FA', '#DDF4FF'], hillFar: '#7FC4A0', hill: '#6DBA5A', tree: '#3F9A4A', grass: '#6CC04A', grass2: '#55A83C', path: '#E9D7A8', fence: '#FFFFFF' },
};
const INK = '#2A1A14';

export function paintGarden(kind) {
  const C = PAL[kind], cv = document.createElement('canvas');
  cv.width = BW * BS; cv.height = BH * BS;
  const g = cv.getContext('2d'), R = mulberry(kind === 'hot' ? 11 : 23);
  g.scale(BS, BS); g.translate(-BX, -BY);
  // sky: soft horizontal washes
  const sg = g.createLinearGradient(0, BY, 0, 800);
  C.sky.forEach((c, i) => sg.addColorStop(i / (C.sky.length - 1), c));
  g.fillStyle = sg; g.fillRect(BX, BY, BW, BH);
  // painted clouds of colour (soft blotches)
  const blot = (x, y, r, col, a) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = rg; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalAlpha = 1; };
  for (let i = 0; i < 40; i++) blot(BX + R() * BW, BY + R() * 1100, 80 + R() * 220, R() > .5 ? '#ffffff' : C.sky[2], .18);
  // hills
  const hill = (base, amp, freq, seed, col, outline) => {
    g.beginPath(); g.moveTo(BX, BY + BH);
    for (let x = BX; x <= BX + BW; x += 10) g.lineTo(x, base - amp * (vnoise(x * freq + seed) * .8 + Math.sin(x * freq * 2.3 + seed) * .2));
    g.lineTo(BX + BW, BY + BH); g.closePath(); g.fillStyle = col; g.fill();
    if (outline) { g.strokeStyle = INK; g.globalAlpha = .55; g.lineWidth = 3; g.stroke(); g.globalAlpha = 1; }
  };
  hill(760, 260, .0021, 3, C.hillFar, true);
  // round trees on the far hill
  for (let i = 0; i < 14; i++) {
    const x = BX + 100 + i * 210 + R() * 60, y = 640 + R() * 90, r = 34 + R() * 26;
    g.fillStyle = INK; g.fillRect(x - 4, y, 8, 50);
    g.beginPath(); g.ellipse(x, y, r, r * 1.05, 0, 0, 7); g.fillStyle = C.tree; g.fill(); g.strokeStyle = INK; g.lineWidth = 3; g.globalAlpha = .7; g.stroke(); g.globalAlpha = 1;
  }
  hill(880, 120, .0032, 9, C.hill, true);
  // picket fence
  const fy = 905;
  g.fillStyle = C.fence; g.strokeStyle = INK; g.lineWidth = 3.5;
  for (const yy of [fy - 52, fy - 14]) { g.beginPath(); g.rect(BX, yy, BW, 14); g.fill(); g.stroke(); }
  for (let x = BX + 20; x < BX + BW; x += 58) {
    g.beginPath(); g.moveTo(x, fy + 40); g.lineTo(x, fy - 85); g.lineTo(x + 17, fy - 104); g.lineTo(x + 34, fy - 85); g.lineTo(x + 34, fy + 40); g.closePath(); g.fill(); g.stroke();
  }
  // ground
  g.beginPath(); g.moveTo(BX, 950);
  for (let x = BX; x <= BX + BW; x += 20) g.lineTo(x, 950 + Math.sin(x * .004) * 8);
  g.lineTo(BX + BW, BY + BH); g.lineTo(BX, BY + BH); g.closePath(); g.fillStyle = C.grass; g.fill(); g.strokeStyle = INK; g.lineWidth = 3.5; g.stroke();
  // path
  g.beginPath(); g.ellipse(1150, 1150, 700, 120, 0, 0, 7); g.fillStyle = C.path; g.fill(); g.globalAlpha = .5; g.stroke(); g.globalAlpha = 1;
  // grass tufts
  g.strokeStyle = C.grass2; g.lineWidth = 4; g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = BX + R() * BW, y = 975 + R() * 420;
    if (Math.hypot((x - 1150) / 700, (y - 1150) / 120) < 1) continue;
    for (const d of [-7, 0, 7]) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + d * 1.4, y - 14 - R() * 10); g.stroke(); }
  }
  // watercolour texture: soft light/dark blotches + paper grain
  for (let i = 0; i < 260; i++) blot(BX + R() * BW, BY + R() * BH, 40 + R() * 140, R() > .5 ? '#ffffff' : '#7a5a2a', .05);
  const img = g.getImageData(0, 0, cv.width, cv.height), d = img.data, Rg = mulberry(5);
  for (let i = 0; i < d.length; i += 4) { const n = (Rg() - .5) * 14; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  // inner edge darkening
  g.setTransform(1, 0, 0, 1, 0, 0);
  const vg = g.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * .3, cv.width / 2, cv.height / 2, cv.width * .6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(60,30,10,.25)');
  g.fillStyle = vg; g.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
