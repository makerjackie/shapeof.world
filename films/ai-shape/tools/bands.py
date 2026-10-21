# Octave-band balance of a section, relative to a -4.5 dB/octave "modern mix" tilt.
# Usage: python3 tools/bands.py music/score.wav <from_bar> <to_bar>
import sys, wave, numpy as np
BAR = 240 / 128
w = wave.open(sys.argv[1]); sr = w.getframerate(); n = w.getnframes()
x = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, 2).astype(np.float32).mean(axis=1) / 32768
a, b = int(sys.argv[2]), int(sys.argv[3])
seg = x[int((a - 1) * BAR * sr):int(b * BAR * sr)]
N = 8192; win = np.hanning(N); acc = np.zeros(N // 2 + 1); k = 0
for i in range(0, len(seg) - N, N // 2):
    acc += np.abs(np.fft.rfft(seg[i:i + N] * win)) ** 2; k += 1
f = np.fft.rfftfreq(N, 1 / sr); p = acc / k
centres = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]
db = []
for c in centres:
    m = (f >= c / 2 ** 0.5) & (f < c * 2 ** 0.5)
    db.append(10 * np.log10(p[m].sum() + 1e-12))
ref = db[5]
print('band    level  vs tilt')
for i, c in enumerate(centres):
    tilt = -4.5 * np.log2(c / 1000)
    print(f"{c:>7}Hz {db[i]-ref:+6.1f}  {db[i]-ref-tilt:+6.1f}")
