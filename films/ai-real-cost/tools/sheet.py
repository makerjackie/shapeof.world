"""Tile review stills into one contact sheet with their file names.

Usage: python tools/sheet.py <stillsDir> <out.jpg> [cols] [width]
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

src, out = Path(sys.argv[1]), sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
W = int(sys.argv[4]) if len(sys.argv) > 4 else 480
files = sorted(src.glob("s*.jpg"))
ims = [Image.open(f) for f in files]
h = round(ims[0].height * W / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * W, rows * h), "white")
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * W, (i // cols) * h
    sheet.paste(im.resize((W, h)), (x, y))
    ImageDraw.Draw(sheet).text((x + 6, y + 4), f.stem[1:], fill="yellow")
sheet.save(out, quality=82)
print(out)
