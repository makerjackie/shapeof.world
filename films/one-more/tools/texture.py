"""Night-sky texture for the backdrop: soft multi-octave noise in deep blue, indigo and a trace of magenta.

usage: ~/.venvs/shapeof-films/bin/python tools/texture.py   → public/nebula.jpg (2400 × 1350, our own art)
Deterministic (fixed seed), so re-running gives the same file.
"""
import os

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

W, H = 2400, 1350
rng = np.random.default_rng(147)


def octave(scale: int, sigma: float) -> np.ndarray:
    base = rng.standard_normal((H // scale + 2, W // scale + 2))
    up = zoom(base, scale, order=3)[:H, :W]
    return gaussian_filter(up, sigma)


n = sum(octave(s, s * 0.6) * w for s, w in [(240, 1.0), (120, 0.6), (48, 0.35), (16, 0.15)])
n = (n - n.min()) / (n.max() - n.min())
m = octave(200, 120)
m = (m - m.min()) / (m.max() - m.min())

# colour: base night blue, clouds of indigo, a little magenta where the second field is high
base = np.array([5, 8, 14], float)
indigo = np.array([30, 34, 86], float)
teal = np.array([10, 52, 78], float)
mag = np.array([90, 20, 70], float)
c = base + (indigo - base) * (n[..., None] ** 2.2) * 0.9
c += (teal - base) * ((1 - m)[..., None] ** 3) * (n[..., None] ** 2) * 0.8
c += (mag - base) * (m[..., None] ** 4) * (n[..., None] ** 2.5) * 0.7

# faint stars
stars = rng.random((H, W)) > 0.9993
glow = gaussian_filter(stars.astype(float), 1.2) * 60
c += glow[..., None] * np.array([0.8, 0.85, 1.0])

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "nebula.jpg")
Image.fromarray(np.clip(c, 0, 255).astype(np.uint8)).save(out, quality=88)
print(out)
