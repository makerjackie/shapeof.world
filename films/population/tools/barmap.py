# Per-bar map of a strict-tempo track: loudness (dB), drum activity (high-band flux) and low end, to plan an edit.
# usage: python3 tools/barmap.py <audio> <beat P> <phase>
import subprocess, sys, numpy as np
SR = 22050
f, P, ph = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", f, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.float32)
H, N = 256, 1024
fr = np.lib.stride_tricks.sliding_window_view(x, N)[::H] * np.hanning(N)
S = np.abs(np.fft.rfft(fr, axis=1))
fq = np.fft.rfftfreq(N, 1 / SR)
hi = np.maximum(0, np.diff(np.log1p(S[:, fq > 4000] * 10), axis=0)).sum(1)
lo = np.log1p(S[:, fq < 120]).mean(1)
fps = SR / H
bars = []
t = ph
while t + 4 * P <= len(x) / SR:
    a, b = int(t * SR), int((t + 4 * P) * SR)
    db = 20 * np.log10(np.sqrt(np.mean(x[a:b] ** 2)) + 1e-9)
    ia, ib = int(t * fps), int((t + 4 * P) * fps)
    bars.append((t, db, hi[ia:ib].mean(), lo[ia:ib].mean()))
    t += 4 * P
hm = max(b[2] for b in bars); lm = max(b[3] for b in bars)
for i, (t, db, h, l) in enumerate(bars):
    print(f"bar {i:3d} {t:6.2f}s  {db:6.1f}dB  drums {'#' * int(12 * h / hm):12s} low {'#' * int(8 * l / lm):8s}")
