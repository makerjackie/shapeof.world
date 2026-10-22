"""Tile review stills into 2x2 contact sheets.

Usage: python tools/sheet.py <stillsDir> <outDir>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
files = sorted(src.glob("f*.jpg"))
for n in range(0, len(files), 4):
    group = files[n : n + 4]
    w, h = Image.open(group[0]).size
    sheet = Image.new("RGB", (w * 2, h * 2), "white")
    for i, f in enumerate(group):
        im = Image.open(f)
        x, y = (i % 2) * w, (i // 2) * h
        sheet.paste(im, (x, y))
        ImageDraw.Draw(sheet).text((x + 8, y + 6), f.stem, fill="yellow")
    out = dst / f"sheet{n // 4:02d}.jpg"
    sheet.save(out, quality=90)
    print(out)
