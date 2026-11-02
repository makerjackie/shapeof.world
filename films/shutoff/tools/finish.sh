#!/bin/bash
# Final deliverable: re-encode the rendered picture, master the mix onto it.
# tools/finish.sh <rendered-video.mp4> <out.mp4>
set -e
V=$1; O=$2
TMP=/Volumes/DevSSD/tmp/shutoff
mkdir -p $TMP
ffmpeg -nostdin -v error -y -i "$V" -an -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart $TMP/enc.mp4
~/.venvs/shapeof-films/bin/python tools/tpmaster.py public/mix.wav $TMP/enc.mp4 "$O" -12
ls -lh "$O"
