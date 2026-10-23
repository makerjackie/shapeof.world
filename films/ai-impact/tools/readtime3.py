# Reading-time audit for SCRIPT.md (v3): python tools/readtime3.py SCRIPT.md
import io, re, sys
BAR = 4 * 60 / 111.62
CPS = 30
PUN = set("，。？！；：、“”\"'（）()·—…《》,.?!;: ")
def reading_units(s):
    s2 = re.sub(r"[A-Za-z]+", "WW", s)       # an English word reads like 2 characters
    s2 = re.sub(r"[0-9][0-9,.]*", "NN", s2)  # a number reads like 2 characters
    return sum(1 for ch in s2 if ch not in PUN)
s = io.open(sys.argv[1], encoding="utf-8").read()
body = s.split("## 逐镜头", 1)[1].split("## 声音", 1)[0]
bad = 0
for line in body.splitlines():
    m = re.match(r"^\| (\d+) \| ([\d.]+)–([\d.]+) \| (.*)$", line)
    if not m: continue
    n, b0, b1 = int(m.group(1)), float(m.group(2)), float(m.group(3))
    cells = [c.strip() for c in m.group(4).rstrip().rstrip("|").split(" | ")]
    txt = (cells[1] if len(cells) > 1 else "").replace("**", "").strip(" |")
    if not txt or "MakerJackie" in txt or n == 5: continue
    parts = [p.strip() for p in txt.split("/") if p.strip()]
    allc = "".join(parts)
    need = len(allc) / CPS + 0.22 + max(1.2, 0.6 + 0.15 * reading_units(allc))
    avail = (b1 - b0) * BAR - 0.05
    if need > avail: bad += 1
    print(f"{'OK ' if need <= avail else 'BAD'} #{n:2d} bars {b1-b0:.0f} avail {avail:4.2f} need {need:4.2f}  {' / '.join(parts)}")
print("bad:", bad)
