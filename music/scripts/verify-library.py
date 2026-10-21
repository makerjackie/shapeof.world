#!/usr/bin/env python3
"""Verify a released library's metadata, local masters, waveforms and public CDN URLs."""

import argparse
import concurrent.futures
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def check(track):
    errors = []
    if track.get("status") != "published":
        return [f"{track['id']}: not published"]
    for field in ["preview", "master", "waveform"]:
        url = track["assets"].get(field, "")
        if not url.startswith("https://music-cdn.shapeof.world/tracks/"):
            errors.append(f"{field}: invalid CDN")
            continue
        r = subprocess.run(
            [
                "curl",
                "--fail",
                "-sS",
                "--retry",
                "2",
                "--retry-all-errors",
                "--max-time",
                "30",
                "--head",
                "--output",
                "/dev/null",
                "--write-out",
                "%{http_code} %{content_type}",
                url,
            ],
            capture_output=True,
            check=False,
            text=True,
            timeout=100,
        )
        expected = (
            "application/json"
            if field == "waveform"
            else "audio/mpeg"
            if url.endswith(".mp3")
            else "audio/wav"
        )
        if r.returncode or r.stdout.split(";")[0] != f"200 {expected}":
            errors.append(f"{field}: {r.stdout} {r.stderr[:100]}")
    if track.get("batch"):
        qa = track.get("audioReview", {})
        if (
            not qa.get("instrumental")
            or qa.get("vocalsDetected")
            or qa.get("audibleDefect")
            or not qa.get("suitableForLibrary")
        ):
            errors.append("audio review failed")
        version = track["assets"]["preview"].split("/")[-2]
        processed = ROOT / "music/.cache/processed" / track["id"] / version
        if processed.exists():
            master = processed / "master.mp3"
            if (
                hashlib.sha256(master.read_bytes()).hexdigest()
                != track["generation"]["sha256"]
            ):
                errors.append("source SHA mismatch")
            if track.get("shortForm"):
                preview = processed / "preview.mp3"
                if hashlib.sha256(preview.read_bytes()).hexdigest() != track["audioReview"].get("sha256"):
                    errors.append("preview review SHA mismatch")
                if not all(track["audioReview"].get(key) for key in ["immediateHook", "clearPulse", "resolvedEnding"]):
                    errors.append("short cue review failed")
                source_qa = track.get("sourceAudioReview", {})
                if not source_qa.get("instrumental") or source_qa.get("vocalsDetected") or source_qa.get("audibleDefect"):
                    errors.append("source review failed")
            wave = json.loads((processed / "waveform.json").read_text())
            if len(wave["peaks"]) != 400 or max(wave["peaks"]) < 0.01:
                errors.append("empty or malformed waveform")
            if abs(wave["duration"] - track["duration"]) > 0.1:
                errors.append("duration mismatch")
    return [f"{track['id']}: {e}" for e in errors]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--batch")
    p.add_argument("--minimum", type=int, default=0)
    p.add_argument("--out", default="music/.cache/library-verification.json")
    a = p.parse_args()
    tracks = [json.loads(f.read_text()) for f in (ROOT / "music/tracks").glob("*.json")]
    tracks = [
        t
        for t in tracks
        if t.get("status") == "published" and (not a.batch or t.get("batch") == a.batch)
    ]
    errors = []
    if len(tracks) < a.minimum:
        errors.append(f"Expected >= {a.minimum} published tracks, got {len(tracks)}")
    hashes = [
        t["generation"]["sha256"]
        for t in tracks
        if t.get("generation", {}).get("sha256")
    ]
    if len(hashes) != len(set(hashes)):
        errors.append("Duplicate master SHA-256")
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for e in pool.map(check, tracks):
            errors.extend(e)
    lengths = [t["duration"] for t in tracks]
    report = {
        "checkedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(tracks),
        "styles": sorted({s for t in tracks for s in t.get("styles", [])}),
        "scenarios": sorted({s for t in tracks for s in t.get("scenarios", [])}),
        "durationSeconds": {
            "min": min(lengths, default=0),
            "max": max(lengths, default=0),
            "total": sum(lengths),
        },
        "errors": errors,
        "trackIds": sorted(t["id"] for t in tracks),
    }
    out = ROOT / a.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(
        json.dumps(
            {k: v for k, v in report.items() if k != "trackIds"},
            ensure_ascii=False,
            indent=2,
        )
    )
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
