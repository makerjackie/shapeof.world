"""Dynasty extents for the map, from aourednik/historical-basemaps (GPL-3.0) snapshots.
We take only the outline of the Chinese dynasty in each snapshot (the dataset's own labels are partly wrong for China:
700 says "Sui Empire", 1400 says "Great Khanate"; we label in the film ourselves) and drop everything from 1912 on.
Output src/v3/territory.json: {snapshot: [[[lon, lat], ...], ...]} simplified to <= 260 points per ring."""
import json, os, math
SRC = "/Volumes/DevSSD/tmp/popmap/hb"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "v3", "territory.json")
PICK = {
    "bc1": ["Han"], "100": ["Han"], "200": ["Han"], "300": ["Jin"], "400": ["Jin", "Sixteen Kingdoms"],
    "500": ["Jin Empire", "Toba Wei"], "600": ["Sui Empire"], "700": ["Sui Empire"], "800": ["Tang Empire"], "900": ["Tang Empire"],
    "1000": ["Song Empire"], "1100": ["Song Empire"], "1200": ["Song Empire"], "1279": ["Great Khanate"], "1300": ["Great Khanate"],
    "1500": ["Ming Chinese Empire"], "1600": ["Ming Chinese Empire"], "1650": ["Manchu Empire"], "1700": ["Manchu Empire"],
    "1800": ["Qing Empire"], "1880": ["Manchu Empire"],
}
def rings(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [c[0]]
    if t == "MultiPolygon":
        return [p[0] for p in c]
    return []
def area(r):
    return abs(sum(r[i][0] * r[i - 1][1] - r[i - 1][0] * r[i][1] for i in range(len(r)))) / 2
out = {}
for snap, names in PICK.items():
    d = json.load(open(os.path.join(SRC, f"world_{snap}.geojson")))
    rs = []
    for ft in d["features"]:
        if ft["properties"].get("NAME") in names and ft["geometry"]:
            for r in rings(ft["geometry"]):
                if area(r) < 0.5:
                    continue
                step = max(1, math.ceil(len(r) / 260))
                rs.append([[round(p[0], 2), round(p[1], 2)] for p in r[::step]])
    out[snap] = rs
    print(snap, names, len(rs), "rings", sum(len(r) for r in rs), "pts")
json.dump(out, open(OUT, "w"), separators=(",", ":"))
print("wrote", os.path.getsize(OUT) // 1024, "KB")
