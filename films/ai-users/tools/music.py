"""Downbeat phase, bar chroma and seamless 4/8-bar repeat points for a track.

Usage: python tools/music.py <mono.wav> <bpm> <firstBeat>
Finds which beat of the bar is the downbeat (strongest low-band onsets), then lists repeat points:
playing bars [i, j) twice is seamless when bar j sounds like bar i and bar j-1 like bar i-1 (chroma cosine).
"""
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import stft

path, bpm, first = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
sr, y = wavfile.read(path)
y = y.astype(np.float32)
y /= np.abs(y).max() + 1e-9
period = 60 / bpm
beats = np.arange(first, len(y) / sr - period, period)

f, t, Z = stft(y, fs=sr, nperseg=4096, noverlap=4096 - 512, boundary=None)
mag = np.abs(Z)
low = mag[(f > 30) & (f < 180)].sum(axis=0)
onset = np.concatenate([[0], np.maximum(0, np.diff(np.log1p(low * 10)))])
fps = sr / 512


def at(sec):
    return onset[min(len(onset) - 1, max(0, int(round(sec * fps))))]


beat_on = np.array([max(at(b + d) for d in np.linspace(-0.03, 0.03, 7)) for b in beats])
phase_score = [beat_on[p::4].mean() for p in range(4)]
down = int(np.argmax(phase_score))
print("downbeat phase scores:", " ".join(f"{s:.3f}" for s in phase_score), "-> phase", down, f"(first downbeat {beats[down]:.3f}s)")

# Chroma per bar from the downbeat on.
pc = np.zeros((12, mag.shape[1]))
valid = f > 55
midi = 69 + 12 * np.log2(f[valid] / 440)
cls = np.mod(np.round(midi), 12).astype(int)
for k in range(12):
    pc[k] = mag[valid][cls == k].sum(axis=0)
bars = beats[down::4]
chroma = []
for a, b in zip(bars[:-1], bars[1:]):
    seg = pc[:, int(a * fps) : int(b * fps)].mean(axis=1)
    chroma.append(seg / (np.linalg.norm(seg) + 1e-9))
chroma = np.array(chroma)
n = len(chroma)
print(f"{n} full bars; bar length {4 * period:.4f}s")


def sim(i, j):
    return float(chroma[i] @ chroma[j])


print("repeat candidates (repeat bars i..j-1; length 4 or 8 bars), score = min(sim(i,j), sim(i-1,j-1)) >= 0.97:")
rows = []
for L in (4, 8, 12, 16):
    for i in range(1, n - L):
        j = i + L
        if j >= n:
            continue
        s = min(sim(i, j), sim(i - 1, j - 1))
        if s >= 0.97:
            rows.append((s, i, j, L))
for s, i, j, L in sorted(rows, reverse=True)[:25]:
    print(f"  bars {i:3d}->{j:3d} (len {L:2d}): {s:.4f}   at {bars[i]:.3f}s / {bars[j]:.3f}s")
