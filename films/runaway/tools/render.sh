#!/bin/bash
# Full render on the Mac: picture (muted), sound (WAV), then the true-peak master (tools/tpmaster.py, Apple AAC).
# At most two remotion renders at once on this Mac (films/DIRECTOR.md): check `pgrep -fl "remotion render"` first.
# --gl=swiftshader keeps rasterisation off the GPU (DIRECTOR.md: GPU raster glitches on long renders).
set -e
cd "$(dirname "$0")/.."
export PATH=/opt/homebrew/bin:$PATH
mkdir -p out
NAME=${NAME:-runaway}
npx remotion render ${COMP:-Film} out/video.mp4 --muted --crf=18 --concurrency=${CONC:-4} --timeout=240000 --gl=swiftshader
npx remotion render ${COMP:-Film} out/raw.wav --codec=wav --concurrency=${CONC:-4} --timeout=240000
~/.venvs/shapeof-films/bin/python tools/tpmaster.py out/raw.wav out/video.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
