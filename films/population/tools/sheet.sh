#!/bin/bash
# tools/sheet.sh <dir> <cols>  -> <dir>/sheet.jpg
cd "$1" && /opt/homebrew/bin/ffmpeg -nostdin -loglevel error -y -pattern_type glob -i 'b*.jpg' -vf "tile=${2:-8}x4:padding=4" -q:v 4 sheet.jpg && ls -la sheet*.jpg
