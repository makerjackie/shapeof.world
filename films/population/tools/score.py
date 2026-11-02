"""The score: an original phonk-style track (130 BPM, F minor) synthesised from scratch and cut to the picture,
plus every sound effect, placed from out/cues.json (tools/cues.mjs). No samples, no library audio.

usage: ~/.venvs/shapeof-films/bin/python tools/score.py   ->  public/score.wav
"""
import json, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
BPM = 130
BAR = 240 / BPM
STEP = BAR / 16
BARS = 104
N = int(BARS * BAR * SR) + 1
rng = np.random.default_rng(7)


def S(bar):
    return int(round(bar * BAR * SR))


def sos(kind, f, order=2):
    return butter(order, f, btype=kind, fs=SR, output="sos")


def filt(x, kind, f, order=2):
    return sosfilt(sos(kind, f, order), x, axis=0)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


class Bus:
    def __init__(self):
        self.x = np.zeros((N + SR * 4, 2))

    def add(self, at, sig, g=1.0, pan=0.0):
        if sig.ndim == 1:
            l = np.sqrt(0.5 * (1 - pan))
            r = np.sqrt(0.5 * (1 + pan))
            sig = np.stack([sig * l * 1.414, sig * r * 1.414], 1)
        i = at
        if i < 0:
            sig = sig[-i:]
            i = 0
        n = min(len(sig), len(self.x) - i)
        if n > 0:
            self.x[i : i + n] += sig[:n] * g


drums, bass, cow, pad, perc, fx, verb_send = Bus(), Bus(), Bus(), Bus(), Bus(), Bus(), Bus()

# ------------------------------------------------------------------ instruments
_cache = {}


def kick():
    if "kick" not in _cache:
        n = int(0.35 * SR)
        t = np.arange(n) / SR
        f = 55 + 170 * np.exp(-t / 0.028)
        ph = 2 * np.pi * np.cumsum(f) / SR
        k = np.sin(ph) * env_exp(n, 0.16)
        click = filt(rng.standard_normal(n) * env_exp(n, 0.002), "highpass", 2000) * 0.5
        _cache["kick"] = np.tanh(2.2 * (k + click)) * 0.9
    return _cache["kick"]


