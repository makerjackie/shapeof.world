#!/bin/bash
# Downloads OSM buildings and streets for Nanshan (后海、科技园、粤海、前海、蛇口) into RAW (default /tmp/tower3-ns),
# in tiles so the public Overpass servers accept the queries. © OpenStreetMap contributors, ODbL 1.0.
# Then: node tools/nanshan-prep.mjs RAW
RAW=${1:-/tmp/tower3-ns}
mkdir -p "$RAW" && cd "$RAW" || exit 1
UA="shapeof.world-film/1.0 (+https://shapeof.world)"
ov() {
  [ -s "$1" ] && head -c 1 "$1" | grep -q '{' && ! grep -q '"remark"' "$1" && { echo "have $1"; return 0; }
  local EPS=(https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter https://lz4.overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter)
  for i in 1 2 3 4 5 6 7 8; do
    local ep=${EPS[$(( (i-1) % ${#EPS[@]} ))]}
    local code; code=$(curl -sS -m 200 -A "$UA" -H "Accept: application/json" -o "$1" -w "%{http_code}" --data-urlencode "data=$2" "$ep")
    if [ "$code" = "200" ] && head -c 1 "$1" | grep -q '{' && ! grep -q '"remark"' "$1"; then echo "ok $1 $ep $(wc -c < "$1")"; return 0; fi
    echo "retry $1 $i $code $ep" >&2; sleep $((5*i))
  done
  return 1
}
i=0
for la in "22.475,22.518" "22.518,22.560"; do
  for lo in "113.875,113.925" "113.925,113.975"; do
    i=$((i+1)); B="${la%,*},${lo%,*},${la#*,},${lo#*,}"
    ov ns-b$i.json "[out:json][timeout:170];(way[\"building\"]($B);relation[\"building\"]($B););out geom tags;"
  done
done
ov ns-roads.json "[out:json][timeout:170];way[\"highway\"~\"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link|secondary_link)\$\"](22.475,113.875,22.560,113.975);out geom tags;"
node -e 'const fs=require("fs");const seen=new Set();const els=[];for(let i=1;i<=4;i++){for(const e of JSON.parse(fs.readFileSync("ns-b"+i+".json")).elements){const k=e.type+e.id;if(!seen.has(k)){seen.add(k);els.push(e)}}}fs.writeFileSync("ns-buildings.json",JSON.stringify({elements:els}));console.log("merged",els.length)'
echo DONE
