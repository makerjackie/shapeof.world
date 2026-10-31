"""Natural Earth (Ukraine point of view = internationally recognised borders) + AWS Terrarium z6 → country-scale layers.
Control areas are our own generalised sketches (示意): lines through named towns, clipped to Ukraine; areas are checked
against the published shares (DeepState / ISW). usage: python tools/prep_ukraine.py <ne-dir> <out-dir> <public-dir>"""
import json, math, sys, glob, numpy as np
from shapely.geometry import shape, Polygon, LineString, MultiPolygon, box, Point, mapping
from shapely.ops import unary_union, transform as shp_transform
from pyproj import Transformer
from PIL import Image
NE, OUT, PUB = sys.argv[1:4]
LAT0, LON0 = 47.42, 35.86
KX = 111320 * math.cos(math.radians(LAT0)); KY = 110574
loc = lambda lon, lat: ((lon - LON0) * KX, (lat - LAT0) * KY)
ea = Transformer.from_crs("EPSG:4326", "+proj=laea +lat_0=48.5 +lon_0=31.5 +ellps=WGS84", always_xy=True).transform
countries = json.load(open(f"{NE}/ne_10m_admin_0_countries_ukr.geojson"))["features"]
ukr = next(shape(f["geometry"]) for f in countries if f["properties"]["ADM0_A3"] == "UKR")
UA_AREA = shp_transform(ea, ukr).area / 1e6
print("Ukraine km2", round(UA_AREA))
def ring(lst): return [(a, b) for a, b in lst]
def frac(g): return shp_transform(ea, g).area / 1e6 / UA_AREA
# --- control sketches (lon, lat). Each is a big polygon whose western/northern edge is the front; it is clipped to Ukraine.
CRIMEA = Polygon([(31.0, 46.13), (33.6, 46.17), (34.3, 46.08), (34.62, 46.02), (35.3, 45.7), (37.0, 45.4), (37.0, 43.5), (31.0, 43.5)])
EAST = [(41.5, 46.6), (38.25, 46.9), (37.78, 47.08)]
def zone(front, tail=None):
    pts = front + (tail or [(41.5, 52.6), (41.5, 46.6)])
    return Polygon(pts)
F2014 = [(41.5, 48.75), (39.6, 48.62), (39.25, 48.70), (38.75, 48.64), (38.45, 48.58), (38.25, 48.40), (37.95, 48.37),
         (37.84, 48.15), (37.62, 48.05), (37.58, 47.93), (37.66, 47.80), (37.75, 47.55), (37.80, 47.30), (37.76, 47.10), (37.7, 46.9), (41.5, 46.6)]
P2014 = unary_union([Polygon(F2014), CRIMEA]).intersection(ukr)
F2022_03 = [(29.0, 52.2), (29.25, 51.55), (29.6, 51.05), (29.9, 50.72), (30.12, 50.58), (30.3, 50.62), (30.48, 50.7),
            (30.7, 50.62), (30.9, 50.55), (31.4, 50.6), (32.2, 50.88), (33.0, 51.0), (33.8, 50.95), (34.5, 50.78),
            (35.2, 50.45), (35.8, 50.15), (36.1, 50.06), (36.45, 50.1), (36.9, 49.95), (37.15, 49.5), (37.25, 49.2),
            (37.7, 49.08), (38.2, 49.08), (38.42, 48.98), (38.5, 48.8), (38.38, 48.6), (38.2, 48.42), (37.95, 48.37),
            (37.84, 48.15), (37.62, 48.02), (37.45, 47.92), (37.25, 47.82), (36.8, 47.74), (36.3, 47.62), (35.8, 47.52),
            (35.3, 47.47), (35.05, 47.55), (34.6, 47.48), (34.2, 47.42), (33.85, 47.05), (33.55, 47.1), (33.1, 47.05),
            (32.75, 47.02), (32.3, 46.92), (31.95, 46.72), (31.8, 46.6), (31.0, 46.3), (31.0, 43.5), (42, 43.5), (42, 52.6), (32.5, 52.6), (29.0, 52.6)]
