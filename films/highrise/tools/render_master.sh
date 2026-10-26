#!/bin/bash
# Full render + master: picture, raw WAV (kept), then tpmaster.py (-12 LUFS, <= -1 dBTP after Apple AAC).
# usage: tools/render_master.sh [name]   -> out/raw-<name>.mp4, out/raw-<name>.wav, out/<name>.mp4
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.."
NAME=${1:-highrise}
mkdir -p /tmp/highrise-master out
while [ "$(pgrep -f 'remotion render' | wc -l)" -ge 2 ]; do echo "waiting for other renders"; sleep 20; done
tools/fonts.sh >/dev/null || { echo FONTS_FAILED; exit 1; }
START=$(date +%s)
npx remotion render Film out/raw-$NAME.mp4 --crf=18 --log=error || { echo RENDER_FAILED; exit 1; }
npx remotion render Film out/raw-$NAME.wav --codec=wav --log=error || { echo WAV_FAILED; exit 1; }
~/.venvs/shapeof-films/bin/python tools/tpmaster.py out/raw-$NAME.wav out/raw-$NAME.mp4 out/$NAME.mp4 -12 || { echo MASTER_FAILED; exit 1; }
echo "took $(( $(date +%s) - START )) s"
ffprobe -v error -show_entries format=duration -of csv=p=0 out/$NAME.mp4
ls -lh out/$NAME.mp4
echo RENDER_DONE
