"""The World film score (v8): a Lyria 3.5 track (Google Gemini API, generated 2026-11-04 from research/score_world_prompt2.txt,
take w_7, strict 130 BPM) re-edited on bar lines to the film's timeline, plus a synthesised rewind.
Replaces public/ref_full.wav (BARRETE!, blocked on YouTube by a copyright claim).
usage: python tools/score_world8.py <w_7.mp3> -> public/score_world8.wav (48 kHz stereo, film time; beat k at 0.05 + k * 60/130)"""
import os, subprocess, sys
import numpy as np
from scipy.io import wavfile

SR = 48000
P = 60 / 130
PH = 0.05
BAR = 4 * P
src = np.frombuffer(subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", sys.argv[1], "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                                   capture_output=True).stdout, np.float32).reshape(-1, 2).astype(np.float64)
bt = lambda k: PH + k * BAR  # start of bar k (film and source share the grid)
# (film bar, source bar, bars); None = to the end of the source
PIECES = [(0, 72, 3), (4, 8, 12), (16, 20, 4), (20, 24, 15), (35, 39, 9), (44, 48, 7), (51, 24, 7), (58, 55, 9), (67, 64, 4),
          (71, 71, 1), (72, 72, 7), (79, 72, 4), (83, 79, 4), (87, 86, 2), (89, 88, None)]
X = int(0.012 * SR)  # crossfade
end = bt(89) + len(src) / SR - bt(88)
out = np.zeros((int(end * SR) + SR, 2))
for fb, sb, n in PIECES:
    a = int(bt(sb) * SR) - X
    b = len(src) if n is None else int(bt(sb + n) * SR) + X
    o = int(bt(fb) * SR) - X
    if fb == 0:  # the pre-roll before the first beat
        a -= int(PH * SR); o = 0
    seg = src[a:b].copy()
    w = np.ones(len(seg))
    if fb: w[: 2 * X] = np.sin(np.linspace(0, np.pi / 2, 2 * X)) ** 2
    if n is not None: w[-2 * X :] = np.cos(np.linspace(0, np.pi / 2, 2 * X)) ** 2
    out[o : o + len(seg)] += seg * w[:, None]
# the rewind (bar 3): the cold open played backwards, speeding up (pitch rising), a breath of silence before the drop
r0, r1 = bt(3), bt(4) - 0.14
d = r1 - r0
k = (bt(3) - PH - 0.15 - d) * 3 / d**3  # so it runs back over the whole cold open
tau = np.arange(int(d * SR)) / SR
pos = (bt(3) - (tau + k * tau**3 / 3)) * SR
cold = out[: int(bt(3) * SR)].copy()
rw = np.stack([np.interp(pos, np.arange(len(cold)), cold[:, c]) for c in range(2)], 1)
env = np.minimum(1, tau / 0.02) * (1 - 0.35 * tau / d)
env[-int(0.04 * SR):] *= np.linspace(1, 0, int(0.04 * SR))
a = int(r0 * SR)
out[a - X : a + X] *= np.cos(np.linspace(0, np.pi / 2, 2 * X))[:, None] ** 2
out[a + X : int(bt(4) * SR) - X] = 0
out[a : a + len(rw)] += rw * env[:, None] * 0.9
out = out[: int(end * SR)]
out /= max(1.0, np.abs(out).max() / 0.98)
wavfile.write(os.path.join(os.path.dirname(__file__), "..", "public", "score_world8.wav"), SR, (out * 32767).astype(np.int16))
print("score_world8.wav %.2f s; body bar 4 at %.4f, last bar (hit) %.4f" % (len(out) / SR, bt(4), bt(89)))
