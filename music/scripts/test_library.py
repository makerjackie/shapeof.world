"""Paid-call safety and manifest invariants, without making network requests."""

import importlib.util
import io
import json
import tempfile
import subprocess
import hashlib
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch


def module(name):
    spec = importlib.util.spec_from_file_location(
        name, Path(__file__).with_name(name + ".py")
    )
    out = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(out)
    return out


lib = module("generate-library")
plan = module("plan-library")


class LibraryTests(unittest.TestCase):
    def test_expanded_promos_are_independent_and_use_long_sources_when_needed(self):
        data = module("plan-promo-library").plan()
        records = data["tracks"]
        self.assertEqual(len(records), 90)
        self.assertEqual(len({t["id"] for t in records}), 90)
        self.assertEqual(len({t["prompt"] for t in records}), 90)
        self.assertEqual(len({t["styles"][0] for t in records}), 18)
        self.assertEqual({t["targetDuration"] for t in records}, {15, 20, 25, 35, 40})
        taxonomy = json.loads((lib.ROOT / "music/taxonomy.json").read_text())
        for t in records:
            self.assertIn(t["styles"][0], taxonomy["styles"])
            self.assertEqual(t["model"], "lyria-3-pro-preview" if t["targetDuration"] > 30 else "lyria-3-clip-preview")
            self.assertIn("No vocals", t["prompt"])
            self.assertIn("short-promos", t["collections"])

    def test_short_processing_keeps_audio_through_the_ending(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "source.mp3"
            output = Path(folder) / "processed"
            subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=20", "-codec:a", "libmp3lame", str(source)], check=True)
            original_hash = hashlib.sha256(source.read_bytes()).hexdigest()
            subprocess.run(["node", str(Path(__file__).with_name("process-audio.mjs")), str(source), str(output), "--immediate", "--short-cue", "10"], check=True, capture_output=True)
            self.assertEqual(hashlib.sha256((output / "master.mp3").read_bytes()).hexdigest(), original_hash)
            result = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(output / "preview.mp3"), "-af", "silencedetect=n=-45dB:d=0.5", "-f", "null", "-"], check=True, capture_output=True, text=True)
            self.assertNotIn("silence_start:", result.stderr)
            duration = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(output / "preview.mp3")], text=True))
            self.assertAlmostEqual(duration, 10, delta=.1)

    def test_short_campaign_has_independent_sources(self):
        short = module("plan-shorts").plan()["tracks"]
        self.assertEqual(len(short), 18)
        self.assertEqual(len({t["prompt"] for t in short}), 18)
        self.assertEqual({t["targetDuration"] for t in short}, {15, 20, 25})
        self.assertFalse({t["id"] for t in short} & {t["id"] for t in plan.manifest()["tracks"]})
        self.assertTrue(all(t["model"] == "lyria-3-clip-preview" for t in short))

    def test_auth_rejection_refreshes_once(self):
        denied = urllib.error.HTTPError(
            "https://example.test", 401, "expired", {}, io.BytesIO(b"expired")
        )
        from unittest.mock import MagicMock

        opener = MagicMock()
        response = MagicMock()
        response.__enter__.return_value.read.return_value = b'{"ok": true}'
        opener.open.side_effect = [denied, response]
        with (
            patch.object(lib, "token", side_effect=["old", "fresh"]),
            patch.object(lib.urllib.request, "build_opener", return_value=opener),
        ):
            self.assertEqual(lib.request("https://example.test", {}), {"ok": True})
        self.assertEqual(opener.open.call_count, 2)
        self.assertEqual(
            opener.open.call_args_list[1].args[0].get_header("Authorization"),
            "Bearer fresh",
        )

    def test_review_recovers_explicit_quota_rejections(self):
        with (
            patch.object(
                lib,
                "request",
                side_effect=[RuntimeError("HTTP 429: quota"), {"ok": True}],
            ) as request,
            patch.object(lib.time, "sleep") as sleep,
        ):
            self.assertEqual(
                lib.review_request("https://example.test", {}, 180), {"ok": True}
            )
            self.assertEqual(request.call_count, 2)
            sleep.assert_called_once_with(15)

    def test_distinct_compositions(self):
        tracks = plan.manifest()["tracks"]
        self.assertEqual(len(tracks), 300)
        for field in ["id", "code", "prompt"]:
            self.assertEqual(len({t[field] for t in tracks}), 300)
        self.assertEqual(len({t["styles"][0] for t in tracks}), 30)
        self.assertGreaterEqual(len({t["targetDuration"] for t in tracks}), 4)

    def test_new_campaign_has_separate_ids(self):
        original = plan.manifest()["tracks"]
        next_batch = plan.manifest("library-next", "next")["tracks"]
        self.assertFalse({t["id"] for t in original} & {t["id"] for t in next_batch})
        self.assertTrue(all(t["batch"] == "library-next" for t in next_batch))

    def test_resume_preserves_paid_success(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            (p / "master.mp3").write_bytes(b"original")
            lib.write(p / "generation.json", {"id": "original-call"})
            with patch.object(lib, "request") as request:
                audio, record = lib.generate({}, p, 2)
                self.assertEqual(audio.read_bytes(), b"original")
                self.assertEqual(record["id"], "original-call")
                request.assert_not_called()

    def test_uncertain_request_is_not_automatically_repaid(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            lib.write(p / "attempt-1.json", {"state": "started"})
            with patch.object(lib, "request") as request:
                with self.assertRaisesRegex(RuntimeError, "requires inspection"):
                    lib.generate({}, p, 3)
                request.assert_not_called()

    def test_explicit_transient_failure_can_resume_within_budget(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d)
            lib.write(p / "attempt-1.json", {"state": "retryable"})
            with patch.object(
                lib, "request", side_effect=RuntimeError("HTTP 400: content_blocked")
            ) as request:
                with self.assertRaisesRegex(RuntimeError, "content_blocked"):
                    lib.generate({"model": "test", "prompt": "test"}, p, 2)
                self.assertEqual(request.call_count, 1)
                self.assertEqual(
                    json.loads((p / "attempt-2.json").read_text())["state"],
                    "failed-or-uncertain",
                )


if __name__ == "__main__":
    unittest.main()
