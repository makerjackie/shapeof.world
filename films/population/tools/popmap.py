"""China population-density dots for the film floor.

Source: ISIMIP2a HYDE gridded population (population_histsoc_5arcmin_annual_1860_1900.nc).
Mask: Natural Earth 10m admin-0, China point of view (ne_10m_admin_0_countries_chn), public domain.
Provinces: Natural Earth 10m admin-1 (used only as masks, never drawn).
Output: src/v2/popmap.json  {cols, rows, lon0, lat0, step, dots: [[i, j, p1860, p1880, prov], ...]}
"""
import json, os, sys
import numpy as np

SRC = "/Volumes/DevSSD/tmp/popmap"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "v2", "popmap.json")
LON0, LON1, LAT0, LAT1 = 73.0, 135.5, 17.5, 54.0
STEP = 0.25  # degrees per dot

def read_nc(path):
    try:
        import netCDF4
        ds = netCDF4.Dataset(path)
        names = list(ds.variables)
        var = [n for n in names if n not in ("lon", "lat", "time", "longitude", "latitude")][0]
        return ds, var, np.array(ds["lon"][:]), np.array(ds["lat"][:]), ds["time"], ds[var]
    except ImportError:
        import h5py
        ds = h5py.File(path, "r")
        names = list(ds.keys())
        var = [n for n in names if n not in ("lon", "lat", "time", "longitude", "latitude")][0]
        return ds, var, ds["lon"][:], ds["lat"][:], ds["time"], ds[var]

ds, var, lon, lat, time, pop = read_nc(os.path.join(SRC, "pop5_1860_1900.nc"))
print("var", var, pop.shape, "lon", lon[0], lon[-1], "lat", lat[0], lat[-1])
nt = pop.shape[0]
years = list(range(1860, 1860 + nt))
i60, i80 = years.index(1860), years.index(1880)
xi = np.where((lon >= LON0) & (lon < LON1))[0]
yi = np.where((lat >= LAT0) & (lat < LAT1))[0]
def slab(t):
    a = np.array(pop[t, yi.min():yi.max() + 1, xi.min():xi.max() + 1], dtype=np.float64)
    a[~np.isfinite(a)] = 0
    a[a < 0] = 0
    return a
A60, A80 = slab(i60), slab(i80)
la = lat[yi.min():yi.max() + 1]
lo = lon[xi.min():xi.max() + 1]
k = int(round(STEP / abs(lo[1] - lo[0])))
H_, W_ = (A60.shape[0] // k) * k, (A60.shape[1] // k) * k
def agg(a):
    return a[:H_, :W_].reshape(H_ // k, k, W_ // k, k).sum(axis=(1, 3))
P60, P80 = agg(A60), agg(A80)
clat = la[:H_].reshape(-1, k).mean(1)
clon = lo[:W_].reshape(-1, k).mean(1)

import shapefile
from matplotlib.path import Path
def polys(shp, keep):
    out = []
    r = shapefile.Reader(shp)
    flds = [f[0] for f in r.fields[1:]]
    for sr in r.iterShapeRecords():
        rec = dict(zip(flds, sr.record))
        tag = keep(rec)
        if not tag:
            continue
        pts = sr.shape.points
        parts = list(sr.shape.parts) + [len(pts)]
        for a, b in zip(parts[:-1], parts[1:]):
            out.append((tag, Path(pts[a:b])))
    return out
chn = polys(os.path.join(SRC, "ne_chn", "ne_10m_admin_0_countries_chn.shp"),
            lambda r: "CN" if r.get("ADM0_A3") in ("CHN", "TWN") or r.get("SOV_A3") == "CH1" else None)
print("china parts", len(chn))
PROV = {"Jiangsu": "江苏", "Zhejiang": "浙江", "Anhui": "安徽", "Jiangxi": "江西", "Hubei": "湖北", "Hunan": "湖南",
        "Fujian": "福建", "Shaanxi": "陕西", "Gansu": "甘肃", "Ningxia": "宁夏", "Shanxi": "山西", "Henan": "河南",
        "Hebei": "直隶", "Beijing": "直隶", "Tianjin": "直隶", "Shanghai": "江苏", "Shandong": "山东", "Sichuan": "四川",
        "Chongqing": "四川", "Guangdong": "广东", "Guangxi": "广西", "Yunnan": "云南", "Guizhou": "贵州"}
prov = polys(os.path.join(SRC, "ne_adm1", "ne_10m_admin_1_states_provinces.shp"),
             lambda r: PROV.get(r.get("name_en") or r.get("name")) if r.get("adm0_a3") == "CHN" else None)
print("prov parts", len(prov))

dots = []
for j, la_ in enumerate(clat):
    for i, lo_ in enumerate(clon):
        p = P60[j, i]
        if p < 50:
            continue
        pt = (lo_, la_)
        if not any(path.contains_point(pt) for _, path in chn):
            continue
        name = next((tag for tag, path in prov if path.contains_point(pt)), "")
        dots.append([i, int(len(clat) - 1 - j) if clat[0] < clat[-1] else j, round(float(p)), round(float(P80[j, i])), name])
tot60 = sum(d[2] for d in dots)
tot80 = sum(d[3] for d in dots)
print("dots", len(dots), "sum1860 %.1f M, sum1880 %.1f M" % (tot60 / 1e6, tot80 / 1e6))
json.dump({"cols": len(clon), "rows": len(clat), "lon0": float(clon[0]), "lat0": float(min(clat[0], clat[-1])), "step": STEP,
           "dots": dots}, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
