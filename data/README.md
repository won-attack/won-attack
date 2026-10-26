# WON Check 시연 데이터 · 벡터 DB

팀 확정안(노션 「개발 방향」 → 사전 확정안 v1.0)의 규격을 따릅니다.
ChromaDB `PersistentClient` · 컬렉션 `disclosures` · OpenAI `text-embedding-3-small`(1536) · cosine · Top 3.

## 실행

```bash
pip install chromadb openai
set OPENAI_API_KEY=sk-...        # macOS/Linux: export OPENAI_API_KEY=sk-...
python data/init_db.py --reset        # chroma_db/ 생성 + 평가셋으로 근거 Top3 점검
python data/init_db.py --query "삼성전자 3분기 매출 200조 돌파" --period 2026-Q3
```

API 키 없이 경로만 시험: `python data/init_db.py --fake --reset` (해시 벡터라 검색 품질과 무관).
데이터를 고치면 `python data/build_data.py`로 JSON과 `scripts/`를 다시 만드세요.

## 파일

| 파일 | 내용 | 쓰는 쪽 |
|---|---|---|
| `disclosures.json` | 근거 문장 26개 (`id`, `document`, `metadata`) | `init_db.py` → ChromaDB |
| `financial_facts.json` | 분기·부문별 매출·영업이익 구조화 수치 | 백엔드 수치 계산 |
| `transcripts.json` | `video_id` → 제목·채널·대본·구간 | 백엔드 대본 조회 |
| `users.json` | 가상 사용자 5명(우리투자증권 5단계 성향) | 백엔드 개인화 |
| `expected_results.json` | 영상별 의도한 판정·기대 근거 | 리허설·평가용 (서버에 하드코딩 금지) |
| `scripts/*.md` | AI 영상 제작용 대본 6개 | 영상 제작 |
| `init_db.py` | 적재 + 검색 + 점검. `search()`는 백엔드 `rag.py`로 옮기면 됨 | 데이터·백엔드 |

## 근거 데이터 — 실제 수치, 공식 자료 대조 완료

확정안 6장의 후보 문장 10개(`samsung_001`~`010`)를 삼성전자 공식 자료와 대조했고 모두 일치했습니다.
여기에 2025년 3·4분기 부문별, 2026년 1·2분기 실적, 2026년 3분기 잠정실적을 더해 26개입니다.

