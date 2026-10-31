#!/bin/bash
# tools/sheet12.sh <stillsDir> <outDir>: 4x3 contact sheets at 480 px
src=$1; dst=$2; mkdir -p "$dst"; rm -f "$dst"/sheet*.jpg
files=($(ls "$src"/f*.jpg | sort)); n=${#files[@]}; k=0
for ((i=0; i<n; i+=12)); do
  /opt/homebrew/bin/montage -label "%t" -pointsize 16 -fill yellow -background black "${files[@]:i:12}" -tile 4x3 -geometry 480x270+2+2 -quality 80 "$dst/sheet$(printf %02d $k).jpg"; k=$((k+1))
done
ls "$dst"
