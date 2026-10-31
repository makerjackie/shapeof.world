"""Builds public/score.wav and fetches every sound effect the film uses.

usage: ~/.venvs/shapeof-films/bin/python tools/music.py

The layout must match src/time.ts (SEGS): three-bodies from our own library (CC0, music/tracks/three-bodies.json),
cut into segments, every seam with a 15 ms fade either side. The cold open ends in 1.8 s of silence and a 1.0 s
tape-rewind (track 86–95 reversed and pitched up); the zoom-out ends in 2.2 s of silence; the last segment fades
over its final 4 s.
"""
import glob
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio import FF, fetch  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEGS = [  # (track a, track b, silence before, fade in, fade out)
    (83.9, 95.5, 0, 0.015, 0.015),
    (0.0, 31.4, 2.8, 0.015, 0.015),  # 1.8 s silence + 1.0 s rewind (mixed in below)
    (53.69, 95.5, 0, 0.015, 0.015),
    (95.5, 122.0, 0, 0.015, 0.015),
    (122.0, 135.0, 0, 0.015, 0.03),
    (142.85, 147.5, 0, 0.03, 0.015),
    (53.69, 77.0, 2.2, 0.015, 1.5),
    (96.3, 122.0, 0, 0.3, 0.015),
    (0.0, 29.0, 0, 0.015, 4.0),
]
TAIL = 0.5

src = fetch("three-bodies", "music")
ids = set()
for f in glob.glob(os.path.join(ROOT, "src", "*.tsx")):
    ids |= set(re.findall(r'"(sfx-[a-z]+-\d+)"', open(f, encoding="utf-8").read()))
for sid in sorted(ids):
    fetch(sid, "sfx")

fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
parts, labels = [], []
t = 0.0
rewind_at = None
for i, (a, b, gap, fi, fo) in enumerate(SEGS):
    if gap:
        if i == 1:
            rewind_at = t + 1.8
        parts.append(f"aevalsrc=0|0:d={gap:.5f}:s=48000,{fmt}[g{i}]")
        labels.append(f"[g{i}]")
        t += gap
    d = b - a
    fades = f"afade=t=in:d={fi},afade=t=out:st={d - fo:.5f}:d={fo}"
    parts.append(f"[0:a]atrim={a:.5f}:{b:.5f},asetpts=PTS-STARTPTS,{fmt},{fades}[p{i}]")
    labels.append(f"[p{i}]")
    t += d
parts.append(f"aevalsrc=0|0:d={TAIL}:s=48000,{fmt}[tail]")
labels.append("[tail]")
parts.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1[music]")
# the rewind: track 86–95 reversed, played 9x fast (pitched up), 1.0 s, swelling in and cut on its end
parts.append(
    f"[0:a]atrim=86:95,asetpts=PTS-STARTPTS,areverse,{fmt},asetrate=432000,aresample=48000,atrim=0:1.0,"
    f"afade=t=in:d=0.6:curve=exp,afade=t=out:st=0.97:d=0.03,volume=0.8,adelay={int(rewind_at * 1000)}|{int(rewind_at * 1000)}[rw]"
)
parts.append("[music][rw]amix=inputs=2:duration=first:normalize=0,volume=-3dB[out]")
out = os.path.join(ROOT, "public", "score.wav")
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
print(f"score.wav {t + TAIL:.2f} s, rewind at {rewind_at:.2f} s, {len(ids)} effects")
