"""Builds public/score8.wav for the full film and fetches every sound effect it uses.

usage: ~/.venvs/shapeof-films/bin/python tools/music8.py

Layout (must match src/v4/time.ts): 千年之后（氛围版）from the downbeat of its main section (film 0 = track time 8 bars,
first beat at film 0.487 s); the track plays to the downbeat of bar 30, stops for one bar of silence, resumes on that
downbeat and runs to its own end (181.9 s) with a short final fade. 111.62 BPM. No change of tempo.
"""
import glob
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio import FF, fetch, lufs  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAR = 240 / 111.62
FIRST = 0.487
START = 8 * BAR
CUT = FIRST + 30 * BAR
END = 181.9
LEVEL = -16.0

src = os.path.join(ROOT, "public", "music.m4a")
ids = set()
for f in glob.glob(os.path.join(ROOT, "src", "v4", "*.tsx")):
    ids |= set(re.findall(r'"(sfx-[a-z]+-\d+)"', open(f, encoding="utf-8").read()))
for sid in sorted(ids):
    fetch(sid, "sfx")
gain = LEVEL - lufs(src)
film_len = (CUT - START) + BAR + (END - CUT)
fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
graph = ";".join(
    [
        f"[0:a]atrim={START:.5f}:{CUT:.5f},asetpts=PTS-STARTPTS,{fmt},afade=t=in:d=0.02,afade=t=out:st={CUT - START - 0.06:.5f}:d=0.06[a]",
        f"aevalsrc=0|0:d={BAR:.5f}:s=48000,{fmt}[s]",
        f"[0:a]atrim={CUT:.5f}:{END:.5f},asetpts=PTS-STARTPTS,{fmt}[b]",
        f"[a][s][b]concat=n=3:v=0:a=1,volume={gain:.2f}dB,afade=t=out:st={film_len - 1.2:.4f}:d=1.2[out]",
    ]
)
out = os.path.join(ROOT, "public", "score8.wav")
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
print(f"score8.wav {film_len:.2f} s, gain {gain:+.1f} dB, {len(ids)} effects; silence {CUT - START:.3f}–{CUT - START + BAR:.3f} s")
