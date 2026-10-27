# WON Check Backend MVP

Java 21 / Spring Boot 3.5.7 / Gradle Groovy / GPT API / ChromaDB

## Quick start (no API key)

### Local `.env` settings

Run from `backend/won-check-backend/`. Copy `.env.example` to `.env` if it
does not exist. Spring imports this file as Java properties; use `KEY=value`
without quotes or `export`, and forward slashes in paths. `.env` is ignored by Git.
The local defaults use `WONCHECK_MODE=mock`, a blank API key, and
`WONCHECK_DATA_PATH=../../data`. Mock mode does not call OpenAI or Chroma and
does not test actual embedding or ingestion.

Shell environment variables override `.env`. If you previously set
`WONCHECK_MODE=live` or other values in PowerShell, start a fresh PowerShell
without those variables or remove them before testing this file.

For local Chroma without Docker, keep this command running in another terminal:

```powershell
.\.venv\Scripts\chroma.exe run --host 127.0.0.1 --port 8000 --path .\chroma_db
```

Then use `gradlew.bat bootRun` in a separate terminal from the same backend
directory. A real API key, live mode, and ingestion enabled are required later
to ingest documents through `/api/admin/ingest`.

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

### Embedding provider

Python ingestion/search and Spring embeddings share `EMBEDDING_PROVIDER`:
`openai` (default) uses the team's `EMBEDDING_MODEL` and collection `disclosures`;
`ollama` uses `OLLAMA_BASE_URL`, `OLLAMA_EMBEDDING_MODEL`, and
`disclosures_ollama`. `CHROMA_COLLECTION` overrides the base name, with
`_ollama` appended automatically for Ollama. Restart Spring after changing `.env`.
Use the same model for ingestion and search; model changes require re-ingestion
into a matching collection. Local Ollama embeddings do not need an OpenAI key.
Claim extraction, verdicts, and personalized commentary still use OpenAI in live
mode; switching embeddings alone does not make `/api/analyze` work without a key.
`LLM_PROVIDER` and `OLLAMA_CHAT_MODEL` are reserved team settings and are not
consumed by this implementation. `EMBEDDING_PROVIDER` selects embeddings only.
`SEARCH_TOP_K` is currently documented as 3; Java search still returns at most 3
in code. This backend's example defaults to mock mode and disabled ingestion so
it can start without a real key. Enable live mode separately for full analysis.

```bash
./gradlew test
```

See `TEAM_GUIDE.md` for ownership and validation steps.
