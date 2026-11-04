# Builds the film's city from OpenStreetMap (Futian / Luohu, Shenzhen; data © OpenStreetMap contributors, ODbL).
#   data/osm/bld.json, roads.json, land.json  (fetched with tools/city_fetch.sh)  →  public/city/*
# Real footprints and heights where OSM has them; the gaps OSM leaves (it maps maybe a third of the buildings here)
# are filled with buildings that follow the real streets: urban-village blocks, estates of point towers, mid-rise.
# Units: metres, x east, z south (north = -z), origin at the Ping An Finance Centre.
import json, math, struct, sys, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from shapely.geometry import Polygon, LineString
from shapely.geometry.polygon import orient

D = "data/osm/"
OUT = "public/city/"
os.makedirs(OUT, exist_ok=True)
LAT0, LON0 = 22.53645, 114.05050  # Ping An Finance Centre
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 110574
def xz(lat, lon): return ((lon - LON0) * KX, -(lat - LAT0) * KZ)
rng = np.random.default_rng(20261104)

# core extent (buildings modelled) and far extent (the carpet of street light to the horizon)
CORE = (*xz(22.575, 113.99), *xz(22.515, 114.13))  # x0, z0(north), x1, z1(south)
CX0, CZ0, CX1, CZ1 = CORE[0], CORE[1], CORE[2], CORE[3]
FAR = (*xz(22.68, 113.85), *xz(22.42, 114.30))
print("core", [round(v) for v in CORE], "far", [round(v) for v in FAR])

# ---------------- roads ----------------
CLS = {"motorway": 0, "trunk": 1, "primary": 2, "secondary": 3, "tertiary": 4, "motorway_link": 5, "trunk_link": 5, "primary_link": 5,
       "secondary_link": 5, "residential": 6, "unclassified": 6, "living_street": 7, "service": 7}
WID = {0: 26, 1: 30, 2: 24, 3: 18, 4: 13, 5: 8, 6: 8, 7: 5}  # carriageway width (m); Shenzhen's trunk avenues are wide
roads_raw = json.load(open(D + "roads.json"))["elements"]
node_ways = {}
roads = []
for e in roads_raw:
    if e["type"] != "way" or "geometry" not in e: continue
    t = e.get("tags", {})
    c = CLS.get(t.get("highway"))
    if c is None: continue
    if t.get("area") == "yes": continue
    if c == 7 and t.get("service") in ("parking_aisle", "driveway"): continue
    pts = [xz(p["lat"], p["lon"]) for p in e["geometry"]]
    lanes = t.get("lanes")
    try: lanes = int(str(lanes).split(";")[0])
    except: lanes = None
    w = WID[c]
    if lanes: w = max(w * 0.6, min(w * 1.4, lanes * 3.4 * (1 if t.get("oneway") == "yes" else 1)))
    br = t.get("bridge") not in (None, "no")
    tun = t.get("tunnel") not in (None, "no")
    try: layer = int(t.get("layer", "1" if br else "0"))
    except: layer = 1 if br else 0
    r = dict(c=c, pts=pts, nodes=e["nodes"], w=w, br=br, tun=tun, layer=layer, oneway=t.get("oneway") == "yes", name=t.get("name", ""), ref=t.get("ref", ""))
    roads.append(r)
    for n in e["nodes"]: node_ways.setdefault(n, []).append(len(roads) - 1)
print("roads", len(roads))

# elevation: bridges ramp up from their abutments; layered bridges stack 7 m apart
def bridge_y(r):
    pts = np.array(r["pts"])
    n = len(pts)
    if not r["br"] or r["c"] > 5: return np.zeros(n)
    H = 9.0 + 7.0 * max(0, r["layer"] - 1)
    d = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(pts, axis=0).T))])
    L = d[-1]
    nodes = r["nodes"]
    # an end that joins a road off the bridge sits on the ground; an end that joins another bridge stays up
    def end_up(k):
        return all(roads[j]["br"] for j in node_ways.get(nodes[k], []))
    a = 1.0 if end_up(0) else 0.0
    b = 1.0 if end_up(-1) else 0.0
    ramp = min(160.0, L * 0.45)
    s0 = np.clip(d / ramp, 0, 1); s1 = np.clip((L - d) / ramp, 0, 1)
    sm = lambda s: s * s * (3 - 2 * s)
    k0 = a + (1 - a) * sm(s0); k1 = b + (1 - b) * sm(s1)
    return H * np.minimum(k0, k1)
