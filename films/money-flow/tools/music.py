"""Builds public/score.wav, the soundtrack of the full film, from three tracks of our own library
(music.shapeof.world, CC0): public/music/credit-spark.mp3 (信用火花), core-collapse.mp3 (核心坍缩), quiet-ledger.mp3
(安静的账本). See README for the download URLs. The layout must match src/timing.ts:

A 信用火花, 90 BPM, bar 2.6667 s, first bar 0.08 s. Film 0 = track 0. Track bars 0–16, then 9–21, then 14–end: two
  8-bar repeats with near-identical chords at the seams (bar 17 ~ bar 9: 0.978 / 0.993; bar 22 ~ bar 14: 0.991 / 0.983,
  films/ai-impact/tools/barchroma.py). Its one silence (track 62.2–64.0 s) lands on the reveal question; the downbeat
  of track bar 24 lands at film 106.75 on "约 5000 万". Fades out by film 169.
B 核心坍缩 from track 15.6 s at film 168.08 (1.5 s crossfade). Its pause (track 82–86 s) ends at film 238.5 on the US
  bridge. Fades out over film 284–288.
C 安静的账本 from track 101.6 s at film 285 (2.5 s fade in). Its full silence (track 131–132.5 s) sits just before the
  last line (film 316.4). At film 322 it crossfades into its own opening bars for the sources and end card.

usage: ~/.venvs/shapeof-films/bin/python tools/music.py
"""
import os
import subprocess

import numpy as np
from scipy.io import wavfile

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
END = 342.0  # T.end
BAR = 240 / 90
b = lambda n: 0.08 + n * BAR


def load(name):
    raw = subprocess.run([FF, "-nostdin", "-loglevel", "error", "-i", os.path.join(ROOT, "public", "music", name), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


out = np.zeros((int(END * SR) + SR, 2), dtype=np.float32)


def place(src, t0, t1, at, fade_in=0.01, fade_out=0.01, gain=1.0):
    """Copy src[t0:t1] (track seconds) to film second `at`, with linear fades."""
    a, z = int(t0 * SR), int(t1 * SR)
    seg = src[a:z].copy() * gain
    n = len(seg)
    fi, fo = max(1, int(fade_in * SR)), max(1, int(fade_out * SR))
    seg[:fi] *= np.linspace(0, 1, fi)[:, None]
    seg[n - fo :] *= np.linspace(1, 0, fo)[:, None]
    p = int(at * SR)
    out[p : p + n] += seg[: len(out) - p]
    return at + n / SR


A = load("credit-spark.mp3")
Bt = load("core-collapse.mp3")
C = load("quiet-ledger.mp3")

t = place(A, 0, b(17), 0, fade_in=0.01)
t = place(A, b(9), b(22), t)
# A from track bar 14 to film 169 (track 126.4 s), fading over the last 3.5 s
a_end = 169.0
place(A, b(14), b(14) + (a_end - t), t, fade_out=3.5)
place(Bt, 15.6, 15.6 + (288 - 168.08), 168.08, fade_in=1.5, fade_out=4.0)
place(C, 101.6, 101.6 + (323.5 - 285), 285, fade_in=2.5, fade_out=1.5)
place(C, 0.0, END - 322.0, 322.0, fade_in=1.5, fade_out=3.0, gain=0.9)

out = out[: int(END * SR)]
out *= 10 ** (-2.0 / 20)  # tools/tpmaster.py sets the final level
peak = np.abs(out).max()
if peak > 0.99:
    out *= 0.99 / peak
wavfile.write(os.path.join(ROOT, "public", "score.wav"), SR, (out * 32767).astype(np.int16))
print("score.wav", round(len(out) / SR, 2), "s, peak", round(float(peak), 3))
