#!/bin/bash
# Full film (Film3): cues -> SFX mix -> picture (muted) -> audio WAV -> true-peak master (-12 LUFS)
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
PY=/Volumes/DevSSD/BuildCache/venvs/shapeof-films/bin/python
NAME=${NAME:-population-2000}
node tools/cues3.mjs
$PY tools/sfx_film.py
npx remotion render Film3 out/video3.mp4 --muted --crf=17 --concurrency=${CONC:-5} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -2
npx remotion render Film3 out/raw3.wav --codec=wav --concurrency=${CONC:-5} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -1
CEILS=${CEILS:--2.0,-2.6,-3.2,-4.0} $PY tools/tpmaster.py out/raw3.wav out/video3.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
