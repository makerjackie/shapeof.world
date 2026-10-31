#!/bin/zsh
# Renders the three trench shots as JPEG sequences (about 25 min on an M1 Pro).
cd "$(dirname "$0")/.."
blender -b -P blender/trench.py -- --shot 1 --mode anim --samples 32 --grassd 0 --out blender/out/s1/f_#### > blender/out/s1.log 2>&1
blender -b -P blender/trench.py -- --shot 2 --mode anim --samples 24 --voltile 8 --grassd 2 --out blender/out/s2/f_#### > blender/out/s2.log 2>&1
blender -b -P blender/trench.py -- --shot 3 --mode anim --thermal 1 --samples 16 --grassd 4 --out blender/out/s3/f_#### > blender/out/s3.log 2>&1
echo done
