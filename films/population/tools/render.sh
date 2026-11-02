#!/bin/bash
# Full render on the Mac: cues -> score -> picture (muted) -> sound (WAV) -> true-peak master.
# Run detached:  tmux new -d -s render-population 'bash tools/render.sh > out/render.log 2>&1'
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
mkdir -p out
NAME=${NAME:-population}
node tools/cues.mjs
~/.venvs/shapeof-films/bin/python tools/score.py
npx remotion render Film out/video.mp4 --muted --crf=17 --concurrency=${CONC:-5} --timeout=240000
npx remotion render Film out/raw.wav --codec=wav --concurrency=${CONC:-5} --timeout=240000
~/.venvs/shapeof-films/bin/python tools/tpmaster.py out/raw.wav out/video.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
