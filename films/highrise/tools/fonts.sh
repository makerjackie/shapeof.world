#!/bin/bash
# Subsets Noto Sans SC and Noto Serif SC (OFL, variable weight) to exactly the characters the film's source uses,
# so every frame renders from local fonts (Google Fonts' 300 lazy chunks once left a tofu box in a frame).
# Sources: ~/tools/fonts/NotoSansSC.ttf, NotoSerifSC.ttf from github.com/google/fonts (ofl/notosanssc, ofl/notoserifsc).
cd "$(dirname "$0")/.." || exit 1
mkdir -p public/fonts
PY=~/.venvs/shapeof-films/bin/python
$PY - <<'PYEOF'
import glob, string
chars = set(string.printable)
for f in glob.glob("src/**/*.ts*", recursive=True):
    chars |= set(open(f, encoding="utf-8").read())
chars |= set("０１２３４５６７８９，。：；！？“”‘’（）《》、—…·")
open("/tmp/hr-chars.txt", "w", encoding="utf-8").write("".join(sorted(c for c in chars if c.isprintable())))
print(len(chars), "characters")
PYEOF
for f in NotoSansSC NotoSerifSC; do
  ~/.venvs/shapeof-films/bin/pyftsubset ~/tools/fonts/$f.ttf --text-file=/tmp/hr-chars.txt --flavor=woff2 --layout-features='*' --output-file=public/fonts/$f.woff2
done
ls -l public/fonts
