"""Builds src/g/gold_data.json for 金价两百年 from the raw files in research/ (all fetched 2026-11-04):

- mw_gold.tsv        MeasuringWorth, "The Price of Gold, 1257-Present" (Officer & Williamson): New York market price,
                     US$ per fine ounce, annual average, 1791-  -> the line 1792-1967
- datahub_gold.csv   London gold price, US$ per ounce, monthly average (Deutsche Bundesbank series, London fixing;
                     datasets/gold-prices) -> the line 1968-01 .. 2000-07
- yahoo_gc.json      COMEX gold futures (front month), daily settlement, 2000-08-30 .. 2026-11-04 -> the line from 2000-08
- fred_CPIAUCNS.csv  US CPI-U, BLS (via FRED), monthly from 1913 -> real-price checks
- fred_DEXCHUS.csv   yuan per US$, Federal Reserve H.10 (via FRED), daily from 1981 -> 元/克 from 2002
- ifs_gold_annual.json  IMF International Financial Statistics, official gold, million fine troy ounces, year end (via DBnomics)

One daily point is added to the monthly stretch: the London PM fix of 21 January 1980, US$850 (the 1980 record).
Usage: python research/golddata.py
"""
import csv, json, math, datetime, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = os.path.join(ROOT, "research")
OZ_G = 31.1034768  # grams per troy ounce


def yfrac(d: datetime.date) -> float:
    a = datetime.date(d.year, 1, 1)
    b = datetime.date(d.year + 1, 1, 1)
    return d.year + (d - a).days / (b - a).days


# ---------- 1792-1967: MeasuringWorth New York market price (annual average, plotted mid-year)
mw = {}
for row in csv.reader(open(os.path.join(R, "mw_gold.tsv"), encoding="latin-1"), delimiter="\t"):
    if row and row[0].isdigit() and len(row) >= 4 and row[3].strip():
        mw[int(row[0])] = float(row[3].replace(",", ""))
series = [(y + 0.5, mw[y], "a") for y in range(1792, 1968)]

# ---------- 1968-01 .. 2000-07: London monthly averages
for d, p in list(csv.reader(open(os.path.join(R, "datahub_gold.csv"))))[1:]:
    y, m = int(d[:4]), int(d[5:7])
    if (1968, 1) <= (y, m) <= (2000, 7):
        series.append((y + (m - 0.5) / 12, float(p), "m"))
series.append((yfrac(datetime.date(1980, 1, 21)), 850.0, "d"))  # LBMA PM fix, the 1980 record

# ---------- 2000-08-30 ..: COMEX daily settlement
j = json.load(open(os.path.join(R, "yahoo_gc.json")))["chart"]["result"][0]
for ts, c in zip(j["timestamp"], j["indicators"]["quote"][0]["close"]):
    if c:
        d = datetime.datetime.fromtimestamp(ts, datetime.UTC).date()
        series.append((yfrac(d), round(c, 2), "d"))
series.sort()

# ---------- swing points (zigzag): the turns that get a % tick and a dot on the chart
def zigzag(pts, th):
    # alternate highs and lows; a turn counts once the price has moved th away from the running extreme
    out = [0]
    up = True
    ext = 0
    for i in range(1, len(pts)):
        v, e = pts[i][1], pts[ext][1]
        if up:
            if v > e:
                ext = i
            elif v <= e * (1 - th):
                out.append(ext); up = False; ext = i
        else:
            if v < e:
                ext = i
            elif v >= e * (1 + th):
                out.append(ext); up = True; ext = i
    out.append(len(pts) - 1)
    return out

piv = set(zigzag(series, 0.22))
# the fixed-price era: mark every legal step instead (19.39 -> 20.67 -> 35) and the Civil War top
for y in (1792.5, 1864.5, 1879.5, 1934.5):
    piv.add(min(range(len(series)), key=lambda i: abs(series[i][0] - y)))

S = [[round(y, 5), round(v, 2), ("p" if i in piv else k)] for i, (y, v, k) in enumerate(series)]

# ---------- CPI (monthly) and yuan per dollar (monthly average) from 2002
cpi = [[int(d[:4]) + (int(d[5:7]) - 0.5) / 12, float(v)] for d, v in list(csv.reader(open(os.path.join(R, "fred_CPIAUCNS.csv"))))[1:] if v not in ("", ".")]
fx = {}
for d, v in list(csv.reader(open(os.path.join(R, "fred_DEXCHUS.csv"))))[1:]:
    if v not in ("", ".") and d >= "2002-01":
        fx.setdefault(d[:7], []).append(float(v))
