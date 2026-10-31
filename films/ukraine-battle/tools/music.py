"""Builds public/music.wav from the two library tracks (music.shapeof.world, not in Git).
A = 暗影 · 合成器浪潮 (lib-synthwave-suspense), 100 BPM, bar 2.4 s, first downbeat 0.12 s.
    bars 0–28, then 21–28 twice (seam chroma 0.999), then 29–67, fade out — 0 to ~202 s.
B = 暗影 · 氛围电子 (lib-ambient-suspense) from 24 s to its own ending, entering at film 212 s.
usage: python tools/music.py <A.mp3-as-wav> <B.wav> <out.wav>"""
import sys, numpy as np
from scipy.io import wavfile
A_PATH, B_PATH, OUT = sys.argv[1:4]
SR = 48000
def load(p):
    sr, y = wavfile.read(p); assert sr == SR, sr
    y = y.astype(np.float32) / (32768.0 if y.dtype == np.int16 else 1.0)
    return y if y.ndim == 2 else np.stack([y, y], 1)
A, B = load(A_PATH), load(B_PATH)
bar = lambda k: 0.12 + 2.4 * k
def seg(y, a, b): return y[int(round(a * SR)):int(round(b * SR))]
def splice(parts, xf=0.012):
    n = int(xf * SR); out = parts[0].copy()
    for p in parts[1:]:
        w = np.linspace(0, 1, n)[:, None]
        mid = out[-n:] * np.cos(w * np.pi / 2) + p[:n] * np.sin(w * np.pi / 2)
        out = np.concatenate([out[:-n], mid, p[n:]])
    return out
a = splice([seg(A, 0, bar(29)), seg(A, bar(21), bar(29)), seg(A, bar(21), bar(29)), seg(A, bar(29), bar(68))])
fo = int(4.0 * SR); a[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
b = seg(B, 24.0, len(B) / SR)
fi = int(1.5 * SR); b[:fi] *= np.linspace(0, 1, fi)[:, None]
total = int(364 * SR)
out = np.zeros((total, 2), np.float32)
out[:len(a)] += a[:total]
s = int(212.0 * SR); e = min(total, s + len(b)); out[s:e] += b[: e - s] * 1.05
print("A ends", len(a) / SR, "B ends", (s + len(b)) / SR)
wavfile.write(OUT, SR, (np.clip(out, -1, 1) * 32767).astype(np.int16))
