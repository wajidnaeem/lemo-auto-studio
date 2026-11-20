# mix.py — foley from events.json, voices, music ducking, optical-track ageing → out/mix.wav
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', os.path.abspath(os.path.join(HERE, '../..')))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, click, whoosh, creak, thump, ding, pop, rumble, compress, limit, add

E = json.load(open(f'{HERE}/events.json')); DUR = E['dur']; EV = E['ev']
N = int(DUR * SR)
music, _ = sf.read(f'{HERE}/out/music.wav', dtype='float32')
music = np.pad(music, ((0, max(0, N - len(music))), (0, 0)))[:N]
fx = np.zeros((N, 2), np.float32); vox = np.zeros((N, 2), np.float32); beds = np.zeros((N, 2), np.float32)
STOPS = [(21.6, 22.6), (34.4, 35.0)]

def glide(f0, f1, d, v=.5, wob=0):
    tt = t_(d); f = f0 * (f1 / f0) ** (tt / d) * (1 + wob * np.sin(2 * np.pi * 9 * tt))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) + .25 * np.sin(2 * ph)) * np.minimum(1, tt / .02) * np.minimum(1, (d - tt) / .06) * v
def boing(v=.6):
    d = .55; tt = t_(d); f = 180 * (1 + .35 * np.exp(-tt * 6) * np.sin(2 * np.pi * 14 * tt)) * (1 + .4 * np.exp(-tt * 10))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .18) * v
def plip(v=.7):
    d = .18; tt = t_(d); f = 900 + 1600 * tt / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .05) * v
def strain(v=.5):
    d = .9; tt = t_(d); f = 95 + 25 * np.sin(2 * np.pi * 7 * tt)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    return bp(saw, 300, 1800) * np.minimum(1, tt / .2) * np.minimum(1, (d - tt) / .1) * v
def chirp(v=.35):
    out = np.zeros(int(.6 * SR))
    for k, st in enumerate([0, .14, .3]):
        d = .09; tt = t_(d); f = 3200 + 1800 * np.sin(np.pi * tt / d)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d); i = int(st * SR); out[i:i + len(s)] += s * v
    return out
def puff(i, v=.25): return lp(whoosh(.25, 1), 1200 + i * 150) * v

for e in EV:
    t, ty = e['t'], e['type']
    if ty == 'slideUp': add(fx, glide(500, 1600, .9, .35), t, 1, .3)
    elif ty == 'slideDown': add(fx, glide(1500, 380, 1.0, .35), t, 1, 0)
    elif ty == 'boing': add(fx, boing(), t, 1, 0)
    elif ty == 'tick': add(fx, click(1.6, .6), t, .7, .1)
    elif ty == 'creak': add(fx, creak(.5), t, .6, .2)
    elif ty == 'strain': add(fx, strain(), t, .8, .1)
    elif ty == 'plip': add(fx, plip(), t, .9, -.1); add(fx, ding(.25), t + .02, .4, -.1)
    elif ty == 'puff': add(fx, puff(e.get('i', 0)), t, 1, .2)
    elif ty == 'thunder': add(fx, rumble(2.5, 1), t, .9, 0); add(fx, thump(1, 55), t, .8, 0)
    elif ty == 'shimmer': add(fx, ding(.4), t, .5, .4); add(fx, ding(.3), t + .2, .4, -.4)
    elif ty == 'chirp': add(fx, chirp(), t, .8, .6)
    elif ty == 'iris': add(fx, whoosh(.5, .5), t, .5, 0)
    elif ty == 'wink': add(fx, pop(.6), t, .7, .2)
    elif ty == 'line':
        x, sr = sf.read(f'{HERE}/voices/{e["id"]}.wav', dtype='float32')
        x = hp(x, 90); x = compress(x, .2, 3.0); x = norm(x, .8)
        pan = {'phool': -.15, 'badal': .15, 'narr': 0}[e['who']]
        add(vox, x, t, 1.0, pan)

# beds: heat buzz (before the rain), rain (40 → 46), muted inside the band stops
tt = np.arange(N) / SR
buzz = bp(noise(DUR), 3500, 6000) * (.5 + .5 * np.sin(2 * np.pi * 32 * tt))
heat_env = np.clip((tt - 4.5) / 1.0, 0, 1) * np.clip((40.5 - tt) / 1.5, 0, 1) * .025
rainb = lp(hp(noise(DUR), 900), 7000)
rain_env = np.clip((tt - 40) / .5, 0, 1) * np.clip((46.5 - tt) / 1.5, 0, 1) * .09
for ch in range(2): beds[:, ch] = buzz * heat_env + np.roll(rainb, ch * 997) * rain_env
for a, b in STOPS:
    i0, i1 = int(a * SR), int(b * SR); beds[i0:i1] = 0; fx[i0:i1] *= 0; music[i0:i1] *= 0

# duck music ~8 dB under the voices
ve = np.abs(vox).max(1); k = int(.12 * SR)
ve = np.convolve(ve, np.ones(k) / k, 'same'); duck = 1 - .6 * np.clip(ve / .05, 0, 1)
music *= duck[:, None]

# optical-track ageing on music + foley: band-limit, soft saturation, slight wow
mf = music * .55 + fx * .9 + beds
for ch in range(2): mf[:, ch] = lp(hp(mf[:, ch], 70), 9000)
wow = (.0012 * np.sin(2 * np.pi * .6 * tt) + .0004 * np.sin(2 * np.pi * 7 * tt)) * SR
idx = np.clip(np.arange(N) + wow, 0, N - 1)
for ch in range(2): mf[:, ch] = np.interp(idx, np.arange(N), mf[:, ch])
mf = np.tanh(mf * 1.3) / 1.3
# projector hiss + 24 Hz gate clatter (the only thing inside a silence)
hiss = hp(noise(DUR), 3000) * .006
clat = np.zeros(N); step = SR // 24
for i in range(0, N, step): clat[i:i + 60] += np.exp(-np.arange(min(60, N - i)) / 12) * .012
proj = bp(clat, 400, 3000) + hiss
out = mf + vox * 1.0 + proj[:, None]
out = limit(out, .95)
sf.write(f'{HERE}/out/mix.wav', out.astype(np.float32), SR)
print('mix written', out.shape, 'peak', float(np.abs(out).max()))
