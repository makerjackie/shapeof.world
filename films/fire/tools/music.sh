#!/bin/bash
# Builds public/music.wav from 《千年之后（氛围版）》 (和乐府): track bars 8–64, then 16–40, then 64 to the end.
# 111.62 BPM, first beat 0.487 s, one bar 2.150 s; every cut is on a downbeat. Chroma per bar
# (films/ai-impact/tools/barchroma.py method): bar 63 vs 15 0.997 and 64 vs 16 0.993 (the jump back to 16);
# bar 39 vs 63 0.997 (the jump to 64 sounds like the track's own 63 -> 64). A 20 ms crossfade centred on each seam
# keeps it click-free without moving the beat grid. Source: the copy used by films/one-more (public/music.m4a).
cd "$(dirname "$0")/.." || exit 1
SRC=${1:-public/qiannian.m4a}
/opt/homebrew/bin/python3 - "$SRC" <<'PY'
import subprocess, sys
src = sys.argv[1]
BAR = 4 * 60 / 111.62
T = lambda b: 0.487 + b * BAR
segs = [(T(8), T(64)), (T(16), T(40)), (T(64), None)]
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
subprocess.run(["/opt/homebrew/bin/ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", src,
                "-filter_complex", ";".join(parts), "-ar", "48000", "-c:a", "pcm_s16le", "public/music.wav"], check=True)
print("public/music.wav")
PY
/opt/homebrew/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 public/music.wav
