#!/bin/bash
# The four short sounds v4 uses, from the brand's own library (music.shapeof.world); WAVs stay out of Git.
cd "$(dirname "$0")/../public" && mkdir -p sfx
for id in sfx-mechanical-01 sfx-mechanical-14 sfx-transition-13 sfx-impact-01; do
  curl -sS -A "Mozilla/5.0" -o "sfx/$id.wav" "https://music-cdn.shapeof.world/tracks/$id/v1/master.wav"
done
