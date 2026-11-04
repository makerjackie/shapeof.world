# Rank generated scores by how well their loudness follows the film's sections (numpy only).
# usage: python3 tools/scorefit.py a.mp3 b.mp3 ...
import subprocess, sys, numpy as np
SR = 11025
# film sections (seconds): (t0, t1, target level) 1 = full, 0 = quiet
TARGET = [(0, 5.9, 0.8), (5.9, 8.7, 0.0), (8.7, 109.2, 1.0), (109.2, 131.5, 0.35), (131.5, 152.3, 1.0), (152.3, 164.4, 0.3), (164.4, 166.5, 0.9), (166.5, 170, 0.0)]
def lvl(t):
    for a, b, v in TARGET:
        if a <= t < b: return v
    return 0
for f in sys.argv[1:]:
    raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    ts = np.arange(0, len(x) / SR - 1, 1.0)
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[int(t * SR):int((t + 1) * SR)] ** 2)) + 1e-9) for t in ts])
    db = np.clip(db, -40, 0)
    tg = np.array([lvl(t + 0.5) for t in ts])
    c = np.corrcoef(db, tg)[0, 1]
    seg = lambda a, b: db[(ts >= a) & (ts < b)].mean()
    print(f"{f.split('/')[-1]:10s} dur {len(x)/SR:6.1f} corr {c:5.2f} | open {seg(0,5.9):6.1f} rewind {seg(6,8.7):6.1f} body {seg(9,109):6.1f} war {seg(110,131):6.1f} boom {seg(132,152):6.1f} outro {seg(153,164):6.1f}")
