#!/bin/zsh
# Renders the four 样片E shots (A ground, B rise, C drone, D stopped tank) as JPEG sequences.
cd "$(dirname "$0")/.."
for s in A B C D; do
  mkdir -p blender/out/E$s
  blender -b -P blender/battlefield.py -- --shot $s --mode anim --samples ${SAMPLES:-24} --wheatd ${WHEATD:-16} --out blender/out/E$s/f_#### > blender/out/E$s.log 2>&1
done
echo done
