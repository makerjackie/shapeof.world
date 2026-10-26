#!/bin/bash
# Per-second RMS (dB) of an audio file, to find where a track builds, drops and ends: tools/energy.sh file
ffmpeg -nostdin -hide_banner -i "$1" -af "aresample=48000,asetnsamples=n=48000,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1 \
 | grep RMS_level | awk -F= '{printf "%d:%.0f ", NR-1, $2} END {print ""}'
