"""Film5 soundtrack: the reference music re-edited on bar lines (EDL in src/v5/plan5.ts, 15 ms equal-power seams),
plus synthesised SFX placed from out/cues5.json:
  rush  -> a riser that ends on the arrival        blood -> deep boom + taiko + an ink drop + low bianzhong
  ash   -> boom + taiko, quieter                    gold  -> high bianzhong + chime
  turn (2022) -> low bell                           stamps -> stamp + chime      brush characters -> a short brush swish
  paintings -> paper unrolling                      hook / ending break -> deep bells
The wind bed is from music.shapeof.world (ambience-wind-05, the user's own library)."""
import json, os, subprocess
import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve, lfilter
from scipy.ndimage import maximum_filter1d, minimum_filter1d

ROOT = os.path.join(os.path.dirname(__file__), "..")
SR = 48000
rng = np.random.default_rng(7)


def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    assert sr == SR, sr
    return x


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def tt(d):
    return np.arange(int(d * SR)) / SR


IR = lp(rng.standard_normal(int(3.0 * SR)) * np.exp(-tt(3.0) / 0.8), 5000) * 0.02


def verb(x, wet=0.35):
    return x + wet * fftconvolve(x, IR)[: len(x)]


def boom(dur=2.2):
    t = tt(dur)
    f = 30 + 46 * np.exp(-t / 0.2)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.8)
    s += lp(rng.standard_normal(len(t)), 160) * np.exp(-t / 0.12) * 0.6
    return verb(s * 0.9, 0.25)


def taiko(g=1.0):
    t = tt(1.4)
    f = 62 + 70 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.32)
    skin = bp(rng.standard_normal(len(t)), 120, 900) * np.exp(-t / 0.035) * 0.8
    return verb((body + skin) * g * np.minimum(1, t / 0.002), 0.3)


def ink_drop(g=1.0):
    t = tt(1.2)
    f = 520 + 1300 * (1 - np.exp(-t / 0.018))
    plip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.05) * 0.6
    low = np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.18) * 0.7
    return verb((plip + low) * g, 0.55)


def bianzhong(f0=147.0, dur=5.0, g=1.0):
    t = tt(dur)
    ratios = [1.0, 1.19, 2.76, 4.07, 5.4, 8.93]
    amps = [1.0, 0.7, 0.45, 0.25, 0.18, 0.08]
    decs = [3.4, 2.8, 1.3, 0.8, 0.5, 0.25]
    s = sum(a * np.sin(2 * np.pi * f0 * r * t + rng.uniform(0, 6.28)) * np.exp(-t / d) for r, a, d in zip(ratios, amps, decs))
    strike = bp(rng.standard_normal(len(t)), 800, 5000) * np.exp(-t / 0.01) * 0.5
    return verb((s / 2.5 + strike) * g * np.minimum(1, t / 0.003), 0.4)


def bell(f0=98.0, dur=7.0, g=1.0):
    t = tt(dur)
    ratios = [0.5, 1.0, 1.183, 1.506, 2.0, 2.514, 2.662, 3.011, 4.17]
    amps = [0.55, 1.0, 0.6, 0.35, 0.5, 0.25, 0.2, 0.15, 0.08]
    decs = [6.0, 4.5, 3.2, 2.6, 2.2, 1.6, 1.4, 1.1, 0.7]
    s = np.zeros(len(t))
    for r, a, d in zip(ratios, amps, decs):
        for det in (1.0, 1.0016):
            s += a * np.sin(2 * np.pi * f0 * r * det * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    strike = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.015) * 0.6
    return verb((s / 6 + strike) * np.minimum(1, t / 0.004) * g, 0.45)


def chime():
    t = tt(2.5)
    s = sum(a * np.sin(2 * np.pi * 1318.5 * r * t) * np.exp(-t / d) for r, a, d in [(1, 1, 1.2), (2.76, 0.4, 0.5), (5.4, 0.2, 0.25)])
    return verb(s * 0.35, 0.4)


def stamp(g=1.0):
    t = tt(0.6)
    thump = np.sin(2 * np.pi * (70 + 90 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.09)
    slap = bp(rng.standard_normal(len(t)), 500, 3500) * np.exp(-t / 0.025) * 0.7
    return verb((thump + slap) * g, 0.15)


def riser(dur):
    """a rising band sweep whose end is the arrival"""
    dur = max(0.25, min(dur, 1.8))
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    K = 10
    for k in range(K):
        a, b = int(len(t) * k / K), int(len(t) * (k + 1) / K)
        f = 260 * (2 ** (k * 0.5))
        out[a:b] = bp(n, f, min(f * 2.4, 17000))[a:b]
    env = (t / dur) ** 1.8 * (1 - np.exp(-(dur - t) / 0.01))
    return out * env * 1.3


def swish(g=1.0):
    t = tt(0.32)
    n = rng.standard_normal(len(t))
    s = np.zeros(len(t))
    for k in range(6):
        a, b = int(len(t) * k / 6), int(len(t) * (k + 1) / 6)
        f = 3200 / (1.35 ** k)
        s[a:b] = bp(n, f, min(f * 2.2, 16000))[a:b]
    return s * np.sin(np.pi * t / 0.32) ** 1.5 * g


def scroll(g=1.0):
    t = tt(0.7)
    n = bp(rng.standard_normal(len(t)), 1800, 7000)
    am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 11 * t + 3 * np.sin(2 * np.pi * 3 * t)))
    return n * am * np.sin(np.pi * t / 0.7) * g


