"""Shared synthesised sounds (same recipes as tools/sfx.py)."""
import numpy as np
from scipy.signal import butter, sosfilt
SR = 48000
rng = np.random.default_rng(7)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, f): return sosfilt(butter(2, f, "lowpass", fs=SR, output="sos"), x)
def hp(x, f): return sosfilt(butter(2, f, "highpass", fs=SR, output="sos"), x)
def env(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def boom(dist=1.0, length=2.2):
    n = int(length * SR); t = np.arange(n) / SR; noise = rng.standard_normal(n)
    thump = np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 18)) * t) * env(n, 0.004, 0.18)
    return (thump * 0.9 + lp(noise, 380 / dist) * env(n, 0.01, 0.55) * 0.9 + hp(noise, 1500) * env(n, 0.001, 0.03) * 0.4 / dist ** 2) / dist
def whoosh(length, f0, f1, gain=1.0):
    n = int(length * SR); t = np.arange(n) / SR; noise = rng.standard_normal(n); out = np.zeros(n); seg = 2048
    for k in range(0, n, seg):
        f = f0 + (f1 - f0) * (k / n); out[k:k + seg] = bp(noise[k:k + seg + 512], max(80, f * 0.7), f * 1.3)[: len(out[k:k + seg])]
    return out * np.sin(np.pi * t / length) ** 1.5 * gain
def buzz(length, f=170, wob=6, gain=1.0, fade=0.3):
    n = int(length * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.03 * np.sin(2 * np.pi * wob * t))) / SR
    s = sum(np.sin(k * ph) / k for k in range(1, 9))
    s = bp(s, 120, 3600) * 0.5 + bp(rng.standard_normal(n), 2000, 6000) * 0.03
    return s * np.minimum(1, np.minimum(t / fade, (length - t) / fade)) * gain
def tick(f=2200):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.006)
def wind(length, gain=1.0):
    n = int(length * SR); t = np.arange(n) / SR
    return lp(rng.standard_normal(n), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t + 1)) * np.minimum(1, np.minimum(t / 2, (length - t) / 2)) * gain
def static(length, gain=1.0):
    n = int(length * SR); return hp(rng.standard_normal(n), 800) * gain
class Placer:
    def __init__(self, buf): self.buf = buf
    def put(self, t, sig, gain=1.0, pan=0.0):
        i = int(t * SR); N = len(self.buf)
        if i >= N: return
        sig = sig[: N - i] * gain; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.buf[i:i + len(sig), 0] += sig * l * 1.41; self.buf[i:i + len(sig), 1] += sig * r * 1.41
