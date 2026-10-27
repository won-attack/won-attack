# WON Check Backend MVP

Java 21 / Spring Boot 3.5.7 / Gradle Groovy / GPT API / ChromaDB

## Quick start (no API key)

```bash
./gradlew bootRun
```

Windows: `gradlew.bat bootRun`. Default `WONCHECK_MODE=mock`; GPT/Chroma calls are NOT made. Sample data and judgments are synthetic and not verified financial disclosures.

```bash
curl -X POST http://localhost:8080/api/analyze -H 'Content-Type: application/json' -d '{"video_url":"https://www.youtube.com/watch?v=DEMO1234567","user_id":"demo_user_01"}'
```

Switch `user_id` to `demo_user_02` to compare personalization.

## Live mode (requires real official disclosure verification first)

1. Replace sample `src/main/resources/data/disclosures.json` with **verified official excerpts**, each with a real HTTPS `source_url`. The current sample intentionally has blank URLs and cannot be ingested.
2. `docker compose up -d` (Chroma 0.6.3 API v1; use the pinned version).
3. Set environment variables `OPENAI_API_KEY`, `WONCHECK_MODE=live`, `WONCHECK_INGEST_ENABLED=true` (Spring property mapping `woncheck.ingest.enabled`), optionally `OPENAI_CHAT_MODEL`.
4. Start server and call `POST /api/admin/ingest` once (local development only; endpoint has no authentication). Turn ingestion off afterwards.
5. Call `POST /api/analyze` with a supported video ID. `transcripts.json` is a whitelist; no YouTube download occurs.

**Security:** `/api/admin/ingest` is for localhost development only; do not expose the endpoint publicly. No financial advice is given. Evidence is never fabricated if the source URL is absent. Mock verdicts are demonstration fixtures, not verified findings.

## Tests

```bash
./gradlew test
```

See `TEAM_GUIDE.md` for ownership and validation steps.
