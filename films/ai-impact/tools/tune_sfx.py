"""Shift pitched sound effects to the nearest tone of a triad (default A minor: A, C, E; TRIAD=5,9,0 for the F-major triad of 千年之后) so they sit in the music's key.

Usage: python tools/tune_sfx.py public/lib public/lib/tuned sfx-impact-05 sfx-impact-06 ...
Measures the dominant partial in the first 300 ms after the attack, then pitch-shifts with ffmpeg
(asetrate + aresample + atempo), which keeps the duration.
"""
import subprocess, sys, os
import numpy as np
from scipy.io import wavfile

src, dst, ids = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(dst, exist_ok=True)
NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
TRIAD = [int(x) for x in os.environ.get("TRIAD", "9,0,4").split(",")]
for i in ids:
    sr, y = wavfile.read(f"{src}/{i}.wav")
    y = y.astype(np.float32)
    if y.ndim > 1: y = y.mean(1)
    y /= np.abs(y).max() + 1e-9
    a = int(np.argmax(np.abs(y) > 0.2))
    seg = y[a + int(0.005 * sr): a + int(0.3 * sr)]
    seg = seg * np.hanning(len(seg))
    sp = np.abs(np.fft.rfft(seg, 1 << 16)); f = np.fft.rfftfreq(1 << 16, 1 / sr)
    m = (f > 70) & (f < 4000)
    f0 = f[m][np.argmax(sp[m])]
    midi = 69 + 12 * np.log2(f0 / 440)
    best = min(((pc - midi % 12 + 6) % 12 - 6 for pc in TRIAD), key=abs)
    target = midi + best
    r = 2 ** (best / 12)
    subprocess.run(["/opt/homebrew/bin/ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", f"{src}/{i}.wav",
                    "-af", f"asetrate={sr * r:.1f},aresample={sr},atempo={1 / r:.6f}", f"{dst}/{i}.wav"], check=True)
    print(f"{i}: {f0:7.1f} Hz ({NAMES[int(round(midi)) % 12]}{int(round(midi)) // 12 - 1}) -> {NAMES[int(round(target)) % 12]} ({best:+.2f} st)")
