# backend

`POST /api/analyze` 서버 — Java 21 · Spring Boot 3.5.7 · Gradle. 로컬 실행 전용(배포·Docker 없음).

## 실행

시연은 루트의 `start-demo.bat`(macOS `./start-demo.sh`)로 한 번에 띄우는 게 기본입니다. 직접 실행할 때는 아래 순서를 따릅니다.

```bash
# 터미널 1: ChromaDB 로컬 서버 (루트에서, 적재는 data/README 참고)
chroma run --path data/chroma_db --port 8000

# 터미널 2: 백엔드 (gradlew가 있는 backend/won-check-backend/ 에서 실행)
cd backend/won-check-backend
set OPENAI_API_KEY=sk-...          # macOS: export OPENAI_API_KEY=sk-...
set WONCHECK_MODE=live
set WONCHECK_DATA_PATH=../../data
gradlew.bat bootRun                # macOS: ./gradlew bootRun → http://localhost:8080
```

백엔드는 루트 `.env`를 읽지 않고, 실행 폴더(`backend/won-check-backend/`)의 `.env`만 읽습니다. 그 폴더의 `.env.example`을 복사해 쓰거나, 터미널·IntelliJ 실행 설정의 Environment variables에 넣으세요. 터미널 환경 변수가 `.env`보다 우선합니다.

| 환경 변수 | 값 | 설명 |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | 팀 키 (커밋 금지). Ollama를 써도 임베딩에 필요 |
| `WONCHECK_MODE` | `live` | `mock`은 응답 형식 확인용 — 판정이 전부 근거 부족으로 나옴. **시연은 live** |
| `LLM_PROVIDER` | `openai` (기본) / `ollama` | 주장 추출 · 판정 · 개인화에 쓸 대화 모델 |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` (기본) | OpenAI 대화 모델 |
| `OLLAMA_BASE_URL` · `OLLAMA_CHAT_MODEL` | `http://localhost:11434/v1` · 설치한 모델 | `LLM_PROVIDER=ollama`일 때. 모델 이름은 꼭 채우기 |
| `EMBEDDING_PROVIDER` | `openai` (기본) | 적재(`data/init_db.py`)와 같은 값. `ollama`면 컬렉션 이름에 `_ollama`가 붙음 |
| `CHROMA_URL` | `http://localhost:8000` (기본) | ChromaDB 로컬 서버 |
| `WONCHECK_DATA_PATH` | `../../data` | 실행 폴더 기준 루트 `data/`. 기본값 `../data`는 이 폴더 구조와 맞지 않으니 꼭 지정 |
| `PORT` | `8080` | 프론트 Vite 프록시가 이 포트로 보냄. 폴더의 `.env.example`은 `8081`이라 바꿔야 함 |

## 처리 순서

1. URL에서 `video_id` 추출 → `data/youtube_transcripts.json`, 없으면 `data/transcripts.json` 조회 (둘 다 없으면 404 `VIDEO_NOT_SUPPORTED`)
2. 대화 모델로 검증할 주장 2~3개 추출 — `claim`, `claim_type`, **`companies`, `period`** 까지
   - 영상 게시일(`published_at`) 기준으로 "이번 3분기" 같은 상대 기간을 `2026-Q3`처럼 바꾼다
3. 회사명 정규화: `data/companies.json`의 `aliases` (하이닉스 → SK하이닉스, 현대차 → 현대자동차). 못 뽑았으면 `transcripts.json`의 `mentioned_companies`
4. 주장 임베딩(`text-embedding-3-small`) → ChromaDB `disclosures` 검색, **회사마다** Top 3
5. 검색된 공시 근거만 주고 대화 모델이 주장과 대조해 판정 → `status` (유사도는 판정이 아님. `data/financial_facts.json`은 데이터 검수용이며 서버는 읽지 않음)
6. 공통 판정을 고정한 뒤 `data/users.json` 프로필(보유 비중 · 투자 성향 · 이번 의도)로 개인화 설명
7. `docs/api/analyze_response.json` 형식으로 응답 (실패 시 500 `ANALYSIS_FAILED`)

## ChromaDB 연동 규칙

- **적재는 데이터 쪽 `data/init_db.py`가 한다.** 백엔드 적재 API(`/api/admin/ingest`)는 꺼 둔다 — 실행하면 메타데이터(접수번호 등)가 덮어써진다.
- ChromaDB 1.x 로컬 서버는 **v2 API만** 지원한다. 경로:
  `{CHROMA_URL}/api/v2/tenants/default_tenant/databases/default_database/collections` (생성·조회는 `name: "disclosures"`, `get_or_create: true`), 이후 `/{collection_id}/query`, `/count`
- 회사·기간 필터는 **검색 요청의 `where`** 에 넣는다 (가져온 뒤 Java에서 거르면 결과가 3개 미만이 될 수 있음).
  - 기간이 확실하면 `{"$and":[{"company":"SK하이닉스"},{"period":"2026-Q2"}]}`, 결과가 없으면 `{"company":"SK하이닉스"}`로 다시 검색
  - 여러 분기 비교(`2026-Q1~Q3`)는 분기마다 `n_results: 1`로 따로 검색
  - 기준 구현: `data/check_db.py`의 `search()` (실제 임베딩으로 7/7 검증)
- 메타데이터 키: `company` · `period` · `title`(= `source_title`) · `source_url` · `filing_id` · `metric` · `segment` · `is_preliminary` 등

## 규칙

- 정답(`data/expected_results.json`)을 서버에 하드코딩하지 않는다 — 리허설 비교용
- 근거가 없으면 `sources: []`, 출처 URL은 실제로 사용한 근거만
- 매수·매도 지시, 수익 보장 문구를 만들지 않는다
- `src/main/resources/data/*.json` 샘플이 아니라 루트 `data/`를 읽는다 (`allow-sample-fallback=false`)
