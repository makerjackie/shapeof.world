"""Builds src/data.json for the population film.

China (万人):
  year-end population  中国统计年鉴 2024 表 2-1 (1949-2023, revised after the 2020 census); years the table skips
                       (1952-54, 1956-59, 1961-64, 1966-69) are rebuilt from the yearbook's average population
                       (E[t] = 2*avg[t] - E[t-1]), which lands exactly on every year the table does list.
  births / deaths      1949-1977: crude rate x average population (rates from the NBS series, as tabulated in
                       Wikipedia "Demographics of China"); 1978-2023: 中国统计年鉴 2024 表 2-2 rates x average
                       of the year-end populations (the NBS method); 2024, 2025: NBS 统计公报 counts.
World: UN World Population Prospects 2024 via Our World in Data (estimates to 2023, medium variant after).

usage: python3 tools/data.py
"""
import csv, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 表 2-1 year-end population (万)
E = {1949: 54167, 1950: 55196, 1951: 56300, 1955: 61465, 1960: 66207, 1965: 72538, 1970: 82992, 1971: 85229,
     1972: 87177, 1973: 89211, 1974: 90859, 1975: 92420, 1976: 93717, 1977: 94974, 1978: 96259, 1979: 97542,
     1980: 98705, 1981: 100072, 1982: 101654, 1983: 103008, 1984: 104357, 1985: 105851, 1986: 107507,
     1987: 109300, 1988: 111026, 1989: 112704, 1990: 114333, 1991: 115823, 1992: 117171, 1993: 118517,
     1994: 119850, 1995: 121121, 1996: 122389, 1997: 123626, 1998: 124761, 1999: 125786, 2000: 126743,
     2001: 127627, 2002: 128453, 2003: 129227, 2004: 129988, 2005: 130756, 2006: 131448, 2007: 132129,
     2008: 132802, 2009: 133450, 2010: 134091, 2011: 134916, 2012: 135922, 2013: 136726, 2014: 137646,
     2015: 138326, 2016: 139232, 2017: 140011, 2018: 140541, 2019: 141008, 2020: 141212, 2021: 141260,
     2022: 141175, 2023: 140967,
     2024: 140828, 2025: 140489}  # 2024, 2025: 统计公报
# Average population (万) for the gap years, from the NBS series (Wikipedia table, "Year end population" column
# is the yearly average for these years).
AVG = {1952: 56891, 1953: 58139, 1954: 59531, 1955: 60865.5, 1956: 62146.5, 1957: 63740.5, 1958: 65323.5,
       1959: 66600.5, 1960: 66707, 1961: 66033, 1962: 66577, 1963: 68233.5, 1964: 69835.5, 1965: 71518.5,
       1966: 73540, 1967: 75455, 1968: 77451, 1969: 79602.5, 1970: 81831.5}
for y in range(1952, 1971):
    if y not in E:
        E[y] = round(2 * AVG[y] - E[y - 1])
    else:
        calc = 2 * AVG[y] - E[y - 1]
        assert abs(calc - E[y]) <= 1, (y, calc, E[y])

# births / deaths (万) 1949-1977 (Wikipedia NBS table, = rate x average population)
BD = {1949: (1934.5, 1074.7), 1950: (2023.2, 984.3), 1951: (2107.3, 992.3), 1952: (2105.0, 967.1),
      1953: (2151.1, 813.9), 1954: (2260.4, 784.6), 1955: (1984.2, 747.4), 1956: (1982.5, 708.5),
      1957: (2169.1, 688.4), 1958: (1908.8, 782.6), 1959: (1650.4, 971.7), 1960: (1391.5, 1696.4),
      1961: (1189.9, 940.3), 1962: (2464.0, 667.1), 1963: (2959.3, 685.1), 1964: (2733.4, 803.1),
      1965: (2709.1, 679.4), 1966: (2577.6, 649.4), 1967: (2562.5, 636.1), 1968: (2756.5, 635.9),
      1969: (2715.2, 639.2), 1970: (2735.6, 621.9), 1971: (2578.0, 615.7), 1972: (2566.3, 656.0),
      1973: (2463.3, 620.9), 1974: (2234.7, 660.9), 1975: (2108.6, 670.8), 1976: (1853.0, 674.7),
      1977: (1786.0, 648.2)}
