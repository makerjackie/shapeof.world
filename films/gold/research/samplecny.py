# Daily gold in 元/克 (COMEX front-month close x Fed H.10 CNY/USD, carried forward over gaps) / 31.1035, 2002 on.
import csv, json, datetime as dt, sys
R = sys.argv[1]
fx = {}
for r in csv.DictReader(open(f"{R}/research/fred_DEXCHUS.csv")):
    if r["DEXCHUS"] not in ("", "."): fx[r["observation_date"]] = float(r["DEXCHUS"])
d = json.load(open(f"{R}/research/yahoo_gc.json"))["chart"]["result"][0]
ts, cl = d["timestamp"], d["indicators"]["quote"][0]["close"]
rows, last_fx = [], None
fxd = sorted(fx)
i = 0
for t, c in zip(ts, cl):
    if c is None: continue
    day = dt.datetime.utcfromtimestamp(t).date()
    ds = day.isoformat()
    while i < len(fxd) and fxd[i] <= ds:
        last_fx = fx[fxd[i]]; i += 1
    if day < dt.date(2002, 1, 1) or last_fx is None: continue
    y = day.year + (day.timetuple().tm_yday - 0.5) / (366 if day.year % 4 == 0 else 365)
    rows.append([round(y, 5), round(c * last_fx / 31.1035, 2), round(c, 1), ds])
json.dump({"d": [r[:3] for r in rows]}, open(f"{R}/src/g/sample_data.json", "w"), separators=(",", ":"))
print(len(rows), rows[0], rows[-1])
y2002 = [r[1] for r in rows if r[3].startswith("2002")]; print("2002 avg", round(sum(y2002)/len(y2002), 1), "min", min(y2002), "max", max(y2002))
pk = max(rows, key=lambda r: r[1]); print("peak", pk)
first1000 = next(r for r in rows if r[1] >= 1000); print("first >=1000", first1000)
for a, b in zip(rows, rows[1:]):
    ch = b[1] / a[1] - 1
    if abs(ch) > 0.07: print("big day", b[3], round(ch * 100, 1), a[1], "->", b[1])
for ds in ("2024-01-02", "2024-03-04", "2025-04-02", "2025-04-21", "2025-04-22", "2025-10-07", "2026-01-29", "2026-01-30", "2026-02-27", "2026-03-20", "2026-11-03", "2026-11-04"):
    r = next((r for r in rows if r[3] >= ds), None); print(ds, r)
first500 = next(r for r in rows if r[1] >= 500); print("first >=500", first500)
