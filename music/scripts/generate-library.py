#!/usr/bin/env python3
"""Resumable Vertex generation, full-audio review, processing and optional R2 publication."""

from __future__ import annotations

import argparse
import base64
import concurrent.futures
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "music/.cache/library"
PROJECT = os.environ.get("GOOGLE_CLOUD_PROJECT", "project-302b2deb-58d4-4358-830")
ENDPOINT = f"https://aiplatform.googleapis.com/v1beta1/projects/{PROJECT}/locations/global/interactions"
GCLOUD = shutil.which("gcloud") or str(Path.home() / "google-cloud-sdk/bin/gcloud")
TOKEN_LOCK = threading.Lock()
TOKEN = ["", 0.0]
PRINT_LOCK = threading.Lock()


def log(message):
    with PRINT_LOCK:
        print(message, flush=True)


def now():
    return datetime.now(timezone.utc).isoformat()


def write(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    temp.replace(path)


def token():
    with TOKEN_LOCK:
        if time.monotonic() - TOKEN[1] > 2400 or not TOKEN[0]:
            TOKEN[:] = [
                subprocess.check_output(
                    [GCLOUD, "auth", "print-access-token"], text=True, timeout=120
                ).strip(),
                time.monotonic(),
            ]
        return TOKEN[0]


def request(url, body, timeout=600):
    # gcloud can return a cached token close to expiry. Refresh after an explicit
    # 401 (the API rejected authentication, so no generation was accepted).
    for auth_attempt in range(2):
        bearer = token()
        req = urllib.request.Request(
            url,
            json.dumps(body).encode(),
            headers={
                "Authorization": "Bearer " + bearer,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.build_opener(urllib.request.ProxyHandler({})).open(
                req, timeout=timeout
            ) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            detail = e.read().decode()[:1200]
            if e.code == 401 and auth_attempt == 0:
                with TOKEN_LOCK:
                    if TOKEN[0] == bearer:
                        TOKEN[:] = ["", 0.0]
                continue
            raise RuntimeError(f"HTTP {e.code}: {detail}") from e


def run(args, logfile):
    with logfile.open("a") as f:
        subprocess.run(
            [str(x) for x in args],
            cwd=ROOT,
            stdout=f,
            stderr=f,
            check=True,
            timeout=600,
        )


def review_request(url, body, timeout):
    # Retry explicitly rejected review requests, never an uncertain generation.
    for attempt in range(3):
        try:
            return request(url, body, timeout)
        except RuntimeError as error:
            if attempt == 2 or not re.search(r"HTTP (429|500|502|503|504)", str(error)):
                raise
            time.sleep(15 * (attempt + 1))


def review(audio, directory, short_cue=False):
    dest = directory / ("review-short-" + hashlib.sha256(audio.read_bytes()).hexdigest()[:16] + ".json" if short_cue else "review.json")
    if dest.exists():
        return json.loads(dest.read_text())
    ask = 'Listen to the entire audio as a music-library quality reviewer. Return JSON only: {"instrumental":boolean,"vocalsDetected":boolean,"audibleDefect":boolean,"suitableForLibrary":boolean,"description":{"en":string,"zh":string},"instruments":[English strings],"moods":[English strings],"energy":integer from 1 to 5,"bpmEstimate":number or null,"reason":string}. Any singing, humming, choir, speech or vocal samples means vocalsDetected=true and instrumental=false. Synthetic pads and wind instruments alone are not vocals. Audible defects mean severe distortion, glitches, abrupt truncation or long unintended silence, not stylistic noise. Describe the actual music, not imagined visual content. Be conservative and concise.'
    if short_cue:
        ask += (' This is a short promotional music edit. Also return immediateHook:boolean '
                '(rhythmic or melodic hook within the first second), clearPulse:boolean, '
                'resolvedEnding:boolean (a deliberate musical ending rather than an abrupt cut), '
                'and shortFormReason:string describing the audible opening and ending. Judge only this audio.')
    model = "gemini-2.5-flash"
    result = review_request(
        f"https://aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/global/publishers/google/models/{model}:generateContent",
        {
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"text": ask},
                        {
                            "inlineData": {
                                "mimeType": "audio/mpeg",
                                "data": base64.b64encode(audio.read_bytes()).decode(),
                            }
                        },
                    ],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        },
        180,
    )
    text = "".join(
        p.get("text", "")
        for c in result.get("candidates", [])
        for p in c.get("content", {}).get("parts", [])
        if not p.get("thought")
    )
    data = json.loads(text)
    data.update(
        model=model,
        reviewedAt=now(),
        scope="full-audio",
        method="automated-audio-review",
    )
    for field in [
        "instrumental",
        "vocalsDetected",
        "audibleDefect",
        "suitableForLibrary",
    ]:
        if type(data.get(field)) is not bool:
            raise ValueError("Invalid review " + field)
    if not isinstance(data.get("description"), dict) or any(
        not isinstance(data["description"].get(lang), str)
        or not data["description"][lang].strip()
        for lang in ["en", "zh"]
    ):
        raise ValueError("Review must include an English and Chinese description")
    if short_cue:
        for field in ["immediateHook", "clearPulse", "resolvedEnding"]:
            if type(data.get(field)) is not bool:
                raise ValueError("Invalid short review " + field)
    write(dest, data)
    return data


def generate(track, directory, max_attempts):
    audio = directory / "master.mp3"
    rec = directory / "generation.json"
    if audio.exists() and rec.exists():
        cached = json.loads(rec.read_text())
        # Early batch records used a local UUID under this transport-sounding key.
        # It was not transmitted as a request header; retain only the local id.
        cached.pop("clientRequestId", None)
        return audio, cached
    previous = sorted(directory.glob("attempt-*.json"))
    if previous:
        last = json.loads(previous[-1].read_text())
        if last.get("state") != "retryable":
            raise RuntimeError(
                "Prior request requires inspection; choose a new candidate explicitly after resolving it"
            )
    for attempt in range(1, max_attempts + 1):
        attempt_file = directory / f"attempt-{attempt}.json"
        if attempt_file.exists():
            continue  # An uncertain request is never silently paid for again on resume.
        start = now()
        request_id = str(uuid.uuid4())
        write(
            attempt_file,
            {"requestedAt": start, "requestId": request_id, "state": "started"},
        )
        try:
            response = request(
                ENDPOINT,
                {
                    "model": track["model"],
                    "input": [{"type": "text", "text": track["prompt"]}],
                },
            )
            outputs = response.get("outputs", [])
            item = next((x for x in outputs if x.get("type") == "audio"), None)
            if not item:
                raise RuntimeError(json.dumps(response)[:1200])
            if item.get("mime_type", "audio/mpeg") not in ["audio/mpeg", "audio/mp3"]:
                raise RuntimeError("Expected MP3 output")
            data = base64.b64decode(item["data"], validate=True)
            if len(data) < 10000:
                raise RuntimeError("Audio output too small")
            tmp = audio.with_suffix(".tmp")
            tmp.write_bytes(data)
            tmp.replace(audio)
            gen = {
                "id": request_id,
                "model": track["model"],
                "generator": "Google Lyria 3",
                "api": "Vertex AI Interactions API",
                "endpoint": ENDPOINT,
                "requestedAt": start,
                "completedAt": now(),
                "interactionId": response.get("id"),
                "sha256": hashlib.sha256(data).hexdigest(),
            }
            write(rec, gen)
            write(attempt_file, {"state": "completed", **gen})
            return audio, gen
        except Exception as e:
            write(
                attempt_file,
                {
                    "state": "retryable"
                    if re.search(r"HTTP (429|500|502|503|504)", str(e))
                    else "failed-or-uncertain",
                    "requestedAt": start,
                    "requestId": request_id,
                    "error": str(e),
                },
            )
            # Permission, auth, blocked content and ambiguous network failures need inspection.
            if not re.search(r"HTTP (429|500|502|503|504)", str(e)):
                raise
            if attempt == max_attempts:
                raise
            time.sleep(min(30, 5 * attempt))
    raise RuntimeError(
        "Attempt budget exhausted; inspect attempt records before a new candidate"
    )


def verify(url):
    # Use the same public HTTP client as release smoke checks. Some CDN protections
    # reject Python's default TLS/user-agent combination although browser/curl work.
    result = subprocess.run(
        [
            "curl",
            "--fail",
            "--silent",
            "--show-error",
            "--location",
            "--max-time",
            "60",
            "--retry",
            "2",
            "--retry-all-errors",
            "--range",
            "0-1023",
            "--output",
            os.devnull,
            "--write-out",
            "%{http_code} %{content_type} %{size_download}",
            url,
        ],
        capture_output=True,
        check=False,
        text=True,
        timeout=200,
    )
    fields = result.stdout.split()
    if (
        result.returncode
        or len(fields) != 3
        or fields[0] not in ["200", "206"]
        or fields[1] != "audio/mpeg"
        or float(fields[2]) < 100
    ):
        raise RuntimeError(
            "CDN audio check failed: " + result.stdout + " " + result.stderr[:200]
        )


def work(track, args):
    ident = track["id"]
    directory = CACHE / ident
    if args.candidate != "c1":
        directory = directory / args.candidate
    directory.mkdir(parents=True, exist_ok=True)
    public = ROOT / "music/tracks" / f"{ident}.json"
    if public.exists() and json.loads(public.read_text()).get("status") == "published":
        return ident, "already-published"
    try:
        intent = directory / "intent.json"
        prompt_hash = hashlib.sha256(track["prompt"].encode()).hexdigest()
        if (
            intent.exists()
            and json.loads(intent.read_text())["promptSha256"] != prompt_hash
        ):
            raise RuntimeError(
                "Prompt changed; use a new candidate, never reuse old audio with new prompt metadata"
            )
        write(intent, {"promptSha256": prompt_hash, "prompt": track["prompt"]})
        audio, gen = generate(track, directory, args.attempts)
        probe = json.loads(
            subprocess.check_output(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_format",
                    "-show_streams",
                    "-of",
                    "json",
                    str(audio),
                ],
                text=True,
            )
        )
        duration = float(probe["format"]["duration"])
        if duration < (8 if track.get("shortForm") else 20) or duration > (35 if track["model"] == "lyria-3-clip-preview" else 200):
            raise RuntimeError(f"Unexpected duration {duration}")
        # Decode the complete master; preserve the original signed bytes unchanged.
        run(
            ["ffmpeg", "-xerror", "-v", "error", "-i", audio, "-f", "null", "-"],
            directory / "decode.log",
        )
        version = "v" + args.candidate[1:]
        processed = ROOT / "music/.cache/processed" / ident / version
        report_path = processed / "process.json"
        process_record = json.loads(report_path.read_text()) if report_path.exists() else {}
        if not process_record or (track.get("shortForm") and (process_record.get("recipe") != "short-v2" or process_record.get("edit", {}).get("requestedSeconds") != track["targetDuration"])):
            run(
                [
                    "node",
                    "music/scripts/process-audio.mjs",
                    audio,
                    processed,
                    "--immediate",
                    *(["--short-cue", str(track["targetDuration"])] if track.get("shortForm") else []),
                ],
                directory / "process.log",
            )
        source_qa = review(audio, directory) if track.get("shortForm") else None
        if source_qa and (not source_qa["instrumental"] or source_qa["vocalsDetected"] or source_qa["audibleDefect"] or not source_qa["suitableForLibrary"]):
            raise RuntimeError("Source audio review rejected: " + source_qa.get("reason", ""))
        source_duration = duration
        if track.get("shortForm"):
            preview = processed / "preview.mp3"
            duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(preview)], text=True))
            run(["ffmpeg", "-xerror", "-v", "error", "-i", preview, "-f", "null", "-"], directory / "preview-decode.log")
            silence = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(preview), "-af", "silencedetect=n=-45dB:d=1.5", "-f", "null", "-"], capture_output=True, text=True, check=True)
            (directory / "preview-silence.log").write_text(silence.stderr)
            if "silence_start:" in silence.stderr:
                raise RuntimeError("Short preview contains at least 1.5 seconds of silence")
        qa = review(processed / "preview.mp3" if track.get("shortForm") else audio, directory, bool(track.get("shortForm")))
        if (
            not qa["instrumental"]
            or qa["vocalsDetected"]
            or qa["audibleDefect"]
            or not qa["suitableForLibrary"]
        ):
            raise RuntimeError(
                "Audio review rejected: "
                + json.dumps(
                    {
                        key: qa.get(key)
                        for key in [
                            "instrumental",
                            "vocalsDetected",
                            "audibleDefect",
                            "suitableForLibrary",
                            "reason",
                        ]
                    },
                    ensure_ascii=False,
                )
            )
        if track.get("shortForm") and not all(qa.get(f) for f in ["immediateHook", "clearPulse", "resolvedEnding"]):
            raise RuntimeError("Short-form review rejected: " + qa.get("shortFormReason", "missing hook, pulse or ending"))
        result = {
            **track,
            "duration": round(duration, 3),
            "targetEnergy": track["energy"],
            "energy": qa["energy"]
            if type(qa.get("energy")) is int and 1 <= qa["energy"] <= 5
            else track["energy"],
            "energyBasis": "automated-audio-review"
            if type(qa.get("energy")) is int and 1 <= qa["energy"] <= 5
            else "prompt-intent",
            "generatedAt": gen["completedAt"],
            "generation": gen,
            "audioReview": qa,
            "status": "generated",
            "loop": {"seamless": False, "basis": "not seam-tested"},
            "metadataBasis": "style/scenario/tempo/key/moods are prompt intent; duration is measured; energy and audioReview are model inference when energyBasis is automated-audio-review",
        }
        if track.get("shortForm"):
            result["sourceDuration"] = source_duration
            result["sourceAudioReview"] = source_qa
            result["audioReview"]["asset"] = "preview"
            result["audioReview"]["sha256"] = hashlib.sha256((processed / "preview.mp3").read_bytes()).hexdigest()
            result["edit"] = json.loads((processed / "process.json").read_text())["edit"]
        result["description"] = qa.get("description", track["description"])
        result["assets"] = {
            name: f"https://music-cdn.shapeof.world/tracks/{ident}/{version}/{file}"
            for name, file in [
                ("preview", "preview.mp3"),
                ("master", "master.mp3"),
                ("waveform", "waveform.json"),
            ]
        }
        write(directory / "track.json", result)
        if args.publish:
            marker = directory / "uploaded.json"
            if not marker.exists():
                for attempt in range(3):
                    try:
                        run(
                            ["node", "music/scripts/upload-track.mjs", ident, version],
                            directory / "upload.log",
                        )
                        break
                    except subprocess.CalledProcessError:
                        if attempt == 2:
                            raise
                        time.sleep(5 * (attempt + 1))
                write(marker, {"uploadedAt": now()})
            verify(result["assets"]["preview"])
            verify(result["assets"]["master"])
            result["status"] = "published"
            result["verifiedAt"] = now()
            write(public, result)
        write(
            directory / "state.json",
            {"state": result["status"], "duration": duration, "completedAt": now()},
        )
        return ident, result["status"]
    except Exception as e:  # noqa: BLE001 — isolate each paid job from failures in other tracks
        write(
            directory / "state.json",
            {"state": "failed", "error": str(e), "updatedAt": now()},
        )
        return ident, "failed: " + str(e)[:220]


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--manifest", default="music/batches/library-2026-09.json")
    p.add_argument("--jobs", type=int, choices=range(1, 7), default=4)
    p.add_argument("--limit", type=int)
    p.add_argument("--ids", nargs="+")
    p.add_argument("--attempts", type=int, choices=[1, 2, 3], default=2)
    p.add_argument("--publish", action="store_true")
    p.add_argument("--candidate", default="c1")
    a = p.parse_args()
    if not re.fullmatch(r"c[1-9][0-9]*", a.candidate):
        p.error("candidate must be c1, c2, ...")
    CACHE.mkdir(parents=True, exist_ok=True)
    lock = (CACHE / ".runner.lock").open("w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        p.error("A library runner is already active; wait before resuming")
    tracks = json.loads((ROOT / a.manifest).read_text())["tracks"]
    if a.ids and (missing := set(a.ids) - {t["id"] for t in tracks}):
        p.error("Unknown track ids: " + ", ".join(sorted(missing)))
    tracks = [t for t in tracks if not a.ids or t["id"] in a.ids][: a.limit]
    ids = [t["id"] for t in tracks]
    if len(set(ids)) != len(ids) or any(
        not re.fullmatch("[a-z0-9]+(?:-[a-z0-9]+)*", i) for i in ids
    ):
        p.error("Invalid or duplicate ids")
    token()
    failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=a.jobs) as pool:
        futures = [pool.submit(work, t, a) for t in tracks]
        for i, f in enumerate(concurrent.futures.as_completed(futures), 1):
            ident, state = f.result()
            failed += state.startswith("failed")
            log(f"{i}/{len(tracks)} {ident}: {state}")
    log(f"Finished: {len(tracks) - failed} successful, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
