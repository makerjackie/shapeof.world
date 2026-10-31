"""Audio for 样片E (the column in the wheat, 14.5 s). Music: 电荷分裂 (charge-split, music.shapeof.world): its long rise
(~69.8-80 s) runs under the approach and the reveal, its hit at 80 s lands on the mine, then the held tone after 112 s
carries the aftermath. Engines, tracks, the blast and the guns are synthesised (tools/sfxlib.py).
usage: python tools/field_audio.py <charge-split.wav 48k> <out.wav>"""
import importlib.util
import sys

import numpy as np
from scipy.io import wavfile

SRC, OUT = sys.argv[1:3]
SR = 48000
spec = importlib.util.spec_from_file_location("sfxlib", __file__.replace("field_audio.py", "sfxlib.py"))
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
rng = np.random.default_rng(11)

T_B, T_C, T_D = 84 / 24, 204 / 24, 276 / 24
T_EXP = 244 / 24
DUR = 348 / 24
N = int(DUR * SR)


def load(p):
    sr, y = wavfile.read(p)
    assert sr == SR, sr
    y = y.astype(np.float32) / (32768.0 if y.dtype == np.int16 else 1.0)
    return y if y.ndim == 2 else np.stack([y, y], 1)


M = load(SRC)


def seg(a, b):
    return M[int(a * SR): int(b * SR)].copy()


def rms_db(a, b, hop=0.01):
    m = M.mean(1)
    ts = np.arange(a, b, hop)
    return ts, np.array([20 * np.log10(np.sqrt((m[int(t * SR): int((t + hop) * SR)] ** 2).mean()) + 1e-9) for t in ts])


ts, db = rms_db(79.0, 81.0)
HIT = ts[np.argmax(db > db.max() - 6)]  # the hit's attack
print("hit at", HIT)
start = HIT - T_EXP
a = seg(start, HIT + (T_D - T_EXP) + 0.6)
b = seg(112.3, 112.3 + (DUR - T_D) + 0.8)
xf = int(0.6 * SR)
iA = int((T_D - start + start) * SR)  # position of shot D in the output
mus = np.zeros((N + SR, 2), np.float32)
mus[: len(a)] += a
k0 = int(T_D * SR) - xf // 2
w = np.linspace(0, 1, xf)[:, None]
mus[k0: k0 + xf] *= 1 - w
mus[k0 + xf: len(a)] = 0
mus[k0: k0 + len(b)] += b * np.concatenate([w, np.ones((len(b) - xf, 1))])
mus = mus[:N]
fi = int(0.5 * SR)
mus[:fi] *= np.linspace(0, 1, fi)[:, None]

fx = np.zeros((N, 2))
P = L.Placer(fx)


def engine(length, f0=42.0, gain=1.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    fire = f0 * (1 + 0.04 * np.sin(2 * np.pi * 0.7 * t))
    ph = 2 * np.pi * np.cumsum(fire) / SR
    tone = sum(np.sin(k * ph) / k for k in range(1, 7))
    am = 0.6 + 0.4 * np.abs(np.sin(ph * 0.5))
    rumble = L.lp(rng.standard_normal(n), 140) * 2.0
    clatter = L.bp(rng.standard_normal(n), 900, 3500) * (0.5 + 0.5 * np.sin(2 * np.pi * 9.5 * t + rng.random()) ** 8)
    return (L.lp(tone * am, 400) * 0.5 + rumble * 0.6 + clatter * 0.18) * gain


# engines and tracks: close in A, receding as the camera rises in B, from above in C, off after the blast
eng = engine(T_EXP + 0.2)
env = np.interp(np.arange(len(eng)) / SR, [0, 0.3, T_B, T_B + 2.5, T_C, T_C + 0.2, T_EXP, T_EXP + 0.2], [0, 1.0, 1.0, 0.25, 0.25, 0.4, 0.4, 0])
P.put(0, eng * env, 0.32, 0.1)
w_ = L.wind(DUR, 1.0)
P.put(0, w_, 0.18)
P.put(1.4, L.lp(L.boom(7.0, 2.5), 160), 0.9, -0.6)
P.put(5.6, L.lp(L.boom(8.0, 2.5), 150), 0.8, 0.5)
# the drone overhead in C
P.put(T_C, L.buzz(T_D - T_C, f=205, wob=8, gain=1.0, fade=0.3), 0.05, 0.0)
# the mine
P.put(T_EXP, L.boom(0.6, 3.5), 1.6, 0.0)
deb = L.bp(rng.standard_normal(int(2.5 * SR)), 1500, 6000) * np.exp(-np.arange(int(2.5 * SR)) / SR * 1.6) * (rng.random(int(2.5 * SR)) < 0.02)
P.put(T_EXP + 0.25, L.lp(deb * 6, 5000), 0.5, 0.2)
# aftermath: fire, a far gun, wind
fire_n = int((DUR - T_D) * SR)
crack = L.bp(rng.standard_normal(fire_n), 1200, 7000) * (rng.random(fire_n) < 0.004) * 4 + L.lp(rng.standard_normal(fire_n), 300) * 0.4
P.put(T_D, crack, 0.25, -0.2)
P.put(T_D + 1.6, L.lp(L.boom(9.0, 2.5), 140), 0.8, 0.6)

out = mus * 1.0 + np.tanh(fx * 1.3) / 1.3
fo = int(0.4 * SR)
out[-fo:] *= np.linspace(1, 0, fo)[:, None]
out *= 0.89 / max(np.abs(out).max(), 1e-6)
wavfile.write(OUT, SR, (out * 32767).astype(np.int16))
print("wrote", OUT, len(out) / SR)
