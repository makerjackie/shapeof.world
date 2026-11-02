"""World population ranking for the panel (China excluded; the film uses its own China series).
1740-1949: OWID long-run (HYDE 3.3 decadal to 1800, Gapminder annual after). 1950-2100: UN WPP 2024 (src/data.json).
Output src/v3/world_top.json: {year: [[name, 万], ...top 6]} for every year 1740..2100."""
import csv, json, os
ROOT = os.path.join(os.path.dirname(__file__), "..")
ZH = {"India": "印度", "United States": "美国", "Russia": "俄罗斯", "Japan": "日本", "Indonesia": "印度尼西亚", "Brazil": "巴西",
      "Pakistan": "巴基斯坦", "Nigeria": "尼日利亚", "Bangladesh": "孟加拉国", "Germany": "德国", "France": "法国", "United Kingdom": "英国",
      "Italy": "意大利", "Turkey": "土耳其", "Mexico": "墨西哥", "Ukraine": "乌克兰", "Spain": "西班牙", "Vietnam": "越南", "Egypt": "埃及",
      "Iran": "伊朗", "Philippines": "菲律宾", "Ethiopia": "埃塞俄比亚", "Democratic Republic of Congo": "刚果（金）", "Poland": "波兰",
      "Thailand": "泰国", "Myanmar": "缅甸", "South Korea": "韩国", "Tanzania": "坦桑尼亚", "Niger": "尼日尔", "Uganda": "乌干达", "Sudan": "苏丹", "Angola": "安哥拉"}
rows = {}
for r in csv.DictReader(open(os.path.join(ROOT, "data", "owid_longrun.csv"))):
    y = int(r["year"])
    if 1700 <= y <= 1949 and r["entity"] in ZH:
        rows.setdefault(r["entity"], {})[y] = float(r["population_historical"]) / 1e4
def interp(d, y):
    ks = sorted(d)
    if y <= ks[0]: return d[ks[0]]
    if y >= ks[-1]: return d[ks[-1]]
    for a, b in zip(ks, ks[1:]):
        if a <= y <= b:
            return d[a] + (d[b] - d[a]) * (y - a) / (b - a)
out = {}
for y in range(1740, 1950):
    vals = [(ZH[n], round(interp(d, y))) for n, d in rows.items()]
    out[y] = sorted(vals, key=lambda x: -x[1])[:6]
W = json.load(open(os.path.join(ROOT, "src", "data.json")))["world"]
for y in range(1950, 2101):
    out[y] = [[n, round(v * 10000)] for n, v in W[str(y)] if n != "中国"][:6]
json.dump(out, open(os.path.join(ROOT, "src", "v3", "world_top.json"), "w"), ensure_ascii=False, separators=(",", ":"))
print(out[1740][:3], out[1851][:3], out[1949][:3], out[2100][:3])
