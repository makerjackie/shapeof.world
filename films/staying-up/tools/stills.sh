#!/bin/bash
# Render review stills: COMP=Open tools/stills.sh 30 120 ...
cd "$(dirname "$0")/.."
mkdir -p out/stills
for f in "$@"; do
  npx remotion still ${COMP:-Press} out/stills/${COMP:-Press}-$f.jpg --frame=$f --jpeg-quality=85 --log=error || exit 1
done
ls -lh out/stills
