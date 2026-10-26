"""Fetches the soundtrack and sound effects from our own library and builds public/score.wav.

usage: ~/.venvs/shapeof-films/bin/python tools/audio.py

The layout must match src/timing.ts:
  A  scene-game-synthwave-rest, track 0 → bar 28 (113.99 BPM, first beat 0.033 s); the first 4 bars low-passed
     (as if through a wall), opening fully on the title (bar 4); a hard stop on the downbeat of bar 28
  -  1.0 s of silence
  B  scene-game-ambient-rest, track 0 → bar 17 (72.01 BPM, first beat 0); fades over its last 2.2 s
  C  scene-soul-90, track 0 → bar 25 (100.36 BPM, first beat 0.103 s); fades over its last 4.5 s
Each track is levelled to the same integrated loudness first; tools/tpmaster.py sets the final level.
Audio files stay out of Git (films/**/*.wav, *.mp3 in the root .gitignore).
"""
import hashlib
import json
import os
import re
import subprocess
import urllib.request

FF = "/opt/homebrew/bin/ffmpeg"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRACKS = os.path.normpath(os.path.join(ROOT, "..", "..", "music", "tracks"))
PUB = os.path.join(ROOT, "public")
UA = {"User-Agent": "Mozilla/5.0 (shapeof.world films)"}  # the CDN refuses Python's default UA

A_BAR, B_BAR, C_BAR = 240 / 113.99, 240 / 72.01, 240 / 100.36
A_END = 0.033 + 28 * A_BAR
B_START = A_END + 1.0
B_LEN = 17 * B_BAR
C_START = B_START + B_LEN
C_LEN = 0.103 + 25 * C_BAR
FILM_S = C_START + C_LEN + 0.25
OPEN = 0.033 + 4 * A_BAR  # the title downbeat
LEVEL = -17.0  # LUFS per track before mastering

MUSIC = ["scene-game-synthwave-rest", "scene-game-ambient-rest", "scene-soul-90"]
SFX = sorted(set(re.findall(r'id: "(sfx-[a-z]+-\d+)"', open(os.path.join(ROOT, "src", "sfx.ts")).read())))


def fetch(tid: str, sub: str) -> str:
    meta = json.load(open(os.path.join(TRACKS, f"{tid}.json")))
    assert meta.get("status") == "published", tid
    url = meta["assets"]["master"]
    ext = url.rsplit(".", 1)[1]
    os.makedirs(os.path.join(PUB, sub), exist_ok=True)
    out = os.path.join(PUB, sub, f"{tid}.{ext}")
    if not os.path.exists(out):
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA)).read()
        want = (meta.get("assetIntegrity") or {}).get("master", {}).get("sha256")
        if want and hashlib.sha256(data).hexdigest() != want:
            raise SystemExit(f"sha256 mismatch for {tid}")
        open(out, "wb").write(data)
    if sub == "sfx" and ext != "wav":
        wav = out.rsplit(".", 1)[0] + ".wav"
        subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", out, wav], check=True)
        out = wav
    return out


def lufs(path: str) -> float:
    r = subprocess.run([FF, "-nostdin", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])


def main() -> None:
    src = [fetch(t, "music") for t in MUSIC]
    for s in SFX:
        fetch(s, "sfx")
    gains = [LEVEL - lufs(p) for p in src]
    print("gains dB", [round(g, 1) for g in gains])
    fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
    x0, x1 = OPEN - 0.2, OPEN
    graph = ";".join(
        [
            f"[0:a]atrim=0:{A_END:.5f},asetpts=PTS-STARTPTS,{fmt},volume={gains[0]:.2f}dB,asplit=2[a1][a2]",
            f"[a1]lowpass=f=650,lowpass=f=650,volume='if(lt(t,{x0:.4f}),1,if(lt(t,{x1:.4f}),({x1:.4f}-t)/0.2,0))':eval=frame[alp]",
            f"[a2]volume='if(lt(t,{x0:.4f}),0,if(lt(t,{x1:.4f}),(t-{x0:.4f})/0.2,1))':eval=frame[afull]",
            f"[alp][afull]amix=inputs=2:normalize=0:duration=longest,afade=t=out:st={A_END - 0.08:.5f}:d=0.08[A]",
            f"[1:a]atrim=0:{B_LEN:.5f},asetpts=PTS-STARTPTS,{fmt},volume={gains[1]:.2f}dB,afade=t=in:d=0.02,afade=t=out:st={B_LEN - 2.2:.5f}:d=2.2,adelay=delays={round(B_START * 1000)}:all=1[B]",
            f"[2:a]atrim=0:{C_LEN:.5f},asetpts=PTS-STARTPTS,{fmt},volume={gains[2]:.2f}dB,afade=t=in:d=0.6,afade=t=out:st={C_LEN - 4.5:.5f}:d=4.5,adelay=delays={round(C_START * 1000)}:all=1[C]",
            f"[A][B][C]amix=inputs=3:normalize=0:duration=longest,apad=whole_dur={FILM_S:.4f},atrim=0:{FILM_S:.4f}[out]",
        ]
    )
    out = os.path.join(PUB, "score.wav")
    subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", *sum([["-i", p] for p in src], []), "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
    print(f"score.wav {FILM_S:.2f} s; A ends {A_END:.3f}, B {B_START:.3f}–{B_START + B_LEN:.3f}, C from {C_START:.3f}")


if __name__ == "__main__":
    main()
