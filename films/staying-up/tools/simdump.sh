#!/bin/bash
# Print the orb's path and events around the release: tools/simdump.sh
cd "$(dirname "$0")/.."
npx esbuild src/sim.ts --bundle --platform=node --format=cjs --log-level=error > /Volumes/DevSSD/tmp-staying-sim.cjs
node -e 'const m=require("/Volumes/DevSSD/tmp-staying-sim.cjs");const S=m.SIM;console.log(JSON.stringify(S.events));for(let f=340;f<420;f+=4){const s=S.frames[f];console.log(f,s.d.toFixed(0),s.v.toFixed(1),s.cam.toFixed(0))}'
rm -f /Volumes/DevSSD/tmp-staying-sim.cjs
