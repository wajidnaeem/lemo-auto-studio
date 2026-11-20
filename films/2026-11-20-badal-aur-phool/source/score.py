# score.py — original 1930s hot-band score for Badal aur Phool, 120 BPM (1 beat = 0.5 s), on the story.js grid.
# Sections: title fanfare · lazy heat · bouncy arrival · plea · drum roll + STOP · strain · plip · sad trombone ·
#           turn pickup · STOP · swelling build (key change) · rain out-chorus · finale · iris stinger · end coda
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); LIB = os.environ.get('LIB', os.path.abspath(os.path.join(HERE, '../..')))
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S
from core.audio.sfx import SR

B = 0.5                      # beat
DUR = 56.5
ev = []
def n(t, inst, pitch, dur, vel=.7, pan=0, gain=1): ev.append((t, inst, pitch, dur, vel, pan, gain))
def h(t, inst, var=None, vel=.6, pan=0, gain=1): ev.append((t, inst, var, None, vel, pan, gain))

F4 = 65
# theme in beats: (beat, semitones above tonic, length in beats); 4 bars
THEME = [
  [(0, 7, 1), (1, 4, .5), (1.5, 7, .5), (2, 9, 1), (3, 7, 1)],
  [(0, 4, .5), (.5, 5, .5), (1, 7, .5), (1.5, 4, 1), (2.5, 2, .5), (3, 0, 1)],
  [(0, 2, .5), (.5, 4, .5), (1, 5, 1), (2, 9, .5), (2.5, 7, .5), (3, 5, 1)],
  [(0, 4, 1), (1, 2, .5), (1.5, 7, 1), (2.5, 12, 1.5)],
]
CHORDS = [0, 0, 5, 7]                         # I I IV V per bar (root offset)
TRIAD = lambda r: [r, r + 4, r + 7] if r != 7 else [r, r + 4, r + 10]

def melody(t0, key, inst, vel=.7, oct=0, pan=0, bars=range(4), swing=.06, gain=1):
    for bi in bars:
        for (b, s, L) in THEME[bi % 4]:
            sw = swing if (b % 1) == .5 else 0
            n(t0 + (bi * 4 + b + sw) * B, inst, key + s + 12 * oct, L * B * .92, vel, pan, gain)

def rhythm(t0, bars, key, vel=.55, piano=True, drums=True, banjo_piano=True, tuba=True, chords=None):
    chords = chords or CHORDS
    for bi in range(bars):
        r = chords[bi % len(chords)]; tb = t0 + bi * 4 * B
        if tuba:
            n(tb, 'tuba', key - 24 + r, B * .9, vel + .1, -.1)
            n(tb + 2 * B, 'tuba', key - 24 + r + 7 - (12 if r + 7 > 9 else 0), B * .9, vel + .05, -.1)
        if piano:
            for k in (1, 3):
                for p in TRIAD(r): n(tb + k * B, 'honky_tonk', key - 12 + p, B * .45, vel * .8, .25)
        if drums:
            for k in (1, 3): h(tb + k * B, 'snare', 'off', vel * .45, .15)
            for k in range(4): h(tb + k * B, 'woodblock', 'c', vel * .18, -.4)

def roll(t0, t1, v0=.15, v1=.7):
    t = t0
    while t < t1:
        u = (t - t0) / max(1e-6, t1 - t0)
        h(t, 'snare', 'roll', v0 + (v1 - v0) * u, .1, .8); t += 1 / 16

