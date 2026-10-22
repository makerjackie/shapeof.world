"""Per-frame spectrum of the soundtrack for audio-reactive visuals.

Usage: python tools/spectrum.py ../assets/music/track.wav src/v3/audio.json
Writes 16 log-spaced bands per video frame (30 fps) plus a bass envelope, each scaled to 0-99.
"""
import json
import sys

import numpy as np
from scipy.io import wavfile

FPS = 30
BANDS = 16
WIN = 2048


def main(src: str, dst: str) -> None:
    sr, x = wavfile.read(src)
    x = x.astype(np.float32)
    if x.ndim > 1:
        x = x.mean(axis=1)
    x /= np.abs(x).max() + 1e-9
    n_frames = int(len(x) / sr * FPS) + 1
    edges = np.geomspace(40, 8000, BANDS + 1)
    freqs = np.fft.rfftfreq(WIN, 1 / sr)
    window = np.hanning(WIN)
    pad = np.pad(x, (WIN, WIN))
    spec = np.zeros((n_frames, BANDS), np.float32)
    bass = np.zeros(n_frames, np.float32)
    for i in range(n_frames):
        c = int(i / FPS * sr) + WIN
        mag = np.abs(np.fft.rfft(pad[c - WIN // 2 : c + WIN // 2] * window))
        for b in range(BANDS):
            m = (freqs >= edges[b]) & (freqs < edges[b + 1])
            spec[i, b] = mag[m].mean() if m.any() else 0
        bass[i] = mag[(freqs >= 30) & (freqs < 150)].mean()
    db = 20 * np.log10(spec + 1e-6)
    lo = np.percentile(db, 5, axis=0)
    hi = np.percentile(db, 99, axis=0)
    norm = np.clip((db - lo) / (hi - lo + 1e-9), 0, 1)
    bdb = 20 * np.log10(bass + 1e-6)
    bnorm = np.clip((bdb - np.percentile(bdb, 10)) / (np.percentile(bdb, 99) - np.percentile(bdb, 10) + 1e-9), 0, 1)
    # Fast attack, slow release so bars fall smoothly between hits.
    out = np.zeros_like(norm)
    bout = np.zeros_like(bnorm)
    for i in range(n_frames):
        prev = out[i - 1] if i else norm[0]
        out[i] = np.where(norm[i] > prev, norm[i], prev * 0.82 + norm[i] * 0.18)
        bp = bout[i - 1] if i else bnorm[0]
        bout[i] = bnorm[i] if bnorm[i] > bp else bp * 0.85 + bnorm[i] * 0.15
    data = {
        "fps": FPS,
        "bands": BANDS,
        "spectrum": [[int(v * 99) for v in row] for row in out],
        "bass": [int(v * 99) for v in bout],
    }
    with open(dst, "w") as f:
        json.dump(data, f, separators=(",", ":"))
    print(f"{n_frames} frames -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
