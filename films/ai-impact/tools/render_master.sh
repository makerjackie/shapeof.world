#!/bin/bash
# Full render + master: picture, raw WAV (kept), then tpmaster.py (-12.5 LUFS, <= -1 dBTP after Apple AAC).
# usage: tools/render_master.sh [name]   -> out/raw-<name>.mp4, out/raw-<name>.wav, out/<name>.mp4
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.."
NAME=${1:-ai-impact-v3-review}
while pgrep -f "remotion render" >/dev/null; do echo "waiting for another render"; sleep 20; done
START=$(date +%s)
npx remotion render ${COMP:-FilmV3} out/raw-$NAME.mp4 --crf=20 --log=error || { echo RENDER_FAILED; exit 1; }
npx remotion render ${COMP:-FilmV3} out/raw-$NAME.wav --codec=wav --log=error || { echo WAV_FAILED; exit 1; }
~/.venvs/shapeof-films/bin/python tools/tpmaster.py out/raw-$NAME.wav out/raw-$NAME.mp4 out/$NAME.mp4 -12.5 || { echo MASTER_FAILED; exit 1; }
echo "took $(( $(date +%s) - START )) s"
ffprobe -v error -show_entries format=duration -of csv=p=0 out/$NAME.mp4
ls -lh out/$NAME.mp4
echo RENDER_DONE
