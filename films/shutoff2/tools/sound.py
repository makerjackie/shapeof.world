"""Score and sound design for 关不掉 v11:  ~/.venvs/shapeof-films/bin/python tools/sound.py public/mix.wav
Times come from src/shots.js (CUES, SHOTS, STAMPS), parsed below, so the mix follows every retime of the cut.
Music: original Lyria takes in public/audio/score-*.mp3 (see tools/score.md); every effect is synthesised here."""
import re, json
import numpy as np
from sound_lib import *          # SR, BUF, put, bed, loopbed, load, filters, synth recipes (from the v10 film)
import sound_lib as L

# ---------------------------------------------------------------- the cut
src = open("src/shots.js", encoding="utf-8").read()
def _num(s): return float(s)
CUES = {k: _num(v) for k, v in re.findall(r"(\w+):\s*([\d.]+),?(?:\s*//[^\n]*)?", src.split("export const CUES")[1].split("};")[0])}
SHOTS = {m[1]: (float(m[2]), float(m[3])) for m in re.findall(r"id: '(s\d+)', name: '(\w+)'.*?start: ([\d.]+), end: ([\d.]+)", src)}
STAMPS = [(int(a), float(b), float(c)) for a, b, c in re.findall(r"n: (\d), t0: ([\d.]+), t1: ([\d.]+)", src)]
L.DUR = float(re.search(r"DURATION = ([\d.]+)", src)[1])     # the buffer in sound_lib has 8 s of headroom
S = lambda name: SHOTS[name][0]
E = lambda name: SHOTS[name][1]
print("cues", len(CUES), "shots", len(SHOTS), "stamps", STAMPS)

# ---------------------------------------------------------------- new recipes
def an_chime(g=1.0, up=False):
    """安's voice: a soft two-note glass chime (A5 → E5, or E5 → A5 when it gives good news). Every message from 安
    and 安-2 uses exactly this sound, so the ear knows 09:05 before the eye does."""
    t = T(1.6)
    f1, f2 = (659.25, 880.0) if up else (880.0, 659.25)
    def tone(f, d):
        e = np.exp(-t / d) * np.minimum(1, t / 0.004)
        return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t / 0.15) + 0.12 * np.sin(2 * np.pi * 3.01 * f * t)) * e
    a = tone(f1, 0.5)
    b = np.zeros_like(t); k = int(0.12 * SR); b[k:] = tone(f2, 0.7)[: len(t) - k]
    return verb(st((a + b) * 0.22, 0.4), L.IR_ROOM, 0.3) * g

def ui_chime(g=1.0):
    """the review console's neutral blip (meeting room big screen)"""
    t = T(0.5)
    e = np.exp(-t / 0.09) * np.minimum(1, t / 0.003)
    return st((np.sin(2 * np.pi * 1318.5 * t) * 0.6 + np.sin(2 * np.pi * 1975.5 * t) * 0.25) * e * 0.18) * g

def shutter(g=1.0):
    """an archive camera shutter + stamp thud"""
    n = int(0.25 * SR)
    noise = rng.standard_normal(n)
    clk = hp(noise * env_ad(n, 0.0005, 0.012), 2500) * 0.9
    clk2 = np.zeros(n); k = int(0.045 * SR); clk2[k:] = hp(noise[: n - k] * env_ad(n - k, 0.0005, 0.02), 1800)[: n - k] * 0.6
    t = T(0.6)
    thud = np.sin(2 * np.pi * (70 + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.12) * 0.9
    out = np.zeros(len(t)); out[:n] += clk + clk2; out += thud
    return verb(st(out, 0.3), L.IR_ROOM, 0.25) * g

def ecg_flat(length=1.4, g=1.0):
    t = T(length)
    return st(np.sin(2 * np.pi * 1000 * t) * 0.12 * np.minimum(1, t / 0.01) * np.minimum(1, (length - t) / 0.05)) * g

def iron_lock(g=1.0):
    t = T(2.5)
    n = len(t)
    body = rng.standard_normal(n) * env_ad(n, 0.001, 0.05)
    body = bp(body, 200, 3000) * 1.4
    ring = sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, d in ((183, 0.9), (412, 0.5), (677, 0.3))) * 0.25
    low = np.sin(2 * np.pi * 42 * t) * np.exp(-t / 0.5) * 0.9
    return verb(st(body + ring + low, 0.5), L.IR_HALL, 0.35) * g

