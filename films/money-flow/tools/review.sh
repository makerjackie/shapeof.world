#!/bin/bash
# Half-size review cut with the score: bash tools/review.sh → out/review.mp4
set -e
cd "$(dirname "$0")/.."
export PATH=/Users/jackiexiao/.nvm/versions/node/v22.22.0/bin:/opt/homebrew/bin:$PATH
SCALE=0.5 CRF=24 node tools/render.mjs out/review-video.mp4 ${CONC:-3}
ffmpeg -nostdin -loglevel error -y -i out/review-video.mp4 -i public/score.wav -c:v copy -c:a aac -b:a 160k -shortest out/review.mp4
echo "REVIEW DONE"
