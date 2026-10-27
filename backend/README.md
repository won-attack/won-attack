# backend

`POST /api/analyze` 서버 — Java 21 · Spring Boot 3.5.7 · Gradle. 로컬 실행 전용(배포·Docker 없음).

## 실행

```bash
# 터미널 1: ChromaDB 로컬 서버 (루트에서, 적재는 data/README 참고)
chroma run --path data/chroma_db --port 8000

# 터미널 2: 백엔드 (backend/ 폴더에서 실행해야 ../data 가 루트 data/ 를 가리킴)
cd backend
set OPENAI_API_KEY=sk-...          # macOS: export OPENAI_API_KEY=sk-...
set WONCHECK_MODE=live
gradlew.bat bootRun                # macOS: ./gradlew bootRun → http://localhost:8080
```

Spring Boot는 루트 `.env`를 자동으로 읽지 않습니다. 터미널에서 지정하거나 IntelliJ 실행 설정의 Environment variables에 넣으세요.

| 환경 변수 | 값 | 설명 |
|---|---|---|
| `OPENAI_API_KEY` | `sk-...` | 팀 키 (커밋 금지) |
| `WONCHECK_MODE` | `live` | `mock`은 응답 형식 확인용 — 판정이 전부 근거 부족으로 나옴. **시연은 live** |
| `OPENAI_CHAT_MODEL` | `gpt-4o-mini` (기본) | 주장 추출 · 판정 · 개인화 |
| `CHROMA_URL` | `http://localhost:8000` (기본) | ChromaDB 로컬 서버 |
| `WONCHECK_DATA_PATH` | `../data` (기본) | 실행 폴더 기준. IntelliJ 작업 폴더가 다르면 절대 경로로 |
| `PORT` | `8080` (기본) | 프론트 Vite 프록시가 이 포트로 보냄 |

## 처리 순서

1. URL에서 `video_id` 추출 → `data/transcripts.json` 조회 (없으면 404 `VIDEO_NOT_SUPPORTED`)
2. GPT로 검증할 주장 2~3개 추출 — `claim`, `claim_type`, **`companies`, `period`** 까지
   - 영상 게시일(`published_at`) 기준으로 "이번 3분기" 같은 상대 기간을 `2026-Q3`처럼 바꾼다
3. 회사명 정규화: `data/companies.json`의 `aliases` (하이닉스 → SK하이닉스, 현대차 → 현대자동차). 못 뽑았으면 `transcripts.json`의 `mentioned_companies`
4. 주장 임베딩(`text-embedding-3-small`) → ChromaDB `disclosures` 검색, **회사마다** Top 3
5. FINANCIAL 주장은 `data/financial_facts.json`의 같은 회사·기간 수치(조 원)를 근거와 함께 GPT에 주고 판정 → `status`
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
