#!/bin/bash
# Remotion's headless Chrome with GPU rasterization off: long renders otherwise garble a few text frames
# (films/DIRECTOR.md, 技术坑). WebGL still runs on the GPU through ANGLE/Metal.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec "$DIR/node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell" --disable-gpu-rasterization "$@"
