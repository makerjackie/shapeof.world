"""Chains the NBS 70-city second-hand (and new) home MoM indices into price levels (Dec 2010 = 100),
then reports each city's peak month, drop from peak, and where it stands against Dec 2010.
MoM indices are published to one decimal, so chained levels are approximate (say "约")."""
import csv, sys, collections
col = {"used": "二手住宅价格指数-环比", "new": "新建商品住宅价格指数-环比"}[sys.argv[1] if len(sys.argv) > 1 else "used"]
rows = collections.defaultdict(dict)
for r in csv.DictReader(open("data/nbs70.csv", encoding="utf-8")):
    if r[col]:
        rows[r["城市"]][r["日期"][:7]] = float(r[col])
res = []
for city, m in rows.items():
    months = sorted(m)
    lvl, path = 100.0, [("2010-12", 100.0)]
    for k in months:
        lvl *= m[k] / 100; path.append((k, lvl))
    pk = max(path, key=lambda x: x[1]); now = path[-1]
    res.append((city, pk[0], round((now[1] / pk[1] - 1) * 100, 1), round(now[1], 1), len(months)))
res.sort(key=lambda x: x[2])
for r in res: print(*r, sep="\t")
d = sorted(r[2] for r in res); print("median drop", d[len(d)//2], "below 2010-12:", sum(r[3] < 100 for r in res))
# 70-city simple average level
avg = collections.defaultdict(list)
for city, m in rows.items():
    lvl = 100.0
    for k in sorted(m): lvl *= m[k]/100; avg[k].append(lvl)
s = {k: sum(v)/len(v) for k, v in avg.items() if len(v) == 70}
pk = max(s, key=s.get); last = max(s)
print("70-city avg peak", pk, round(s[pk],1), "now", last, round(s[last],1), "drop", round((s[last]/s[pk]-1)*100,1))
for k in ["2015-06","2017-01","2018-01","2019-01","2020-01","2021-08","2023-01","2024-01","2025-01","2026-01","2026-09"]: print(k, round(s.get(k,0),1))
