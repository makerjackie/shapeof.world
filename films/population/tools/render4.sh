#!/bin/bash
# Full film (Film4): cues -> SFX mix -> picture (muted) -> audio WAV -> true-peak master (-12 LUFS)
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
PY=/Volumes/DevSSD/BuildCache/venvs/shapeof-films/bin/python
NAME=${NAME:-population-2000-v2}
node tools/cues4.mjs
$PY tools/sfx_film4.py
npx remotion render Film4 out/video4.mp4 --muted --crf=17 --concurrency=${CONC:-5} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -2
npx remotion render Film4 out/raw4.wav --codec=wav --concurrency=${CONC:-5} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -1
CEILS=${CEILS:--2.0,-2.6,-3.2,-4.0} $PY tools/tpmaster.py out/raw4.wav out/video4.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
