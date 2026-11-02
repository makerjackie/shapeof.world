"""World population totals (万) from OWID long-run (HYDE 3.3 before 1800, Gapminder/UN after) -> src/v2/world_total.json"""
import csv, json, os
ROOT = os.path.join(os.path.dirname(__file__), "..")
w = {}
for r in csv.DictReader(open(os.path.join(ROOT, "data", "owid_longrun.csv"))):
    if r["entity"] == "World":
        y = int(r["year"])
        if -300 <= y <= 2030:
            w[y] = round(float(r["population_historical"]) / 1e4)
json.dump(sorted(w.items()), open(os.path.join(ROOT, "src", "v2", "world_total.json"), "w"))
print(len(w), [(y, w[y]) for y in (0, 100, 200, 1700, 1750, 1776, 1800, 1850, 1851, 1880) if y in w])
