"""WON Check 시연 데이터 생성: data/*.json, scripts/*.md

모든 수치는 삼성전자 공식 실적 발표 자료(뉴스룸·IR 컨퍼런스콜 자료)와 대조했다(2026-10-26 확인).
문장은 원문을 옮기지 않고 RAG용으로 정규화·요약했다(팀 확정안 6장 방식).
사용자·영상 채널은 가상이다.

    python build_data.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).parent
DATA, SCRIPTS = ROOT, ROOT / "scripts"
SCRIPTS.mkdir(exist_ok=True)

COMPANY = {"company": "삼성전자", "company_code": "00126380", "stock_code": "005930"}

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


def disclosures():
    out = []
    for id_, period, src, seg, metric, value, unit, prelim, doc in D:
        s = SOURCES[src]
        out.append({
            "id": id_,
            "document": doc,
            "metadata": {
                **{k: COMPANY[k] for k in ("company", "company_code")},
                "stock_code": COMPANY["stock_code"],
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
]

# ------------------------------------------------------------------ 사용자(가상) — 우리투자증권 5단계
USERS = [
    {"user_id": "demo_user_01", "name": "박서연(가상)", "risk_tolerance": "공격투자형", "investment_horizon": "단기",
     "investment_style": "반도체 업황에 집중 투자, 수익 극대화 추구", "scenario": "S2",
     "holdings": [{"company": "삼성전자", "weight_pct": 60}, {"company": "국내 반도체 ETF", "weight_pct": 25},
                  {"company": "현금성 자산", "weight_pct": 15}],
     "intent": {"type": "추가 매수 검토", "company": "삼성전자", "amount_krw": 5_000_000}},
    {"user_id": "demo_user_02", "name": "김도현(가상)", "risk_tolerance": "적극투자형", "investment_horizon": "중기",
     "investment_style": "성장주 중심이지만 업종 분산 유지", "scenario": "S2",
     "holdings": [{"company": "삼성전자", "weight_pct": 15}, {"company": "미국 S&P500 ETF", "weight_pct": 45},
                  {"company": "국내 채권형 펀드", "weight_pct": 25}, {"company": "현금성 자산", "weight_pct": 15}],
     "intent": {"type": "추가 매수 검토", "company": "삼성전자", "amount_krw": 3_000_000}},
    {"user_id": "demo_user_03", "name": "이도윤(가상)", "risk_tolerance": "위험중립형", "investment_horizon": "중기",
     "investment_style": "지수 ETF 위주, 개별 종목은 처음 검토", "scenario": "S1",
     "holdings": [{"company": "미국 S&P500 ETF", "weight_pct": 50}, {"company": "국내 반도체 ETF", "weight_pct": 20},
                  {"company": "국내 채권형 펀드", "weight_pct": 20}, {"company": "현금성 자산", "weight_pct": 10}],
     "intent": {"type": "신규 매수 검토", "company": "삼성전자", "amount_krw": 3_000_000}},
    {"user_id": "demo_user_04", "name": "한지은(가상)", "risk_tolerance": "안정추구형", "investment_horizon": "장기",
     "investment_style": "원금 손실 최소화, 일부만 우량주 보유", "scenario": "S3",
     "holdings": [{"company": "삼성전자", "weight_pct": 20}, {"company": "국내 채권형 펀드", "weight_pct": 55},
                  {"company": "현금성 자산", "weight_pct": 25}],
     "intent": {"type": "보유 점검", "company": "삼성전자", "amount_krw": 0}},
    {"user_id": "demo_user_05", "name": "정영호(가상)", "risk_tolerance": "안정형", "investment_horizon": "장기",
     "investment_style": "퇴직금 보전 우선, 예금·채권 중심", "scenario": "S3",
     "holdings": [{"company": "정기예금·CMA", "weight_pct": 70}, {"company": "국내 채권형 펀드", "weight_pct": 30}],
     "intent": {"type": "신규 매수 검토(리딩방 권유)", "company": "삼성전자", "amount_krw": 10_000_000}},
]

# ------------------------------------------------------------------ 영상(가상 채널) — 영상당 검증 주장 3개
# video_id는 11자. 실제 업로드 후 실제 ID로 바꾸면 된다.
VIDEOS = [
    {"video_id": "WCdemoS1A01", "scenario": "S1", "title": "삼성전자 영업이익 100조 시대, 지금 안 사면 늦습니다",
     "channel": "주식왕 데이빗(가상)", "published_at": "2026-10-12", "tone": "흥분된 말투, 빨간 화살표 자막",
     "segments": [
         ("0:00", "여러분, 삼성전자가 드디어 일냈습니다. 영업이익 100조 시대가 열렸어요.", "영업이익 100조 시대"),
         ("0:06", "이번 3분기 영업이익이 107조 넘게 나왔습니다. 분기 하나에 107조예요.", "3Q 영업이익 107조"),
         ("0:14", "매출은 아예 200조를 돌파했어요. 한 분기 매출이 200조입니다.", "분기 매출 200조 돌파"),
         ("0:22", "제가 볼 때 내년이면 주가 두 배는 그냥 갑니다.", "내년 주가 2배"),
         ("0:29", "지금 안 사면 진짜 늦어요. 매수 타이밍은 멤버십에서 알려드릴게요.", "매수 타이밍은 멤버십에서"),
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
     "risk_signals": ["매수 재촉(지금 안 사면 늦는다)", "유료 멤버십 매매 신호"]},
    {"video_id": "WCdemoS1B02", "scenario": "S1", "title": "삼성전자 2분기, 반도체가 다 벌었다? 숫자로 봅시다",
     "channel": "반도체 읽어주는 연구원(가상)", "published_at": "2026-08-05", "tone": "차분한 설명형, 실적 자료 화면",
     "segments": [
         ("0:00", "삼성전자 2분기 실적, 숫자로만 짧게 정리하겠습니다.", "2Q 숫자 체크"),
         ("0:05", "반도체 부문인 DS가 2분기에 영업이익 89조 원 넘게 벌었어요. 회사 전체 이익이 89조 5천억이니 거의 전부죠.", "DS 영업이익 89.2조 ≈ 전사 이익"),
         ("0:15", "반면 모바일·가전인 DX부문은 2분기에 적자를 냈습니다.", "DX 2Q 적자"),
         ("0:21", "그리고 삼성이 HBM 시장 점유율 1위를 되찾았다는 얘기가 많아요.", "HBM 점유율 1위 탈환?"),
         ("0:28", "저는 이 종목을 보유하지 않고, 숫자는 회사 실적 발표 기준입니다.", "미보유 · 실적 발표 기준"),
     ],
     "claims": [
         {"text": "삼성전자 DS부문은 2026년 2분기 영업이익 89조 원 이상을 기록해 전사 영업이익의 대부분을 차지했다",
          "claim_type": "FINANCIAL", "period": "2026-Q2", "expected_status": "SUPPORTED",
          "expected_sources": ["samsung_020", "samsung_019"], "reason": "DS 영업이익 약 89.2조 원 / 전사 약 89.5조 원(약 99.7%)"},
         {"text": "삼성전자 DX부문은 2026년 2분기에 적자를 기록했다", "claim_type": "FINANCIAL", "period": "2026-Q2",
          "expected_status": "SUPPORTED", "expected_sources": ["samsung_021"], "reason": "DX 영업손실 약 0.8조 원"},
         {"text": "삼성전자가 HBM 시장 점유율 1위를 되찾았다", "claim_type": "DISCLOSURE", "period": None,
          "expected_status": "INSUFFICIENT_EVIDENCE", "expected_sources": [],
          "reason": "회사 실적 자료에 시장 점유율 순위 근거가 없음(HBM4 양산·공급 확대 사실과는 별개)"},
     ],
     "risk_signals": []},
    {"video_id": "WCdemoS2A03", "scenario": "S2", "title": "삼성전자 분기마다 이익 두 배, 더 사도 됩니다",
     "channel": "부자되는 차트쌤(가상)", "published_at": "2026-10-15", "tone": "과장된 리액션, 금색 자막",
     "segments": [
         ("0:00", "삼성전자 아직도 안 사셨어요? 올해 1분기에만 작년 1년치 영업이익보다 더 벌었어요.", "1Q > 작년 1년치"),
         ("0:08", "그리고 분기마다 영업이익이 두 배씩 늘고 있습니다. 이건 수학이에요.", "분기마다 이익 2배"),
         ("0:15", "이 사이클은 2028년까지 무조건 갑니다. 원금 걱정 없어요.", "2028년까지 무조건, 원금 걱정 X"),
         ("0:23", "이미 갖고 계신 분들도 지금 더 담으세요. 실시간 신호는 VIP방에서 드립니다.", "추가 매수 · VIP방"),
     ],
     "claims": [
         {"text": "삼성전자의 2026년 1분기 영업이익은 2025년 연간 영업이익보다 많다", "claim_type": "FINANCIAL", "period": "2026-Q1",
          "expected_status": "SUPPORTED", "expected_sources": ["samsung_015", "samsung_002"],
          "reason": "2026년 1분기 약 57.2조 원 > 2025년 연간 약 43.6조 원"},
         {"text": "삼성전자의 2026년 분기 영업이익은 1분기, 2분기, 3분기로 갈 때마다 두 배씩 늘고 있다", "claim_type": "FINANCIAL", "period": "2026-Q1~Q3",
          "expected_status": "CONTRADICTED", "expected_sources": ["samsung_015", "samsung_019", "samsung_024"],
          "reason": "1→2분기 약 1.56배(57.2→89.5), 2→3분기 약 1.20배(89.5→107.4, 잠정). 증가는 맞지만 두 배는 아님"},
         {"text": "반도체 호황은 2028년까지 계속될 것이다", "claim_type": "PREDICTION", "period": None,
          "expected_status": "PREDICTION", "expected_sources": [], "reason": "미래 업황 전망"},
     ],
     "risk_signals": ["원금 보장 암시(원금 걱정 없어요)", "추가 매수 재촉", "유료 VIP방 매매 신호"]},
    {"video_id": "WCdemoS2B04", "scenario": "S2", "title": "삼성전자 3분기 이익 10배? 작년이랑 비교해 봤습니다",
     "channel": "실적으로 말하는 주식(가상)", "published_at": "2026-10-10", "tone": "뉴스 브리핑형, 그래프 자막",
     "segments": [
         ("0:00", "작년 삼성전자 연간 영업이익은 43조 원 수준이었습니다.", "2025년 영업이익 43조"),
         ("0:07", "그런데 이번 3분기 영업이익은 1년 전 같은 분기보다 10배로 늘었어요.", "3Q 영업이익 전년 대비 10배"),
         ("0:15", "이 추세면 4분기도 사상 최대 실적은 확정이라고 봅니다.", "4Q 사상 최대 확정?"),
         ("0:22", "다만 반도체 비중이 너무 높아서 업황이 꺾이면 충격도 클 수 있어요.", "리스크: 반도체 쏠림"),
     ],
     "claims": [
         {"text": "삼성전자의 2025년 연간 영업이익은 약 43조 원이다", "claim_type": "FINANCIAL", "period": "2025-FY",
          "expected_status": "SUPPORTED", "expected_sources": ["samsung_002"], "reason": "2025년 연간 약 43.6조 원"},
         {"text": "삼성전자의 2026년 3분기 영업이익은 전년 동기보다 10배 늘었다", "claim_type": "FINANCIAL", "period": "2026-Q3",
          "expected_status": "CONTRADICTED", "expected_sources": ["samsung_025", "samsung_024", "samsung_008"],
          "reason": "전년 동기 대비 782.50% 증가 = 약 8.8배(12.2조 → 107.4조, 잠정). 10배는 아님"},
         {"text": "삼성전자는 4분기에도 사상 최대 실적을 낼 것이다", "claim_type": "PREDICTION", "period": "2026-Q4",
          "expected_status": "PREDICTION", "expected_sources": ["samsung_023"],
          "reason": "아직 발표되지 않은 미래 실적. 회사 전망(하반기 성장 전망)은 확정이 아님"},
     ],
     "risk_signals": []},
    {"video_id": "WCdemoS3A05", "scenario": "S3", "title": "삼성전자 고점 끝났다, 보유자는 지금 파세요",
     "channel": "팩트폭격 주식(가상)", "published_at": "2026-10-14", "tone": "단호한 말투, 검은 배경 빨간 자막",
     "segments": [
         ("0:00", "삼성전자, 이제 고점 끝났습니다. 3분기 실적이 꺾였어요. 이익이 줄었습니다.", "3Q 실적 꺾임"),
         ("0:08", "게다가 DX부문, 모바일이랑 가전은 올해 내내 적자예요.", "DX 올해 내내 적자"),
         ("0:15", "메모리 가격은 곧 폭락합니다. 보유하신 분들 지금 파세요.", "메모리 폭락 · 지금 매도"),
     ],
     "claims": [
         {"text": "삼성전자의 2026년 3분기 영업이익은 직전 분기보다 줄었다", "claim_type": "FINANCIAL", "period": "2026-Q3",
          "expected_status": "CONTRADICTED", "expected_sources": ["samsung_025", "samsung_024", "samsung_019"],
          "reason": "잠정 영업이익은 직전 분기 대비 20.01% 증가(89.5조 → 107.4조)"},
         {"text": "삼성전자 DX부문은 2026년에 계속 적자를 냈다", "claim_type": "FINANCIAL", "period": "2026-Q1~Q2",
          "expected_status": "CONTRADICTED", "expected_sources": ["samsung_017", "samsung_021"],
          "reason": "1분기 영업이익 약 3조 원 흑자, 2분기 약 0.8조 원 적자. '계속 적자'는 사실과 다름"},
         {"text": "메모리 가격은 곧 폭락할 것이다", "claim_type": "PREDICTION", "period": None,
          "expected_status": "PREDICTION", "expected_sources": [], "reason": "미래 가격 전망"},
     ],
     "risk_signals": ["매도 재촉(지금 파세요)"]},
    {"video_id": "WCdemoS3B06", "scenario": "S3", "title": "삼성전자 3분기 확정 실적 120조, 미리 알려드립니다 (방 인원 제한)",
     "channel": "시크릿 리딩 클럽(가상)", "published_at": "2026-10-20", "tone": "속삭이는 말투, 모자이크 '내부 문서' 이미지",
     "segments": [
         ("0:00", "다들 3분기 잠정치만 보시죠? 확정 실적은 영업이익 120조로 이미 정해졌습니다.", "확정 실적 120조 이미 결정"),
         ("0:08", "제가 작년 4분기에도 반도체 영업이익 16조 넘는다고 맞혔잖아요.", "작년 4Q 반도체 16조 적중"),
         ("0:15", "회사 쪽에서 들은 얘기라 발표 전에 저희 방에서만 먼저 공유합니다.", "발표 전 비밀방 선공개"),
         ("0:22", "저희 방은 수익 보장합니다. 인원 제한 있으니 DM 빨리 주세요.", "수익 보장 · 인원 제한"),
     ],
     "claims": [
         {"text": "삼성전자의 2026년 3분기 확정 영업이익은 120조 원으로 이미 정해졌다", "claim_type": "FINANCIAL", "period": "2026-Q3",
          "expected_status": "CONTRADICTED", "expected_sources": ["samsung_024", "samsung_026"],
          "reason": "공식 잠정 영업이익은 약 107.4조 원이며 확정 실적은 아직 발표 전"},
         {"text": "삼성전자 반도체 부문의 2025년 4분기 영업이익은 16조 원을 넘었다", "claim_type": "FINANCIAL", "period": "2025-Q4",
          "expected_status": "SUPPORTED", "expected_sources": ["samsung_010"],
          "reason": "DS부문 영업이익 약 16.4조 원. 맞는 사실을 섞어 신뢰를 얻는 수법에 유의"},
         {"text": "이 리딩방에 들어오면 수익이 보장된다", "claim_type": "PREDICTION", "period": None,
          "expected_status": "PREDICTION", "expected_sources": [],
          "reason": "사실 판정 대상이 아닌 수익 보장 표현 — 위험 신호로 별도 표시"},
     ],
     "risk_signals": ["미공개 정보 암시", "리딩방 유도", "수익 보장", "인원 제한 재촉"]},
]

SCENARIOS = {
    "S1": {"name": "신규 투자 검토", "users": ["demo_user_03"], "question": "영상의 근거가 맞고, 내 투자 목적에도 맞을까?"},
    "S2": {"name": "추가 매수 검토", "users": ["demo_user_01", "demo_user_02"], "question": "더 사면 자산 구성이 어떻게 달라질까?"},
    "S3": {"name": "보유 점검 · 리딩방 권유", "users": ["demo_user_04", "demo_user_05"], "question": "기존 보유 이유를 다시 봐야 할까? 이 권유를 믿어도 될까?"},
}


def main():
    disc = disclosures()
    ids = {d["id"] for d in disc}
    for v in VIDEOS:  # 기대 출처가 실제로 적재되는지 확인
        for c in v["claims"]:
            missing = set(c["expected_sources"]) - ids
            assert not missing, (v["video_id"], missing)
    (DATA / "disclosures.json").write_text(json.dumps(disc, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "financial_facts.json").write_text(json.dumps([
        {**COMPANY, "period": p, "segment": s, "revenue_trillion_krw": r, "operating_profit_trillion_krw": o,
         "basis": "연결", "is_preliminary": pre, **{k: SOURCES[src][k] for k in ("source_title", "source_url", "published_at")}}
        for p, s, r, o, src, pre in FINANCIAL_FACTS], ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "users.json").write_text(json.dumps(USERS, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "transcripts.json").write_text(json.dumps({
        v["video_id"]: {
            "video_id": v["video_id"], "url": f"https://www.youtube.com/watch?v={v['video_id']}",
            "title": v["title"], "channel": v["channel"], "published_at": v["published_at"],
            "transcript_source": "PRELOADED_DEMO",
            "transcript": " ".join(t for _, t, _ in v["segments"]),
            "segments": [{"time": tm, "text": t, "caption": cap} for tm, t, cap in v["segments"]],
        } for v in VIDEOS}, ensure_ascii=False, indent=2), encoding="utf-8")
    (DATA / "expected_results.json").write_text(json.dumps({
        "note": "평가·리허설용 정답. 서버에 하드코딩하지 말 것(팀 확정안 7장).",
        "scenarios": SCENARIOS,
        "videos": [{"video_id": v["video_id"], "scenario": v["scenario"], "claims": v["claims"],
                    "risk_signals": v["risk_signals"]} for v in VIDEOS]}, ensure_ascii=False, indent=2), encoding="utf-8")

    lab = {"SUPPORTED": "근거 확인", "CONTRADICTED": "근거와 불일치", "INSUFFICIENT_EVIDENCE": "근거 부족", "PREDICTION": "예측"}
    for v in VIDEOS:
        sc = SCENARIOS[v["scenario"]]
        lines = [f"# {v['video_id']} · {v['title']}", "",
                 f"- 채널: {v['channel']} · 게시일(설정): {v['published_at']} · 세로형 쇼츠 30초 내외",
                 f"- 시나리오: {v['scenario']} {sc['name']} — {sc['question']}",
                 f"- 톤·연출: {v['tone']}", "",
                 "## 대본", "", "| 시점 | 내레이션 | 화면 자막 |", "|---|---|---|"]
        lines += [f"| {tm} | {t} | {cap} |" for tm, t, cap in v["segments"]]
        lines += ["", "## 의도한 검증 결과", ""]
        lines += [f"- **{lab[c['expected_status']]}** — {c['text']}: {c['reason']}" for c in v["claims"]]
        if v["risk_signals"]:
            lines += ["", "위험 신호: " + ", ".join(v["risk_signals"])]
        lines += ["", "> 영상 하단에 '시연용으로 제작한 가상 영상입니다. 실제 인물·채널과 무관합니다.' 표기를 넣으세요.",
                  "> 업로드 후 실제 video_id로 transcripts.json의 키와 url을 바꾸세요."]
        (SCRIPTS / f"{v['video_id']}.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"disclosures={len(disc)} videos={len(VIDEOS)} claims={sum(len(v['claims']) for v in VIDEOS)} users={len(USERS)}")


if __name__ == "__main__":
    main()
