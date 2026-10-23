#!/bin/bash
# Builds public/music-v6.wav from public/music.m4a (《千年之后（氛围版）》, 和乐府): track bars 4–64, then 56–64
# again, then 16–32 (the calm main section, under the zoom-out chapter), then 64 to the end. All cuts are on bar lines
# (111.62 BPM, first beat 0.487 s). Chroma per bar (films/ai-impact/tools/barchroma.py): 63/55 0.997 and 64/56;
# 63/15 0.997 and 64/16 0.993; 31/63 0.997 and 32/64 0.993; level within 0.8 dB. A 20 ms crossfade centred on each
# seam keeps it click-free without moving the beat grid.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import subprocess
BAR = 4 * 60 / 111.62
T = lambda b: 0.487 + b * BAR
# (start, end) in seconds; the first segment starts at bar 4 exactly, so film time 0 = track bar 4 − first beat
segs = [(4 * BAR, T(64)), (T(56), T(64)), (T(16), T(32)), (T(64), None)]
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
                "-filter_complex", ";".join(parts), "-ar", "48000", "-c:a", "pcm_s16le", "public/music-v6.wav"], check=True)
print("music-v6.wav")
PY
