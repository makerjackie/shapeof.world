#!/bin/zsh
# Assembles 样片E from the Blender frames (blender/render_field.sh): composite, master the sound, open it.
set -e
cd "$(dirname "$0")/.."
for s in EA EB EC ED; do mkdir -p public/field/$s; rsync -a --delete blender/out/$s/ public/field/$s/; done
COMP=SampleE node tools/render.mjs out/samples/样片E-raw.mp4 4
${PY:-python3} tools/tpmaster.py public/sample-e.wav out/samples/样片E-raw.mp4 out/samples/样片E.mp4 -13
rm out/samples/样片E-raw.mp4
open out/samples/样片E.mp4
