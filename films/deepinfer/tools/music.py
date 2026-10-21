#!/usr/bin/env python3
"""Procedural score and sound effects for a short film.

Everything is synthesized: no external samples, no licensing to track.
Output: output/audio/music.wav, output/audio/sfx.wav
"""
import argparse
import json
import math
import os
import wave

import numpy as np

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM
BAR = BEAT * 4

ap = argparse.ArgumentParser()
ap.add_argument("film", nargs="?", default="deepinfer-open-source")
args = ap.parse_args()
film = os.path.join(os.path.dirname(__file__), "..", "cuts", args.film)
outdir = os.path.join(film, "output", "audio")
os.makedirs(outdir, exist_ok=True)
timeline = json.load(open(os.path.join(film, "output", "timeline.json")))
DUR = timeline["total"]
N = int(round(DUR * SR))
t = np.arange(N) / SR

L = np.zeros(N)
R = np.zeros(N)
SFL = np.zeros(N)
SFR = np.zeros(N)


def place(buf_l, buf_r, start, sig, gain=1.0, pan=0.0):
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
    buf_l[i : i + len(s)] += s * gl
    buf_r[i : i + len(s)] += s * gr


def env_ar(n, attack, release, curve=5.0):
    a = max(1, int(attack * SR))
    r = max(1, int(release * SR))
    e = np.ones(n)
    if a < n:
        e[:a] = np.linspace(0, 1, a) ** 0.6
    if r < n:
        e[-r:] *= np.linspace(1, 0, r) ** curve
    return e


def note(freq, dur, kind="sine", gain=1.0, attack=0.005, release=0.12):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    if kind == "sine":
        sig = np.sin(2 * np.pi * freq * tt)
    elif kind == "warm":
        sig = np.sin(2 * np.pi * freq * tt) + 0.35 * np.sin(4 * np.pi * freq * tt) + 0.16 * np.sin(6 * np.pi * freq * tt)
    elif kind == "pluck":
        sig = (
            np.sin(2 * np.pi * freq * tt)
            + 0.45 * np.sin(4 * np.pi * freq * tt)
            + 0.25 * np.sin(6 * np.pi * freq * tt)
            + 0.12 * np.sin(8 * np.pi * freq * tt)
        ) * np.exp(-tt * 9)
    elif kind == "bass":
        sig = np.zeros(n)
        for h in range(1, 7):
            if freq * h < 9000:
                sig += (1.0 / h) * np.sin(2 * np.pi * freq * h * tt)
        sig *= np.exp(-tt * 3.2)
    elif kind == "pad":
        sig = np.zeros(n)
        for h in range(1, 9):
            sig += (1.0 / (h * 1.15)) * np.sin(2 * np.pi * freq * h * tt + h * 0.7)
        sig *= 0.55
    elif kind == "saw":
        sig = np.zeros(n)
        for h in range(1, 12):
            sig += (1.0 / h) * np.sin(2 * np.pi * freq * h * tt)
    else:
        sig = np.sin(2 * np.pi * freq * tt)
    return sig * env_ar(n, attack, release) * gain


def kick(dur=0.42, gain=1.0):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    f = 46 + 88 * np.exp(-tt * 22)
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) * np.exp(-tt * 7.5)
    click = np.random.default_rng(7).normal(0, 0.25, n) * np.exp(-tt * 160)
    sig = np.tanh((sig + click) * 1.8) * gain
    return sig


def hat(dur=0.055, gain=1.0, open_=False):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(11 if not open_ else 13)
    sig = rng.normal(0, 1, n)
    sig = np.diff(sig, prepend=0)  # bright
    sig *= np.exp(-tt * (38 if not open_ else 14))
    return sig * gain * 0.5


def clap(gain=1.0):
    n = int(0.24 * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(17)
    sig = np.zeros(n)
    for k, off in enumerate([0.0, 0.009, 0.019, 0.028]):
        i = int(off * SR)
        seg = rng.normal(0, 1, n - i) * np.exp(-np.arange(n - i) / SR * (60 - k * 8))
        sig[i:] += seg
    sig = np.diff(sig, prepend=0)
    return sig * gain * 0.4


def whoosh(dur=0.7, gain=1.0, rise=True):
    n = int(dur * SR)
    tt = np.arange(n) / SR
    rng = np.random.default_rng(23)
    sig = rng.normal(0, 1, n)
    # cheap moving-average low-pass with a moving cutoff
    out = np.zeros(n)
    acc = 0.0
    for i in range(n):
        p = i / n
        a = 0.02 + (0.4 if rise else 0.4 - 0.38 * p)
        acc += a * (sig[i] - acc)
        out[i] = acc
    amp = (tt / dur) ** 2 if rise else (1 - tt / dur) ** 2
    return out * amp * gain * 2.4


def impact(gain=1.0):
    n = int(1.0 * SR)
    tt = np.arange(n) / SR
    f = 38 + 70 * np.exp(-tt * 14)
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) * np.exp(-tt * 3.6)
    rng = np.random.default_rng(31)
    noise = rng.normal(0, 1, n) * np.exp(-tt * 26)
    noise = np.diff(noise, prepend=0)
    return np.tanh((sig + noise * 0.3) * 1.5) * gain


