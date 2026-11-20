"""Natural Urdu voices (Microsoft edge-tts ur-PK-UzmaNeural / ur-PK-AsadNeural) through the session's HTTPS proxy.
python scripts/tts_urdu.py lines.json out_dir      (run with lemo-opuscar's .venv python)
lines.json = [{"id", "text" (Urdu script), "voice"?, "rate"? e.g. "+0%", "pitch"? e.g. "+20Hz"}]
Writes out_dir/<id>.wav (24 kHz mono, silence trimmed) and out_dir/dur.json — same layout as core/tts/tts.py."""
import asyncio, json, os, sys, subprocess, numpy as np, soundfile as sf, edge_tts
lines, out = json.load(open(sys.argv[1], encoding='utf-8')), sys.argv[2]
os.makedirs(out, exist_ok=True)
proxy = os.environ.get('HTTPS_PROXY') or os.environ.get('https_proxy')
async def one(L):
    mp3 = os.path.join(out, L['id'] + '.mp3')
    c = edge_tts.Communicate(L['text'], L.get('voice', 'ur-PK-UzmaNeural'), rate=L.get('rate', '+0%'), pitch=L.get('pitch', '+0Hz'), proxy=proxy)
    await c.save(mp3)
    wav = os.path.join(out, L['id'] + '.wav')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ac', '1', '-ar', '24000', wav], check=True)
    x, sr = sf.read(wav, dtype='float32')
    nz = np.where(np.abs(x) > .01)[0]
    if len(nz): x = x[max(0, nz[0] - 480): nz[-1] + 2400]
    sf.write(wav, x, sr); os.remove(mp3)
    return round(len(x) / sr, 3)
dur = {}
for L in lines:
    for attempt in range(3):
        try: dur[L['id']] = asyncio.run(one(L)); break
        except Exception as e:
            if attempt == 2: sys.exit(f"tts_urdu.py: line {L['id']} failed: {e}")
    print(L['id'], dur[L['id']], L['text'])
json.dump(dur, open(os.path.join(out, 'dur.json'), 'w'), indent=1)
