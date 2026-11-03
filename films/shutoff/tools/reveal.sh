#!/bin/bash
# Renders the frame 安's film freezes on (story time just before REVEAL in src/film/cut.ts) at full size, crops the
# letterbox off and writes public/reveal.jpg: the video message thumbnail on the phone and the image that shrinks
# into it (Overlay.tsx). Re-run whenever the montage's last shot changes.
set -e
cd "$(dirname "$0")/.."
SCALE=1 node tools/shots.mjs out/reveal 154.96
F=$(ls out/reveal/f*.jpg | tail -1)
~/.venvs/shapeof-films/bin/python - "$F" <<'PY'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert("RGB")
im.crop((0, 138, 1920, 942)).save("public/reveal.jpg", quality=93)
print("wrote public/reveal.jpg", im.size)
PY
