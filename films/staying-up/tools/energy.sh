#!/bin/bash
# Per-second loudness (RMS dB) and onset-ish low-band level of an audio file: tools/energy.sh file [seconds]
f=$1; n=${2:-40}
ffmpeg -nostdin -hide_banner -t $n -i "$f" -af "aresample=44100,astats=metadata=1:reset=44100,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1 \
 | grep RMS_level | awk -F= '{printf "%d:%.0f  ", NR-1, $2} END {print ""}'
ffmpeg -nostdin -hide_banner -t $n -i "$f" -af "lowpass=f=120,aresample=44100,astats=metadata=1:reset=11025,ametadata=print:key=lavfi.astats.Overall.Peak_level" -f null - 2>&1 \
 | grep Peak_level | awk -F= '{printf "%.0f ", $2} END {print ""}'
