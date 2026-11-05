# Fit a strict beat grid to a track and print its loudness by bar (numpy only).
# usage: python3 tools/beatfit.py <audio> [bpm_lo bpm_hi]
import subprocess, sys, numpy as np
SR = 22050
raw = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True).stdout
x = np.frombuffer(raw, np.float32)
H = 256; N = 1024
win = np.hanning(N)
fr = np.lib.stride_tricks.sliding_window_view(x, N)[::H] * win
S = np.abs(np.fft.rfft(fr, axis=1))
L = np.log1p(S * 10)
flux = np.maximum(0, np.diff(L, axis=0)).sum(1)
flux = np.concatenate([[0], flux]); flux -= np.convolve(flux, np.ones(32) / 32, "same"); flux = np.maximum(flux, 0)
fps = SR / H
lo, hi = (float(sys.argv[2]), float(sys.argv[3])) if len(sys.argv) > 3 else (110, 150)
dur = len(x) / SR
def score(P, ph):
    ts = np.arange(ph, dur, P); idx = (ts * fps).astype(int); idx = idx[idx < len(flux)]
    return flux[idx].mean()
best = None
for bpm in np.arange(lo, hi, 0.02):
    P = 60 / bpm
    for ph in np.arange(0, P, 0.005):
        s = score(P, ph)
        if best is None or s > best[0]: best = (s, bpm, P, ph)
s, bpm, P, ph = best
print(f"dur {dur:.2f}  bpm {bpm:.2f}  P {P:.4f}  phase {ph:.3f}  score {s:.2f}")
# local check: best phase per 20 s window (drift)
for w0 in range(0, int(dur) - 10, 20):
    seg = [(score_l, p) for p in np.arange(0, P, 0.005) for score_l in [np.mean([flux[int(t * fps)] for t in np.arange(w0 + ((p - w0) % P), min(dur, w0 + 20), P) if int(t * fps) < len(flux)])]]
    sl, pl = max(seg)
    print(f"  {w0:3d}-{w0+20:3d}s phase {pl:.3f} (global {ph:.3f})")
# loudness by bar (4 beats) -> structure
rms = lambda a, b: 20 * np.log10(np.sqrt(np.mean(x[int(a * SR):int(b * SR)] ** 2)) + 1e-9)
out = []
t = ph
while t < dur:
    out.append(f"{t:6.1f}:{rms(t, t + 4 * P):5.1f}")
    t += 4 * P
for i in range(0, len(out), 8): print("  ".join(out[i:i + 8]))
