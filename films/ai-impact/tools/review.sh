#!/bin/bash
# Review an MP4: contact sheet at one frame per 10 s, denser 4×4 sheets at one frame per 3 s, loudness and true peak.
# Usage: bash tools/review.sh out/ai-impact-review.mp4 out/review
set -e
IN=$1; OUT=${2:-out/review}; FF=/opt/homebrew/bin/ffmpeg
mkdir -p "$OUT"; rm -f "$OUT"/*.jpg
$FF -nostdin -hide_banner -loglevel error -y -i "$IN" -vf "fps=1/10,scale=480:-1,tile=4x5:padding=4:color=white" -frames:v 1 -q:v 4 "$OUT/contact-10s.jpg"
$FF -nostdin -hide_banner -loglevel error -y -i "$IN" -vf "fps=1/3,scale=480:-1,tile=4x4:padding=4:color=white" -q:v 5 "$OUT/dense-%02d.jpg"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate,bit_rate -of compact "$IN"
$FF -nostdin -hide_banner -nostats -i "$IN" -af ebur128=peak=true -f null - 2>&1 | grep -A12 "Summary:" | grep -E "I:|Peak:|LRA:|True peak"
