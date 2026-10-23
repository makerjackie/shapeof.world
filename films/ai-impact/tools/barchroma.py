"""Per-bar chroma and RMS of a track on a fixed bar grid, plus loop-candidate scores.

Usage: python tools/barchroma.py <mono.wav> <phase s> <bar s> [first bar] [last bar]
For each candidate loop (repeat bars a..a+L-1, i.e. jump from the start of bar a+L back to bar a) it prints:
  in  = chroma cosine of bar a+L (what would have played) vs bar a (what plays instead)
  pre = chroma cosine of bar a+L-1 vs bar a-1 (the bar heard just before the seam, in each version)
  rms = RMS of bar a+L vs bar a (dB difference)
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import stft

path, phase, bar = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
b0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0
b1 = int(sys.argv[5]) if len(sys.argv) > 5 else 999

sr, y = wavfile.read(path)
y = y.astype(np.float32)
if y.ndim > 1:
    y = y.mean(axis=1)
y /= np.abs(y).max() + 1e-9
f, tt, Z = stft(y, fs=sr, nperseg=4096, noverlap=4096 - 1024, boundary=None)
mag = np.abs(Z)
# chroma from 55 Hz to 4 kHz
keep = (f > 55) & (f < 4000)
pc = np.round(12 * np.log2(f[keep] / 440.0)).astype(int) % 12
C = np.zeros((12, mag.shape[1]))
for k in range(12):
    C[k] = mag[keep][pc == k].sum(axis=0)

nb = int((len(y) / sr - phase) // bar)
chroma, rms = [], []
for b in range(nb):
    a, z = phase + b * bar, phase + (b + 1) * bar
    m = (tt >= a) & (tt < z)
    v = C[:, m].mean(axis=1)
    chroma.append(v / (np.linalg.norm(v) + 1e-9))
    seg = y[int(a * sr) : int(z * sr)]
    rms.append(20 * np.log10(np.sqrt((seg**2).mean()) + 1e-9))
chroma = np.array(chroma)

print("bar  start   rms dB")
for b in range(max(0, b0 - 1), min(nb, b1 + 2)):
    print(f"{b:3d}  {phase + b * bar:6.2f}  {rms[b]:6.1f}")

cos = lambda i, j: float(chroma[i] @ chroma[j])
print("\nloops (a, length): in  pre  dRMS")
for L in (4, 8):
    for a in range(max(1, b0), min(nb - L, b1 + 1)):
        print(f"  {a:2d}..{a + L - 1:2d}  in {cos(a + L, a):.3f}  pre {cos(a + L - 1, a - 1):.3f}  dRMS {rms[a + L] - rms[a]:+.1f}")
