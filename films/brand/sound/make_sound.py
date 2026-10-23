"""Brand sound: the audio-logo draft and a listening file for the SFX palette.

Usage: python films/brand/sound/make_sound.py [out_dir]   (numpy + scipy; default out_dir = films/brand/sound/out)
Writes audio-logo.wav (2.6 s) and palette-audition.wav (each palette sound twice, in the order of PALETTE).
WAVs are not committed (films/**/*.wav is ignored); this script rebuilds them.
"""
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, resample_poly, sosfilt

SR = 44100
HERE = Path(__file__).resolve().parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "out"
CATALOG = "https://music.shapeof.world/catalog.json"


def fetch(url):
    # the CDN turns away Python's default user agent
    return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "curl/8"})).read()

# event -> catalog id, in listening order
PALETTE = [
    ("line starts typing", "sfx-ui-01"),
    ("paper strip slides in", "sfx-foley-02"),
    ("number lands", "sfx-impact-06"),
    ("counter tick", "sfx-mechanical-13"),
    ("in-shot transition", "sfx-transition-02"),
    ("object lands / stacks", "sfx-impact-01"),
    ("downbeat after a silence", "sfx-impact-08"),
    ("the one finding lights up", "sfx-impact-05"),
]

rng = np.random.default_rng(7)


def t(dur):
    return np.arange(int(dur * SR)) / SR


def release(sig, dur=0.08):
    """Fade the last samples so a cut-off tail never clicks."""
    n = int(dur * SR)
    sig[-n:] *= np.linspace(1, 0, n)
    return sig


def bar(freq, vel=1.0, dur=2.4):
    """Marimba-like struck bar: modal partials near 1:4:10, plus a short mallet click."""
    x = t(dur)
    out = np.zeros_like(x)
    for ratio, amp, tau in [(1.0, 1.0, 0.62 * (440 / freq) ** 0.5), (3.98, 0.26, 0.11), (9.9, 0.07, 0.035)]:
        out += amp * np.sin(2 * np.pi * freq * ratio * x) * np.exp(-x / tau)
    click = rng.standard_normal(int(0.004 * SR)) * np.hanning(int(0.004 * SR))
    click = sosfilt(butter(2, [1800, 6000], "bandpass", fs=SR, output="sos"), click)
    out[: len(click)] += 0.35 * click
    out *= np.minimum(1, x / 0.0015)  # no click from a hard start
    return release(vel * out)


def thump(freq=110.0, dur=0.7):
    """The ball landing: a round low hit with 2nd/3rd harmonics so it speaks on phone speakers."""
    x = t(dur)
    f = freq * (1 + 0.35 * np.exp(-x / 0.025))  # small pitch drop
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = (np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)) * np.exp(-x / 0.16)
    return release(body * np.minimum(1, x / 0.002))


def shimmer(dur=1.8):
    """Glassy tail: two high partials with slow beating, like light running along the rim of the mark."""
    x = t(dur)
    s = 0.6 * np.sin(2 * np.pi * 1760 * x) * (1 + 0.25 * np.sin(2 * np.pi * 3.1 * x))
    s += 0.35 * np.sin(2 * np.pi * 2637 * x + 1.3) * (1 + 0.25 * np.sin(2 * np.pi * 4.3 * x + 0.7))
    return release(s * np.exp(-x / 0.55) * np.minimum(1, x / 0.06))


def air(dur=0.55):
    """Breath before the first note: band-passed noise that swells and opens."""
    n = rng.standard_normal(int(dur * SR))
    lo = sosfilt(butter(2, [700, 2400], "bandpass", fs=SR, output="sos"), n)
    hi = sosfilt(butter(2, [2400, 7500], "bandpass", fs=SR, output="sos"), n)
    x = t(dur) / dur
    return release((lo * (1 - x) + hi * x) * x ** 2.2, 0.06)


def place(buf, sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    sig = sig[: max(0, buf.shape[0] - i)]
    left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(sig), 0] += gain * left * sig
    buf[i : i + len(sig), 1] += gain * right * sig


def reverb(buf, rt=1.1, wet=0.16):
    n = int(rt * SR)
    env = np.exp(-6.9 * np.arange(n) / n)
    out = buf.copy()
    for ch in range(2):
        ir = rng.standard_normal(n) * env
        ir = sosfilt(butter(1, 5000, "lowpass", fs=SR, output="sos"), ir)
        ir /= np.sqrt((ir**2).sum())
        out[:, ch] += wet * fftconvolve(buf[:, ch], ir)[: len(buf)]
    return out


def audio_logo():
    """2.6 s: a breath, three rising notes that draw the circle (A4, E5, C#6, left to right), the ball lands, glass tail."""
    buf = np.zeros((int(2.6 * SR), 2))
    place(buf, air(), 0.0, 0.10)
    for at, f, vel, pan in [(0.50, 440.0, 0.75, -0.35), (0.75, 659.26, 0.85, 0.0), (1.00, 1108.73, 1.0, 0.35)]:
        place(buf, bar(f, vel), at, 0.55, pan)
    place(buf, thump(110.0), 1.00, 0.55)
    place(buf, shimmer(), 1.02, 0.09)
    buf = reverb(buf)
    fade = int(0.25 * SR)
    buf[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return buf / np.abs(buf).max() * 10 ** (-1 / 20)


def palette_audition():
    OUT.mkdir(parents=True, exist_ok=True)
    cache = OUT / "sfx"
    cache.mkdir(exist_ok=True)
    tracks = None
    clips = []
    for _, sid in PALETTE:
        f = cache / f"{sid}.wav"
        if not f.exists():
            if tracks is None:
                tracks = {x["id"]: x for x in json.loads(fetch(CATALOG))["tracks"]}
            f.write_bytes(fetch(tracks[sid]["assets"]["master"]))
        sr, y = wavfile.read(f)
        y = y.astype(np.float64)
        y = y.mean(1) if y.ndim > 1 else y
        if sr != SR:
            y = resample_poly(y, SR, sr)
        y /= np.abs(y).max() + 1e-12
        gap = np.zeros(int(0.45 * SR))
        clips += [y, gap, y, np.zeros(int(1.1 * SR))]
    mono = np.concatenate(clips) * 0.7
    return np.stack([mono, mono], 1)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    wavfile.write(OUT / "audio-logo.wav", SR, (audio_logo() * 32767).astype(np.int16))
    wavfile.write(OUT / "palette-audition.wav", SR, (palette_audition() * 32767).astype(np.int16))
    for name in ("audio-logo.wav", "palette-audition.wav"):
        print(OUT / name)
