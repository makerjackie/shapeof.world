"""Compare band balance of two WAVs: python bands.py a.wav b.wav [start end]"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import welch
BANDS = [(20, 60), (60, 120), (120, 250), (250, 500), (500, 1000), (1000, 2000), (2000, 4000), (4000, 8000), (8000, 16000)]
def bands(p, a, b):
    sr, y = wavfile.read(p)
    y = y.astype(np.float64)
    if y.ndim > 1: y = y.mean(1)
    y = y[int(a * sr):int(b * sr)]
    y /= np.sqrt((y ** 2).mean())
    f, P = welch(y, sr, nperseg=8192)
    return [10 * np.log10(P[(f >= lo) & (f < hi)].sum() + 1e-12) for lo, hi in BANDS]
a0, a1 = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (20, 120)
for p in sys.argv[1:3]:
    print(p.split('/')[-1][:14].ljust(14), ' '.join(f'{v:6.1f}' for v in bands(p, a0, a1)))
print(' ' * 14, ' '.join(f'{lo:>6d}' for lo, hi in BANDS))
