# Top-down preview of the built city (public/city) for framing shots: python tools/city_map.py out/citymap.jpg [x0 z0 x1 z1]
import json, struct, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]
meta = json.load(open("public/city/meta.json"))
box = [float(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else meta["core"]
x0, z0, x1, z1 = box
W = 3200
S = W / (x1 - x0)
Hh = int((z1 - z0) * S)
T = lambda x, z: ((x - x0) * S, (z - z0) * S)
g = Image.open("public/city/ground.png")
cx0, cz0, cx1, cz1 = meta["core"]
gw, gh = g.size
crop = g.crop((int((x0 - cx0) / (cx1 - cx0) * gw), int((z0 - cz0) / (cz1 - cz0) * gh), int((x1 - cx0) / (cx1 - cx0) * gw), int((z1 - cz0) / (cz1 - cz0) * gh))).resize((W, Hh))
a = np.array(crop).astype(np.float32) / 255
img = np.zeros((Hh, W, 3), np.float32) + 0.08
img += a[..., 1:2] * np.array([0.05, 0.12, 0.35])
img += a[..., 2:3] * np.array([0.05, 0.25, 0.08])
img += a[..., 0:1] * 0.35
im = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
dr = ImageDraw.Draw(im)
buf = open("public/city/bld.bin", "rb").read()
nb, npnt = struct.unpack("<II", buf[:8])
info = np.frombuffer(buf, np.float32, nb * 6, 8).reshape(nb, 6)
offs = np.frombuffer(buf, np.uint32, nb + 1, 8 + nb * 24)
pts = np.frombuffer(buf, np.float32, npnt * 2, 8 + nb * 24 + (nb + 1) * 4).reshape(-1, 2)
for i in range(nb):
    h, kind, seed, osm, cx, cz = info[i]
    if cx < x0 - 100 or cx > x1 + 100 or cz < z0 - 100 or cz > z1 + 100: continue
    ring = [T(*p) for p in pts[offs[i]:offs[i + 1]]]
    k = min(1.0, h / 250)
    col = (int(120 + 135 * k), int(90 + 60 * (1 - k)), 60) if osm > 0.5 else (60, int(80 + 100 * k), int(140 + 100 * k))
    if len(ring) >= 3: dr.polygon(ring, fill=col)
f = ImageFont.load_default(size=26)
for idx, (name, (x, z, h)) in enumerate(meta["marks"].items()):
    if x0 < x < x1 and z0 < z < z1:
        print(idx, name, x, z, h)
        u, v = T(x, z)
        dr.ellipse((u - 5, v - 5, u + 5, v + 5), fill=(255, 255, 255))
        dr.text((u + 8, v - 14), f"{idx}:{int(h)}", fill=(255, 255, 255), font=f)
# grid every 500 m with coordinates
for gx in range(int(x0 // 500) * 500, int(x1) + 1, 500):
    u, _ = T(gx, 0); dr.line((u, 0, u, Hh), fill=(70, 70, 70)); dr.text((u + 3, 3), str(gx), fill=(200, 200, 200), font=f)
for gz in range(int(z0 // 500) * 500, int(z1) + 1, 500):
    _, v = T(0, gz); dr.line((0, v, W, v), fill=(70, 70, 70)); dr.text((3, v + 3), str(gz), fill=(200, 200, 200), font=f)
im.save(OUT, quality=85)
print("saved", OUT, im.size, "buildings", nb)
