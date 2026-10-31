# Warp Copernicus DEM and Sentinel-2 TCI into the film's local frame (tmerc at Robotyne area), 10 m px for imagery.
import sys, numpy as np, rasterio, requests
from rasterio.warp import reproject, Resampling
from rasterio.transform import from_origin
from PIL import Image
LAT0, LON0 = 47.42, 35.86
CRS = f"+proj=tmerc +lat_0={LAT0} +lon_0={LON0} +k=1 +x_0=0 +y_0=0 +ellps=WGS84 +units=m +no_defs"
X0, X1, Y0, Y1 = -20000, 20000, -22000, 22000
def grid(res):
    w, h = int((X1-X0)/res), int((Y1-Y0)/res)
    return w, h, from_origin(X0, Y1, res, res)
mode = sys.argv[1]
if mode == "dem":
    w, h, tr = grid(40)
    out = np.full((h, w), np.nan, np.float32)
    for f in ["cop_N47_00_E035_00.tif", "cop_N47_00_E036_00.tif"]:
        with rasterio.open(f) as src:
            tmp = np.full((h, w), np.nan, np.float32)
            reproject(rasterio.band(src, 1), tmp, dst_transform=tr, dst_crs=CRS, resampling=Resampling.bilinear, dst_nodata=np.nan)
            out = np.where(np.isnan(out), tmp, out)
    print("dem", w, h, np.nanmin(out), np.nanmax(out), np.isnan(out).sum())
    np.save("dem40.npy", out)
else:
    date, tiles, name, res = sys.argv[2], sys.argv[3].split(","), sys.argv[4], float(sys.argv[5])
    w, h, tr = grid(res)
    out = np.zeros((3, h, w), np.uint8); filled = np.zeros((h, w), bool)
    for t in tiles:
        item = requests.get(f"https://earth-search.aws.element84.com/v1/collections/sentinel-2-l2a/items/S2{t}_{date}_0_L2A").json()
        url = item["assets"]["visual"]["href"]
        with rasterio.open(url) as src:
            tmp = np.zeros((3, h, w), np.uint8)
            for b in range(3):
                reproject(rasterio.band(src, b+1), tmp[b], dst_transform=tr, dst_crs=CRS, resampling=Resampling.bilinear, src_nodata=0, dst_nodata=0)
            m = (tmp.sum(0) > 0) & ~filled
            out[:, m] = tmp[:, m]; filled |= m
        print(t, "filled", filled.mean())
    Image.fromarray(out.transpose(1, 2, 0)).save(name, quality=90)
