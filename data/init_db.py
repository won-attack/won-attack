"""공시 근거 문장 → 임베딩 → ChromaDB(`disclosures`) 적재 + 검색 점검 (팀 확정안 3·5장 규격)

규격: PersistentClient, 컬렉션 disclosures, OpenAI text-embedding-3-small(1536), cosine, Top 3,
      회사명 필터 우선 → 기간이 확실할 때만 기간 필터.

사용법
    pip install chromadb openai
    set OPENAI_API_KEY=sk-...            (macOS/Linux: export)
    python init_db.py                    # ./chroma_db 에 적재 후 평가셋으로 Top3 점검
    python init_db.py --reset            # 컬렉션을 지우고 다시 적재
    python init_db.py --fake             # API 키 없이 파이프라인만 시험(해시 벡터, 품질 무관)
    python init_db.py --query "삼성전자 3분기 영업이익 107조" --period 2026-Q3
    python init_db.py --query "하이닉스 2분기 매출 80조" --company SK하이닉스 --period 2026-Q2
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

import chromadb

ROOT = Path(__file__).parent
import os
DB_PATH = Path(os.getenv("CHROMA_PATH", ROOT / "chroma_db"))
COLLECTION = os.getenv("CHROMA_COLLECTION", "disclosures")
MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
DIM = 1536


# ------------------------------------------------------------------ 임베딩 (저장·검색에 같은 함수 사용)
def embed(texts, fake=False):
    if fake:
        out = []
        for t in texts:
            v = [0.0] * DIM
            for i in range(len(t) - 1):
                v[int(hashlib.md5(t[i:i + 2].encode()).hexdigest(), 16) % DIM] += 1.0
            n = math.sqrt(sum(x * x for x in v)) or 1.0
            out.append([x / n for x in v])
        return out
    from openai import OpenAI
    resp = OpenAI().embeddings.create(model=MODEL, input=texts)
    return [d.embedding for d in resp.data]


def get_collection(client, reset=False):
    if reset:
        try:
            client.delete_collection(COLLECTION)
        except Exception:
            pass
    return client.get_or_create_collection(COLLECTION, metadata={"hnsw:space": "cosine", "embedding_model": MODEL})


def load(fake=False, reset=False):
    rows = json.loads((ROOT / "disclosures.json").read_text(encoding="utf-8"))
    client = chromadb.PersistentClient(path=str(DB_PATH))
    col = get_collection(client, reset)
    vecs = embed([r["document"] for r in rows], fake)
    col.upsert(ids=[r["id"] for r in rows], documents=[r["document"] for r in rows],
               metadatas=[r["metadata"] for r in rows], embeddings=vecs)
    print(f"적재 완료: {col.count()}개 문장 → {DB_PATH} / 컬렉션 '{COLLECTION}' ({'fake' if fake else MODEL})")
    return col


# ------------------------------------------------------------------ 검색 (백엔드 rag.py가 옮길 로직)
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


REGULATOR = "금융당국"
RISK_TERMS = {
    "LEADING_ROOM": "리딩방 가입 유도 유료 리딩방 유인",
    "GUARANTEED_RETURN": "원금 보장 수익 보장 고수익 사기 가능성",
    "UNDISCLOSED_INFO": "미공개 정보 허위사실 풍문 불공정거래",
    "PAID_SIGNAL": "유료 종목 추천 매매 시점 유사투자자문업 1대1 투자 조언",
}


def search_risk(col, quote, risk_type, k=3, fake=False):
    """위험 신호 표현에 대한 금융당국 안내 검색. URGENCY(재촉)처럼 근거 유형이 없으면 검색하지 않는다."""
    return search(col, f"{quote} {RISK_TERMS.get(risk_type, '')}", company=REGULATOR, period=None, k=k, fake=fake)


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
    # 위험 신호: 영상 표현 + 유형 설명으로 금융당국 안내를 검색
    for v in exp["videos"]:
        for r in v.get("risk_signals", []):
            if not r["expected_sources"]:
                continue
            res = search_risk(col, r["quote"], r["type"], fake=fake)
            got = res["ids"][0]
            ok = any(s in got for s in r["expected_sources"])
            leak += sum(company_of[g] != REGULATOR for g in got)
            hit += ok
            total += 1
            print(f"  [{'O' if ok else 'X'}] {v['video_id']} {'위험 신호':18s} {r['type']:21s}"
                  f" 기대 {r['expected_sources']} → {got}")
    print(f"\n근거 문장 적중(회사별 Top3): {hit}/{total} · 다른 회사 문서 섞임: {leak}건"
          + ("  (fake 벡터 결과 — 실제 품질은 API 키로 다시 확인)" if fake else ""))
    if strict and (hit < total or leak):
        raise SystemExit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fake", action="store_true")
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--no-check", action="store_true")
    ap.add_argument("--strict", action="store_true", help="기대 근거가 하나라도 Top3에 없으면 실패(CI용)")
    ap.add_argument("--query")
    ap.add_argument("--period")
    ap.add_argument("--company", default="삼성전자", help="--query와 함께 쓰는 회사명 (companies.json의 company)")
    a = ap.parse_args()
    col = load(a.fake, a.reset)
    if a.query:
        res = search(col, a.query, company=a.company, period=a.period, fake=a.fake)
        for i, d, m, dist in zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]):
            print(f"- {i} (distance {dist:.3f}) [{m['period']}] {d}\n  {m['source_title']} {m['source_url']}")
    elif not a.no_check:
        check(col, a.fake, a.strict)


if __name__ == "__main__":
    main()
