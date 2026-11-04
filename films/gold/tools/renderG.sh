#!/bin/bash
# 金价两百年: fonts -> cues -> SFX mix -> picture (muted) -> audio WAV -> true-peak master (-12 LUFS).
# FILM=gold NAME=gold-v1 bash tools/renderG.sh  (SKIPFONTS=1 to reuse the fonts)
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
export TMPDIR=/Volumes/DevSSD/tmp/rw/gold-tmp
mkdir -p $TMPDIR
PY=/Volumes/DevSSD/BuildCache/venvs/shapeof-films/bin/python
FILM=${FILM:-gold}
NAME=${NAME:-gold-v1}
[ -n "$SKIPFONTS" ] || $PY tools/fonts6.py | tail -1
node tools/cues6.mjs $FILM
$PY tools/sfx_film6.py $FILM | tail -1
cp public/film6_$FILM.wav public/filmG_$FILM.wav
npx remotion render src/indexG.ts ${COMP:-Gold} out/videoG_$FILM.mp4 --muted --crf=17 --concurrency=${CONC:-6} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -2
npx remotion render src/indexG.ts ${COMP:-Gold} out/rawG_$FILM.wav --codec=wav --concurrency=${CONC:-6} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -1
CEILS=${CEILS:--2.0,-2.6,-3.2,-4.0} $PY tools/tpmaster.py out/rawG_$FILM.wav out/videoG_$FILM.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
