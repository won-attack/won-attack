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

1. Set `WONCHECK_DATA_PATH` to the shared repository `data/` directory containing `companies.json`, `transcripts.json`, `users.json`, and `disclosures.json`. Verify excerpts and source URLs before treating results as factual findings. Bundled resources are demonstration samples.
2. Run a local ChromaDB 1.x server: from the repository root, `chroma run --path data/chroma_db --port 8000`. Docker is optional (`docker compose up -d` uses ChromaDB 1.0.20).
3. Set environment variables `OPENAI_API_KEY`, `WONCHECK_MODE=live`, `WONCHECK_INGEST_ENABLED=true` (Spring property mapping `woncheck.ingest.enabled`), optionally `OPENAI_CHAT_MODEL`.
4. If disclosures were already loaded with `python data/init_db.py --server`, reuse that collection without re-ingestion. Otherwise start the server and call `POST /api/admin/ingest` once (local development only; endpoint has no authentication). Turn ingestion off afterwards.
5. Call `POST /api/analyze` with a supported video ID. `transcripts.json` is a whitelist; no YouTube download occurs.

**Security:** `/api/admin/ingest` is for localhost development only; do not expose the endpoint publicly. No financial advice is given. Evidence is never fabricated if the source URL is absent. Mock verdicts are demonstration fixtures, not verified findings.

## Local Ollama and OpenAI selection

`WONCHECK_MODE=mock` skips AI calls. For actual inference, use `WONCHECK_MODE=live`
and select `LLM_PROVIDER=ollama` (local testing) or `LLM_PROVIDER=openai` (demo).
`LLM_PROVIDER` controls chat only. `EMBEDDING_PROVIDER` independently selects the
embedding service and defaults to `openai`. Changing the chat model must not
change the embeddings used to query an existing collection.

For Ollama chat with the team's existing OpenAI-embedded database, run Ollama,
install a chat model, and set these variables in the IntelliJ Run Configuration
or the local backend `.env`:

```text
WONCHECK_MODE=live
LLM_PROVIDER=ollama
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
OPENAI_API_KEY=<key-for-embedding-requests>
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_CHAT_MODEL=<installed-chat-model>
CHROMA_COLLECTION=disclosures
WONCHECK_DATA_PATH=<absolute-path-to-repository-data>
```

Local Ollama chat does not require an API key; the OpenAI key is never sent to it.
OpenAI embeddings still require `OPENAI_API_KEY`, even with Ollama chat.
For OpenAI chat, change only `LLM_PROVIDER=openai` and set `OPENAI_API_KEY`.
Keep the same embedding configuration and collection. `OPENAI_CHAT_MODEL` overrides `LLM_MODEL`;
if neither is set, the chat model defaults to `gpt-4o-mini`.

Both providers require a running Chroma server and ingested disclosures for live
retrieval. To run embeddings locally too, explicitly set `EMBEDDING_PROVIDER=ollama`,
`OLLAMA_EMBEDDING_MODEL=<installed-model>`, and a separate collection such as
`CHROMA_COLLECTION=disclosures_ollama`. Ingest into that collection using the same
provider and model; never use Ollama embeddings to query OpenAI-embedded records.
Ingest into a separate collection when changing embedding models;
stored documents and queries must use the same embedding model. The base Ollama
URL must include `/v1`. A local `.env` in the backend process working directory
is loaded automatically as a Java properties file (`KEY=value`, without quotes).
IntelliJ/process environment variables override values in `.env`.
Use this backend project folder as the IntelliJ working directory; the local
`WONCHECK_DATA_PATH=../../data` then points to the shared repository data folder.

## Company and period retrieval

Claims include an internal `companies` list and optional `period`. Company names
are normalized with the shared `companies.json` aliases. Comparison claims search
each company separately; an unknown company returns insufficient evidence rather
than defaulting to Samsung.

ChromaDB uses `/api/v2/tenants/{tenant}/databases/{database}/collections`, with
`CHROMA_TENANT=default_tenant` and `CHROMA_DATABASE=default_database` by default.
Company and period filters are sent in `where` before selecting results.
`SEARCH_TOP_K` defaults to 3 per company. Retrieval follows `data/check_db.py`:
try company + period, then company only if empty. A same-year range such as
`2026-Q1~Q3` retrieves one document per quarter (up to four for a full-year range).
Mock retrieval applies the same metadata filters to local JSON without AI calls.

## Tests

```bash
./gradlew test
```

See `TEAM_GUIDE.md` for ownership and validation steps.