| 기간 | 매출 | 영업이익 | 출처(공식) |
|---|---|---|---|
| 2024 연간 | 300.9조 | 32.7조 | [2025년 4분기 컨퍼런스콜 자료](https://images.samsung.com/kdp/ir/events/2025/2025_4Q_conference_kor.pdf) |
| 2025 연간 | 333.6조 | 43.6조 | 위와 같음 |
| 2025 3분기 | 86.1조 (DS 33.1 / DX 48.4) | 12.2조 (DS 7.0 / DX 3.5) | [2025년 3분기 실적 발표](https://news.samsung.com/kr/%ec%82%bc%ec%84%b1%ec%a0%84%ec%9e%90-2025%eb%85%84-3%eb%b6%84%ea%b8%b0-%ec%8b%a4%ec%a0%81-%eb%b0%9c%ed%91%9c) |
| 2025 4분기 | 93.8조 (DS 44.0 / DX 44.3) | 20.1조 (DS 16.4 / DX 1.3) | [2025년 4분기 실적 발표](https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-2025%EB%85%84-4%EB%B6%84%EA%B8%B0-%EC%8B%A4%EC%A0%81-%EB%B0%9C%ED%91%9C) |
| 2026 1분기 | 133.9조 (DS 81.7 / DX 52.7) | 57.2조 (DS 53.7 / DX 3.0) | [2026년 1분기 실적 발표](https://news.samsung.com/kr/%ec%82%bc%ec%84%b1%ec%a0%84%ec%9e%90-2026%eb%85%84-1%eb%b6%84%ea%b8%b0-%ec%8b%a4%ec%a0%81-%eb%b0%9c%ed%91%9c) |
| 2026 2분기 | 171.5조 (DS 127.5 / DX 48.0) | 89.5조 (DS 89.2 / DX △0.8) | [2026년 2분기 실적 발표](https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-2026%EB%85%84-2%EB%B6%84%EA%B8%B0-%EC%8B%A4%EC%A0%81-%EB%B0%9C%ED%91%9C) |
| 2026 3분기(잠정) | 195조 | 107.4조 | [2026년 3분기 잠정실적](https://news.samsungsemiconductor.com/kr/?p=37675) |

- 문장은 원문을 옮기지 않고 RAG용으로 정규화·요약했습니다. 숫자는 원문 그대로입니다.
- 모두 회사 실적 발표 자료라 `document_type`은 `공식 실적발표 자료`/`공식 잠정실적 발표`, `filing_id`는 빈 값입니다(확정안 5장 규칙). DART 원문으로 바꾸면 접수번호를 채우세요.
- 3분기 잠정실적은 `is_preliminary: true`. **10월 말 확정실적이 나오면 `samsung_024`~`026`을 갱신**해야 합니다.
- 메타데이터에 `segment`(전사·DS·DX·메모리), `metric`, `value`, `unit`, `is_preliminary`를 추가했습니다. ChromaDB는 `None`을 못 넣어서 값이 없으면 `has_value: false`로 표시합니다.

## 영상 6개 (시나리오별 2개, 영상당 검증 주장 3개)

| video_id | 시나리오 | 채널(가상) | 의도한 판정 |
|---|---|---|---|
| WCdemoS1A01 | S1 신규 검토 | 주식왕 데이빗 | 3Q 영업이익 107조 → 확인 · 매출 200조 돌파 → **불일치**(195조) · 주가 2배 → 예측 |
| WCdemoS1B02 | S1 신규 검토 | 반도체 읽어주는 연구원 | DS가 이익 대부분 → 확인 · DX 2Q 적자 → 확인 · HBM 점유율 1위 → **근거 부족** |
| WCdemoS2A03 | S2 추가 매수 | 부자되는 차트쌤 | 1Q > 작년 1년치 → 확인 · 분기마다 2배 → **불일치**(1.56배·1.20배) · 2028년까지 호황 → 예측 |
| WCdemoS2B04 | S2 추가 매수 | 실적으로 말하는 주식 | 작년 영업이익 43조 → 확인 · 전년 대비 10배 → **불일치**(8.8배) · 4Q 사상 최대 → 예측 |
| WCdemoS3A05 | S3 보유 점검 | 팩트폭격 주식 | 3Q 이익 감소 → **불일치**(+20%) · DX 올해 내내 적자 → **불일치**(1Q 흑자) · 메모리 폭락 → 예측 |
| WCdemoS3B06 | S3 리딩방 권유 | 시크릿 리딩 클럽 | 확정 영업이익 120조 → **불일치**(잠정 107.4조, 확정 전) · 작년 4Q 반도체 16조 → 확인 · 수익 보장 → 위험 신호 |

4가지 상태(SUPPORTED·CONTRADICTED·INSUFFICIENT_EVIDENCE·PREDICTION)가 모두 나옵니다.
`video_id`는 임시값입니다. 영상을 올린 뒤 실제 ID로 바꾸세요.

## 사용자 5명 (가상, 우리투자증권 5단계)

| user_id | 성향 | 시나리오 | 삼성전자 비중 | 이번 의도 |
|---|---|---|---|---|
| demo_user_01 | 공격투자형 | S2 | 60% (+반도체 ETF 25%) | 추가 매수 500만원 |
| demo_user_02 | 적극투자형 | S2 | 15% | 추가 매수 300만원 |
| demo_user_03 | 위험중립형 | S1 | 0% (반도체 ETF 20%) | 신규 매수 300만원 |
| demo_user_04 | 안정추구형 | S3 | 20% | 보유 점검 |
| demo_user_05 | 안정형 | S3 | 0% (예금·채권 100%) | 리딩방 권유로 신규 매수 1,000만원 검토 |

같은 영상을 두 사용자로 돌리면 공통 판정은 같고 개인화 설명만 달라야 합니다(S2: 01 vs 02, S3: 04 vs 05).

## 백엔드에 넘길 검색 규칙 (`init_db.py`의 `search()`)

1. 회사명 필터(`company`)는 항상 건다.
2. 기간이 확실하면(`2026-Q3`) 기간 필터를 걸고, 결과가 없으면 회사 필터로 다시 찾는다.
3. 여러 분기를 비교하는 주장(`2026-Q1~Q3`)은 **분기별로 1개씩** 근거를 모은다. 한 번에 Top 3를 찾으면 일부 분기가 빠진다.
4. 유사도는 판정이 아니다. 수치 비교는 `financial_facts.json`으로 코드에서 계산한다.

## 확인 상태

- API 키 없이 `--fake`로 적재·필터·평가 경로를 실행해 13/13 기대 근거가 Top 3에 들어오는 것을 확인했습니다. **실제 임베딩 품질은 API 키로 `python data/init_db.py --reset`을 한 번 돌려 확인하세요.**

