#!/bin/sh
# One-command rebuild of Badal aur Phool (run from anywhere)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-$(cd "$HERE/../.." && pwd)}; export LIB
PY="$LIB/.venv/bin/python"
cd "$LIB"
"$PY" core/audio/sampler.py --need "$HERE/score.py"
"$PY" core/tts/tts.py "$HERE/lines.json" "$HERE/voices_raw"
"$PY" "$HERE/prep_voice.py"
node core/render/events.mjs "$HERE"
"$PY" "$HERE/score.py"
"$PY" "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/badal-aur-phool.mp4" 24 2
