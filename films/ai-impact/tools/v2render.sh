#!/bin/bash
# Review render of FilmV2: queue behind any other render, render, loudness to about −12 LUFS (true peak −2 dBTP),
# faststart, then two contact sheets at one frame a second (0:00–0:56, 0:56–1:52) and the loudness report.
# Usage: bash tools/v2render.sh [name]   → out/<name>.mp4 (default ai-impact-v2-review)
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
cd "$(dirname "$0")/.."
NAME=${1:-ai-impact-v2-review}
mkdir -p out
while pgrep -f "remotion render" >/dev/null; do echo "waiting for another render…"; sleep 20; done
npx remotion render FilmV2 out/raw-$NAME.mp4 --crf=20 --audio-bitrate=192k --log=error || exit 1
/opt/homebrew/bin/ffmpeg -nostdin -hide_banner -loglevel error -y -i out/raw-$NAME.mp4 -c:v copy -af "loudnorm=I=-12:TP=-2:LRA=11" -ar 48000 -c:a aac -b:a 192k -movflags +faststart out/$NAME.mp4 && rm out/raw-$NAME.mp4
/opt/homebrew/bin/ffmpeg -nostdin -hide_banner -loglevel error -y -i out/$NAME.mp4 -vf "fps=1,scale=320:-1,drawtext=text='%{eif\:t:d}':x=6:y=6:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=8x7:padding=3:color=white" -frames:v 2 -q:v 3 out/contact-$NAME-%d.jpg
echo "$NAME: $(/opt/homebrew/bin/ffmpeg -nostdin -hide_banner -nostats -i out/$NAME.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E '^ +I:|Peak:' | tr -s ' ' | tr '\n' ' ')"
ffprobe -v error -show_entries format=duration -of csv=p=0 out/$NAME.mp4
ls -lh out/$NAME.mp4 out/contact-$NAME-*.jpg
echo RENDER_DONE
