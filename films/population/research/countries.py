# Build src/v6/world_countries.json: population by country (today's borders) for the top-right table of the World film.
# Sources: Maddison Project Database 2020 (years 1, 1000, 1500, 1600), HYDE 3.3 (1700-1790) and Gapminder (1800-1949)
# via Our World in Data, UN World Population Prospects 2024 (1950-2023 estimates, 2024-2100 medium projection).
# Downloads (research/data/, not committed): ourworldindata.org/grapher/population.csv and population-with-un-projections.csv
# (csvType=full), rug.nl/ggdc/historicaldevelopment/maddison/data/mpd2020.xlsx (sheet "Full data" -> mpd2020_full.csv).
# China (to 1949) uses the same series as the China film (src/v6/china7.ts): records "rec", scholars' estimates "est".
import csv, collections, json, sys
D = "research/data/"
mad = collections.defaultdict(dict)
for r in csv.DictReader(open(D + "mpd2020_full.csv")):
    if r["pop"] and int(r["year"]) in (1, 1000, 1500, 1600):
        mad[r["country"]][int(r["year"])] = float(r["pop"]) * 1000
hist = collections.defaultdict(dict)
for r in csv.DictReader(open(D + "owid_population.csv")):
    if r["code"] and not r["code"].startswith("OWID"):
        hist[r["entity"]][int(r["year"])] = float(r["population_historical"])
un = collections.defaultdict(dict)
for r in csv.DictReader(open(D + "owid_pop_proj.csv")):
    if not r["code"] or r["code"].startswith("OWID"):
        continue
    v = r["population__sex_all__age_all__variant_estimates"] or r["population__sex_all__age_all__variant_medium__projected"]
    if v:
        un[r["entity"]][int(r["year"])] = float(v)
MAD_NAME = {"Iran": "Iran (Islamic Republic of)"}
CHINA = [(2, 5959.4, "rec"), (57, 2100.8, "rec"), (75, 3412.5, "rec"), (88, 4335.6, "rec"), (105, 5325.6, "rec"), (125, 4869.1, "rec"),
         (140, 4915.0, "rec"), (144, 4973.1, "rec"), (146, 4756.7, "rec"), (157, 5648.7, "rec"), (263, 766.7, "rec"), (280, 1616.4, "rec"),
         (609, 4602.0, "rec"), (639, 1235.2, "rec"), (705, 3714.0, "rec"), (726, 4142.0, "rec"), (732, 4543.1, "rec"), (740, 4814.4, "rec"),
         (742, 4891.0, "rec"), (755, 5291.9, "rec"), (760, 1699.4, "rec"), (764, 1690.0, "rec"), (820, 1576.0, "rec"), (980, 3250.0, "est"),
         (1110, 12500.0, "est"), (1290, 7500.0, "est"), (1393, 6054.6, "rec"), (1630, 19250.0, "est"), (1644, 15250.0, "est"), (1682, 13000.0, "est"),
         (1741, 14341.2, "rec"), (1751, 18181.0, "rec"), (1764, 20550.0, "rec"), (1790, 30148.7, "rec"), (1805, 33218.1, "rec"), (1812, 36169.5, "rec"),
         (1820, 38310.0, "rec"), (1834, 40100.9, "rec"), (1844, 41281.5, "rec"), (1851, 43216.4, "rec"), (1880, 36450.0, "est"), (1912, 41164.0, "est")]
def series(c):
    if c == "China":
        pts = [[y, v, k] for y, v, k in CHINA]
        pts += [[y, round(hist[c][y] / 1e4, 1), "est"] for y in range(1920, 1950, 10)]  # Gapminder between the 1912 survey and 1950
    else:
        m = mad.get(MAD_NAME.get(c, c), {})
        pts = [[y, round(m[y] / 1e4, 1), "est"] for y in (1, 1000, 1500, 1600) if y in m]
        pts += [[y, round(hist[c][y] / 1e4, 1), "est"] for y in sorted(hist[c]) if 1700 <= y < 1800 and y % 10 == 0]
        pts += [[y, round(hist[c][y] / 1e4, 1), "est"] for y in sorted(hist[c]) if 1800 <= y < 1950 and y % 5 == 0]
    pts += [[y, round(un[c][y] / 1e4, 1), "un" if y > 2023 else "stat"] for y in sorted(un[c]) if 1950 <= y <= 2100 and (y % 5 == 0 or y in (2023, 2024))]
    return pts
def at(pts, y):
    if y <= pts[0][0]: return pts[0][1] if (y == pts[0][0] or pts[0][0] <= 2) else None
    for a, b in zip(pts, pts[1:]):
        if y <= b[0]: return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0])
    return pts[-1][1]
cands = set(un) & (set(hist))
S = {c: series(c) for c in cands}
S = {c: p for c, p in S.items() if p}
ever = collections.Counter()
for y in list(range(1, 2101, 5)):
    if 1600 < y < 1700: continue  # no country data between the Maddison 1600 and HYDE 1700 points for most
    vals = sorted(((at(p, y) or 0), c) for c, p in S.items())[::-1][:7]
    for v, c in vals: ever[c] += 1
print(ever.most_common())
if len(sys.argv) > 1:
    keep = sys.argv[1].split(",")
    json.dump({c: S[c] for c in keep}, open("src/v6/world_countries_raw.json", "w"), ensure_ascii=False)
