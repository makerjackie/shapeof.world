"""Contact sheets at one frame a second, each tile stamped with its time (m:ss).

Usage: ~/.venvs/shapeof-films/bin/python tools/contact.py <video.mp4> <out-prefix> [per-sheet=half] [cols=8] [width=320]
Writes <out-prefix>-1.jpg, -2.jpg, … (by default two sheets, one per half of the film)
"""

import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FFMPEG = "/opt/homebrew/bin/ffmpeg"


def main() -> None:
    video, prefix = sys.argv[1], sys.argv[2]
    per = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    cols = int(sys.argv[4]) if len(sys.argv) > 4 else 8
    width = int(sys.argv[5]) if len(sys.argv) > 5 else 320
    with tempfile.TemporaryDirectory() as tmp:
        # one frame at the middle of each second
        subprocess.run([FFMPEG, "-nostdin", "-hide_banner", "-loglevel", "error", "-i", video, "-vf", f"fps=1:start_time=0.5,scale={width}:-1", "-q:v", "3", f"{tmp}/f%04d.jpg"], check=True)
        frames = sorted(Path(tmp).glob("f*.jpg"))
        per = per or (len(frames) + 1) // 2
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 18)
        except OSError:
            font = ImageFont.load_default()
        for s in range(0, len(frames), per):
            chunk = frames[s : s + per]
            first = Image.open(chunk[0])
            w, h = first.size
            rows = (len(chunk) + cols - 1) // cols
            pad = 3
            sheet = Image.new("RGB", (cols * (w + pad) + pad, rows * (h + pad) + pad), "white")
            for i, f in enumerate(chunk):
                im = Image.open(f).convert("RGB")
                d = ImageDraw.Draw(im)
                sec = s + i
                label = f"{sec // 60}:{sec % 60:02d}"
                d.rectangle([0, 0, 52, 22], fill=(0, 0, 0))
                d.text((5, 2), label, fill=(255, 255, 255), font=font)
                sheet.paste(im, (pad + (i % cols) * (w + pad), pad + (i // cols) * (h + pad)))
            out = f"{prefix}-{s // per + 1}.jpg"
            sheet.save(out, quality=82)
            print(out, sheet.size)


if __name__ == "__main__":
    main()
