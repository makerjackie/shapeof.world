"""Builds public/score.wav, the soundtrack of the full film, from five tracks of our own library (music.shapeof.world,
CC0) in public/music/ (download URLs in the README). One track per movement, cut on the scene starts in src/timing.ts,
with real silences where the story needs them. The layout must match src/timing.ts:

1 初次打开 first-opening (F Lydian, 76 BPM), film 0–62.6 = track 0–62.6: the music box lifts its lid on the question,
  felt piano for the loans and the factory. Fades over 60.0–62.6.
2 世界的形状 hidden-shapes (C major, half-time 65/130 BPM) from track 12 s (groove already locked) at film 61.8: the
  year of flowing has a pulse that keeps walking. Fades over 102.0–103.6, so the reveal question (103.95) is asked in
  silence and the impact at HIT (106.75) lands on nothing.
3 活着的蓝 living-blue (D major, 56 BPM) from track 0 at HIT: quiet piano thirds under the reveal, pads under the
  savers, low strings under the interest. Fades over 166.4–168.6.
4 同步闪光 sync-flash (G major, 102 BPM) from track 70 s (fireflies already flashing together) at film 167.6: 2009 and the
  housing wave swell with it; it is cut away in 0.35 s as the wave ebbs ("浪潮，也会退", 199.3). Three seconds of silence,
  then 活着的蓝's low strings (track 84 s) return quietly under the 2021 buyer and the debt that stays.
5 安静的账本 quiet-ledger (F major) from track 101.6 s at film 216 (c10, 2.5 s fade in): its full silence (track
  131–132.5 s) sits just before the last line (247.4); at 253 it crossfades into its own opening bars for the sources
  and end card.

usage: ~/.venvs/shapeof-films/bin/python tools/music.py
"""
import os
import subprocess

import numpy as np
from scipy.io import wavfile

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
END = 273.0  # T.end
HIT = 0.08 + 40 * 240 / 90  # 106.75, src/timing.ts


def load(name):
    raw = subprocess.run([FF, "-nostdin", "-loglevel", "error", "-i", os.path.join(ROOT, "public", "music", name), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


out = np.zeros((int(END * SR) + SR, 2), dtype=np.float32)


def place(src, t0, at, until, fade_in=0.01, fade_out=0.01, gain=1.0, env=None):
    """Copy src from track second t0 to film seconds [at, until], with linear fades; env(film_t) scales the gain."""
    a = int(t0 * SR)
    n = min(int((until - at) * SR), len(src) - a)
    seg = src[a : a + n].copy() * gain
    fi, fo = max(1, int(fade_in * SR)), max(1, int(fade_out * SR))
    seg[:fi] *= np.linspace(0, 1, fi)[:, None]
    seg[n - fo :] *= np.linspace(1, 0, fo)[:, None]
    if env is not None:
        ft = at + np.arange(n) / SR
        seg *= env(ft)[:, None]
    p = int(at * SR)
    out[p : p + n] += seg[: len(out) - p]


def ramp(x, a, b, lo, hi):
    return lo + (hi - lo) * np.clip((x - a) / (b - a), 0, 1)


place(load("first-opening.mp3"), 0.0, 0.0, 62.6, fade_out=2.6, gain=1.15, env=lambda x: ramp(x, 0.0, 30.0, 1.45, 1.0))
place(load("hidden-shapes.mp3"), 12.0, 61.8, 103.6, fade_in=1.2, fade_out=1.6, gain=0.95)
blue = load("living-blue.mp3")
place(blue, 0.0, HIT, 168.6, fade_in=0.05, fade_out=2.2, gain=1.05)
sync = load("sync-flash.mp3")
# 2009 and the housing wave: rises to its 2021 peak (193.1), holds, then is pulled out from under the ebb (199.3)
place(sync, 70.0, 167.6, 199.65, fade_in=1.6, fade_out=0.35, env=lambda x: ramp(x, 169.0, 193.0, 0.5, 1.08))
# after the ebb: three seconds of nothing, then its low strings come back quietly under the 2021 buyer
place(blue, 84.0, 202.6, 217.4, fade_in=2.5, fade_out=2.0, gain=0.8)
C = load("quiet-ledger.mp3")
place(C, 101.6, 216.0, 254.5, fade_in=2.5, fade_out=1.5)
place(C, 0.0, 253.0, END, fade_in=1.5, fade_out=3.0, gain=0.9)

out = out[: int(END * SR)]
out *= 10 ** (-2.0 / 20)  # tools/tpmaster.py sets the final level
peak = np.abs(out).max()
if peak > 0.99:
    out *= 0.99 / peak
wavfile.write(os.path.join(ROOT, "public", "score.wav"), SR, (out * 32767).astype(np.int16))
print("score.wav", round(len(out) / SR, 2), "s, peak", round(float(peak), 3))
