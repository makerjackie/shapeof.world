#!/usr/bin/env python3
"""Silent-film score for the 16:9 cut. 120 BPM, section-aware, no samples."""
import math
import os
import re
import wave

import numpy as np

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM

here = os.path.dirname(__file__)
film = os.path.join(here, "..", "cuts", "deepinfer-fast")
src = open(os.path.join(film, "src", "timeline.js")).read()
SCENES = [(m.group(1), float(m.group(2)), float(m.group(3))) for m in re.finditer(r'id: "(\w+)",\s+start: ([\d.]+),\s+end: ([\d.]+)', src)]
DUR = max(e for _, _, e in SCENES)
N = int(round(DUR * SR))
outdir = os.path.join(film, "output", "audio")
os.makedirs(outdir, exist_ok=True)

L = np.zeros(N)
R = np.zeros(N)
SL = np.zeros(N)
SRt = np.zeros(N)


def scene_at(t):
    for name, a, b in SCENES:
        if a <= t < b:
            return name
    return SCENES[-1][0]


def place(bl, br, start, sig, gain=1.0, pan=0.0):
    i = int(round(start * SR))
    if i >= N or i + len(sig) <= 0:
        return
    s = sig
    if i < 0:
        s = s[-i:]
        i = 0
    s = s[: N - i]
    gl = gain * math.sqrt((1 - pan) / 2)
    gr = gain * math.sqrt((1 + pan) / 2)
    bl[i : i + len(s)] += s * gl
    br[i : i + len(s)] += s * gr


def env(n, a, r, curve=5.0):
    e = np.ones(n)
    ai = max(1, int(a * SR))
    ri = max(1, int(r * SR))
    if ai < n:
        e[:ai] = np.linspace(0, 1, ai) ** 0.6
    if ri < n:
        e[-ri:] *= np.linspace(1, 0, ri) ** curve
    return e


def tone(freq, dur, kind="sine", gain=1.0, attack=0.005, release=0.1):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if kind == "pluck":
        s = (np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(4 * np.pi * freq * t)
             + 0.22 * np.sin(6 * np.pi * freq * t) + 0.1 * np.sin(8 * np.pi * freq * t)) * np.exp(-t * 8)
    elif kind == "bass":
        s = sum((1.0 / h) * np.sin(2 * np.pi * freq * h * t) for h in range(1, 7) if freq * h < 9000)
        s *= np.exp(-t * 3.0)
    elif kind == "pad":
        s = sum((1.0 / (h * 1.2)) * np.sin(2 * np.pi * freq * h * t + h * 0.6) for h in range(1, 9)) * 0.55
    elif kind == "lead":
        s = (np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(4 * np.pi * freq * t)
             + 0.12 * np.sin(6 * np.pi * freq * t)) * np.exp(-t * 2.6)
    else:
        s = np.sin(2 * np.pi * freq * t)
    return s * env(n, attack, release) * gain


def kick(dur=0.4, gain=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t * 22)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 7.0)
    click = np.random.default_rng(7).normal(0, 0.22, n) * np.exp(-t * 150)
    return np.tanh((s + click) * 1.8) * gain


def hat(dur=0.05, gain=1.0, open_=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(11 if not open_ else 13)
    s = np.diff(rng.normal(0, 1, n), prepend=0)
    return s * np.exp(-t * (36 if not open_ else 12)) * gain * 0.5


def clap(gain=1.0):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    rng = np.random.default_rng(17)
    s = np.zeros(n)
    for k, off in enumerate([0.0, 0.009, 0.019, 0.028]):
        i = int(off * SR)
        s[i:] += rng.normal(0, 1, n - i) * np.exp(-t[: n - i] * (62 - k * 8))
    s = np.diff(s, prepend=0)
    return s * gain * 0.4


def whoosh(dur=0.8, gain=1.0):
    n = int(dur * SR)
    rng = np.random.default_rng(23)
    s = rng.normal(0, 1, n)
    out = np.zeros(n)
    acc = 0.0
    for i in range(n):
        p = i / n
        a = 0.02 + 0.38 * p
        acc += a * (s[i] - acc)
        out[i] = acc
    return out * (np.arange(n) / n) ** 2 * gain * 2.2


def impact(gain=1.0):
    n = int(0.9 * SR)
    t = np.arange(n) / SR
    f = 36 + 70 * np.exp(-t * 13)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 3.4)
    noise = np.diff(np.random.default_rng(31).normal(0, 1, n), prepend=0) * np.exp(-t * 22)
    return np.tanh((s + noise * 0.3) * 1.5) * gain