HOLES = [Point(loc0).buffer(0.17) for loc0 in [(31.29, 51.49), (34.80, 50.91), (36.23, 49.99)]]  # Chernihiv, Sumy, Kharkiv held
P2022_03 = Polygon(F2022_03).difference(unary_union(HOLES)).union(P2014).intersection(ukr)
F2022_06 = [(36.2, 50.8), (36.3, 50.3), (36.55, 50.1), (36.85, 49.85), (36.9, 49.5), (37.1, 49.28), (37.45, 49.0),
            (37.9, 48.88), (38.15, 48.75), (38.08, 48.6), (37.97, 48.42), (37.84, 48.15), (37.62, 48.02), (37.45, 47.92),
            (37.25, 47.82), (36.8, 47.74), (36.3, 47.62), (35.8, 47.52), (35.3, 47.47), (35.05, 47.55), (34.6, 47.48),
            (34.2, 47.42), (33.85, 47.05), (33.55, 47.0), (33.1, 46.95), (32.75, 46.88), (32.3, 46.78), (31.95, 46.62),
            (31.8, 46.55), (31.0, 46.3), (31.0, 43.5), (42, 43.5), (42, 52.6), (36.2, 52.6)]
P2022_06 = Polygon(F2022_06).union(P2014).intersection(ukr)
F2022_11 = [(37.9, 50.4), (37.95, 50.05), (38.0, 49.7), (37.97, 49.4), (38.05, 49.15), (38.15, 49.0), (38.12, 48.9),
            (38.08, 48.72), (38.04, 48.6), (37.97, 48.42), (37.86, 48.18), (37.72, 48.08), (37.58, 47.95), (37.42, 47.85),
            (37.2, 47.76), (36.85, 47.73), (36.3, 47.6), (35.8, 47.505), (35.4, 47.47), (35.15, 47.52), (34.7, 47.45),
            (34.2, 47.38), (33.8, 47.05), (33.45, 46.82), (33.1, 46.72), (32.75, 46.63), (32.4, 46.57), (32.0, 46.52),
            (31.5, 46.5), (31.0, 46.3), (31.0, 43.5), (42, 43.5), (42, 52.6), (38.5, 52.6)]
P2022_11 = Polygon(F2022_11).union(P2014).intersection(ukr)
F2026 = [(36.2, 50.6), (36.5, 50.32), (36.95, 50.25), (37.45, 50.1), (37.62, 49.75), (37.75, 49.4), (37.9, 49.1),
         (38.0, 48.95), (37.98, 48.82), (37.82, 48.62), (37.68, 48.52), (37.42, 48.42), (37.15, 48.36), (37.05, 48.2),
         (36.95, 48.05), (36.7, 47.88), (36.15, 47.78), (35.95, 47.62), (35.8, 47.525), (35.5, 47.56), (35.25, 47.6),
         (35.12, 47.58), (34.7, 47.45), (34.2, 47.38), (33.8, 47.05), (33.45, 46.82), (33.1, 46.72), (32.75, 46.63),
         (32.4, 46.57), (32.0, 46.52), (31.5, 46.5), (31.0, 46.3), (31.0, 43.5), (42, 43.5), (42, 52.6), (36.0, 52.6)]
SUMY_STRIP = Polygon([(35.5, 51.25), (35.8, 51.15), (36.25, 50.75), (36.6, 51.3)])  # small border strip
P2026 = unary_union([Polygon(F2026), SUMY_STRIP]).union(P2014).intersection(ukr)
areas = {k: round(frac(v) * 100, 2) for k, v in dict(p2014=P2014, p2022_03=P2022_03, p2022_06=P2022_06, p2022_11=P2022_11, p2026=P2026).items()}
print("shares %", areas, "(targets ~7, ~27, 18.0, ~19.35)")
# --- output in local metres, simplified
def tloc(g, tol=1500):
    g = shp_transform(lambda x, y, z=None: loc(x, y), g).simplify(tol, preserve_topology=True)
    polys = [g] if isinstance(g, Polygon) else list(g.geoms)
    return [[[round(c) for xy in p.exterior.coords for c in xy]] + [[round(c) for xy in h.coords for c in xy] for h in p.interiors] for p in polys if p.area > 4e6]
