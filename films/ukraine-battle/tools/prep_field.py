"""OSM (Overpass JSON) + Copernicus DEM → the battlefield layers in the film's local frame.
Frame: x east / y north in metres from (47.42 N, 35.86 E), equirectangular (cos of 47.42°), same as src/geo.ts.
usage: python tools/prep_field.py <osm.json> <dem40.npy> <out-dir>"""
import json, math, sys, numpy as np
LAT0, LON0 = 47.42, 35.86
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110574
def xy(lon, lat): return [round((lon - LON0) * KX), round((lat - LAT0) * KY)]
def simplify(pts, tol):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0], float), np.array(pts[-1], float)
    ab = b - a; L = np.hypot(*ab) or 1e-9
    d = [abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L for p in pts[1:-1]]
    i = int(np.argmax(d)) + 1
    if d[i - 1] > tol: return simplify(pts[:i + 1], tol)[:-1] + simplify(pts[i:], tol)
    return [pts[0], pts[-1]]
def simplify_ring(pts, tol):
    if len(pts) < 4: return pts
    a = np.array(pts[0], float)
    k = int(np.argmax([np.hypot(*(np.array(p, float) - a)) for p in pts]))
    return simplify(pts[:k + 1], tol)[:-1] + simplify(pts[k:], tol)
osm = json.load(open(sys.argv[1]))
out = {"treeRows": [], "woods": [], "roads": [], "rail": [], "rivers": [], "water": [], "towns": [], "places": []}
for e in osm["elements"]:
    t = e.get("tags", {})
    if e["type"] == "node":
        out["places"].append({"name": t.get("name:en") or t.get("name"), "uk": t.get("name"), "kind": t["place"], "p": xy(e["lon"], e["lat"])})
        continue
    g = [xy(p["lon"], p["lat"]) for p in e.get("geometry", [])]
    if len(g) < 2: continue
    flat = lambda pts: [c for p in pts for c in p]
    if t.get("natural") == "tree_row": out["treeRows"].append(flat(simplify(g, 6)))
    elif t.get("landuse") == "forest" or t.get("natural") == "wood": out["woods"].append(flat(simplify_ring(g, 8)))
    elif "highway" in t: out["roads"].append({"c": t["highway"][0], "p": flat(simplify(g, 8))})
    elif t.get("railway") == "rail": out["rail"].append(flat(simplify(g, 8)))
    elif "waterway" in t: out["rivers"].append({"c": t["waterway"][0], "p": flat(simplify(g, 8))})
    elif t.get("natural") == "water": out["water"].append(flat(simplify_ring(g, 6)))
    elif t.get("landuse") == "residential": out["towns"].append(flat(simplify_ring(g, 8)))
L = lambda arr: sum(math.hypot(a[i+2]-a[i], a[i+3]-a[i+1]) for a in arr for i in range(0, len(a)-2, 2))
print({k: len(v) for k, v in out.items()}, "treeRow km", round(L(out["treeRows"]) / 1000), "wood rings", len(out["woods"]))
json.dump(out, open(f"{sys.argv[3]}/field.json", "w"), separators=(",", ":"))
dem = np.load(sys.argv[2])   # 40 m grid, x -20..20 km, y 22..-22 km (row 0 = north)
dem80 = dem.reshape(550, 2, 500, 2).mean(axis=(1, 3)).astype(np.float32)
dem80.tofile(f"{sys.argv[3]}/dem80.f32")
print("dem80", dem80.shape, float(dem80.min()), float(dem80.max()))
