"""Tempo, beat grid and per-bar energy of the soundtrack.

Usage: python tools/beats.py <track.wav (mono)> <out.json>
Prints a windowed tempo check (to catch tempo changes) and the RMS of every bar.
"""
import json
import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import stft

wav_path, out_path = sys.argv[1], sys.argv[2]
sr, y = wavfile.read(wav_path)
y = y.astype(np.float32)
y /= np.abs(y).max() + 1e-9

hop = 256
_, _, Z = stft(y, fs=sr, nperseg=2048, noverlap=2048 - hop, boundary=None)
mag = np.log1p(np.abs(Z) * 10)
flux = np.concatenate([[0], np.maximum(0, np.diff(mag, axis=1)).sum(axis=0)])
flux = (flux - flux.mean()) / (flux.std() + 1e-9)
fps = sr / hop
dur = len(y) / sr


def tempo_of(env: np.ndarray) -> float:
    ac = np.correlate(env, env, mode="full")[len(env) - 1 :]
    lags = np.arange(len(ac)) / fps
    m = (lags >= 60 / 170) & (lags <= 60 / 70)
    return 60 / lags[m][np.argmax(ac[m])]


# Windowed tempo: 16 s windows every 8 s.
print("windowed tempo (start s: bpm)")
win = int(16 * fps)
for s in range(0, len(flux) - win, int(8 * fps)):
    print(f"  {s / fps:6.1f}: {tempo_of(flux[s:s + win]):6.2f}")

# Global tempo refined by a fine comb search around the autocorrelation peak.
coarse = tempo_of(flux)
best = (-1e9, coarse, 0.0)
for bpm in np.arange(coarse - 1.5, coarse + 1.5, 0.01):
    period = 60 / bpm
    for off in np.linspace(0, period, 64, endpoint=False):
        idx = np.round(np.arange(off, dur, period) * fps).astype(int)
        idx = idx[idx < len(flux)]
        score = flux[idx].mean()
        if score > best[0]:
            best = (score, bpm, off)
_, bpm, first = best
period = 60 / bpm
print(f"global bpm {bpm:.2f}, first beat {first:.3f}s, duration {dur:.2f}s")

# Phase drift check: best local offset per 16-beat block relative to the grid.
print("phase drift per 16 beats (ms)")
beats = np.arange(first, dur, period)
for b0 in range(0, len(beats) - 16, 16):
    seg = beats[b0 : b0 + 16]
    shifts = np.linspace(-0.12, 0.12, 49)
    scores = [flux[np.clip(np.round((seg + d) * fps).astype(int), 0, len(flux) - 1)].mean() for d in shifts]
    print(f"  beat {b0:4d} ({seg[0]:6.1f}s): {shifts[int(np.argmax(scores))] * 1000:+5.0f}")

# RMS per bar (4 beats).
bars = []
for i in range(0, len(beats) - 4, 4):
    a, b = int(beats[i] * sr), int(beats[i + 4] * sr)
    bars.append(float(np.sqrt(np.mean(y[a:b] ** 2))))
bars = np.array(bars)
rel = bars / bars.max()
print("rms per bar (relative):")
for i in range(0, len(rel), 8):
    print(f"  bar {i:3d}: " + " ".join(f"{v:.2f}" for v in rel[i : i + 8]))

json.dump(
    {
        "duration": round(dur, 3),
        "bpm": round(float(bpm), 3),
        "firstBeat": round(float(first), 4),
        "barEnergy": [round(float(v), 3) for v in rel],
    },
    open(out_path, "w"),
    indent=1,
)
