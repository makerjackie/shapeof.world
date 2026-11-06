#!/bin/zsh
# Assembles 样片D from the Blender frames: composite in Remotion, master the sound, open it.
# needs: blender/render_trench.sh done, public/sample-d.wav (tools/trench_audio.py), a Python with numpy/scipy as $PY
set -e
cd "$(dirname "$0")/.."
for s in s1 s2 s3; do mkdir -p public/trench/$s; rsync -a --delete blender/out/$s/ public/trench/$s/; done
COMP=SampleD node tools/render.mjs out/samples/样片D-raw.mp4 4
${PY:-python3} tools/tpmaster.py public/sample-d.wav out/samples/样片D-raw.mp4 out/samples/样片D.mp4 -13
rm out/samples/样片D-raw.mp4
open out/samples/样片D.mp4
