"""Audio for 样片D (the trench, 10 s). Music: 电荷分裂 (charge-split) from music.shapeof.world, cut so its drop lands
on the cut to the drone's thermal camera and its first hit on the lock-on. Sounds are synthesised (tools/sfxlib.py).
usage: python tools/trench_audio.py <charge-split.wav 48k> <out.wav>"""
import importlib.util
import sys

import numpy as np
from scipy.io import wavfile

SRC, OUT = sys.argv[1:3]
SR = 48000
spec = importlib.util.spec_from_file_location("sfxlib", __file__.replace("trench_audio.py", "sfxlib.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)

T_CUT = 101 / 24  # shot 1 -> 2
T_THERM = (101 + 62) / 24  # shot 2 -> thermal
T_LOCK = T_THERM + 30 / 24  # zoom ends, reticle locks
DUR = 10.0
N = int(DUR * SR)


def load(p):
    sr, y = wavfile.read(p)
    assert sr == SR, sr
    y = y.astype(np.float32) / (32768.0 if y.dtype == np.int16 else 1.0)
    return y if y.ndim == 2 else np.stack([y, y], 1)


def rms_t(y, a, b, hop=0.01):
    """time of the steepest RMS drop (drop) between a and b seconds"""
    m = y.mean(1)
    ts = np.arange(a, b, hop)
    r = np.array([np.sqrt((m[int(t * SR): int((t + hop) * SR)] ** 2).mean() + 1e-12) for t in ts])
    return ts, 20 * np.log10(r)


M = load(SRC)
ts, db = rms_t(M, 31.0, 33.0)
DROP = ts[int(np.argmin(np.diff(db))) + 1]
ts, db = rms_t(M, 35.3, 36.8)
HIT = ts[np.argmax(db > -30)]  # the swell into the first hit starts here
PEAK = ts[np.argmax(db > -12)]  # and peaks here
print("drop", DROP, "swell", HIT, "peak", PEAK)


def seg(a, b):
    return M[int(a * SR): int(b * SR)].copy()


def xfade(parts, f=0.02):
    n = int(f * SR)
    out = parts[0]
    for p in parts[1:]:
        w = np.linspace(0, 1, n)[:, None]
        out = np.concatenate([out[:-n], out[-n:] * (1 - w) + p[:n] * w, p[n:]])
    return out


start = DROP - T_THERM
silence = T_LOCK - (PEAK - HIT) - T_THERM
mus = xfade([seg(start, DROP + 0.01), seg(DROP, DROP + silence + 0.02), seg(HIT, HIT + DUR - T_LOCK + (PEAK - HIT) + 0.1)], 0.01)
mus = mus[:N]
fi = int(0.4 * SR)
mus[:fi] *= np.linspace(0, 1, fi)[:, None]

fx = np.zeros((N, 2))
P = L.Placer(fx)
# the field before the cut: wind, distant guns
w = L.wind(T_THERM + 0.5, 1.0)
P.put(0, w[: int(T_THERM * SR)] * np.r_[np.ones(int(T_THERM * SR) - 200), np.linspace(1, 0, 200)], 0.22)
P.put(0.9, L.lp(L.boom(6.0, 2.5), 160), 0.9, -0.5)
P.put(2.6, L.lp(L.boom(5.0, 2.5), 180), 1.0, 0.4)

# the drone: thin whine that grows, passes overhead in shot 2 (pan, slight Doppler), gone at the hard cut
t0 = 1.6
n = int((T_THERM - t0) * SR)
t = np.arange(n) / SR
tt = t + t0
f = 228 - 18 / (1 + np.exp(-(tt - 5.5) * 3))  # pitch falls as it passes
ph = 2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * 11 * t))) / SR
s = sum(np.sin(k * ph) / k ** 0.9 for k in range(1, 12))
s = L.bp(s, 150, 5000) * 0.45 + L.bp(np.random.default_rng(3).standard_normal(n), 2500, 7000) * 0.04
amp = np.clip((tt - t0) / (5.4 - t0), 0, 1) ** 2.2 * np.where(tt < 5.6, 1.0, np.exp(-(tt - 5.6) * 0.5))
amp[-150:] *= np.linspace(1, 0, 150)
pan = np.clip((tt - 4.4) / 2.2, 0, 1) * 1.4 - 0.7
l_, r_ = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
i0 = int(t0 * SR)
fx[i0: i0 + n, 0] += s * amp * l_ * 0.55
fx[i0: i0 + n, 1] += s * amp * r_ * 0.55

# inside the drone's camera: electronics hiss, zoom servo, beeps, lock
P.put(T_THERM, L.static(DUR - T_THERM, 1.0) * np.linspace(1, 0.7, int((DUR - T_THERM) * SR)), 0.012)
P.put(T_THERM + 10 / 24, L.tick(2400), 0.25)
P.put(T_THERM + 10 / 24 + 0.07, L.tick(2400), 0.25)
P.put(T_THERM + 11 / 24, L.whoosh(20 / 24, 400, 1400, 1.0), 0.05)
P.put(T_LOCK, L.tick(1800), 0.4)
P.put(T_LOCK + 0.09, L.tick(1800), 0.4)
P.put(T_LOCK + 0.18, L.tick(1800), 0.4)

out = mus * 0.85 + np.tanh(fx * 1.4) / 1.4
fo = int(0.3 * SR)
out[-fo:] *= np.linspace(1, 0, fo)[:, None]
out *= 0.89 / max(np.abs(out).max(), 1e-6)
wavfile.write(OUT, SR, (out * 32767).astype(np.int16))
print("wrote", OUT, out.shape[0] / SR)
