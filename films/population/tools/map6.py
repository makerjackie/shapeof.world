"""Film6 territory maps as dot grids: python tools/map6.py china|world  ->  src/v6/map_<film>.json

Each land cell (from the HYDE 1860 population grid, ISIMIP2a 5') carries a weight (log population density, only used as
dot brightness = "where people live") and, for every keyframe, the index of the polity that holds it.
Polity outlines: aourednik/historical-basemaps (GPL-3.0). The film labels everything itself (the dataset's own Chinese
labels are partly wrong). Where the dataset has no split, the split is drawn by hand as a schematic (示意):
  - 群雄 / 十六国 / 隋末 / 五代十国 / 明末: Voronoi pieces around each regime's seat(s) inside the dynasty's extent
  - 三国 / 南宋·金: the Qinling-Huai line; 安史 / 太平天国: rough boxes of the held core
"""
import base64, json, math, os, sys
import numpy as np
from matplotlib.path import Path

FILM = sys.argv[1]
HB = "/Volumes/DevSSD/tmp/popmap/hb"
NC = "/Volumes/DevSSD/tmp/popmap/pop5_1860_1900.nc"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "v6", f"map_{FILM}.json")

if FILM == "china":
    LON0, LON1, LAT0, LAT1, STEP = 73.0, 135.4, 17.6, 54.0, 0.4
else:
    LON0, LON1, LAT0, LAT1, STEP = -170.0, 180.0, -56.0, 76.0, 1.0
cols = int(round((LON1 - LON0) / STEP)) + 1
rows = int(round((LAT1 - LAT0) / STEP)) + 1

# ---------- density grid (block mean of the 5' grid at 1860)
def read_nc(path):
    try:
        import netCDF4
        ds = netCDF4.Dataset(path)
        var = [n for n in ds.variables if n not in ("lon", "lat", "time", "longitude", "latitude")][0]
        return np.array(ds["lon"][:]), np.array(ds["lat"][:]), ds[var]
    except ImportError:
        import h5py
        ds = h5py.File(path, "r")
        var = [n for n in ds.keys() if n not in ("lon", "lat", "time", "longitude", "latitude")][0]
        return ds["lon"][:], ds["lat"][:], ds[var]

