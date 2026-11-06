"""Poly Haven (CC0) downloader. usage: ph.py <outdir> hdri:<id>[@4k] tex:<id>[@2k] model:<id>[@2k] ..."""
import json, os, sys, urllib.request
from concurrent.futures import ThreadPoolExecutor
OUT = sys.argv[1]
UA = {"User-Agent": "shapeof.world asset fetch"}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
def save(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0: return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    data = get(url); open(path, "wb").write(data)
jobs = []
for spec in sys.argv[2:]:
    kind, rest = spec.split(":", 1)
    aid, _, res = rest.partition("@")
    f = json.loads(get(f"https://api.polyhaven.com/files/{aid}"))
    if kind == "hdri":
        r = res or "4k"
        jobs.append((f["hdri"][r]["exr"]["url"], f"{OUT}/hdri/{aid}_{r}.exr"))
    elif kind == "tex":
        r = res or "2k"
        for m, key in [("diff", "Diffuse"), ("nor", "nor_gl"), ("rough", "Rough"), ("disp", "Displacement"), ("ao", "AO"), ("arm", "arm")]:
            if key in f and r in f[key]:
                fmt = "jpg" if "jpg" in f[key][r] else "png"
                jobs.append((f[key][r][fmt]["url"], f"{OUT}/tex/{aid}/{m}.{fmt}"))
    elif kind == "model":
        r = res or "2k"
        g = f["gltf"][r]["gltf"]
        jobs.append((g["url"], f"{OUT}/models/{aid}/{os.path.basename(g['url'])}"))
        for rel, inc in g.get("include", {}).items():
            jobs.append((inc["url"], f"{OUT}/models/{aid}/{rel}"))
with ThreadPoolExecutor(8) as ex:
    list(ex.map(lambda j: save(*j), jobs))
print("ok", len(jobs), "files")