def tick(gain=1.0, freq=1900):
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * t) * np.exp(-t * 80) * gain


NOTE = {
    "A2": 110.0, "C3": 130.81, "E3": 164.81, "G3": 196.0, "A3": 220.0, "C4": 261.63, "E4": 329.63, "G4": 392.0,
    "F2": 87.31, "F3": 174.61, "B3": 246.94, "G2": 98.0, "B2": 123.47, "D3": 146.83,
}
CH = [
    ["A2", "C3", "E3", "G3"],
    ["F2", "A2", "C3", "E3"],
    ["C3", "E3", "G3", "B3"],
    ["G2", "B2", "D3", "F3"],
]
ROOT = [55.0, 43.65, 65.41, 49.0]
AMP = {
    "hook": 0.82, "split": 0.72, "war": 0.98, "open": 1.0, "recipe": 0.86,
    "cost": 0.96, "control": 0.62, "chips": 0.88,
    "limits": 0.58, "close": 0.72, "outro": 0.3,
}


def intensity(t):
    return AMP.get(scene_at(t), 0.5)


def chord_i(t):
    if t >= 104:
        return 0
    return int(t // 4) % 4


# pad
for start in np.arange(0, DUR, 4.0):
    ci = chord_i(start)
    dur = min(4.0, DUR - start)
    I = intensity(start)
    g = 0.03 + 0.065 * I
    for j, name in enumerate(CH[ci]):
        f = NOTE[name]
        place(L, R, start, tone(f, dur + 0.5, "pad", gain=g, attack=0.3, release=0.6), pan=-0.3 if j % 2 == 0 else 0.3)
        place(L, R, start, tone(f * 1.003, dur + 0.5, "pad", gain=g * 0.65, attack=0.35, release=0.6), pan=0.28 if j % 2 == 0 else -0.28)

# bass
for start in np.arange(0, DUR, BEAT / 2):
    I = intensity(start)
    if I < 0.3 and start % BEAT > 1e-6:
        continue
    if I < 0.6 and start % BEAT > 1e-6:
        continue
    ci = chord_i(start)
    sig = tone(ROOT[ci], 0.24, "bass", gain=0.05 + 0.09 * I, attack=0.004, release=0.08)
    place(L, R, start, sig, 1.0, 0.0)

# drums
for b in np.arange(0, DUR, BEAT):
    I = intensity(b)
    beat_i = int(round(b / BEAT)) % 4
    if I >= 0.6:
        place(L, R, b, kick(0.4, 0.36 + 0.12 * I), 1.0)
    elif I >= 0.3 and beat_i in (0, 2):
        place(L, R, b, kick(0.4, 0.3), 1.0)
    if I >= 0.55:
        place(L, R, b + BEAT / 2, hat(0.05, 0.1), 1.0, 0.32)
        place(L, R, b + BEAT / 2 + 0.02, hat(0.03, 0.05), 1.0, -0.4)
    if I >= 0.85 and scene_at(b) in ("war", "inside", "cost", "chips"):
        for k in range(4):
            place(L, R, b + k * BEAT / 4, hat(0.035, 0.05 if k % 2 else 0.035), 1.0, 0.3 if k % 2 else -0.3)
    if 0.55 <= I < 0.85 and beat_i in (1, 3):
        place(L, R, b, clap(0.12), 1.0, -0.05)
    if I >= 0.85 and beat_i in (1, 3):
        place(L, R, b, clap(0.16), 1.0, -0.05)

# snare roll into the "not free" hit
for x in np.arange(39.4, 41.0, 0.0625):
    p = (x - 39.4) / 1.6
    place(L, R, x, clap(0.03 + p * 0.12), 1.0, 0.04 * (1 if int(x * 16) % 2 else -1))

# arp
for i, start in enumerate(np.arange(0, DUR, BEAT / 4)):
    I = intensity(start)
    if I < 0.35:
        continue
    if I < 0.6 and i % 2:
        continue
    ci = chord_i(start)
    names = CH[ci]
    name = names[(i * 3 + i // 4) % len(names)]
    f = NOTE[name] * (2 if i % 8 in (5, 7) else 1)
    g = 0.03 + 0.04 * I
    place(L, R, start, tone(f, 0.18, "pluck", gain=g, attack=0.002, release=0.09), pan=0.45 if i % 2 else -0.45)

# lead motif after the open-source drop
MEL = [0, 2, 3, 2, 1, 2, 0, -1]
for i, start in enumerate(np.arange(5.5, 48.5, BEAT * 2)):
    I = intensity(start)
    if I < 0.55:
        continue
    ci = chord_i(start)
    names = CH[ci]
    step = MEL[i % len(MEL)]
    idx = max(0, min(3, step if step >= 0 else abs(step)))
    f = NOTE[names[idx]] * 2
    g = 0.028 + 0.025 * I
    place(L, R, start, tone(f, 0.7, "lead", gain=g, attack=0.01, release=0.3), pan=0.15 if i % 2 else -0.15)

# ping-pong delay on a copy
delay = int(BEAT * 0.75 * SR)
wet = np.zeros(N)
wet[delay:] += L[:-delay] * 0.16
wet[delay * 2:] += R[:- delay * 2] * 0.08
L += wet * 0.45
R += np.roll(wet, int(0.018 * SR)) * 0.45

# sidechain
duck = np.ones(N)
for b in np.arange(0, DUR, BEAT):
    i = int(b * SR)
    if i >= N:
        break
    n = min(int(0.32 * SR), N - i)
    t = np.arange(n) / SR
    duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.42 * np.exp(-t * 12))
L *= duck
R *= duck

# SFX
for _, a, _b in SCENES:
    if a in (0, 8, 19, 32, 43, 52, 64, 75, 84, 92, 104):
        place(SL, SRt, a, impact(0.45 if a not in (32, 92) else 0.55), 1.0)
place(SL, SRt, 32.0, impact(0.25), 1.0)
for x in [30.0, 50.8, 90.5]:
    place(SL, SRt, x, whoosh(0.8, 0.3), 1.0)
for x in [8.2, 19.2, 32.2, 43.2, 52.2, 64.2, 75.2, 84.2, 92.2, 104.2]:
    place(SL, SRt, x, tick(0.1, 2300), 1.0, 0.15)

# master
def write(path, l, r, gain):
    data = np.stack([np.clip(l * gain, -1, 1), np.clip(r * gain, -1, 1)], 1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


peak = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
L = np.tanh(L / peak * 0.85) * 0.85
R = np.tanh(R / peak * 0.85) * 0.85
fade = int(0.8 * SR)
L[:fade] *= np.linspace(0, 1, fade) ** 1.4
R[:fade] *= np.linspace(0, 1, fade) ** 1.4
out = int(1.2 * SR)
L[-out:] *= np.linspace(1, 0, out) ** 1.4
R[-out:] *= np.linspace(1, 0, out) ** 1.4

write(os.path.join(outdir, "music.wav"), L, R, 0.9)
write(os.path.join(outdir, "sfx.wav"), SL, SRt, 0.8)
print(f"score {DUR}s", "music.wav sfx.wav")
