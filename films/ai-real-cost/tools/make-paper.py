"""Make the dark paper tile for the v19 editorial sheet: fine grain, soft mottling and faint fibres.

usage: make-paper.py <out.png>
"""
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

N = 1024
rng = np.random.default_rng(19)
base = np.array([18, 26, 43], dtype=np.float32)  # #121a2b

# soft mottling: low-pass noise made in the frequency domain, so the tile repeats without seams
spec = rng.normal(0, 1, (N, N)) + 1j * rng.normal(0, 1, (N, N))
f = np.fft.fftfreq(N)
fy, fx = np.meshgrid(f, f, indexing="ij")
low = np.real(np.fft.ifft2(spec * np.exp(-(fx**2 + fy**2) / (2 * 0.012**2)))).astype(np.float32)
low = low / (np.abs(low).max() + 1e-6) * 4.5
grain = rng.normal(0, 2.2, (N, N)).astype(np.float32)
img = base[None, None, :] + (low + grain)[:, :, None]

im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")
# faint fibres
fib = Image.new("L", (N, N), 0)
d = ImageDraw.Draw(fib)
for _ in range(900):
    x, y = rng.uniform(0, N, 2)
    a = rng.uniform(0, np.pi)
    ln = rng.uniform(8, 40)
    d.line([(x, y), (x + np.cos(a) * ln, y + np.sin(a) * ln)], fill=int(rng.uniform(10, 26)), width=1)
fib = fib.filter(ImageFilter.GaussianBlur(0.6))
light = Image.new("RGB", (N, N), (226, 216, 196))
im = Image.composite(light, im, fib.point(lambda v: v // 3))
im.save(sys.argv[1], optimize=True)
print("wrote", sys.argv[1])
