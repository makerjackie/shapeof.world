#!/bin/bash
# Downloads the sound effects the film uses from our own library (music.shapeof.world, CC0) into public/sfx.
# The CDN rejects requests without a browser-like User-Agent.
cd "$(dirname "$0")/.." || exit 1
mkdir -p public/sfx
for id in "$@"; do
  [ -s "public/sfx/$id.wav" ] && continue
  curl -sfL -A "Mozilla/5.0" -o "public/sfx/$id.wav" "https://music-cdn.shapeof.world/tracks/$id/v1/master.wav" || echo "FAILED $id"
done
ls public/sfx | wc -l
