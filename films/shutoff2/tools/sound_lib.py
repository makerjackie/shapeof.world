"""Score and sound design for 《关不掉》: python tools/sound.py public/mix.wav
Music beds come from the film library (music.shapeof.world, public/music/*); every effect is synthesised here.
All times are film seconds and follow src/shots.js (CUES)."""
import subprocess, sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve
from scipy.io import wavfile

SR = 48000
PRE = 0.0  # no pre-roll in v11
DUR = 156.0
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/mix.wav"
rng = np.random.default_rng(1402)
M = "public/audio/"

def load(name, start=0.0, length=None):
    args = ["ffmpeg", "-nostdin", "-v", "error", "-ss", str(start), "-i", M + name]
    if length: args += ["-t", str(length)]
    args += ["-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    y = np.frombuffer(subprocess.run(args, capture_output=True, check=True).stdout, np.float32).reshape(-1, 2).astype(np.float64)
    return y

def sos(kind, f, order=2): return butter(order, f, kind, fs=SR, output="sos")
def lp(x, f, o=2): return sosfilt(sos("lowpass", f, o), x, axis=0)
def hp(x, f, o=2): return sosfilt(sos("highpass", f, o), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(sos("bandpass", [lo, hi], o), x, axis=0)
def T(d): return np.arange(int(d * SR)) / SR
def sweep_lp(x, cut, blk=2048):
    out = np.zeros_like(x)
    for k in range(0, len(x), blk):
        out[k:k + blk] = lp(x[k:k + blk + 512], float(min(20000, max(30, cut[k]))))[: len(out[k:k + blk])]
    return out
def env_ad(n, a, d):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)
def st(m, w=0.0):
    """mono → stereo with a little width"""
    if m.ndim == 2: return m
    if w <= 0: return np.stack([m, m], 1)
    d = int(w * SR / 1000)
    r = np.concatenate([np.zeros(d), m[:-d]]) if d > 0 else m
    return np.stack([m, r], 1)
def fade(y, fi=0.0, fo=0.0):
    n = len(y); g = np.ones(n)
    if fi > 0: k = min(n, int(fi * SR)); g[:k] = np.linspace(0, 1, k) ** 2
    if fo > 0: k = min(n, int(fo * SR)); g[n - k:] *= np.linspace(1, 0, k) ** 2
    return y * (g[:, None] if y.ndim == 2 else g)

# synthetic room / hall impulse responses
def ir(length, decay, bright=4000):
    n = int(length * SR); t = np.arange(n) / SR
    noise = rng.standard_normal((n, 2))
    return lp(noise, bright) * np.exp(-t / decay)[:, None] * 0.08
IR_HALL = ir(4.5, 1.1, 5000)
IR_ROOM = ir(1.2, 0.25, 6000)
IR_BIG = ir(7.0, 2.0, 2500)
def verb(x, irr, wet=0.35):
    x = st(x)
    y = np.stack([fftconvolve(x[:, 0], irr[:, 0]), fftconvolve(x[:, 1], irr[:, 1])], 1)
    out = np.zeros_like(y); out[: len(x)] += x * (1 - wet); out += y * wet
    return out

BUF = np.zeros((int((PRE + DUR) * SR) + SR * 8, 2))
def put(t, sig, g=1.0, pan=0.0):
    sig = st(sig) * g
    i = int((t + PRE) * SR)
    if i < 0: sig = sig[-i:]; i = 0
    n = min(len(sig), len(BUF) - i)
    l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414
    BUF[i:i + n, 0] += sig[:n, 0] * l
    BUF[i:i + n, 1] += sig[:n, 1] * r

def bed(t0, t1, name, src, g, fi=0.5, fo=0.5):
    y = load(name, src, t1 - t0)
    put(t0, fade(y, fi, fo), g)

def loopbed(t0, t1, name, g, fi=1.0, fo=1.0, start=0.0):
    y = load(name, start)
    n = int((t1 - t0) * SR); out = np.zeros((n, 2)); xf = int(0.5 * SR); pos = 0
    while pos < n:
        k = min(len(y), n - pos)
        seg = y[:k].copy()
        if pos > 0: seg[:xf] *= np.linspace(0, 1, xf)[:, None] if k >= xf else 1
        out[pos:pos + k] += seg
        pos += len(y) - xf
    put(t0, fade(out, fi, fo), g)

# ---------------- synth recipes ----------------
def saw(f, t): return 2 * ((f * t) % 1.0) - 1
def braam(length=4.0, root=55.0, g=1.0):
    t = T(length)
    s = np.zeros_like(t)
    for f, a in [(root, 1.0), (root * 1.005, 0.8), (root * 0.995, 0.8), (root * 1.5, 0.45), (root * 2, 0.3), (root * 0.5, 0.6)]:
        s += saw(f, t) * a
    e = np.minimum(1, t / 0.03) * np.exp(-t / (length * 0.38))
    cut = 300 + 2400 * np.exp(-t / 0.5)
    out = np.zeros_like(s); blk = 2048
    for k in range(0, len(s), blk):
        out[k:k + blk] = lp(s[k:k + blk + 512], float(cut[k]))[: len(out[k:k + blk])]
    out = np.tanh(out * 1.8) * e
    sub = np.sin(2 * np.pi * root * 0.75 * t) * np.exp(-t / 1.6) * np.minimum(1, t / 0.01)
    noise = lp(rng.standard_normal(len(t)), 900) * env_ad(len(t), 0.005, 0.25)
    return verb(st(out * 0.5 + sub * 0.9 + noise * 0.35, 9), IR_BIG, 0.3) * g

def hit(length=3.0, g=1.0):
    t = T(length)
    sub = np.sin(2 * np.pi * (34 + 46 * np.exp(-t * 7)) * t) * np.exp(-t / 0.9)
    body = lp(rng.standard_normal(len(t)), 500) * env_ad(len(t), 0.002, 0.22)
    metal = sum(np.sin(2 * np.pi * f * t + p) * np.exp(-t / d) for f, p, d in [(180, 0, 0.9), (497, 1, 0.5), (972, 2, 0.3), (1610, 3, 0.2)]) * 0.15
    crack = hp(rng.standard_normal(len(t)), 2500) * env_ad(len(t), 0.0005, 0.02) * 0.5
    return verb(st(sub * 1.1 + body * 0.6 + metal + crack, 7), IR_BIG, 0.35) * g

def boom(length=2.5, g=1.0):
    t = T(length)
    s = np.sin(2 * np.pi * (30 + 30 * np.exp(-t * 5)) * t) * np.exp(-t / 0.8) * np.minimum(1, t / 0.008)
    return verb(st(s + lp(rng.standard_normal(len(t)), 200) * env_ad(len(t), 0.01, 0.3) * 0.4), IR_HALL, 0.25) * g

def riser(length, f0=200, f1=5000, g=1.0, tone=True):
    t = T(length); n = len(t)
    noise = rng.standard_normal(n); out = np.zeros(n); blk = 2048
    for k in range(0, n, blk):
        f = f0 * (f1 / f0) ** (k / n)
        out[k:k + blk] = bp(noise[k:k + blk + 512], max(60, f * 0.6), min(20000, f * 1.6))[: len(out[k:k + blk])]
    e = (t / length) ** 2.2
    s = out * e
    if tone:
        ph = 2 * np.pi * np.cumsum(90 * (8 ** (t / length))) / SR
        s += (np.sin(ph) + 0.5 * np.sin(ph * 1.5)) * e * 0.35
    return st(s, 11) * g

def rev_swell(length=1.5, g=1.0):
    x = riser(length, 300, 9000, 1.0, False)[:, 0]
    return verb(st(x, 5), IR_HALL, 0.5)[: len(x)] * g

def whoosh(length, f0, f1, g=1.0):
    t = T(length); n = len(t); noise = rng.standard_normal(n); out = np.zeros(n); blk = 2048
    for k in range(0, n, blk):
        f = f0 + (f1 - f0) * (k / n)
        out[k:k + blk] = bp(noise[k:k + blk + 512], max(80, f * 0.7), f * 1.3)[: len(out[k:k + blk])]
    return st(out * np.sin(np.pi * t / length) ** 1.5, 8) * g

def ping(g=1.0):
    t = T(1.4)
    s = np.zeros_like(t)
    for f0, t0 in [(1318.5, 0.0), (1975.5, 0.11)]:
        tt = np.clip(t - t0, 0, None)
        on = (t >= t0)
        s += on * (np.sin(2 * np.pi * f0 * tt) + 0.25 * np.sin(2 * np.pi * f0 * 2.76 * tt) * np.exp(-tt / 0.05)) * np.exp(-tt / 0.35) * np.minimum(1, tt / 0.003)
    return verb(st(s * 0.35), IR_ROOM, 0.25) * g

def vibrate(g=1.0, pulses=2):
    out = []
    for k in range(pulses):
        t = T(0.38)
        s = np.sign(np.sin(2 * np.pi * 172 * t)) * 0.6 + np.sin(2 * np.pi * 344 * t) * 0.2
        s = lp(s, 900) * np.minimum(1, np.minimum(t / 0.01, (0.38 - t) / 0.02))
        out += [s, np.zeros(int(0.16 * SR))]
    s = np.concatenate(out)
    # rattle on the desk
    s = s + bp(rng.standard_normal(len(s)), 300, 1500) * np.abs(s) * 0.3
    return verb(st(s), IR_ROOM, 0.2) * g

def tap(g=1.0):
    t = T(0.05)
    s = bp(rng.standard_normal(len(t)), 1800, 6000) * env_ad(len(t), 0.0003, 0.004) + np.sin(2 * np.pi * 220 * t) * env_ad(len(t), 0.001, 0.008) * 0.4
    return st(s * 0.5) * g

def tick(f=1800, g=1.0):
    t = T(0.12)
    s = np.sin(2 * np.pi * f * t) * env_ad(len(t), 0.0005, 0.01) + bp(rng.standard_normal(len(t)), 2000, 8000) * env_ad(len(t), 0.0002, 0.003) * 0.6
    return verb(st(s), IR_ROOM, 0.3) * g

def clock_tick(g=1.0):
    t = T(0.6)
    s = np.sin(2 * np.pi * 1100 * t) * env_ad(len(t), 0.0005, 0.02) + np.sin(2 * np.pi * 90 * t) * env_ad(len(t), 0.001, 0.06) * 0.8
    return verb(st(s), IR_HALL, 0.35) * g

def clunk(g=1.0):
    t = T(3.5)
    thud = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 20)) * t) * env_ad(len(t), 0.001, 0.25)
    metal = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in [(310, 0.6), (733, 0.35), (1290, 0.2), (2210, 0.12)]) * 0.25
    snap = hp(rng.standard_normal(len(t)), 1500) * env_ad(len(t), 0.0003, 0.015)
    arc = bp(rng.standard_normal(len(t)), 2000, 9000) * env_ad(len(t), 0.001, 0.08) * 0.5
    return verb(st(thud * 1.2 + metal + snap + arc, 5), IR_HALL, 0.3) * g

