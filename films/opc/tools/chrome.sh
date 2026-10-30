#!/bin/bash
# Remotion's headless Chrome, with the page's HTML rasterized on the CPU (WebGL still runs on the GPU through ANGLE).
# With GPU rasterization, long renders drew stale or scrambled text on some frames (v11: the title came back for
# single frames at 0:03–0:05; "多出来的房子卖掉" turned to broken glyphs at 3:53).
exec "$(dirname "$0")/../node_modules/.remotion/chrome-headless-shell/mac-arm64/chrome-headless-shell-mac-arm64/chrome-headless-shell" --disable-gpu-rasterization "$@"
