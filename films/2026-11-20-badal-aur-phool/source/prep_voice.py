# Cartoon voices: pitch characters up (resample = higher + faster), resample to 48 kHz,
# and extract a per-frame mouth-opening curve (24 fps) for lip-sync -> voices/<id>.wav, lips.json
import json, os, sys, numpy as np, soundfile as sf, soxr
HERE = os.path.dirname(os.path.abspath(__file__))
SHIFT = {'hm_psi': 4.0, 'hf_alpha': 2.5, 'hm_omega': 0.0}   # semitones up
lines = json.load(open(f'{HERE}/lines.json', encoding='utf-8'))
os.makedirs(f'{HERE}/voices', exist_ok=True)
lips, dur = {}, {}
for L in lines:
    x, sr = sf.read(f'{HERE}/voices_raw/{L["id"]}.wav', dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    r = 2 ** (SHIFT[L['voice']] / 12)
    y = soxr.resample(x, sr * r, 48000)          # play faster -> pitch up by r
    y = y / (np.abs(y).max() + 1e-9) * .9
    sf.write(f'{HERE}/voices/{L["id"]}.wav', y, 48000)
    hop = 48000 // 24; n = int(np.ceil(len(y) / hop))
    rms = np.array([np.sqrt(np.mean(y[i*hop:(i+1)*hop] ** 2) + 1e-12) for i in range(n)])
    db = 20 * np.log10(rms + 1e-9); v = np.clip((db + 38) / 24, 0, 1)
    lips[L['id']] = [round(float(a), 3) for a in v]; dur[L['id']] = round(len(y) / 48000, 3)
json.dump({'lips': lips, 'dur': dur}, open(f'{HERE}/lips.json', 'w'))
print(dur)