CUES = json.load(open(os.path.join(ROOT, "out", "cues5.json")))
full = load(os.path.join(ROOT, "public", "ref_full.wav"))
# every segment starts exactly at its planned film time; the previous one plays on past its out-point and fades
# under the new one (equal power), so seams never shift the picture-to-music sync
N = int(round(CUES["dur"] * SR))
music = np.zeros((N, 2))
XFS = {int(k): v for k, v in CUES.get("xfade", {}).items()}
fs = 0
for i, (a_, b_) in enumerate(CUES["edl"]):
    xin = int(XFS.get(i, 0.015) * SR) if i > 0 else 0
    xout = int(XFS.get(i + 1, 0.015) * SR) if i < len(CUES["edl"]) - 1 else 0
    seg = full[int(a_ * SR):int(b_ * SR) + xout].copy()
    if xin:
        seg[:xin] *= np.sin(np.linspace(0, 1, xin) * np.pi / 2)[:, None]
    if xout:
        seg[-xout:] *= np.cos(np.linspace(0, 1, xout) * np.pi / 2)[:, None]
    e = min(N, fs + len(seg))
    music[fs:e] += seg[: e - fs]
    fs += int(round((b_ - a_) * SR))
print("edited music", round(len(music) / SR, 2), "s (plan says", CUES["dur"], ")")
fx = np.zeros((N, 2))


def put(sig, at, g=1.0, pan=0.0):
    a = int(at * SR)
    if a < 0:
        sig = sig[-a:]
        a = 0
    b = min(N, a + len(sig))
    if b <= a:
        return
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    fx[a:b, 0] += sig[: b - a] * g * L * 1.414
    fx[a:b, 1] += sig[: b - a] * g * R * 1.414


duck = np.ones(N)


def duckat(at, depth, d):
    a = int(at * SR)
    t = tt(d + 0.6)
    env = 1 - (1 - depth) * np.where(t < d, 1.0, np.exp(-(t - d) / 0.25))
    b = min(N, a + len(env))
    duck[a:b] = np.minimum(duck[a:b], env[: b - a])


for h in CUES["hits"]:
    at, kind, size = h["t"], h["kind"], (h.get("size") or 1)
    if kind == "blood":
        put(boom(), at, 0.5 * size)
        put(taiko(), at, 0.6 * size)
        put(ink_drop(), at - 0.02, 0.45 * size)
        put(bianzhong(110, 5.0), at + 0.05, 0.42 * size)
        duckat(at, 0.72, 0.45)
    elif kind == "ash":
        put(boom(1.6), at, 0.3)
        put(taiko(0.9), at, 0.5)
        duckat(at, 0.85, 0.25)
    elif kind == "gold":
        put(bianzhong(587, 2.4, 0.6), at, 0.32)
        put(chime(), at + 0.02, 0.2)
    elif kind == "turn":
        put(bell(98, 6.0), at, 0.42)
        put(boom(1.8), at, 0.25)
        duckat(at, 0.8, 0.6)
for at, d in CUES["risers"]:
    put(riser(d), at - d, 0.22)
for at in CUES["milestones"]:
    put(stamp(0.6), at, 0.4)
    put(chime(), at, 0.16)
for at in CUES["marks"]:
    put(swish(), at, 0.16)
for at in CUES["arts"]:
    put(scroll(), at, 0.13)
r0, r1 = CUES["rewind"]
put(riser(r1 - r0), r0, 0.24)
for at in CUES["rewindT"]:
    put(stamp(0.6), at, 0.35)
put(bianzhong(98, 5.0), CUES["hook"], 0.42)
E = CUES["ending"]
put(bell(98, 7.0), E["textC"][0], 0.55)
duckat(E["textC"][0], 0.75, 1.6)
put(chime(), E["textD"][0], 0.22)

wind = "/Volumes/DevSSD/tmp/pop-mus/lib/ambience-wind-05.wav"
if not os.path.exists(wind):
    subprocess.run(["curl", "-s", "-o", wind, "https://music-cdn.shapeof.world/tracks/ambience-wind-05/v1/master.wav"], check=True)
if not os.path.exists(wind + ".48k.wav"):
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", wind, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", wind + ".48k.wav"], check=True)
w = load(wind + ".48k.wav")
for t0, t1 in CUES["winds"]:
    a, b = int(t0 * SR), min(N, int(t1 * SR))
    seg = np.resize(w, (b - a, 2))
    e = np.ones(b - a)
    f = min(int(0.6 * SR), (b - a) // 2)
    e[:f] = np.linspace(0, 1, f)
    e[-f:] = np.linspace(1, 0, f)
    fx[a:b] += seg * e[:, None] * 0.26

mix = music * duck[:, None] + fx * 0.55
peak = np.abs(mix).max()
lvl = maximum_filter1d(np.abs(mix).max(axis=1), size=int(0.004 * SR), origin=-int(0.002 * SR))
g = np.minimum(1.0, 0.89 / np.maximum(lvl, 1e-9))
g = minimum_filter1d(g, size=int(0.03 * SR))
c = np.exp(-1 / (0.005 * SR))
out = np.minimum(lfilter([1 - c], [1, -c], g, zi=[c * g[0]])[0], g)
mix = mix * out[:, None]
wavfile.write(os.path.join(ROOT, "public", "film5.wav"), SR, (mix * 32767).astype(np.int16))
print("film5.wav", round(N / SR, 2), "s; pre-limit peak", round(peak, 3), "min gain dB", round(20 * np.log10(out.min()), 1))