def tick(gain=1.0, freq=2200):
    n = int(0.05 * SR)
    tt = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * tt) * np.exp(-tt * 90) * gain


# ---------- harmony ----------
NOTE = {
    "A2": 110.00, "C3": 130.81, "E3": 164.81, "G3": 196.00,
    "F2": 87.31, "A2b": 110.00, "F3": 174.61,
    "C3c": 130.81, "E3c": 164.81, "G3c": 196.00, "B3": 246.94,
    "G2": 98.00, "B2": 123.47, "D3": 146.83, "F3g": 174.61,
    "A3": 220.00, "C4": 261.63, "E4": 329.63, "G4": 392.00,
}

CHORDS = [
    ("Am", ["A2", "C3", "E3", "G3"], ["A3", "C4", "E4", "G4"]),
    ("F", ["F2", "A2b", "C3", "E3"], ["F3", "A3", "C4", "E4"]),
    ("C", ["C3c", "E3c", "G3c", "B3"], ["G3c", "C4", "E4", "G4"]),
    ("G", ["G2", "B2", "D3", "F3g"], ["G3c", "B3", "D3", "G4"]),
]


def chord_at(sec):
    if sec >= 85.5:
        return CHORDS[0]
    return CHORDS[int(sec // 4) % 4]


# ---------- sections ----------
def section(x):
    if x < 16.34:
        return "a"
    if x < 25.58:
        return "tension"
    if x < 41.93:
        return "b"
    if x < 51.26:
        return "b2"
    if x < 60.62:
        return "c"
    if x < 67.81:
        return "break"
    if x < 74.48:
        return "build"
    if x < 85.50:
        return "sparse"
    return "end"


# ---------- pad ----------
for start in np.arange(0, DUR, 4.0):
    _, notes, _ = chord_at(start)
    dur = min(4.0, DUR - start)
    gain = 0.10
    if section(start) in ("tension", "sparse", "end"):
        gain = 0.085
    if section(start) == "break":
        gain = 0.12
    for j, name in enumerate(notes):
        f = NOTE[name]
        sig = note(f, dur + 0.5, "pad", gain=gain, attack=0.35, release=0.6)
        place(L, R, start, sig, 1.0, pan=-0.35 if j % 2 == 0 else 0.35)
        sig2 = note(f * 1.003, dur + 0.5, "pad", gain=gain * 0.7, attack=0.4, release=0.6)
        place(L, R, start, sig2, 1.0, pan=0.3 if j % 2 == 0 else -0.3)

# ---------- bass ----------
for start in np.arange(0, DUR, BEAT / 2):
    sec = section(start)
    if sec == "end" and start > 90:
        continue
    if sec in ("a", "sparse", "end"):
        if abs((start % BEAT)) > 1e-6:
            continue
    if sec == "break" and start < 63.0:
        continue
    ci = 0 if start >= 85.5 else int(start // 4) % 4
    roots = [55.0, 43.65, 65.41, 49.0]
    root = roots[ci]
    gain = 0.16 if sec in ("b", "b2", "c", "build") else 0.12
    sig = note(root, 0.24, "bass", gain=gain, attack=0.004, release=0.08)
    place(L, R, start, sig, 1.0, 0.0)

# ---------- drums ----------
for b in np.arange(0, DUR, BEAT):
    sec = section(b)
    beat_i = int(round(b / BEAT)) % 4
    kick_on = False
    if sec == "a":
        kick_on = beat_i in (0, 2)
    elif sec == "tension":
        kick_on = True
    elif sec in ("b", "b2", "c", "build"):
        kick_on = True
    elif sec == "break":
        kick_on = b > 62.0 and beat_i in (0, 2)
    elif sec == "sparse":
        kick_on = beat_i in (0, 2)
    elif sec == "end":
        kick_on = b < 90.0 and beat_i == 0
    if kick_on:
        place(L, R, b, kick(0.4, 0.52 if sec not in ("a", "sparse") else 0.38), 1.0, 0.0)

    # hats
    if sec in ("a", "b", "b2", "c"):
        place(L, R, b + BEAT / 2, hat(0.05, 0.11), 1.0, 0.3)
        place(L, R, b + BEAT / 2 + 0.02, hat(0.03, 0.06), 1.0, -0.4)
    if sec in ("tension", "build"):
        for k in range(4):
            place(L, R, b + k * BEAT / 4, hat(0.035, 0.07 if k % 2 else 0.045), 1.0, 0.35 if k % 2 else -0.3)
    if sec in ("break", "sparse", "end"):
        if beat_i % 2 == 0:
            place(L, R, b + BEAT / 2, hat(0.05, 0.06), 1.0, 0.2)

    # claps
    if sec in ("b", "b2", "c", "build") and beat_i in (1, 3):
        place(L, R, b, clap(0.17), 1.0, -0.05)
    if sec == "break" and b > 63.0 and beat_i in (1, 3):
        place(L, R, b, clap(0.12), 1.0, 0.0)

# snare roll into the drop
for x in np.arange(23.8, 25.5, 0.125):
    p = (x - 23.8) / 1.7
    place(L, R, x, clap(0.04 + p * 0.11), 1.0, 0.05 * (1 if int(x * 8) % 2 else -1))

# ---------- arp ----------
def arp_gain(sec):
    return {
        "a": 0.052, "tension": 0.04, "b": 0.075, "b2": 0.08,
        "c": 0.07, "break": 0.045, "build": 0.08, "sparse": 0.04, "end": 0.035,
    }[sec]


for i, start in enumerate(np.arange(0, DUR, BEAT / 4)):
    sec = section(start)
    if sec == "end" and start > 91.5:
        continue
    _, notes, arp_notes = chord_at(start)
    name = arp_notes[(i * 3 + i // 4) % len(arp_notes)]
    f = NOTE[name] * (2 if i % 8 in (5, 7) else 1)
    g = arp_gain(sec)
    sig = note(f, 0.20, "pluck", gain=g, attack=0.002, release=0.10)
    pan = 0.45 if i % 2 else -0.45
    place(L, R, start, sig, 1.0, pan)

# ping-pong delay on the arp (approximate: use a copy of the mix)
delay_s = int(BEAT * 0.75 * SR)
wet = np.zeros(N)
wet[delay_s:] += L[:-delay_s] * 0.18
wet[delay_s * 2:] += R[:- delay_s * 2] * 0.09
L += wet * 0.5
R += np.roll(wet, int(0.02 * SR)) * 0.5

# ---------- sidechain ----------
duck = np.ones(N)
for b in np.arange(0, DUR, BEAT):
    i = int(b * SR)
    if i >= N:
        break
    n = int(0.34 * SR)
    n = min(n, N - i)
    tt = np.arange(n) / SR
    duck[i : i + n] = np.minimum(duck[i : i + n], 1 - 0.5 * np.exp(-tt * 12))
L *= duck
R *= duck

# ---------- SFX ----------
for x in [1.0, 16.34, 25.58, 41.93, 74.48, 85.5]:
    place(SFL, SFR, x, impact(0.55), 1.0, 0.0)

for x in [24.1, 40.5, 73.0]:
    place(SFL, SFR, x, whoosh(0.9, 0.32, True), 1.0, 0.0)

for x in [25.35, 41.7, 74.25]:
    place(SFL, SFR, x, whoosh(0.35, 0.22, False), 1.0, 0.0)

for x in [28.95, 29.75, 30.55]:
    place(SFL, SFR, x, tick(0.18, 1900), 1.0, 0.2)

for x in [42.2, 43.1, 44.0, 44.9, 45.9, 46.9]:
    place(SFL, SFR, x, tick(0.10, 2600), 1.0, -0.2)

# ---------- master ----------
def soft_limit(x, ceiling=0.92):
    return np.tanh(x / ceiling) * ceiling


def write_wav(path, l, r, gain=1.0):
    data = np.stack([np.clip(l * gain, -1, 1), np.clip(r * gain, -1, 1)], axis=1)
    pcm = (data * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


# Normalize music peak conservatively.
peak = max(np.max(np.abs(L)), np.max(np.abs(R)), 1e-9)
L = soft_limit(L / peak * 0.72)
R = soft_limit(R / peak * 0.72)
# Fade in/out.
fade = int(0.6 * SR)
L[:fade] *= np.linspace(0, 1, fade) ** 1.5
R[:fade] *= np.linspace(0, 1, fade) ** 1.5
out_fade = int(2.2 * SR)
L[-out_fade:] *= np.linspace(1, 0, out_fade) ** 1.5
R[-out_fade:] *= np.linspace(1, 0, out_fade) ** 1.5

write_wav(os.path.join(outdir, "music.wav"), L, R, 0.9)
write_wav(os.path.join(outdir, "sfx.wav"), SFL, SFR, 0.8)
print("music.wav", "sfx.wav", f"{DUR:.2f}s")
