"""A bright top-down battlefield for the opening teamfight: grass, a stone plaza around the enemy crystal, lanes,
a river and trees. Our own generated art, deterministic.

usage: ~/.venvs/shapeof-films/bin/python tools/battlefield.py   → public/field.jpg (2400 × 1350)
The plaza (where the crystal stands) is centred at (1500, 640).
"""
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import gaussian_filter, zoom

W, H = 2400, 1350
PX, PY = 1500, 640
rng = np.random.default_rng(8)


def noise(scale: int, sigma: float) -> np.ndarray:
    base = rng.standard_normal((H // scale + 2, W // scale + 2))
    n = gaussian_filter(zoom(base, scale, order=3)[:H, :W], sigma)
    return (n - n.min()) / (n.max() - n.min())


# grass: two greens and sunlit patches
n1, n2, n3 = noise(160, 60), noise(40, 12), noise(8, 2)
g = 0.55 * n1 + 0.3 * n2 + 0.15 * n3
dark = np.array([34, 96, 48], float)
light = np.array([118, 182, 70], float)
sun = np.array([186, 210, 92], float)
img = dark + (light - dark) * g[..., None]
img += (sun - img) * (np.clip(n1 - 0.62, 0, 1) * 1.6)[..., None]

im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
d = ImageDraw.Draw(im, "RGBA")

# the river, bottom-left to the left edge
for w, c in [(230, (22, 112, 160, 255)), (170, (34, 168, 214, 255)), (70, (120, 222, 240, 160))]:
    d.line([(0, 1080), (300, 980), (560, 1120), (820, 1350)], fill=c, width=w, joint="curve")

# lanes: worn stone paths into the plaza
for w, c in [(170, (150, 128, 92, 255)), (130, (196, 172, 126, 255)), (60, (220, 200, 156, 120))]:
    d.line([(-50, 760), (500, 700), (900, 660), (PX - 300, PY)], fill=c, width=w, joint="curve")
    d.line([(300, 1400), (700, 1120), (1100, 900), (PX - 200, PY + 220)], fill=c, width=w, joint="curve")
    d.line([(PX + 250, PY - 260), (1900, 300), (2300, -50)], fill=c, width=w, joint="curve")

# the plaza: rings of pale stone, darker tiles, a rim of gold-ish stone
for r, c in [(470, (110, 98, 84, 255)), (440, (214, 200, 170, 255)), (400, (188, 172, 140, 255)), (250, (222, 210, 182, 255)), (230, (176, 160, 128, 255)), (120, (230, 220, 194, 255))]:
    d.ellipse([PX - r, PY - r * 0.82, PX + r, PY + r * 0.82], fill=c)
for k in range(24):
    a = k / 24 * 2 * np.pi
    x0, y0 = PX + 250 * np.cos(a), PY + 250 * 0.82 * np.sin(a)
    x1, y1 = PX + 400 * np.cos(a), PY + 400 * 0.82 * np.sin(a)
    d.line([(x0, y0), (x1, y1)], fill=(150, 134, 104, 255), width=4)
for k in range(8):
    a = k / 8 * 2 * np.pi + 0.2
    x, y = PX + 455 * np.cos(a), PY + 455 * 0.82 * np.sin(a)
    d.ellipse([x - 26, y - 22, x + 26, y + 22], fill=(120, 108, 92, 255))
    d.ellipse([x - 18, y - 16, x + 18, y + 12], fill=(170, 156, 130, 255))

# trees: clusters of round canopies with a lit rim and a shadow
def tree(x: float, y: float, r: float) -> None:
    d.ellipse([x - r + 14, y - r + 22, x + r + 14, y + r + 22], fill=(10, 40, 20, 110))
    d.ellipse([x - r, y - r, x + r, y + r], fill=(22, 82, 40, 255))
    d.ellipse([x - r * 0.85, y - r * 0.95, x + r * 0.7, y + r * 0.6], fill=(44, 120, 54, 255))
    d.ellipse([x - r * 0.55, y - r * 0.8, x + r * 0.25, y - r * 0.05], fill=(92, 168, 74, 200))


for _ in range(70):
    x, y = rng.uniform(0, W), rng.uniform(0, H)
    if (x - PX) ** 2 / 600**2 + (y - PY) ** 2 / 520**2 < 1:
        continue
    if 380 < x < 1300 and 560 < y < 980:
        continue
    tree(x, y, rng.uniform(40, 95))

# bushes
for _ in range(40):
    x, y = rng.uniform(0, W), rng.uniform(0, H)
    if (x - PX) ** 2 / 560**2 + (y - PY) ** 2 / 480**2 < 1:
        continue
    r = rng.uniform(18, 34)
    d.ellipse([x - r, y - r * 0.7, x + r, y + r * 0.7], fill=(30, 104, 48, 230))

im = im.filter(ImageFilter.GaussianBlur(0.8))
# a warm light falling from the top right, and a soft vignette
arr = np.asarray(im).astype(float)
yy, xx = np.mgrid[0:H, 0:W]
light = np.clip(1.15 - ((xx - 1900) ** 2 + (yy + 200) ** 2) ** 0.5 / 2600, 0.75, 1.15)
arr *= light[..., None]
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "field.jpg")
Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(out, quality=88)
print(out)