for r in roads: r["y"] = bridge_y(r)

def in_box(pts, box, pad=0):
    x0, z0, x1, z1 = box
    return any(x0 - pad <= x <= x1 + pad and z0 - pad <= z <= z1 + pad for x, z in pts)

# ---------------- land: water and green ----------------
land = json.load(open(D + "land.json"))["elements"]
water, green, coast = [], [], []
def rings_of(e):
    if e["type"] == "way" and "geometry" in e:
        return [[xz(p["lat"], p["lon"]) for p in e["geometry"]]]
    out = []
    if e["type"] == "relation":
        for m in e.get("members", []):
            if m.get("role") == "outer" and "geometry" in m: out.append([xz(p["lat"], p["lon"]) for p in m["geometry"]])
    return out
rivers = []
for e in land:
    t = e.get("tags", {})
    if t.get("natural") == "coastline": coast += rings_of(e); continue
    if t.get("waterway") == "river": rivers += rings_of(e); continue
    if t.get("natural") == "water": water += rings_of(e); continue
    green += rings_of(e)
print("water", len(water), "green", len(green), "coast", len(coast), "rivers", len(rivers))

# ---------------- rasters ----------------
def raster(box, px):
    x0, z0, x1, z1 = box
    W = int(round((x1 - x0) / px)); H = int(round((z1 - z0) / px))
    return W, H, (lambda x, z: ((x - x0) / px, (z - z0) / px))

def draw_mask(box, px, polys=(), lines=(), fill_sea=None):
    W, H, T = raster(box, px)
    im = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(im)
    for poly in polys:
        if len(poly) >= 3: dr.polygon([T(*p) for p in poly], fill=255)
    for pts, w in lines:
        if len(pts) >= 2: dr.line([T(*p) for p in pts], fill=255, width=max(1, int(round(w / px))))
    if fill_sea is not None:
        ImageDraw.floodfill(im, T(*fill_sea), 255)
    return np.array(im) > 127

# sea: Shenzhen Bay and the Deep Bay coast, by flood-filling from a point in the bay inside the coastline
def sea_mask(box, px):
    W, H, T = raster(box, px)
    im = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(im)
    for ring in coast:
        if len(ring) >= 2: dr.line([T(*p) for p in ring], fill=255, width=3)
    for pt in (xz(22.47, 113.93), xz(22.49, 113.98)):
        u, v = T(*pt)
        if 0 <= u < W and 0 <= v < H and im.getpixel((int(u), int(v))) == 0:
            ImageDraw.floodfill(im, (int(u), int(v)), 128)
    a = np.array(im)
    return a == 128

# ---------------- buildings from OSM ----------------
bj = json.load(open(D + "bld.json"))["elements"]
KIND_OFFICE, KIND_RES, KIND_VILLAGE, KIND_LOW, KIND_LANDMARK = 0, 1, 2, 3, 4
def num(s):
    try: return float(str(s).split()[0].replace("m", "").replace(",", "."))
    except: return None
