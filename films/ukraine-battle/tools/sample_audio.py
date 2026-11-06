"""Audio for the three 10 s style samples. usage: python tools/sample_audio.py <music-dir> <public-dir>"""
import sys, importlib.util, numpy as np
from scipy.io import wavfile
MD, PUB = sys.argv[1:3]
SR = 48000
spec = importlib.util.spec_from_file_location("sfxlib", __file__.replace("sample_audio.py", "sfxlib.py")); L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
def load(p):
    sr, y = wavfile.read(p); y = y.astype(np.float32) / 32768.0
    return y if y.ndim == 2 else np.stack([y, y], 1)
def seg(y, a, n): return y[int(a * SR): int(a * SR) + n].copy()
N = 10 * SR
def finish(name, mus, fx, mg=1.0):
    out = mus * mg + np.tanh(fx * 1.4) / 1.4 * 0.8
    f = int(0.25 * SR); out[-f:] *= np.linspace(1, 0, f)[:, None]
    pk = np.abs(out).max(); out *= 0.89 / max(pk, 1e-6)
    wavfile.write(f"{PUB}/{name}", SR, (out * 32767).astype(np.int16))
A = load(f"{MD}/A48.wav"); B = load(f"{MD}/B48.wav"); C = load(f"{MD}/C48.wav")
# A: synthwave peak (bar 32 = 76.92 s) ; drone hum, FPV whine rising, static, hit
fx = np.zeros((N, 2), np.float32); P = L.Placer(fx)
P.put(0.0, L.buzz(3.5, 190, 5, 0.10))
whine = L.buzz(3.7, 330, 11, 0.16); whine *= np.linspace(0.4, 1.4, len(whine)); P.put(3.35, whine)
P.put(3.35, L.whoosh(3.6, 500, 3800, 0.2))
P.put(6.98, L.static(0.35, 0.5))
P.put(7.25, L.boom(1.2, 2.6), 0.6)
mus = seg(A, 76.92, N); mus[int(6.98 * SR):int(7.3 * SR)] *= 0.15
finish("sample-a.wav", mus, fx, 0.8)
# B: ambient-suspense epic part; distant artillery
fx = np.zeros((N, 2), np.float32); P = L.Placer(fx)
for i in range(10):
    ti = (i * 0.97 + 0.3) % 10
    P.put(ti, L.boom(2.2 + (i % 3) * 0.4, 2.6), 0.45, np.sin(i * 2.1) * 0.7)
P.put(0, L.wind(10, 0.07))
finish("sample-b.wav", seg(B, 118.0, N), fx, 1.0)
# C: orchestral motion, loud part; ticks on the counters
fx = np.zeros((N, 2), np.float32); P = L.Placer(fx)
for at in [0.6, 1.1, 1.6, 4.8, 5.4, 6.3, 7.0, 7.6, 8.2, 8.8]: P.put(at, L.tick(1900) * 2.5, 0.25)
P.put(3.1, L.whoosh(1.6, 2600, 300, 0.25))
finish("sample-c.wav", seg(C, 108.0, N), fx, 1.0)
print("ok")
