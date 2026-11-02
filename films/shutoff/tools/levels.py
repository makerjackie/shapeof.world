"""RMS / peak per 2 s window of a wav: python tools/levels.py public/mix.wav"""
import sys
import numpy as np
from scipy.io import wavfile
sr, y = wavfile.read(sys.argv[1]); m = y.mean(1) if y.ndim == 2 else y
w = sr * 2
out = []
for i in range(0, len(m) - w, w):
    s = m[i:i + w]
    out.append(f"{i // sr}:{20*np.log10(np.sqrt(np.mean(s**2))+1e-9):.0f}/{20*np.log10(np.max(np.abs(s))+1e-9):.0f}")
print(" ".join(out))
