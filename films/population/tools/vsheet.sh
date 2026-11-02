#!/bin/bash
# vsheet.sh <video> <outdir> <cols> <width> <secs...> : grab frames from a rendered video and tile them (review only)
V=$1; D=$2; C=$3; WD=$4; shift 4
rm -rf "$D"; mkdir -p "$D"
i=0
for s in "$@"; do
  ffmpeg -nostdin -loglevel error -y -ss "$s" -i "$V" -frames:v 1 "$D/s$(printf %02d $i).png"
  i=$((i+1))
done
/Volumes/DevSSD/BuildCache/venvs/shapeof-films/bin/python tools/sheet5.py "$D" "$C" "$WD" "$@"
