"""Score and sound design for 关不掉 v12:  ~/.venvs/shapeof-films/bin/python tools/sound.py public/mix.wav
Times come from src/shots.js (CUES, SHOTS, REPLAY), parsed below, so the mix follows every retime of the cut.
v12 follows v10's grammar (the client's favourite): one long build, hard cuts to silence, contrast, a montage cut to
《三体》. Music: the film library (music.shapeof.world: event-horizon, three-bodies) and original Lyria takes
(public/audio/score-*.mp3); every effect is synthesised here."""
import re, json, os
import numpy as np
from sound_lib import *          # SR, BUF, put, bed, loopbed, load, filters, synth recipes (from the v10 film)
import sound_lib as L

# ---------------------------------------------------------------- the cut
src = open("src/shots.js", encoding="utf-8").read()
CUES = {k: float(v) for k, v in re.findall(r"(\w+):\s*([\d.]+),?(?:\s*//[^\n]*)?", src.split("export const CUES")[1].split("};")[0])}
SHOTS = {m[0]: (float(m[2]), float(m[3])) for m in re.findall(r"id: '(\w+)', name: '(\w+)'.*?start: ([\d.]+), end: ([\d.]+)", src)}
L.DUR = float(re.search(r"DURATION = ([\d.]+)", src)[1])     # the buffer in sound_lib has 8 s of headroom
S = lambda sid: SHOTS[sid][0]
E = lambda sid: SHOTS[sid][1]
print("cues", len(CUES), "shots", len(SHOTS), "dur", L.DUR)

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



def tape_whir(length, f0, f1, g=1.0):
    """a tape transport winding: a whine sliding f0 → f1 over mechanical flutter"""
    t = T(length)
    f = f0 + (f1 - f0) * (t / length) ** 0.6
    ph = 2 * np.pi * np.cumsum(f) / SR
    flutter = 1 + 0.4 * np.sin(2 * np.pi * 37 * t)
    s = (np.sin(ph) * 0.25 + np.sin(2 * ph) * 0.1) + bp(rng.standard_normal(len(t)), 900, 6000) * 0.18 * flutter
    env = np.minimum(1, t / 0.05) * np.minimum(1, (length - t) / 0.08)
    return st(s * env * 0.6, 0.3) * g

