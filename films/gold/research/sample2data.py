# Data for the v4 look test: one price series (US$/oz) with OHLC on trading days, 元/克 on trading days,
# central-bank tonnes by country, the Fed balance sheet (weekly), and the land dots of the world map.
import csv, json, datetime as dt, sys, shutil
R = sys.argv[1]
G = json.load(open(f"{R}/src/g/gold_data.json"))
pts = []  # [year, close, kind(0 annual,1 monthly,2 daily), o, h, l, cny_g]
for y, v, k in G["series"]:
    if k == "a": pts.append([round(y, 4), v, 0, 0, 0, 0, 0])
    elif k == "m": pts.append([round(y, 4), v, 1, 0, 0, 0, 0])
    elif k in ("d", "p") and 1980.0 < y < 1980.1: pts.append([round(y, 5), v, 1, 0, 0, 0, 0])  # the 1980-01-21 London fix, 850
fx = {}
for r in csv.DictReader(open(f"{R}/research/fred_DEXCHUS.csv")):
    if r["DEXCHUS"] not in ("", "."): fx[r["observation_date"]] = float(r["DEXCHUS"])
fxd = sorted(fx); fi = 0; lastfx = None
d = json.load(open(f"{R}/research/yahoo_gc.json"))["chart"]["result"][0]
q = d["indicators"]["quote"][0]
first_daily = None
for t, o, h, l, c in zip(d["timestamp"], q["open"], q["high"], q["low"], q["close"]):
    if not c: continue
    day = dt.datetime.fromtimestamp(t, dt.timezone.utc).date()
    ds = day.isoformat()
    while fi < len(fxd) and fxd[fi] <= ds:
        lastfx = fx[fxd[fi]]; fi += 1
    y = day.year + (day.timetuple().tm_yday - 0.5) / (366 if day.year % 4 == 0 else 365)
    o = o or c; h = max(h or c, o, c); l = min(l or c, o, c)
    pts.append([round(y, 5), round(c, 2), 2, round(o, 2), round(h, 2), round(l, 2), round(c * lastfx / 31.1035, 2) if lastfx else 0])
    first_daily = first_daily or y
pts = [p for p in pts if not (p[2] == 1 and p[0] >= first_daily)]
pts.sort(key=lambda p: p[0])
walcl = []
for r in csv.DictReader(open(f"{R}/research/fred_WALCL.csv")):
    dd = dt.date.fromisoformat(r["observation_date"])
    walcl.append([round(dd.year + (dd.timetuple().tm_yday - 0.5) / 365.25, 4), round(float(r["WALCL"]) / 1e6, 3)])
m = json.load(open(sys.argv[2]))
out = {"p": pts, "res": G["reserves"], "walcl": walcl, "map": {k: m[k] for k in ("lon0", "lat0", "step", "cols", "rows", "i", "j", "w")}}
json.dump(out, open(f"{R}/src/g/sample2_data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(len(pts), pts[0], pts[-1])
