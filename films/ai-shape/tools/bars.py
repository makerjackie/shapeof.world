# Loudness proxy per bar (RMS dBFS), to check the energy curve of the score.
import sys, wave, numpy as np
BPM = 128; BAR = 240 / BPM
w = wave.open(sys.argv[1]); sr = w.getframerate(); n = w.getnframes()
x = np.frombuffer(w.readframes(n), dtype=np.int16).reshape(-1, w.getnchannels()).astype(np.float32) / 32768
m = x.mean(axis=1)
line = []
for b in range(int(n / sr / BAR)):
    seg = m[int(b * BAR * sr):int((b + 1) * BAR * sr)]
    db = 20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-9)
    line.append(f"{b+1}:{db:.0f}")
print(' '.join(line))
