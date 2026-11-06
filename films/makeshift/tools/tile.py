"""Tiles review stills (f00123.jpg …) into labelled sheets: python tools/tile.py <dir> <out-prefix> [cols=4] [per=12]"""
import glob, sys
from PIL import Image, ImageDraw, ImageFont

d, prefix = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
per = int(sys.argv[4]) if len(sys.argv) > 4 else 12
files = sorted(glob.glob(f"{d}/f*.jpg"))
try:
    font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 22)
except OSError:
    font = ImageFont.load_default()
for s in range(0, len(files), per):
    chunk = files[s:s + per]
    ims = [Image.open(f).convert("RGB") for f in chunk]
    w, h = ims[0].size
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 4) + 4, rows * (h + 4) + 4), "white")
    for i, (f, im) in enumerate(zip(chunk, ims)):
        fr = int(f.split("/f")[-1][:-4])
        sec = fr / 30
        dr = ImageDraw.Draw(im)
        dr.rectangle([0, 0, 120, 30], fill=(0, 0, 0))
        dr.text((6, 3), f"{int(sec // 60)}:{sec % 60:05.2f}", fill=(255, 255, 0), font=font)
        sheet.paste(im, (4 + (i % cols) * (w + 4), 4 + (i // cols) * (h + 4)))
    out = f"{prefix}-{s // per + 1}.jpg"
    sheet.save(out, quality=80)
    print(out, sheet.size)
