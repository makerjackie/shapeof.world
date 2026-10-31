"""Synthesised sound design (our own, no samples): distant artillery, the line charge, missiles, mines, drones,
helicopter rotor, the drone timer, wind. Event times follow src/film/state.ts. Mixes with public/music.wav.
usage: python tools/sfx.py public/music.wav public/mix.wav"""
import sys, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt
SR = 48000
MUSIC, OUT = sys.argv[1:3]
sr, mus = wavfile.read(MUSIC); assert sr == SR
mus = mus.astype(np.float32) / 32768.0
N = len(mus)
fx = np.zeros((N, 2), np.float32)
rng = np.random.default_rng(7)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "bandpass", fs=SR, output="sos"), x)
def lp(x, f, order=2): return sosfilt(butter(order, f, "lowpass", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "highpass", fs=SR, output="sos"), x)
def put(t, sig, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    sig = sig[: N - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    fx[i:i + len(sig), 0] += sig * l * 1.41
    fx[i:i + len(sig), 1] += sig * r * 1.41
def env(n, a, d): 
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def boom(dist=1.0, length=2.2):
    """Distant artillery / explosion: low thump + rumble tail; farther = darker and softer."""
    n = int(length * SR); t = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (48 + 30 * np.exp(-t * 18)) * t) * env(n, 0.004, 0.18)
    noise = rng.standard_normal(n)
    rumble = lp(noise, 380 / dist) * env(n, 0.01, 0.55)
    crack = hp(noise, 1500) * env(n, 0.001, 0.03) * (1 / dist ** 2)
    return (thump * 0.9 + rumble * 0.9 + crack * 0.4) / dist
def whoosh(length, f0, f1, gain=1.0):
    n = int(length * SR); t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 2048
    for k in range(0, n, seg):
        f = f0 + (f1 - f0) * (k / n)
        out[k:k + seg] = bp(noise[k:k + seg + 512], max(80, f * 0.7), f * 1.3)[: len(out[k:k + seg])]
    return out * np.sin(np.pi * t / length) ** 1.5 * gain
def buzz(length, f=170, wob=6, gain=1.0, fade=0.6):
    """Small drone: saw-like rotor tone with wobble, band-limited."""
    n = int(length * SR); t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(f * (1 + 0.03 * np.sin(2 * np.pi * wob * t) + 0.01 * rng.standard_normal(n).cumsum() / np.sqrt(n))) / SR
    s = sum(np.sin(k * ph) / k for k in range(1, 9))
    s = bp(s, 120, 3200) * 0.5 + bp(rng.standard_normal(n), 2000, 6000) * 0.03
    e = np.minimum(1, np.minimum(t / fade, (length - t) / fade))
    return s * e * gain
def rotor(length, rate=4.6, gain=1.0):
    n = int(length * SR); t = np.arange(n) / SR
    pulse = (0.5 + 0.5 * np.cos(2 * np.pi * rate * t)) ** 6
    s = lp(rng.standard_normal(n), 300) * pulse * 3 + np.sin(2 * np.pi * 38 * t) * pulse
    e = np.minimum(1, np.minimum(t / 0.8, (length - t) / 0.8))
    return s * e * gain
def tick(f=2200):
    n = int(0.03 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * f * t) * env(n, 0.0005, 0.006)
def wind(length, gain=1.0):
    n = int(length * SR); t = np.arange(n) / SR
    s = lp(rng.standard_normal(n), 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.11 * t + 1))
    e = np.minimum(1, np.minimum(t / 2, (length - t) / 2))
    return s * e * gain

# ---- 0 · hook (thermal) ----
put(0.0, buzz(13.8, 190, 5, 0.07), 1, 0.2)
put(2.0, boom(0.8, 2.4), 0.55, -0.1)          # ATGM hit on the lead vehicle
put(3.6, boom(0.9, 2.0), 0.45, 0.1)           # mine
for i in range(9):
    ti = 5.2 + i * 0.55 + np.sin(i * 7.3) * 0.2
    put(ti, boom(1.3 + (i % 3) * 0.3, 2.4), 0.42, np.sin(i * 12.9) * 0.6)
