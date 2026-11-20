// story.js — single source of truth: tempo grid, shots, voice lines, subtitles, key moments
export const BPM = 120, BEAT = 60 / BPM;          // 1 beat = 12 frames at 24 fps
export const DUR = 56.5;

// [start, end, shot id]
export const SHOTS = [
  [0, 4.5, 'title'],
  [4.5, 10.5, 'heat'],
  [10.5, 15, 'arrive'],
  [15, 19.5, 'ask'],
  [19.5, 25, 'squeeze'],
  [25, 30, 'sad'],
  [30, 35, 'turn'],
  [35, 44, 'song'],
  [44, 50.5, 'finale'],
  [50.5, 53, 'iris'],
  [53, DUR, 'end'],
];
export const shotAt = t => SHOTS.find(s => t >= s[0] && t < s[1]) || SHOTS[SHOTS.length - 1];

// voice lines: id → start time (durations come from lips.json)
export const VO = { N1: 5.2, P1: 15.5, B1: 19.8, B2: 25.8, P2: 30.8, B3: 41.6, N2: 45.4 };
export const WHO = { N1: 'narr', P1: 'phool', B1: 'badal', B2: 'badal', P2: 'phool', B3: 'badal', N2: 'narr' };
export const EN = {
  N1: 'One hot day... and a thirsty garden.',
  P1: 'Brother Cloud, please give me some water!',
  B1: 'Coming right up!',
  B2: "Oh no! I'm much too small.",
  P2: "Don't give up! Come on, let's sing together!",
  B3: 'Hooray! The rain is here!',
  N2: 'With friendship and courage, anything is possible!',
};

// key moments
export const K = {
  arriveIn: 10.5, arriveStop: 14.0,
  crouch: 20.6, hold: 21.6, squeeze: 22.6, dropFall: 22.9, dropHit: 24.0,
  breath: 34.4, songIn: 35.0, rain: 40.0, rainbow: 44.5,
  irisIn: 50.5, irisShut: 52.5, peek: 52.0, endCard: 53.0,
};

// subtitle cards [t0, t1, id] — hold ≥ max(1.8, speech + 0.6)
export function subs(dur) {
  return Object.keys(VO).map(id => { const t0 = VO[id]; return [t0, t0 + Math.max(2.2, dur[id] + 1.0), id]; });
}
