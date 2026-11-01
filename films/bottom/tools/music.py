"""Builds public/score.wav and fetches every sound effect the film uses.

usage: ~/.venvs/shapeof-films/bin/python tools/music.py

Layout (must match src/time.ts), 千年之后（氛围版）at 111.62 BPM, first beat 0.487 s, no change of tempo:
  track bars 12–36 (bar 12 ≈ bar 8, the main theme's entry; the opening is 4 bars shorter), 12–40, 40–64, 56–72, 77 to the end. Seams on downbeats only: bar 36 → 12 (chroma 0.999 / 1.000; the
  old jump 40 → 16 skipped the quiet section bar 40 starts and was heard as a switch), bar 63 ≈ bar 55 (0.997),
  72 → 77 (0.976 / 0.989, film sb 96: shortens the ending by five bars); the same two jumps films/tower makes. No silent bars (one read as a dropout in review).
Every seam is on a downbeat; a 10 ms fade either side keeps it click-free.
"""
import glob, os, re, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio_lib import FF, fetch, lufs  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAR = 240 / 111.62
D = lambda tb: 0.487 + tb * BAR
LEVEL = -16.0
src = os.path.join(ROOT, "public", "music.m4a")
ids = set()
for f in glob.glob(os.path.join(ROOT, "src", "*.tsx")):
    ids |= set(re.findall(r'"(sfx-[a-z]+-\d+)"', open(f, encoding="utf-8").read()))
for sid in sorted(ids):
    fetch(sid, "sfx")
gain = LEVEL - lufs(src)
segs = [(D(12), D(36)), (D(12), D(40)), (D(40), D(64)), (D(56), D(72)), (D(77), None)]
fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
parts, labels = [], []
for i, sg in enumerate(segs):
    if sg == "sil":
        parts.append(f"aevalsrc=0|0:d={BAR:.5f}:s=48000,{fmt}[p{i}]")
        labels.append(f"[p{i}]")
        continue
    a, b = sg
    end = f":{b:.5f}" if b else ""
    fo = f",afade=t=out:st={b - a - 0.01:.5f}:d=0.01" if b else ""
    parts.append(f"[0:a]atrim={a:.5f}{end},asetpts=PTS-STARTPTS,{fmt},afade=t=in:d=0.01{fo}[p{i}]")
    labels.append(f"[p{i}]")
parts.append(f"{''.join(labels)}concat=n={len(segs)}:v=0:a=1,volume={gain:.2f}dB[out]")
out = os.path.join(ROOT, "public", "score.wav")
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
print(f"score.wav gain {gain:+.1f} dB, {len(ids)} effects")
