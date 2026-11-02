"""Film6 fonts: static, subsetted WOFF2 files built from the film's own text, served from public/fonts5/.
Noto Serif SC / Noto Sans SC (OFL, variable -> static instances) and Ma Shan Zheng (OFL, brush).
Every character used in src/v6/* and the world table is included, so no frame can ever fall back to another font."""
import glob, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "public", "fonts6")
SRC = "/Volumes/DevSSD/BuildCache/home-tools/fonts"
BRUSH = "/Volumes/DevSSD/tmp/pop5/fonts/MaShanZheng.ttf"
os.makedirs(OUT, exist_ok=True)
text = ""
for p in glob.glob(os.path.join(ROOT, "src", "v6", "*.ts*")) + glob.glob(os.path.join(ROOT, "src", "v6", "map_*.json")):
    text += open(p, encoding="utf8").read()
chars = {c for c in text if ord(c) > 0x7F} | {chr(i) for i in range(0x20, 0x7F)}
chars |= set("０１２３４５６７８９，。、；：？！“”‘’（）《》·—…→−×≈＞")
uni = sorted(ord(c) for c in chars)

def build(src, out, wght=None):
    f = TTFont(src)
    if wght is not None and "fvar" in f:
        f = instancer.instantiateVariableFont(f, {"wght": wght})
    o = subset.Options()
    o.flavor = "woff2"
    o.layout_features = ["*"]
    o.name_IDs = ["*"]
    o.notdef_outline = True
    s = subset.Subsetter(options=o)
    s.populate(unicodes=uni)
    s.subset(f)
    f.flavor = "woff2"
    f.save(out)
    have = set(f.getBestCmap().keys())
    miss = [chr(u) for u in uni if u not in have and u > 0x7F]
    print(os.path.basename(out), os.path.getsize(out) // 1024, "KB", "missing:", "".join(miss)[:80])

for w in (500, 700, 900):
    build(f"{SRC}/NotoSerifSC.ttf", f"{OUT}/serif-{w}.woff2", w)
for w in (500, 900):
    build(f"{SRC}/NotoSansSC.ttf", f"{OUT}/sans-{w}.woff2", w)
build(BRUSH, f"{OUT}/brush.woff2")
print(len(uni), "code points")
