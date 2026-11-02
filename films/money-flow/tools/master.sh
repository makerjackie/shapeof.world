#!/bin/bash
# Full 1080p render: picture (muted, GPU), sound (score + effects as WAV), then the true-peak master
# (tools/tpmaster.py, Apple AAC, about −12 LUFS, ≤ −1 dBTP).  Run detached: nohup bash tools/master.sh > out/master.log 2>&1 &
# At most two remotion renders at once on one Mac (films/PITFALLS.md): check `pgrep -fl "remotion"` first.
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
NAME=${NAME:-money-flow}
mkdir -p out
node tools/render.mjs out/video.mp4 ${CONC:-3}
npx remotion render Film out/raw.wav --codec=wav --concurrency=2 --timeout=240000 --gl=angle
~/.venvs/shapeof-films/bin/python tools/tpmaster.py out/raw.wav out/video.mp4 out/$NAME.mp4 -12
echo "MASTER DONE out/$NAME.mp4"
