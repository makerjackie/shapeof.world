"""Film6 soundtrack (python tools/sfx_film6.py china|world): the reference music re-edited on bar lines (EDL in src/v6/<film>6.ts),
plus synthesised SFX placed from out/cues5.json:
  rush  -> a riser that ends on the arrival        blood -> deep boom + taiko + an ink drop + low bianzhong
  ash   -> boom + taiko, quieter                    gold  -> high bianzhong + chime
  turn (2022) -> low bell                           stamps -> stamp + chime      brush characters -> a short brush swish
  paintings -> paper unrolling                      hook / ending break -> deep bells
The wind bed is from music.shapeof.world (ambience-wind-05, the user's own library)."""
import json, os, subprocess, sys
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



def crack(g=1.0):
    """the sound of the map breaking: a sharp broadband snap with a short crackle tail"""
    t = tt(0.9)
    snap = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t / 0.012)
    tail = bp(rng.standard_normal(len(t)), 600, 4000) * (rng.random(len(t)) < 0.004) * np.exp(-t / 0.25) * 6
    low = np.sin(2 * np.pi * (55 + 60 * np.exp(-t / 0.04)) * t) * np.exp(-t / 0.2)
    return verb((snap * 0.9 + tail * 0.5 + low * 0.8) * g, 0.25)


def impact(g=1.0):
    """sub drop + transient for the collapses"""
    t = tt(1.6)
    f = 28 + 90 * np.exp(-t / 0.07)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    hit = lp(rng.standard_normal(len(t)), 3000) * np.exp(-t / 0.02) * 0.9
    return verb((sub + hit) * g * np.minimum(1, t / 0.001), 0.3)


def ashwind(dur=1.8, g=1.0):
    t = tt(dur)
    n = lp(bp(rng.standard_normal(len(t)), 200, 2400), 1800)
    return n * np.sin(np.pi * t / dur) ** 2 * g


def tick(g=1.0):
    t = tt(0.12)
    return bp(rng.standard_normal(len(t)), 2500, 9000) * np.exp(-t / 0.008) * g



def glass(g=1.0):
    """breaking glass: a hard crack, then a shower of short bright pings"""
    d = 1.6
    t = tt(d)
    out = bp(rng.standard_normal(len(t)), 2000, 11000) * np.exp(-t / 0.03) * 0.9
    for _ in range(90):
        at = rng.uniform(0, 0.9) ** 1.6
        f = rng.uniform(2200, 9000)
        dd = rng.uniform(0.02, 0.12)
        a = int(at * SR)
        n = int(min(d - at, dd * 6) * SR)
        if n <= 0:
            continue
        tp = np.arange(n) / SR
        out[a:a + n] += np.sin(2 * np.pi * f * tp) * np.exp(-tp / dd) * rng.uniform(0.08, 0.3) * np.exp(-at / 0.5)
    low = np.sin(2 * np.pi * (50 + 70 * np.exp(-t / 0.05)) * t) * np.exp(-t / 0.25) * 0.7
    return verb((out + low) * g, 0.35)


def pop(g=1.0):
    """a firework: a soft thump and a crackle that spreads"""
    t = tt(1.6)
    thump = lp(rng.standard_normal(len(t)), 220) * np.exp(-t / 0.09) * 1.4
    cr = (rng.random(len(t)) < 0.0035 * np.exp(-((t - 0.45) / 0.35) ** 2)) * 1.0
    crackle = bp(cr * rng.standard_normal(len(t)) * 8, 2500, 9000) * 0.5
    return verb((thump + crackle) * g, 0.45)


