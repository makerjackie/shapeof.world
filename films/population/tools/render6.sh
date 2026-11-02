#!/bin/bash
# Film6: fonts -> cues -> SFX mix -> picture (muted) -> audio WAV -> true-peak master (-12 LUFS).  FILM=china|world
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
PY=/Volumes/DevSSD/BuildCache/venvs/shapeof-films/bin/python
FILM=${FILM:-china}
COMP=$([ "$FILM" = world ] && echo World6 || echo China6)
NAME=${NAME:-population-$FILM-v4}
[ -n "$SKIPFONTS" ] || $PY tools/fonts6.py | tail -1
node tools/cues6.mjs $FILM
$PY tools/sfx_film6.py $FILM | tail -1
npx remotion render src/index6.ts $COMP out/video6_$FILM.mp4 --muted --crf=17 --concurrency=${CONC:-6} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -2
npx remotion render src/index6.ts $COMP out/raw6_$FILM.wav --codec=wav --concurrency=${CONC:-6} --timeout=240000 2>&1 | grep -E "Encoded|Error|error" | tail -1
CEILS=${CEILS:--2.0,-2.6,-3.2,-4.0} $PY tools/tpmaster.py out/raw6_$FILM.wav out/video6_$FILM.mp4 out/$NAME.mp4 -12
echo "done out/$NAME.mp4"
