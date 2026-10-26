#!/bin/bash
# Builds public/music.wav: 《看不见的晕》 from its start to A bar 78 (137.66 s, faded over its last two bars), then
# 《冰的后退》 from its start, to the end of the film (src/timing.ts). Both from music.shapeof.world.
cd "$(dirname "$0")/../public" || exit 1
A_END=137.664
B_LEN=134
/opt/homebrew/bin/ffmpeg -nostdin -loglevel error -y -i invisible-halo.mp3 -i ice-retreat.mp3 -filter_complex \
  "[0:a]atrim=0:${A_END},asetpts=PTS-STARTPTS,aresample=48000,afade=t=out:st=$(echo "$A_END-3.4" | bc):d=3.4[a];[1:a]atrim=0:${B_LEN},asetpts=PTS-STARTPTS,aresample=48000[b];[a][b]concat=n=2:v=0:a=1[m]" \
  -map "[m]" -c:a pcm_s16le music.wav && echo "music.wav $(/opt/homebrew/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 music.wav) s"
