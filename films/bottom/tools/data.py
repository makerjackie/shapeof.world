"""Builds src/data.json from data/nbs70.csv (统计局 70 城二手住宅环比，连乘) and data/rent-yield-2026-09.tsv (中指，读图).
usage: python3 tools/data.py"""
import collections, csv, json
rows = collections.defaultdict(dict)
for r in csv.DictReader(open("data/nbs70.csv", encoding="utf-8")):
    v = r["二手住宅价格指数-环比"]
    if v:
        rows[r["城市"]][r["日期"][:7]] = (float(v), float(r["二手住宅价格指数-同比"] or 0))
lvl = {}
for c, m in rows.items():
    l, path = 100.0, {"2010-12": 100.0}
    for k in sorted(m):
        l *= m[k][0] / 100; path[k] = l
    lvl[c] = path
cities = []
for c, p in lvl.items():
    pk = max(p.values()); now = p["2026-09"]
    cities.append({"c": c, "drop": round((now / pk - 1) * 100, 1), "lv": round(now / 100, 3), "mom": rows[c]["2026-09"][0], "yoy": rows[c]["2026-09"][1]})
cities.sort(key=lambda x: x["drop"])
months = sorted(lvl["北京"])
avg = [sum(lvl[c][k] for c in lvl) / len(lvl) for k in months]
yields = [(l.split()[0], float(l.split()[1])) for l in open("data/rent-yield-2026-09.tsv", encoding="utf-8") if l.strip() and not l.startswith("#")]
series = {c: [round(lvl[c][k] / 100, 3) for k in months] for c in ["哈尔滨", "深圳"]}
json.dump({"months": months, "avg": [round(a, 2) for a in avg], "cities": cities, "yields": [{"c": c, "y": y, "mom": rows[c]["2026-09"][0] if c in rows else None} for c, y in yields], "series": series},
          open("src/data.json", "w", encoding="utf-8"), ensure_ascii=False)
print(len(cities), "cities;", sum(x["lv"] < 1 for x in cities), "below 2010-12; avg now", round(avg[-1], 1), "peak", round(max(avg), 1))

# v4: monthly levels for every city from the 2021-07 peak (the opening), and years of rent for the 50 cities.
m0 = months.index("2021-07")
hook = [{"c": c, "lv": [round(lvl[c][k] / 100, 3) for k in months[m0:]]} for c in lvl]
hook.sort(key=lambda x: x["lv"][-1])
json.dump({"months": months[m0:], "avg": [round(a / 100, 4) for a in avg[m0:]], "cities": hook,
           "years": sorted([{"c": c, "yrs": round(100 / y, 1), "mom": rows[c]["2026-09"][0] if c in rows else None} for c, y in yields], key=lambda x: x["yrs"])},
          open("src/data2.json", "w", encoding="utf-8"), ensure_ascii=False)
