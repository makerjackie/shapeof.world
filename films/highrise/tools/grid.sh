#!/bin/bash
# Tile review stills into 4x3 sheets: tools/grid.sh <stillsDir> <outDir>
src=$1; dst=$2; mkdir -p "$dst"; rm -f "$dst"/grid*.jpg
files=($(ls "$src"/f*.jpg | sort)); n=${#files[@]}; k=0
for ((i=0; i<n; i+=12)); do
  /opt/homebrew/bin/montage -label '%t' -pointsize 16 -fill yellow -background black "${files[@]:i:12}" -tile 4x3 -geometry 672x378+2+2 -quality 80 "$dst/grid$(printf %02d $k).jpg"; k=$((k+1))
done
ls "$dst" | wc -l
