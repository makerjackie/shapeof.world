"""Builds public/score.wav, the soundtrack of the full film, from three tracks of our own library
(music.shapeof.world, CC0): public/music/credit-spark.mp3 (信用火花), core-collapse.mp3 (核心坍缩), quiet-ledger.mp3
(安静的账本). The layout must match src/timing.ts:

A 信用火花 from film 0 (track 0), fading out over film 122.5–127 (the bill, the moving shares, the whole country).
B 核心坍缩 from track 15.6 s at film 122.5 (1.5 s fade in): its pause (track 82–86 s) is film 188.9–192.9, where the
  question "那些一下子变富的人呢？" sits; the wave starts when it comes back. Fades out over film 244–248.6.
C 安静的账本 from track 79.5 s at film 247 (2.5 s fade in): its full silence (track 131–132.5 s) is film 298.5–300, just
  before the last line (film 300.1). At film 314 it crossfades into its own opening bars for the end card.

usage: ~/.venvs/shapeof-films/bin/python tools/music.py
"""
import os
import subprocess

import numpy as np
from scipy.io import wavfile

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
END = 322.0  # T.end


def load(name):
    raw = subprocess.run([FF, "-nostdin", "-loglevel", "error", "-i", os.path.join(ROOT, "public", "music", name), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


out = np.zeros((int(END * SR) + SR, 2), dtype=np.float32)


def place(src, t0, t1, at, fade_in=0.01, fade_out=0.01, gain=1.0):
    """Copy src[t0:t1] (track seconds) to film second `at`, with linear fades."""
    a, z = int(t0 * SR), int(min(t1, len(src) / SR) * SR)
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

place(A, 0, 127.0, 0, fade_in=0.01, fade_out=4.5)
place(Bt, 15.6, 15.6 + (248.6 - 122.5), 122.5, fade_in=1.5, fade_out=4.6)
place(C, 79.5, 79.5 + (315.5 - 247), 247, fade_in=2.5, fade_out=1.5)
place(C, 0.0, END - 314.0, 314.0, fade_in=1.5, fade_out=3.0, gain=0.9)

out = out[: int(END * SR)]
out *= 10 ** (-2.0 / 20)  # tools/tpmaster.py sets the final level
peak = np.abs(out).max()
if peak > 0.99:
    out *= 0.99 / peak
wavfile.write(os.path.join(ROOT, "public", "score.wav"), SR, (out * 32767).astype(np.int16))
print("score.wav", round(len(out) / SR, 2), "s, peak", round(float(peak), 3))
