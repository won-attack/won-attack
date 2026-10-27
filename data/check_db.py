"""적재된 ChromaDB가 근거를 제대로 찾는지 점검한다 (init_db.py로 적재한 뒤 실행).

무엇을 하나
    data/expected_results.json 에 적어 둔 시연 주장 7개(근거가 있는 FINANCIAL 주장)를
    백엔드와 같은 규칙(회사 → 기간 필터, Top 3)으로 검색해서
      1) 기대한 근거 문장이 Top 3 안에 나오는지
      2) 다른 회사 문장이 섞이지 않는지
    를 확인한다. 판정(맞다/틀리다)은 하지 않는다 → GPT 호출 없음, 임베딩 7번만.

사용법
    python data/check_db.py                     # data/chroma_db 점검
    python data/check_db.py --server            # 실행 중인 ChromaDB 서버 점검 (시연 직전)
    python data/check_db.py --query "하이닉스 2분기 매출 80조" --company SK하이닉스 --period 2026-Q2
    python data/check_db.py --fake --strict     # CI: 해시 벡터, 하나라도 빠지면 실패
"""
import argparse
import json

from init_db import ROOT, SERVER_DEFAULT, embed, open_collection


# ------------------------------------------------------------------ 검색 규칙 (백엔드 Java 검색이 따라야 할 기준 구현)
def search(col, claim, company="삼성전자", period=None, k=3, fake=False):
    """회사명 필터 우선. 기간은 확실할 때만(예: '2026-Q3') 필터, 결과가 없으면 회사 필터로 재검색."""
    q = embed([claim], fake)[0]
    where = {"company": company}
    if period and "~" in period:
        # 여러 분기를 비교하는 주장("2026-Q1~Q3")은 분기별로 하나씩 근거를 모은다
        year, rng = period.split("-", 1)
        a, b = (int(x.strip("Q")) for x in rng.split("~"))
        merged = {"ids": [[]], "documents": [[]], "metadatas": [[]], "distances": [[]]}
        for qn in range(a, b + 1):
            r = col.query(query_embeddings=[q], n_results=1, where={"$and": [where, {"period": f"{year}-Q{qn}"}]})
            for key in merged:
                merged[key][0].extend(r[key][0])
        if merged["ids"][0]:
            return merged
    if period and "~" not in period:
        res = col.query(query_embeddings=[q], n_results=k, where={"$and": [where, {"period": period}]})
        if res["ids"][0]:
            return res
    return col.query(query_embeddings=[q], n_results=k, where=where)


def search_claim(col, claim, companies, period=None, k=3, fake=False):
    """주장에 나온 회사마다 따로 검색한다. 두 회사를 비교하는 주장도 회사별 근거가 빠지지 않는다."""
    return {name: search(col, claim, company=name, period=period, k=k, fake=fake) for name in companies}


def check(col, fake=False, strict=False):
    exp = json.loads((ROOT / "expected_results.json").read_text(encoding="utf-8"))
    company_of = {d["id"]: d["metadata"]["company"]
                  for d in json.loads((ROOT / "disclosures.json").read_text(encoding="utf-8"))}
    hit = total = leak = 0
    for v in exp["videos"]:
        for c in v["claims"]:
            if not c["expected_sources"]:
                continue
            results = search_claim(col, c["text"], c["companies"], period=c["period"], fake=fake)
            ok = True
            got_all = []
            for name, res in results.items():
                got = res["ids"][0]
                got_all += got
                wrong = [g for g in got if company_of[g] != name]  # 회사 필터가 새는지
                leak += len(wrong)
                want = [s for s in c["expected_sources"] if company_of[s] == name]
                if want and not any(s in got for s in want):
                    ok = False
            hit += ok
            total += 1
            print(f"  [{'O' if ok else 'X'}] {v['video_id']} {'+'.join(c['companies']):18s} {c['expected_status']:21s}"
                  f" 기대 {c['expected_sources'][:2]} → {got_all}")
    print(f"\n근거 문장 적중(회사별 Top3): {hit}/{total} · 다른 회사 문서 섞임: {leak}건"
          + ("  (fake 벡터 결과 — 실제 품질은 API 키로 다시 확인)" if fake else ""))
    if strict and (hit < total or leak):
        raise SystemExit(1)


def main():
    ap = argparse.ArgumentParser(description="ChromaDB 근거 검색 점검")
    ap.add_argument("--fake", action="store_true", help="init_db.py --fake 로 적재한 DB를 점검(CI용)")
    ap.add_argument("--strict", action="store_true", help="기대 근거가 하나라도 Top3에 없으면 실패")
    ap.add_argument("--server", nargs="?", const=SERVER_DEFAULT, help="실행 중인 ChromaDB 서버를 점검")
    ap.add_argument("--query", help="주장 문장 하나로 직접 검색해 보기")
    ap.add_argument("--period", help="--query와 함께: 2026-Q2, 2025-FY, 2026-Q1~Q3")
    ap.add_argument("--company", default="삼성전자", help="--query와 함께: companies.json의 company")
    a = ap.parse_args()
    col, where_to = open_collection(a.server)
    if col.count() == 0:
        raise SystemExit(f"{where_to} 에 적재된 문장이 없습니다. 먼저 python data/init_db.py --reset")
    if a.query:
        res = search(col, a.query, company=a.company, period=a.period, fake=a.fake)
        for i, d, m, dist in zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]):
            print(f"- {i} (distance {dist:.3f}) [{m['period']}] {d}\n  {m['source_title']} {m['source_url']}")
    else:
        print(f"점검 대상: {where_to} ({col.count()}개 문장)")
        check(col, a.fake, a.strict)


if __name__ == "__main__":
    main()
