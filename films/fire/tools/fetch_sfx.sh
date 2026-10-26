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
# Library effects sit far below a dense music bed: keep the originals in public/sfx/raw and write copies
# lifted by 6 dB (impacts) or 4 dB (the rest) through a limiter.
mkdir -p public/sfx/raw
for f in public/sfx/*.wav; do b=$(basename "$f"); [ -f "public/sfx/raw/$b" ] || cp "$f" "public/sfx/raw/$b"; done
for f in public/sfx/raw/*.wav; do
  b=$(basename "$f"); case $b in sfx-impact-*) g=6;; *) g=4;; esac
  /opt/homebrew/bin/ffmpeg -nostdin -loglevel error -y -i "$f" -af "volume=${g}dB,alimiter=limit=0.93:attack=1:release=40" "public/sfx/$b"
done
