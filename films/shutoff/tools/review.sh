#!/bin/bash
# Contact sheets of a rendered video: tools/review.sh <video> <outdir> [fps]
# One sheet per minute (fps frames per second, 6 columns), each tile stamped with its time.
V=$1; O=$2; R=${3:-1}
mkdir -p "$O"
for m in 0 1 2 3 4; do
  ffmpeg -nostdin -v error -y -ss $((m*60)) -t 60 -i "$V" -vf "fps=$R,scale=480:-1,tile=6x$(( (60*R+5)/6 ))" -frames:v 1 "$O/min$m.jpg" 2>/dev/null
done
ls -la "$O"