def tline(coords): return [round(c) for lon, lat in coords for c in loc(lon, lat)]
bb = box(17, 41.5, 44.5, 56.5)
nb = []
for f in countries:
    g = shape(f["geometry"]).intersection(bb)
    if g.is_empty: continue
    nb.append({"a3": f["properties"]["ADM0_A3"], "poly": tloc(g, 2500)})
rivers = []
for f in json.load(open(f"{NE}/ne_10m_rivers_lake_centerlines.geojson"))["features"]:
    p = f["properties"]; g = shape(f["geometry"]).intersection(bb)
    if g.is_empty or (p.get("scalerank") or 9) > 6: continue
    ls = [g] if g.geom_type == "LineString" else list(getattr(g, "geoms", []))
    for l in ls:
        if l.geom_type == "LineString" and l.length > 0.2: rivers.append({"n": p.get("name"), "r": p.get("scalerank"), "p": tline(l.simplify(0.01).coords)})
lakes = []
for f in json.load(open(f"{NE}/ne_10m_lakes.geojson"))["features"]:
    g = shape(f["geometry"]).intersection(bb)
    if not g.is_empty and shp_transform(ea, g).area > 1.5e8: lakes += tloc(g, 1500)
coast = []
for f in json.load(open(f"{NE}/ne_10m_coastline.geojson"))["features"]:
    g = shape(f["geometry"]).intersection(bb)
    for l in ([g] if g.geom_type == "LineString" else list(getattr(g, "geoms", []))):
        if l.geom_type == "LineString" and l.length > 0.05: coast.append(tline(l.simplify(0.01).coords))
fronts = {k: tline(LineString(v[:i]).coords) for k, v, i in [("f2014", F2014, 15), ("f2022_11", F2022_11, 29), ("f2026", F2026, 30)]}
out = dict(ukraine=tloc(ukr, 1200), control={"p2014": tloc(P2014), "p2022_03": tloc(P2022_03), "p2022_06": tloc(P2022_06), "p2022_11": tloc(P2022_11), "p2026": tloc(P2026)},
           shares=areas, neighbours=nb, rivers=rivers, lakes=lakes, coast=coast, fronts=fronts)
json.dump(out, open(f"{OUT}/ukraine.json", "w"), separators=(",", ":"))
# --- relief: Terrarium z6 mosaic → local grid 2 km/px, x -1300..+720 km, y -620..+950 km
tiles = {}
for f in glob.glob(f"{NE}/tiles/t_*.png"):
    _, x, y = f[:-4].split("_")[-3:]; tiles[(int(x), int(y))] = np.asarray(Image.open(f).convert("RGB")).astype(np.float32)
mos = np.zeros((4 * 256, 5 * 256), np.float32)
for (x, y), a in tiles.items(): mos[(y - 20) * 256:(y - 19) * 256, (x - 35) * 256:(x - 34) * 256] = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
RES = 2000; X0, X1, Y0, Y1 = -1300e3, 720e3, -620e3, 950e3
W, H = int((X1 - X0) / RES), int((Y1 - Y0) / RES)
xs = X0 + (np.arange(W) + 0.5) * RES; ys = Y1 - (np.arange(H) + 0.5) * RES
lon = LON0 + xs / KX; lat = LAT0 + ys / KY
LON, LAT = np.meshgrid(lon, lat)
n = 64 * 256
px = (LON + 180) / 360 * n - 35 * 256
py = (1 - np.log(np.tan(np.radians(LAT)) + 1 / np.cos(np.radians(LAT))) / math.pi) / 2 * n - 20 * 256
h = mos[np.clip(py.astype(int), 0, mos.shape[0] - 1), np.clip(px.astype(int), 0, mos.shape[1] - 1)]
h = np.maximum(h, -50)
print("relief", W, H, float(h.min()), float(h.max()))
h.astype(np.float32).tofile(f"{PUB}/relief.f32")
json.dump({"w": W, "h": H, "x0": X0, "x1": X1, "y0": Y0, "y1": Y1}, open(f"{OUT}/relief.json", "w"))
