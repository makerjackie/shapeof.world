"""A dark blanket at night, for the phone to be held over: soft folds, a fine weave, almost no light of its own (the
phone's glow is added in the film). Our own generated texture, deterministic.

usage: ~/.venvs/shapeof-films/bin/python tools/bed.py   → public/bed.jpg (2400 × 1350)
"""
import os

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

W, H = 2400, 1350
rng = np.random.default_rng(21)
yy, xx = np.mgrid[0:H, 0:W].astype(float)


def noise(scale: int, sigma: float) -> np.ndarray:
    base = rng.standard_normal((H // scale + 2, W // scale + 2))
    n = gaussian_filter(zoom(base, scale, order=3)[:H, :W], sigma)
    return (n - n.min()) / (n.max() - n.min())


# big soft folds running diagonally, bent by low-frequency noise
warp = noise(300, 120) * 260
folds = 0.5 + 0.5 * np.sin((xx * 0.8 + yy * 0.55 + warp) / 95)
folds = gaussian_filter(folds, 6) ** 1.6
folds2 = 0.5 + 0.5 * np.sin((xx * -0.4 + yy * 0.9 + warp * 0.6) / 160)
shade = 0.55 * folds + 0.25 * folds2 + 0.2 * noise(80, 30)
# fine weave
weave = (np.sin(xx * 1.9) * np.sin(yy * 1.9)) * 0.5 + 0.5
grain = rng.random((H, W))
tex = shade * (0.93 + 0.05 * weave + 0.04 * grain)

dark = np.array([8, 10, 16], float)
cloth = np.array([40, 46, 66], float)
img = dark + (cloth - dark) * tex[..., None]
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "bed.jpg")
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save(out, quality=88)
print(out)
