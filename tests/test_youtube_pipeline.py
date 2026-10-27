"""Offline tests. All API responses are explicitly synthetic fixtures."""
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import pipeline as p


def speech(start=0.0, end=3.0, text="삼성전자 실적 전망입니다."):
    return p.SpeechSegment(start=start, end=end, text=text)


def fake_client(enrichment=None, raw=None, status="completed"):
    def parse(**kwargs):
        fake.calls.append(kwargs)
        return SimpleNamespace(output_parsed=enrichment, status=status)
    def create(**kwargs):
        fake.calls.append(kwargs)
        return SimpleNamespace(model_dump=lambda **_: raw)
    fake = SimpleNamespace(calls=[])
    fake.responses = SimpleNamespace(parse=parse)
    fake.audio = SimpleNamespace(transcriptions=SimpleNamespace(create=create))
    return fake


class PipelineTests(unittest.TestCase):
    def test_default_output_path_and_existing_output_rejected_before_api(self):
        with TemporaryDirectory() as tmp, patch.object(p, "BASE", Path(tmp)), \
                patch("openai.OpenAI") as api:
            output = Path(tmp) / "data/youtube_transcripts.json"
            output.parent.mkdir()
            output.write_text('{"existing": true}')
            before = output.read_bytes()
            with self.assertRaises(SystemExit) as result:
                p.main([])
            self.assertEqual(result.exception.code, 2)
            self.assertEqual(output.read_bytes(), before)
            api.assert_not_called()

    def test_original_uploaded_shape_is_accepted(self):
        data = p.read_json(p.BASE / "data/transcripts.json")
        self.assertEqual(p.Transcripts.model_validate(data).model_dump(), data)

    def test_url_variants_and_rejection(self):
        for url in ["https://www.youtube.com/watch?v=48WVf1ijerc&t=5",
                    "https://youtu.be/48WVf1ijerc", "https://youtube.com/shorts/48WVf1ijerc"]:
            self.assertEqual(p.video_id(url), "48WVf1ijerc")
        for url in ["http://youtube.com/watch?v=48WVf1ijerc", "https://youtube.com.evil/watch?v=48WVf1ijerc",
                    "https://youtube.com/watch?v=bad", "file:///etc/passwd"]:
            with self.assertRaises(ValueError):
                p.video_id(url)

    def test_inputs_and_duplicate_rejected(self):
        self.assertEqual(p.load_inputs(p.BASE / "video_inputs.json")[0][0], "48WVf1ijerc")
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "inputs.json"
            row = {"url": "https://www.youtube.com/watch?v=48WVf1ijerc"}
            p.write_json(path, {"videos": [row, row]})
            with self.assertRaises(ValueError):
                p.load_inputs(path)

    def test_glossary_contains_only_names(self):
        self.assertEqual(p.company_names(p.BASE / "data/disclosures.json"),
                         ["SK하이닉스", "네이버", "삼성전자", "카카오", "현대자동차"])

    def test_timestamp_floor_and_hour(self):
        self.assertEqual([p.timestamp(x) for x in [0, 4.99, 59.99, 60, 3601]],
                         ["0:00", "0:04", "0:59", "1:00", "60:01"])
        for value in [-1, float("nan"), float("inf")]:
            with self.assertRaises(ValueError):
                p.timestamp(value)

    def test_invalid_speech_rejected(self):
        for start, end in [(2.0, 1.0), (-1.0, 1.0), (0.0, float("nan"))]:
            with self.assertRaises(ValueError):
                speech(start=start, end=end)

    def test_transcribe_offset_and_api_parameters(self):
        client = fake_client(raw={"text": "삼성전자 실적 전망입니다.", "segments": [
            {"start": 1.25, "end": 3.0, "text": " 삼성전자 실적 전망입니다. "}]})
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "audio.mp3"
            path.write_bytes(b"synthetic fixture, not real audio")
            result = p.transcribe(client, [(path, 600.048, 4.0)], Path(tmp), "ko")
            self.assertAlmostEqual(result[0].start, 601.298)
            self.assertEqual(result[0].text, "삼성전자 실적 전망입니다.")
            call = client.calls[0]
            self.assertEqual(call["model"], "whisper-1")
            self.assertEqual(call["response_format"], "verbose_json")
            self.assertEqual(call["timestamp_granularities"], ["segment"])

    def test_empty_or_missing_timestamps_rejected(self):
        for raw in [{"text": "words", "segments": []}, {"text": "", "segments": []},
                    {"segments": [{"start": 0, "end": 50, "text": "bad"}]}]:
            with TemporaryDirectory() as tmp:
                path = Path(tmp) / "audio.mp3"
                path.write_bytes(b"fixture")
                with self.assertRaises(ValueError):
                    p.transcribe(fake_client(raw=raw), [(path, 0, 4)], Path(tmp), "ko")

    def test_enrichment_cannot_rewrite_speech(self):
        enrichment = p.Enrichment(mentioned_companies=["삼성전자"], captions=[
            p.Caption(segment_index=1, caption="향후 전망"), p.Caption(segment_index=0, caption="실적 전망")])
        client = fake_client(enrichment)
        segments = [speech(), speech(start=4.0, end=6.0, text="이는 전망입니다.")]
        with TemporaryDirectory() as tmp:
            captions, companies = p.enrich(client, segments, ["삼성전자"], Path(tmp), "gpt-4o-mini")
        self.assertEqual(captions, ["실적 전망", "향후 전망"])
        self.assertEqual(segments[1].text, "이는 전망입니다.")
        self.assertEqual(companies, ["삼성전자"])
        self.assertIs(client.calls[0]["text_format"], p.Enrichment)
        self.assertFalse(client.calls[0]["store"])

    def test_refusal_incomplete_duplicate_missing_and_empty_captions(self):
        invalid = [None, p.Enrichment(mentioned_companies=[], captions=[]),
                   p.Enrichment(mentioned_companies=[], captions=[p.Caption(segment_index=1, caption="bad")]),
                   p.Enrichment(mentioned_companies=[], captions=[p.Caption(segment_index=0, caption=" ")]),
                   p.Enrichment(mentioned_companies=[], captions=[p.Caption(segment_index=0, caption="a"),
                                                                p.Caption(segment_index=0, caption="b")])]
        for output in invalid:
            with TemporaryDirectory() as tmp, self.assertRaises(ValueError):
                p.enrich(fake_client(output), [speech()], [], Path(tmp), "gpt-4o-mini")
        with TemporaryDirectory() as tmp, self.assertRaises(ValueError):
            p.enrich(fake_client(status="incomplete"), [speech()], [], Path(tmp), "gpt-4o-mini")

    def test_enrichment_batches(self):
        client = fake_client()
        def parse(**kwargs):
            rows = json.loads(kwargs["input"][1]["content"])["segments"]
            return SimpleNamespace(status="completed", output_parsed=p.Enrichment(
                mentioned_companies=[], captions=[p.Caption(segment_index=r["segment_index"], caption="요약") for r in rows]))
        client.responses.parse = parse
        with TemporaryDirectory() as tmp:
            captions, _ = p.enrich(client, [speech() for _ in range(81)], [], Path(tmp), "gpt-4o-mini")
            self.assertEqual(len(list(Path(tmp).glob("enrichment_*.json"))), 3)
            self.assertEqual(len(captions), 81)

    def test_assemble_matches_exact_original_keys(self):
        original = next(iter(p.read_json(p.BASE / "data/transcripts.json").values()))
        meta = {key: original[key] for key in ["video_id", "url", "title", "channel", "published_at"]}
        video = p.assemble(meta, [speech()], ["실적 전망"], ["삼성전자"])
        self.assertEqual(set(video.model_dump()), set(original))
        self.assertEqual(set(video.segments[0].model_dump()), set(original["segments"][0]))
        with self.assertRaises(ValueError):
            p.Transcripts.model_validate({"different-id": video.model_dump()})

    def test_exclusive_write_preserves_existing_files(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / "original.json"
            p.write_json(path, {"original": True})
            before = path.read_bytes()
            with self.assertRaises(FileExistsError):
                p.write_json(path, {"overwritten": True})
            self.assertEqual(path.read_bytes(), before)

    def test_cli_mocked_end_to_end_separate_output_and_preserved_originals(self):
        before = {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in (p.BASE / "data").glob("*.json")}
        def fake_download(url, vid, folder, limit):
            source = folder / "audio.mp3"
            source.write_bytes(b"fixture")
            return {"video_id": vid, "url": url, "title": "모의 테스트", "channel": "fixture",
                    "published_at": "", "duration": 3}, source
        client = fake_client(p.Enrichment(mentioned_companies=["삼성전자"], captions=[p.Caption(segment_index=0, caption="실적 전망")]),
                             raw={"text": "삼성전자 실적 전망입니다.", "segments": [{"start": 0.0, "end": 3.0, "text": "삼성전자 실적 전망입니다."}]})
        with TemporaryDirectory() as tmp, patch.dict("os.environ", {"OPENAI_API_KEY": "test-only"}), \
                patch("openai.OpenAI", return_value=client), patch.object(p, "download", side_effect=fake_download), \
                patch.object(p, "ffmpeg_path", return_value="fixture"), \
                patch.object(p, "prepare_chunks", side_effect=lambda source, folder, ff: [(source, 0.0, 3.0)]):
            for i in range(2):
                self.assertEqual(p.main(["--runs-dir", str(Path(tmp) / "runs"),
                                         "--output", str(Path(tmp) / "data" / f"youtube_transcripts_{i}.json")]), 0)
            generated = list(Path(tmp).glob("data/youtube_transcripts_*.json"))
            self.assertEqual(len(generated), 2)
            data = p.Transcripts.model_validate(p.read_json(generated[0]))
            self.assertEqual(data.root["48WVf1ijerc"].segments[0].time, "0:00")
        self.assertEqual(before, {path: hashlib.sha256(path.read_bytes()).hexdigest() for path in before})

    def test_cli_failure_does_not_write_fake_transcript(self):
        with TemporaryDirectory() as tmp, patch.dict("os.environ", {"OPENAI_API_KEY": "test-only"}), \
                patch("openai.OpenAI"), patch.object(p, "ffmpeg_path", return_value="fixture"), \
                patch.object(p, "download", side_effect=RuntimeError("unavailable")):
            self.assertEqual(p.main(["--runs-dir", tmp, "--output", str(Path(tmp) / "youtube_transcripts.json")]), 1)
            self.assertFalse((Path(tmp) / "youtube_transcripts.json").exists())
            report = p.read_json(next(Path(tmp).glob("*/run_report.json")))
            self.assertEqual(report["status"], "failed")


class RealFFmpegTests(unittest.TestCase):
    def test_real_ffmpeg_conversion_and_chunk_offset(self):
        ffmpeg = p.ffmpeg_path()
        with TemporaryDirectory() as tmp:
            folder = Path(tmp)
            source = folder / "synthetic.wav"
            # Real generated tone, no speech or YouTube content. Cross a chunk boundary.
            p.run_command([ffmpeg, "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:sample_rate=16000",
                           "-t", "601", "-c:a", "pcm_s16le", str(source)])
            chunks = p.prepare_chunks(source, folder, ffmpeg)
            self.assertEqual(len(chunks), 2)
            self.assertEqual(chunks[0][1], 0)
            self.assertAlmostEqual(chunks[1][1], chunks[0][2], places=8)
            self.assertAlmostEqual(sum(c[2] for c in chunks), 601, delta=0.2)
            self.assertTrue(all(c[0].stat().st_size < 25_000_000 for c in chunks))


class SDKContractTests(unittest.TestCase):
    def test_real_sdk_serialization_and_structured_parsing_without_network(self):
        import httpx
        from openai import OpenAI
        seen = []
        def handler(request):
            seen.append(request)
            if request.url.path == "/v1/audio/transcriptions":
                return httpx.Response(200, json={"text": "삼성전자 실적 전망입니다.", "language": "korean", "duration": 3.0,
                    "segments": [{"id": 0, "seek": 0, "start": 0.0, "end": 3.0,
                                  "text": "삼성전자 실적 전망입니다.", "tokens": [], "temperature": 0,
                                  "avg_logprob": 0, "compression_ratio": 1, "no_speech_prob": 0}]})
            return httpx.Response(200, json={"id": "resp_test", "object": "response", "created_at": 0,
                "model": "gpt-4o-mini", "status": "completed", "parallel_tool_calls": False,
                "tool_choice": "auto", "tools": [], "output": [{"id": "msg_test", "type": "message",
                    "role": "assistant", "status": "completed", "content": [{"type": "output_text",
                    "annotations": [], "text": json.dumps({"mentioned_companies": ["삼성전자"],
                    "captions": [{"segment_index": 0, "caption": "실적 전망"}]}, ensure_ascii=False)}]}]})
        with OpenAI(api_key="test-only", http_client=httpx.Client(transport=httpx.MockTransport(handler))) as client, \
                TemporaryDirectory() as tmp:
            folder = Path(tmp)
            source = folder / "fixture.wav"
            source.write_bytes(b"synthetic; API transport is mocked")
            segments = p.transcribe(client, [(source, 0.0, 3.0)], folder, "ko")
            captions, companies = p.enrich(client, segments, ["삼성전자"], folder, "gpt-4o-mini")
            self.assertEqual((captions, companies), (["실적 전망"], ["삼성전자"]))
        self.assertIn(b'whisper-1', seen[0].content)
        self.assertIn(b'timestamp_granularities[]', seen[0].content)
        body = json.loads(seen[1].content)
        self.assertEqual(body["text"]["format"]["type"], "json_schema")
        self.assertTrue(body["text"]["format"]["strict"])


if __name__ == "__main__":
    unittest.main()
