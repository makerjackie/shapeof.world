"""Builds public/score3.wav for v3 from 千年之后（氛围版）(public/music.m4a) and fetches the v3 sound effects.

usage: ~/.venvs/shapeof-films/bin/python tools/music3.py

Layout (must match src/v3/time.ts): the film starts at track bar 4 (track time 4 bars, so the first beat lands at
film 0.487 s); the track plays to the downbeat of bar 28, stops for one bar of silence, resumes on that downbeat and
runs to bar 80, fading over its last two bars. 111.62 BPM, first beat 0.487 s. No change of tempo.
"""
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from audio import FF, fetch, lufs  # noqa: E402  (same library fetch as v2)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BAR = 240 / 111.62
FIRST = 0.487
START = 4 * BAR
CUT = FIRST + 28 * BAR
END = FIRST + 80 * BAR + 0.4
LEVEL = -16.0


def main() -> None:
    src = os.path.join(ROOT, "public", "music.m4a")
    if not os.path.exists(src):
        raise SystemExit("public/music.m4a missing: curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a")
    for sid in sorted(set(re.findall(r'"(sfx-[a-z]+-\d+)"', open(os.path.join(ROOT, "src", "v3", "sfx3.ts")).read()))):
        fetch(sid, "sfx")
    gain = LEVEL - lufs(src)
    film_len = (CUT - START) + BAR + (END - CUT)
    fade_at = film_len - 0.4 - 2 * BAR
    fmt = "aformat=sample_rates=48000:channel_layouts=stereo"
    graph = ";".join(
        [
            f"[0:a]atrim={START:.5f}:{CUT:.5f},asetpts=PTS-STARTPTS,{fmt},afade=t=out:st={CUT - START - 0.06:.5f}:d=0.06[a]",
            f"aevalsrc=0|0:d={BAR:.5f}:s=48000,{fmt}[s]",
            f"[0:a]atrim={CUT:.5f}:{END:.5f},asetpts=PTS-STARTPTS,{fmt}[b]",
            f"[a][s][b]concat=n=3:v=0:a=1,volume={gain:.2f}dB,afade=t=out:st={fade_at:.4f}:d={2 * BAR + 0.4:.4f}[out]",
        ]
    )
    out = os.path.join(ROOT, "public", "score3.wav")
    subprocess.run([FF, "-nostdin", "-loglevel", "error", "-y", "-i", src, "-filter_complex", graph, "-map", "[out]", "-c:a", "pcm_s16le", out], check=True)
    print(f"score3.wav {film_len:.2f} s, gain {gain:+.1f} dB; silence {CUT - START:.3f}–{CUT - START + BAR:.3f} s")


if __name__ == "__main__":
    main()