KEY = F4
# 0–4.5 title fanfare (2 bars + pickup)
h(.35, 'crash', None, .7, .2); h(.35, 'bass_drum', None, .7)
for i, s in enumerate([0, 4, 7, 12]): n(.0 + i * .08, 'trumpet', KEY + s, .25, .7, .2)
rhythm(.5, 2, KEY, .6)
melody(.5, KEY, 'trumpet', .75, 0, .2, bars=[0, 3])
melody(.5, KEY, 'clarinet', .5, 1, -.3, bars=[0, 3], gain=.6)
n(4.0, 'trombone', KEY - 12, .5, .6, -.2); h(4.0, 'crash', None, .45, -.2)
# 4.5–10.5 heat: lazy half-time, muted trumpet "wah", clarinet sighs
for i in range(3):
    tb = 4.5 + i * 2
    n(tb, 'tuba', KEY - 24 + [0, 5, 0][i], 1.6, .45, -.1)
    for p in TRIAD([0, 5, 0][i]): n(tb + 1, 'honky_tonk', KEY - 12 + p, .6, .3, .25)
for (t, s, L) in [(5.0, 7, 1.4), (6.6, 5, .5), (7.2, 4, 1.4), (8.8, 2, .6), (9.4, 0, 1.0)]: n(t, 'clarinet', KEY + s, L, .45, -.3)
for t in (6.0, 8.0): n(t, 'trumpet_mute', KEY + 3, .8, .4, .3); n(t + .85, 'trumpet_mute', KEY + 2, .6, .35, .3)
# 10.5–15 arrival: bouncy oom-pah; xylophone climb as Badal floats in
rhythm(10.5, 2, KEY, .55)
for i, s in enumerate([0, 2, 4, 5, 7, 9, 11, 12]): n(10.6 + i * .18, 'xylophone', KEY + 12 + s, .2, .55, .4)
melody(12.5, KEY, 'clarinet', .55, 0, -.2, bars=[1], gain=.8)
h(14.0, 'woodblock', 'a', .7, 0)
# 15–19.5 plea: soft piano + clarinet
for i in range(2):
    tb = 15 + i * 2; r = [5, 7][i]
    n(tb, 'tuba', KEY - 24 + r, .45, .4, -.1)
    for k in (1, 2, 3):
        for p in TRIAD(r): n(tb + k * B, 'honky_tonk', KEY - 12 + p, .4, .3, .25)
for (t, s, L) in [(17.0, 4, .4), (17.5, 5, .4), (18.0, 7, .9), (19.0, 9, .5)]: n(t, 'clarinet', KEY + s, L, .45, -.25)
# 19.5–21.6: "Coming right up!" then a drum roll into the STOP at 21.6
n(19.5, 'trumpet', KEY + 7, .25, .65, .2); n(19.75, 'trumpet', KEY + 12, .35, .7, .2)
roll(20.6, 21.6, .15, .75)
n(20.6, 'tuba', KEY - 24 + 7, .9, .5); n(20.6, 'trombone', KEY - 5, .95, .45, -.2)
# (silence 21.6–22.6)
# 22.6 strain: low trombone crescendo + roll
n(22.6, 'trombone', KEY - 17, 1.0, .75, -.2, 1.1); n(22.6, 'tuba', KEY - 29, 1.0, .6); roll(22.6, 23.4, .4, .8)
# 24.0 plip: one tiny xylophone note
n(24.0, 'xylophone', KEY + 31, .3, .6, .1)
n(24.25, 'trumpet_mute', KEY + 5, .25, .35, .3); n(24.5, 'trumpet_mute', KEY + 4, .5, .3, .3)
# 25–30 sad: solo trombone wah-wah over soft minor chords (D minor)
DM = KEY - 3
for i in range(2):
    tb = 25.2 + i * 2.2
    for p in [0, 3, 7]: n(tb, 'honky_tonk', DM - 12 + p, 1.8, .25, .25)
for (t, s, L) in [(25.4, 7, .9), (26.4, 5, .9), (27.4, 3, .9), (28.4, 2, .45), (29.0, 0, 1.0)]:
    n(t, 'trombone', DM - 12 + s, L, .55, -.2)
