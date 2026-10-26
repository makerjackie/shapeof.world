#!/bin/bash
# Tile review stills into 2x2 contact sheets: tools/sheet.sh <stillsDir> <outDir>
src=$1; dst=$2; mkdir -p "$dst"; rm -f "$dst"/sheet*.jpg
files=($(ls "$src"/f*.jpg | sort)); n=${#files[@]}; k=0
for ((i=0; i<n; i+=4)); do
  /opt/homebrew/bin/montage -label '%t' -pointsize 22 -fill yellow -background black "${files[@]:i:4}" -tile 2x2 -geometry +2+2 -quality 85 "$dst/sheet$(printf %02d $k).jpg"; k=$((k+1))
done
ls "$dst"
