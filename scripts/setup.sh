#!/bin/sh
# Install lemo-opuscar and everything a film needs into ~/lemo-opuscar (fresh cloud container, ~5-8 min)
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
[ -d "$LIB/.git" ] || git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git "$LIB"
cd "$LIB"
sh plugin/skills/lemo-opuscar/scripts/setup.sh deps voice music
# ffmpeg 7+ (the distro ships 6.x): a static build from PyPI
if ! ffmpeg -version 2>/dev/null | head -1 | grep -Eq 'version n?([7-9]|[1-9][0-9])\.'; then
  python3 -m venv /tmp/ffpy && /tmp/ffpy/bin/pip install -q imageio-ffmpeg
  cp "$(/tmp/ffpy/bin/python -c 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())')" /usr/local/bin/ffmpeg
  chmod +x /usr/local/bin/ffmpeg; hash -r
fi
# the sampled band instruments the studio uses
.venv/bin/python core/audio/sampler.py --need trumpet,trumpet_mute,trombone,tuba,clarinet,honky_tonk,xylophone,snare,woodblock,crash,bass_drum,glockenspiel,piano,marimba,flute,tenor_sax
# display fonts (Google Fonts are not reachable here everywhere: take them from npm)
mkdir -p "$HOME/studio-fonts" && cd "$HOME/studio-fonts"
for f in shrikhand limelight im-fell-english-sc baloo-2 fredoka noto-nastaliq-urdu bricolage-grotesque; do
  [ -d "$f" ] || { npm pack -q "@fontsource/$f" >/dev/null 2>&1 && tar xzf fontsource-$f-*.tgz && mv package "$f" && rm -f fontsource-$f-*.tgz; } || echo "font $f not fetched"
done
cd "$LIB" && sh plugin/skills/lemo-opuscar/scripts/setup.sh | tail -2
echo "SETUP OK  LIB=$LIB  fonts=$HOME/studio-fonts"
