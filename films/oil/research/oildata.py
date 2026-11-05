# 油价一百六十年: the price line (US$ per barrel), daily OHLC, 元 per US$, gold per ounce on the same days, and the
# world's oil output by country (share of the world) -> src/o/oil_data.json, src/o/oil_ohlc.json
#   1859-1945  US crude oil first purchase price, annual (EIA)
#   1946-01 .. 2000-08  WTI monthly (posted price to 1982, then spot; FRED WTISPLC)
#   2000-08-23 on  NYMEX WTI front-month futures, daily close and OHLC (Yahoo CL=F)
#   output shares: Energy Institute Statistical Review via Our World in Data (oil_production, 1900-2024)
import csv, json, sys, datetime as dt
R = sys.argv[1]
RS = f"{R}/research"

def yfrac(d):
    n = 366 if (d.year % 4 == 0 and (d.year % 100 != 0 or d.year % 400 == 0)) else 365
    return round(d.year + (d.timetuple().tm_yday - 1) / n, 5)

ser = []  # [y, v, kind]
for line in open(f"{RS}/eia_fpp_annual.csv"):
    y, v = line.strip().split(",")
    y = int(y)
    if y <= 1945:
        ser.append([y + 0.5, float(v), "a"])
for r in csv.DictReader(open(f"{RS}/fred_WTISPLC.csv")):
    d = dt.date.fromisoformat(r["observation_date"])
    if d < dt.date(2000, 8, 1):
        ser.append([round(yfrac(d) + 15 / 365, 5), float(r["WTISPLC"]), "m"])
d = json.load(open(f"{RS}/yahoo_cl.json"))["chart"]["result"][0]
q = d["indicators"]["quote"][0]
ohlc = []
seen = set()
for t, o, h, l, c in zip(d["timestamp"], q["open"], q["high"], q["low"], q["close"]):
    if c is None:
        continue
    day = dt.datetime.fromtimestamp(t, dt.timezone.utc).date()
    if day >= dt.date(2026, 11, 5):
        continue  # today's session is not closed yet
    if day in seen:
        continue
    seen.add(day)
    o = o if o is not None else c
    h = max(h if h is not None else c, o, c)
    l = min(l if l is not None else c, o, c)
    y = yfrac(day)
    ser.append([y, round(c, 2), "d"])
    ohlc.append([y, round(o, 2), round(h, 2), round(l, 2), round(c, 2)])
ser.sort(key=lambda p: p[0])
# the last row can be today's unfinished session: keep it only if the user wants "now" (it is the latest quote)
print("series", len(ser), ser[0], ser[-3:])

# gold (US$/oz) on the same points, from the gold film's line
G = json.load(open(f"{R}/src/o/gold_data.json"))["series"]
gy = [p[0] for p in G]
gv = [p[1] for p in G]
def gold(y):
    import bisect
    i = bisect.bisect_right(gy, y)
    if i <= 0: return gv[0]
    if i >= len(gy): return gv[-1]
    a, b = gy[i - 1], gy[i]
    return gv[i - 1] + (gv[i] - gv[i - 1]) * (y - a) / (b - a)
gold_pts = [round(gold(p[0]), 2) for p in ser]

# 元 per US$ (monthly mean of the daily fixings)
fx = {}
for r in csv.DictReader(open(f"{RS}/fred_DEXCHUS.csv")):
    if r["DEXCHUS"] not in ("", "."):
        k = r["observation_date"][:7]
        fx.setdefault(k, []).append(float(r["DEXCHUS"]))
cny = [[round(yfrac(dt.date.fromisoformat(k + "-15")), 4), round(sum(v) / len(v), 4)] for k, v in sorted(fx.items())]

