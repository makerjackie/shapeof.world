#!/bin/bash
# Review an MP4: one frame a second (the fps=1 contact sheets, 6 × 10 per page, time-stamped), black-frame check,
# loudness and true peak. Usage: bash tools/review.sh out/review.mp4 out/review
set -e
IN=$1; OUT=${2:-out/review}; FF=/opt/homebrew/bin/ffmpeg
PY=/Users/jackiexiao/.venvs/shapeof-films/bin/python
mkdir -p "$OUT/f"; rm -f "$OUT"/f/*.jpg "$OUT"/*.jpg
# frame n is taken at n + 0.5 s
$FF -nostdin -hide_banner -loglevel error -y -ss 0.5 -i "$IN" -vf "fps=1,scale=320:-1" -q:v 4 "$OUT/f/%04d.jpg"
$PY - "$OUT" <<'PY'
import sys, glob
from PIL import Image, ImageDraw
out = sys.argv[1]
files = sorted(glob.glob(f"{out}/f/*.jpg"))
cols, rows = 6, 10
w, h = Image.open(files[0]).size
for p in range(0, len(files), cols * rows):
    page = files[p:p + cols * rows]
    sheet = Image.new("RGB", (cols * (w + 4), ((len(page) + cols - 1) // cols) * (h + 4)), "white")
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(page):
        x, y = (i % cols) * (w + 4), (i // cols) * (h + 4)
        sheet.paste(Image.open(f), (x, y))
        s = p + i
        d.rectangle([x, y, x + 52, y + 16], fill="black")
        d.text((x + 4, y + 2), f"{s // 60}:{s % 60:02d}.5", fill="yellow")
    sheet.save(f"{out}/fps1-{p // (cols * rows) + 1}.jpg", quality=80)
print(len(files), "frames")
PY
$FF -nostdin -hide_banner -i "$IN" -vf blackdetect=d=0.3:pix_th=0.04 -an -f null - 2>&1 | grep blackdetect || echo "no black segments"
$FF -nostdin -hide_banner -nostats -i "$IN" -af ebur128=peak=true -f null - 2>&1 | grep -A14 "Summary:" | grep -E "I:|Peak:|LRA:"
