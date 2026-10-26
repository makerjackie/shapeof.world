#!/bin/bash
# Render review stills of the Press sample: tools/stills.sh 30 120 ...
cd "$(dirname "$0")/.."
mkdir -p out/stills
for f in "$@"; do
  npx remotion still Press out/stills/p$f.jpg --frame=$f --jpeg-quality=85 --log=error || exit 1
done
ls -lh out/stills
