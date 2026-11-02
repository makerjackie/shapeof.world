"""Full-film soundtrack (Film3): the reference soundtrack + 史书 SFX placed from out/cues3.json.
Sample T6 (史书) soundtrack — bianzhong instead of the temple bell, seal stamps, blood-ink splats.
Based on the T5 soundtrack: the reference music (public/t4_ref.wav) + weight on the tragic beats.
2.0 crash: low boom + cold wind in · 4.5 lightning: thunder · 5.0 temple bell (music ducks) · 5.75 reverse whoosh (rewind)
6.75 census chime · 9.4 wind · 11.5 thunder · 12.1 bell (softer)
Everything synthesised here except the wind bed (music.shapeof.world ambience-wind-05, the user's own library)."""
import os, subprocess, numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.join(os.path.dirname(__file__), "..")
SR = 48000
rng = np.random.default_rng(5)

def load(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / (32768.0 if x.dtype == np.int16 else 1.0)
    if x.ndim == 1:
        x = np.stack([x, x], 1)
    assert sr == SR, sr
    return x

def lp(x, f, o=2): return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)
def tt(d): return np.arange(int(d * SR)) / SR

IR = (rng.standard_normal(int(2.8 * SR)) * np.exp(-tt(2.8) / 0.7))
IR = lp(IR, 5000) * 0.02
def verb(x, wet=0.35): return x + wet * fftconvolve(x, IR)[: len(x)]

def boom():
    t = tt(2.2)
    f = 32 + 48 * np.exp(-t / 0.18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.75)
    s += lp(rng.standard_normal(len(t)), 180) * np.exp(-t / 0.12) * 0.6
    return verb(s * 0.9, 0.25)

def thunder():
    t = tt(4.0)
    crack = hp(rng.standard_normal(len(t)), 1800) * np.exp(-t / 0.05) * 0.9
    rum = lp(np.cumsum(rng.standard_normal(len(t))), 220)
    rum /= np.abs(rum).max() + 1e-9
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * 3.1 * t) * np.sin(2 * np.pi * 0.7 * t)
    rum = rum * mod * np.minimum(1, t / 0.06) * np.exp(-t / 1.4)
    return verb(crack + rum * 0.9, 0.3)

def bell(f0=98.0, dur=7.0, g=1.0):
    t = tt(dur)
    # temple-bell partials (hum, prime, tierce, quint, nominal, ...), slight detune for beating
    ratios = [0.5, 1.0, 1.183, 1.506, 2.0, 2.514, 2.662, 3.011, 4.17]
    amps = [0.55, 1.0, 0.6, 0.35, 0.5, 0.25, 0.2, 0.15, 0.08]
    decs = [6.0, 4.5, 3.2, 2.6, 2.2, 1.6, 1.4, 1.1, 0.7]
    s = np.zeros(len(t))
    for r, a, d in zip(ratios, amps, decs):
        for det in (1.0, 1.0016):
            s += a * np.sin(2 * np.pi * f0 * r * det * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    strike = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t / 0.015) * 0.6
    s = (s / 6 + strike) * np.minimum(1, t / 0.004)
    return verb(s * g, 0.45)

def whoosh_rev(dur=0.85):
    t = tt(dur)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    for k in range(8):  # rising band sweep
        a, b = int(len(t) * k / 8), int(len(t) * (k + 1) / 8)
        f = 300 * (2 ** (k * 0.55))
        out[a:b] = bp(n, f, min(f * 2.2, 16000))[a:b]
    env = (t / dur) ** 2.2
    return out * env * 1.4

def chime():
    t = tt(2.5)
    s = sum(a * np.sin(2 * np.pi * 1318.5 * r * t) * np.exp(-t / d) for r, a, d in [(1, 1, 1.2), (2.76, 0.4, 0.5), (5.4, 0.2, 0.25)])
    return verb(s * 0.35, 0.4)


def bianzhong(f0=147.0, dur=5.0, g=1.0):
    t = tt(dur)
    ratios = [1.0, 1.19, 2.76, 4.07, 5.4, 8.93]
    amps = [1.0, 0.7, 0.45, 0.25, 0.18, 0.08]
    decs = [3.4, 2.8, 1.3, 0.8, 0.5, 0.25]
    s = sum(a * np.sin(2 * np.pi * f0 * r * t + rng.uniform(0, 6.28)) * np.exp(-t / d) for r, a, d in zip(ratios, amps, decs))
    strike = bp(rng.standard_normal(len(t)), 800, 5000) * np.exp(-t / 0.01) * 0.5
    return verb((s / 2.5 + strike) * g * np.minimum(1, t / 0.003), 0.4)

def stamp(g=1.0):
    t = tt(0.6)
    thump = np.sin(2 * np.pi * (70 + 90 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.09)
    slap = bp(rng.standard_normal(len(t)), 500, 3500) * np.exp(-t / 0.025) * 0.7
    return verb((thump + slap) * g, 0.15)

def splat(g=1.0):
    t = tt(1.4)
    body = bp(rng.standard_normal(len(t)), 250, 2600) * np.exp(-t / 0.18)
    low = np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.25) * 0.8
    drops = np.zeros(len(t))
    for _ in range(14):
        a = int(rng.uniform(0.12, 1.1) * SR)
        n = int(0.012 * SR)
        drops[a:a + n] += bp(rng.standard_normal(n), 1500, 6000) * np.exp(-np.arange(n) / (0.003 * SR)) * rng.uniform(0.1, 0.35)
    return verb((body + low + drops) * g, 0.3)

