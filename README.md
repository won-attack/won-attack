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

배포 없이 **노트북 한 대에서 로컬로 실행**합니다. Docker·Supabase는 쓰지 않습니다.

| 구성 | 주소 | 역할 |
|---|---|---|
| 프론트엔드 (React + Vite) | `http://localhost:5173` | 유튜브 화면 · 공유 모달 · WON MTS 결과 화면. `/api` 요청을 백엔드로 프록시 |
| 백엔드 (Spring Boot) | `http://localhost:8080` | `POST /api/analyze` — 주장 추출 → 근거 검색 → 사실 검증 → 개인화 |
| ChromaDB (로컬 서버) | `http://localhost:8000` | 공시 근거 문장 임베딩 저장 · 유사도 검색(Top 3). 데이터는 `data/chroma_db/` |
| OpenAI API | — | GPT(주장 추출 · 사실 판단 · 개인화 설명), `text-embedding-3-small`(임베딩) |

**분석 흐름** (그림의 번호)

1. 프론트가 유튜브 URL과 사용자 ID로 분석을 요청합니다.
2. 백엔드가 `data/transcripts.json`에서 사전 준비 대본을 찾고, GPT로 검증할 주장 2~3개를 뽑습니다.
3. 주장 문장을 `text-embedding-3-small`로 임베딩합니다.
4. 공시 근거 문장은 **시연 전에 미리** ChromaDB에 적재해 둡니다(`data/init_db.py`, 데이터 담당).
5. 백엔드가 ChromaDB에서 **회사 → 기간 필터**를 건 뒤 비슷한 근거 Top 3를 찾습니다.
6. `data/*.json`(대본 · 사용자 · 회사 별칭 · 재무 수치)은 백엔드가 파일로 직접 읽습니다.
7. GPT가 근거와 수치를 대조해 판정하고, 사용자 포트폴리오·투자 성향에 맞춘 위험 설명을 만듭니다.
8. 주장별 판정 · 근거 출처 · 개인화 설명을 JSON으로 돌려주고 프론트가 카드로 보여줍니다.

공통 판정은 사용자와 무관하게 같고, 개인화 설명만 사용자마다 달라집니다. 유사도는 판정이 아니며, 수치 비교는 `data/financial_facts.json` 기준입니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | React · Vite · TypeScript |
| 백엔드 | Java 21 · Spring Boot 3.5.7 · Gradle |
| LLM | OpenAI GPT-4o 계열 (`OPENAI_CHAT_MODEL`, 기본값 `gpt-4o-mini`) |
| 임베딩 | OpenAI `text-embedding-3-small` (1536차원) — 적재·검색에 같은 모델 |
| 벡터 DB | ChromaDB 로컬 서버(`chroma run`) · 컬렉션 `disclosures` · cosine |
| 데이터 | 5개 기업(삼성전자·SK하이닉스·현대자동차·네이버·카카오) DART 공시·회사 공식 실적 자료 기반 근거 문장 48개 |
| 실행 환경 | 로컬(Windows · macOS), 배포 없음 · Docker 미사용 |

## 폴더 구조

```
won-check/
├── README.md
├── pipeline.py               # YouTube 음성 → Whisper → 구조화 JSON
├── video_inputs.json         # 처리할 영상 URL
├── requirements-transcription.txt # 영상 전사 도구 전용 의존성
├── tests/test_youtube_pipeline.py # 영상 전사 오프라인 테스트
├── .env.example          # 복사해서 .env 생성 (커밋 금지)
├── start-demo.bat        # Windows 시연 한 번에 실행 (stop-demo.bat으로 종료)
├── start-demo.sh         # macOS 시연 한 번에 실행 (stop-demo.sh로 종료)
├── docs/
│   ├── architecture.png
│   └── api/              # 프론트·백엔드 공통 API 계약
├── frontend/             # React + Vite
├── backend/              # Spring Boot
└── data/                 # 데이터 · 벡터 DB
    ├── companies.json        # 기업 5곳 · DART 고유번호 · 회사명 별칭
    ├── disclosures.json      # 근거 문장 48개 + 메타데이터 (→ ChromaDB)
    ├── financial_facts.json  # 분기별 매출·영업이익 (수치 비교용)
    ├── transcripts.json      # video_id별 시연 대본 3개 (보존)
    ├── youtube_transcripts.json # 실제 영상 전사 결과 (pipeline.py로 생성)
    ├── users.json            # 가상 사용자 5명
    ├── expected_results.json # 리허설용 기대 판정 (서버에 하드코딩 금지)
    ├── scripts/              # 영상 제작용 대본
    ├── raw/dart/             # 근거로 쓴 DART 공시 원문
    ├── tools/fetch_dart.py   # OpenDART 수집
    ├── build_data.py         # 위 JSON 재생성
    ├── init_db.py            # 임베딩 → ChromaDB 적재
    ├── check_db.py           # 적재된 DB가 시연 주장의 근거를 찾는지 점검
    └── requirements.txt      # chromadb · openai
```