put(13.2, whoosh(1.6, 300, 2400, 0.25))        # pull-out
# ---- 2 · into the field ----
put(49.6, whoosh(2.2, 2500, 300, 0.2))         # dive
put(51.5, wind(50, 0.06))
# ---- 3 · assault ----
put(117.6, wind(4.5, 0.08))
put(122.4, whoosh(1.4, 600, 3500, 0.35), 1, -0.2)      # line charge rocket
for i in range(12): put(124.3 + i * 0.05, boom(1.0 + i * 0.04, 2.6), 0.28, -0.3 + i * 0.05)
put(130.2, whoosh(0.85, 900, 4200, 0.3), 1, -0.5)      # ATGM
put(131.0, boom(0.8, 2.4), 0.6)
put(137.6, boom(0.9, 2.0), 0.5, 0.2)                   # mine under the second vehicle
put(139.6, buzz(6.4, 205, 7, 0.12), 1, 0.15)            # drone overhead
k = 0
while 142.8 + k * 0.105 < 145.4:
    put(142.8 + k * 0.105, tick(2300 if k % 10 else 1700), 0.12); k += 1
for i in range(14):
    ti = 143.2 + i * 0.55 + np.sin(i * 7.3) * 0.2
    put(ti, boom(1.1 + (i % 4) * 0.2, 2.4), 0.45, np.sin(i * 12.9) * 0.7)
put(146.1, rotor(5.2, 4.8, 0.10), 1, -0.4)              # helicopter far south
put(147.6, whoosh(2.4, 700, 2600, 0.22), 1, -0.3)
put(150.0, boom(1.4, 2.2), 0.4, 0.3)
put(152.4, buzz(1.4, 260, 3, 0.07), 1, 0.3)            # loitering munition dive
put(153.7, boom(0.9, 2.4), 0.5, 0.2)
for i in range(18): put(157.0 + (i % 9) * 0.12 + rng.random() * 0.05, tick(900 + rng.random() * 300) * 3, 0.06, rng.random() - 0.5)
put(160.0, buzz(6.4, 180, 5, 0.03), 1, -0.2)
# ---- 4 · on foot ----
put(179.6, wind(11.5, 0.07))
put(181.0, buzz(9.0, 175, 4, 0.025), 1, 0.4)
put(202.6, wind(12, 0.05))                              # the quiet before the commander's words
# ---- 5 · drones everywhere ----
put(246.6, buzz(12, 160, 5, 0.03), 1, -0.4)
put(249.0, buzz(10, 210, 6, 0.025), 1, 0.4)
put(238.6, boom(1.6, 2.2), 0.3); put(240.2, boom(1.8, 2.2), 0.28, 0.3); put(242.0, boom(1.6, 2.2), 0.3, -0.2)
put(263.6, buzz(13, 215, 8, 0.18), 1, 0.25)             # the drone over the two-man group
put(276.8, wind(13, 0.06))
put(281.2, buzz(3.8, 230, 4, 0.16), 1, -0.3)            # supply drone
put(289.6, buzz(5.8, 200, 6, 0.2), 1, 0.0)            # "an hour… whenever we hear a drone"
put(334.0, whoosh(2.2, 2400, 400, 0.2))
put(336.0, wind(16, 0.06))

# duck the music where the drone itself is the point
duck = np.ones(N, np.float32)
for a, b, g in [(263.4, 296.0, 0.55), (139.4, 146.0, 0.75)]:
    i0, i1 = int(a * SR), int(b * SR); r = int(0.8 * SR)
    duck[i0:i1] = g
    duck[i0 - r:i0] = np.linspace(1, g, r); duck[i1:i1 + r] = np.linspace(g, 1, r)
fx = np.tanh(fx * 1.4) / 1.4  # tame the transients so the master limiter does not pump
mix = mus * duck[:, None] + fx * 0.7
print("fx peak", float(np.abs(fx).max()), "mix peak", float(np.abs(mix).max()))
wavfile.write(OUT, SR, mix.astype(np.float32))
