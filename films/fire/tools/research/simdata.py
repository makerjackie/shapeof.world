# Builds src/data/sim.json for the film from Damodaran's US annual returns (1928-2025).
# Same method as research/swr.py: 50% S&P 500 (with dividends) + 50% 10-year Treasury, rebalanced yearly; the
# year's withdrawal is taken at the start of each year and held constant in real terms; all values are real.
# Values are in bricks (one brick = one month of spending): 300 bricks = a 4% start, 400 bricks = a 3% start.
import json, sys
import pandas as pd

src, out = sys.argv[1], sys.argv[2]
x = pd.ExcelFile(src)
r = pd.read_excel(x, 'Returns by year', header=None).iloc[20:118, :5]
years = [int(v) for v in r[0]]
sp = dict(zip(years, r[1].astype(float)))
tb = dict(zip(years, r[4].astype(float)))
inf = pd.read_excel(x, 'Inflation Rate', header=None).iloc[11:, :3]
cpi = {int(a): float(c) for a, c in zip(inf[0], inf[2])}
Y0, Y1 = min(years), max(years)
real = {y: (1 + 0.5 * sp[y] + 0.5 * tb[y]) / (1 + cpi[y]) - 1 for y in years}

def path(start, horizon, bricks, rets=None):
    rets = rets if rets is not None else [real[y] for y in range(start, start + horizon)]
    pot, p, fail = float(bricks), [float(bricks)], None
    for i, g in enumerate(rets):
        pot -= 12
        if pot <= 0:
            fail = i + 1
            p.append(0.0)
            break
        pot *= 1 + g
        p.append(pot)
    return [round(v, 2) for v in p], fail

def windows(horizon, bricks):
    d = {}
    for s in range(Y0, Y1 - horizon + 2):
        p, f = path(s, horizon, bricks)
        d[s] = {"p": p, "fail": f}
    return d

p30 = windows(30, 300)
p50a = windows(50, 300)
p50b = windows(50, 400)
seq = [real[y] for y in range(1966, 1996)]
fwd, ff = path(1966, 30, 300, seq)
rev, rf = path(1966, 30, 300, seq[::-1])
geo = 1.0
for g in seq: geo *= 1 + g

# Savings lanes: years to reach 400 bricks (x400 monthly spending) saving a share s of pay, 4% real, from zero.
# In bricks: spending = (1 - s) of pay, so each year adds 12 * s / (1 - s) bricks.
def lane(s, target=400, g=0.04):
    pot, ys = 0.0, [0.0]
    while pot < target and len(ys) < 120:
        pot = pot * (1 + g) + 12 * s / (1 - s)
        ys.append(round(pot, 2))
    return ys

lanes = {k: lane(v) for k, v in (("half", 0.5), ("third", 0.3), ("tenth", 0.1))}
data = dict(
    years=[Y0, Y1],
    p30=p30, p50_300=p50a, p50_400=p50b,
    seq1966=dict(fwd=fwd, fwdFail=ff, rev=rev, revFail=rf, geo=round(geo ** (1 / 30) - 1, 4), real=[round(v, 4) for v in seq]),
    lanes=lanes,
    summary=dict(
        ok30=sum(1 for v in p30.values() if v["fail"] is None), n30=len(p30),
        fails30=[s for s, v in p30.items() if v["fail"]],
        ok50_300=sum(1 for v in p50a.values() if v["fail"] is None), n50=len(p50a),
        ok50_400=sum(1 for v in p50b.values() if v["fail"] is None),
        laneYears={k: len(v) - 1 for k, v in lanes.items()},
    ),
)
json.dump(data, open(out, "w"), separators=(",", ":"))
print(json.dumps(data["summary"]), "geo1966", data["seq1966"]["geo"], "fwdFail", ff, "revEnd", rev[-1])
