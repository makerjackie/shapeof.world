"""Fetch OSM evidence, never into the distributable world directory.
Run from repository root: python3 src/components/experiences/worlds/road-design/fetch-footprints.py
Uses the recorded query if a measurement manifest exists; otherwise site seeds.
"""
import json
import pathlib
import time
import urllib.parse
import urllib.request

world = pathlib.Path(__file__).parent
cache = pathlib.Path('.local/road-design/round-5')
cache.mkdir(parents=True, exist_ok=True)
manifest = world / 'data/footprint-references.json'
sites = json.loads(manifest.read_text())['sites'] if manifest.exists() else json.loads((world / 'data/footprint-sites.json').read_text())
mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
for site in sites:
    output = cache / (site['id'] + '.json')
    if output.exists():
        continue
    query = site.get('query') or ('[out:json][timeout:45];way(around:%s,%s,%s)[highway~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link)$"];out body geom;' % (site['downloadRadius'], site['lat'], site['lon']))
    for attempt in range(6):
        try:
            request = urllib.request.Request(mirrors[attempt % 3], data=urllib.parse.urlencode({'data': query}).encode(), headers={'User-Agent': 'ShapeOfWorld-road-design-research/1.0 (OSM footprint comparison)'})
            with urllib.request.urlopen(request, timeout=55) as response:
                data = json.load(response)
            if not data.get('elements'):
                raise RuntimeError('No OSM ways returned')
            data['query'] = query
            output.write_text(json.dumps(data))
            print(site['id'], len(data['elements']), flush=True)
            break
        except Exception as error:
            print(site['id'], attempt + 1, str(error), flush=True)
            if attempt == 5:
                raise
            time.sleep(min(2 ** attempt, 20))
    time.sleep(1)
