"""Build frozen, offline Voyager geometry. Requires spiceypy==8.0.0.
Run from repository root; raw NASA kernels stay in ignored .scratch/.
Rows: Unix UTC seconds, heliocentric ECLIPJ2000 position km, velocity km/s.
Adaptive cubic Hermite samples; each segment checked at 1/4, 1/2, 3/4.
This is an educational reconstruction of archived SPKs, not live telemetry.
"""
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import urlretrieve
import spiceypy as spice

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.scratch/voyager-kernels'
OUT = ROOT / 'public/assets/solar-system/voyager'
BASE = 'https://naif.jpl.nasa.gov/pub/naif/VOYAGER/kernels/spk/'
FILES = ['Voyager_1.a54206u_V0.2_merged.bsp', 'Voyager_2.m05016u.merged.bsp',
         'vgr1_jup230.bsp', 'vgr1_sat337.bsp', 'vgr2_jup230.bsp', 'vgr2_sat337.bsp',
         'vgr2.ura182.bsp', 'vgr2_nep097.bsp', 'sat337.bsp']
FILES += ['vgr1.x2100.bsp', 'vgr2.x2100.bsp']
URLS = {name: BASE + name for name in FILES}
URLS['jup230.bsp'] = 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/spk/satellites/a_old_versions/jup230.bsp'
URLS['naif0012.tls'] = 'https://naif.jpl.nasa.gov/pub/naif/generic_kernels/lsk/naif0012.tls'
CACHE.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
pinned = json.loads((OUT / "ephemeris-sources.json").read_text()) if (OUT / "ephemeris-sources.json").exists() else {}
expected = {k["url"]: k["sha256"] for k in pinned.get("kernels", [])}
for name, url in URLS.items():
    if not (CACHE / name).exists():
        urlretrieve(url, CACHE / name)
    actual = hashlib.sha256((CACHE / name).read_bytes()).hexdigest()
    if url in expected and actual != expected[url]:
        raise ValueError(f"Kernel changed; review source and manifest before rebuilding: {name}")


def ts(text):
    return datetime.fromisoformat(text.replace('Z', '+00:00')).replace(tzinfo=timezone.utc).timestamp()


