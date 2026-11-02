"""Film5 dynasty extents for the top-right mini-map, from aourednik/historical-basemaps (GPL-3.0).
Only outlines are used (the dataset's own China labels are partly wrong; the film labels by itself), drawn as 示意.
Where the dataset has no split we draw one by hand along the historical front lines (all rough, 示意):
  三国: Wei north of the Qinling-Huai line; Shu / Wu split at the Three Gorges (109.5°E)
  南宋·金: the Song 1100 extent cut on the Huai river - Qinling line (1142 treaty); Jin = the north part + the Liao lands
Output src/v5/territory5.json: {era: [{n: name, r: [[[lon, lat], ...], ...]}]}"""
import json, math, os
SRC = "/Volumes/DevSSD/tmp/popmap/hb"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "v5", "territory5.json")

def load(snap, names):
    d = json.load(open(os.path.join(SRC, f"world_{snap}.geojson")))
    rs = []
    for ft in d["features"]:
        g = ft["geometry"]
        if ft["properties"].get("NAME") in names and g:
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            for p in polys:
                if area(p[0]) >= 0.5:
                    rs.append([list(map(float, q[:2])) for q in p[0]])
    return rs

def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2

def clip(ring, inside):
    """Sutherland-Hodgman against one (possibly curved) boundary; crossing points found by bisection."""
    out = []
    n = len(ring)
    for i in range(n):
        a, b = ring[i - 1], ring[i]
        ia, ib = inside(a), inside(b)
        if ib:
            if not ia:
                out.append(cross(a, b, inside))
            out.append(b)
        elif ia:
            out.append(cross(a, b, inside))
    return out

def cross(a, b, inside):
    lo, hi = (a, b) if inside(a) else (b, a)
    for _ in range(30):
        m = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2]
        if inside(m):
            lo = m
        else:
            hi = m
    return lo

def border(pts):
    def f(lon):
        if lon <= pts[0][0]:
            return pts[0][1]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            if lon <= x1:
                return y0 + (y1 - y0) * (lon - x0) / (x1 - x0)
        return pts[-1][1]
    return f

def simp(r, n=200):
    step = max(1, math.ceil(len(r) / n))
    return [[round(p[0], 2), round(p[1], 2)] for p in r[::step]]

def part(name, rings):
    rings = [simp(r) for r in rings if len(r) > 2 and area(r) > 0.3]
    return {"n": name, "r": rings}

out = {}
out["xihan"] = [part("", load("bc1", ["Han"]))]
out["donghan"] = [part("", load("100", ["Han"]))]
han = load("200", ["Han"])
wei_line = border([(90, 33.2), (106, 33.0), (110, 32.2), (114, 31.8), (118, 32.1), (123, 32.6)])
south = lambda p: p[1] < wei_line(p[0])
north = lambda p: p[1] >= wei_line(p[0])
out["sanguo"] = [
    part("魏", [clip(r, north) for r in han]),
    part("蜀", [clip(clip(r, south), lambda p: p[0] < 109.5) for r in han]),
    part("吴", [clip(clip(r, south), lambda p: p[0] >= 109.5) for r in han]),
]
out["jin"] = [part("", load("300", ["Jin"]))]
out["nanbei"] = [part("北", load("500", ["Toba Wei"])), part("南", load("500", ["Jin Empire"]))]
out["sui"] = [part("", load("600", ["Sui Empire"]))]
out["tang"] = [part("", load("700", ["Sui Empire"]))]
out["tang2"] = [part("", load("800", ["Tang Empire"]))]
song = load("1100", ["Song Empire"])
out["song"] = [part("", song)]
huai = border([(95, 34.4), (104, 34.0), (107, 33.6), (110, 33.3), (114, 32.6), (118, 33.0), (121, 33.6), (124, 34.0)])
out["songjin"] = [
    part("宋", [clip(r, lambda p: p[1] < huai(p[0])) for r in song]),
    part("金", [clip(r, lambda p: p[1] >= huai(p[0])) for r in song] + [clip(r, lambda p: p[1] < 50) for r in load("1100", ["Liao"])]),
]
out["yuan"] = [part("", load("1279", ["Great Khanate"]))]
out["ming"] = [part("", load("1500", ["Ming Chinese Empire"]))]
out["qing1"] = [part("", load("1650", ["Manchu Empire"]))]
out["qing2"] = [part("", load("1700", ["Manchu Empire"]))]
for k, v in out.items():
    print(k, [(p["n"], len(p["r"]), sum(len(r) for r in p["r"])) for p in v])
json.dump(out, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)
print("wrote", os.path.getsize(OUT) // 1024, "KB")
