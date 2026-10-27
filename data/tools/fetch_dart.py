"""OpenDART에서 공식 공시를 내려받아 data/raw/dart/ 에 저장한다 (표준 라이브러리만 사용).

내려받는 것
  1. 회사 기본정보(company.json)          → 고유번호·종목코드 확인
  2. 거래소 공시 목록(list.json, 2026년)  → 영업(잠정)실적, 기업설명회(IR) 개최 안내
  3. 위 공시들의 원문(document.xml)       → 텍스트로 변환해 저장
  4. 주요 재무계정(fnlttSinglAcnt.json)   → 2025 사업보고서, 2026 1분기·반기 보고서의 매출액·영업이익

사용법 (OpenDART 접속이 되는 PC에서)
    # .env 에 OPENDART_API_KEY=... 를 넣거나 환경 변수로 지정
    python data/tools/fetch_dart.py
    python data/tools/fetch_dart.py --since 20250101    # 조회 시작일 변경

결과
    data/raw/dart/companies.json
    data/raw/dart/filings.json                 (공시 목록 + 원문 URL)
    data/raw/dart/docs/<rcept_no>.txt          (공시 원문 텍스트)
    data/raw/dart/financials.json              (주요 재무계정)
"""
import argparse
import datetime as dt
import io
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import zipfile
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "raw" / "dart"
API = "https://opendart.fss.or.kr/api"

COMPANIES = {
    "00126380": "삼성전자",
    "00164779": "SK하이닉스",
    "00164742": "현대자동차",
    "00266961": "네이버",
    "00258801": "카카오",
}
# 원문까지 받을 공시 제목 키워드
KEYWORDS = ["영업(잠정)실적", "기업설명회"]
# 주요 재무계정: (사업연도, 보고서 코드, 이름)
REPORTS = [("2025", "11011", "2025 사업보고서"), ("2026", "11013", "2026 1분기보고서"),
           ("2026", "11012", "2026 반기보고서"), ("2026", "11014", "2026 3분기보고서")]


def api_key():
    key = os.getenv("OPENDART_API_KEY")
    env = ROOT / ".env"
    if not key and env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENDART_API_KEY="):
                key = line.split("=", 1)[1].strip()
    if not key:
        sys.exit("OPENDART_API_KEY가 없습니다. 루트 .env 에 OPENDART_API_KEY=... 를 추가하세요.")
    return key


def get(path, **params):
    url = f"{API}/{path}?{urllib.parse.urlencode(params)}"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=30) as r:
                return r.read()
        except Exception as e:  # 네트워크 오류 재시도
            if attempt == 2:
                raise
            print(f"  재시도({e})")
            time.sleep(2)


def get_json(path, **params):
    data = json.loads(get(path, **params).decode("utf-8"))
    status = data.get("status")
    if status not in ("000", "013"):  # 013 = 조회된 데이터 없음
        print(f"  [DART {status}] {data.get('message')} ({path} {params.get('corp_code', '')})")
    return data


def xml_to_text(raw):
    text = raw.decode("utf-8", errors="ignore")
    text = re.sub(r"<(TR|P|BR|TABLE|TITLE)[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<(TD|TH|TE|TU)[^>]*>", " | ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    text = re.sub(r"[ \t ]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text)
    return text.strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", default="20260101")
    a = ap.parse_args()
    key = api_key()
    today = dt.date.today().strftime("%Y%m%d")
    (OUT / "docs").mkdir(parents=True, exist_ok=True)

    # 1. 회사 정보
    companies = []
    for code, name in COMPANIES.items():
        d = get_json("company.json", crtfc_key=key, corp_code=code)
        companies.append({"corp_code": code, "expected_name": name, "corp_name": d.get("corp_name"),
                          "stock_name": d.get("stock_name"), "stock_code": d.get("stock_code"),
                          "status": d.get("status")})
        print(f"[회사] {code} {name} → {d.get('corp_name')} / {d.get('stock_code')}")
    (OUT / "companies.json").write_text(json.dumps(companies, ensure_ascii=False, indent=2), encoding="utf-8")

    # 2·3. 거래소 공시 목록과 원문
    filings = []
    for code, name in COMPANIES.items():
        page = 1
        while True:
            d = get_json("list.json", crtfc_key=key, corp_code=code, bgn_de=a.since, end_de=today,
                         pblntf_ty="I", page_no=page, page_count=100)
            for f in d.get("list", []):
                if any(k in f["report_nm"] for k in KEYWORDS):
                    f["company"] = name
                    f["viewer_url"] = f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={f['rcept_no']}"
                    filings.append(f)
            if page >= int(d.get("total_page", 1) or 1):
                break
            page += 1
    for f in filings:
        path = OUT / "docs" / f"{f['rcept_no']}.txt"
        if not path.exists():
            raw = get("document.xml", crtfc_key=key, rcept_no=f["rcept_no"])
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as z:
                    text = "\n\n".join(xml_to_text(z.read(n)) for n in z.namelist())
            except zipfile.BadZipFile:
                text = "[원문 변환 실패] " + raw[:300].decode("utf-8", errors="ignore")
            path.write_text(f"{f['company']} | {f['report_nm']} | {f['rcept_dt']} | {f['viewer_url']}\n\n{text}",
                            encoding="utf-8")
            time.sleep(0.3)
        print(f"[공시] {f['company']} {f['rcept_dt']} {f['report_nm'].strip()}")
    (OUT / "filings.json").write_text(json.dumps(filings, ensure_ascii=False, indent=2), encoding="utf-8")

    # 4. 주요 재무계정 (연결재무제표 CFS 기준 매출액·영업이익·당기순이익)
    fin = []
    for code, name in COMPANIES.items():
        for year, rc, label in REPORTS:
            d = get_json("fnlttSinglAcnt.json", crtfc_key=key, corp_code=code, bsns_year=year, reprt_code=rc)
            for row in d.get("list", []):
                if row.get("fs_div") == "CFS" and row.get("account_nm") in ("매출액", "영업수익", "영업이익", "당기순이익"):
                    fin.append({"company": name, "corp_code": code, "report": label, "rcept_no": row.get("rcept_no"),
                                "viewer_url": f"https://dart.fss.or.kr/dsaf001/main.do?rcpNo={row.get('rcept_no')}",
                                **{k: row.get(k) for k in ("account_nm", "thstrm_nm", "thstrm_amount",
                                                           "thstrm_add_amount", "frmtrm_nm", "frmtrm_amount",
                                                           "frmtrm_add_amount", "currency")}})
            time.sleep(0.2)
        print(f"[재무] {name} 완료")
    (OUT / "financials.json").write_text(json.dumps(fin, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n완료: {OUT} (공시 {len(filings)}건, 재무 {len(fin)}행)")


if __name__ == "__main__":
    main()