cny = [[int(k[:4]) + (int(k[5:7]) - 0.5) / 12, round(sum(v) / len(v), 4)] for k, v in sorted(fx.items())]

# ---------- official gold (tonnes, year end) from IMF IFS; 2025-26 from the central banks' own releases (see SOURCES.md)
ifs = json.load(open(os.path.join(R, "ifs_gold_annual.json")))
KEEP = {"US": "美国", "DE": "德国", "FR": "法国", "IT": "意大利", "CH": "瑞士", "GB": "英国", "NL": "荷兰", "BE": "比利时",
        "CN": "中国", "RU": "俄罗斯", "JP": "日本", "IN": "印度", "CA": "加拿大", "PT": "葡萄牙", "VE": "委内瑞拉",
        "TR": "土耳其", "PL": "波兰", "ES": "西班牙", "AT": "奥地利", "BR": "巴西", "ZA": "南非", "SA": "沙特", "TW": "中国台湾",
        "LB": "黎巴嫩", "KZ": "哈萨克斯坦", "UZ": "乌兹别克斯坦"}
res = {}
for s in ifs:
    c = s["code"].split(".")[1]
    if c not in KEEP:
        continue
    pts = [[int(p) + 0.99, round(float(v) * OZ_G, 1)] for p, v in zip(s["p"], s["v"]) if v not in (None, "NA") and float(v) > 0]
    if pts:
        res[c] = pts
# after the last IFS year: the banks' own figures (tonnes) -- research/SOURCES.md
EXTRA = {
    "CN": [[2025.99, 2306.0], [2026.75, 2410.0]],  # WGC GDT FY2025 (2,306t); PBOC Sep 2026 77.47 Moz
    "RU": [[2025.99, 2317.0], [2026.3, 2299.0]],   # Bank of Russia 74.5 Moz; Apr 2026 73.9 Moz (TASS)
    "PL": [[2025.99, 550.0]],                       # WGC GDT FY2025
}
for c, pts in EXTRA.items():
    res.setdefault(c, [])
    last = res[c][-1][0] if res[c] else 0
    res[c] += [p for p in pts if p[0] > last]
# the others hold flat after their last IFS year to the end of the film
for c, pts in res.items():
    if pts[-1][0] < 2026.8:
        pts.append([2026.85, pts[-1][1]])

out = {"series": S, "cpi": cpi, "cny": cny, "reserves": {KEEP[c]: v for c, v in res.items()}}
json.dump(out, open(os.path.join(ROOT, "src", "g", "gold_data.json"), "w"), separators=(",", ":"), ensure_ascii=False)

# ---------- report
def at(y):
    return min(series, key=lambda p: abs(p[0] - y))
print("points", len(S), "pivots", len(piv), S[0], S[-1])
print("pivots:", [(round(series[i][0], 2), series[i][1]) for i in sorted(piv)])
def cpi_at(y):
    return min(cpi, key=lambda p: abs(p[0] - y))[1]
c80 = cpi_at(1980.05); cnow = cpi[-1][1]
print("CPI 1980-01", c80, "latest", cpi[-1], "-> $850 then = $%.0f now" % (850 * cnow / c80))
# when did the price pass 850 in real terms (CPI to date)
for y, v, k in series:
    if y > 2000 and v * 1 > 850 * cpi_at(min(y, cpi[-1][0])) / c80:
        print("real 1980 record passed", round(y, 3), v); break
print("1913 dollar now worth", round(cpi_at(1913.5) / cnow, 4))
mx = max(series, key=lambda p: p[1]); print("max", mx)
for a, b in ((1971.6, 1980.05), (1980.05, 1999.6), (1999.6, 2011.7), (2011.7, 2015.95), (2015.95, 2020.6), (2020.6, 2026.08), (2026.08, 2026.84)):
    va, vb = at(a)[1], at(b)[1]
    print(f"{a}->{b}: {va} -> {vb} = {vb/va-1:+.1%}")
yrs = {}
for y, v, k in series:
    yrs.setdefault(int(y), []).append(v)
for y in (1979, 1980, 2013, 2024, 2025):
    print(y, "first", yrs[y][0], "last", yrs[y][-1], f"{yrs[y][-1]/yrs[y-1][-1]-1:+.1%} vs prior year end")
print("cny latest", cny[-1], "price*fx/oz:", round(series[-1][1] * cny[-1][1] / OZ_G, 1), "yuan/g")
for y in (1950.99, 1965.99, 1971.99, 2024.99):
    r = sorted(((max([p for p in v if p[0] <= y + 0.001] or [[0, 0]], key=lambda p: p[0])[1], n) for n, v in out["reserves"].items()), reverse=True)[:7]
    print(int(y), r)
