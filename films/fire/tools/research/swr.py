# Historical safe-withdrawal backtest on Damodaran's US annual returns (1928-2025).
# Portfolio: 50% S&P 500 (incl. dividends) + 50% 10-year T-bond, rebalanced yearly.
# Withdrawal: a fixed share of the starting pot in year 1, then the same real amount every year
# (taken at the start of each year). Everything is computed in real (CPI-adjusted) terms.
import json, sys
import pandas as pd

x = pd.ExcelFile('histretSP.xls')
r = pd.read_excel(x, 'Returns by year', header=None)
rows = r.iloc[20:118, :5]
years = [int(v) for v in rows[0]]
sp = dict(zip(years, rows[1].astype(float)))
tb = dict(zip(years, rows[4].astype(float)))
inf = pd.read_excel(x, 'Inflation Rate', header=None).iloc[11:, :3]
cpi = {int(a): float(c) for a, c in zip(inf[0], inf[2])}
Y0, Y1 = min(years), max(years)

def real_ret(y, w_stock=0.5):
    nom = w_stock * sp[y] + (1 - w_stock) * tb[y]
    return (1 + nom) / (1 + cpi[y]) - 1

def run(start, horizon, rate, w_stock=0.5, rets=None):
    pot, path = 100.0, [100.0]
    seq = rets if rets is not None else [real_ret(y, w_stock) for y in range(start, start + horizon)]
    for i, g in enumerate(seq):
        pot -= rate * 100
        if pot <= 0:
            path.append(0.0)
            return 0.0, path, i + 1  # ran out in year i+1
        pot *= 1 + g
        path.append(pot)
    return pot, path, None

def table(horizon, rate, w=0.5):
    res = []
    for s in range(Y0, Y1 - horizon + 2):
        end, path, fail = run(s, horizon, rate, w)
        res.append((s, end, fail))
    ok = sum(1 for _, e, f in res if f is None)
    return res, ok, len(res)

out = {}
for h in (30, 40, 50):
    for rate in (0.03, 0.035, 0.04, 0.045, 0.05):
        res, ok, n = table(h, rate)
        fails = [(s, f) for s, e, f in res if f is not None]
        out[f'{h}y@{rate}'] = dict(ok=ok, n=n, fails=fails)
        print(f'{h}y  {rate:.3f}: {ok}/{n} = {ok/n:.1%}  fails: {fails}')

# Worst 30y start at 4%: lowest ending pot
res, ok, n = table(30, 0.04)
worst = sorted(res, key=lambda t: (t[2] if t[2] else 999, t[1]))[:6]
print('worst 30y @4%:', [(s, round(e, 1), f) for s, e, f in worst])
best = sorted(res, key=lambda t: -t[1])[:5]
print('best 30y @4%:', [(s, round(e, 1)) for s, e, f in best])
ends = sorted(e for s, e, f in res)
print('median ending pot (start=100):', round(ends[len(ends)//2], 1))

# Paths for every 30y start (for the skyline shot)
paths = {s: [round(v, 2) for v in run(s, 30, 0.04)[1]] for s in range(Y0, Y1 - 30 + 2)}
json.dump(paths, open('paths30_4pct.json', 'w'))

# Safe max withdrawal per start (30y)
def safemax(start, horizon=30):
    lo, hi = 0.0, 0.2
    for _ in range(50):
        mid = (lo + hi) / 2
        if run(start, horizon, mid)[2] is None: lo = mid
        else: hi = mid
    return lo
sm = {s: safemax(s) for s in range(Y0, Y1 - 30 + 2)}
w = min(sm, key=sm.get)
print('SAFEMAX 30y min:', w, round(sm[w]*100, 2), '%; sorted lowest:', sorted(((round(v*100,2), s) for s, v in sm.items()))[:6])

# Sequence-of-returns: same real returns, forward vs reversed
for s in (1966, 1968, 1969, 1973, 1929, 1937):
    if s + 30 - 1 > Y1: continue
    seq = [real_ret(y) for y in range(s, s + 30)]
    f_end, f_path, f_fail = run(s, 30, 0.04, rets=seq)
    b_end, b_path, b_fail = run(s, 30, 0.04, rets=seq[::-1])
    geo = 1
    for g in seq: geo *= 1 + g
    print(f'seq {s}: fwd end {f_end:.1f} fail {f_fail} | rev end {b_end:.1f} fail {b_fail} | geo avg real {geo**(1/30)-1:.2%}; first5 {[round(v*100) for v in seq[:5]]}')

# Find the window with the biggest forward/reverse contrast where forward fails
cands = []
for s in range(Y0, Y1 - 30 + 2):
    seq = [real_ret(y) for y in range(s, s + 30)]
    f = run(s, 30, 0.04, rets=seq); b = run(s, 30, 0.04, rets=seq[::-1])
    cands.append((s, round(f[0], 1), f[2], round(b[0], 1), b[2]))
print('contrast (fwd fail):', [c for c in cands if c[2]])
print('contrast top by rev-fwd:', sorted(cands, key=lambda c: c[1] - c[3])[:6])

# Savings rate -> years to reach the target (start from 0, save at year end)
def years_to(sr, mult, real=0.05):
    spend = 1 - sr; target = mult * spend; pot = 0.0; y = 0
    while pot < target and y < 200:
        pot = pot * (1 + real) + sr; y += 1
    # fractional
    return y
for real in (0.03, 0.04, 0.05):
    print(f'real {real}:', {f'{int(sr*100)}%': (years_to(sr, 25, real), years_to(sr, 33.3, real)) for sr in (0.1, 0.2, 0.3, 0.5, 0.7)})

json.dump(dict(out=out, safemax={s: round(v, 4) for s, v in sm.items()}, cands=cands), open('swr_results.json', 'w'))
