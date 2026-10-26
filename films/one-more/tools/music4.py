"""Builds public/score4.wav for the v4 opening sample: 千年之后（氛围版）from the downbeat of its main section (film 0 =
track time 8 bars, first beat at film 0.487 s), 26 s, and fetches the v4 sound effects.

usage: ~/.venvs/shapeof-films/bin/python tools/music4.py
"""
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio import FF, fetch, lufs  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAR = 240 / 111.62
START = 8 * BAR
LENGTH = 26.0

src = os.path.join(ROOT, "public", "music.m4a")
for sid in sorted(set(re.findall(r'"(sfx-[a-z]+-\d+)"', open(os.path.join(ROOT, "src", "v4", "Film4.tsx")).read()))):
    fetch(sid, "sfx")
gain = -16.0 - lufs(src)
out = os.path.join(ROOT, "public", "score4.wav")
af = f"atrim={START:.5f}:{START + LENGTH:.5f},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume={gain:.2f}dB,afade=t=in:d=0.02,afade=t=out:st={LENGTH - 0.6:.3f}:d=0.6"
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-af", af, "-c:a", "pcm_s16le", out], check=True)
print(f"score4.wav {LENGTH} s, gain {gain:+.1f} dB")