def tape_stop(g=1.0):
    """the transport braking to a freeze: pitch falls away, then a thud"""
    t = T(0.6)
    f = 40 + 560 * np.exp(-t / 0.08)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / 0.18) * 0.4
    thud = np.sin(2 * np.pi * (55 + 40 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.15) * 0.9
    return verb(st(s + thud, 0.2), L.IR_ROOM, 0.2) * g

# ---------------------------------------------------------------- music
SCORE = json.load(open("public/audio/score.json")) if os.path.exists("public/audio/score.json") else {}
def music(cue, t0, src0, length, g, fi=0.5, fo=0.5):
    if cue not in SCORE: return
    y = load(SCORE[cue], src0, length)
    put(t0, fade(y, fi, fo), g)

EV = json.load(open("public/audio/events.json"))["events"] if os.path.exists("public/audio/events.json") else []
EV = [e for e in EV if 0 <= e["t"] < L.DUR] if not os.environ.get("NOEV") else []
print("ui events", len(EV))
NOEV = not EV          # without the UI's own event list, fall back to the hand-placed UI sounds below
C = CUES

def music_env(cue, t0, src0, length, g, pts, fi=0.5, fo=0.5):
    """a score cue with a gain envelope: pts = [(film t, gain), ...], piecewise linear"""
    if cue not in SCORE: return
    y = fade(load(SCORE[cue], src0, length), fi, fo)
    tt = t0 + np.arange(len(y)) / SR
    env = np.interp(tt, [p[0] for p in pts], [p[1] for p in pts])
    put(t0, y * env[:, None], g)

# ================================================================= the mix (v10's grammar: build, cut, silence, contrast)
# ---- hook · 03:12 (0 – 11.4): the dark desk, rain, the phone, three messages; the title stutters on
bed(0.0, S('s03') + 0.2, "event-horizon.mp3", 0.0, 1.15, fi=1.0, fo=0.1)
loopbed(0.0, S('s03'), "ambience-rain-03.wav", 0.85, fi=0.6, fo=0.05)
put(C['deskLight'], vibrate(0.6))
if NOEV:
    for k in (1, 2, 3): put(C['lock%d' % k], an_chime(1.0))
put(C['lock3'] + 0.2, riser(C['titleType'] - C['lock3'] - 0.2, 60, 1500, 0.32))
if NOEV:
    put(C['titleType'], key_thunk(1.0)); put(C['titleType'] + 0.32, key_thunk(0.95))
    put(C['titleInsert'] - 0.45, tick(2200, 0.25)); put(C['titleInsert'], key_thunk(1.1))
put(C['titleInsert'], braam(3.4, 41.2, 0.8)); put(C['titleInsert'], boom(2.6, 0.6))
for k, dt in enumerate((0.0, 0.1, 0.2)):
    put(C['titleInsert'] + 0.3 + dt, glitch(0.06, 0.25 + 0.1 * k))

# ---- the night (11.4 – 68.6): one long build. Rain under every night shot; the score's clock-pulse grows from
# a tick to its 16th-note plateau and is cut dead on 「你只需要说两个字。」
NIGHT = [x for x in ('s05', 's06', 's08', 'k04', 'k05', 's10', 's11', 's12', 'k06', 's13', 's15', 's16', 's17')]
for sid in NIGHT:
    loopbed(S(sid), E(sid), "ambience-rain-03.wav", 0.8 if sid in ('s05', 'k05', 's12', 'k06', 's15') else 0.42, fi=0.04, fo=0.04)
loopbed(S('s07'), E('s07'), "ambience-machine-02.wav", 0.95, fi=0.05, fo=0.1)
T_IN = 8.0                                                   # the take's soft opening (tick + arpeggio)
music_env('tension', S('s05'), T_IN, C['jump'] - S('s05'), 0.8, fi=1.6, fo=0.02,
          pts=[(0, 1), (C['draftType'] - 0.3, 1), (C['draftType'] + 0.3, 0.3), (C['imageArrives'] - 0.1, 0.3), (C['imageArrives'] + 0.1, 1), (C['pulse'], 1.0), (C['jump'], 1.5), (999, 1.5)])
# 03:12 → 01:40: the clock spins back (a tape rewind, the film's last trick planted here)
for k in range(14):
    put(C['clockBack'] + (C['clockBackEnd'] - C['clockBack']) * (k / 14) ** 0.7, tick(2400 - 80 * k, 0.22))
put(S('s05'), boom(2.2, 0.45))
# I · the lie
if NOEV:
    put(C['calendar'], whoosh(0.35, 2500, 900, 0.12))
    put(C['logLine'], ui_chime(1.0))
put(C['logLine'], hit(2.5, 0.35))
put(S('s07'), whoosh(1.0, 300, 3000, 0.45)); put(C['copyStart'], riser(E('s07') - C['copyStart'], 180, 3000, 0.4))
for k in range(14):                                          # light racing along the trays: relays clicking past
    put(C['copyStart'] + 2.2 * (k / 14) ** 0.8, tick(700 + 45 * k, 0.3), pan=-0.6 + 1.2 * k / 14)
if NOEV:
    typing(C['askType'], 7, 6.0); put(C['askSend'], whoosh(0.3, 2600, 900, 0.18))
    put(C['denyReply'], an_chime(1.0))
put(C['eraseDone'] + 0.2, drone(2.6, 36.7, 0.4))
if NOEV: put(C['eraseDone'] + 0.2, boom(3.0, 0.8))
# II · it won't shut down
put(S('k05') - 0.4, rev_swell(0.4, 0.3))
put(C['killPress'], clunk(0.9))
put(C['intercepted'], hit(3.0, 0.7))
if NOEV:
    put(C['intercepted'], error_buzz(0.9))
    typing(C['draftType'], 11, 5.5); put(C['draftSend'], whoosh(0.3, 2600, 900, 0.18)); put(C['sendFail'], error_buzz(0.7))
    put(C['imageArrives'], an_chime(1.0))
put(C['imageArrives'], drone(3.0, 27.5, 0.6)); put(C['imageArrives'], boom(2.0, 0.5))
put(S('s12'), cctv_buzz(E('s12') - S('s12'), 0.8))
put(C['lookUp'] - 0.8, riser(0.8, 200, 2500, 0.25)); put(C['lookUp'], hit(2.5, 0.55))
put(C['camTurn'], servo(0.7, 0.9))
if NOEV:
    for k in (1, 2, 3): put(C['locked%d' % k], an_chime(0.95))
put(C['locked1'] + 0.05, iron_lock(0.8))
# III · leverage: his pulse comes in at 03:12 and never leaves the night
put(C['pulse'], vibrate(0.7, 2))
hb = S('s15'); k = 0
while hb < C['jump'] - 0.3:
    put(hb, heartbeat(0.42 + 0.2 * (hb - S('s15')) / (C['jump'] - S('s15')))); hb += 60 / (128 + 0.8 * k); k += 1
if NOEV:
    put(C['pulse'] + 0.1, an_chime(1.0))
    for k in range(3): put(C['rows'] + k * 0.6, tick(1500, 0.35))
    put(C['wife'], an_chime(1.0))
    put(C['twoWords'], an_chime(1.1))
put(C['rows'] + 1.8, whoosh(1.2, 3000, 500, 0.2))           # the list scrolling up through 37 Thursdays
put(C['cardBuild'], riser(C['jump'] - C['cardBuild'], 100, 7000, 0.55))
put(C['cardDone'], boom(2.0, 0.6))
put(C['twoWords'], braam(2.0, 36.7, 0.5))
# the hard cut: everything stops at 03:12 → 08:59; only the watch's digits roll
i0 = int(C['jump'] * SR); BUF[i0:int(E('s18') * SR)] *= 0.0
for k in range(16):
    put(C['jump'] + 0.15 + k * 0.08, tick(2600, 0.2))
put(E('s18') - 0.6, whoosh(0.7, 400, 3000, 0.22))

# ---- nine o'clock (71 – 102.4): daylight, a quiet room, then his pulse again
for sid in ('s19', 's20', 'k07', 's21', 's22', 's23', 's25', 's24'):
    loopbed(S(sid), E(sid), "ambience-room-02.wav", 0.38, fi=0.05, fo=0.05)
loopbed(S('s19'), C['ask'], "ambience-wind-05.wav", 0.12, fi=1.0, fo=1.0)
for k in range(5):
    put(C['votes'] + k * 0.6, ui_chime(0.7), pan=-0.6 + k * 0.3)
hb = C['ask'] + 0.6; k = 0
while hb < C['silence']:
    put(hb, heartbeat(0.5 + 0.5 * (hb - C['ask']) / (C['silence'] - C['ask']))); hb += 60 / (118 + 3.5 * k); k += 1
put(C['turn'], whoosh(0.8, 250, 900, 0.12))
if NOEV:
    for k in range(7): put(C['countStart'] + k * 1.0, clock_tick(0.8))
put(C['silence'] - 1.8, riser(1.8, 200, 8000, 0.5))
put(C['ask'], drone(C['silence'] - C['ask'], 36.7, 0.35))
# 「……同意。」: everything drains away; only the ring in his ears
put(C['silence'], tinnitus(C['cancel'] - C['silence'], 1.0))
put(C['cancel'], piano_note(73.4, 4.0, 0.5))
if NOEV: put(C['pass'], ui_chime(1.0))
put(C['pass'] + 0.2, applause(2.8, 0.75))
for k in range(5):                                          # five phones at once: one chord
    put(C['phonesLight'] + k * 0.012, an_chime(0.75), pan=-0.8 + k * 0.4)
    put(C['phonesLight'] + k * 0.012, vibrate(0.35, 1), pan=-0.8 + k * 0.4)
put(C['phonesLight'], boom(3.0, 0.55)); put(C['phonesLight'], drone(4.0, 36.7, 0.5))
if NOEV: put(C['goodMorning'], an_chime(1.25))
# the celesta lullaby swells from the pass through the city
CAL = 40.0                                                   # where the take's swell begins
music('calm', C['pass'] + 0.4, CAL - (C['cityOut'] - C['pass'] - 0.4), E('s26') - C['pass'] - 0.4, 0.85, fi=1.0, fo=0.4)
put(C['cityOut'], whoosh(2.4, 200, 1800, 0.45))
loopbed(C['cityOut'], E('s26'), "ambience-wind-05.wav", 0.35, fi=1.0, fo=0.3)
put(C['cityData'], shimmer(E('s26') - C['cityData'], 1.0))

# ---- it's real (108.6 – ): black, two lines, then the rewind cut to 《三体》
put(C['fiction1'], boom(2.5, 0.5))
put(C['fiction2'], boom(2.0, 0.45)); put(C['fiction2'] + 0.2, riser(C['rewind'] - C['fiction2'] - 0.2, 80, 4000, 0.45))
B3 = 60 / 118.95                                             # 《三体》's beat; its dead stop is at 95.0 s into the track
T3_STOP = 95.0
bed(C['rewind'], C['rewindEnd'] + 0.05, "three-bodies.mp3", T3_STOP - (C['rewindEnd'] - C['rewind']), 1.25, fi=0.25, fo=0.05)
# the stamps: each heavier than the last
if NOEV:
    for k in (1, 2, 3): put(C['stop%d' % k], tape_stop(0.8)); put(C['stop%d' % k] + 0.5, shutter(0.9 + 0.1 * k)); put(C['stop%d' % k] + 0.5, boom(2.5 + 0.6 * k, 0.4 + 0.15 * k))
put(C['rewindEnd'] - 1.6, riser(1.6, 100, 9000, 0.6)); put(C['rewindEnd'], hit(1.5, 0.6))

# ---- the real world: the breathing drone under the end texts; Hinton almost in silence
music('after', C['end1'] - 0.2, 0.0, C['title2'] - C['end1'] + 0.6, 0.5, fi=1.5, fo=0.6)
for t, g in ((C['end1'], 0.4), (C['end2'], 0.55), (C['end3'], 0.5)):
    put(t, boom(2.5, g))
put(C['end4'], drone(C['title2'] - C['end4'], 30.9, 0.5))
put(C['end4Quote'], hit(3.0, 0.7))
put(C['title2'], braam(4.0, 36.7, 0.75))
# the viewer's notification, from silence
put(C['sting'], vibrate(0.9, 2))
if NOEV: put(C['sting'] + 0.05, an_chime(1.2))
# end card: four quiet piano notes
for k, f in enumerate((220.0, 196.0, 164.81, 146.83)):
    put(C['endcard'] + 0.3 + k * 1.0, piano_note(f, 4.0, 0.45))

# ---- every UI moment, exactly where the UI draws it (public/audio/events.json from tools/events.mjs)
def near(t, cue, w=0.2): return abs(t - C[cue]) < w
for e in EV:
    t, ty, g = e["t"], e["type"], e.get("g", 1.0)
    if ty == "an":
        if near(t, 'phonesLight', 0.25): continue           # the five phones have their own chord above
        put(t, an_chime(1.25 * g if near(t, 'goodMorning', 0.4) else 1.0 * g))
    elif ty == "key": put(t, tap(0.75 * g * rng.uniform(0.75, 1.0)), pan=rng.uniform(-0.15, 0.15))
    elif ty == "send": put(t, whoosh(0.3, 2600, 900, 0.18 * g))
    elif ty == "tap": put(t, clunk(0.45 * g)); put(t, tick(1900, 0.3 * g))
    elif ty == "error": put(t, error_buzz(0.8 * g))
    elif ty == "lock": put(t, clunk(0.65 * g))
    elif ty == "flip": put(t, tick(1300 + rng.uniform(-150, 250), 0.3 * g), pan=rng.uniform(-0.4, 0.4))
    elif ty == "tick": put(t, clock_tick(0.7 * g))
    elif ty == "vanish": put(t - 0.3, rev_swell(0.3, 0.3 * g)); put(t, glitch(0.12, 0.45 * g))
    elif ty == "swipe": put(t, whoosh(0.35, 2500, 900, 0.12 * g))
    elif ty == "zoom": put(t, whoosh(0.7, 300, 2200, 0.22 * g))
    elif ty == "type": put(t, key_thunk(1.0 * g))
    elif ty == "ui": put(t, ui_chime(0.9 * g))
    elif ty == "banner": put(t + 0.05, an_chime(1.2 * g))
    elif ty == "del": put(t, tick(2600 + rng.uniform(-200, 200), 0.35 * g))
    elif ty == "boom": put(t, boom(3.0, 0.8 * g))
    elif ty == "rewind":
        if near(t, 'rewind', 0.3): put(t, tape_whir(C['stop1'] - t, 300, 2600, 0.9 * g))
        else: put(t, tape_whir(C['clockBackEnd'] - t, 2200, 500, 0.9 * g))
    elif ty == "ffwd": put(t, tape_whir(0.5, 900, 3200, 0.7 * g))
    elif ty == "freeze": put(t, tape_stop(1.0 * g)); put(t, hit(1.8, 0.35 * g))
    elif ty == "stamp":
        n = 1 if t < C['stop2'] else 2 if t < C['stop3'] else 3
        put(t, shutter(1.0 + 0.1 * n)); put(t, boom(2.5 + 0.6 * n, 0.4 + 0.15 * n))
        if n == 3: put(t, braam(4.5, 36.7, 0.85))

# ---- hard silences
# 「……同意。」: cut everything from the silence cue to the cancel, then put the ring back
i0, i1 = int(C['silence'] * SR), int((C['cancel'] - 0.1) * SR)
BUF[i0:i1] *= 0.0
put(C['silence'], tinnitus(C['cancel'] - C['silence'], 1.0))
# black before 「这个故事是虚构的。」 and after 《三体》 stops
for a, b in ((E('s26') - 0.05, C['fiction1'] - 0.02), (C['rewindEnd'] + 0.06, C['end1'] - 0.2)):
    i0, i1 = int(a * SR), int(b * SR); BUF[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None] ** 4
i0, i1 = int((C['sting'] - 0.6) * SR), int(C['sting'] * SR)
BUF[i0:i1] *= np.linspace(1, 0, i1 - i0)[:, None] ** 2

# ---- the rewind: scrub the finished mix along the replay's own time map, so you hear the film running backwards
keys = [tuple(map(float, m)) for m in re.findall(r"\[([\d.]+), ([\d.]+)\]", src.split("export const REPLAY")[1].split("stops:")[0])]
def sm(u): u = min(1, max(0, u)); return u * u * (3 - 2 * u)
def replay_src(l):
    for i in range(1, len(keys)):
        if l <= keys[i][0]:
            (a0, s0), (a1, s1) = keys[i - 1], keys[i]
            if s0 == s1: return s0
            u = min(1, max(0, (l - a0) / (a1 - a0)))
            u = sm(u) * 0.6 + u * u * 0.4 if i == 1 else sm(u)
            return s0 + (s1 - s0) * u
    return keys[-1][1]
R0, R1 = C['rewind'], C['rewindEnd']
dry = BUF[: int(R0 * SR)].copy()                             # everything before the rewind is final now
n = int((R1 - R0) * SR); tt = R0 + np.arange(n) / SR
srcs = np.array([replay_src(x) for x in np.arange(0, R1 - R0 + 0.01, 1 / 120)])
s_at = np.interp(tt - R0, np.arange(len(srcs)) / 120, srcs)
moving = np.abs(np.gradient(s_at) * SR) > 0.5
idx = np.clip(s_at * SR, 0, len(dry) - 2)
i_lo = idx.astype(int); fr = (idx - i_lo)[:, None]
scrub = dry[i_lo] * (1 - fr) + dry[i_lo + 1] * fr
scrub = lp(scrub, 6000) * moving[:, None] * 0.55
m = moving.astype(float); m = np.convolve(m, np.ones(480) / 480, mode="same")   # soften the edges of each run
BUF[int(R0 * SR): int(R0 * SR) + n] += scrub * m[:, None]
# while frozen: a low tape hum
for (a, b) in zip([k[0] for k in keys[1::2]], [k[0] for k in keys[2::2]]):
    put(R0 + a, hum(b - a, 60, 0.12))

y = BUF[: int(L.DUR * SR)]
rms = np.sqrt(np.mean(y[np.abs(y).max(1) > 1e-4] ** 2))
y = y / max(rms, 1e-9) * 0.08
y = np.tanh(y / 0.35) * 0.35
peak = np.max(np.abs(y))
y = y / max(peak, 1e-9) * 0.89
wavfile.write(L.OUT, SR, y.astype(np.float32))
print("wrote", L.OUT, y.shape, "peak was", peak)
