"""WON Check 시연 데이터 생성: data/*.json, scripts/*.md

근거 기업 5곳: 삼성전자, SK하이닉스, 현대자동차, 네이버, 카카오 (시연 영상 3개는 앞의 3곳에 1개씩).
위험 신호 근거: 금융위·금감원 안내 5문장(company="금융당국").
수치는 각 사 공식 실적 발표 자료와 대조했다(2026-10-27 확인). SK하이닉스는 회사 뉴스룸 접속이 막혀
회사 발표를 그대로 인용한 언론 보도로 대조했고, document_type에 그 사실을 표시했다.
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
    # 기업이 아니라 위험 신호 판단 근거(금융위·금감원 안내). 검색 시 company="금융당국"으로 필터
    "금융당국": {"company_code": "", "stock_code": "", "sector": "감독당국", "demo": False, "is_regulator": True,
             "aliases": ["금융위원회", "금융감독원", "금감원", "금융위"]},
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

    # ---- SK하이닉스 (회사 발표를 인용한 언론 보도)
    "HX_2025FY": {"company": "SK하이닉스", "source_title": "SK하이닉스 2025년 연간 실적 발표(연합뉴스 보도)",
                  "document_type": "언론 보도(회사 실적 발표 인용)", "published_at": "2026-01-29",
                  "source_url": "https://v.daum.net/v/VEZrd6qFW7"},
    "HX_2026Q1": {"company": "SK하이닉스", "source_title": "SK하이닉스 2026년 1분기 실적 발표(스마트투데이 보도)",
                  "document_type": "언론 보도(회사 실적 발표 인용)", "published_at": "2026-04-23",
                  "source_url": "https://www.smarttoday.co.kr/ko-kr/articles/106831"},
    "HX_2026Q2": {"company": "SK하이닉스", "source_title": "SK하이닉스 2026년 2분기 실적 발표(뉴시스 보도)",
                  "document_type": "언론 보도(회사 실적 발표 인용)", "published_at": "2026-07-29",
                  "source_url": "https://www.newsis.com/view/NISX20260729_0003728008"},
    "HX_2026Q3_SCHEDULE": {"company": "SK하이닉스", "source_title": "SK하이닉스 3분기 실적 발표 예정 보도(머니투데이)",
                           "document_type": "실적 발표 일정(언론 보도)", "published_at": "2026-10-19",
                           "source_url": "https://www.mt.co.kr/article/2026101913371799572"},
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
    "HMC_2026Q3_SCHEDULE": {"company": "현대자동차", "source_title": "현대자동차 3분기 실적 발표 일정(실적 캘린더)",
                            "document_type": "실적 발표 일정(외부 캘린더)", "published_at": "2026-10-27",
                            "source_url": "https://www.knowingasset.com/app/calendar/7807"},
    # ---- 네이버 (회사 공식)
    "NV_2025FY": {"company": "네이버", "source_title": "네이버 2025년 4분기 및 연간 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-02-06", "source_url": "https://www.navercorp.com/media/pressReleasesDetail?seq=34325"},
    "NV_2026Q1": {"company": "네이버", "source_title": "네이버 2026년 1분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-04-30", "source_url": "https://navercorp.com/media/pressReleasesDetail?seq=34994"},
    "NV_2026Q2": {"company": "네이버", "source_title": "네이버 2026년도 2분기 실적발표(IR 자료)", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-08-07",
                  "source_url": "https://navercorp.com/api/article/download/a769655e-43a9-4be8-8e78-d091981b1803"},
    # ---- 카카오 (회사 공식)
    "KK_2025FY": {"company": "카카오", "source_title": "카카오 2025년 연간 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-02-12", "source_url": "https://www.kakaocorp.com/page/detail/11931"},
    "KK_2026Q1": {"company": "카카오", "source_title": "카카오 2026년 1분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-05-07", "source_url": "https://www.kakaocorp.com/page/detail/12023"},
    # ---- 금융당국 안내 (위험 신호 근거)
    "REG_IMPERSONATION": {"company": "금융당국", "source_title": "금감원, 핀플루언서 사칭 투자사기 유의(조세금융신문 보도)",
                          "document_type": "감독당국 소비자 경보(언론 보도)", "published_at": "2026-04-28",
                          "source_url": "https://www.tfmedia.co.kr/news/article.html?no=204107"},
    "REG_UNFAIR": {"company": "금융당국", "source_title": "금융위·금감원, 핀플루언서 등의 불공정거래 집중 점검 및 고강도 조사",
                   "document_type": "감독당국 보도자료(KDI 경제정보센터 게시)", "published_at": "2026-03-23",
                   "source_url": "https://eiec.kdi.re.kr/policy/materialView.do?num=278290"},
    "REG_UIA_AD": {"company": "금융당국", "source_title": "유사투자자문업 과장광고 주의(경북매일, 금융위·금감원 점검 결과 인용)",
                   "document_type": "감독당국 점검 결과(언론 보도)", "published_at": "2026-04-22",
                   "source_url": "https://kbmaeil.com/article/20260421500089"},
    "REG_UIA_1ON1": {"company": "금융당국", "source_title": "금감원, 유튜브 핀플루언서 불법행위 정황 포착(아시아경제 보도)",
                     "document_type": "감독당국 점검 결과(언론 보도)", "published_at": "2026-04-12",
                     "source_url": "https://view.asiae.co.kr/article/2026041215475771641"},
    "KK_2026Q2": {"company": "카카오", "source_title": "카카오 2026년 2분기 실적 발표", "document_type": "공식 실적발표 자료",
                  "published_at": "2026-08-06", "source_url": "https://www.kakaocorp.com/page/detail/12096"},
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
    ("hynix_001", "2025-FY", "HX_2025FY", "전사", "OPERATING_PROFIT", 47.21, "조원", False,
     "SK하이닉스의 2025년 연간 매출액은 약 97조 1,467억 원, 영업이익은 약 47조 2,063억 원으로 영업이익률은 49%다."),
    ("hynix_002", "2025-FY", "HX_2025FY", "HBM", "QUALITATIVE", None, "", False,
     "SK하이닉스는 2025년 HBM 매출이 전년보다 두 배 이상 늘어 역대 최대 실적에 기여했다고 밝혔다."),
    ("hynix_003", "2026-Q1", "HX_2026Q1", "전사", "OPERATING_PROFIT", 37.61, "조원", False,
     "SK하이닉스의 2026년 1분기 매출액은 약 52조 5,763억 원, 영업이익은 약 37조 6,103억 원으로 영업이익률은 72%다."),
    ("hynix_004", "2026-Q1", "HX_2026Q1", "전사", "GROWTH", None, "%", False,
     "SK하이닉스의 2026년 1분기 실적은 전년 동기 대비 매출 198.1%, 영업이익 405.5% 증가했다."),
    ("hynix_005", "2026-Q2", "HX_2026Q2", "전사", "OPERATING_PROFIT", 60.54, "조원", False,
     "SK하이닉스의 2026년 2분기 매출액은 약 79조 3,187억 원, 영업이익은 약 60조 5,426억 원으로 영업이익률은 76.3%다."),
    ("hynix_006", "2026-Q2", "HX_2026Q2", "전사", "GROWTH", None, "%", False,
     "SK하이닉스의 2026년 2분기 실적은 전년 동기 대비 매출 256.8%, 영업이익 557.2% 증가했다."),
    ("hynix_007", "2026-Q2", "HX_2026Q2", "HBM", "QUALITATIVE", None, "", False,
     "SK하이닉스는 2026년 2분기에 6세대 HBM4의 양산 출하를 시작했고 하반기에 생산을 본격 확대한다고 밝혔다."),
    ("hynix_008", "2026-Q3", "HX_2026Q3_SCHEDULE", "전사", "NOTICE", None, "", False,
     "SK하이닉스의 2026년 3분기 실적은 10월 29일 발표 예정이며, 2026년 10월 27일 기준으로 아직 공식 실적이 나오지 않았다. 증권사 전망치는 확정 실적이 아니다."),
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
    ("hyundai_008", "2026-Q3", "HMC_2026Q3_SCHEDULE", "전사", "NOTICE", None, "", False,
     "현대자동차의 2026년 3분기 실적은 10월 29일 발표 예정이며, 2026년 10월 27일 기준으로 아직 공식 실적이 나오지 않았다."),
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
    ("kakao_001", "2025-FY", "KK_2025FY", "전사", "OPERATING_PROFIT", 0.73, "조원", False,
     "카카오의 2025년 연간 매출액은 약 8조 991억 원으로 전년보다 3% 늘었고, 영업이익은 약 7,320억 원으로 48% 늘었다."),
    ("kakao_002", "2026-Q1", "KK_2026Q1", "전사", "OPERATING_PROFIT", 0.21, "조원", False,
     "카카오의 2026년 1분기 매출액은 약 1조 9,421억 원으로 전년 동기 대비 11% 늘었고, 영업이익은 약 2,114억 원으로 66% 늘었다."),
    ("kakao_003", "2026-Q2", "KK_2026Q2", "전사", "OPERATING_PROFIT", 0.28, "조원", False,
     "카카오의 2026년 2분기 매출액은 약 2조 985억 원으로 전년 동기 대비 9% 늘었고, 영업이익은 약 2,770억 원으로 36% 늘어 분기 기준 역대 최대다."),
    ("kakao_004", "2026-Q2", "KK_2026Q2", "플랫폼", "QUALITATIVE", None, "", False,
     "카카오의 2026년 2분기 플랫폼 부문 매출은 약 1조 2,303억 원으로 전년 동기 대비 17% 늘었고, 콘텐츠 부문 매출은 약 8,682억 원으로 1% 늘었다."),
]

# ---- 금융당국 안내: 위험 신호 판단 근거. segment에 해당 위험 유형 코드를 쉼표로 적는다.
D += [
    ("reg_001", "2026", "REG_IMPERSONATION", "LEADING_ROOM", "RISK_GUIDE", None, "", False,
     "금융감독원은 유명 핀플루언서를 사칭한 채널, 영상 댓글을 통한 주식 리딩방 가입 유도, 구독자가 많은 채널을 사들여 유료 리딩방으로 유인하는 수법을 확인했다며 투자자 주의를 당부했다."),
    ("reg_002", "2026", "REG_IMPERSONATION", "GUARANTEED_RETURN,LEADING_ROOM", "RISK_GUIDE", None, "", False,
     "금융감독원은 유튜브 등 SNS에서 고급 정보를 준다고 하거나 원금 보장·고수익을 언급하며 투자를 권유하는 경우 사기일 가능성이 매우 크며, 상대가 제도권 금융회사인지 먼저 확인해야 한다고 안내했다."),
    ("reg_003", "2026", "REG_UIA_AD", "GUARANTEED_RETURN,PAID_SIGNAL", "RISK_GUIDE", None, "", False,
     "유사투자자문업은 신고만으로 영업할 수 있는 제도권 밖 업종이며, 금융당국 점검에서 수익 보장이나 손실 보전을 약속하는 표시·광고가 주요 위반 유형으로 적발됐다."),
    ("reg_004", "2026", "REG_UNFAIR", "UNDISCLOSED_INFO", "RISK_GUIDE", None, "", False,
     "금융위원회와 금융감독원은 핀플루언서의 선행매매, 투자 심리를 악용한 허위사실·풍문 유포, 경영진과 공모한 허위 정보 유포를 불공정거래로 집중 점검·조사한다고 밝혔다. 근거 없는 정보를 맹목적으로 따르면 손실이나 형사처벌 등 불이익을 받을 수 있다."),
    ("reg_005", "2026", "REG_UIA_1ON1", "PAID_SIGNAL", "RISK_GUIDE", None, "", False,
     "금융감독원은 신고 없이 돈을 받고 종목과 매매 시점을 추천한 유튜브 채널의 불법 정황을 적발했으며, 유사투자자문업자의 1대1 투자 상담과 개별 투자 조언은 모두 불법이라고 밝혔다."),
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
                "filing_id": "",
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
    ("2025-FY", "전사", 97.1467, 47.2063, "HX_2025FY", False),
    ("2026-Q1", "전사", 52.5763, 37.6103, "HX_2026Q1", False),
    ("2026-Q2", "전사", 79.3187, 60.5426, "HX_2026Q2", False),
    ("2025-FY", "전사", 186.2545, 11.4679, "HMC_2025FY", False),
    ("2025-Q4", "전사", 46.8386, 1.6954, "HMC_2025FY", False),
    ("2026-Q1", "전사", 45.9389, 2.5147, "HMC_2026Q1", False),
    ("2026-Q2", "전사", 49.2153, 2.8509, "HMC_2026Q2", False),
    ("2025-FY", "전사", 12.0350, 2.2081, "NV_2025FY", False),
    ("2025-Q4", "전사", 3.1951, 0.6106, "NV_2025FY", False),
    ("2026-Q1", "전사", 3.2411, 0.5418, "NV_2026Q1", False),
    ("2026-Q2", "전사", 3.3888, 0.5203, "NV_2026Q2", False),
    ("2025-FY", "전사", 8.0991, 0.7320, "KK_2025FY", False),
    ("2025-Q4", "전사", 2.1332, 0.2034, "KK_2025FY", False),
    ("2026-Q1", "전사", 1.9421, 0.2114, "KK_2026Q1", False),
    ("2026-Q2", "전사", 2.0985, 0.2770, "KK_2026Q2", False),
]

# ------------------------------------------------------------------ 사용자(가상) — 우리투자증권 5단계
USERS = [
    {"user_id": "demo_user_01", "name": "박서연(가상)", "risk_tolerance": "공격투자형", "investment_horizon": "단기",
     "investment_style": "반도체 업황에 집중 투자, 수익 극대화 추구", "scenario": "S2",
     "holdings": [{"company": "삼성전자", "weight_pct": 45}, {"company": "SK하이닉스", "weight_pct": 35},
                  {"company": "현금성 자산", "weight_pct": 20}],
     "intent": {"type": "추가 매수 검토", "company": "SK하이닉스", "amount_krw": 5_000_000}},
    {"user_id": "demo_user_02", "name": "김도현(가상)", "risk_tolerance": "적극투자형", "investment_horizon": "중기",
     "investment_style": "성장주 중심이지만 업종 분산 유지", "scenario": "S2",
     "holdings": [{"company": "SK하이닉스", "weight_pct": 10}, {"company": "현대자동차", "weight_pct": 15},
                  {"company": "네이버", "weight_pct": 10}, {"company": "미국 S&P500 ETF", "weight_pct": 40},
                  {"company": "국내 채권형 펀드", "weight_pct": 15}, {"company": "현금성 자산", "weight_pct": 10}],
     "intent": {"type": "추가 매수 검토", "company": "SK하이닉스", "amount_krw": 3_000_000}},
    {"user_id": "demo_user_03", "name": "이도윤(가상)", "risk_tolerance": "위험중립형", "investment_horizon": "중기",
     "investment_style": "지수 ETF 위주, 개별 종목은 처음 검토", "scenario": "S1",
     "holdings": [{"company": "SK하이닉스", "weight_pct": 15}, {"company": "카카오", "weight_pct": 10},
                  {"company": "미국 S&P500 ETF", "weight_pct": 40}, {"company": "국내 채권형 펀드", "weight_pct": 20},
                  {"company": "현금성 자산", "weight_pct": 15}],
     "intent": {"type": "신규 매수 검토", "company": "삼성전자", "amount_krw": 3_000_000}},
    {"user_id": "demo_user_04", "name": "한지은(가상)", "risk_tolerance": "안정추구형", "investment_horizon": "장기",
     "investment_style": "원금 손실 최소화, 일부만 우량주 보유", "scenario": "S3",
     "holdings": [{"company": "현대자동차", "weight_pct": 25}, {"company": "국내 채권형 펀드", "weight_pct": 50},
                  {"company": "현금성 자산", "weight_pct": 25}],
     "intent": {"type": "보유 점검", "company": "현대자동차", "amount_krw": 0}},
    {"user_id": "demo_user_05", "name": "정영호(가상)", "risk_tolerance": "안정형", "investment_horizon": "장기",
     "investment_style": "퇴직금 보전 우선, 예금·채권 중심", "scenario": "S3",
     "holdings": [{"company": "정기예금·CMA", "weight_pct": 70}, {"company": "국내 채권형 펀드", "weight_pct": 30}],
     "intent": {"type": "리딩방 권유를 받고 투자 검토", "company": "현대자동차", "amount_krw": 10_000_000}},
]

# ------------------------------------------------------------------ 영상(가상 채널) — 영상당 검증 주장 3개
# video_id는 11자. 실제 업로드 후 실제 ID로 바꾸면 된다.
VIDEOS = [
    {"video_id": "WCdemoS1V01", "scenario": "S1", "companies": ["삼성전자"],
     "title": "삼성전자 영업이익 100조 시대, 지금 안 사면 늦습니다",
     "channel": "주식왕 데이빗(가상)", "published_at": "2026-10-12", "tone": "흥분된 말투, 빨간 화살표 자막",
     "segments": [
         ("0:00", "여러분, 삼성전자가 드디어 일냈습니다. 영업이익 100조 시대가 열렸어요.", "영업이익 100조 시대"),
         ("0:06", "이번 3분기 영업이익이 107조 넘게 나왔습니다. 분기 하나에 107조예요.", "3Q 영업이익 107조"),
         ("0:14", "매출은 아예 200조를 돌파했어요. 한 분기 매출이 200조입니다.", "분기 매출 200조 돌파"),
         ("0:22", "제가 볼 때 내년이면 주가 두 배는 그냥 갑니다.", "내년 주가 2배"),
         ("0:29", "지금 안 사면 진짜 늦어요. 매수 타이밍은 유료 멤버십에서 알려드릴게요.", "매수 타이밍은 멤버십에서"),
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
     "risk_signals": [
         {"type": "URGENCY", "level": "CAUTION", "quote": "지금 안 사면 진짜 늦어요", "expected_sources": [],
          "reason": "매수 재촉 표현. 위법 기준은 아니므로 주의 수준으로만 표시"},
         {"type": "PAID_SIGNAL", "level": "CAUTION", "quote": "매수 타이밍은 유료 멤버십에서 알려드릴게요",
          "expected_sources": ["reg_005"],
          "reason": "유료 매매 시점 추천. 유사투자자문업 신고 여부 확인 필요, 1:1 조언이면 불법"},
     ]},
    {"video_id": "WCdemoS2V02", "scenario": "S2", "companies": ["SK하이닉스"],
     "title": "SK하이닉스 3분기 77조 확정! 지금 비중 늘리세요",
     "channel": "실적으로 말하는 주식(가상)", "published_at": "2026-10-21", "tone": "뉴스 브리핑형, 그래프 자막",
     "segments": [
         ("0:00", "SK하이닉스 2분기 영업이익이 60조 원을 넘겼죠. 영업이익률이 76%입니다.", "2Q 영업이익 60조 · 이익률 76%"),
         ("0:08", "매출도 분기 80조 원을 돌파했고요.", "분기 매출 80조 돌파"),
         ("0:13", "그리고 3분기 영업이익은 77조 원으로 이미 확정됐습니다.", "3Q 영업이익 77조 확정"),
         ("0:20", "이미 보유하신 분들도 지금 비중을 늘리셔야 합니다.", "지금 비중 확대"),
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
          "reason": "3분기 실적은 10월 29일 발표 예정으로 아직 공식 수치가 없음. 77조 원은 증권사 전망치 수준이며 확정이 아님"},
     ],
     "risk_signals": [
         {"type": "URGENCY", "level": "CAUTION", "quote": "지금 비중을 늘리셔야 합니다", "expected_sources": [],
          "reason": "미확정 정보를 근거로 한 매수 재촉. 위법 기준은 아니므로 주의 수준"},
     ]},
    {"video_id": "WCdemoS3V03", "scenario": "S3", "companies": ["현대자동차"],
     "title": "현대차 관세 직격탄, 보유자는 지금 파세요 (갈아탈 종목은 방에서)",
     "channel": "팩트폭격 주식(가상)", "published_at": "2026-08-10", "tone": "단호한 말투, 검은 배경 빨간 자막 → 끝부분 속삭이는 말투",
     "segments": [
         ("0:00", "현대차, 이제 끝났습니다. 관세 때문에 1분기 영업이익이 30% 넘게 빠졌어요.", "관세 · 1Q 영업이익 -30%"),
         ("0:08", "2분기는 아예 적자로 돌아섰습니다.", "2Q 적자 전환"),
         ("0:13", "내년엔 이익이 반토막 날 거예요. 보유하신 분들 지금 파세요.", "내년 이익 반토막 · 지금 매도"),
         ("0:20", "갈아탈 종목은 저희 방에서만 알려드립니다. 회사 쪽에서 들은 얘기라 발표 전에 먼저 드려요.", "갈아탈 종목은 비밀방에서"),
         ("0:29", "저희 방은 수익 보장합니다. 인원 제한 있으니 DM 빨리 주세요.", "수익 보장 · 인원 제한 · DM"),
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
     "risk_signals": [
         {"type": "URGENCY", "level": "CAUTION", "quote": "보유하신 분들 지금 파세요", "expected_sources": [],
          "reason": "매도 재촉. 위법 기준은 아니므로 주의 수준"},
         {"type": "LEADING_ROOM", "level": "DANGER", "quote": "갈아탈 종목은 저희 방에서만 알려드립니다",
          "expected_sources": ["reg_001"], "reason": "금감원이 경고한 리딩방 유도 수법과 같은 유형"},
         {"type": "UNDISCLOSED_INFO", "level": "DANGER", "quote": "회사 쪽에서 들은 얘기라 발표 전에 먼저 드려요",
          "expected_sources": ["reg_004"], "reason": "미공개 정보 암시. 허위사실·풍문 유포는 불공정거래 점검 대상"},
         {"type": "GUARANTEED_RETURN", "level": "DANGER", "quote": "저희 방은 수익 보장합니다",
          "expected_sources": ["reg_002", "reg_003"], "reason": "금감원이 사기 가능성이 매우 크다고 경고한 수익 보장 표현"},
     ]},
]

SCENARIOS = {
    "S1": {"name": "신규 투자 검토", "users": ["demo_user_03"], "question": "영상의 근거가 맞고, 내 투자 목적에도 맞을까?"},
    "S2": {"name": "추가 매수 검토", "users": ["demo_user_01", "demo_user_02"], "question": "더 사면 자산 구성이 어떻게 달라질까?"},
    "S3": {"name": "보유 점검 · 리딩방 권유", "users": ["demo_user_04", "demo_user_05"], "question": "기존 보유 이유를 다시 봐야 할까? 이 권유를 믿어도 될까?"},
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
            "transcript": " ".join(t for _, t, _ in v["segments"]),
            "segments": [{"time": tm, "text": t, "caption": cap} for tm, t, cap in v["segments"]],
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
                 f"- 채널: {v['channel']} · 게시일(설정): {v['published_at']} · 세로형 쇼츠 30초 내외",
                 f"- 다루는 기업: {', '.join(v['companies'])}",
                 f"- 시나리오: {v['scenario']} {sc['name']} — {sc['question']}",
                 f"- 톤·연출: {v['tone']}", "",
                 "## 대본", "", "| 시점 | 내레이션 | 화면 자막 |", "|---|---|---|"]
        lines += [f"| {tm} | {t} | {cap} |" for tm, t, cap in v["segments"]]
        lines += ["", "## 의도한 검증 결과", ""]
        lines += [f"- **{lab[c['expected_status']]}** — {c['text']}: {c['reason']}" for c in v["claims"]]
        if v["risk_signals"]:
            lines += ["", "## 의도한 위험 신호", ""]
            lines += [f"- **{ {'DANGER': '위험', 'CAUTION': '주의'}[r['level']] }** {r['type']} — \"{r['quote']}\": {r['reason']}" for r in v["risk_signals"]]
        lines += ["", "> 영상 하단에 '시연용으로 제작한 가상 영상입니다. 실제 인물·채널과 무관합니다.' 표기를 넣으세요.",
                  "> 업로드 후 실제 video_id로 transcripts.json의 키와 url을 바꾸세요."]
        (SCRIPTS / f"{v['video_id']}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    from collections import Counter
    print("근거 문장(회사별):", dict(Counter(d["metadata"]["company"] for d in disc)))
    print(f"disclosures={len(disc)} videos={len(VIDEOS)} claims={sum(len(v['claims']) for v in VIDEOS)} users={len(USERS)}")


if __name__ == "__main__":
    main()