# output shares by producer (USSR before 1992 and Russia after are one row)
NAME = {"United States": "美国", "USSR": "苏联", "Russia": "俄罗斯", "Saudi Arabia": "沙特", "Iran": "伊朗", "Iraq": "伊拉克",
        "Venezuela": "委内瑞拉", "Mexico": "墨西哥", "Kuwait": "科威特", "United Arab Emirates": "阿联酋", "Canada": "加拿大",
        "China": "中国", "Norway": "挪威", "United Kingdom": "英国", "Romania": "罗马尼亚", "Indonesia": "印尼", "Nigeria": "尼日利亚",
        "Libya": "利比亚", "Brazil": "巴西", "Kazakhstan": "哈萨克斯坦", "Qatar": "卡塔尔", "Algeria": "阿尔及利亚", "Angola": "安哥拉",
        "Trinidad and Tobago": "特立尼达", "Argentina": "阿根廷", "Colombia": "哥伦比亚", "Egypt": "埃及", "Oman": "阿曼"}
prod = {}
world = {}
for r in csv.DictReader(open(f"{RS}/owid_oil.csv")):
    if not r["oil_production"]:
        continue
    y = int(r["year"]); v = float(r["oil_production"])
    if r["country"] == "World":
        world[y] = v
    elif r["country"] in NAME:
        n = NAME[r["country"]]
        if n in ("苏联", "俄罗斯"):
            if (r["country"] == "USSR" and y > 1991) or (r["country"] == "Russia" and y <= 1991):
                continue
            n = "俄罗斯"
        prod.setdefault(n, {})[y] = prod.get(n, {}).get(y, 0) + v
shares = {n: [[y + 0.5, round(100 * v / world[y], 2)] for y, v in sorted(p.items()) if y in world and world[y] > 0] for n, p in prod.items()}
for y in (1900, 1920, 1950, 1970, 1975, 1985, 2000, 2010, 2024):
    top = sorted(((n, dict((int(a), b) for a, b in s).get(y, 0)) for n, s in shares.items()), key=lambda x: -x[1])[:6]
    print(y, top)
json.dump({"series": ser, "gold": gold_pts, "cny": cny, "shares": shares}, open(f"{R}/src/o/oil_data.json", "w"), ensure_ascii=False, separators=(",", ":"))
json.dump(ohlc, open(f"{R}/src/o/oil_ohlc.json", "w"), separators=(",", ":"))

# facts to check against the cards
def at(y0, y1):
    return [p for p in ser if y0 <= p[0] <= y1]
def fmt(p):
    return f"{p[0]:.4f}:{p[1]}"
print("1859-1865", [fmt(p) for p in at(1859, 1866)])
print("1870-1912 min/max", min(at(1870, 1912), key=lambda p: p[1]), max(at(1870, 1912), key=lambda p: p[1]))
print("1926-1935", [fmt(p) for p in at(1926, 1936)])
print("2008 first close >=100", next(fmt(p) for p in ser if p[0] > 2007.9 and p[1] >= 100))
for a, b in [(1991.03, 1991.06)]:
    print("1991-01", [fmt(p) for p in at(a, b)])
rows = {str(dt.date(int(o[0]), 1, 1) + dt.timedelta(days=round((o[0] % 1) * (366 if int(o[0]) % 4 == 0 else 365)))): o for o in ohlc}
def day(s):
    return rows.get(s)
for s in ["2020-03-06", "2020-03-09", "2022-02-23", "2022-03-08", "2026-02-27", "2026-03-06", "2026-04-07", "2026-04-08", "2026-04-17", "2026-06-24", "2026-11-03", "2026-11-04", "2016-02-11", "2014-11-26", "2014-11-28", "2008-07-03", "2008-12-19", "2025-12-16", "2014-06-20"]:
    print(s, day(s))
# gold per barrel ratios
rat = [(p[0], g / p[1]) for p, g in zip(ser, gold_pts) if p[1] > 0]
print("ratio min", min(rat, key=lambda r: r[1]), "max(excl 2020-04)", max([r for r in rat if not (2020.2 < r[0] < 2020.4)], key=lambda r: r[1]))
for y in (1861.5, 1864.5, 1900.5, 1931.5, 1950.5, 1970.5, 1974.5, 1980.3, 1986.5, 1998.9, 2008.5, 2016.1, 2026.08, 2026.27, 2026.84):
    r = min(rat, key=lambda r: abs(r[0] - y)); print("ratio", y, round(r[1], 1))
