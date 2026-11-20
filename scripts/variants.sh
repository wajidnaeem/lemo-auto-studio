#!/bin/sh
# variants.sh <film.mp4> <out_dir> "<title for the vertical version>"
# Makes: reel_9x16.mp4 (1080x1920: the film centred on a blurred copy of itself, title band on top),
#        yt_16x9.mp4 (copy), preview.mp4 (540x960, small, for the Approval Board), thumb.jpg
set -e
IN=$1; OUT=$2; TITLE=${3:-}
mkdir -p "$OUT"
FONT=${FONT:-$(dirname "$0")/../assets/Shrikhand.woff}
DT=""
if [ -n "$TITLE" ] && [ -f "$FONT" ]; then
  T=$(printf '%s' "$TITLE" | sed "s/[:'\\\\]/ /g")
  DT=",drawtext=fontfile=$FONT:text='$T':fontsize=78:fontcolor=white:borderw=8:bordercolor=black:x=(w-text_w)/2:y=230"
fi
ffmpeg -v error -y -i "$IN" -filter_complex \
 "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:2,eq=brightness=-0.12[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2${DT}[v]" \
 -map "[v]" -map 0:a -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$OUT/reel_9x16.mp4"
cp "$IN" "$OUT/yt_16x9.mp4"
ffmpeg -v error -y -i "$OUT/reel_9x16.mp4" -vf scale=540:960 -c:v libx264 -preset veryfast -crf 30 -c:a aac -b:a 96k -movflags +faststart "$OUT/preview.mp4"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
ffmpeg -v error -y -ss $(python3 -c "print(float('$D')*0.8)") -i "$IN" -frames:v 1 -q:v 2 "$OUT/thumb.jpg"
ls -la "$OUT"
