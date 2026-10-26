"""Build bounded, self-hosted MVTs from Geofabrik's OSM PBF (ODbL).

Run with Python packages osmium, shapely, pyproj, mapbox-vector-tile.
Source PBF and intermediate GeoJSON stay in .local; no network calls at runtime.
python data/build-city.py source.osm.pbf output.zip cache.json
"""
import json, math, sys, zipfile
from pathlib import Path
import osmium, mapbox_vector_tile
from shapely.geometry import shape, box, LineString, mapping
from shapely.ops import transform
from shapely.strtree import STRtree
from pyproj import Transformer

SOURCE, OUTPUT, CACHE = map(Path, sys.argv[1:4])
LITE = '--overview' in sys.argv
project = Transformer.from_crs(4326, 3857, always_xy=True).transform
wide = box(131.65, 33.8, 133.25, 35.0)
city = box(132.32, 34.29, 132.59, 34.50)
records, bridges = [], []

class Extract(osmium.SimpleHandler):
    def way(self, w):
        if not (w.tags.get('highway') or w.tags.get('waterway')): return
        try:
            pts = [(n.lon, n.lat) for n in w.nodes]
            if len(pts) < 2: return
            g = LineString(pts)
            if not g.intersects(wide): return
            name = w.tags.get('name', '')
            if '橋' in name and g.intersects(city):
                p = g.interpolate(.5, normalized=True)
                bridges.append(dict(name=name, id=w.id, lon=p.x, lat=p.y, nodes=pts))
            water = bool(w.tags.get('waterway'))
            highway = w.tags.get('highway', '')
            if not water and highway in ('footway','path','steps','service','track','cycleway','pedestrian'): return
            if not g.intersects(city) and highway not in ('motorway','trunk','primary','secondary') and not water: return
            records.append(dict(layer='waterway' if water else 'road', geometry=mapping(transform(project, g.intersection(wide))), properties={'class': highway or w.tags.get('waterway'), 'name': name}))
        except (osmium.InvalidLocationError, ValueError): pass

    def area(self, a):
        water = a.tags.get('natural') == 'water' or a.tags.get('water') or a.tags.get('waterway') == 'riverbank'
        building = bool(a.tags.get('building'))
        park = a.tags.get('leisure') in ('park','garden','pitch')
        if not (water or building or park): return
        try:
            g = shape(json.loads(osmium.geom.GeoJSONFactory().create_multipolygon(a)))
            bounds = city if building or park else wide
            if not g.intersects(bounds): return
            if not g.is_valid: g=g.buffer(0)
            g = g.intersection(bounds)
            if g.is_empty: return
            records.append(dict(layer='water' if water else 'building' if building else 'park',geometry=mapping(transform(project,g)),properties={}))
        except (RuntimeError, ValueError): pass

if CACHE.exists():
    data=json.loads(CACHE.read_text()); records=data['records'];bridges=data['bridges']
else:
    Extract().apply_file(str(SOURCE), locations=True, idx='flex_mem')
    CACHE.write_text(json.dumps(dict(records=records,bridges=bridges),ensure_ascii=False,separators=(',',':')))
    print('extracted',len(records),'features',flush=True)
Path(str(CACHE)+'.bridges.json').write_text(json.dumps(bridges,ensure_ascii=False,indent=2))
geoms=[shape(r['geometry']) for r in records]; tree=STRtree(geoms)
world=20037508.342789244
def tile(lon,lat,z):
    return int((lon+180)/360*2**z),int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
count=0
with zipfile.ZipFile(OUTPUT,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
    for z in range(8,14 if LITE else 15):
        b=wide.bounds if z<=11 else city.bounds
        x0,y1=tile(b[0],b[1],z);x1,y0=tile(b[2],b[3],z)
        size=world*2/2**z
        for x in range(x0,x1+1):
            for y in range(y0,y1+1):
                tb=(-world+x*size,world-(y+1)*size,-world+(x+1)*size,world-y*size)
                extent=box(*tb); layers={}
                for idx in tree.query(extent):
                    r=records[int(idx)];layer=r['layer']
                    if layer=='building' and z<14:continue
                    if layer=='park' and z<12:continue
                    if LITE and z<12 and layer=='road' and r['properties']['class'] not in ('motorway','trunk'):continue
                    if LITE and layer=='waterway' and r['properties']['class'] not in ('river','canal'):continue
                    if layer=='road' and z<12 and r['properties']['class'] not in ('motorway','trunk','primary','secondary'):continue
                    g=geoms[int(idx)].intersection(extent).simplify(size/4096*(2.5 if LITE else .65),preserve_topology=True)
                    if g.is_empty:continue
                    props={'class':r['properties']['class']} if layer in ('road','waterway') else {}
                    layers.setdefault(layer,[]).append(dict(geometry=mapping(g),properties=props))
                if layers:
                    encoded=mapbox_vector_tile.encode([dict(name=n,features=f) for n,f in layers.items()],default_options=dict(quantize_bounds=tb,extents=4096))
                    archive.writestr(f'{z}/{x}/{y}',encoded);count+=1
        print('zoom',z,'tiles',count,flush=True)
    archive.writestr('manifest.json',json.dumps(dict(source='Geofabrik chugoku-261025.osm.pbf',license='ODbL-1.0',bounds=list(wide.bounds),detailBounds=list(city.bounds),minzoom=8,maxzoom=13 if LITE else 14,tiles=count)))
print('archive',OUTPUT.stat().st_size,flush=True)
