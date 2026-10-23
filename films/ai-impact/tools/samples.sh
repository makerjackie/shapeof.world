#!/bin/bash
# Render the three 2D opening samples and a dense contact sheet (2 frames a second) for each.
# Usage: bash tools/samples.sh [A B C Opening]   (one letter = SampleX, otherwise the composition id)
export PATH=/Users/jackiexiao/Library/pnpm:/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.."
mkdir -p out/samples
for S in ${@:-A B C}; do
  while pgrep -f "remotion render" >/dev/null; do sleep 15; done
  COMP=$S; [ ${#S} -eq 1 ] && COMP=Sample$S
  npx remotion render $COMP out/samples/raw-$S.mp4 --crf=20 --audio-bitrate=192k --log=error || exit 1
  # Loudness to about −12 LUFS with a true-peak ceiling, video stream copied untouched.
  /opt/homebrew/bin/ffmpeg -nostdin -hide_banner -loglevel error -y -i out/samples/raw-$S.mp4 -c:v copy -af "loudnorm=I=-12:TP=-2:LRA=11" -ar 48000 -c:a aac -b:a 192k -movflags +faststart out/samples/sample-$S.mp4 && rm out/samples/raw-$S.mp4
  N=$(python3 -c "import math,sys; print(math.ceil(float(sys.argv[1])*2))" $(ffprobe -v error -show_entries format=duration -of csv=p=0 out/samples/sample-$S.mp4))
  ROWS=$(( (N + 4) / 5 ))
  /opt/homebrew/bin/ffmpeg -nostdin -hide_banner -loglevel error -y -i out/samples/sample-$S.mp4 -vf "fps=2,scale=480:-1,tile=5x$ROWS:padding=4:color=white" -frames:v 1 -q:v 4 out/samples/contact-$S.jpg
  echo "$S: $(/opt/homebrew/bin/ffmpeg -nostdin -hide_banner -nostats -i out/samples/sample-$S.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E '^ +I:|Peak:' | tr -s ' ' | tr '\n' ' ')"
done
echo SAMPLES_DONE
