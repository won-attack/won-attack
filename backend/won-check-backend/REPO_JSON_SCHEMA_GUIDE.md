# WON Check: GitHub data/ JSON schema integration

Source repository: https://github.com/won-check/won-check/tree/main/data

The backend **does not bundle or overwrite** the shared repository data. Copy the CONTENTS of this ZIP's `won-check-backend/` folder into the existing repository `backend/` folder. Keep `data/` unchanged.

## Actual source JSON shapes inspected (2026-10-27)

- `data/transcripts.json`: top-level object keyed by video ID (`WCdemoS1A01`, etc.), each entry has `video_id`, `title`, `transcript`, `segments`.
- `data/users.json`: top-level array of profiles with `user_id`, `holdings[]` entries `{company, weight_pct}`, `intent`, etc.
- `data/disclosures.json`: top-level array of `{id, document, metadata}`. `metadata` contains `company`, `period`, `source_title`, `source_url`, `metric`, `segment`, etc.
- `expected_results.json`: test expectations; **never use it as the actual verdict generator**.

## Main code changes

- `DataService`: reads `../data` by default; supports video ID keyed object and users array. The repository data is read at runtime, not duplicated in the ZIP.
- `DisclosureIngestionService`: maps disclosure `id`, `document`, and nested `metadata` into Chroma upserts.
- `ChromaRagService`: maps the same nested metadata when returning evidence in mock mode.
- `PersonalizationService`: computes Samsung concentration from `holdings[].company` and `weight_pct`.
- `ClaimService`: mock mode extracts actual transcript sentences instead of fixed unrelated claims. **This is a smoke-test approximation, not LLM extraction**.
- `VerificationService`: mock mode uses `INSUFFICIENT_EVIDENCE` rather than falsely asserting a real fact-check. Live mode requires OpenAI and populated Chroma.
- `CorsConfig`: allows React `http://localhost:5173` by default.
- `AnalyzeControllerTest`: uses minimal schema-shaped fixtures under `src/test/resources/repo-data/` and real sample video ID `WCdemoS1A01`.

## Running from the repository

Windows PowerShell:

```powershell
cd won-check/backend
.\gradlew.bat test
.\gradlew.bat bootRun
```

The working directory MUST be `won-check/backend` so `../data` resolves correctly. In IntelliJ, set the Run Configuration working directory to `.../won-check/backend` or set `WONCHECK_DATA_PATH` to the absolute path of `won-check/data`.

Smoke test:

```http
POST http://localhost:8080/api/analyze
Content-Type: application/json

{"video_url":"https://www.youtube.com/watch?v=WCdemoS1A01","user_id":"demo_user_01"}
```

Try `demo_user_02` and confirm that personalized commentary differs while verdict logic is unchanged. Mock verdicts are intentionally unverified. For actual verification, run `docker compose up -d`, set `OPENAI_API_KEY`, set `WONCHECK_MODE=live`, ingest disclosures using the ingestion endpoint documented in `README.md`, and call `/api/analyze`.

## A / B checks

A (API, LLM, profile): `DataService`, `ClaimService`, `VerificationService`, `PersonalizationService`, `AnalyzeController`, `CorsConfig`, `AnalyzeControllerTest`. Confirm video ID and user lookups, CORS, HTTP error codes, GPT claim extraction and actual response shape.

B (disclosures, embeddings, vector search): `DisclosureIngestionService`, `EmbeddingService`, `ChromaClient`, `ChromaRagService`, `RagService`, `docker-compose.yml`. Confirm actual disclosures count, collection `disclosures`, metadata, source URLs, embedding dimensions and relevant top-3 results.

## Important limitations

- Source JSON shape was inspected via public GitHub raw URLs; the original repository JSON files were **not copied into this ZIP**. At runtime the backend reads the team's latest checked-out `data/` files.
- The source's disclosure values and URLs have **not** been independently checked against issuer filings. B must verify before claiming a fact-check is grounded in official filings.
- Gradle tests could not run in the artifact-generation environment because the Gradle wrapper distribution was not cached and network resolution was blocked. Run them locally before PR.
- This package retains Spring Boot **3.5.7**, matching the supplied ZIP. Do not switch only the version number to Spring Boot 4.1.2 without adapting/testing dependencies.