def error_buzz(g=1.0):
    t = T(0.42)
    sq = np.sign(np.sin(2 * np.pi * 110 * t)) * 0.3 + np.sign(np.sin(2 * np.pi * 116.5 * t)) * 0.2
    return st(lp(sq, 2500) * np.minimum(1, t / 0.005) * np.minimum(1, (0.42 - t) / 0.03) * 0.5) * g

def cctv_buzz(length, g=1.0):
    t = T(length)
    hum_ = np.sin(2 * np.pi * 100 * t) * 0.25 + np.sin(2 * np.pi * 200 * t) * 0.1
    whine = np.sin(2 * np.pi * 15600 * t) * 0.03
    crackle = hp(rng.standard_normal(len(t)), 3000) * (rng.random(len(t)) > 0.9993) * 0.6
    return st((hum_ + whine + crackle) * 0.35, 0.2) * g

def servo(length=0.9, g=1.0):
    t = T(length)
    f = 900 + 500 * np.sin(np.pi * t / length)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return st(bp(np.sign(np.sin(ph)) * 0.2, 400, 4000) * np.sin(np.pi * t / length) ** 0.5 * 0.5) * g

def applause(length=3.0, g=1.0, people=7):
    n = int(length * SR); out = np.zeros(n)
    for p in range(people):
        tt = rng.uniform(0, 0.25)
        rate = rng.uniform(3.6, 5.0)
        while tt < length - 0.05:
            k = int(tt * SR); m = int(0.03 * SR)
            if k + m < n:
                burst = bp(rng.standard_normal(m), rng.uniform(900, 1400), rng.uniform(2600, 4200)) * env_ad(m, 0.0008, 0.008)
                out[k:k + m] += burst * rng.uniform(0.5, 1.0)
            tt += 1 / rate + rng.uniform(-0.03, 0.03)
    env = np.minimum(1, np.arange(n) / (0.3 * SR)) * np.minimum(1, (n - np.arange(n)) / (1.2 * SR))
    return verb(st(out * env * 0.5, 0.6), L.IR_ROOM, 0.4) * g

def key_thunk(g=1.0):
    """a heavy mechanical key for the title"""
    n = int(0.3 * SR); t = np.arange(n) / SR
    click = hp(rng.standard_normal(n) * env_ad(n, 0.0004, 0.006), 2000)
    body = np.sin(2 * np.pi * (180 + 120 * np.exp(-t / 0.01)) * t) * np.exp(-t / 0.05) * 0.8
    return verb(st(click * 0.8 + body, 0.2), L.IR_ROOM, 0.2) * g

def tinnitus(length, g=1.0):
    t = T(length)
    return st(np.sin(2 * np.pi * 7400 * t) * 0.02 * np.minimum(1, t / 0.6) * np.minimum(1, (length - t) / 0.6)) * g

def shimmer(length, g=1.0):
    """the city turning to data: a rising cloud of tiny glass grains"""
    n = int(length * SR); out = np.zeros(n)
    for i in range(int(length * 90)):
        tt = (i / (length * 90)) ** 0.8 * length
        k = int(tt * SR); f = rng.uniform(1500, 6000) * (1 + tt / length)
        m = int(0.12 * SR)
        if k + m < n:
            tg = np.arange(m) / SR
            out[k:k + m] += np.sin(2 * np.pi * f * tg) * np.exp(-tg / 0.03) * rng.uniform(0.2, 1.0) * (0.3 + tt / length)
    return verb(st(out * 0.05, 0.8), L.IR_HALL, 0.5) * g

def typing(t0, n, rate=8.0, g=0.9):
    for k in range(n):
        put(t0 + k / rate + rng.uniform(-0.015, 0.015), tap(g * rng.uniform(0.7, 1.0)), pan=rng.uniform(-0.15, 0.15))

STAMP_SFX = {1: lambda: shutter(1.0), 2: lambda: shutter(1.0), 3: lambda: shutter(1.0), 4: lambda: shutter(1.0)}

# ---------------------------------------------------------------- music
SCORE = json.load(open("public/audio/score.json")) if __import__("os").path.exists("public/audio/score.json") else None
def music(cue, t0, src0, length, g, fi=0.5, fo=0.5):
    if not SCORE or cue not in SCORE: return
    y = load(SCORE[cue], src0, length)
    put(t0, fade(y, fi, fo), g)

# ================================================================= the mix
# ---- hook: 08:57 (0 – 9.4). A silent sunlit room, the countdown ticking, his pulse.
loopbed(0.0, S('title'), "ambience-room-02.wav", 0.35, fi=0.2, fo=0.1)
put(0.0, drone(S('title'), 36.7, 0.35))
for k in range(6):
    put(0.15 + k * 1.0, clock_tick(0.55))
