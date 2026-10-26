"""Builds public/score9.wav for the full film and fetches every sound effect it uses.

usage: ~/.venvs/shapeof-films/bin/python tools/music9.py

Layout (must match src/v4/time.ts), 千年之后（氛围版）at 111.62 BPM, first beat 0.487 s, no change of tempo:
  track bars 8–25, then half a bar of silence, then track bars 25–32, then track bars 40–78.5 (bars 32–39 skipped: bar 31
  and bar 39 have chroma similarity 0.999, the same jump films/alive makes), fading over the last 2.5 s.
Every seam is on a downbeat; a 10 ms fade either side keeps it click-free.
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
D = lambda tb: FIRST + tb * BAR  # downbeat of a track bar
SIL = 0.5 * BAR
TAIL = 0.5
END_TB = 62.5 + 16  # time.ts END_SB, as a track bar
LEVEL = -16.0

src = os.path.join(ROOT, "public", "music.m4a")
ids = set()
for f in glob.glob(os.path.join(ROOT, "src", "v4", "*.tsx")):
    ids |= set(re.findall(r'"(sfx-[a-z]+-\d+)"', open(f, encoding="utf-8").read()))
for sid in sorted(ids):
    fetch(sid, "sfx")
gain = LEVEL - lufs(src)
segs = [(8 * BAR, D(25)), None, (D(25), D(32)), (D(40), D(END_TB) + TAIL)]
fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
parts, labels = [], []
for i, sg in enumerate(segs):
    if sg is None:
        parts.append(f"aevalsrc=0|0:d={SIL:.5f}:s=48000,{fmt}[p{i}]")
    else:
        a, b = sg
        parts.append(f"[0:a]atrim={a:.5f}:{b:.5f},asetpts=PTS-STARTPTS,{fmt},afade=t=in:d=0.01,afade=t=out:st={b - a - 0.01:.5f}:d=0.01[p{i}]")
    labels.append(f"[p{i}]")
film_len = sum((b - a) if sg else SIL for sg in segs for (a, b) in [sg or (0, 0)])
parts.append(f"{''.join(labels)}concat=n={len(segs)}:v=0:a=1,volume={gain:.2f}dB,afade=t=out:st={film_len - 2.5:.4f}:d=2.5[out]")
out = os.path.join(ROOT, "public", "score9.wav")
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
print(f"score9.wav {film_len:.2f} s, gain {gain:+.1f} dB, {len(ids)} effects")
