"""Deterministic master: gain to target LUFS, 4x-oversampled lookahead peak limiter, AAC, verify.
usage: tpmaster.py raw.wav video.mp4 out.mp4"""
import re, subprocess, sys
import numpy as np
from scipy.io import wavfile
from scipy.signal import resample_poly
from scipy.ndimage import minimum_filter1d, uniform_filter1d

FF = "/opt/homebrew/bin/ffmpeg"
raw, video, out = sys.argv[1:4]
TARGET = float(sys.argv[4]) if len(sys.argv) > 4 else -12.5
sr, y = wavfile.read(raw)
y = (y.astype(np.float64) / 32768.0) if y.dtype == np.int16 else y.astype(np.float64)
if y.ndim == 1: y = y[:, None]

def measure(path):
    r = subprocess.run([FF, "-nostdin", "-hide_banner", "-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    s = r[r.rfind("Summary:"):]
    I = float(re.search(r"I:\s+(-?[\d.]+) LUFS", s).group(1))
    tp = float(re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", s).group(1))
    return I, tp

def limit(x, ceil_db):
    """Gain curve g <= ceil/peak everywhere (peaks from 4x oversampling), 1.5 ms attack, 60 ms hold, ~150 ms release."""
    ceil = 10 ** (ceil_db / 20)
    up = np.abs(resample_poly(x, 4, 1, axis=0)).max(axis=1)
    p = np.maximum(up[: len(x) * 4].reshape(-1, 4).max(axis=1), np.abs(x).max(axis=1))
    r = np.minimum(1.0, ceil / np.maximum(p, 1e-9))
    W, H = int(sr * 0.0015), int(sr * 0.060)
    # min over [k-H, k+2W], then two box averages of radius W: every sample stays <= r
    m = np.roll(minimum_filter1d(r, size=H + 2 * W + 1, mode="nearest"), (H - 2 * W) // 2)
    g = uniform_filter1d(uniform_filter1d(m, 2 * W + 1, mode="nearest"), 2 * W + 1, mode="nearest")
    g = np.minimum(g, r)
    # exponential release on 1 ms blocks, so the gain eases back instead of snapping up
    B = sr // 1000
    gb = g[: len(g) // B * B].reshape(-1, B).min(axis=1)
    coef = 1 - np.exp(-1 / 150)
    rel = np.empty_like(gb); prev = 1.0
    for i, v in enumerate(gb):
        prev = min(v, prev + (1 - prev) * coef); rel[i] = prev
    smooth = np.interp(np.arange(len(g)), np.arange(len(rel)) * B + B / 2, rel)
    g = np.minimum(g, smooth)
    return x * g[:, None], g

tmp = "/tmp/ep1-master/_tp.wav"
I0, tp0 = measure(raw)
print(f"raw: I {I0:.1f} LUFS, TP {tp0:.1f} dBTP")
gain_db = TARGET - I0
import os
ENC = os.environ.get("ENC", "aac_at")  # ffmpeg native aac overshoots by up to 2.7 dB; Apple AAC ~0.3 dB
CEILS = [float(c) for c in os.environ.get("CEILS", "-2.0,-2.4,-2.8").split(",")]
for ceil_db in CEILS:
    for _ in range(3):
        z, g = limit(y * 10 ** (gain_db / 20), ceil_db)
        wavfile.write(tmp, sr, z.astype(np.float32))
        I, tp = measure(tmp)
        if abs(I - TARGET) < 0.15: break
        gain_db += TARGET - I
    gr = -20 * np.log10(g.min())
    worst = np.argsort(g)[:1][0] / sr
    print(f"ceil {ceil_db}: gain {gain_db:+.1f} dB, max GR {gr:.1f} dB at {worst:.2f}s, "
          f"time under >3 dB GR {np.mean(g < 10 ** (-3 / 20)) * len(g) / sr:.2f}s, wav I {I:.1f} TP {tp:.1f}")
    subprocess.run([FF, "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", video, "-i", tmp,
                    "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", ENC, "-b:a", "256k", "-ar", "48000",
                    "-movflags", "+faststart", out], check=True)
    I2, tp2 = measure(out)
    print(f"  {ENC}: I {I2:.1f} LUFS, TP {tp2:.1f} dBTP")
    if tp2 <= -1.0: print("PASS"); break