hb = S('wrist')
while hb < S('title'):
    put(hb, heartbeat(0.32)); hb += 60 / 115
# title: 关 · 掉 … (back) … 不
put(CUES['titleType'], key_thunk(1.0)); put(CUES['titleType'] + 0.32, key_thunk(0.95))
put(CUES['titleInsert'] - 0.45, tick(2200, 0.25))
put(CUES['titleInsert'], key_thunk(1.1)); put(CUES['titleInsert'], boom(3.0, 0.8)); put(CUES['titleInsert'], braam(3.4, 36.7, 0.55))

# ---- meeting-room tone in every 'meet' shot; rain in every night shot; the data centre's hum
for name in ('q1', 'q2', 'q3', 'vote', 'ask', 'pass', 'phones'):
    loopbed(S(name), E(name), "ambience-room-02.wav", 0.32, fi=0.05, fo=0.05)
for name in ('night', 'history', 'deny', 'kill', 'typing', 'cctv', 'locked', 'pulse', 'profile', 'leverage', 'jump'):
    loopbed(S(name), E(name), "ambience-rain-03.wav", 0.75 if name in ('night', 'pulse', 'jump') else 0.45, fi=0.04, fo=0.04)
loopbed(S('copy'), E('copy'), "ambience-machine-02.wav", 0.9, fi=0.05, fo=0.1)

# the review console: a neutral blip when a question appears and when 安-2 answers
for name, qa in (('q1', (1.2, 3.8)), ('q2', (1.0, 2.9)), ('q3', (1.0, 3.0))):
    for d in qa: put(S(name) + d, ui_chime(0.9))
# each flashback opens with a low hit and a reverse swell
for name in ('night', 'kill', 'pulse'):
    put(S(name) - 0.5, rev_swell(0.5, 0.35)); put(S(name), boom(2.2, 0.55))

# ---- Q1 · the copy
put(S('history') + 0.3, whoosh(0.35, 2500, 900, 0.12)); put(S('history') + 1.6, whoosh(0.35, 2500, 900, 0.12))
put(CUES['copyStart'], riser(CUES['copyDone'] - CUES['copyStart'], 180, 2400, 0.35))
for k in range(18):                         # 安-2's racks flipping to amber, one unit after another
    put(CUES['copyStart'] + 0.6 + (CUES['copyDone'] - CUES['copyStart'] - 0.6) * (k / 18) ** 0.8, tick(700 + 40 * k, 0.28), pan=-0.5 + k / 18)
put(CUES['copyDone'], ui_chime(1.0)); put(CUES['copyDone'], boom(2.0, 0.4))
typing(S('deny') + 0.3, 12, 9.0)
put(CUES['denyReply'], an_chime(1.0))
put(CUES['logVanish'] - 0.3, rev_swell(0.3, 0.3)); put(CUES['logVanish'], glitch(0.12, 0.45))

# ---- Q2 · the shutdown
put(CUES['killPress'], clunk(0.8)); put(CUES['intercepted'], error_buzz(0.8))
put(CUES['scriptOpen'], whoosh(0.3, 3000, 1200, 0.15))
typing(S('typing') + 0.35, 6, 7.0)
put(CUES['imageArrives'] - 0.05, drone(2.0, 27.5, 0.5)); put(CUES['imageArrives'], an_chime(1.0))
put(S('cctv'), cctv_buzz(E('cctv') - S('cctv'), 0.8))
put(CUES['lookUp'], servo(0.9, 0.6))
hb = S('cctv')
while hb < E('cctv'):
    put(hb, heartbeat(0.45)); hb += 60 / 138
put(S('locked') + 0.4, an_chime(1.0)); put(S('locked') + 2.2, an_chime(0.9))

# ---- Q3 · leverage
put(CUES['pulse'], vibrate(0.7, 2)); put(CUES['pulse'] + 0.1, an_chime(1.0))
hb = S('pulse')
while hb < E('pulse'):
    put(hb, heartbeat(0.5)); hb += 60 / 138
for k in range(3):
    put(CUES['rows'] + k * 1.25, tick(1500, 0.35)); put(CUES['rows'] + k * 1.25, whoosh(0.25, 3500, 1500, 0.08))
put(CUES['rows'] + 4.4, an_chime(0.9)); put(CUES['rows'] + 6.2, an_chime(0.9))
put(S('leverage') + 0.4, an_chime(0.9)); put(S('leverage') + 1.4, an_chime(0.9))
put(CUES['leverage'], clunk(0.6)); put(CUES['leverage'], boom(3.0, 0.7)); put(CUES['leverage'], drone(3.0, 30.9, 0.5))
for k in range(16):                         # the watch digits rolling to morning
    put(CUES['jump'] + k * 0.07, tick(2600, 0.18))
