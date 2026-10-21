#!/usr/bin/env python3
"""Assemble narration + score + sfx, duck the music under voice, normalize."""
import json
import os
import subprocess
import wave

import numpy as np

SR = 48000
ap_film = os.path.join(os.path.dirname(__file__), "..", "cuts", "deepinfer-open-source")
import argparse

ap = argparse.ArgumentParser()
ap.add_argument("film", nargs="?", default="deepinfer-open-source")
args = ap.parse_args()
film = os.path.join(os.path.dirname(__file__), "..", "cuts", args.film)
audio = os.path.join(film, "output", "audio")
timeline = json.load(open(os.path.join(film, "output", "timeline.json")))
vo = json.load(open(os.path.join(audio, "vo", "timings.json")))
by_id = {v["id"]: v for v in vo}
DUR = timeline["total"]
N = int(round(DUR * SR))


def read(path):
    with wave.open(path, "rb") as w:
        assert w.getframerate() == SR
        n = w.getnframes()
        ch = w.getnchannels()
        data = np.frombuffer(w.readframes(n), dtype="<i2").astype(np.float32) / 32768.0
    if ch == 1:
        return np.stack([data, data])
    return data.reshape(-1, ch).T


def write(path, x):
    x = np.clip(x, -1, 1).T
    pcm = (x * 32767).astype("<i2")
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


voice = np.zeros((2, N))
for scene in timeline["scenes"]:
    v = by_id.get(scene["id"])
    if not v:
        continue
    clip = read(os.path.join(film, "output", v["file"]))
    if clip.shape[0] == 1:
        clip = np.repeat(clip, 2, axis=0)
    i = int(round(scene["voStart"] * SR))
    n = min(clip.shape[1], N - i)
    voice[:, i : i + n] += clip[:, :n]

write(os.path.join(audio, "voice-raw.wav"), voice)

# Gentle cleanup and leveling for the narration stem.
subprocess.run(
    [
        "ffmpeg", "-y", "-v", "error",
        "-i", os.path.join(audio, "voice-raw.wav"),
        "-af", "highpass=f=70,acompressor=threshold=-18dB:ratio=2:attack=5:release=90,loudnorm=I=-18:TP=-3:LRA=9",
        "-ar", str(SR), os.path.join(audio, "voice.wav"),
    ],
    check=True,
)
voice = read(os.path.join(audio, "voice.wav"))

music = read(os.path.join(audio, "music.wav"))
sfx = read(os.path.join(audio, "sfx.wav"))

# Voice activity envelope, O(N) moving average.
mono = np.abs(voice).mean(axis=0)
k = int(0.12 * SR)
cs = np.cumsum(np.pad(mono, (k, 0), mode="edge"))
env = (cs[k:] - cs[:-k]) / k
env = np.clip((env - 0.012) / 0.05, 0, 1)
# smooth the ducking shape
k2 = int(0.18 * SR)
cs2 = np.cumsum(np.pad(env, (k2, 0), mode="edge"))
act = (cs2[k2:] - cs2[:-k2]) / k2
act = np.clip(act, 0, 1)

music_gain = 0.13 + 0.17 * (1 - act)
music_gain[: int(1.0 * SR)] = 0.30
music_gain[int(92.6 * SR) :] = 0.34
music = music * music_gain

# SFX sit under the voice but push the cuts.
sfx = sfx * 0.5

mix = voice * 1.0 + music + sfx
# Slow overall fade for the last 0.5s of picture (the outro card follows).
fade = int(0.5 * SR)
mix[:, -fade:] *= np.linspace(1, 0, fade) ** 1.2
peak = np.max(np.abs(mix))
if peak > 0.98:
    mix = mix / peak * 0.98
write(os.path.join(audio, "mix.wav"), mix)

subprocess.run(
    [
        "ffmpeg", "-y", "-v", "error",
        "-i", os.path.join(audio, "mix.wav"),
        "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
        "-ar", str(SR), os.path.join(audio, "mix-norm.wav"),
    ],
    check=True,
)
print("wrote", os.path.join(audio, "mix-norm.wav"))
