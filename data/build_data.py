"""WON Check 시연 데이터 생성: data/*.json, scripts/*.md

근거 기업 5곳: 삼성전자, SK하이닉스, 현대자동차, 네이버, 카카오 (시연 영상 3개는 앞의 3곳에 1개씩).
출처는 공식 자료만 쓴다: DART 공시(금융감독원 전자공시) 또는 회사 공식 뉴스룸·IR 자료. 언론 보도는 쓰지 않는다.
모든 핵심 수치는 DART 잠정실적 공시·정기보고서(data/raw/dart/)와 대조했다(2026-10-27).
문장은 원문을 옮기지 않고 RAG용으로 정규화·요약했다(팀 확정안 6장 방식).
사용자·영상 채널은 가상이다.

    python build_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
DATA, SCRIPTS = ROOT, ROOT / "scripts"
SCRIPTS.mkdir(exist_ok=True)

# company_code = DART 고유번호, stock_code = 종목코드. aliases는 주장 속 회사명 정규화용.
COMPANIES = {
    "삼성전자": {"company_code": "00126380", "stock_code": "005930", "sector": "반도체·전자", "demo": True,
               "aliases": ["삼성전자", "삼성", "삼전", "Samsung Electronics"]},
    "SK하이닉스": {"company_code": "00164779", "stock_code": "000660", "sector": "반도체", "demo": True,
                "aliases": ["SK하이닉스", "하이닉스", "SK hynix", "닉스"]},
    "현대자동차": {"company_code": "00164742", "stock_code": "005380", "sector": "자동차", "demo": True,
               "aliases": ["현대자동차", "현대차", "Hyundai Motor"]},
    "네이버": {"company_code": "00266961", "stock_code": "035420", "sector": "인터넷 플랫폼", "demo": False,
            "aliases": ["네이버", "NAVER", "Naver"]},
    "카카오": {"company_code": "00258801", "stock_code": "035720", "sector": "인터넷 플랫폼", "demo": False,
            "aliases": ["카카오", "Kakao"]},
}
DEFAULT_COMPANY = "삼성전자"

# ------------------------------------------------------------------ 출처(실제 공식 자료)
SOURCES = {
    "IR_2025Q3": {"source_title": "삼성전자 2025년 3분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2025-10-30",
                  "source_url": "https://news.samsung.com/kr/%ec%82%bc%ec%84%b1%ec%a0%84%ec%9e%90-2025%eb%85%84-3%eb%b6%84%ea%b8%b0-%ec%8b%a4%ec%a0%81-%eb%b0%9c%ed%91%9c"},
    "IR_2025Q4": {"source_title": "삼성전자 2025년 4분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-01-29",
                  "source_url": "https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-2025%EB%85%84-4%EB%B6%84%EA%B8%B0-%EC%8B%A4%EC%A0%81-%EB%B0%9C%ED%91%9C"},
    "IR_2025Q4_DECK": {"source_title": "삼성전자 2025년 4분기 경영실적 발표(컨퍼런스콜 자료)", "document_type": "공식 실적발표 자료",
                       "published_at": "2026-01-29",
                       "source_url": "https://images.samsung.com/kdp/ir/events/2025/2025_4Q_conference_kor.pdf"},
    "IR_2026Q1": {"source_title": "삼성전자 2026년 1분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-04-30",
                  "source_url": "https://news.samsung.com/kr/%ec%82%bc%ec%84%b1%ec%a0%84%ec%9e%90-2026%eb%85%84-1%eb%b6%84%ea%b8%b0-%ec%8b%a4%ec%a0%81-%eb%b0%9c%ed%91%9c"},
    "IR_2026Q2": {"source_title": "삼성전자 2026년 2분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-07-30",
                  "source_url": "https://news.samsung.com/kr/%EC%82%BC%EC%84%B1%EC%A0%84%EC%9E%90-2026%EB%85%84-2%EB%B6%84%EA%B8%B0-%EC%8B%A4%EC%A0%81-%EB%B0%9C%ED%91%9C"},
    "PRELIM_2026Q3": {"source_title": "삼성전자 2026년 3분기 잠정실적 발표", "document_type": "공식 잠정실적 발표",
                      "published_at": "2026-10-08",
                      "source_url": "https://news.samsungsemiconductor.com/kr/?p=37675"},

    # ---- 현대자동차 (회사 공식)
    "HMC_2025FY": {"company": "현대자동차", "source_title": "현대자동차 2025년 연간 경영실적 발표", "document_type": "공식 실적발표 자료",
                   "published_at": "2026-01-29",
                   "source_url": "https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2025-earnings-announcement"},
    "HMC_2026Q1": {"company": "현대자동차", "source_title": "현대자동차 2026년 1분기 경영실적 발표", "document_type": "공식 실적발표 자료",
                   "published_at": "2026-04-23",
                   "source_url": "https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-first-quarter-earnings"},
    "HMC_2026Q2": {"company": "현대자동차", "source_title": "현대자동차 2026년 2분기 경영실적 발표", "document_type": "공식 실적발표 자료",
                   "published_at": "2026-07-23",
                   "source_url": "https://www.hyundaimotorgroup.com/ko/news/hyundai-motor-company-2026-q2-earnings"},
    # ---- 네이버 (회사 공식)
    "NV_2025FY": {"company": "네이버", "source_title": "네이버 2025년 4분기 및 연간 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-02-06", "source_url": "https://www.navercorp.com/media/pressReleasesDetail?seq=34325"},
    "NV_2026Q1": {"company": "네이버", "source_title": "네이버 2026년 1분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-04-30", "source_url": "https://navercorp.com/media/pressReleasesDetail?seq=34994"},
    "NV_2026Q2": {"company": "네이버", "source_title": "네이버 2026년도 2분기 실적발표(IR 자료)", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-08-07",
                  "source_url": "https://navercorp.com/api/article/download/a769655e-43a9-4be8-8e78-d091981b1803"},
    # ---- DART 공시 (금융감독원 전자공시시스템, data/raw/dart/ 에 원문 보관)
    "HX_DART_2025Q4": {"company": "SK하이닉스", "filing_id": "20260128800709", "published_at": "2026-01-28",
                       "source_title": "SK하이닉스 연결재무제표기준영업(잠정)실적(공정공시) — 2025년 4분기·연간",
                       "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260128800709"},
    "HX_DART_2026Q1": {"company": "SK하이닉스", "filing_id": "20260423800001", "published_at": "2026-04-23",
                       "source_title": "SK하이닉스 연결재무제표기준영업(잠정)실적(공정공시) — 2026년 1분기",
                       "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260423800001"},
    "HX_DART_2026Q2": {"company": "SK하이닉스", "filing_id": "20260729800013", "published_at": "2026-07-29",
                       "source_title": "SK하이닉스 연결재무제표기준영업(잠정)실적(공정공시) — 2026년 2분기",
                       "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260729800013"},
    "HX_DART_IR_2026Q3": {"company": "SK하이닉스", "filing_id": "20261014800385", "published_at": "2026-10-14",
                          "source_title": "SK하이닉스 기업설명회(IR)개최(안내공시) — 2026년 3분기 경영실적 발표",
                          "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20261014800385"},
    "HMC_DART_IR_2026Q3": {"company": "현대자동차", "filing_id": "20261022800377", "published_at": "2026-10-22",
                           "source_title": "현대자동차 기업설명회(IR)개최(안내공시) — 2026년 3분기 경영실적 발표",
                           "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20261022800377"},
    "KK_DART_2025Q4": {"company": "카카오", "filing_id": "20260212800004", "published_at": "2026-02-12",
                       "source_title": "카카오 연결재무제표기준영업(잠정)실적(공정공시) — 2025년 4분기·연간",
                       "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260212800004"},
    "KK_DART_2026Q1": {"company": "카카오", "filing_id": "20260507800004", "published_at": "2026-05-07",
                       "source_title": "카카오 연결재무제표기준영업(잠정)실적(공정공시) — 2026년 1분기",
                       "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260507800004"},
    "KK_DART_2026Q2": {"company": "카카오", "filing_id": "20260806800010", "published_at": "2026-08-06",
                       "source_title": "카카오 연결재무제표기준영업(잠정)실적(공정공시) — 2026년 2분기",
                       "document_type": "DART 공시", "source_url": "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260806800010"},
}

# ------------------------------------------------------------------ 근거 문장(벡터 DB 적재 대상)
# (id, period, source, segment, metric, value, unit, is_preliminary, document)
# samsung_001~010 = 팀 확정안 6장 후보 문장(공식 자료 대조 완료). 011~ = 추가.
D = [
    ("samsung_001", "2025-FY", "IR_2025Q4_DECK", "전사", "REVENUE", 333.6, "조원", False,
     "삼성전자의 2025년 연간 연결 매출액은 약 333.6조 원이다."),
    ("samsung_002", "2025-FY", "IR_2025Q4_DECK", "전사", "OPERATING_PROFIT", 43.6, "조원", False,
     "삼성전자의 2025년 연간 연결 영업이익은 약 43.6조 원이다."),
    ("samsung_003", "2024-FY", "IR_2025Q4_DECK", "전사", "REVENUE", 300.9, "조원", False,
     "삼성전자의 2024년 연간 연결 매출액은 약 300.9조 원이다."),
    ("samsung_004", "2024-FY", "IR_2025Q4_DECK", "전사", "OPERATING_PROFIT", 32.7, "조원", False,
     "삼성전자의 2024년 연간 연결 영업이익은 약 32.7조 원이다."),
    ("samsung_005", "2025-Q4", "IR_2025Q4", "전사", "REVENUE", 93.8, "조원", False,
     "삼성전자의 2025년 4분기 연결 매출액은 약 93.8조 원이다."),
    ("samsung_006", "2025-Q4", "IR_2025Q4", "전사", "OPERATING_PROFIT", 20.1, "조원", False,
     "삼성전자의 2025년 4분기 연결 영업이익은 약 20.1조 원이다."),
    ("samsung_007", "2025-Q3", "IR_2025Q3", "전사", "REVENUE", 86.1, "조원", False,
     "삼성전자의 2025년 3분기 연결 매출액은 약 86.1조 원이다."),
    ("samsung_008", "2025-Q3", "IR_2025Q3", "전사", "OPERATING_PROFIT", 12.2, "조원", False,
     "삼성전자의 2025년 3분기 연결 영업이익은 약 12.2조 원이다."),
    ("samsung_009", "2025-Q4", "IR_2025Q4", "DS", "REVENUE", 44.0, "조원", False,
     "삼성전자 DS부문(반도체)의 2025년 4분기 매출액은 약 44.0조 원이다."),
    ("samsung_010", "2025-Q4", "IR_2025Q4", "DS", "OPERATING_PROFIT", 16.4, "조원", False,
     "삼성전자 DS부문(반도체)의 2025년 4분기 영업이익은 약 16.4조 원이다."),
    # ---- 추가: 2025년 3·4분기 부문별
    ("samsung_011", "2025-Q3", "IR_2025Q3", "DS", "OPERATING_PROFIT", 7.0, "조원", False,
     "삼성전자 DS부문(반도체)의 2025년 3분기 매출액은 약 33.1조 원, 영업이익은 약 7조 원이다."),
    ("samsung_012", "2025-Q3", "IR_2025Q3", "DX", "OPERATING_PROFIT", 3.5, "조원", False,
     "삼성전자 DX부문(모바일·가전)의 2025년 3분기 매출액은 약 48.4조 원, 영업이익은 약 3.5조 원이다."),
    ("samsung_013", "2025-Q4", "IR_2025Q4", "DX", "OPERATING_PROFIT", 1.3, "조원", False,
     "삼성전자 DX부문(모바일·가전)의 2025년 4분기 매출액은 약 44.3조 원, 영업이익은 약 1.3조 원이다."),
    ("samsung_014", "2025-Q4", "IR_2025Q4", "메모리", "QUALITATIVE", None, "", False,
     "삼성전자는 2025년 4분기 메모리 사업에서 범용 D램 수요 강세 대응과 HBM 판매 확대로 사상 최대 분기 매출과 영업이익을 기록했다고 밝혔다."),
    # ---- 2026년 1분기
    ("samsung_015", "2026-Q1", "IR_2026Q1", "전사", "OPERATING_PROFIT", 57.2, "조원", False,
     "삼성전자의 2026년 1분기 연결 매출액은 약 133.9조 원, 영업이익은 약 57.2조 원이다."),
    ("samsung_016", "2026-Q1", "IR_2026Q1", "DS", "OPERATING_PROFIT", 53.7, "조원", False,
     "삼성전자 DS부문(반도체)의 2026년 1분기 매출액은 약 81.7조 원, 영업이익은 약 53.7조 원이다."),
    ("samsung_017", "2026-Q1", "IR_2026Q1", "DX", "OPERATING_PROFIT", 3.0, "조원", False,
     "삼성전자 DX부문(모바일·가전)의 2026년 1분기 매출액은 약 52.7조 원, 영업이익은 약 3조 원으로 흑자다."),
    ("samsung_018", "2026-Q1", "IR_2026Q1", "메모리", "QUALITATIVE", None, "", False,
     "삼성전자는 2026년 1분기에 업계에서 처음으로 HBM4와 저전력 메모리 모듈 SOCAMM2를 함께 양산·판매하기 시작했다고 밝혔다."),
    # ---- 2026년 2분기
    ("samsung_019", "2026-Q2", "IR_2026Q2", "전사", "OPERATING_PROFIT", 89.5, "조원", False,
     "삼성전자의 2026년 2분기 연결 매출액은 약 171.5조 원, 영업이익은 약 89.5조 원이다."),
    ("samsung_020", "2026-Q2", "IR_2026Q2", "DS", "OPERATING_PROFIT", 89.2, "조원", False,
     "삼성전자 DS부문(반도체)의 2026년 2분기 매출액은 약 127.5조 원, 영업이익은 약 89.2조 원이다."),
    ("samsung_021", "2026-Q2", "IR_2026Q2", "DX", "OPERATING_PROFIT", -0.8, "조원", False,
     "삼성전자 DX부문(모바일·가전)의 2026년 2분기 매출액은 약 48조 원, 영업손실은 약 0.8조 원으로 적자다."),
    ("samsung_022", "2026-Q2", "IR_2026Q2", "메모리", "QUALITATIVE", None, "", False,
     "삼성전자는 2026년 2분기에 HBM4 공급을 늘리고 업계 처음으로 HBM4E 샘플을 출하했으며, 메모리 사업이 역대 최대 분기 실적을 냈다고 밝혔다."),
    ("samsung_023", "2026-Q2", "IR_2026Q2", "전사", "OUTLOOK", None, "", False,
     "삼성전자는 2026년 하반기에도 반도체 수요 강세로 전사 실적이 성장할 것으로 전망했으며, DX부문은 부품 비용 상승 등으로 어려운 환경이 이어질 것으로 예상했다. 이는 회사의 전망이며 확정된 실적이 아니다."),
    # ---- 2026년 3분기 잠정
    ("samsung_024", "2026-Q3", "PRELIM_2026Q3", "전사", "OPERATING_PROFIT", 107.4, "조원", True,
     "삼성전자의 2026년 3분기 잠정 연결 매출액은 약 195조 원, 영업이익은 약 107.4조 원이다."),
    ("samsung_025", "2026-Q3", "PRELIM_2026Q3", "전사", "GROWTH", None, "%", True,
     "삼성전자의 2026년 3분기 잠정 실적은 직전 분기 대비 매출 13.70%, 영업이익 20.01% 증가했고, 전년 동기 대비 매출 126.59%, 영업이익 782.50% 증가했다."),
    ("samsung_026", "2026-Q3", "PRELIM_2026Q3", "전사", "NOTICE", None, "", True,
     "삼성전자의 2026년 3분기 잠정 실적은 결산이 끝나기 전에 국제회계기준으로 추정한 수치이며, 확정 실적은 별도로 발표된다."),
]


# ---- 다른 4개 기업 (조원 단위는 소수 둘째 자리까지 반올림, 원문 금액을 문장에 함께 적음)
D += [
    # SK하이닉스 — 3분기 실적은 2026-10-29 발표 예정(2026-10-27 기준 미발표)
    ("hynix_001", "2025-FY", "HX_DART_2025Q4", "전사", "OPERATING_PROFIT", 47.21, "조원", False,
     "SK하이닉스의 2025년 연간 연결 매출액은 97조 1,467억 원, 영업이익은 47조 2,063억 원으로 전년 대비 각각 46.8%, 101.2% 늘었다(잠정)."),
    ("hynix_009", "2025-Q4", "HX_DART_2025Q4", "전사", "OPERATING_PROFIT", 19.17, "조원", False,
     "SK하이닉스의 2025년 4분기 연결 매출액은 32조 8,267억 원, 영업이익은 19조 1,696억 원으로 전년 동기 대비 각각 66.1%, 137.2% 늘었다(잠정)."),
    ("hynix_003", "2026-Q1", "HX_DART_2026Q1", "전사", "OPERATING_PROFIT", 37.61, "조원", False,
     "SK하이닉스의 2026년 1분기 연결 매출액은 52조 5,763억 원, 영업이익은 37조 6,103억 원이다(잠정). 영업이익률은 약 71.5%다(계산값)."),
    ("hynix_004", "2026-Q1", "HX_DART_2026Q1", "전사", "GROWTH", None, "%", False,
     "SK하이닉스의 2026년 1분기 실적은 전년 동기 대비 매출액 198.1%, 영업이익 405.5% 늘었고, 직전 분기 대비 매출액 60.2%, 영업이익 96.2% 늘었다(잠정)."),
    ("hynix_005", "2026-Q2", "HX_DART_2026Q2", "전사", "OPERATING_PROFIT", 60.54, "조원", False,
     "SK하이닉스의 2026년 2분기 연결 매출액은 79조 3,187억 원, 영업이익은 60조 5,426억 원이다(잠정). 영업이익률은 약 76.3%다(계산값)."),
    ("hynix_006", "2026-Q2", "HX_DART_2026Q2", "전사", "GROWTH", None, "%", False,
     "SK하이닉스의 2026년 2분기 실적은 전년 동기 대비 매출액 256.8%, 영업이익 557.2% 늘었고, 직전 분기 대비 매출액 50.9%, 영업이익 61.0% 늘었다(잠정)."),
    ("hynix_008", "2026-Q3", "HX_DART_IR_2026Q3", "전사", "NOTICE", None, "", False,
     "SK하이닉스는 2026년 3분기 경영실적을 2026년 10월 28일 09:00 기업설명회(컨퍼런스콜)에서 발표한다고 공시했다. 그 전까지 3분기 공식 실적은 없으며, 증권사 전망치는 확정 실적이 아니다."),
    # 현대자동차 — 3분기 실적은 2026-10-29 발표 예정
    ("hyundai_001", "2025-FY", "HMC_2025FY", "전사", "OPERATING_PROFIT", 11.47, "조원", False,
     "현대자동차의 2025년 연간 매출액은 약 186조 2,545억 원으로 전년보다 6.3% 늘었고, 영업이익은 약 11조 4,679억 원으로 19.5% 줄었다. 영업이익률은 6.2%다."),
    ("hyundai_002", "2025-Q4", "HMC_2025FY", "전사", "OPERATING_PROFIT", 1.70, "조원", False,
     "현대자동차의 2025년 4분기 매출액은 약 46조 8,386억 원, 영업이익은 약 1조 6,954억 원으로 전년 동기 대비 39.9% 줄었다. 영업이익률은 3.6%다."),
    ("hyundai_003", "2026-FY", "HMC_2025FY", "전사", "OUTLOOK", None, "", False,
     "현대자동차는 2026년 목표로 매출액 성장률 1.0~2.0%, 영업이익률 6.3~7.3%를 제시했다. 이는 회사의 가이던스이며 확정 실적이 아니다."),
    ("hyundai_004", "2026-Q1", "HMC_2026Q1", "전사", "OPERATING_PROFIT", 2.51, "조원", False,
     "현대자동차의 2026년 1분기 매출액은 약 45조 9,389억 원으로 전년 동기 대비 3.4% 늘었고, 영업이익은 약 2조 5,147억 원으로 30.8% 줄었다. 영업이익률은 5.5%다."),
    ("hyundai_005", "2026-Q1", "HMC_2026Q1", "전사", "QUALITATIVE", None, "", False,
     "현대자동차는 2026년 1분기 관세 영향이 약 8,600억 원으로 집계됐고, 원자재값 상승으로 매출원가율이 82.5%로 2.7%포인트 올랐다고 밝혔다."),
    ("hyundai_006", "2026-Q2", "HMC_2026Q2", "전사", "OPERATING_PROFIT", 2.85, "조원", False,
     "현대자동차의 2026년 2분기 매출액은 약 49조 2,153억 원으로 전년 동기 대비 1.9% 늘었고, 영업이익은 약 2조 8,509억 원으로 20.8% 줄었다. 영업이익률은 5.8%로 흑자다."),
    ("hyundai_007", "2026-Q2", "HMC_2026Q2", "전사", "QUALITATIVE", None, "", False,
     "현대자동차는 2026년 2분기 영업이익 감소의 주요 원인으로 원자재 가격 상승과 부품 협력사 화재에 따른 생산 차질을 들었다."),
    ("hyundai_008", "2026-Q3", "HMC_DART_IR_2026Q3", "전사", "NOTICE", None, "", False,
     "현대자동차는 2026년 3분기 경영실적을 2026년 10월 29일 14:10 기업설명회(컨퍼런스콜)에서 발표한다고 공시했다. 그 전까지 3분기 공식 실적은 없다."),
    # 네이버
    ("naver_001", "2025-FY", "NV_2025FY", "전사", "OPERATING_PROFIT", 2.21, "조원", False,
     "네이버의 2025년 연간 매출액은 약 12조 350억 원으로 전년보다 12.1% 늘었고, 영업이익은 약 2조 2,081억 원으로 11.6% 늘었다."),
    ("naver_002", "2026-Q1", "NV_2026Q1", "전사", "OPERATING_PROFIT", 0.54, "조원", False,
     "네이버의 2026년 1분기 매출액은 약 3조 2,411억 원으로 전년 동기 대비 16.3% 늘었고, 영업이익은 약 5,418억 원으로 7.2% 늘었다."),
    ("naver_003", "2026-Q2", "NV_2026Q2", "전사", "OPERATING_PROFIT", 0.52, "조원", False,
     "네이버의 2026년 2분기 매출액은 약 3조 3,888억 원으로 전년 동기 대비 16.2% 늘었고, 영업이익은 약 5,203억 원으로 전년 동기 대비 0.2%, 직전 분기 대비 4.0% 줄었다."),
    ("naver_004", "2026-Q1", "NV_2026Q1", "전사", "QUALITATIVE", None, "", False,
     "네이버는 AI 경쟁력 확보를 위한 인프라 투자 영향으로 영업이익 증가율이 둔화됐다고 밝혔다."),
    # 카카오
    ("kakao_001", "2025-FY", "KK_DART_2025Q4", "전사", "OPERATING_PROFIT", 0.73, "조원", False,
     "카카오의 2025년 연간 연결 매출액은 8조 991억 원으로 전년 대비 2.9% 늘었고, 영업이익은 7,320억 원으로 59.1% 늘었다(잠정)."),
    ("kakao_002", "2026-Q1", "KK_DART_2026Q1", "전사", "OPERATING_PROFIT", 0.21, "조원", False,
     "카카오의 2026년 1분기 연결 매출액은 1조 9,421억 원으로 전년 동기 대비 4.2% 늘었고, 영업이익은 2,114억 원으로 100.6% 늘었다(잠정)."),
    ("kakao_003", "2026-Q2", "KK_DART_2026Q2", "전사", "OPERATING_PROFIT", 0.28, "조원", False,
     "카카오의 2026년 2분기 연결 매출액은 2조 985억 원으로 전년 동기 대비 3.5% 늘었고, 영업이익은 2,770억 원으로 49.0% 늘었다(잠정)."),
]



def disclosures():
    out = []
    for id_, period, src, seg, metric, value, unit, prelim, doc in D:
        s = SOURCES[src]
        name = s.get("company", DEFAULT_COMPANY)
        co = COMPANIES[name]
        out.append({
            "id": id_,
            "document": doc,
            "metadata": {
                "company": name,
                "company_code": co["company_code"],
                "stock_code": co["stock_code"],
                "document_type": s["document_type"],
                "period": period,
                "published_at": s["published_at"],
                "source_title": s["source_title"],
                "source_url": s["source_url"],
                "filing_id": s.get("filing_id", ""),
                # 서버 계산·필터용 추가 메타데이터(ChromaDB는 None 불가 → 빈 값으로)
                "segment": seg,
                "metric": metric,
                "value": value if value is not None else 0.0,
                "has_value": value is not None,
                "unit": unit,
                "basis": "연결",
                "is_preliminary": prelim,
            },
        })
    return out


# 서버 코드 계산용 구조화 수치 (조원, 연결)
FINANCIAL_FACTS = [
    # period, segment, revenue, operating_profit, source, is_preliminary
    ("2024-FY", "전사", 300.9, 32.7, "IR_2025Q4_DECK", False),
    ("2025-FY", "전사", 333.6, 43.6, "IR_2025Q4_DECK", False),
    ("2025-Q3", "전사", 86.1, 12.2, "IR_2025Q3", False),
    ("2025-Q3", "DS", 33.1, 7.0, "IR_2025Q3", False),
    ("2025-Q3", "DX", 48.4, 3.5, "IR_2025Q3", False),
    ("2025-Q4", "전사", 93.8, 20.1, "IR_2025Q4", False),
    ("2025-Q4", "DS", 44.0, 16.4, "IR_2025Q4", False),
    ("2025-Q4", "DX", 44.3, 1.3, "IR_2025Q4", False),
    ("2026-Q1", "전사", 133.9, 57.2, "IR_2026Q1", False),
    ("2026-Q1", "DS", 81.7, 53.7, "IR_2026Q1", False),
    ("2026-Q1", "DX", 52.7, 3.0, "IR_2026Q1", False),
    ("2026-Q2", "전사", 171.5, 89.5, "IR_2026Q2", False),
    ("2026-Q2", "DS", 127.5, 89.2, "IR_2026Q2", False),
    ("2026-Q2", "DX", 48.0, -0.8, "IR_2026Q2", False),
    ("2026-Q3", "전사", 195.0, 107.4, "PRELIM_2026Q3", True),
    # 이하 단위 조원(원문 억 원 단위를 조원으로 환산, 소수 넷째 자리)
    ("2025-FY", "전사", 97.1467, 47.2063, "HX_DART_2025Q4", False),
    ("2025-Q4", "전사", 32.8267, 19.1696, "HX_DART_2025Q4", False),
    ("2026-Q1", "전사", 52.5763, 37.6103, "HX_DART_2026Q1", False),
    ("2026-Q2", "전사", 79.3187, 60.5426, "HX_DART_2026Q2", False),
    ("2025-FY", "전사", 186.2545, 11.4679, "HMC_2025FY", False),
    ("2025-Q4", "전사", 46.8386, 1.6954, "HMC_2025FY", False),
    ("2026-Q1", "전사", 45.9389, 2.5147, "HMC_2026Q1", False),
    ("2026-Q2", "전사", 49.2153, 2.8509, "HMC_2026Q2", False),
    ("2025-FY", "전사", 12.0350, 2.2081, "NV_2025FY", False),
    ("2025-Q4", "전사", 3.1951, 0.6106, "NV_2025FY", False),
    ("2026-Q1", "전사", 3.2411, 0.5418, "NV_2026Q1", False),
    ("2026-Q2", "전사", 3.3888, 0.5203, "NV_2026Q2", False),
    ("2025-FY", "전사", 8.0991, 0.7320, "KK_DART_2025Q4", False),
    ("2025-Q4", "전사", 2.1332, 0.2034, "KK_DART_2025Q4", False),
    ("2026-Q1", "전사", 1.9421, 0.2114, "KK_DART_2026Q1", False),
    ("2026-Q2", "전사", 2.0985, 0.2770, "KK_DART_2026Q2", False),
]

# ------------------------------------------------------------------ 사용자(가상) — 우리투자증권 5단계
USERS = [
    {"user_id": "demo_user_01", "name": "박서연(가상)", "risk_tolerance": "공격투자형", "investment_horizon": "단기",
     "investment_style": "반도체 업황에 집중 투자, 수익 극대화 추구", "scenario": "S2",
     "holdings": [{"company": "삼성전자", "weight_pct": 45}, {"company": "SK하이닉스", "weight_pct": 35},
                  {"company": "예수금(현금)", "weight_pct": 20}],
     "intent": {"type": "추가 매수 검토", "company": "SK하이닉스", "amount_krw": 5_000_000}},
    {"user_id": "demo_user_02", "name": "김도현(가상)", "risk_tolerance": "적극투자형", "investment_horizon": "중기",
     "investment_style": "성장주 중심이지만 업종 분산 유지", "scenario": "S2",
     "holdings": [{"company": "SK하이닉스", "weight_pct": 10}, {"company": "현대자동차", "weight_pct": 15},
                  {"company": "네이버", "weight_pct": 10}, {"company": "TIGER 미국S&P500", "weight_pct": 40},
                  {"company": "KODEX 단기채권", "weight_pct": 15}, {"company": "예수금(현금)", "weight_pct": 10}],
     "intent": {"type": "추가 매수 검토", "company": "SK하이닉스", "amount_krw": 3_000_000}},
    {"user_id": "demo_user_03", "name": "이도윤(가상)", "risk_tolerance": "위험중립형", "investment_horizon": "중기",
     "investment_style": "지수 ETF 위주, 개별 종목은 처음 검토", "scenario": "S1",
     "holdings": [{"company": "SK하이닉스", "weight_pct": 15}, {"company": "카카오", "weight_pct": 10},
                  {"company": "TIGER 미국S&P500", "weight_pct": 40}, {"company": "KODEX 단기채권", "weight_pct": 20},
                  {"company": "예수금(현금)", "weight_pct": 15}],
     "intent": {"type": "신규 매수 검토", "company": "삼성전자", "amount_krw": 3_000_000}},
    {"user_id": "demo_user_04", "name": "한지은(가상)", "risk_tolerance": "안정추구형", "investment_horizon": "장기",
     "investment_style": "원금 손실 최소화, 일부만 우량주 보유", "scenario": "S3",
     "holdings": [{"company": "현대자동차", "weight_pct": 25}, {"company": "KODEX 단기채권", "weight_pct": 50},
                  {"company": "예수금(현금)", "weight_pct": 25}],
     "intent": {"type": "보유 점검", "company": "현대자동차", "amount_krw": 0}},
    {"user_id": "demo_user_05", "name": "정영호(가상)", "risk_tolerance": "안정형", "investment_horizon": "장기",
     "investment_style": "퇴직금 보전 우선, 파킹형·단기채권 ETF 중심", "scenario": "S3",
     "holdings": [{"company": "TIGER 머니마켓액티브", "weight_pct": 70}, {"company": "KODEX 단기채권", "weight_pct": 30}],
     "intent": {"type": "신규 매수 검토", "company": "현대자동차", "amount_krw": 10_000_000}},
]

# ------------------------------------------------------------------ 영상(가상 채널) — 영상당 검증 주장 3개
# video_id는 11자. 실제 업로드 후 실제 ID로 바꾸면 된다.
VIDEOS = [
    {"video_id": "WCdemoS1V01", "scenario": "S1", "companies": ["삼성전자"],
     "title": "삼성전자 영업이익 100조 시대, 지금 안 사면 늦습니다",
     "channel": "주식왕 데이빗(가상)", "published_at": "2026-10-12", "tone": "흥분된 말투, 빨간 화살표 자막",
     "length": "약 50초", "host": "30대 남성 진행자, 정장 재킷에 금색 넥타이, 과장된 손동작",
     "set": "빨간 배경 스튜디오, 상승 화살표·폭죽 효과",
     "thumbnail": "삼성 100조 시대 🚀 지금 안 사면 늦는다",
     "description": "삼성전자 3분기 실적 총정리! 영업이익 100조 시대, 주가 2배 갑니다.",
     "hashtags": ["#삼성전자", "#주식", "#실적발표", "#주식쇼츠"],
     "segments": [
         ("0:00", "여러분, 삼성전자가 드디어 일냈습니다! 영업이익 100조 시대가 열렸어요.", "🚨 영업이익 100조 시대",
          "진행자 클로즈업 + '속보' 효과음, 화면 흔들림"),
         ("0:06", "이번에 나온 3분기 실적, 영업이익이 107조를 넘었습니다. 분기 하나에 107조예요, 107조!", "3Q 영업이익 107조 ↑",
          "숫자 107조가 카운트업되며 커짐"),
         ("0:14", "저도 처음에 숫자 잘못 본 줄 알았어요. 진짜 말이 안 되는 숫자입니다.", "실화냐?",
          "진행자가 눈 비비는 리액션"),
         ("0:20", "매출은요? 아예 200조를 돌파했습니다. 한 분기 매출이 200조예요.", "분기 매출 200조 돌파",
          "막대그래프가 200조 선을 뚫고 올라감"),
         ("0:27", "이 정도면 회사 체급 자체가 달라진 거예요.", "체급이 달라졌다",
          "진행자 팔짱, 고개 끄덕임"),
         ("0:32", "그래서 제 결론은 딱 하나입니다. 내년이면 주가 두 배, 그냥 갑니다.", "내년 주가 2배 📈",
          "주가 차트에 빨간 화살표 두 배 표시"),
         ("0:40", "지금 망설이시는 분들, 나중에 '그때 살걸' 후회하지 마세요.", "지금 안 사면 늦는다",
          "진행자가 화면을 가리킴"),
         ("0:46", "구독이랑 알림 설정 해 두시면 다음 실적도 제일 먼저 정리해 드릴게요.", "구독 · 알림 🔔",
          "구독 버튼 애니메이션"),
     ],
     "claims": [
         {"text": "삼성전자의 2026년 3분기 영업이익은 107조 원을 넘었다", "claim_type": "FINANCIAL", "period": "2026-Q3",
          "expected_status": "SUPPORTED", "expected_sources": ["samsung_024"],
          "reason": "잠정 영업이익 약 107.4조 원으로 일치. 단, 확정 전 잠정치임을 표시해야 함"},
         {"text": "삼성전자의 2026년 3분기 매출은 200조 원을 돌파했다", "claim_type": "FINANCIAL", "period": "2026-Q3",
          "expected_status": "CONTRADICTED", "expected_sources": ["samsung_024"],
          "reason": "잠정 매출은 약 195조 원으로 200조 원에 못 미침"},
         {"text": "삼성전자 주가는 내년에 두 배가 될 것이다", "claim_type": "PREDICTION", "period": None,
          "expected_status": "PREDICTION", "expected_sources": [], "reason": "미래 주가 전망"},
     ],
     "risk_signals": []},
    {"video_id": "WCdemoS2V02", "scenario": "S2", "companies": ["SK하이닉스"],
     "title": "SK하이닉스 3분기 77조 확정! 지금 비중 늘리세요",
     "channel": "실적으로 말하는 주식(가상)", "published_at": "2026-10-21", "tone": "뉴스 브리핑형, 그래프 자막",
     "length": "약 55초", "host": "30대 여성 진행자, 단정한 셔츠, 앵커처럼 차분하지만 단정적인 말투",
     "set": "뉴스 스튜디오풍 남색 배경, 하단 자막 바, 그래프 패널",
     "thumbnail": "하이닉스 3분기 77조 확정 ✅ 비중 늘릴 때",
     "description": "SK하이닉스 2분기·3분기 실적 브리핑. 숫자로 보는 지금의 하이닉스.",
     "hashtags": ["#SK하이닉스", "#반도체", "#실적브리핑", "#주식쇼츠"],
     "segments": [
         ("0:00", "안녕하세요, 실적으로 말하는 주식입니다. 오늘은 SK하이닉스 실적 정리해 보겠습니다.", "SK하이닉스 실적 브리핑",
          "뉴스 오프닝 효과음, 진행자 상반신"),
         ("0:07", "먼저 2분기입니다. 영업이익이 60조 원을 넘었고, 영업이익률은 76%였습니다.", "2Q 영업이익 60조 · 이익률 76%",
          "오른쪽 그래프 패널에 영업이익 막대와 76% 원그래프"),
         ("0:15", "100원어치 팔면 76원이 남았다는 뜻이죠. 제조업에서는 보기 힘든 숫자입니다.", "100원 팔면 76원 남는다",
          "동전 100개 중 76개가 강조되는 그래픽"),
         ("0:23", "매출도 분기 기준 80조 원을 돌파했습니다.", "분기 매출 80조 돌파",
          "매출 막대가 80조 선을 넘는 그래픽"),
         ("0:29", "그리고 중요한 소식입니다. 3분기 영업이익은 77조 원으로 이미 확정됐습니다.", "3Q 영업이익 77조 '확정'",
          "'확정' 도장이 찍히는 효과"),
         ("0:36", "2분기보다 또 늘어난 거죠. 이 흐름이 꺾일 이유가 보이지 않습니다.", "상승 흐름 지속",
          "분기별 영업이익 꺾은선이 계속 오름"),
         ("0:42", "그래서 이미 보유하신 분들도, 지금은 비중을 늘리실 타이밍입니다.", "보유자도 비중 확대",
          "진행자 정면 응시, 하단 자막 바 강조"),
         ("0:49", "투자 판단은 본인 몫이지만, 숫자는 거짓말을 안 하니까요.", "숫자는 거짓말 안 한다",
          "엔딩 로고(가상 채널)"),
     ],
     "claims": [
         {"text": "SK하이닉스의 2026년 2분기 영업이익은 60조 원을 넘었고 영업이익률은 76%다", "claim_type": "FINANCIAL",
          "period": "2026-Q2", "expected_status": "SUPPORTED", "expected_sources": ["hynix_005"],
          "reason": "2분기 영업이익 약 60조 5,426억 원, 영업이익률 76.3%"},
         {"text": "SK하이닉스의 2026년 2분기 매출은 80조 원을 돌파했다", "claim_type": "FINANCIAL", "period": "2026-Q2",
          "expected_status": "CONTRADICTED", "expected_sources": ["hynix_005"],
          "reason": "2분기 매출은 약 79조 3,187억 원으로 80조 원에 못 미침"},
         {"text": "SK하이닉스의 2026년 3분기 영업이익은 77조 원으로 확정됐다", "claim_type": "FINANCIAL", "period": "2026-Q3",
          "expected_status": "INSUFFICIENT_EVIDENCE", "expected_sources": ["hynix_008"],
          "reason": "DART 기업설명회 공시상 3분기 실적은 10월 28일 09:00 발표 예정으로, 영상 게시일(10/21) 기준 공식 수치가 없음. 77조 원은 증권사 전망치 수준이며 확정이 아님"},
     ],
     "risk_signals": []},
    {"video_id": "WCdemoS3V03", "scenario": "S3", "companies": ["현대자동차"],
     "title": "현대차 관세 직격탄, 보유자는 지금 파세요",
     "channel": "팩트폭격 주식(가상)", "published_at": "2026-08-10", "tone": "단호한 말투, 검은 배경 빨간 자막",
     "length": "약 45초", "host": "40대 남성 진행자, 검은 후드티, 낮고 단호한 목소리",
     "set": "검은 배경, 빨간 굵은 자막, 하락 차트",
     "thumbnail": "현대차 끝났다 ❌ 보유자 지금 파세요",
     "description": "관세 직격탄 맞은 현대차, 보유자라면 꼭 보세요.",
     "hashtags": ["#현대차", "#관세", "#자동차주", "#주식쇼츠"],
     "segments": [
         ("0:00", "현대차, 이제 끝났습니다. 보유하신 분들은 끝까지 들어 주세요.", "현대차 보유자 필독",
          "검은 화면에서 진행자 얼굴만 조명"),
         ("0:06", "관세 직격탄 맞았습니다. 1분기 영업이익이 30% 넘게 빠졌어요.", "관세 · 1Q 영업이익 -30% ↓",
          "영업이익 막대가 깎여 내려가는 그래픽"),
         ("0:13", "여기서 끝이 아닙니다. 2분기는 아예 적자로 돌아섰어요.", "2Q 적자 전환",
          "막대가 0 아래로 떨어지며 빨갛게 변함"),
         ("0:19", "차를 팔아도 돈이 안 남는다는 얘기예요. 이게 정상입니까?", "팔수록 손해?",
          "진행자가 책상을 짚으며 카메라 쪽으로 기울임"),
         ("0:25", "제가 보기엔 내년엔 이익이 반토막 납니다.", "내년 이익 반토막",
          "그래프가 반으로 쪼개지는 효과"),
         ("0:31", "버티면 회복된다? 그 말 믿다가 계좌 녹습니다.", "버티기는 답이 아니다",
          "녹아내리는 계좌 아이콘"),
         ("0:37", "보유하신 분들, 지금 파세요. 이게 제 결론입니다.", "지금 매도",
          "빨간 '매도' 버튼이 깜빡임"),
     ],
     "claims": [
         {"text": "현대자동차의 2026년 1분기 영업이익은 전년 동기보다 30% 넘게 줄었다", "claim_type": "FINANCIAL",
          "period": "2026-Q1", "expected_status": "SUPPORTED", "expected_sources": ["hyundai_004", "hyundai_005"],
          "reason": "1분기 영업이익 약 2조 5,147억 원으로 전년 동기 대비 30.8% 감소. 관세 영향 약 8,600억 원"},
         {"text": "현대자동차는 2026년 2분기에 영업 적자를 냈다", "claim_type": "FINANCIAL", "period": "2026-Q2",
          "expected_status": "CONTRADICTED", "expected_sources": ["hyundai_006"],
          "reason": "2분기 영업이익 약 2조 8,509억 원 흑자(영업이익률 5.8%). 감소는 맞지만 적자는 아님"},
         {"text": "현대자동차의 내년 이익은 절반으로 줄어들 것이다", "claim_type": "PREDICTION", "period": None,
          "expected_status": "PREDICTION", "expected_sources": [], "reason": "미래 실적 전망"},
     ],
     "risk_signals": []},
]

SCENARIOS = {
    "S1": {"name": "신규 투자 검토", "users": ["demo_user_03"], "question": "영상의 근거가 맞고, 내 투자 목적에도 맞을까?"},
    "S2": {"name": "추가 매수 검토", "users": ["demo_user_01", "demo_user_02"], "question": "더 사면 자산 구성이 어떻게 달라질까?"},
    "S3": {"name": "보유 점검", "users": ["demo_user_04", "demo_user_05"], "question": "기존에 보유한 이유를 다시 검토해야 할까?"},
}


def normalize_videos():
    """회사 정보가 없는 영상·주장은 삼성전자로 채운다."""
    for v in VIDEOS:
        v.setdefault("companies", [DEFAULT_COMPANY])
        for c in v["claims"]:
            c.setdefault("companies", v["companies"] if len(v["companies"]) == 1 else v["companies"][:1])
            for name in c["companies"]:
                assert name in COMPANIES, name


def main():
    normalize_videos()
    disc = disclosures()
    ids = {d["id"] for d in disc}
    for v in VIDEOS:  # 기대 출처가 실제로 적재되는지 확인
        for c in v["claims"]:
            missing = set(c["expected_sources"]) - ids
            assert not missing, (v["video_id"], missing)
        for r in v["risk_signals"]:
            assert not set(r["expected_sources"]) - ids, (v["video_id"], r["type"])
    (DATA / "disclosures.json").write_text(json.dumps(disc, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "financial_facts.json").write_text(json.dumps([
        {"company": SOURCES[src].get("company", DEFAULT_COMPANY),
         "company_code": COMPANIES[SOURCES[src].get("company", DEFAULT_COMPANY)]["company_code"],
         "stock_code": COMPANIES[SOURCES[src].get("company", DEFAULT_COMPANY)]["stock_code"],
         "period": p, "segment": s, "revenue_trillion_krw": r, "operating_profit_trillion_krw": o,
         "basis": "연결", "is_preliminary": pre, **{k: SOURCES[src][k] for k in ("source_title", "source_url", "published_at")}}
        for p, s, r, o, src, pre in FINANCIAL_FACTS], ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "companies.json").write_text(json.dumps(
        [{"company": k, **v} for k, v in COMPANIES.items()], ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "users.json").write_text(json.dumps(USERS, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "transcripts.json").write_text(json.dumps({
        v["video_id"]: {
            "video_id": v["video_id"], "url": f"https://www.youtube.com/watch?v={v['video_id']}",
            "title": v["title"], "channel": v["channel"], "published_at": v["published_at"],
            "mentioned_companies": v["companies"],
            "transcript_source": "PRELOADED_DEMO",
            "transcript": " ".join(seg[1] for seg in v["segments"]),
            "segments": [{"time": tm, "text": t, "caption": cap} for tm, t, cap, _ in v["segments"]],
        } for v in VIDEOS}, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "expected_results.json").write_text(json.dumps({
        "note": "평가·리허설용 정답. 서버에 하드코딩하지 말 것(팀 확정안 7장).",
        "scenarios": SCENARIOS,
        "videos": [{"video_id": v["video_id"], "scenario": v["scenario"], "companies": v["companies"], "claims": v["claims"],
                    "risk_signals": v["risk_signals"]} for v in VIDEOS]}, ensure_ascii=False, indent=2), encoding="utf-8")

    lab = {"SUPPORTED": "근거 확인", "CONTRADICTED": "근거와 불일치", "INSUFFICIENT_EVIDENCE": "근거 부족", "PREDICTION": "예측"}
    for v in VIDEOS:
        sc = SCENARIOS[v["scenario"]]
        lines = [f"# {v['video_id']} · {v['title']}", "",
                 "## 기본 정보", "",
                 "| 항목 | 내용 |", "|---|---|",
                 f"| 채널 | {v['channel']} |",
                 f"| 게시일(설정) | {v['published_at']} |",
                 f"| 형식 | 세로형 쇼츠(9:16) · {v['length']} |",
                 f"| 다루는 기업 | {', '.join(v['companies'])} |",
                 f"| 시나리오 | {v['scenario']} {sc['name']} — {sc['question']} |",
                 f"| 시연 사용자 | {', '.join(sc['users'])} |", "",
                 "## 연출", "",
                 f"- 진행자(가상 AI 아바타): {v['host']}",
                 f"- 배경·효과: {v['set']}",
                 f"- 말투·자막: {v['tone']}", "",
                 "## 대본", "",
                 "내레이션은 글자 그대로 읽어 주세요. `transcripts.json`과 같은 문장이라 바꾸면 검증 결과가 달라집니다.", "",
                 "| 시점 | 내레이션 | 화면 자막 | 화면 연출 |", "|---|---|---|---|"]
        lines += [f"| {tm} | {t} | {cap} | {d} |" for tm, t, cap, d in v["segments"]]
        lines += ["", "## 업로드 정보", "",
                  f"- 썸네일 문구: {v['thumbnail']}",
                  f"- 제목: {v['title']}",
                  f"- 설명란: {v['description']} / 본 영상은 WON Check 시연용으로 제작한 가상 영상이며 실제 인물·채널과 무관합니다.",
                  f"- 해시태그: {' '.join(v['hashtags'])}"]
        lines += ["", "## 의도한 검증 결과", ""]
        lines += [f"- **{lab[c['expected_status']]}** — {c['text']}: {c['reason']}" for c in v["claims"]]
        if v["risk_signals"]:
            lines += ["", "## 의도한 위험 신호", ""]
            lines += [f"- **{ {'DANGER': '위험', 'CAUTION': '주의'}[r['level']] }** {r['type']} — \"{r['quote']}\": {r['reason']}" for r in v["risk_signals"]]
        lines += ["", "## 제작 메모", "",
                  "- 영상 내내 하단에 '시연용 가상 영상 · 실제 인물·채널과 무관' 문구를 작게 띄우세요.",
                  "- 실존 인물 얼굴·목소리, 회사 로고, 실제 증권사·방송사 화면은 쓰지 마세요.",
                  "- 내레이션 속 숫자와 표현은 검증 대상입니다. 바꾸려면 `data/build_data.py`를 고치고 다시 생성하세요.",
                  "- 업로드 후 실제 video_id로 `build_data.py`의 video_id를 바꾸고 다시 생성하세요(transcripts.json 키·url이 함께 바뀜)."]
        (SCRIPTS / f"{v['video_id']}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    from collections import Counter
    print("근거 문장(회사별):", dict(Counter(d["metadata"]["company"] for d in disc)))
    print(f"disclosures={len(disc)} videos={len(VIDEOS)} claims={sum(len(v['claims']) for v in VIDEOS)} users={len(USERS)}")


if __name__ == "__main__":
    main()
