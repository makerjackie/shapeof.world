#!/bin/bash
# Re-download the raw inputs for the build scripts (run on the Mac mini; ~15 min because the public Overpass
# servers are often at capacity). Raw files go to RAW (default /tmp/towergeo) and are NOT committed.
# Order afterwards:  node build-land.mjs RAW ..   &&  node build-cbd.mjs RAW ..  &&  node build-city.mjs RAW ..
# Overpass data: (c) OpenStreetMap contributors, ODbL 1.0.  DataV data: see ../README.md.
RAW=${1:-/tmp/towergeo}
mkdir -p "$RAW" && cd "$RAW" || exit 1
UA="shapeof.world-research/1.0 (dull.abdullah@wavenhook.com)"

ov() { # ov out.json 'query'  -- rotates public Overpass endpoints, retries on 429/5xx
  local EPS=(https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter https://lz4.overpass-api.de/api/interpreter https://z.overpass-api.de/api/interpreter)
  for i in 1 2 3 4 5 6; do
    local ep=${EPS[$(( (i-1) % ${#EPS[@]} ))]}
    local code; code=$(curl -sS -m 200 -A "$UA" -H "Accept: application/json" -o "$1" -w "%{http_code}" --data-urlencode "data=$2" "$ep")
    if [ "$code" = "200" ] && head -c 1 "$1" | grep -q '{' && ! grep -q '"remark"' "$1"; then echo "ok $1 $ep"; return 0; fi
    echo "retry $i $code $ep" >&2; sleep $((5*i))
  done
  return 1
}

S="22.38,113.70,22.90,114.70"          # Shenzhen + surroundings
B="22.526,114.040,22.560,114.080"      # Futian CBD window (build-cbd.mjs trims it to 114.037-114.069, 22.527-22.560)
F="22.49,113.98,22.60,114.12"          # Futian district window

ov site.json "[out:json][timeout:90];(way(776897369);way[\"building\"](22.5305,114.0560,22.5350,114.0615););out geom tags;"
ov cbd-buildings.json "[out:json][timeout:120];(way[\"building\"]($B););out geom tags;"
ov cbd-roads.json "[out:json][timeout:120];(way[\"highway\"~\"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|service)\$\"]($B););out geom tags;"
ov cbd-green.json "[out:json][timeout:120];(way[\"leisure\"~\"park|garden|pitch\"]($B);way[\"landuse\"~\"grass|forest|recreation_ground|village_green\"]($B);way[\"natural\"~\"wood|water|scrub|grassland\"]($B);way[\"waterway\"]($B););out geom tags;"
ov rel-cbd.json "[out:json][timeout:120];(relation[\"natural\"=\"water\"]($B);relation[\"leisure\"=\"park\"]($B););out geom;"
ov cbd-rail.json "[out:json][timeout:120];(way[\"railway\"~\"subway|rail|light_rail|construction\"]($B);node[\"railway\"=\"station\"]($B);nwr[\"station\"=\"subway\"]($B););out geom tags;"
ov lm.json '[out:json][timeout:90];(nwr["name"~"福田中心区|深圳市民中心|市民中心$|莲花山|福田站|深圳少年宫|少年宫$|深圳图书馆|深圳音乐厅|深圳书城|平安金融中心|福田高铁|福田综合交通枢纽|深圳中心公园|深圳会展中心"](22.50,114.00,22.60,114.10););out center tags;'
ov coast.json "[out:json][timeout:180];way[\"natural\"=\"coastline\"]($S);out geom;"
ov roads-major.json "[out:json][timeout:180];way[\"highway\"~\"^(motorway|trunk|primary)\$\"]($S);out geom tags;"
ov metro-rel.json "[out:json][timeout:180];relation[\"route\"=\"subway\"]($S);out geom;"
ov stations-b.json "[out:json][timeout:120];node[\"railway\"=\"station\"][\"station\"=\"subway\"]($S);out;"
ov adm-geom.json '[out:json][timeout:180];relation(id:3464353,3536166,4590423,5663273,5664101,5664102,5664191,5664192,5664193,5664194,5664195);out geom;'
ov fut-roads.json "[out:json][timeout:120];way[\"highway\"~\"^(motorway|trunk|primary|secondary|motorway_link|trunk_link|primary_link)\$\"]($F);out geom tags;"
ov fut-green.json "[out:json][timeout:120];(way[\"leisure\"~\"park|nature_reserve\"]($F);way[\"landuse\"~\"forest|grass\"]($F);way[\"natural\"~\"wood|water|wetland\"]($F);relation[\"natural\"~\"water|wood\"]($F);relation[\"leisure\"~\"park|nature_reserve\"]($F););out geom;"

# DataV GeoAtlas (AMap data, GCJ-02) - "仅供学习和交流使用", see README
for c in 440300_full 440000_full 810000 820000; do curl -sS -m 40 -o "dv-$c.json" "https://geo.datav.aliyun.com/areas_v3/bound/$c.json"; done
cp dv-440300_full.json dv.json
# CTBUH Skyscraper Center: the city page embeds the full building list as `let buildings = [...]`
curl -sS -m 60 -A "Mozilla/5.0" -o ctbuh_city.html "https://www.skyscrapercenter.com/city/shenzhen"
node -e '
const L=require("fs").readFileSync("ctbuh_city.html","utf8").split(String.fromCharCode(10)).find(l=>l.includes("let buildings = ["));
require("fs").writeFileSync("ctbuh_sz.json", L.slice(L.indexOf("["), L.lastIndexOf("]")+1));'
