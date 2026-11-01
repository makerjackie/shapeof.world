"""Builds public/score.wav, the soundtrack of the full film, from 千年之后（氛围版） (public/music.m4a, see README).

usage: ~/.venvs/shapeof-films/bin/python tools/music.py

111.62 BPM, first beat 0.487 s, no change of tempo. The layout must match SB in src/timing.ts. Every seam is on a
downbeat, with a 10 ms fade either side:
  track 8–32 · 28–63.5 · two beats of 63.5–64 dipped and darkened · 16–32 · 28–48 · 60–72 · 76–80 (fading over 3 s)
Seams checked by chroma similarity of the bar each side would expect (tools note in README): 63→16 (bar 16 ~ bar 64,
0.942, behind the dip); 31→28 (bar 28 ~ bar 32, 0.995); 47→60 (bar 60 ~ bar 48, 0.989); 71→76 (bar 76 ~ bar 72, 0.995).
"""
import os
import subprocess

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAR = 240 / 111.62
FIRST = 0.487
D = lambda tb: FIRST + tb * BAR
LEVEL_DB = -2.0  # the track is already loud; tools/tpmaster.py sets the final level

segs = [(8, 32), (28, 63.5), "dip", (16, 32), (28, 48), (60, 72), (76, 80)]
DIP = (63.5, 64)
src = os.path.join(ROOT, "public", "music.m4a")
fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
parts, labels, total = [], [], 0.0
for i, sg in enumerate(segs):
    if sg == "dip":
        # the last two beats before the reveal: the music sinks and goes muffled, as if holding its breath
        a, b = D(DIP[0]), D(DIP[1])
        parts.append(f"[0:a]atrim={a:.5f}:{b:.5f},asetpts=PTS-STARTPTS,{fmt},lowpass=f=700,"
                     f"volume='1-0.8*min(t/{(b - a) * 0.8:.4f}\\,1)':eval=frame,afade=t=out:st={b - a - 0.01:.5f}:d=0.01[p{i}]")
        total += b - a
    else:
        a, b = D(sg[0]), D(sg[1])
        parts.append(f"[0:a]atrim={a:.5f}:{b:.5f},asetpts=PTS-STARTPTS,{fmt},afade=t=in:d=0.01,afade=t=out:st={b - a - 0.01:.5f}:d=0.01[p{i}]")
        total += b - a
    labels.append(f"[p{i}]")
parts.append(f"{''.join(labels)}concat=n={len(segs)}:v=0:a=1,volume={LEVEL_DB}dB,afade=t=out:st={total - 3:.4f}:d=3[out]")
out = os.path.join(ROOT, "public", "score.wav")
subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", ";".join(parts), "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
print(f"score.wav {total:.3f} s = {total / BAR:.2f} bars")
