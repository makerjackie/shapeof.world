#!/bin/bash
# Builds public/music-ep1.wav from public/music.m4a (《千年之后（氛围版）》, 和乐府): track bars 2–16, 24–64, then
# 56 to the end (56–64 heard twice). Film bar f = track bar f + 2 below 14, f + 10 from 14 to 54, f + 2 from 54 on, so
# the music's return after the breakdown (track 48) lands on film bar 38 and its peak (track 64, second pass) on
# film bar 62. Both seams are known-good: 16→24 was the published cut's skip, 64→56 the tower film's (chroma per bar
# 0.997). A 20 ms crossfade centred on each seam keeps it click-free without moving the beat grid.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import subprocess
BAR = 4 * 60 / 111.62
T = lambda b: 0.487 + b * BAR
# (start, end) in seconds; the first segment starts at 2 bars exactly, so film time 0.487 s = track bar 2's downbeat
segs = [(2 * BAR, T(16)), (T(24), T(64)), (T(56), None)]
parts = []
for i, (a, b) in enumerate(segs):
    a2 = a if i == 0 else a - 0.01
    end = "" if b is None else f":end={b + 0.01:.5f}"
    parts.append(f"[0:a]atrim=start={a2:.5f}{end},asetpts=PTS-STARTPTS[s{i}]")
chain = "[s0]"
for i in range(1, len(segs)):
    out = f"[x{i}]" if i < len(segs) - 1 else ""
    parts.append(f"{chain}[s{i}]acrossfade=d=0.02:c1=tri:c2=tri{out}")
    chain = f"[x{i}]"
subprocess.run(["/opt/homebrew/bin/ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", "public/music.m4a",
                "-filter_complex", ";".join(parts), "-ar", "48000", "-c:a", "pcm_s16le", "public/music-ep1.wav"], check=True)
print("music-ep1.wav")
PY
