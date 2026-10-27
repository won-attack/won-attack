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

## Local Ollama and OpenAI selection

`WONCHECK_MODE=mock` skips AI calls. For actual inference, use `WONCHECK_MODE=live`
and select `LLM_PROVIDER=ollama` (local testing) or `LLM_PROVIDER=openai` (demo).
This selection controls both chat and embedding calls.

For Ollama, run the local server, install a chat model and an embedding model,
and set these variables in the IntelliJ Run Configuration:

```text
WONCHECK_MODE=live
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_CHAT_MODEL=<installed-chat-model>
OLLAMA_EMBEDDING_MODEL=<installed-embedding-model>
CHROMA_COLLECTION=disclosures_ollama
WONCHECK_DATA_PATH=<absolute-path-to-repository-data>
```

Local Ollama does not require `OPENAI_API_KEY`; the OpenAI key is never sent to it.
For OpenAI, set `LLM_PROVIDER=openai`, `OPENAI_API_KEY`, and a separate collection
such as `CHROMA_COLLECTION=disclosures`. `OPENAI_CHAT_MODEL` overrides `LLM_MODEL`;
if neither is set, the chat model defaults to `gpt-4o-mini`.

Both providers require a running Chroma server and ingested disclosures for live
retrieval. Ingest into a separate collection when changing embedding models;
stored documents and queries must use the same embedding model. The base Ollama
URL must include `/v1`. A local `.env` in the backend process working directory
is loaded automatically as a Java properties file (`KEY=value`, without quotes).
IntelliJ/process environment variables override values in `.env`.
Use this backend project folder as the IntelliJ working directory; the local
`WONCHECK_DATA_PATH=../../data` then points to the shared repository data folder.

## Tests

```bash
./gradlew test
```

See `TEAM_GUIDE.md` for ownership and validation steps.
