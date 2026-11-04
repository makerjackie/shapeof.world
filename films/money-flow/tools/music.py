# v7 score: 「脉搏 · 弦」 (music.shapeof.world track pulse-strings, Lyria 3.5 take E6 at 111.6 BPM), used whole and
# unedited; the film is cut to its bars (src/timing.ts). Writes public/score.wav padded with silence to the film's end.
# usage: python tools/music.py [source.wav]
import os, subprocess, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("PULSE_STRINGS", "/Volumes/DevSSD/Work/lyria-qnzh/takes/e6_t.wav")
CDN = "https://music-cdn.shapeof.world/tracks/pulse-strings/v1/master.wav"
END = 0.105 + 80 * 240 / 111.6 + 5.4 + 0.5  # timing.ts T.end, plus a margin

here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "..", "public", "score.wav")
if not os.path.exists(SRC):
    SRC = os.path.join(here, "..", "public", "music", "pulse-strings.wav")
    if not os.path.exists(SRC):
        subprocess.run(["curl", "-sfL", "-o", SRC, CDN], check=True)
subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", SRC, "-af", f"apad=whole_dur={END:.3f}", "-ar", "48000", "-ac", "2", out], check=True)
print("score.wav from", SRC)