def state(body, t):
    et = spice.str2et(datetime.fromtimestamp(t, timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f'))
    return spice.spkezr(str(body), et, 'ECLIPJ2000', 'NONE', '10')[0].tolist()


def hermite(a, b, f, dt):
    return [(2*f**3-3*f*f+1)*a[i] + (f**3-2*f*f+f)*dt*a[i+3]
            + (-2*f**3+3*f*f)*b[i] + (f**3-f*f)*dt*b[i+3] for i in range(3)]


def sample(body, start, end, tolerance, max_step=14*86400):
    cache = {}
    def at(t):
        if t not in cache:
            cache[t] = state(body, t)
        return cache[t]
    rows = []
    worst = 0
    seams = []
    def segment(t0, t1, depth=0):
        nonlocal worst
        a, b = at(t0), at(t1)
        errors = []
        for f in (.25, .5, .75):
            exact = at(t0+(t1-t0)*f)
            estimate = hermite(a, b, f, t1-t0)
            errors.append(math.dist(exact[:3], estimate))
        error = max(errors)
        if error > tolerance and t1-t0 > 1 and depth < 30:
            mid = (t0+t1)/2
            segment(t0, mid, depth+1)
            segment(mid, t1, depth+1)
        else:
            if error > tolerance:
                seams.append({'from':round(t0,3),'to':round(t1,3),'jumpKm':round(math.dist(a[:3],b[:3]),3),'reason':'archive solution handoff or UTC leap second'})
            else:
                worst = max(worst, error)
            rows.append([round(t0, 3)] + [round(v, 3 if i < 3 else 9) for i, v in enumerate(a)])
    t = start
    while t < end:
        n = min(end, t + max_step)
        segment(t, n)
        t = n
    rows.append([round(end, 3)] + [round(v, 3 if i < 3 else 9) for i, v in enumerate(at(end))])
    return {'rows': rows, 'maxCheckedErrorKm': round(worst, 4), 'toleranceKm': tolerance, 'seams': seams}


PLANETS = {'mercury':199, 'venus':299, 'earth':399, 'mars':499, 'jupiter':5, 'saturn':6, 'uranus':7, 'neptune':8}
ENCOUNTERS = {
  1: [('jupiter',599,'1979-03-05T12:05:00Z', ['io','europa','ganymede','callisto']),
      ('titan',606,'1980-11-12T05:41:00Z', []), ('saturn',699,'1980-11-12T23:46:00Z', ['titan'])],
  2: [('jupiter',599,'1979-07-09T22:29:00Z', ['io','europa','ganymede','callisto']),
      ('saturn',699,'1981-08-26T03:24:00Z', ['titan']), ('uranus',799,'1986-01-24T17:59:00Z', ['miranda']),
      ('neptune',899,'1989-08-25T03:56:00Z', ['triton']), ('triton',801,'1989-08-25T09:10:00Z', [])]}
MOONS = {'io':501,'europa':502,'ganymede':503,'callisto':504,'titan':606,'miranda':705,'triton':801}
manifest = {'generator':'scripts/build-voyager-ephemeris.py','spiceypy':'8.0.0','frame':'ECLIPJ2000',
            'observer':'Sun (10)','aberration':'NONE','time':'Unix UTC seconds','retrieved':'2026-09-18',
            'kernels':[{ 'url':url, 'sha256':hashlib.sha256((CACHE/name).read_bytes()).hexdigest()} for name,url in URLS.items()]}
for mission in (1,2):
    spice.kclear()
    # Matched encounter kernels win over the merged cruise solution.
    load = ['naif0012.tls', FILES[mission-1], f'vgr{mission}.x2100.bsp', 'jup230.bsp', 'sat337.bsp',
            f'vgr{mission}_jup230.bsp', f'vgr{mission}_sat337.bsp']
    if mission == 2:
        load += ['vgr2.ura182.bsp', 'vgr2_nep097.bsp']
    for name in load:
        spice.furnsh(str(CACHE/name))
    # Begin after SPK coverage opens; no invented launch ascent.
    start = ts('1977-09-05T14:00:00Z' if mission == 1 else '1977-08-20T15:33:00Z')
    end = ts('2026-09-18T00:00:00Z')
    data = {'version':1,'mission':mission,'start':start,'end':end,'craft':sample(-30-mission,start,end,1), 'planets':{},'encounters':[]}
    for key, body in PLANETS.items():
        data['planets'][key] = sample(body,start,end,100,30*86400)
    for key, body, date, moons in ENCOUNTERS[mission]:
        center = ts(date)
        # Find closest approach within 15 minutes of the published UTC anchor.
        lo, hi = center-900, center+900
        for _ in range(45):
            a,b = lo+(hi-lo)/3,hi-(hi-lo)/3
            distance = lambda t: math.dist(state(-30-mission,t)[:3], state(body,t)[:3])
            if distance(a)<distance(b): hi=b
            else: lo=a
        closest=(lo+hi)/2
        radius_window = 4*86400 if key not in ('titan','triton') else 2*86400
        local = {'id':key,'closest':closest,'centerDistanceKm':distance(closest),'body':sample(body,center-radius_window,center+radius_window,.2,86400), 'moons':{}}
        for moon in moons:
            local['moons'][moon]=sample(MOONS[moon],center-radius_window,center+radius_window,.2,6*3600)
        data['encounters'].append(local)
        print(mission,key,datetime.fromtimestamp(closest,timezone.utc).isoformat(),round(distance(closest),2),flush=True)
    path=OUT/f'voyager-{mission}.json'
    path.write_text(json.dumps(data,separators=(',',':'))+'\n')
    print(path.name,path.stat().st_size,'bytes',flush=True)
    manifest[f'voyager-{mission}']={'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rows':len(data['craft']['rows']), 'maxCheckedErrorKm':data['craft']['maxCheckedErrorKm']}
(OUT/'ephemeris-sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