def clunk(g=1.0):
    """a heavy lock closing"""
    t = tt(0.8)
    body = np.sin(2 * np.pi * (180 + 120 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.08)
    click = bp(rng.standard_normal(len(t)), 2500, 8000) * np.exp(-t / 0.006) * 0.8
    return verb((body * 0.8 + click) * g, 0.25)

FILM = sys.argv[1] if len(sys.argv) > 1 else "china"
CUES = json.load(open(os.path.join(ROOT, "out", f"cues6_{FILM}.json")))
full = load(os.path.join(ROOT, "public", CUES.get("musicSrc", "ref_full.wav")))
N = int(round(CUES["dur"] * SR))
music = np.zeros((N, 2))
fs = 0
EDL = CUES["edl"]
for i, (a_, b_) in enumerate(EDL):
    xin = int(0.02 * SR) if i > 0 else 0
    xout = int(0.02 * SR) if i < len(EDL) - 1 else 0
    seg = full[int(a_ * SR):int(b_ * SR) + xout].copy()
    if xin:
        seg[:xin] *= np.sin(np.linspace(0, 1, xin) * np.pi / 2)[:, None]
    if xout:
        seg[-xout:] *= np.cos(np.linspace(0, 1, xout) * np.pi / 2)[:, None]
    if i == len(EDL) - 1:
        fo = int(1.2 * SR)
        seg[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
    e = min(N, fs + len(seg))
    music[fs:e] += seg[: e - fs]
    fs += int(round((b_ - a_) * SR))
print("edited music", round(fs / SR, 2), "s; film", CUES["dur"])
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


for i, at in enumerate(CUES["cold"]):
    put(taiko(1.0), at, 0.55 if i < 6 else 0.7)
    put(impact(0.6), at, 0.25)
for i, at in enumerate(CUES["coldLines"]):
    tone = (CUES.get("coldTones") or ["red"] * 9)[i]
    if tone == "white":
        put(bell(98, 5.0), at + 0.02, 0.32)  # the calm ninth: no boom
    else:
        put(boom(1.8), at, 0.35)
r0, r1 = CUES["rewind"]
if not CUES.get("noRiser"):
    put(riser(r1 - r0), r0, 0.3)
put(impact(1.0), CUES["body"][0], 0.35)
for e in CUES["events"]:
    at, k, big = e["t"], e["k"], e["big"]
    if e["st"]:
        put(taiko(0.7), at, 0.35)
        put(tick(1.0), at, 0.25)
        continue
    if CUES.get("solemnFrom") is not None and k in ("war", "crash", "famine", "plague") and e["y"] >= CUES["solemnFrom"]:
        put(bell(98, 5.0), at + 0.02, 0.3)  # respect: a bell, no drums
        continue
    if k == "crash":
        put(impact(1.0), at, 0.55 if big else 0.4)
        put(taiko(1.0), at, 0.55)
        put(boom(2.0), at, 0.35 if big else 0.2)
        if e["y"] >= 1955:
            put(bell(98, 5.0), at + 0.02, 0.35)
        duckat(at, 0.8, 0.18)
    elif k == "war":
        put(taiko(1.0), at, 0.5 if big else 0.38)
        put(impact(0.7), at, 0.3 if big else 0.15)
        if big:
            put(boom(1.8), at, 0.3)
    elif k == "split":
        put(crack(1.0), at, 0.45)
        put(taiko(0.9), at, 0.35)
    elif k in ("peak", "unite"):
        put(bianzhong(587, 2.4, 0.6), at, 0.3)
        put(chime(), at + 0.02, 0.18)
        if big:
            put(impact(0.8), at, 0.32)
            put(taiko(0.9), at, 0.3)
            put(bianzhong(880, 2.0, 0.5), at + 0.02, 0.18)
    elif k == "turn":
        put(bell(98, 5.0), at, 0.35)
        put(swish(0.8), at, 0.15)
    elif k in ("plague", "famine"):
        put(bell(110, 4.0), at, 0.3)
        put(ashwind(1.6), at, 0.25)
    elif k == "move":
        put(swish(1.0), at, 0.22)
        put(ashwind(1.0, 0.6), at, 0.12)
    elif k in ("stat", "grow", "policy"):
        put(stamp(0.6), at, 0.18)
        if k == "grow":
            put(chime(), at + 0.02, 0.12)
    elif k == "quote":
        put(bianzhong(147, 4.0), at, 0.3)
    elif k == "note":
        put(swish(0.7), at, 0.12)
for r in CUES.get("reveals", []):
    if CUES.get("solemnFrom") is not None and r["k"] in ("war", "crash", "famine", "plague") and r.get("y", 0) >= CUES["solemnFrom"]:
        put(stamp(0.6), r["t"], 0.12)
        continue
    if r["w"] == "num":
        if r["k"] in ("crash", "war", "famine", "plague"):
            put(taiko(0.8), r["t"], 0.32)
            put(stamp(0.7), r["t"], 0.22)
        else:
            put(stamp(0.7), r["t"], 0.24)
            put(tick(1.0), r["t"], 0.16)
    else:
        put(tick(1.0), r["t"], 0.14)
for L in CUES["ending"]:
    if L["brush"]:
        put(bell(98, 7.0), L["t"], 0.5)
        put(impact(0.8), L["t"], 0.3)
    else:
        put(swish(0.6), L["t"], 0.1)
# no chime on the end card
for c in CUES.get("fx", []):
    at, f = c["t"], c["fx"]
    if f == "pop":
        put(pop(1.0), at, 0.42, pan=float(rng.uniform(-0.4, 0.4)))
    elif f == "shatter":
        put(glass(1.0), at, 0.6)
        put(impact(1.0), at, 0.35)
        duckat(at, 0.7, 0.25)
    elif f == "bolt":
        put(crack(1.0), at, 0.35)
    elif f == "bills":
        for q in range(3):
            put(scroll(0.9), at + 0.12 + q * 0.31, 0.16, pan=(q - 1) * 0.5)
    elif f == "closed":
        put(bell(82, 5.0), at, 0.35)
        put(stamp(1.0), at, 0.3)
    elif f == "snap":
        put(crack(1.0), at, 0.5)
        put(bianzhong(440, 3.0, 0.7), at + 0.05, 0.25)
    elif f == "solve":
        put(bianzhong(660, 3.0, 0.7), at, 0.32)
        put(stamp(1.0), at + 0.05, 0.28)
    elif f == "lock":
        put(clunk(1.0), at + 0.25, 0.45)
    elif f == "stamp":
        put(stamp(1.2), at, 0.4)
    elif f == "icon":
        put(swish(0.8), at, 0.14)
    elif f == "bw":
        put(ashwind(1.4, 0.8), at, 0.2)
    elif f == "title":
        put(impact(1.0), at, 0.4)
        put(stamp(1.2), at, 0.3)
    elif f == "ceil":
        put(glass(0.8), at, 0.32)
        put(crack(0.8), at, 0.22)
    elif f == "coin":
        put(bianzhong(1046, 2.4, 0.6), at + 0.05, 0.16)
        put(bianzhong(1568, 1.6, 0.5), at + 0.09, 0.08)
    elif f == "wide":
        put(swish(1.0), at, 0.2)
        put(impact(0.8), at + 0.55, 0.24)
        put(bianzhong(330, 2.4, 0.6), at + 0.57, 0.1)
    elif f == "sweep":
        put(swish(0.7), at, 0.12)
        put(bianzhong(523, 3.0, 0.6), at + 0.1, 0.12)

# hush (respect for the dead): the music sinks to a low, muffled bed and the SFX go quiet; one bell where it starts
hw = np.zeros(N)
for h0, h1 in CUES.get("hush", []):
    a, b = int(h0 * SR), min(N, int(h1 * SR))
    r_in, r_out = int(0.3 * SR), int(0.06 * SR)
    hw[a:b] = 1.0
    hw[a:a + r_in] = np.linspace(0, 1, len(hw[a:a + r_in]))
    hw[b - r_out:b] = np.linspace(1, 0, len(hw[b - r_out:b]))
if hw.any():
    cc = np.exp(-2 * np.pi * 420 / SR)
    lpm = lfilter([1 - cc], [1, -cc], lfilter([1 - cc], [1, -cc], music, axis=0), axis=0)
    music = music * (1 - 0.97 * hw)[:, None] + lpm * (0.06 * hw)[:, None]
    fx = fx * (1 - 0.8 * hw)[:, None]
    for h0, h1 in CUES.get("hush", []):
        put(bell(98, 6.0), h0 + 0.3, 0.42)
# one bar of silence on the great modern wars: the music drops at the card, comes back over the bar's last beat
BEAT = 0.4654
for at in CUES.get("rests", []):
    a = int(at * SR)
    b = min(N, int((at + 4 * BEAT) * SR))
    w = np.ones(b - a)
    k0 = int(0.04 * SR)
    w[:k0] = np.linspace(0, 1, k0)
    k1 = int(BEAT * SR)
    w[-k1:] = np.linspace(1, 0, k1) ** 2
    music[a:b] *= (1 - 0.96 * w)[:, None]
    duck[a:b] = 1.0
    put(bell(82, 6.0), at + 0.02, 0.5)
mix = music * duck[:, None] + fx * 0.46
peak = np.abs(mix).max()
lvl = maximum_filter1d(np.abs(mix).max(axis=1), size=int(0.004 * SR), origin=-int(0.002 * SR))
g = np.minimum(1.0, 0.89 / np.maximum(lvl, 1e-9))
g = minimum_filter1d(g, size=int(0.03 * SR))
c = np.exp(-1 / (0.005 * SR))
out = np.minimum(lfilter([1 - c], [1, -c], g, zi=[c * g[0]])[0], g)
mix = mix * out[:, None]
wavfile.write(os.path.join(ROOT, "public", f"film6_{FILM}.wav"), SR, (mix * 32767).astype(np.int16))
print(f"film6_{FILM}.wav", round(N / SR, 2), "s; pre-limit peak", round(peak, 3), "min gain dB", round(20 * np.log10(out.min()), 1))