## 실행 방법 (로컬)

필요한 것: Python 3.10+, Java 21, Node.js 18+, OpenAI API 키

### 한 번에 실행 (권장)

루트 `.env`에 `OPENAI_API_KEY`를 넣은 뒤 실행 파일 하나로 시연 환경 전체를 띄웁니다.

| 파일 | 쓰는 법 |
|---|---|
| `start-demo.bat` | Windows. 더블클릭 → ChromaDB · 백엔드 · 프론트 창 3개가 열림. 근거 DB 다시 적재: `start-demo.bat reset` |
| `stop-demo.bat` | Windows. 더블클릭 → 위 창 3개를 한 번에 종료 |
| `start-demo.sh` | macOS. `./start-demo.sh` (다시 적재: `./start-demo.sh reset`) → 한 터미널에서 실행, `Ctrl+C`로 모두 종료, 로그는 `logs/` |
| `stop-demo.sh` | macOS. 터미널을 그냥 닫았거나 포트가 남아 있을 때 `./stop-demo.sh` → 8000·8080·5173 포트 프로세스 종료 |

실행 순서

1. `.env`의 키를 읽고 Python · Node.js · Java 설치 여부를 확인합니다. chromadb·openai가 없으면 `data/requirements.txt`로 설치합니다.
2. 근거 DB(`data/chroma_db`)가 없거나 `reset`을 붙였을 때만 `init_db.py`로 적재합니다.
3. ChromaDB 서버를 켭니다 (`:8000`).
4. `check_db.py --server`로 근거 검색을 점검합니다. **7/7이 아니면 여기서 멈춥니다** — 데이터 문제를 백엔드보다 먼저 잡기 위해서입니다.
5. 백엔드를 켭니다 (`:8080`, `WONCHECK_MODE=live`, 데이터 경로·ChromaDB 주소 자동 지정). 백엔드 폴더는 `backend/` 또는 `backend/won-check-backend/`를 자동으로 찾습니다.
6. 프론트를 켭니다 (`:5173`, `VITE_USE_MOCK=false`). `node_modules`가 없으면 `npm install`부터 합니다.
7. 백엔드가 뜨면 브라우저로 `http://localhost:5173`을 엽니다.

문제가 생기면

| 증상 | 확인할 것 |
|---|---|
| "백엔드 코드(gradlew)가 없습니다" | 백엔드 브랜치가 main에 합쳐졌는지, `git pull` 했는지 |
| 4단계 점검 실패 | 데이터 쪽 문제 → `start-demo.bat reset`으로 다시 적재 |
| 화면에서 판정이 이상함 | 점검(7/7)은 통과했으니 백엔드 쪽(회사명 추출·검색 필터)을 확인 |
| 포트가 이미 사용 중 | `stop-demo.bat`(macOS `./stop-demo.sh`)으로 이전 실행을 끄고 다시 실행 |

### 직접 실행할 때

```bash
# 0) 환경 변수
copy .env.example .env                         # macOS: cp .env.example .env → OPENAI_API_KEY 입력
pip install -r data/requirements.txt

# 1) 벡터 DB 적재 (시연 전 1회, 데이터가 바뀔 때만 다시)
python data/init_db.py --reset                 # data/chroma_db 에 근거 48문장 적재
python data/check_db.py                        # 근거 검색 점검 → 7/7이면 정상

# 2) ChromaDB 서버 켜기 (터미널 1, 켜 둔 채로)
chroma run --path data/chroma_db --port 8000

# 3) 백엔드 (터미널 2) — 환경 변수: OPENAI_API_KEY, WONCHECK_MODE=live
cd backend && gradlew.bat bootRun              # macOS: ./gradlew bootRun → http://localhost:8080

# 4) 프론트엔드 (터미널 3)
cd frontend && npm install && npm run dev      # http://localhost:5173
```

- 1)은 ChromaDB 서버가 **꺼진 상태**에서 실행합니다. 서버가 켜져 있으면 `python data/init_db.py --server --reset`로 서버에 바로 적재하고 `python data/check_db.py --server`로 점검합니다.
- Spring Boot는 `.env`를 자동으로 읽지 않습니다. 터미널이나 IntelliJ 실행 설정(Environment variables)에 `OPENAI_API_KEY`, `WONCHECK_MODE=live`를 넣으세요. 자세한 내용은 [backend/README.md](backend/README.md).
- 프론트는 기본이 목업 응답입니다. 실제 백엔드를 쓰려면 `frontend/.env`에 `VITE_USE_MOCK=false`.

