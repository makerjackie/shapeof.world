#!/bin/bash
# Render a sample (COMP=Open|Press) and bring it to delivery loudness (about -12.5 LUFS, true peak <= -1.5 dBTP).
# Run detached: tmux new -d -s su-render tools/render-sample.sh
cd "$(dirname "$0")/.."
set -e
C=${COMP:-Press}; N=$(echo $C | tr A-Z a-z)
npx remotion render $C out/sample-$N-raw.mp4 --crf=18 --log=error > out/render.log 2>&1
ffmpeg -nostdin -hide_banner -loglevel error -y -i out/sample-$N-raw.mp4 -c:v copy \
  -af "loudnorm=I=-12.5:TP=-1.5:LRA=9" -ar 48000 -c:a aac_at -b:a 256k out/sample-$N.mp4
ffmpeg -nostdin -hide_banner -i out/sample-$N.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -A12 Summary | grep -E 'I:|Peak:' >> out/render.log
echo DONE >> out/render.log