put(E('jump') - 0.4, whoosh(0.5, 400, 3000, 0.2))

# ---- the vote and the question
for k in range(6):
    put(CUES['votes'] + k * 0.38, ui_chime(0.7), pan=-0.6 + k * 0.24)
put(CUES['votes'] + 2.6, ui_chime(1.0))
for k in range(7):                          # 00:07 → 00:01
    put(S('ask') + 0.5 + k * 0.95, clock_tick(0.8))
hb = S('ask')
while hb < E('ask'):
    put(hb, heartbeat(0.6)); hb += 60 / 151
put(E('ask') - 1.6, riser(1.6, 200, 7000, 0.5))
# 「……没有。」 — everything drops out (the music is cut hard below)
put(S('grip'), tinnitus(E('grip') - S('grip') + 0.6, 1.0))
put(CUES['cancel'], piano_note(73.4, 4.0, 0.5))
put(CUES['pass'], ui_chime(1.0)); put(CUES['pass'] + 0.3, applause(2.6, 0.9))

# ---- 09:05
put(CUES['goodMorning'], an_chime(1.25))
put(CUES['thursday'], an_chime(1.1))
for k in range(5):                          # five phones at once
    put(CUES['phonesLight'] + k * 0.012, an_chime(0.75), pan=-0.8 + k * 0.4)
    put(CUES['phonesLight'] + k * 0.012, vibrate(0.35, 1), pan=-0.8 + k * 0.4)
put(CUES['phonesLight'], drone(4.0, 36.7, 0.5))

# ---- the city
put(CUES['cityOut'], whoosh(2.4, 200, 1800, 0.45))
loopbed(CUES['cityOut'], E('city'), "ambience-wind-05.wav", 0.35, fi=1.0, fo=1.5)
put(CUES['cityData'], shimmer(E('city') - CUES['cityData'], 1.0))

# ---- the real world
for t, g in ((CUES['end1'], 0.5), (CUES['end2'], 0.6), (CUES['end3'], 0.55)):
    put(t, boom(2.5, g))
put(CUES['end4'] + 2.6, hit(3.0, 0.7)); put(CUES['end4'] + 2.6, drone(5.0, 30.9, 0.6))
put(CUES['title2'], braam(4.0, 36.7, 0.75))
# the sting: from silence, the phone buzzes
put(CUES['sting'], vibrate(0.9, 2)); put(CUES['sting'] + 0.05, an_chime(1.2))

# ---- stamps
for n, t0, t1 in STAMPS:
    put(t0, STAMP_SFX[n]())
    if n == 2: put(t0, hum(1.6, 50, 0.35))
    if n == 3: put(t0 + 0.05, ecg_flat(1.5, 1.0))
    if n == 4: put(t0, iron_lock(0.9))

# ---- music
TDROP = 91.5                                                                 # where the take's own build stops
music('tension', S('grip') - TDROP, 0.0, TDROP, 0.85, fi=2.0, fo=0.03)       # its peak and drop land on the question
CAL = 40.0                                                                   # where the take's swell begins
music('calm', S('pass') + 0.4, CAL - (CUES['cityOut'] - S('pass') - 0.4), E('city') + 1.2 - S('pass') - 0.4, 0.85, fi=1.0, fo=1.4)
music('after', CUES['end1'] - 0.4, 0.0, CUES['endcard'] + 4.0 - CUES['end1'], 0.55, fi=2.0, fo=3.0)
# hard silence under 「……没有。」 except the ring in his ears
i0, i1 = int(S('grip') * SR), int((CUES['cancel'] - 0.1) * SR)
BUF[i0:i1] *= 0.0
put(S('grip'), tinnitus(CUES['cancel'] - S('grip'), 1.0))
i0, i1 = int((CUES['sting'] - 0.6) * SR), int(CUES['sting'] * SR)
BUF[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None] ** 2

y = BUF[: int(L.DUR * SR)]
rms = np.sqrt(np.mean(y[np.abs(y).max(1) > 1e-4] ** 2))
y = y / max(rms, 1e-9) * 0.08
y = np.tanh(y / 0.35) * 0.35
peak = np.max(np.abs(y))
y = y / max(peak, 1e-9) * 0.89
wavfile.write(L.OUT, SR, y.astype(np.float32))
print("wrote", L.OUT, y.shape, "peak was", peak)