## 실제 YouTube 영상 전사

루트 `.env`의 `OPENAI_API_KEY`를 사용합니다. 기존 `data/transcripts.json`은 보존하고, 실제 영상 결과는 별도 `data/youtube_transcripts.json`에 저장합니다.

```bash
python -m pip install -r requirements-transcription.txt
python pipeline.py
python -m unittest discover -s tests -p 'test_youtube_pipeline.py' -v
```

입력은 `video_inputs.json`이며 요청 영상 `48WVf1ijerc`가 등록되어 있습니다. 결과 파일이 이미 있으면 덮어쓰지 않고 중단합니다. 재실행은 `python pipeline.py --output data/youtube_transcripts_02.json`처럼 새 파일명을 지정하세요. 다운로드 음성과 API 중간 자료는 Git에서 제외한 `runs/`에 보관합니다.

`caption`은 화면 OCR이 아닌 음성 요약입니다. 현재 백엔드 계약은 여전히 `data/transcripts.json`을 읽습니다. 새 파일을 분석에 사용하려면 백엔드의 대본 조회가 `data/youtube_transcripts.json`도 읽도록 후속 연동해야 합니다. 해당 조회 연동은 백엔드 담당 팀원이 별도로 진행합니다.

설치·처리 방식·검증 범위는 [영상 전사 안내](docs/youtube-pipeline.md)를 참고하세요.

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
| S1 신규 투자 검토 | `WCdemoS1V01` 삼성전자 | `demo_user_03` 위험중립형 | 확인 · 불일치(매출 200조) · 예측 |
| S2 추가 매수 검토 | `WCdemoS2V02` SK하이닉스 | `demo_user_01` 공격투자형 / `demo_user_02` 적극투자형 | 미발표 실적은 **근거 부족**, 같은 판정 · 다른 개인화(반도체 비중 80% vs 10%) |
| S3 보유 점검 | `WCdemoS3V03` 현대자동차 | `demo_user_04` 안정추구형(보유) / `demo_user_05` 안정형(미보유) | 부정 과장 영상: 감소는 맞지만 적자는 아님 |

영상은 기업별 1개(삼성전자·SK하이닉스·현대자동차)입니다. 네이버·카카오는 사용자 보유 종목과 회사 필터 확인용 근거만 들어 있습니다.

자세한 대본과 기대 판정은 `data/scripts/`, `data/expected_results.json`을 보세요.

## 데이터 출처와 고지

- 근거는 **공식 출처만** 씁니다: DART 공시(금융감독원 전자공시) 또는 회사 공식 뉴스룸·IR 자료. 언론 보도는 쓰지 않습니다.
- 모든 핵심 수치는 DART 잠정실적 공시·정기보고서와 대조했습니다. 출처 URL은 `data/disclosures.json`에 문장별로, DART 원문은 `data/raw/dart/`에 있습니다.
- 삼성전자 2026년 3분기 수치는 **잠정 실적**입니다. 3분기 실적 발표 일정(DART 기업설명회 공시): SK하이닉스 10월 28일 09:00, 현대자동차 10월 29일 14:10, 네이버 11월 12일. 그래서 이 회사들은 2분기까지만 들어 있습니다.
- 시연 영상·채널·사용자는 모두 **시연용 가상 데이터**이며 실제 인물·채널과 무관합니다.
- 공유 화면은 웹 시뮬레이션이고, 분석(LLM·임베딩·벡터 검색)은 실제로 동작합니다.

## 추후 고도화

- **리딩방·수익 보장 위험 신호 탐지:** 영상 속 리딩방 유도, 원금·수익 보장, 미공개 정보 암시 표현을 금융위·금감원 안내를 근거로 표시
- DART OpenAPI 공시 자동 수집과 정정 공시 반영
- 유튜브 공유 시트 · 우리WON MTS 네이티브 연동, 실제 계좌·투자성향 연동(동의 기반)
- 검증 결과 캐시와 근거 변경 알림

## 기여

브랜치·커밋·PR 규칙은 [CONTRIBUTING.md](CONTRIBUTING.md)를 따릅니다. 커밋 메시지는 `종류(범위): 요약` 형식입니다.

## 팀

| 역할 | 담당 |
|---|---|
| 기획 · 발표 |  |
| 프론트엔드 |  |
| 백엔드 |  |
| 데이터 · 벡터 DB |  |