lon, lat, pop = read_nc(NC)
P = np.array(pop[0], dtype=np.float64)  # 1860
P[~np.isfinite(P)] = -1
P[P > 1e19] = -1
dl = abs(lon[1] - lon[0])
k = max(1, int(round(STEP / dl)))
CX = np.arange(cols) * STEP + LON0
CY = np.arange(rows) * STEP + LAT0
ci, cj, cw, clon, clat = [], [], [], [], []
for j, la in enumerate(CY):
    r0 = int(np.argmin(np.abs(lat - la)))
    rs = slice(max(0, r0 - k // 2), r0 + k // 2 + 1)
    for i, lo in enumerate(CX):
        lo2 = ((lo + 180) % 360) - 180
        c0 = int(np.argmin(np.abs(lon - lo2)))
        blk = P[rs, max(0, c0 - k // 2): c0 + k // 2 + 1]
        land = blk[blk >= 0]
        if land.size < max(1, blk.size * 0.3):
            continue
        dens = land.sum() / (land.size * (dl * 111) ** 2 * math.cos(math.radians(la)))  # people / km2
        ci.append(i); cj.append(j); clon.append(lo); clat.append(la)
        cw.append(dens)
cw = np.array(cw)
w = np.clip(np.log10(cw + 0.05) / 3.0 + 0.35, 0, 1)  # ~0.35 empty land .. 1 at ~300/km2
clon = np.array(clon); clat = np.array(clat)
pts = np.stack([clon, clat], 1)
N = len(ci)
print(FILM, "grid", cols, rows, "land cells", N)

# ---------- polygons
CACHE = {}
def feats(snap):
    if snap not in CACHE:
        CACHE[snap] = json.load(open(f"{HB}/world_{snap}.geojson"))["features"]
    return CACHE[snap]

def mask_of(snap, names):
    m = np.zeros(N, bool)
    for ft in feats(snap):
        g = ft["geometry"]
        if not g or ft["properties"].get("NAME") not in names:
            continue
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for p in polys:
            ring = np.array([q[:2] for q in p[0]], float)
            if FILM == "world":
                pass
            bb = (clon >= ring[:, 0].min()) & (clon <= ring[:, 0].max()) & (clat >= ring[:, 1].min()) & (clat <= ring[:, 1].max())
            if not bb.any():
                continue
            ins = Path(ring).contains_points(pts[bb])
            idx = np.where(bb)[0][ins]
            m[idx] = True
    return m

def line(pts_):
    def f(x):
        if x <= pts_[0][0]:
            return pts_[0][1]
        for (x0, y0), (x1, y1) in zip(pts_, pts_[1:]):
            if x <= x1:
                return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
        return pts_[-1][1]
    return np.vectorize(f)

QINLING_HUAI = line([(90, 33.2), (106, 33.0), (110, 32.2), (114, 31.8), (118, 32.1), (123, 32.6)])
HUAI_1142 = line([(95, 34.4), (104, 34.0), (107, 33.6), (110, 33.3), (114, 32.6), (118, 33.0), (121, 33.6), (124, 34.0)])

def blob(base, seats, r):
    """an organic held area: cells near any seat, edge roughened"""
    nz = 0.22 * (np.sin(clon * 1.7 + clat * 0.9) + np.sin(clon * 0.6 - clat * 1.9 + 1.3)) / 2
    d = np.full(N, 1e9)
    for (lo, la) in seats:
        d = np.minimum(d, np.hypot((clon - lo) * np.cos(np.radians(clat)), clat - la))
    return base & (d < r * (1 + nz))

def voronoi(base, seats):
    """seats: [(part_index, lon, lat), ...] -> part index per cell for cells in base (else -1)"""
    out = np.full(N, -1)
    S = np.array([[s[1], s[2]] for s in seats])
    d = ((clon[:, None] - S[None, :, 0]) * np.cos(np.radians(clat))[:, None]) ** 2 + (clat[:, None] - S[None, :, 1]) ** 2
    near = np.argmin(d, 1)
    sel = np.where(base)[0]
    out[sel] = np.array([seats[q][0] for q in near[sel]])
    return out

FR = {}
def frame(key, parts, ids):
    """parts: [(name, role, lab_lon, lab_lat)], ids: int array (-1 none)"""
    ids = np.asarray(ids)
    a = np.where(ids < 0, 255, ids).astype(np.uint8)
    used = [int(x) for x in np.unique(ids[ids >= 0])]
    FR[key] = {"p": [{"n": n, "r": r, "l": [round(lx, 1), round(ly, 1)]} for (n, r, lx, ly) in parts], "id": base64.b64encode(a.tobytes()).decode()}
    print(f"  {key:10s}", ", ".join(f"{parts[u][0] or '?'}:{int((ids == u).sum())}" for u in used))

def layer(*masks):
    """later masks override earlier ones; masks = [(part_index, bool array), ...]"""
    ids = np.full(N, -1)
    for pi, m in masks:
        ids[m] = pi
    return ids

TW = (clon > 119.9) & (clon < 122.2) & (clat > 21.8) & (clat < 25.4)
def cn(snap, names, tibet_snap=None, taiwan=True):
    m = mask_of(snap, names)
    if tibet_snap:
        m |= mask_of(tibet_snap, ["Tibet", "Tibetan Empire", "Khoshut Khanate"])
    if taiwan:
        m |= TW
    return m

if FILM == "china":
    han_bc = mask_of("bc1", ["Han"])
    xiongnu = mask_of("bc1", ["Xiongnu"])
    frame("xihan", [("西汉", "main", 110, 33), ("匈奴", "far", 104, 46)], layer((1, xiongnu), (0, han_bc)))
    han100 = mask_of("100", ["Han"])
    frame("donghan", [("东汉", "main", 112, 32)], layer((0, han100)))
    han200 = mask_of("200", ["Han"])
    seats = [(0, 114.4, 36.3), (1, 113.8, 34.0), (2, 116.8, 32.6), (3, 112.1, 31.5), (4, 119.8, 30.5), (5, 104.1, 30.7), (6, 103.8, 36.1),
             (7, 116.4, 40.2), (8, 123.0, 41.3), (9, 107.0, 33.1), (10, 117.8, 34.6), (11, 108.3, 23.0)]
    names = ["袁绍", "曹操", "袁术", "刘表", "孙策", "刘璋", "马腾", "公孙瓒", "公孙度", "张鲁", "陶谦", "士燮"]
    frame("qunxiong", [(n, "split", s[1], s[2]) for n, s in zip(names, seats)], voronoi(han200, seats))
    north = clat >= QINLING_HUAI(clon)
    frame("sanguo", [("魏", "split", 113, 36), ("蜀", "split", 104.5, 29.5), ("吴", "split", 115.5, 27.5)],
          layer((0, han200 & north), (1, han200 & ~north & (clon < 109.5)), (2, han200 & ~north & (clon >= 109.5))))
    jin = mask_of("300", ["Jin"])
    frame("jin", [("西晋", "main", 112, 32)], layer((0, jin)))
    hz = mask_of("300", ["Han Zhao"])
    nb = (jin | hz) & (clat >= HUAI_1142(clon))
    sb = jin & ~nb
    shu = (jin | hz) & (clon < 108.5) & (clat < 33.2) & (clat > 26)
    seats = [(1, 114.5, 37.0), (2, 120.4, 41.6), (3, 108.9, 34.3), (4, 102.6, 37.9), (5, 113.3, 40.1)]
    ids = voronoi(nb, seats)
    ids[sb] = 0
    ids[shu] = 6
    frame("shiliu", [("东晋", "main", 116, 28), ("后赵", "split", 115, 37), ("前燕", "split", 121, 42), ("前秦", "split", 108, 35),
                     ("前凉", "split", 101, 38), ("代", "split", 113, 41), ("成汉", "split", 104, 30)], ids)
    wei = mask_of("500", ["Toba Wei"])
    south = mask_of("500", ["Jin Empire"])
    frame("nanbei", [("北魏", "split", 110, 37), ("南朝", "split", 114, 28)], layer((0, wei), (1, south & ~wei)))
    chen = south & (clon > 110.5) & (clat < 31.2)
    frame("zhouchen", [("北周", "split", 110, 37), ("陈", "split", 116, 27)], layer((0, (wei | south) & ~chen), (1, chen)))
    sui = mask_of("600", ["Sui Empire"])
    frame("sui", [("隋", "main", 112, 32)], layer((0, sui)))
    seats = [(0, 108.9, 34.3), (1, 112.4, 34.6), (2, 114.6, 35.5), (3, 115.5, 37.8), (4, 118.5, 32.3), (5, 112.2, 30.3), (6, 105.7, 34.6),
             (7, 112.4, 39.0), (8, 115.9, 28.7), (9, 102.6, 37.9), (10, 116.4, 40.0), (11, 108.6, 37.9)]
    names = ["李渊", "王世充", "李密", "窦建德", "杜伏威", "萧铣", "薛举", "刘武周", "林士弘", "李轨", "罗艺", "梁师都"]
    frame("suimo", [(n, "split", s[1], s[2]) for n, s in zip(names, seats)], voronoi(sui, seats))
    tang = mask_of("700", ["Sui Empire"])  # the dataset's 700 polygon is the Tang extent (mislabelled)
    frame("tang", [("唐", "main", 108, 36)], layer((0, tang)))
    tang8 = mask_of("800", ["Tang Empire"])
    yan = blob(tang | tang8, [(116.4, 39.9), (115.4, 38.0), (114.6, 36.4), (113.2, 34.9), (112.45, 34.62), (118.5, 40.5)], 1.9)
    frame("anshi", [("唐", "main", 107, 30), ("燕（安史）", "war", 117, 38.5)], layer((0, tang), (1, yan)))
    hb3 = tang8 & (clon > 113.2) & (clat > 35.4) & (clat < 42)
    frame("fanzhen", [("唐", "main", 110, 30), ("河朔三镇", "split", 116.5, 38.5)], layer((0, tang8), (1, hb3)))
    core = tang8 & (clon > 100)
    seats = [(0, 112.4, 34.6), (0, 112.5, 37.9), (0, 114.3, 34.8), (0, 116.4, 39.0), (1, 118.8, 32.0), (2, 120.2, 30.0), (3, 119.3, 26.1),
             (4, 113.3, 23.1), (5, 113.0, 27.8), (6, 112.2, 30.3), (7, 104.1, 30.7), (0, 107.4, 34.4)]
    khitan = mask_of("900", ["Khitans"])
    ids = voronoi(core, seats)
    ids[khitan & (ids < 0)] = 8
    frame("wudai", [("中原五代", "split", 112, 36), ("吴", "split", 117.5, 31.6), ("吴越", "split", 120.5, 29), ("闽", "split", 118.3, 25.6),
                    ("南汉", "split", 111.5, 23.3), ("楚", "split", 112, 27), ("荆南", "split", 111.7, 30.8), ("前蜀", "split", 104, 30),
                    ("契丹", "far", 118, 44)], ids)
    song = mask_of("1100", ["Song Empire"])
    liao = mask_of("1100", ["Liao"])
    xx = mask_of("1100", ["Xixia"])
    frame("song", [("北宋", "main", 113, 29), ("辽", "far", 118, 44), ("西夏", "far", 104, 39)], layer((1, liao), (2, xx), (0, song)))
    sn = song & (clat < HUAI_1142(clon))
    jinm = (song & ~sn) | (liao & (clat < 50))
    frame("songjin", [("南宋", "main", 113, 28), ("金", "split", 118, 39), ("西夏", "far", 104, 39)], layer((2, xx), (1, jinm), (0, sn)))
    mong = mask_of("1200", ["Mongol Empire"])
    frame("mengjin", [("南宋", "main", 113, 28), ("蒙古", "war", 112, 42)], layer((1, mong | jinm | xx), (0, sn)))
    yuan = cn("1279", ["Great Khanate"], "1279")
    frame("yuan", [("元", "main", 110, 38)], layer((0, yuan)))
    ming = cn("1500", ["Ming Chinese Empire"], "1500")
    frame("ming", [("明", "main", 112, 31)], layer((0, ming)))
    ming6 = mask_of("1600", ["Ming Chinese Empire"])
    manchu = mask_of("1650", ["Manchu Empire"])
    base = ming6 | (manchu & (clon > 118) & (clat > 38) & (clat < 48))
    seats = [(0, 123.4, 41.8), (0, 116.4, 39.9), (1, 108.9, 34.3), (1, 112.5, 37.9), (1, 113.6, 34.8), (2, 104.1, 30.7), (3, 118.8, 32.0),
             (3, 113.0, 25.5), (3, 119.5, 27.0), (3, 106.6, 26.6)]
    frame("mingmo", [("清", "war", 120, 41), ("大顺", "split", 110, 36), ("大西", "split", 103.5, 29.5), ("南明", "split", 114, 27)], voronoi(base, seats))
    q1 = cn("1650", ["Manchu Empire"], "1650")
    frame("qing1", [("清", "main", 112, 34)], layer((0, q1)))
    q2 = mask_of("1783", ["Manchu Empire", "Qing Empire", "Manchu Empire (Qing)"])
    if q2.sum() < 1000:
        q2 = mask_of("1800", ["Manchu Empire", "Qing Empire"])
    q2 = q2 | TW | mask_of("1783", ["Tibet"])
    frame("qing2", [("清", "main", 100, 38)], layer((0, q2)))
    tp = blob(q2, [(118.8, 32.06), (117.05, 30.5), (115.97, 29.7), (114.3, 30.55), (120.6, 31.3), (120.15, 30.28), (116.0, 28.7)], 1.25)
    frame("taiping", [("清", "main", 100, 38), ("太平天国", "war", 117, 30.5)], layer((0, q2), (1, tp)))
    q3 = mask_of("1880", ["Manchu Empire", "Qing Empire"])
    if q3.sum() < 1000:
        q3 = q2
    q3 = q3 | TW | mask_of("1880", ["Tibet"])
    frame("qing3", [("清", "main", 100, 38)], layer((0, q3)))
    frame("none", [], np.full(N, -1))
else:
    def F(key, snap, spec):
        """spec: [(names, label, role, lon, lat, extra_mask)]"""
        parts, masks = [], []
        for k_, it in enumerate(spec):
            names, lab, role, lx, ly = it[:5]
            m = mask_of(snap, names) if names else np.zeros(N, bool)
            if len(it) > 5 and it[5] is not None:
                m = m | it[5]
            parts.append((lab, role, lx, ly))
            masks.append((k_, m))
        frame(key, parts, layer(*masks[::-1]))
    TIB = lambda sn: mask_of(sn, ["Tibet", "Tibetan Empire", "Khoshut Khanate"])
    F("w1", "bc1", [(["Han"], "汉", "main", 110, 33), (["Roman Empire"], "罗马", "split", 18, 42), (["Parthian Empire"], "安息", "split", 54, 33),
                    (["Xiongnu"], "匈奴", "far", 102, 46), (["Saka Kingdom", "Suren Kingdom"], "", "far", 70, 33)])
    F("w200", "200", [(["Han"], "东汉", "main", 110, 33), (["Roman Empire"], "罗马", "split", 18, 42), (["Parthian Empire"], "安息", "split", 54, 33)])
    F("w300", "300", [(["Jin"], "西晋", "main", 112, 32), (["Rome (Maximian)"], "罗马 · 西", "split", 10, 44), (["Rome (Diocletianus)"], "罗马 · 东", "split", 38, 36),
                      (["Rome (Constantinus)"], "罗马 · 高卢", "split", 2, 48), (["Rome (Galerius)"], "罗马 · 巴尔干", "split", 23, 44),
                      (["Parthian Empire", "Persia", "Sasanian Empire"], "萨珊波斯", "split", 55, 32)])
    F("w400", "400", [(["Western Roman Empire"], "西罗马", "split", 5, 44), (["Eastern Roman Empire"], "东罗马", "split", 32, 38), (["Persia"], "萨珊波斯", "split", 55, 32),
                      (["Hunnic Empire"], "匈人", "war", 40, 49), (["Jin"], "东晋", "main", 114, 28), (["Sixteen Kingdoms", "Northern Liang"], "十六国", "split", 110, 37),
                      (["Gupta Empire"], "笈多", "split", 80, 24)])
    F("w500", "500", [(["Ostrogoths"], "东哥特", "split", 13, 44), (["Visigoths"], "西哥特", "split", -4, 40), (["Franks"], "法兰克", "split", 3, 48),
                      (["Vandals"], "汪达尔", "split", 9, 34), (["Eastern Roman Empire"], "东罗马", "split", 32, 38), (["Sasanian Empire"], "萨珊波斯", "split", 55, 32),
                      (["Toba Wei"], "北魏", "split", 110, 38), (["Jin Empire"], "南朝", "main", 114, 27), (["Gupta Empire"], "笈多", "split", 80, 24)])
    F("w700", "700", [(["Umayyad Caliphate"], "阿拉伯帝国", "war", 40, 28), (["Eastern Roman Empire"], "东罗马", "split", 30, 39), (["Sui Empire"], "唐", "main", 108, 35),
                      (["Tufan Empire"], "吐蕃", "far", 88, 32), (["Frankish Kingdom"], "法兰克", "split", 3, 47), (["Sasanian Empire"], "", "far", 58, 32)])
    F("w800", "800", [(["Abbasid Caliphate"], "阿拔斯", "split", 45, 30), (["Tang Empire"], "唐", "main", 110, 33), (["Tibetan Empire"], "吐蕃", "far", 88, 32),
                      (["Carolingian Empire"], "查理曼帝国", "split", 6, 48), (["Byzantine Empire"], "拜占庭", "split", 28, 39), (["Uyghurs"], "回鹘", "far", 100, 46)])
    F("w1100", "1100", [(["Song Empire"], "北宋", "main", 112, 29), (["Liao"], "辽", "split", 118, 44), (["Xixia"], "西夏", "far", 104, 39), (["Seljuk Empire"], "塞尔柱", "split", 52, 34),
                        (["Fatimid Caliphate"], "法蒂玛", "split", 28, 26), (["Byzantine Empire"], "拜占庭", "split", 29, 39), (["Holy Roman Empire"], "神圣罗马", "split", 11, 49),
                        (["Kievan Rus"], "基辅罗斯", "split", 32, 54)])
    F("w1200", "1200", [(["Mongol Empire"], "蒙古", "war", 104, 47), (["Song Empire"], "南宋", "main", 113, 28), (["Liao"], "金", "split", 118, 42), (["Xixia"], "西夏", "far", 104, 39),
                        (["Kara Khitai Khaganate"], "西辽", "split", 72, 42), (["Byzantine Empire"], "拜占庭", "split", 29, 39), (["Holy Roman Empire"], "神圣罗马", "split", 11, 49)])
    F("w1279", "1279", [(["Great Khanate"], "元", "war", 108, 38, TIB("1279") | TW), (["Khanate of the Golden Horde"], "金帐汗国", "split", 48, 51), (["Ilkhanate"], "伊尔汗国", "split", 52, 33),
                        (["Chagatai Khanate"], "察合台汗国", "split", 75, 43), (["Mamluke Sultanate"], "马穆鲁克", "split", 31, 27), (["Holy Roman Empire"], "神圣罗马", "split", 11, 49),
                        (["Sultanate of Delhi"], "德里", "split", 78, 26)])
    F("w1400", "1400", [([], "明", "main", 112, 32, mask_of("1500", ["Ming Chinese Empire"]) | TIB("1500") | TW), (["Timurid Empire"], "帖木儿", "war", 62, 36), (["Ottoman Empire"], "奥斯曼", "split", 30, 40),
                        (["Mamluke Sultanate"], "马穆鲁克", "split", 31, 27), (["Holy Roman Empire"], "神圣罗马", "split", 11, 49), (["Sultanate of Delhi"], "德里", "split", 78, 26),
                        (["White Horde", "Blue Horde"], "金帐汗国", "far", 55, 50)])
    F("w1500", "1500", [(["Ming Chinese Empire"], "明", "main", 112, 32, TIB("1500") | TW), (["Ottoman Empire"], "奥斯曼", "split", 32, 40), (["Inca Empire"], "印加", "split", -72, -13),
                        (["Aztec Empire", "Triple Alliance (Aztec)", "Aztec"], "阿兹特克", "split", -99, 19), (["Grand Duchy of Moscow"], "莫斯科", "split", 40, 57),
                        (["Mamluke Sultanate"], "马穆鲁克", "split", 31, 27), (["Holy Roman Empire"], "神圣罗马", "split", 11, 49)])
    F("w1600", "1600", [(["Ming Chinese Empire"], "明", "main", 112, 32, TIB("1600") | TW), (["Ottoman Empire"], "奥斯曼", "split", 34, 38), (["Mughal Empire"], "莫卧儿", "split", 78, 25),
                        (["Safavid Empire"], "萨法维", "split", 53, 32), (["Tsardom of Muscovy"], "俄国", "split", 50, 58), (["Viceroyalty of New Spain"], "西属美洲", "war", -100, 22),
                        (["Inca Empire", "Viceroyalty of Peru"], "西属秘鲁", "war", -72, -13), (["Holy Roman Empire"], "神圣罗马", "split", 11, 49)])
    F("w1700", "1700", [(["Manchu Empire"], "清", "main", 110, 36, TIB("1700") | TW), (["Mughal Empire"], "莫卧儿", "split", 78, 23), (["Ottoman Empire"], "奥斯曼", "split", 34, 37),
                        (["Tsardom of Muscovy"], "俄国", "split", 70, 60), (["Safavid Empire"], "萨法维", "split", 53, 32), (["Viceroyalty of New Spain", "Viceroyalty of Peru"], "西属美洲", "split", -80, 5)])
    F("w1800", "1800", [(["Qing Empire"], "清", "main", 100, 38, TW), (["Russian Empire"], "俄国", "split", 80, 62), (["Ottoman Empire"], "奥斯曼", "split", 34, 37),
                        (["United States of America"], "美国", "split", -85, 38), (["Viceroyalty of Brazil"], "巴西", "split", -50, -10),
                        (["Viceroyalty of New Spain", "Viceroyalty of Peru", "Viceroyalty of New Granada", "Viceroyalty of the Río de la Plata"], "西属美洲", "split", -70, 0),
                        (["Maratha Confederacy"], "马拉塔", "split", 76, 20)])
    F("w1880", "1880", [(["Manchu Empire"], "清", "main", 100, 38, TIB("1880") | TW), (["Russian Empire"], "俄国", "split", 80, 62), (["British Raj"], "英属印度", "split", 78, 23),
                        (["United States of America"], "美国", "split", -98, 39), (["Ottoman Empire"], "奥斯曼", "split", 34, 37), (["Kingdom of Brazil"], "巴西", "split", -50, -10)])
    frame("none", [], np.full(N, -1))

out = {"lon0": LON0, "lat0": LAT0, "step": STEP, "cols": cols, "rows": rows,
       "i": base64.b64encode(np.array(ci, np.uint16).tobytes()).decode(),
       "j": base64.b64encode(np.array(cj, np.uint16).tobytes()).decode(),
       "w": base64.b64encode((w * 255).astype(np.uint8).tobytes()).decode(),
       "frames": FR}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w"), separators=(",", ":"), ensure_ascii=False)
print("wrote", OUT, os.path.getsize(OUT) // 1024, "KB")
