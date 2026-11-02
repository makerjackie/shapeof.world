"""World series for Film6 (两千年世界人口) -> src/v6/world_data.json, values in 万人.
Source: Our World in Data, "Population" (HYDE 3.3 to 1800, Gapminder to 1950, UN WPP 2024 after) and
"Population with UN projections" (WPP 2024 medium variant, 2024-2100). Regions: OWID's HYDE continents;
Americas = North America + South America."""
import csv, json, os
D = "/Volumes/DevSSD/tmp/pop6/owid"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "v6", "world_data.json")
rows = {}
for r in csv.DictReader(open(f"{D}/pop.csv")):
    rows.setdefault(r["entity"], {})[int(r["year"])] = float(r["population_historical"])
W = rows["World"]
keep = lambda y: (0 <= y <= 1700 and y % 100 == 0) or (1700 < y < 1800 and y % 10 == 0) or (1800 <= y <= 2023)
world = [[y, round(v / 1e4, 1)] for y, v in sorted(W.items()) if keep(y)]
proj = []
for r in csv.DictReader(open(f"{D}/proj.csv")):
    if r["entity"] == "World" and r["population__sex_all__age_all__variant_medium__projected"] and int(r["year"]) >= 2024:
        proj.append([int(r["year"]), round(float(r["population__sex_all__age_all__variant_medium__projected"]) / 1e4, 1)])
reg = {}
for name, src in [("亚洲", ["Asia"]), ("欧洲", ["Europe"]), ("非洲", ["Africa"]), ("美洲", ["North America", "South America"]), ("大洋洲", ["Oceania"])]:
    ys = sorted(set.intersection(*[set(rows[s]) for s in src]))
    reg[name] = [[y, round(sum(rows[s][y] for s in src) / 1e4, 1)] for y in ys if keep(y)]
json.dump({"world": world, "un": proj, "regions": reg}, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print("world", len(world), world[:3], "un", len(proj), proj[-1], {k: (len(v), v[0], v[-1]) for k, v in reg.items()})
