#!/bin/bash
# Block until out/render.log says DONE (max ~6 min), then print the loudness lines.
cd "$(dirname "$0")/.."
for i in $(seq 1 72); do grep -q DONE out/render.log 2>/dev/null && break; sleep 5; done
grep -E "I:|Peak:|DONE|rror" out/render.log