blds = []
for e in bj:
    t = e.get("tags", {})
    b = t.get("building")
    if b in (None, "construction", "roof", "no", "ruins", "collapsed"): continue
    # underground stations and malls (福田站, 连城新天地 …) are mapped as buildings too
    try: lay = float(t.get("layer", "0"))
    except: lay = 0
    if lay < 0 or t.get("location") in ("underground", "indoor") or t.get("building:levels") == "0": continue
    for ring in rings_of(e):
        if len(ring) < 4: continue
        try:
            P = Polygon(ring)
            if not P.is_valid: P = P.buffer(0)
            if P.geom_type != "Polygon": P = max(P.geoms, key=lambda g: g.area)
        except Exception:
            continue
        if P.area < 25: continue
        P = orient(P.simplify(0.4, preserve_topology=True), 1.0)
        h = num(t.get("height"))
        lv = num(t.get("building:levels"))
        if h is None and lv is not None: h = lv * 3.2 + 2
        area = P.area
        name = t.get("name", "")
        office_like = b in ("commercial", "office", "retail", "hotel") or any(k in name for k in ("大厦", "中心", "广场", "酒店", "银行", "国际"))
        if b in ("industrial", "warehouse", "train_station", "transportation", "stadium", "hangar", "parking", "garage", "garages"): kind = KIND_LOW
        elif office_like: kind = KIND_OFFICE
        elif area < 500 and (h is None or h < 40): kind = KIND_VILLAGE
        else: kind = KIND_RES
        if h is None:
            if kind == KIND_LOW: h = 10 + rng.random() * 10
            elif kind == KIND_VILLAGE: h = 3.1 * rng.integers(6, 10) + 1
            elif kind == KIND_OFFICE: h = 40 + rng.random() * 70 if area > 1500 else 25 + rng.random() * 40
            elif b in ("school", "kindergarten", "hospital", "university", "college", "public", "civic", "government"): h = 14 + rng.random() * 14
            else: h = 3.0 * rng.integers(18, 34) + 2 if area < 1400 else 20 + rng.random() * 40
        h = float(min(h, 620))
        if h > 250: kind = KIND_LANDMARK if kind == KIND_OFFICE or h > 300 else kind
        blds.append(dict(P=P, h=h, kind=kind, seed=float(rng.random() * 100), name=name, osm=True))
print("osm buildings", len(blds))
outline_polys = [b["P"] for b in blds]
# building parts: where OSM models a tower as stacked volumes (podium, shaft, setbacks, crown), use them instead of the
# outline extruded to the full height
if os.path.exists(D + "parts.json") and os.path.getsize(D + "parts.json") > 1000:
    from shapely.strtree import STRtree
    from shapely.geometry import Point
    pj = json.load(open(D + "parts.json"))["elements"]
    parts = []
    for e in pj:
        t = e.get("tags", {})
        h = num(t.get("height"))
        lv = num(t.get("building:levels"))
        if h is None and lv is not None: h = lv * 3.4 + 1
        if h is None: continue
        mh = num(t.get("min_height"))
        mlv = num(t.get("building:min_level"))
        if mh is None and mlv is not None: mh = mlv * 3.4
        mh = mh or 0.0
        if h - mh < 1.5: continue
        for ring in rings_of(e):
            if len(ring) < 4: continue
            try:
                Pp = Polygon(ring)
                if not Pp.is_valid: Pp = Pp.buffer(0)
                if Pp.geom_type != "Polygon": Pp = max(Pp.geoms, key=lambda g: g.area)
            except Exception:
                continue
            if Pp.area < 12: continue
            parts.append((orient(Pp.simplify(0.3, preserve_topology=True), 1.0), float(mh), float(min(h, 620))))
    tree = STRtree([b["P"] for b in blds])
    owner = {}
    for k, (Pp, mh, h) in enumerate(parts):
        c = Pp.representative_point()
        for j in tree.query(c):
            if blds[j]["P"].contains(c):
                owner.setdefault(int(j), []).append(k)
                break
    newb, used = [], 0
    for j, b in enumerate(blds):
        if j in owner:
            for k in owner[j]:
                Pp, mh, h = parts[k]
                newb.append(dict(P=Pp, h=h, base=mh, kind=b["kind"] if h < 250 else KIND_LANDMARK if b["kind"] in (KIND_OFFICE, KIND_LANDMARK) else b["kind"], seed=b["seed"], name=b["name"], osm=True))
            used += 1
        else:
            newb.append(b)
    print("parts", len(parts), "replaced outlines", used)
    blds = newb

