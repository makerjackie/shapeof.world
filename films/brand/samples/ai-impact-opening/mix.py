"""Score and foley for the opening sample, then the final MP4.

Usage: python films/brand/samples/ai-impact-opening/mix.py [zh|en]   (numpy, scipy, ffmpeg)
Reads out/events-<lang>.json and out/video-<lang>.mp4 from render.mjs; writes out/mix-<lang>.wav and out/sample-<lang>.mp4
(loudness-normalised to about -12 LUFS, true peak under -1 dBTP). Catalog audio is cached in out/cache/.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent.parent / "sound"))
from make_sound import bar, fetch  # noqa: E402  (marimba voice and the CDN fetch with a user agent)

LANG = sys.argv[1] if len(sys.argv) > 1 else "zh"
OUT = HERE / "out"
CACHE = OUT / "cache"
SR = 48000
CATALOG = "https://music.shapeof.world/catalog.json"
MUSIC = "scene-minimalism-40"          # 有序运动 · 40: commercial use cleared, 120 BPM, A minor
MUSIC_OFFSET = 2.0                     # the track's full entry (4.03 s) lands on the price flip
SFX = ["sfx-impact-03", "sfx-impact-08", "sfx-impact-06", "sfx-ui-01", "sfx-foley-02", "sfx-transition-02",
       "sfx-impact-01", "sfx-mechanical-13", "ambience-room-01", "ambience-machine-02"]
NOTE = {1: 440.0, 2: 523.25, 3: 659.26, 4: 880.0}  # ruler coins climb A minor pentatonic
rng = np.random.default_rng(3)
_tracks = None


def load(track_id):
    """Decode a catalog asset to float stereo at SR (cached)."""
    global _tracks
    CACHE.mkdir(parents=True, exist_ok=True)
    wav = CACHE / f"{track_id}.wav"
    if not wav.exists():
        if _tracks is None:
            _tracks = {x["id"]: x for x in json.loads(fetch(CATALOG))["tracks"]}
        src = CACHE / f"{track_id}.src"
        src.write_bytes(fetch(_tracks[track_id]["assets"]["master"]))
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-ac", "2", "-ar", str(SR), str(wav)], check=True)
    sr, y = wavfile.read(wav)
    y = y.astype(np.float64) / 32768.0
    return y if y.ndim == 2 else np.stack([y, y], 1)


def pitch(y, ratio):
    """Resample to shift pitch (and length) by ratio."""
    n = int(len(y) / ratio)
    x = np.arange(n) * ratio
    return np.stack([np.interp(x, np.arange(len(y)), y[:, c]) for c in range(2)], 1)


def place(buf, y, at, gain=1.0, pan=0.0):
    i = int(round(at * SR))
    if i < 0:
        y, i = y[-i:], 0
    y = y[: max(0, len(buf) - i)]
    lg, rg = np.cos((pan + 1) * np.pi / 4) * np.sqrt(2), np.sin((pan + 1) * np.pi / 4) * np.sqrt(2)
    buf[i : i + len(y), 0] += gain * lg * y[:, 0]
    buf[i : i + len(y), 1] += gain * rg * y[:, 1]


def fade(y, a=0.0, b=0.0):
    y = y.copy()
    if a:
        n = int(a * SR); y[:n] *= np.linspace(0, 1, n)[:, None]
    if b:
        n = int(b * SR); y[-n:] *= np.linspace(1, 0, n)[:, None]
    return y


def norm(y, peak=1.0):
    return y / (np.abs(y).max() + 1e-12) * peak


def main():
    meta = json.loads((OUT / f"events-{LANG}.json").read_text())
    dur = meta["dur"]
    buf = np.zeros((int(dur * SR) + SR, 2))
    s = {k: norm(load(k)) for k in SFX}

    # music: from 2.0 s into the track, fading on the last half second
    m = load(MUSIC)[int(MUSIC_OFFSET * SR) : int((MUSIC_OFFSET + dur) * SR)]
    m = fade(m, 0, 0.6)
    m *= 10 ** (-20 / 20) / (np.sqrt(np.mean(m[int(4 * SR) :] ** 2)) + 1e-9)    # music bed around -20 dBFS RMS
    place(buf, m, 0.0)

    # beds: studio air throughout; the server room comes in half a bar before the data centre lights (J-cut)
    room = s["ambience-room-01"]
    place(buf, fade(np.tile(room, (int(np.ceil(len(buf) / len(room))), 1))[: len(buf)], 0.4, 0.6), 0, 0.05)
    hum = s["ambience-machine-02"]
    t0 = next(e["t"] for e in meta["events"] if e["type"] == "switch") - 0.5
    place(buf, fade(hum[: int((dur - t0) * SR)], 0.5, 0.6), t0, 0.12)

    for e in meta["events"]:
        t, k = e["t"], e["type"]
        if k == "coin":
            y = fade(pitch(s["sfx-impact-03"], 2 ** (rng.uniform(-2, 2) / 12))[: int(0.3 * SR)], 0, 0.12)
            place(buf, y, t - 0.004, 0.32 * e["gain"], rng.uniform(-0.35, 0.35))
        elif k == "ruler":
            place(buf, _resample_mono(bar(NOTE.get(e["step"], 880.0), 1.0, 1.4)), t, 0.3)
            place(buf, fade(s["sfx-impact-03"][: int(0.3 * SR)], 0, 0.1), t, 0.3)
        elif k == "thump":
            place(buf, s["sfx-impact-08"], t - 0.01, 0.75)
        elif k == "number":
            place(buf, pitch(s["sfx-impact-06"], 659.26 / 689.0), t, 0.42)
        elif k == "tick":
            place(buf, s["sfx-ui-01"], t, 0.3)
        elif k == "strip":
            place(buf, s["sfx-foley-02"], t, 0.16, -0.4)
        elif k == "type":
            place(buf, s["sfx-ui-01"], t, 0.28, -0.3)
        elif k == "whoosh":
            place(buf, s["sfx-transition-02"], t - 0.245, 0.35)
        elif k == "block":
            place(buf, pitch(s["sfx-impact-01"], [1.5, 1.78, 2.0, 1.33][e["step"]]), t, 0.5, 0.3)
        elif k == "switch":
            place(buf, s["sfx-mechanical-13"], t, 0.3, 0.35)

    buf = buf[: int(dur * SR)]
    buf = norm(buf, 0.89)
    wav = OUT / f"mix-{LANG}.wav"
    wavfile.write(wav, SR, (buf * 32767).astype(np.int16))

    # two-pass loudnorm on the mix, muxed with the picture
    video, out = OUT / f"video-{LANG}.mp4", OUT / f"sample-{LANG}.mp4"
    target = "I=-12:TP=-1.2:LRA=11"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(wav), "-af", f"loudnorm={target}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    j = json.loads(p.stderr[p.stderr.rindex("{") : p.stderr.rindex("}") + 1])
    af = (f"loudnorm={target}:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}"
          f":measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample={SR}")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(video), "-i", str(wav), "-map", "0:v", "-map", "1:a",
                    "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(out)], check=True)
    print(out)


def _resample_mono(note):
    """bar() renders at 44.1 kHz; bring it to SR and to stereo."""
    n = int(len(note) * SR / 44100)
    y = np.interp(np.arange(n) * 44100 / SR, np.arange(len(note)), note)
    return np.stack([y, y], 1)


if __name__ == "__main__":
    main()
