"""공시 근거 문장 → 임베딩 → ChromaDB(`disclosures`) 적재 + 검색 점검 (팀 확정안 3·5장 규격)

규격: PersistentClient, 컬렉션 disclosures, OpenAI text-embedding-3-small(1536), cosine, Top 3,
      회사명 필터 우선 → 기간이 확실할 때만 기간 필터.

사용법
    pip install chromadb openai
    루트 .env 에 OPENAI_API_KEY=sk-... 한 줄 추가 (환경 변수로 지정해도 됨)
    python init_db.py                    # ./chroma_db 에 적재 후 평가셋으로 Top3 점검
    python init_db.py --reset            # 컬렉션을 지우고 다시 적재
    python init_db.py --fake             # API 키 없이 파이프라인만 시험(해시 벡터, 품질 무관)
    python init_db.py --server --reset --strict
                                         # 백엔드 ChromaDB 서버(docker, 기본 http://localhost:8000)에 적재
    python init_db.py --query "삼성전자 3분기 영업이익 107조" --period 2026-Q3
    python init_db.py --query "하이닉스 2분기 매출 80조" --company SK하이닉스 --period 2026-Q2
"""
import argparse
import hashlib
import json
import math
import urllib.error
import urllib.request
from pathlib import Path

import os

ROOT = Path(__file__).parent
REPO = ROOT.parent


def load_env(path=REPO / ".env"):
    """루트 .env 를 읽어 환경 변수로 넣는다(이미 지정된 값은 그대로 둔다)."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            if v.strip():
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_env()
_db = Path(os.getenv("CHROMA_PATH", ROOT / "chroma_db"))
DB_PATH = _db if _db.is_absolute() else (REPO / _db).resolve()
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


# ------------------------------------------------------------------ 백엔드 ChromaDB 서버 (HTTP v1 API)
class ServerCollection:
    """백엔드(Spring)와 같은 ChromaDB 서버(chromadb/chroma:0.6.3)에 HTTP로 붙는다.

    파이썬 chromadb 클라이언트는 버전마다 서버 API가 달라 깨지기 쉬워서, 백엔드 ChromaClient.java와
    똑같이 /api/v1 REST를 직접 호출한다. search()가 쓰는 query(where=...)·count()·upsert()만 구현.
    """

    def __init__(self, url, reset=False):
        self.url = url.rstrip("/")
        if reset:
            try:
                self._call("DELETE", f"/api/v1/collections/{COLLECTION}")
            except urllib.error.HTTPError:
                pass
        c = self._call("POST", "/api/v1/collections", {
            "name": COLLECTION, "get_or_create": True,
            "metadata": {"hnsw:space": "cosine", "embedding_model": MODEL}})
        self.id = c["id"]

    def _call(self, method, path, body=None):
        req = urllib.request.Request(self.url + path, method=method,
                                     data=None if body is None else json.dumps(body).encode("utf-8"),
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read().decode("utf-8")
        except urllib.error.URLError as e:
            if isinstance(e, urllib.error.HTTPError):
                raise
            raise SystemExit(f"ChromaDB 서버({self.url})에 연결할 수 없습니다. "
                             f"backend 폴더에서 'docker compose up -d'로 서버를 먼저 켜세요. ({e.reason})")
        return json.loads(raw) if raw else None

    def upsert(self, ids, documents, metadatas, embeddings):
        self._call("POST", f"/api/v1/collections/{self.id}/upsert",
                   {"ids": ids, "documents": documents, "metadatas": metadatas, "embeddings": embeddings})

    def count(self):
        return self._call("GET", f"/api/v1/collections/{self.id}/count")

    def query(self, query_embeddings, n_results, where=None):
        body = {"query_embeddings": query_embeddings, "n_results": n_results,
                "include": ["documents", "metadatas", "distances"]}
        if where:
            body["where"] = where
        return self._call("POST", f"/api/v1/collections/{self.id}/query", body)


def get_collection(client, reset=False):
    if reset:
        try:
            client.delete_collection(COLLECTION)
        except Exception:
            pass
    return client.get_or_create_collection(COLLECTION, metadata={"hnsw:space": "cosine", "embedding_model": MODEL})


def load(fake=False, reset=False, server=None):
    rows = json.loads((ROOT / "disclosures.json").read_text(encoding="utf-8"))
    if server:
        col, where_to = ServerCollection(server, reset), f"ChromaDB 서버 {server}"
    else:
        import chromadb
        col, where_to = get_collection(chromadb.PersistentClient(path=str(DB_PATH)), reset), str(DB_PATH)
    vecs = embed([r["document"] for r in rows], fake)
    # 백엔드(ChromaRagService)는 출처 제목을 metadata.title 로 읽는다
    metas = [{**r["metadata"], "title": r["metadata"]["source_title"]} for r in rows]
    col.upsert(ids=[r["id"] for r in rows], documents=[r["document"] for r in rows],
               metadatas=metas, embeddings=vecs)
    print(f"적재 완료: {col.count()}개 문장 → {where_to} / 컬렉션 '{COLLECTION}' ({'fake' if fake else MODEL})")
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
    ap = argparse.ArgumentParser()
    ap.add_argument("--fake", action="store_true")
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--no-check", action="store_true")
    ap.add_argument("--strict", action="store_true", help="기대 근거가 하나라도 Top3에 없으면 실패(CI용)")
    ap.add_argument("--query")
    ap.add_argument("--period")
    ap.add_argument("--company", default="삼성전자", help="--query와 함께 쓰는 회사명 (companies.json의 company)")
    ap.add_argument("--server", nargs="?", const=os.getenv("CHROMA_URL", "http://localhost:8000"),
                    help="백엔드 ChromaDB 서버에 적재 (기본 CHROMA_URL 또는 http://localhost:8000)")
    a = ap.parse_args()
    if a.server and a.fake:
        raise SystemExit("--server 에는 --fake 를 쓸 수 없습니다. 시연 DB에는 실제 임베딩만 넣으세요.")
    col = load(a.fake, a.reset, a.server)
    if a.query:
        res = search(col, a.query, company=a.company, period=a.period, fake=a.fake)
        for i, d, m, dist in zip(res["ids"][0], res["documents"][0], res["metadatas"][0], res["distances"][0]):
            print(f"- {i} (distance {dist:.3f}) [{m['period']}] {d}\n  {m['source_title']} {m['source_url']}")
    elif not a.no_check:
        check(col, a.fake, a.strict)


if __name__ == "__main__":
    main()
