#!/bin/bash
# Builds public/music-v5.wav from public/music.m4a (《千年之后（氛围版）》, 和乐府): start at track bar 4, play to
# bar 64, then play bars 56–64 once more and run on to the end. Both cuts are on bar lines (111.62 BPM, first beat
# 0.487 s); the 64 → 56 jump was checked by chroma in films/ai-impact (bars 63 and 55 match at 0.997). A 20 ms
# crossfade centred on the seam keeps it click-free without moving the beat grid.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import subprocess
BAR = 4 * 60 / 111.62
T = lambda b: 0.487 + b * BAR
A, E1, S2 = 4 * BAR, T(64), T(56)
f = (f"[0:a]atrim=start={A:.5f}:end={E1 + 0.01:.5f},asetpts=PTS-STARTPTS[a];"
     f"[0:a]atrim=start={S2 - 0.01:.5f},asetpts=PTS-STARTPTS[b];"
     f"[a][b]acrossfade=d=0.02:c1=tri:c2=tri")
subprocess.run(["/opt/homebrew/bin/ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", "public/music.m4a",
                "-filter_complex", f, "-ar", "48000", "-c:a", "pcm_s16le", "public/music-v5.wav"], check=True)
print("music-v5.wav", f"seam at {E1 - A:.3f} s")
PY
