# backend

`POST /api/analyze` 서버. 언어·프레임워크는 팀 확정 후 기입.

처리 순서(팀 확정안 9장)
1. URL에서 `video_id` 추출 (시연 영상 3개: `WCdemoS1V01`, `WCdemoS2V02`, `WCdemoS3V03`) → `data/transcripts.json` 조회 (없으면 404 `VIDEO_NOT_SUPPORTED`)
2. LLM으로 검증 가능한 주장 2~3개 추출 · `claim_type` 분류 (대본 전체는 임베딩하지 않음)
3. 주장 임베딩 → ChromaDB `disclosures` 검색 (회사 필터 → 기간 필터 → Top 3)
   - 회사명은 `data/companies.json`의 `aliases`로 정규화(현대차 → 현대자동차). 회사가 둘 이상이면 회사마다 검색(`search_claim()`)
   - 여러 분기 비교 주장은 분기별로 1개씩 근거 수집 — `data/init_db.py`의 `search()` 참고
4. 수치는 `data/financial_facts.json`으로 코드 계산, LLM은 근거 대조·설명 → `status`
5. 공통 판정을 고정한 뒤 `data/users.json` 프로필로 개인화 위험 설명 생성
6. `docs/api/analyze_response.json` 형식으로 응답 (JSON 형식 검증, 실패 시 500 `ANALYSIS_FAILED`)

규칙
- 정답(`data/expected_results.json`)을 서버에 하드코딩하지 않는다
- 근거가 없으면 `sources: []`, 출처 URL은 실제로 사용한 근거만
- 매수·매도 지시, 수익 보장 문구를 만들지 않는다
- 환경 변수는 루트 `.env` (`OPENAI_API_KEY`, `LLM_MODEL`, `EMBEDDING_MODEL`, `CHROMA_PATH`)
