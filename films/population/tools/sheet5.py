"""Contact sheets for review: python tools/sheet5.py <dir> <cols> <w> <secs...>  (stills s00.png.. in order)"""
import sys, os, glob
from PIL import Image, ImageDraw
d, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
secs = sys.argv[4:]
fs = sorted(glob.glob(os.path.join(d, "s*.png")))
if os.environ.get("CROP"):
    _c = [float(v) for v in os.environ["CROP"].split(",")]
    h = int(w * (_c[3] - _c[1]) / (_c[2] - _c[0]))
else:
    h = int(w * 16 / 9)
per = cols * int(os.environ.get('ROWS', 2))
for si in range(0, len(fs), per):
    chunk = fs[si:si + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (w + 6), rows * (h + 30)), (30, 30, 30))
    dr = ImageDraw.Draw(sheet)
    for i, f in enumerate(chunk):
        im = Image.open(f).convert("RGB")
        if os.environ.get("CROP"):
            x0, y0, x1, y1 = [float(v) for v in os.environ["CROP"].split(",")]
            k = im.size[0] / 1080
            im = im.crop((int(x0 * k), int(y0 * k), int(x1 * k), int(y1 * k)))
        im = im.resize((w, h))
        x, y = (i % cols) * (w + 6), (i // cols) * (h + 30)
        sheet.paste(im, (x, y + 30))
        dr.text((x + 6, y + 8), f"{secs[si + i] if si + i < len(secs) else ''}s", fill=(255, 255, 0))
    out = os.path.join(d, f"sheet{si // per}.jpg")
    sheet.save(out, quality=84)
    print(out, sheet.size)
