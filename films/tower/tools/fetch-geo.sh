#!/bin/bash
# Raw map downloads for tools/geo-prep.mjs (not committed): OSM via Overpass, city boundaries via DataV.GeoAtlas.
# Usage: bash tools/fetch-geo.sh [rawDir]   (default /tmp/towerv2-raw)
set -e
RAW=${1:-/tmp/towerv2-raw}
mkdir -p "$RAW"
UA="shapeof.world-film/1.0 (data film; github.com/makerjackie/shapeof.world)"

q() {
  for OV in https://overpass.private.coffee/api/interpreter https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter; do
    curl -s -m 280 -A "$UA" -H "Accept: application/json" --data-urlencode "data=$1" "$OV" -o "$RAW/$2"
    if head -c 20 "$RAW/$2" | grep -q '{'; then echo "ok $2 ($OV)"; return; fi
  done
  echo "failed $2" >&2
  exit 1
}

# Futian CBD and surroundings: every building with its tags (height, building:levels, name).
q '[out:json][timeout:120];(way["building"](22.515,114.030,22.565,114.090);relation["building"](22.515,114.030,22.565,114.090););out tags geom;' cbd-buildings.json
# Roads around the CBD.
q '[out:json][timeout:200];way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|residential|unclassified)$"](22.50,114.00,22.58,114.11);out tags geom;' cbd-roads.json
# The metro network and stations across Shenzhen.
q '[out:json][timeout:200];(way["railway"="subway"](22.40,113.75,22.90,114.65);node["railway"="station"]["station"="subway"](22.40,113.75,22.90,114.65);node["public_transport"="station"]["subway"="yes"](22.40,113.75,22.90,114.65););out tags geom;' metro.json

# Pearl River Delta cities (GCJ-02; geo-prep converts to WGS-84).
for a in 440000_full 810000 820000; do
  curl -s -m 60 -A "$UA" "https://geo.datav.aliyun.com/areas_v3/bound/$a.json" -o "$RAW/dv-$a.json"
  echo "ok dv-$a.json"
done