# ---------------- fill the gaps ----------------
PX = 2.0
GW, GH, GT = raster(CORE, PX)
print("fill raster", GW, GH)
road_lines = [(r["pts"], r["w"] + 10) for r in roads if r["c"] <= 6 and in_box(r["pts"], CORE, 50)]
svc_lines = [(r["pts"], r["w"] + 4) for r in roads if r["c"] == 7 and in_box(r["pts"], CORE, 50)]
blocked = draw_mask(CORE, PX, lines=road_lines + svc_lines)
blocked |= draw_mask(CORE, PX, polys=water + green)
blocked |= draw_mask(CORE, PX, lines=[(r, 40) for r in rivers])
blocked |= sea_mask(CORE, PX)
bmask = draw_mask(CORE, PX, polys=[list(P.exterior.coords) for P in outline_polys])
blocked |= ndimage.binary_dilation(bmask, iterations=4)
# only fill where there is city: within reach of the street grid (no filling of hills and open land)
roadm = draw_mask(CORE, PX, lines=[(r["pts"], r["w"]) for r in roads if r["c"] <= 7 and in_box(r["pts"], CORE, 50)])
dist_road, (ri, rj) = ndimage.distance_transform_edt(~roadm, return_indices=True)
blocked |= dist_road * PX > 140
# mean direction of the nearest street: from the gradient of the distance field
gy, gx = np.gradient(ndimage.gaussian_filter(dist_road, 3))
occ = blocked.copy()
def fill_noise(x, z, s):
    return (math.sin(x / s + 1.7) * math.cos(z / (s * 1.3) - 0.4) + math.sin((x + z) / (s * 0.7) + 2.2) * 0.6)
fill = []
pts = []
for v in range(0, GH, 6):
    for u in range(0, GW, 6):
        pts.append((u + rng.random() * 6, v + rng.random() * 6))
