# Fallback for tools/fetch-nanshan.sh when the public Overpass servers refuse: cuts Nanshan's buildings and main
# streets out of the Geofabrik Guangdong extract (© OpenStreetMap contributors, ODbL) and writes them in the same
# shape as an Overpass `out geom tags` answer, for tools/nanshan-prep.mjs.
# Usage: python tools/pbf-nanshan.py guangdong.osm.pbf /tmp/tower3-ns
import json
import os
import sys

import osmium

SRC, RAW = sys.argv[1], sys.argv[2]
W, S, E, N = 113.875, 22.475, 113.975, 22.560
ROADS = {"motorway", "trunk", "primary", "secondary", "tertiary", "motorway_link", "trunk_link", "primary_link", "secondary_link"}


def inside(pts):
    cx = sum(p[0] for p in pts) / len(pts)
    cy = sum(p[1] for p in pts) / len(pts)
    return W <= cx <= E and S <= cy <= N


class Cut(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.buildings = []
        self.roads = []

    def area(self, a):
        t = a.tags
        if "building" not in t or t.get("building") == "roof" or "building:part" in t:
            return
        for ring in a.outer_rings():
            pts = [(n.lon, n.lat) for n in ring]
            if len(pts) < 4 or not inside(pts):
                return
            self.buildings.append({"type": "way" if a.from_way() else "relation", "id": a.orig_id(), "tags": {k.k: k.v for k in t}, "geometry": [{"lon": x, "lat": y} for x, y in pts]})
            return

    def way(self, w):
        if w.tags.get("highway") not in ROADS:
            return
        try:
            pts = [(n.lon, n.lat) for n in w.nodes]
        except osmium.InvalidLocationError:
            return
        if len(pts) < 2 or not any(W <= x <= E and S <= y <= N for x, y in pts):
            return
        self.roads.append({"type": "way", "id": w.id, "tags": {k.k: k.v for k in w.tags}, "geometry": [{"lon": x, "lat": y} for x, y in pts]})


h = Cut()
h.apply_file(SRC, locations=True, idx="flex_mem")
os.makedirs(RAW, exist_ok=True)
json.dump({"elements": h.buildings}, open(os.path.join(RAW, "ns-buildings.json"), "w"))
json.dump({"elements": h.roads}, open(os.path.join(RAW, "ns-roads.json"), "w"))
print("buildings", len(h.buildings), "roads", len(h.roads))