def bass808(f, dur, f_next=None, slide=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    fr = f * (1 + 0.9 * np.exp(-t / 0.018))
    if f_next:
        k = np.clip((t - (dur - slide)) / slide, 0, 1)
        fr = fr * (f_next / f) ** (k * k)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    a = np.minimum(1, t / 0.003) * np.exp(-t / 1.1) * np.minimum(1, (dur - t) / 0.02)
    x = np.sin(ph) * a
    x = 0.75 * np.tanh(3.2 * x) + 0.25 * np.tanh(9 * x)
    return filt(x, "lowpass", 3200)


def cowbell(m, dur=0.32):
    key = ("cow", m)
    if key not in _cache:
        n = int(dur * SR)
        t = np.arange(n) / SR
        f1 = mtof(m)
        f2 = f1 * 1.4815
        sq = lambda f: sum(np.sin(2 * np.pi * f * h * t) / h for h in (1, 3, 5, 7) if f * h < 9000)
        x = sq(f1) + 0.85 * sq(f2)
        x = filt(x, "bandpass", [max(300, f1 * 0.8), min(9000, f2 * 4)])
        a = 0.65 * np.exp(-t / 0.014) + 0.45 * np.exp(-t / 0.13)
        x = np.tanh(2.8 * x * a) * 0.55
        _cache[key] = x
    return _cache[key]


def clap():
    if "clap" not in _cache:
        n = int(0.32 * SR)
        nz = filt(rng.standard_normal(n), "bandpass", [900, 5200])
        a = np.zeros(n)
        for d in (0, 0.011, 0.022):
            i = int(d * SR)
            a[i:] += np.exp(-np.arange(n - i) / (0.006 * SR)) * (1 if d < 0.02 else 0)
        a += np.exp(-np.arange(n) / (0.11 * SR)) * 0.55 * (np.arange(n) > int(0.022 * SR))
        body = np.sin(2 * np.pi * 210 * np.arange(n) / SR) * env_exp(n, 0.04) * 0.4
        _cache["clap"] = np.tanh(1.8 * (nz * a + body)) * 0.7
    return _cache["clap"]


def snare(tone=200):
    n = int(0.16 * SR)
    nz = filt(rng.standard_normal(n), "bandpass", [1200, 7000]) * env_exp(n, 0.05)
    body = np.sin(2 * np.pi * tone * np.arange(n) / SR) * env_exp(n, 0.04)
    return np.tanh(1.5 * (nz + 0.6 * body)) * 0.55


def hat(open_=False):
    key = ("hat", open_)
    if key not in _cache:
        n = int((0.16 if open_ else 0.05) * SR)
        x = filt(rng.standard_normal(n), "highpass", 7500) * env_exp(n, 0.06 if open_ else 0.012)
        _cache[key] = x * 0.8
    return _cache[key]


def tom(f=165):
    n = int(0.2 * SR)
    t = np.arange(n) / SR
    fr = f * (1 + 0.5 * np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * env_exp(n, 0.07) * 0.5


def lead(m, dur=0.2):
    key = ("lead", m)
    if key not in _cache:
        n = int(dur * SR)
        t = np.arange(n) / SR
        x = np.zeros(n)
        for d in (-0.14, 0.0, 0.13):
            f = mtof(m) * 2 ** (d / 12)
            x += 2 * ((t * f + rng.random()) % 1) - 1
        x = filt(x / 3, "lowpass", 4200, 2) * (np.minimum(1, t / 0.004) * np.exp(-t / 0.09))
        _cache[key] = np.tanh(2.5 * x) * 0.5
    return _cache[key]


def pad_chord(notes, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for m in notes:
        for d in (-0.11, 0.0, 0.09):
            f = mtof(m) * 2 ** (d / 12)
            x += 2 * ((t * f + rng.random()) % 1) - 1
    x = filt(x / (len(notes) * 3), "lowpass", 1100, 2)
    a = np.minimum(1, t / 0.35) * np.minimum(1, (dur - t) / 0.35)
    return x * a * 0.5


# ------------------------------------------------------------------ fx
def boom(size=1.0):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    f = 32 + 60 * np.exp(-t / 0.09)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(n, 0.7)
    nz = filt(rng.standard_normal(n), "lowpass", 2500) * env_exp(n, 0.14)
    x = np.tanh(1.6 * (sub + 0.5 * nz)) * size
    return x


def thunder():
    n = int(3.2 * SR)
    t = np.arange(n) / SR
    crack = filt(rng.standard_normal(n), "highpass", 1800) * env_exp(n, 0.03) * 1.6
    cr = np.zeros(n)
    for _ in range(90):
        i = int(min(0.6, rng.exponential(0.15)) * SR)
        L = int(0.004 * SR)
        cr[i : i + L] += rng.standard_normal(L) * rng.uniform(0.2, 1.0) * np.exp(-i / SR / 0.3)
    cr = filt(cr, "highpass", 900)
    rumble = filt(rng.standard_normal(n), "lowpass", 180, 4) * (np.minimum(1, t / 0.08) * np.exp(-t / 1.0)) * 4.0
    x = crack + 0.9 * cr + rumble
    L = np.tanh(1.3 * x)
    R = np.tanh(1.3 * np.roll(x, 240))
    return np.stack([L, R], 1) * 0.8


def firework(big=False):
    n = int(2.2 * SR)
    x = np.zeros(n)
    pops = 3 if big else 2
    for k in range(pops):
        i = int(k * 0.22 * BAR * 0 + k * 0.4 * SR / 1.0 * 0.6)
        L = int(0.08 * SR)
        x[i : i + L] += filt(rng.standard_normal(L), "bandpass", [300, 3000]) * env_exp(L, 0.015) * 2.0
        for _ in range(140 if big else 90):
            j = i + int(rng.uniform(0.05, 1.6) * SR)
            if j + 60 < n:
                x[j : j + 60] += rng.standard_normal(60) * env_exp(60, 0.0004) * rng.uniform(0.1, 0.8) * np.exp(-(j - i) / SR / 0.7)
    x = filt(x, "highpass", 400)
    return np.stack([x, np.roll(x, 300)], 1) * 0.5


def alarm(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    half = BAR / 8
    f = np.where((t // half) % 2 == 0, 932.3, 698.5)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(ph)) * 0.6 + np.sin(ph * 2) * 0.2
    gate = ((t % half) < half * 0.82).astype(float)
    a = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.3)
    return filt(x * gate * a, "bandpass", [500, 3500]) * 0.22


def whoosh(dur=0.6, rev=False):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    nz = rng.standard_normal(n)
    seg = 32
    for k in range(seg):
        a, b = k * n // seg, (k + 1) * n // seg
        fc = 300 * (14 ** (k / seg))
        out[a:b] = filt(nz[max(0, a - 2000) : b], "bandpass", [fc * 0.7, min(20000, fc * 1.6)])[-(b - a) :]
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    x = out * e
    return x[::-1] if rev else x


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    k = t / dur
    nz = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 48
    for s in range(seg):
        a, b = s * n // seg, (s + 1) * n // seg
        fc = 400 * (18 ** (s / seg))
        out[a:b] = filt(nz[max(0, a - 2000) : b], "bandpass", [fc * 0.6, min(20000, fc * 1.5)])[-(b - a) :]
    tone = np.sin(2 * np.pi * np.cumsum(220 * 6 ** k) / SR) * 0.25
    return (out * 0.8 + tone) * k ** 2


def chime():
    n = int(1.6 * SR)
    t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * 1318.5 * r * t) * np.exp(-t / d) for r, a, d in ((1, 1, 0.9), (2.0, 0.5, 0.5), (2.76, 0.35, 0.35), (5.4, 0.2, 0.15)))
    return x * 0.22


def blip():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 2093 * t) * env_exp(n, 0.02) * 0.3 + filt(rng.standard_normal(n), "highpass", 5000) * env_exp(n, 0.004) * 0.3
    return x


def tick():
    n = int(0.03 * SR)
    return filt(rng.standard_normal(n), "bandpass", [2500, 7000]) * env_exp(n, 0.003) * 0.6


# ------------------------------------------------------------------ arrangement
CHORDS = {0: ("F", 29, [53, 56, 60]), 1: ("F", 29, [53, 56, 60]), 2: ("Db", 25, [49, 53, 56]), 3: ("C", 24, [48, 52, 55])}
RIFF_A = {
    0: [(0, 84), (2, 84), (3, 80), (5, 84), (6, 87), (8, 84), (10, 80), (11, 79), (13, 77), (14, 79)],
    1: [(0, 80), (2, 80), (3, 77), (5, 80), (6, 84), (8, 80), (10, 79), (11, 77), (13, 76), (14, 79)],
    2: [(0, 85), (2, 85), (3, 80), (5, 85), (6, 89), (8, 85), (10, 80), (11, 77), (13, 80), (14, 82)],
    3: [(0, 84), (2, 84), (3, 79), (5, 84), (6, 88), (8, 84), (10, 82), (11, 79), (13, 76), (14, 79)],
}
OST = {0: [84, 84, 89, 84, 87, 84, 80, 84], 1: [84, 84, 89, 84, 87, 84, 80, 84], 2: [85, 85, 89, 85, 87, 85, 80, 85], 3: [84, 84, 88, 84, 86, 84, 79, 84]}
RIFF_B = {c: [(s, OST[c][s % 8]) for s in range(16) if s % 8 != 7] for c in OST}
DARK_808 = [29, 28, 27, 25]

SECTIONS = [
    (0, 2.5, "full", "A"), (2.5, 4.45, "full", "A"), (4.45, 6.5, "rewind", None), (6.5, 8, "build", None),
    (8, 14, "full", "A"), (14, 15.75, "full", "A"), (15.75, 16, "stop", None), (16, 21.5, "dark", None),
    (21.5, 22, "stop", None), (22, 24, "build", None), (24, 28, "full", "B"), (28, 32, "full", "A"), (32, 36, "full", "B"),
    (36, 37, "stop", None), (37, 41, "full", "A"), (41, 45, "full", "B"), (45, 49, "full", "A"), (49, 52, "full", "B"),
    (52, 58, "light", None), (58, 61.5, "build", None), (61.5, 66, "full", "B"), (66, 69.5, "dark", None),
    (69.5, 70.5, "stop", None), (70.5, 71.5, "build", None), (71.5, 78, "full", "B"), (78, 84, "full", "A"),
    (84, 92, "pad", None), (92, 97, "light", None), (97, 100.5, "outro", None), (100.5, 104, "tail", None),
]
# lowpass on the whole music bus (0 = open, 1 = closed), keyed in bars
FILT = [(0, 0), (2.45, 0), (2.55, 0.85), (4.4, 0.85), (4.45, 0), (14, 0), (15.7, 0.9), (16, 0), (52, 0.55), (57.9, 0.55), (58, 0), (84, 0), (84.2, 0.6), (92, 0.6), (92.1, 0.25), (97, 0.25), (97.1, 0.5), (104, 0.5)]


def section(bar):
    for a, b, m, r in SECTIONS:
        if a <= bar < b:
            return m, r
    return "tail", None


kicks = []
cur_bar = 0.0
step_total = BARS * 16
for st in range(step_total):
    bar = st / 16
    b = int(bar)
    s = st % 16
    mode, riff = section(bar)
    chord = CHORDS[b % 4]
    at = S(bar)
    phrase_end = (b % 4) == 3
    if mode == "full":
        kpat = {0, 3, 7, 10} | ({14} if phrase_end else set())
        if s in kpat:
            drums.add(at, kick(), 0.95)
            kicks.append(at)
            # 808 note until the next kick
            nxt = sorted(k for k in kpat if k > s)
            dur_steps = (nxt[0] - s) if nxt else 16 - s
            f = mtof(chord[1] + (12 if s == 10 and riff == "B" else 0))
            fn = mtof(CHORDS[(b + 1) % 4][1]) if not nxt else None
            bass.add(at, bass808(f, dur_steps * STEP, fn), 0.8)
        if s in (4, 12):
            drums.add(at, clap(), 0.75)
            verb_send.add(at, clap(), 0.25)
        if s in (2, 6, 9, 13):
            perc.add(at, tom(150 if s in (2, 9) else 190), 0.5, -0.3 if s % 2 else 0.3)
        drums.add(at, hat(open_=(s in (6, 14))), 0.85 if s % 4 == 2 else 0.5 if s % 2 == 0 else (0.35 if riff == "B" else 0.18), 0.25)
        if phrase_end and s >= 12:
            for k in range(2):
                drums.add(at + int(k * STEP * SR / 2), hat(), 0.55, -0.25)
        notes = (RIFF_A if riff == "A" else RIFF_B)[b % 4]
        for ss, m in notes:
            if ss == s:
                g = 0.9 if s % 4 == 0 else 0.7
                cow.add(at, cowbell(m), g, 0.15)
                verb_send.add(at, cowbell(m), 0.35 * g)
                if riff == "B":
                    perc.add(at, lead(m - 12), 0.4 * g, -0.15)
                    perc.add(at, lead(m - 24), 0.6 * g, 0.15)
    elif mode == "dark":
        if s == 0 or (s == 10 and b % 2 == 1):
            drums.add(at, kick(), 1.0)
            kicks.append(at)
        if s == 0:
            f = mtof(DARK_808[b % 4] - 12 + 12)
            fn = mtof(DARK_808[(b + 1) % 4])
            bass.add(at, bass808(f, BAR, fn, slide=0.25), 0.95)
            pad.add(at, pad_chord([DARK_808[b % 4] + 24, DARK_808[b % 4] + 27, DARK_808[b % 4] + 31], BAR + 0.3), 0.8)
        if s == 8:
            drums.add(at, clap(), 0.9)
            verb_send.add(at, clap(), 0.6)
        if s % 4 == 2:
            drums.add(at, hat(), 0.5, 0.3)
        if s in (3, 11):
            perc.add(at, tom(110), 0.6)
    elif mode == "light":
        if s in (0, 8, 11):
            drums.add(at, kick(), 0.8)
            kicks.append(at)
            bass.add(at, bass808(mtof(chord[1]), (8 if s == 0 else 3 if s == 8 else 5) * STEP), 0.6)
        if s % 2 == 0:
            drums.add(at, hat(), 0.45, 0.2)
        if s == 12:
            drums.add(at, clap(), 0.5)
        for ss, m in RIFF_A[b % 4]:
            if ss == s:
                cow.add(at, cowbell(m), 0.5, 0.15)
                verb_send.add(at, cowbell(m), 0.4)
        if s == 0:
            pad.add(at, pad_chord(chord[2], BAR + 0.3), 0.45)
    elif mode == "pad":
        if s == 0:
            pad.add(at, pad_chord(chord[2], BAR + 0.3), 0.8)
            bass.add(at, bass808(mtof(chord[1]), BAR * 0.9), 0.45)
        for ss, m in RIFF_A[b % 4]:
            if ss == s and ss % 4 in (0, 2):
                cow.add(at, cowbell(m), 0.35, 0.1)
                verb_send.add(at, cowbell(m), 0.6)
    elif mode == "outro":
        if s == 0:
            pad.add(at, pad_chord(chord[2], BAR + 0.3), 0.7)
        for ss, m in RIFF_A[b % 4]:
            if ss == s:
                cow.add(at, cowbell(m), 0.5, 0.1)
                verb_send.add(at, cowbell(m), 0.7)
        if s % 2 == 0:
            drums.add(at, hat(), 0.25, 0.2)
    elif mode == "build":
        # roll that speeds up through the build
        a, bnd = next((a, b2) for a, b2, m, r in SECTIONS if a <= bar < b2)
        k = (bar - a) / (bnd - a)
        div = 4 if k < 0.4 else 2 if k < 0.75 else 1
        if s % div == 0:
            drums.add(at, snare(180 + 140 * k), 0.25 + 0.6 * k)
        if div == 1:
            drums.add(at + int(STEP * SR / 2), snare(200 + 160 * k), 0.4 + 0.5 * k)
        if s == 0 and k < 0.5:
            drums.add(at, kick(), 0.8)
        if s == 0:
            pad.add(at, pad_chord(chord[2], BAR + 0.3), 0.5)

# risers into every drop, and a build-wide one
for a, b2, m, r in SECTIONS:
    if m == "build":
        fx.add(S(a), riser((b2 - a) * BAR), 0.55)
        fx.add(S(b2), boom(1.0), 0.9)
        fx.add(S(b2), hat(open_=True) * 3, 0.6)

# ------------------------------------------------------------------ cues from the picture
cues = json.load(open(os.path.join(ROOT, "out", "cues.json")))
for c in cues:
    at = S(c["at"])
    k = c["k"]
    if k == "bolt":
        fx.add(at - int(0.02 * SR), thunder(), 0.85)
        fx.add(at, boom(0.8), 0.6)
        verb_send.add(at, thunder()[:, 0], 0.3)
    elif k == "fire":
        fx.add(at, firework(c["big"]), 0.75)
        verb_send.add(at, firework(c["big"])[:, 0], 0.4)
    elif k == "alarm":
        dur = (c["out"] - c["at"]) * BAR
        fx.add(at, alarm(dur), 0.8)
        fx.add(at, boom(1.0), 0.85)
        fx.add(at - int(0.5 * SR), whoosh(0.5, rev=True), 0.35)
    elif k == "big":
        fx.add(at, boom(0.7), 0.55)
        fx.add(at - int(0.35 * SR), whoosh(0.4, rev=True), 0.3)
    elif k == "slam":
        fx.add(at, boom(0.9), 0.7)
        fx.add(at - int(0.3 * SR), whoosh(0.32, rev=True), 0.35)
        verb_send.add(at, boom(0.5), 0.2)
    elif k == "mile":
        fx.add(at, chime(), 0.65, 0.2)
        verb_send.add(at, chime(), 0.6)
    elif k == "call":
        fx.add(at, blip(), 0.35, -0.2)
        fx.add(at, whoosh(0.3), 0.12)
# the rewind: tape stop, then clock ticks speeding up
for i in range(40):
    tb = 4.6 + 1.85 * (1 - (1 - i / 40) ** 1.7)
    fx.add(S(tb), tick(), 0.5, (-1) ** i * 0.3)
fx.add(S(4.5), whoosh(1.0, rev=True), 0.4)
fx.add(S(101), boom(1.0), 0.8)
fx.add(S(101), chime(), 0.4)

# ------------------------------------------------------------------ mix
t = np.arange(len(drums.x)) / SR
# sidechain pump from kicks on bass-adjacent layers
duck = np.ones(len(drums.x))
for k in kicks:
    L = int(0.25 * SR)
    seg = 1 - 0.45 * np.exp(-np.arange(L) / (0.07 * SR))
    e = min(len(duck), k + L)
    duck[k:e] = np.minimum(duck[k:e], seg[: e - k])
music = drums.x * 0.9 + bass.x * 0.7 + (cow.x * 0.85 + pad.x * 2.4 + perc.x * 1.0) * duck[:, None]
# reverb
irn = int(2.4 * SR)
ir = rng.standard_normal((irn, 2)) * np.exp(-np.arange(irn) / (0.55 * SR))[:, None]
ir = filt(ir, "lowpass", 6000)
ir /= np.sqrt((ir ** 2).sum(axis=0))
wet = np.stack([fftconvolve(verb_send.x[:, ch], ir[:, ch])[: len(music)] for ch in range(2)], 1)
music = music + wet * 0.35
# tape stop at the rewind
ts, L = S(4.45), int(0.5 * SR)
src = music[ts - L : ts + L].copy()
tt = np.arange(L)
pos = tt - tt ** 2 / (2 * L)
for ch in range(2):
    music[ts : ts + L, ch] = np.interp(pos + L, np.arange(len(src)), src[:, ch]) * np.linspace(1, 0, L)
music[ts + L : S(6.5)] = 0
for a, b2, m, r in SECTIONS:
    if m == "stop":
        i0, i1 = S(a), S(b2)
        music[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None] ** 4
    if m == "rewind":
        pass
# automated lowpass
bars_t = t / BAR
fk = np.interp(bars_t, [p[0] for p in FILT], [p[1] for p in FILT])
lp = filt(music, "lowpass", 700, 2)
music = music * (1 - fk[:, None]) + lp * fk[:, None]
# the tail fades from bar 101
music *= np.clip(1 - (bars_t - 101.2) / 2.6, 0, 1)[:, None]
mix = music + fx.x * 0.9 + np.stack([fftconvolve(fx.x[:, ch], ir[:, ch])[: len(music)] for ch in range(2)], 1) * 0.12
for nm, bb in (("drums", drums.x), ("bass", bass.x), ("cow", cow.x), ("pad", pad.x), ("perc", perc.x), ("fx", fx.x), ("wet", wet)):
    print(f"{nm:6s} rms {20*np.log10(np.sqrt((bb**2).mean())+1e-9):6.1f} peak {20*np.log10(np.abs(bb).max()+1e-9):6.1f}")
mix = filt(mix, "highpass", 28)
mix = np.tanh(mix * 1.25) / 1.25  # glue
mix = mix[:N]
mix /= np.abs(mix).max() / 0.89
wavfile.write(os.path.join(ROOT, "public", "score.wav"), SR, (mix * 32767).astype(np.int16))
print("score.wav", round(len(mix) / SR, 2), "s,", len(cues), "cues,", len(kicks), "kicks")
