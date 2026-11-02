"""Static, subset font files for the film: python tools/fonts.py <dir-with-variable-fonts>
Instantiates Noto Sans SC / Noto Serif SC / JetBrains Mono (SIL OFL 1.1) at fixed weights and keeps only the
characters that appear in src/ (plus ASCII and common punctuation). Output: public/fonts/*.woff2"""
import glob, io, os, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

src_dir = sys.argv[1]
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
text = ""
for f in glob.glob(os.path.join(here, "src", "**", "*.*"), recursive=True):
    if f.endswith((".ts", ".tsx", ".json")):
        text += open(f, encoding="utf-8").read()
chars = set(ch for ch in text if ord(ch) > 0x2000)
chars |= set(chr(c) for c in range(0x20, 0x7F))
chars |= set("，。、：；！？“”‘’（）《》「」…—·0123456789％")
print(len(chars), "characters")
out = os.path.join(here, "public", "fonts")
os.makedirs(out, exist_ok=True)
JOBS = [
    ("NotoSansSC.ttf", "sans", [300, 400, 500, 700]),
    ("NotoSerifSC.ttf", "serif", [400, 600, 900]),
    ("JetBrainsMono.ttf", "mono", [400, 700]),
]
for fn, name, weights in JOBS:
    for w in weights:
        f = TTFont(os.path.join(src_dir, fn))
        f = instancer.instantiateVariableFont(f, {"wght": w})
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]
        sub = subset.Subsetter(opts)
        sub.populate(text="".join(chars))
        sub.subset(f)
        p = os.path.join(out, f"{name}-{w}.woff2")
        f.flavor = "woff2"
        f.save(p)
        print(p, os.path.getsize(p))
