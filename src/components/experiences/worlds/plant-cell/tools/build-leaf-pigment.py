"""Generate the original A-direction leaf pigment; no photographs.

Requires numpy, scipy and Pillow. Run from the repository root. The large
PNG stays in .local/plant-cell; only the small WebP is a public asset.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom
from scipy.spatial import cKDTree

output = Path(__file__).resolve().parents[6] / 'public/assets/plant-cell'
output.mkdir(parents=True, exist_ok=True)
originals = Path.cwd() / '.local/plant-cell'
originals.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(5411)
width_px, height_px = 1300, 1700
v, u = np.mgrid[0:1:complex(height_px), -1:1:complex(width_px)]
center = .035 * np.sin(v * 8)
width = np.maximum(.0001, .78 * np.sin(np.pi * v) ** .8 * (.78 + .22 * v) * (1 + .035 * np.sin(v * 46)))
mask = np.abs(u - center) < width
noise = np.zeros((height_px, width_px))
for resolution, amplitude in [(6, .5), (14, .2), (35, .1), (90, .07), (240, .03)]:
    samples = rng.normal(size=(resolution, resolution))
    noise += zoom(samples, (height_px / resolution, width_px / resolution), order=3)[:height_px, :width_px] * amplitude

x = np.abs(u - center)
phase = v + .27 * x ** .85 + .013 * np.sin(x * 25 + v * 15)
levels = np.array([.08, .155, .245, .34, .445, .555, .67, .79, .92, 1.06, 1.18])
distance = np.min(abs(phase[:, :, None] - levels), axis=2)
branches = np.exp(-(distance / .003) ** 2) * (1 - x * .5)
midrib = np.exp(-((u - center) / (.007 + .01 * v)) ** 2)
points = rng.uniform([-.95, -.08], [.95, 1.08], (2100, 2))
nearest, _ = cKDTree(points).query(np.column_stack((u.ravel(), v.ravel() * 1.3)), k=2, workers=2)
gap = (nearest[:, 1] - nearest[:, 0]).reshape(height_px, width_px)
net = np.exp(-(gap / .0011) ** 2)

tone = .42 + .19 * noise + .15 * (1 - v) - .04 * u
color = np.array([77, 125, 79]) + (np.array([187, 207, 143]) - np.array([77, 125, 79])) * np.clip(tone, 0, 1)[:, :, None]
veins = np.clip(midrib * .82 + branches * .55 + net * .3, 0, .9)
color = color * (1 - veins[:, :, None]) + np.array([213, 220, 166]) * veins[:, :, None]
color += rng.normal(size=(height_px, width_px, 1)) * .8
rgba = np.zeros((height_px, width_px, 4), dtype='uint8')
rgba[:, :, :3] = color.clip(0, 255).astype('uint8')
rgba[:, :, 3] = gaussian_filter(mask.astype(float), .7) * 255
Image.fromarray(rgba).save(originals / 'leaf-pigment.png')
Image.fromarray(rgba).save(output / 'leaf-pigment.webp', quality=94, method=6)
print(output / 'leaf-pigment.webp')
