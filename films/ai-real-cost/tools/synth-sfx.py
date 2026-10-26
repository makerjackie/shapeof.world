"""Synthesise the v13 concept sounds that the library lacks: a split-flap clatter and a running meter.

usage: synth-sfx.py <out_dir>   (writes flaps.wav and meter.wav, 48 kHz stereo)
"""
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
rng = np.random.default_rng(7)


def click(dur_ms, freq, noise=0.6):
    n = int(SR * dur_ms / 1000)
    t = np.arange(n) / SR
    env = np.exp(-t / (dur_ms / 1000 / 5))
    tone = np.sin(2 * np.pi * freq * t)
    nz = rng.standard_normal(n)
    nz = np.diff(np.concatenate([[0], nz]))  # tilt towards highs
    return env * ((1 - noise) * tone + noise * nz * 0.5)


def place(buf, snd, at, gain, pan):
    i = int(at * SR)
    j = min(len(buf), i + len(snd))
    if i >= len(buf):
        return
    buf[i:j, 0] += snd[: j - i] * gain * (1 - pan)
    buf[i:j, 1] += snd[: j - i] * gain * pan


def write(path, buf):
    buf = buf / max(1e-9, np.abs(buf).max()) * 0.7
    pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def flaps():
    dur = 1.9
    buf = np.zeros((int(SR * dur), 2))
    t = 0.0
    while t < 1.6:
        # density rises fast, then thins out as tiles land
        rate = 30 + 420 * np.exp(-((t - 0.45) / 0.45) ** 2)
        t += rng.exponential(1 / rate)
        thock = click(7, rng.uniform(700, 1100), noise=0.35)
        tick = click(3, rng.uniform(2500, 4200), noise=0.8)
        snd = np.zeros(max(len(thock), len(tick)))
        snd[: len(thock)] += thock
        snd[: len(tick)] += tick * 0.6
        place(buf, snd, t, rng.uniform(0.25, 0.7), rng.uniform(0.2, 0.8))
    return buf


def meter():
    dur = 2.0
    buf = np.zeros((int(SR * dur), 2))
    t = 0.0
    while t < 1.75:
        rate = 34 * (1 - (t / 1.75) ** 2) + 6
        t += 1 / rate
        hi, lo = click(4, 2900, noise=0.25), click(9, 620, noise=0.1)
        snd = np.zeros(max(len(hi), len(lo)))
        snd[: len(hi)] += hi
        snd[: len(lo)] += lo * 0.5
        place(buf, snd, t, 0.55, 0.5)
    return buf


if __name__ == "__main__":
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    write(out / "flaps.wav", flaps())
    write(out / "meter.wav", meter())
    print("wrote", out / "flaps.wav", out / "meter.wav")
