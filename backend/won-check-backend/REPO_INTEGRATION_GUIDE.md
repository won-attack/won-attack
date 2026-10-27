# WON Check repository integration (A/B checklist)

## Important
This ZIP was adapted from the uploaded backend project. The remote GitHub repository JSON files could not be retrieved in this environment. Therefore **the actual `data/*.json` schema and live API behavior are NOT verified**. Do not merge before A/B validation against the current repository files.

## Copy to monorepo
1. `git clone https://github.com/won-check/won-check.git`
2. `cd won-check && git switch -c feat/backend-json-integration`
3. Copy **the contents** of this ZIP's `won-check-backend/` directory into `won-check/backend/` (not into `backend/won-check-backend/`).
4. Keep the repository's existing `data/` unchanged. Do not copy the ZIP's `src/main/resources/data/*.json` over it; those are **unverified mock samples**.
5. Run commands from `won-check/backend/` so `../data` points at the repository root's `data/`.

## Configuration
- `WONCHECK_DATA_PATH=../data` (default, relative to the backend process working directory)
- `WONCHECK_ALLOW_SAMPLE_FALLBACK=false` (default; missing external JSON fails explicitly)
- `WONCHECK_MODE=mock` for API shape testing; `live` requires OpenAI and ChromaDB.
- `OPENAI_API_KEY=...` for live mode; never commit keys.
- IntelliJ Run Configuration: **Working directory** = `.../won-check/backend`, or set `WONCHECK_DATA_PATH` to an absolute path.

## JSON compatibility supported in DataService
- `transcripts.json`: object keyed by video ID; array; or array under `videos`, `transcripts`, `data`; ID keys `video_id`, `id`, `youtube_id`; transcript keys `transcript`, `transcript_text`, `script`, `content`, `text`; `segments[].text` supported.
- `users.json`: object keyed by user ID; array; or array under `users`, `profiles`, `data`; ID keys `user_id`, `id`.
- `disclosures.json`: currently ingestion expects an **array** of objects containing `document_id`, `company`, `title`, `period`, `text`, `source_url`. B MUST compare this schema with the repository's real JSON and adapt `DisclosureIngestionService` if different.
- `financial_facts.json` and `expected_results.json`: not consumed by this backend yet. Do not assume they are integrated.

## A verification
1. Confirm actual video/user IDs and transcript field names in repository `data/`.
2. `./gradlew test` (Windows: `gradlew.bat test`), then `./gradlew bootRun`.
3. POST `/api/analyze` with a real video ID and user ID from the repository JSON.
4. Test unknown video => `VIDEO_NOT_SUPPORTED`, unknown user => `USER_NOT_FOUND`.
5. Validate response shape against `docs/api/` and the React frontend.
6. Mock mode returns **hard-coded claims**; it does not validate the transcript content. Test `live` separately.
7. Add frontend origin to CORS configuration or a dev proxy if needed. CORS is not automatically configured by pushing to GitHub.

## B verification
1. Inspect real `data/disclosures.json` schema and official source URLs. Do not invent links.
2. Align Python `data/init_db.py` with Spring Boot's Chroma HTTP collection/embedding setup. Do not assume they share the same database by default.
3. Run Chroma, ingest disclosures, confirm count and top-3 similarity search.
4. Test GPT fact verdicts against the real retrieved evidence; semantic similarity alone does not prove factual truth.
5. Confirm OpenAI embedding model `text-embedding-3-small` is used consistently.

## Push and PR
From the repository root:
```bash
git status
git add backend/
git commit -m "feat(backend): connect API to repository JSON data"
git push -u origin feat/backend-json-integration
```
Open a Pull Request. Merge only after A/B validation and review. A push/PR alone **does not deploy the API** or connect React automatically: run Spring Boot at a reachable URL and configure the frontend's API base URL and CORS/proxy.
