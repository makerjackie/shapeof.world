"""Builds public/score.wav, the soundtrack of the full film, from 千年之后（氛围版） (public/music.m4a, see README).

usage: ~/.venvs/shapeof-films/bin/python tools/music.py

111.62 BPM, first beat 0.487 s, no change of tempo. The layout must match SB in src/timing.ts. Every seam is on a
downbeat, with a 10 ms fade either side:
  track 8–40 · 40–48 · 48–56 · half a bar of silence · 16–40 · 40–48 · 60–64 · 64–72 · 76–80 (fading over 3 s)
Seams checked by chroma similarity of the bar each side would expect (tools note in README): 48→16 sits behind the
silence; 47→60 (bar 60 ~ bar 48, 0.989); 71→76 (bar 76 ~ bar 72, 0.995).
"""
import os
import subprocess

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAR = 240 / 111.62
FIRST = 0.487
D = lambda tb: FIRST + tb * BAR
SIL = 0.5 * BAR
LEVEL_DB = -2.0  # the track is already loud; tools/tpmaster.py sets the final level

segs = [(8, 40), (40, 48), (48, 56), None, (16, 40), (40, 48), (60, 64), (64, 72), (76, 80)]
src = os.path.join(ROOT, "public", "music.m4a")
fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
parts, labels, total = [], [], 0.0
for i, sg in enumerate(segs):
    if sg is None:
        parts.append(f"aevalsrc=0|0:d={SIL:.5f}:s=48000,{fmt}[p{i}]")
        total += SIL
    else:
        a, b = D(sg[0]), D(sg[1])
        parts.append(f"[0:a]atrim={a:.5f}:{b:.5f},asetpts=PTS-STARTPTS,{fmt},afade=t=in:d=0.01,afade=t=out:st={b - a - 0.01:.5f}:d=0.01[p{i}]")
        total += b - a
    labels.append(f"[p{i}]")
parts.append(f"{''.join(labels)}concat=n={len(segs)}:v=0:a=1,volume={LEVEL_DB}dB,afade=t=out:st={total - 3:.4f}:d=3[out]")
out = os.path.join(ROOT, "public", "score.wav")
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
print(f"score.wav {total:.3f} s = {total / BAR:.2f} bars")