rng.shuffle(pts)
cnt = 0
for (u, v) in pts:
    iu, iv = int(u), int(v)
    if iu >= GW or iv >= GH or occ[iv, iu]: continue
    x = CX0 + u * PX; z = CZ0 + v * PX
    # zone: urban villages in pockets, estates of point towers elsewhere, a little mid-rise office near the avenues
    n = fill_noise(x, z, 420)
    dr = dist_road[iv, iu] * PX
    if n > 0.55: zone = KIND_VILLAGE
    elif n < -0.8 and dr < 50: zone = KIND_OFFICE
    else: zone = KIND_RES
    ang = math.atan2(gy[iv, iu], gx[iv, iu])  # across the street
    if zone == KIND_VILLAGE:
        w, d = 10 + rng.random() * 8, 10 + rng.random() * 8; gap = 2; h = 3.1 * rng.integers(6, 11) + 1
    elif zone == KIND_OFFICE:
        w, d = 30 + rng.random() * 25, 22 + rng.random() * 18; gap = 10; h = 30 + rng.random() * 70
    else:
        w, d = 22 + rng.random() * 10, 16 + rng.random() * 6; gap = 16; h = 3.0 * rng.integers(20, 34) + 3
        if rng.random() < 0.15: w, d, h = 60 + rng.random() * 30, 14 + rng.random() * 4, 3.0 * rng.integers(6, 12) + 2  # slab
    ca, sa = math.cos(ang), math.sin(ang)
    # test the rotated rectangle (plus gap) against occupied cells
    ok = True
    hw, hd = (w / 2 + gap) / PX, (d / 2 + gap) / PX
    for a in np.linspace(-hw, hw, 7):
        for b in np.linspace(-hd, hd, 7):
            qu = int(u + a * ca - b * sa); qv = int(v + a * sa + b * ca)
            if qu < 0 or qv < 0 or qu >= GW or qv >= GH or occ[qv, qu]: ok = False; break
        if not ok: break
    if not ok: continue
    corners = [(x + (sx * w / 2) * ca - (sz * d / 2) * sa, z + (sx * w / 2) * sa + (sz * d / 2) * ca) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    P = orient(Polygon(corners), 1.0)
    fill.append(dict(P=P, h=float(h), kind=zone, seed=float(rng.random() * 100), name="", osm=False))
    # mark it (with its gap) as taken
    m = int(max(w, d) / PX / 2 + gap / PX) + 1
    for a in range(-m, m + 1):
        for b in range(-m, m + 1):
            qu, qv = iu + a, iv + b
            if 0 <= qu < GW and 0 <= qv < GH:
                lx = (a * ca + b * sa) * PX; lz = (-a * sa + b * ca) * PX
                if abs(lx) <= w / 2 + gap and abs(lz) <= d / 2 + gap: occ[qv, qu] = True
print("fill buildings", len(fill))
allb = blds + fill

# ---------------- write ----------------
def write_bld(path, L):
    info, offs, pts = [], [0], []
    for b in L:
        ring = list(b["P"].exterior.coords)[:-1]
        if len(ring) < 3: continue
        c = b["P"].centroid
        info += [b["h"], b["kind"], b["seed"], 1.0 if b["osm"] else 0.0, c.x, c.y, b.get("base", 0.0)]
        for p in ring: pts += [p[0], p[1]]
        offs.append(len(pts) // 2)
    with open(path, "wb") as f:
        f.write(struct.pack("<II", len(offs) - 1, len(pts) // 2))
        f.write(np.array(info, np.float32).tobytes()); f.write(np.array(offs, np.uint32).tobytes()); f.write(np.array(pts, np.float32).tobytes())
    return len(offs) - 1  # info stride 7: height, kind, seed, osm, cx, cz, base
nb = write_bld(OUT + "bld.bin", allb)

def write_roads(path, L):
    info, offs, pts = [], [0], []
    for r in L:
        info += [r["c"], r["w"], 1.0 if r["oneway"] else 0.0, 1.0 if r["br"] else 0.0]
        for (x, z), y in zip(r["pts"], r["y"]): pts += [x, y, z]
        offs.append(len(pts) // 3)
    with open(path, "wb") as f:
        f.write(struct.pack("<II", len(offs) - 1, len(pts) // 3))
        f.write(np.array(info, np.float32).tobytes()); f.write(np.array(offs, np.uint32).tobytes()); f.write(np.array(pts, np.float32).tobytes())
core_roads = [r for r in roads if in_box(r["pts"], CORE, 300) and not r["tun"]]
write_roads(OUT + "roads.bin", core_roads)

# ground rasters: R street surface, G water, B green, A lamp glow — the core at ~1.8 m/px, the far plain at ~11 m/px
def ground(box, W, H, path, lamp_px):
    px = (box[2] - box[0]) / W
    ln = lambda cond, extra=0: [(r["pts"], r["w"] + extra) for r in roads if cond(r) and not r["tun"] and in_box(r["pts"], box, 50)]
    R = draw_mask(box, px, lines=ln(lambda r: r["c"] <= 7)).astype(np.float32)
    G = (draw_mask(box, px, polys=water) | draw_mask(box, px, lines=[(r, 40) for r in rivers]) | sea_mask(box, px)).astype(np.float32)
    B = draw_mask(box, px, polys=green).astype(np.float32)
    # lamp glow: street lights every ~30 m both sides; seen from above they pool into a warm band along every street
    Aim = draw_mask(box, px, lines=ln(lambda r: r["c"] <= 6, 6)).astype(np.float32)
    A = ndimage.gaussian_filter(Aim, max(0.8, lamp_px / px))
    A = np.clip(A / max(A.max(), 1e-6) * 1.4, 0, 1)
    R = ndimage.gaussian_filter(R, 0.6)
    img = np.stack([R, G * (1 - R * 0.0), B * (1 - G), A], -1)
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8), "RGBA").save(path, optimize=True)
ground(CORE, 8192, 4096, OUT + "ground.png", 3.0)
ground(FAR, 4096, 2560, OUT + "far.png", 10.0)

# landmarks and road names for framing the shots
marks = {}
for b in blds:
    if b["name"] and b["h"] > 150 and b.get("base", 0) < 1: marks[b["name"]] = [round(b["P"].centroid.x, 1), round(b["P"].centroid.y, 1), round(b["h"], 1)]
named = {}
for r in core_roads:
    if r["name"] and r["c"] <= 3:
        named.setdefault(r["name"], 0); named[r["name"]] += LineString(r["pts"]).length
json.dump(dict(core=CORE, far=FAR, origin=[LAT0, LON0], nb=nb, nr=len(core_roads), marks=marks,
               roads=sorted(named.items(), key=lambda kv: -kv[1])[:40]), open(OUT + "meta.json", "w"), ensure_ascii=False, indent=1)
print("wrote", nb, "buildings,", len(core_roads), "roads")
