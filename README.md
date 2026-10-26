# WON Check

> 유튜브 투자 영상의 주장을 **공식 실적 자료로 검증**하고, **내 포트폴리오 기준의 위험**을 알려주는 서비스
> 우리WON 청년 IT 아카데미 · AX 해커톤 · B반 4팀

## 문제

유튜브·SNS 투자 콘텐츠(핀플루언서)를 보고 종목을 사는 투자자가 늘고 있지만, 영상 속 수치가 맞는지 확인하려면
공시와 실적 자료를 직접 찾아 비교해야 합니다. 사실·의견·전망이 섞여 있고, 같은 추천이 모든 시청자에게 똑같이 전달됩니다.

## 해결

1. 영상의 주장을 **검증 가능한 단위로 추출**하고 사실·전망을 구분합니다.
2. 주장마다 **공식 자료 근거를 검색(RAG)** 해 일치·불일치·근거 부족을 판정하고 출처를 붙입니다.
3. 공통 판정은 그대로 두고, **사용자의 보유 비중·투자 성향**에 맞춘 위험 설명을 더합니다.

추천이 아니라 검증입니다. 매수·매도를 지시하거나 수익을 보장하지 않습니다.

## 아키텍처

![WON Check 시스템 아키텍처](docs/architecture.png)

```
유튜브 URL → 사전 준비 대본 조회 → LLM 주장 추출 → 주장 임베딩 → ChromaDB 근거 검색(Top 3)
→ 근거 기반 공통 검증 → 사용자 포트폴리오 기반 개인화 → JSON → 결과 카드
```

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React (시연용 유튜브 화면 · 공유 모달 · WON MTS 결과 화면) |
| 백엔드 | 미확정 — 확정 후 기입 |
| LLM · 임베딩 | OpenAI API · `text-embedding-3-small` (1536) |
| 벡터 DB | ChromaDB `PersistentClient` · 컬렉션 `disclosures` · cosine |
| 데이터 | 삼성전자 공식 실적 발표 자료(2024~2026년 3분기 잠정) 기반 근거 문장 26개 |

## 폴더 구조

```
won-check/
├── README.md
├── .env.example          # 복사해서 .env 생성 (커밋 금지)
├── docs/
│   ├── architecture.png
│   └── api/              # 프론트·백엔드 공통 API 계약
│       ├── analyze_request.json
│       ├── analyze_response.json
│       └── analyze_error.json
├── frontend/             # 프론트 담당
├── backend/              # 백엔드 담당
└── data/                 # 데이터·벡터 DB 담당
    ├── disclosures.json      # 근거 문장 26개 + 메타데이터
    ├── financial_facts.json  # 분기·부문별 수치(코드 계산용)
    ├── transcripts.json      # video_id별 시연 대본 6개
    ├── users.json            # 가상 사용자 5명
    ├── expected_results.json # 리허설용 기대 판정(서버에 하드코딩 금지)
    ├── scripts/              # 영상 제작용 대본
    ├── build_data.py         # 위 JSON 재생성
    └── init_db.py            # 임베딩 → ChromaDB 적재 → 검색 점검
```

## 실행 방법

```bash
# 0) 환경 변수
cp .env.example .env            # Windows: copy .env.example .env  → OPENAI_API_KEY 입력

# 1) 벡터 DB 구축 (시연 전 1회)
pip install chromadb openai
python data/init_db.py --reset  # data/chroma_db 생성 + 근거 Top3 점검

# 2) 백엔드 실행
#    (백엔드 담당이 확정 후 작성)

# 3) 프론트엔드 실행
#    (프론트 담당이 확정 후 작성)
```

## API

`POST /api/analyze` — 동기식 JSON 응답. 형식은 `docs/api/`의 예시 파일이 기준입니다.

| 항목 | 값 |
|---|---|
| 요청 | `{ "video_url": "...", "user_id": "demo_user_01" }` |
| `claim_type` | `FINANCIAL` · `DISCLOSURE` · `PREDICTION` |
| `status` | `SUPPORTED` · `CONTRADICTED` · `INSUFFICIENT_EVIDENCE` · `PREDICTION` |
| 오류 | 400 `INVALID_VIDEO_URL` · 404 `VIDEO_NOT_SUPPORTED` · 404 `USER_NOT_FOUND` · 500 `ANALYSIS_FAILED` |

근거가 없으면 `sources: []`를 반환하고 근거를 만들어내지 않습니다.
`analyze_response.json`의 개인화 문구는 형식 예시이며 실제 결과는 LLM이 생성합니다.

## 시연 시나리오

| 시나리오 | 영상 | 사용자 | 보여줄 것 |
|---|---|---|---|
| S1 신규 투자 검토 | `WCdemoS1A01`, `WCdemoS1B02` | `demo_user_03` 위험중립형 | 과장 채널 vs 정확한 채널, 근거 부족 판정 |
| S2 추가 매수 검토 | `WCdemoS2A03`, `WCdemoS2B04` | `demo_user_01` 공격투자형 / `demo_user_02` 적극투자형 | 같은 판정, 다른 개인화(삼성전자 비중 60% vs 15%) |
| S3 보유 점검 · 리딩방 | `WCdemoS3A05`, `WCdemoS3B06` | `demo_user_04` 안정추구형 / `demo_user_05` 안정형 | 부정 과장 영상, 리딩방 위험 신호 |

자세한 대본과 기대 판정은 `data/scripts/`, `data/expected_results.json`을 보세요.

## 데이터 출처와 고지

- 근거 수치는 삼성전자 공식 실적 발표 자료와 대조했습니다. 출처 URL은 `data/disclosures.json`에 문장별로 있습니다.
- 2026년 3분기 수치는 **잠정 실적**입니다. 확정 실적 발표 후 갱신이 필요합니다.
- 시연 영상·채널·사용자는 모두 **시연용 가상 데이터**이며 실제 인물·채널과 무관합니다.
- 공유 화면은 웹 시뮬레이션이고, 분석(LLM·임베딩·벡터 검색)은 실제로 동작합니다.

## 기여

브랜치·커밋·PR 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다. 커밋 메시지는 `종류(범위): 요약` 형식입니다.

## 팀

| 역할 | 담당 |
|---|---|
| 기획 · 발표 |  |
| 프론트엔드 |  |
| 백엔드 |  |
| 데이터 · 벡터 DB |  |
