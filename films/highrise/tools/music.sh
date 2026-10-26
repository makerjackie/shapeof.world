#!/bin/bash
# Builds public/music.wav from public/qnzh.m4a (《千年之后（氛围版）》, 和乐府, as on tower): track bars 0–64, 56–64,
# 16–48, then 64 to the end, all cut on bar lines (111.62 BPM, first beat 0.487 s). Seams by bar chroma
# (films/ai-impact/tools/barchroma.py method): 63→56 0.997/0.978, 63→16 0.997/0.993, 47→64 0.978/0.995. A 20 ms
# crossfade centred on each seam keeps it click-free without moving the beat grid.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import subprocess
BAR = 4 * 60 / 111.62
T = lambda b: 0.487 + b * BAR
segs = [(0.0, T(64)), (T(56), T(64)), (T(16), T(48)), (T(64), None)]
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
subprocess.run(["/opt/homebrew/bin/ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", "public/qnzh.m4a",
                "-filter_complex", ";".join(parts), "-ar", "48000", "-c:a", "pcm_s16le", "public/music.wav"], check=True)
print("music.wav")
PY
/opt/homebrew/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 public/music.wav
