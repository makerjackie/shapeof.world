#!/bin/bash
# Review stills for FilmV2: bash tools/v2stills.sh <outDir> <frames...>
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.."
OUT=$1; shift
mkdir -p "$OUT"
COMP=FilmV2 SCALE=0.5 node tools/stills.mjs "$OUT" "$@"
# 4-across contact sheet, 480 px per frame
/opt/homebrew/bin/ffmpeg -nostdin -hide_banner -loglevel error -y -pattern_type glob -i "$OUT/f*.jpg" -vf "scale=480:-1,tile=4x$(( ($# + 3) / 4 )):padding=4:color=white" -frames:v 1 -q:v 3 "$OUT/sheet.jpg"
echo STILLS_DONE