def spin_down(length=4.0, g=1.0):
    t = T(length)
    f = 118 * np.exp(-t / 1.1) + 8
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = sum(np.sin(ph * k) / k for k in range(1, 7))
    air = sweep_lp(rng.standard_normal(len(t)), 300 + 3000 * np.exp(-t / 0.9)) * np.exp(-t / 1.3)
    return st(tone * 0.4 * np.exp(-t / 1.6) + air * 0.6, 13) * g

def hum(length, f=50, g=1.0):
    t = T(length)
    s = sum(np.sin(2 * np.pi * f * k * t) / k ** 1.3 for k in range(1, 8)) + lp(rng.standard_normal(len(t)), 400) * 0.3
    return st(s * 0.3, 7) * g

def heartbeat(g=1.0):
    t = T(0.9)
    def th(t0, a):
        tt = np.clip(t - t0, 0, None)
        return (t >= t0) * np.sin(2 * np.pi * (42 + 30 * np.exp(-tt * 25)) * tt) * np.exp(-tt / 0.09) * a
    s = th(0, 1.0) + th(0.26, 0.7)
    return verb(st(lp(s, 300)), IR_HALL, 0.2) * g

def glitch(length=0.12, g=1.0):
    n = int(length * SR)
    s = rng.standard_normal(n)
    s = np.round(s * 3) / 3
    s = s * (np.sin(2 * np.pi * rng.uniform(200, 900) * np.arange(n) / SR) > 0)
    return st(hp(s, 300) * np.minimum(1, np.arange(n)[::-1] / (0.01 * SR)) * 0.5, 3) * g

