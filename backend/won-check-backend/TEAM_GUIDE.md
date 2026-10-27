# WON Check Backend — A/B responsibilities and verification

## Project layout

```text
won-check-backend/
├── build.gradle, settings.gradle, gradlew, gradlew.bat
├── docker-compose.yml             # Optional ChromaDB 1.0.20 (B)
├── README.md, TEAM_GUIDE.md
└── src/
    ├── main/java/com/woncheck/woncheckbackend/
    │   ├── WonCheckBackendApplication.java
    │   ├── api/AnalyzeController.java           # A
    │   ├── api/IngestionController.java         # B (dev-only)
    │   ├── config/HttpConfig.java               # Shared
    │   ├── dto/Models.java                      # Shared contract
    │   ├── exception/ApiException*.java        # A
    │   └── service/
    │       ├── AnalyzeService.java              # A
    │       ├── DataService.java                 # A
    │       ├── ClaimService.java                # A
    │       ├── OpenAiService.java               # A/B shared GPT/embedding transport
    │       ├── VerificationService.java         # A
    │       ├── PersonalizationService.java      # A
    │       ├── RagService.java                  # A/B contract
    │       ├── EmbeddingService.java            # B
    │       ├── ChromaClient.java                # B
    │       ├── ChromaRagService.java            # B
    │       └── DisclosureIngestionService.java  # B
    ├── main/resources/
    │   ├── application.properties
    │   └── data/{transcripts,users,disclosures}.json
    └── test/java/.../api/AnalyzeControllerTest.java # A
```

## A: API, claims, fact checking, personalization

- Inspect `AnalyzeController`, `AnalyzeService`, `DataService`, `ClaimService`, `VerificationService`, `PersonalizationService`, DTOs, exception handler.
- Check video whitelist lookup, invalid URL 400, unknown video/user 404, JSON field names, 2–3 claims, statuses and source references.
- Check GPT response parsing with `WONCHECK_MODE=live` and actual API key. Mock mode deliberately returns fixed claims/verdicts regardless of transcript: do not use it to judge GPT extraction quality.
- Compare two user IDs: verification statuses should match; personalized summary/risk factors should differ.
- `./gradlew test`, then call `POST /api/analyze` in Postman.

## B: embeddings, Chroma, disclosure ingestion, RAG

- Inspect `EmbeddingService`, `ChromaClient`, `ChromaRagService`, `DisclosureIngestionService`, `IngestionController`, `docker-compose.yml`, `disclosures.json`.
- **Critical:** Replace ALL synthetic disclosure excerpts with accurately checked primary-source passages, and add genuine `source_url` values. Current JSON is a 3-record placeholder, not the intended 10 verified paragraphs.
- Confirm `text-embedding-3-small` dimension 1536 and Chroma cosine collection `disclosures`.
- With real data and API key: run `docker compose up -d`; set `WONCHECK_MODE=live` and `WONCHECK_INGEST_ENABLED=true`; call `POST /api/admin/ingest`; verify count and retrieval Top 3 with actual relevant claims.
- Verify returned `document_id`, `text`, `title`, `period`, `source_url` match the original official evidence. Company/period filters are applied in Chroma `where` before Top K selection; period fallback and quarter ranges follow `data/check_db.py`.
- Verify Chroma API v2 against the team's local ChromaDB 1.x server. Docker is optional.
- `LLM_PROVIDER` selects chat only. Keep `EMBEDDING_PROVIDER=openai` and `EMBEDDING_MODEL=text-embedding-3-small` when querying the shared OpenAI-embedded collection, even with Ollama chat.

## Integration contract

```java
public interface RagService {
    List<EvidenceDto> search(String claim, String company, String period);
}
```

A must not change B's interface without coordination. B must not change DTO field meanings without coordination. Run `./gradlew test` after merges.

## Frontend request/response

Request: `POST /api/analyze` with `{ "video_url": "https://www.youtube.com/watch?v=DEMO1234567", "user_id": "demo_user_01" }`.

Response: `video`, `verification_results[]` (`claim_id`, `claim`, `claim_type`, `status`, `reason`, `sources[]`), `personalized_analysis` (`summary`, `risk_factors[]`), `analyzed_at`.

## Limitations

- Mock data and fixed verdicts are only integration fixtures; NOT real fact-checking.
- Official 2025 financial excerpts and URLs were not verified; ingestion intentionally blocks blank source URLs.
- Live OpenAI calls and Chroma Docker integration must be tested locally with credentials and network access.
- `POST /api/admin/ingest` must not be deployed on an internet-accessible server without authentication.