import json
CUES = json.load(open(os.path.join(ROOT, "out", "cues4.json")))
_src = os.path.join(ROOT, "public", "ref_full.wav")
if not os.path.exists(_src):
    subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", "/Volumes/DevSSD/tmp/pop-ref/ref.wav", "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", _src], check=True)
full = load(_src)
# edit the reference soundtrack on its accents: 15 ms equal-power crossfades at each seam
XF = int(0.015 * SR)
music = full[int(CUES["edl"][0][0] * SR):int(CUES["edl"][0][1] * SR)].copy()
for a_, b_ in CUES["edl"][1:]:
    seg = full[int(a_ * SR):int(b_ * SR)].copy()
    ramp = np.linspace(0, 1, XF)[:, None]
    tail = music[-XF:] * np.cos(ramp * np.pi / 2) + seg[:XF] * np.sin(ramp * np.pi / 2)
    music = np.concatenate([music[:-XF], tail, seg[XF:]])
print("edited music", round(len(music) / SR, 2), "s")
N = len(music)
fx = np.zeros((N, 2))
def put(sig, at, g=1.0, pan=0.0):
    a = int(at * SR)
    b = min(N, a + len(sig))
    if b <= a:
        return
    L, R = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    fx[a:b, 0] += sig[: b - a] * g * L * 1.414
    fx[a:b, 1] += sig[: b - a] * g * R * 1.414

for at in CUES["inks"]:
    put(boom(), at, 0.45)
    put(splat(), at, 0.6)
    put(thunder(), at, 0.2)
for i, at in enumerate(CUES["seals"]):
    put(stamp(0.9), at, 0.6)
for at in CUES["rewind"]:
    put(stamp(0.7), at, 0.55)
put(whoosh_rev(), 5.75 - 0.85 + 0.9, 0.18)
for at in CUES["bursts"]:
    put(bianzhong(587, 2.2, 0.5), at, 0.35)
for at in CUES["milestones"]:
    put(stamp(0.5), at, 0.4)
    put(chime(), at, 0.3)
# deep bells after the worst blows
for at in CUES["heavy"]:
    put(bianzhong(147, 5.0), at, 0.5)
put(boom(), 2.0, 0.5)

# wind bed (the user's library)
wind_mp3 = "/Volumes/DevSSD/tmp/pop-mus/lib/ambience-wind-05.wav"
if not os.path.exists(wind_mp3):
    subprocess.run(["curl", "-s", "-o", wind_mp3, "https://music-cdn.shapeof.world/tracks/ambience-wind-05/v1/master.wav"], check=True)
subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", wind_mp3, "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", wind_mp3 + ".48k.wav"], check=True)
w = load(wind_mp3 + ".48k.wav")
def bed(t0, t1, g):
    a, b = int(t0 * SR), int(t1 * SR)
    seg = np.resize(w, (b - a, 2))
    e = np.ones(b - a)
    f = int(0.6 * SR)
    e[:f] = np.linspace(0, 1, f)
    e[-f:] = np.linspace(1, 0, f)
    fx[a:b] += seg * e[:, None] * g
for t0, t1 in CUES["winds"]:
    bed(t0, t1, 0.3)

# duck the music under the bells and the booms
duck = np.ones(N)
for at, depth, d in [(x, 0.75, 0.5) for x in CUES['inks']] + [(x, 0.65, 1.1) for x in CUES['heavy']]:
    a = int(at * SR)
    t = tt(d + 0.6)
    env = 1 - (1 - depth) * np.where(t < d, 1.0, np.exp(-(t - d) / 0.25))
    b = min(N, a + len(env))
    duck[a:b] = np.minimum(duck[a:b], env[: b - a])
mix = music * duck[:, None] + fx * 0.55
peak = np.abs(mix).max()
# peak limiter: instant attack, 80 ms release; leaves the music level alone except where the hits land
lvl = np.abs(mix).max(axis=1)
from scipy.ndimage import maximum_filter1d, minimum_filter1d
from scipy.signal import lfilter
lvl = maximum_filter1d(lvl, size=int(0.004 * SR), origin=-int(0.002 * SR))
g = np.minimum(1.0, 0.89 / np.maximum(lvl, 1e-9))
g = minimum_filter1d(g, size=int(0.03 * SR))
c = np.exp(-1 / (0.005 * SR))
out = lfilter([1 - c], [1, -c], g)
out = np.minimum(out, g)
mix = mix * out[:, None]
wavfile.write(os.path.join(ROOT, "public", "film4.wav"), SR, (mix * 32767).astype(np.int16))
print("film4.wav pre-limit peak", round(peak, 3), "min gain dB", round(20 * np.log10(out.min()), 1))
