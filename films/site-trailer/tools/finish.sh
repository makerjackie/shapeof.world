#!/usr/bin/env bash
# Delivery encodes from the high-quality Remotion renders (npm run render, npm run render:loop).
#   <name>.mp4             H.264 CRF 20, yuv420p (TV range), AAC 192k, faststart; prints loudness and true peak
#   <name>-loop.mp4        muted homepage loop, two-pass to ~2.3 Mbit/s (≤ 3 MB)
#   poster[-v2].jpg        one frame of the black hole from the loop
# Usage: bash tools/finish.sh <out dir> [name]   (name defaults to site-trailer; v2 is site-trailer-v2, poster-v2.jpg)
set -euo pipefail
OUT=${1:?out dir}
N=${2:-site-trailer}
POSTER="poster${N#site-trailer}.jpg"
FF="ffmpeg -nostdin -hide_banner -v error -y"
TV="scale=in_range=full:out_range=tv,format=yuv420p"
if [ -f "$OUT/$N-raw.mp4" ]; then
  $FF -i "$OUT/$N-raw.mp4" -vf "$TV" -c:v libx264 -preset slow -crf 20 -profile:v high -color_range tv \
    -c:a aac -b:a 192k -movflags +faststart "$OUT/$N.mp4"
  ffmpeg -nostdin -hide_banner -i "$OUT/$N.mp4" -af ebur128=peak=true -f null - 2>&1 | grep -A20 Summary | grep -E "I:|LRA:|Peak:"
fi
if [ -f "$OUT/$N-loop-raw.mp4" ]; then
  P=$(mktemp -d)/pass
  $FF -i "$OUT/$N-loop-raw.mp4" -an -vf "$TV" -c:v libx264 -preset slow -b:v 2300k -pass 1 -passlogfile "$P" -f mp4 /dev/null
  $FF -i "$OUT/$N-loop-raw.mp4" -an -vf "$TV" -c:v libx264 -preset slow -b:v 2300k -pass 2 -passlogfile "$P" -color_range tv -movflags +faststart "$OUT/$N-loop.mp4"
  # 262 = 18.7 beats in: the black hole, the loop's last shot
  $FF -i "$OUT/$N-loop-raw.mp4" -vf "select=eq(n\,262)" -frames:v 1 -q:v 2 "$OUT/$POSTER"
fi
ls -lh "$OUT"/$N*.mp4 "$OUT/$POSTER" 2>/dev/null