h(28.4, 'woodblock', 'b', .5); h(29.2, 'woodblock', 'b', .5)
# 30–34.4 turn: piano pickup + walking tuba + rising clarinet
for i, s in enumerate([0, 2, 4, 5, 7, 9, 11, 12, 14]):
    n(30.2 + i * .5, 'tuba', KEY - 24 + s, .45, .5, -.1)
for i in range(4):
    for p in TRIAD([0, 5, 7, 7][i]): n(30.5 + i * 1.0, 'honky_tonk', KEY - 12 + p, .4, .4, .25)
for i, s in enumerate([0, 4, 7, 9, 12, 14, 16]): n(31.0 + i * .5, 'clarinet', KEY + s, .45, .4 + i * .04, -.3)
h(34.0, 'snare', 'on', .6); h(34.25, 'snare', 'on', .7)
# (silence 34.4–35.0)
# 35–40 build, new key G: a stab on every beat as Badal swells, rising chromatic brass
G4 = KEY + 2
for i in range(10):
    t = 35 + i * B; s = i
    n(t, 'trumpet', G4 + s, .22, .55 + i * .03, .25); n(t, 'trombone', G4 - 12 + s, .22, .5 + i * .03, -.25)
    n(t, 'tuba', G4 - 24 + s, .25, .55, -.1); h(t, 'bass_drum', None, .35 + i * .04)
    for p in TRIAD(0): n(t + .25, 'honky_tonk', G4 - 12 + p + (s // 4) * 0, .2, .35, .25)
roll(39.0, 40.0, .3, .8)
# 40–44 rain out-chorus in G: full band, xylophone doubling the theme (raindrops)
h(40.0, 'crash', None, .85, .2); h(40.0, 'bass_drum', None, .9)
rhythm(40.0, 2, G4, .65)
melody(40.0, G4, 'trumpet', .8, 0, .2, bars=[0, 1])
melody(40.0, G4, 'xylophone', .55, 1, .4, bars=[0, 1], gain=.7)
melody(40.0, G4, 'clarinet', .5, 1, -.3, bars=[0, 1], gain=.55)
# 44–50.5 finale: theme restated sweetly, oom-pah
rhythm(44.0, 3, G4, .55)
melody(44.0, G4, 'clarinet', .6, 0, -.25, bars=[2, 3, 0])
melody(44.0, G4, 'trumpet_mute', .45, 0, .3, bars=[2, 3, 0], gain=.6)
for i in range(8): n(46.0 + i * .25, 'xylophone', G4 + 24 + [0, 4, 7, 12, 7, 4, 7, 12][i], .15, .35, .4)   # rainbow shimmer
# 50.0–53 tag and the iris stinger
for p in [0, 4, 7]: n(50.0, 'honky_tonk', G4 - 12 + p, .4, .45, .25)
melody(50.0, G4, 'trumpet', .7, 0, .2, bars=[3], swing=0)
h(52.15, 'woodblock', 'a', .7)                                         # wink
for s, inst in [(0, 'tuba'), (12, 'trombone'), (16, 'trumpet'), (19, 'trumpet'), (24, 'clarinet')]:
    n(52.5, inst, G4 - 24 + s, .4, .7, 0)
# 53–56.5 end card coda: final chord, cymbal
h(53.0, 'crash', None, .7, .2)
for s, inst in [(-24, 'tuba'), (-12, 'trombone'), (4, 'trumpet'), (7, 'clarinet'), (12, 'trumpet')]:
    n(53.0, inst, G4 + s, 2.6, .55, 0)
for i, s in enumerate([0, 4, 7, 12, 16, 19, 24]): n(53.0 + i * .1, 'xylophone', G4 + 12 + s, .3, .45, .4)

mix = S.render(ev, dur=DUR)
mix = S.room(mix, size=.3, mix=.14)
os.makedirs(f'{HERE}/out', exist_ok=True)
sf.write(f'{HERE}/out/music.wav', mix, SR)
print('music', mix.shape, 'peak', float(np.abs(mix).max()))
print('INSTRUMENTS', sorted({e[1] for e in ev}))
