#!/bin/bash
# Film5 (v3 cut): fonts -> cues -> SFX mix -> picture (muted) -> audio WAV -> true-peak master (-12 LUFS)
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
PY=/Volumes/DevSSD/BuildCache/venvs/shapeof-films/bin/python
NAME=${NAME:-population-2000-v3}
$PY tools/fonts5.py | tail -2
node tools/cues5.mjs
$PY tools/sfx_film5.py
npx remotion render src/index5.ts Film5 out/video5.mp4 --muted --crf=17 --concurrency=${CONC:-5} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -2
npx remotion render src/index5.ts Film5 out/raw5.wav --codec=wav --concurrency=${CONC:-5} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -1
CEILS=${CEILS:--2.0,-2.6,-3.2,-4.0} $PY tools/tpmaster.py out/raw5.wav out/video5.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
