# Compare score candidates: tempo (early / late), grid stability, structure fit, hit density, beat clarity (numpy only).
# usage: python3 tools/excite.py a.mp3 b.wav ...
import subprocess, sys, numpy as np
SR = 22050; H = 256; N = 1024; FPS = SR / H
TARGET = [(0, 5.9, 0.8), (5.9, 8.7, 0.0), (8.7, 109.2, 1.0), (109.2, 131.5, 0.35), (131.5, 152.3, 1.0), (152.3, 164.4, 0.3), (164.4, 166.5, 0.9), (166.5, 999, 0.0)]
def load(f):
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32)
def flux_of(x):
    fr = np.lib.stride_tricks.sliding_window_view(x, N)[::H] * np.hanning(N)
    L = np.log1p(np.abs(np.fft.rfft(fr, axis=1)) * 10)
    fl = np.concatenate([[0], np.maximum(0, np.diff(L, axis=0)).sum(1)])
    base = np.convolve(fl, np.ones(64) / 64, "same")
    return np.maximum(fl - base, 0)
def fit(fl, a, b, lo=110, hi=150):
    best = (0, 0, 0)
    seg = fl[int(a * FPS):int(b * FPS)]
    for bpm in np.arange(lo, hi, 0.05):
        P = 60 / bpm
        for ph in np.arange(0, P, 0.01):
            idx = ((np.arange(ph, b - a, P)) * FPS).astype(int); idx = idx[idx < len(seg)]
            s = seg[idx].mean()
            if s > best[0]: best = (s, bpm, ph)
    return best
for f in sys.argv[1:]:
    x = load(f); dur = len(x) / SR; fl = flux_of(x)
    s1, bpm1, ph1 = fit(fl, 10, 100)
    s2, bpm2, ph2 = fit(fl, 133, 150)
    P = 60 / bpm1
    # stability: share of 10 s windows whose best phase stays on the global grid
    ok = 0; n = 0
    for w0 in range(10, 100, 10):
        seg = fl[int(w0 * FPS):int((w0 + 10) * FPS)]
        def sc(ph): idx = ((np.arange(ph, 10, P)) * FPS).astype(int); idx = idx[idx < len(seg)]; return seg[idx].mean()
        phs = np.arange(0, P, 0.01); bp = phs[np.argmax([sc(p) for p in phs])]
        g = (ph1 + 10 - w0) % P if False else ((ph1 - (w0 - 10)) % P)
        d = min(abs(bp - g), P - abs(bp - g)); ok += d < 0.03; n += 1
    # beat clarity: flux on the grid vs between
    t = np.arange(10 + ph1, 100, P); on = fl[(t * FPS).astype(int)].mean(); off = fl[((t + P / 2) * FPS).astype(int)].mean()
    # hits: strong onsets per minute (body)
    body = fl[int(9 * FPS):int(min(dur, 150) * FPS)]
    thr = np.median(body) + 4 * np.std(body)
    pk = (body[1:-1] > thr) & (body[1:-1] >= body[:-2]) & (body[1:-1] >= body[2:])
    hits = pk.sum() / ((len(body) / FPS) / 60)
    # structure fit
    ts = np.arange(0, dur - 1, 1.0)
    db = np.clip([20 * np.log10(np.sqrt(np.mean(x[int(t0 * SR):int((t0 + 1) * SR)] ** 2)) + 1e-9) for t0 in ts], -40, 0)
    tg = [next(v for a, b, v in TARGET if a <= t0 + 0.5 < b) for t0 in ts]
    corr = np.corrcoef(db, tg)[0, 1]
    rng = np.percentile(db, 90) - np.percentile(db, 20)
    print(f"{f.split('/')[-1]:22s} dur {dur:5.1f} bpm {bpm1:6.2f} late {bpm2:6.2f} grid {ok}/{n} clarity {on/max(off,1e-6):4.1f} hits/min {hits:5.1f} dyn {rng:4.1f}dB corr {corr:5.2f}")
