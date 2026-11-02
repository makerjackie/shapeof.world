"""Contact sheet: python tools/sheet.py <dir> <out.jpg> [cols] — labels each tile with its film time."""
import sys, os, glob
from PIL import Image, ImageDraw
d, out = sys.argv[1], sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
fs = sorted(glob.glob(os.path.join(d, "f*.jpg")))
ims = [Image.open(f) for f in fs]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
s = Image.new("RGB", (cols * w, rows * h), (20, 20, 20))
dr = ImageDraw.Draw(s)
for i, (f, im) in enumerate(zip(fs, ims)):
    x, y = (i % cols) * w, (i // cols) * h
    s.paste(im, (x, y))
    t = int(os.path.basename(f)[1:6]) / 30
    dr.rectangle([x, y, x + 64, y + 18], fill=(0, 0, 0)); dr.text((x + 4, y + 3), f"{t:6.1f}s", fill=(255, 220, 0))
s.save(out, quality=85); print(s.size)
