#!/bin/bash
# Render the film and finish the sound: bash tools/render.sh <out.mp4> [extra remotion flags]
# Waits for any other `remotion render` on this Mac (one render at a time), renders H.264 CRF 20 / AAC 192k, then a
# two-pass loudnorm to about −12 LUFS, then a limiter at −4 dBFS on the 192 kHz signal (the track itself peaks hot, so
# this keeps the AAC true peak under −1 dBTP); the video stream is copied; then it measures the result.
export PATH=/Users/jackiexiao/Library/pnpm:/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
set -e
cd "$(dirname "$0")/.."
OUT=$1; shift
RAW=${OUT%.mp4}-raw.mp4
while pgrep -f "remotion render" >/dev/null; do sleep 20; done
npx remotion render Film "$RAW" --crf=20 --audio-bitrate=320k --log=error "$@"
FF=/opt/homebrew/bin/ffmpeg
J=$($FF -nostdin -hide_banner -i "$RAW" -af loudnorm=I=-12:TP=-2:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
g() { echo "$J" | grep "\"$1\"" | sed 's/.*: "\(.*\)".*/\1/'; }
$FF -nostdin -hide_banner -loglevel error -y -i "$RAW" -c:v copy \
  -af "loudnorm=I=-12:TP=-2:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true,alimiter=limit=0.63:attack=1:release=60:level=false,aresample=48000" \
  -c:a aac -b:a 192k -movflags +faststart "$OUT"
rm -f "$RAW"
echo "== $OUT"
ffprobe -v error -show_entries format=duration,size -of compact "$OUT"
$FF -nostdin -hide_banner -nostats -i "$OUT" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary:" | grep -E "I:|Peak:|LRA:"
echo RENDER_DONE