def ringback(g=1.0):
    t = T(1.0)
    s = np.sin(2 * np.pi * 450 * t) * np.minimum(1, np.minimum(t / 0.01, (1 - t) / 0.01))
    return st(bp(s, 300, 3400) * 0.3) * g

def sit(g=1.0):
    out = []
    for f in (950, 1400, 1800):
        t = T(0.33)
        out.append(np.sin(2 * np.pi * f * t) * np.minimum(1, np.minimum(t / 0.005, (0.33 - t) / 0.005)))
    return st(bp(np.concatenate(out), 300, 3400) * 0.25) * g

def lock_chirp_crowd(g=1.0):
    """thousands of cars chirping their locks at the same instant, from far away"""
    t = T(0.08)
    one = np.sin(2 * np.pi * 2650 * t) * np.minimum(1, np.minimum(t / 0.004, (0.08 - t) / 0.01))
    n = int(1.2 * SR); out = np.zeros(n)
    for k in range(300):
        d = int(abs(rng.normal(0, 0.012)) * SR) + int(rng.uniform(0, 0.03) * SR)
        a = rng.uniform(0.2, 1.0) / (1 + k * 0.004)
        out[d:d + len(one)] += one * a
    return verb(st(lp(out, 4000) * 0.02, 15), IR_BIG, 0.6) * g

