#!/bin/bash
# v23: builds public/music-ep1-v23.wav from public/music.m4a (《千年之后（氛围版）》, 和乐府): track bars 4–16, then 32
# to the end, faded out under the end card. Film bar f = track bar f + 4 below 12, f + 20 from 12 on, so the lift into
# the main theme (track 8) lands on 真的如此吗？ (film bar 4), the return after the breakdown (track 48) on the plan
# reveal (film bar 28) and the peak (track 64) on the token boom (film bar 44). The seam 16→32 is an 8-bar phrase
# boundary (chroma 1.000 / 0.997 on the bars either side). A 20 ms crossfade keeps it click-free without moving the grid.
cd "$(dirname "$0")/.." || exit 1
python3 - <<'PY'
import subprocess
BAR = 4 * 60 / 111.62
T = lambda b: 0.487 + b * BAR
LAST = 59.2  # film bars, as in Film23
end = T(LAST)
fade = T(LAST) - T(58.4)
segs = [(4 * BAR, T(16)), (T(32), None)]
parts = []
for i, (a, b) in enumerate(segs):
    a2 = a if i == 0 else a - 0.01
    stop = "" if b is None else f":end={b + 0.01:.5f}"
    parts.append(f"[0:a]atrim=start={a2:.5f}{stop},asetpts=PTS-STARTPTS[s{i}]")
parts.append("[s0]afade=t=in:d=0.03[f0]")
parts.append(f"[f0][s1]acrossfade=d=0.02:c1=tri:c2=tri,atrim=end={end:.5f},afade=t=out:st={end - fade:.5f}:d={fade:.5f}")
subprocess.run(["/opt/homebrew/bin/ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", "public/music.m4a",
                "-filter_complex", ";".join(parts), "-ar", "48000", "-c:a", "pcm_s16le", "public/music-ep1-v23.wav"], check=True)
print("music-ep1-v23.wav", round(end, 3))
PY