# 表 2-2 rates (‰) 1978-2023
R = {1978: (18.25, 6.25), 1979: (17.82, 6.21), 1980: (18.21, 6.34), 1981: (20.91, 6.36), 1982: (22.28, 6.60),
     1983: (20.19, 6.90), 1984: (19.90, 6.82), 1985: (21.04, 6.78), 1986: (22.43, 6.86), 1987: (23.33, 6.72),
     1988: (22.37, 6.64), 1989: (21.58, 6.54), 1990: (21.06, 6.67), 1991: (19.68, 6.70), 1992: (18.24, 6.64),
     1993: (18.09, 6.64), 1994: (17.70, 6.49), 1995: (17.12, 6.57), 1996: (16.98, 6.56), 1997: (16.57, 6.51),
     1998: (15.64, 6.50), 1999: (14.64, 6.46), 2000: (14.03, 6.45), 2001: (13.38, 6.43), 2002: (12.86, 6.41),
     2003: (12.41, 6.40), 2004: (12.29, 6.42), 2005: (12.40, 6.51), 2006: (12.09, 6.81), 2007: (12.10, 6.93),
     2008: (12.14, 7.06), 2009: (11.95, 7.08), 2010: (11.90, 7.11), 2011: (13.27, 7.14), 2012: (14.57, 7.13),
     2013: (13.03, 7.13), 2014: (13.83, 7.12), 2015: (11.99, 7.07), 2016: (13.57, 7.04), 2017: (12.64, 7.06),
     2018: (10.86, 7.08), 2019: (10.41, 7.09), 2020: (8.52, 7.07), 2021: (7.52, 7.18), 2022: (6.77, 7.37),
     2023: (6.39, 7.87)}
for y, (b, d) in R.items():
    avg = (E[y - 1] + E[y]) / 2
    BD[y] = (round(b * avg / 1000, 1), round(d * avg / 1000, 1))
BD[2024] = (954.0, 1093.0)
BD[2025] = (792.0, 1131.0)
# the bulletins' own rounded counts for the years the film quotes
CHECK = {2016: 1883, 2020: 1202, 2021: 1062, 2022: 956, 2023: 902, 1987: 2529, 1963: 2959}
for y, v in CHECK.items():
    assert abs(BD[y][0] - v) < 1.5, (y, BD[y][0], v)

china = [{"y": y, "pop": E[y], "b": BD[y][0], "d": BD[y][1]} for y in range(1949, 2026)]

# ---- world (UN WPP 2024 via OWID)
ZH = {"China": "中国", "India": "印度", "United States": "美国", "Russia": "俄罗斯", "Japan": "日本",
      "Indonesia": "印度尼西亚", "Brazil": "巴西", "Pakistan": "巴基斯坦", "Nigeria": "尼日利亚",
      "Bangladesh": "孟加拉国", "Germany": "德国", "Democratic Republic of Congo": "刚果（金）",
      "Ethiopia": "埃塞俄比亚", "Mexico": "墨西哥", "Philippines": "菲律宾", "Egypt": "埃及", "Tanzania": "坦桑尼亚",
      "United Kingdom": "英国", "Italy": "意大利", "France": "法国", "Vietnam": "越南", "Ukraine": "乌克兰",
      "Niger": "尼日尔", "Iran": "伊朗", "Turkey": "土耳其", "Uganda": "乌干达", "Sudan": "苏丹", "Angola": "安哥拉"}
rows = {}
with open(os.path.join(ROOT, "data", "owid_proj.csv")) as f:
    for r in csv.DictReader(f):
        if len(r["code"]) != 3 or r["code"].startswith("OWID") or "(" in r["entity"]:
            continue
        v = r["population__sex_all__age_all__variant_estimates"] or r["population__sex_all__age_all__variant_medium__projected"]
        if not v:
            continue
        rows.setdefault(int(r["year"]), []).append((r["entity"], float(v)))
world = {}
for y in range(1950, 2101):
    top = sorted(rows[y], key=lambda x: -x[1])[:12]
    for n, _ in top[:10]:
        assert n in ZH, n
    world[y] = [[ZH.get(n, n), round(v / 1e8, 4)] for n, v in top]
worldTotal = {}
with open(os.path.join(ROOT, "data", "owid_proj.csv")) as f:
    for r in csv.DictReader(f):
        if r["entity"] == "World":
            v = r["population__sex_all__age_all__variant_estimates"] or r["population__sex_all__age_all__variant_medium__projected"]
            worldTotal[int(r["year"])] = round(float(v) / 1e8, 3)
chinaUN = {y: dict(world[y]).get("中国") for y in range(1950, 2101)}

out = {"china": china, "world": {str(k): v[:10] for k, v in world.items()},
       "worldTotal": {str(k): v for k, v in worldTotal.items() if k in (1950, 2025, 2100)},
       "chinaUN": {str(y): chinaUN[y] for y in range(2025, 2101)}}
json.dump(out, open(os.path.join(ROOT, "src", "data.json"), "w"), ensure_ascii=False, separators=(",", ":"))

# report
for y in (1949, 1957, 1959, 1960, 1961, 1962, 1963, 1969, 1974, 1981, 1987, 1988, 1995, 2000, 2005, 2016, 2017, 2020, 2021, 2022, 2023, 2024, 2025):
    print(y, E[y], BD[y])
for y in (2020, 2021, 2022, 2023, 2024, 2025):
    print("world", y, world[y][:3])
print("India passes China:", next(y for y in range(1950, 2101) if world[y][0][0] == "印度"))
print("UN China", {y: chinaUN[y] for y in (2025, 2050, 2075, 2100)})
print("first UN year China < 6.4亿:", next(y for y in range(2025, 2101) if chinaUN[y] < 6.4))
print("2100 top10", world[2100][:10])
print("2025 top10", world[2025][:10])
print("world total", out["worldTotal"])
print("max births", max(china, key=lambda r: r["b"]))