def swarm(length, g=1.0):
    t = T(length); s = np.zeros_like(t)
    for k in range(40):
        f = rng.uniform(150, 320)
        ph = 2 * np.pi * np.cumsum(f * (1 + 0.02 * np.sin(2 * np.pi * rng.uniform(3, 9) * t + k))) / SR
        s += sum(np.sin(ph * h) / h for h in range(1, 6)) * rng.uniform(0.3, 1.0)
    s = lp(s, 1800) / 40
    return st(s * (t / length) ** 1.2, 17) * g

def siren(length, g=1.0):
    t = T(length)
    f = np.where((t % 1.2) < 0.6, 650, 880)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = (np.sin(ph) + 0.3 * np.sin(2 * ph)) * 0.3
    return verb(st(lp(s, 1800)), IR_BIG, 0.7) * g

def powerdown(g=1.0):
    t = T(3.0)
    f = 90 * np.exp(-t / 0.4) + 25
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.tanh(np.sin(ph) * 3) * np.exp(-t / 0.8)
    zap = bp(rng.standard_normal(len(t)), 1500, 7000) * env_ad(len(t), 0.001, 0.15) * 0.6
    return verb(st(s * 0.6 + zap, 9), IR_BIG, 0.4) * g

def powerup(length=2.6, g=1.0):
    t = T(length)
    f = 30 + 80 * (t / length) ** 1.5
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = sum(np.sin(ph * k) / k for k in range(1, 6)) * (t / length) ** 1.5
    return verb(st(lp(s, 1500) * 0.5, 9), IR_BIG, 0.4) * g

def drone(length, f=41.2, g=1.0):
    t = T(length)
    s = sum(np.sin(2 * np.pi * f * k * t + k) * a for k, a in [(1, 1), (1.5, 0.4), (2, 0.3), (3, 0.12)])
    s *= 0.6 + 0.4 * np.sin(2 * np.pi * 0.07 * t)
    return st(lp(s + lp(rng.standard_normal(len(t)), 120) * 0.5, 600) * 0.3, 21) * g

def piano_note(f, length=6.0, g=1.0):
    t = T(length)
    s = sum(np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k * k)) * np.exp(-t / (2.5 / k)) / k ** 1.2 for k in range(1, 9))
    s *= np.minimum(1, t / 0.004)
    return verb(st(s * 0.25), IR_HALL, 0.45) * g

