#!/bin/bash
# Full render on the Mac: picture (muted), sound (WAV), then the true-peak master (tools/tpmaster.py, Apple AAC).
# Run detached:  tmux new -d -s render-one-more 'bash tools/render.sh > out/render.log 2>&1'
# At most two remotion renders at once on this Mac (films/DIRECTOR.md): check `pgrep -fl "remotion render"` first.
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
mkdir -p out
NAME=${NAME:-one-more}
npx remotion render Film out/video.mp4 --muted --crf=18 --concurrency=${CONC:-4}
npx remotion render Film out/raw.wav --codec=wav --concurrency=${CONC:-4}
~/.venvs/shapeof-films/bin/python tools/tpmaster.py out/raw.wav out/video.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
