"""공시 근거 문장 → 임베딩 → ChromaDB(`disclosures`) 적재. 점검은 check_db.py.

규격: 컬렉션 disclosures, OpenAI text-embedding-3-small(1536), cosine.

사용법
    pip install -r data/requirements.txt
    루트 .env 에 OPENAI_API_KEY=sk-... 한 줄 추가 (환경 변수로 지정해도 됨)
    python data/init_db.py --reset            # data/chroma_db 에 적재 (ChromaDB 서버는 꺼 둔 상태)
    python data/init_db.py --server --reset   # 실행 중인 로컬 ChromaDB 서버(기본 http://localhost:8000)에 적재
    python data/init_db.py --fake --reset     # API 키 없이 경로만 시험(해시 벡터, 품질 무관)
    → 적재 후 python data/check_db.py 로 근거가 제대로 검색되는지 확인
"""
import argparse
import hashlib
import json
import math
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


def get_collection(client, reset=False):
    if reset:
        try:
            client.delete_collection(COLLECTION)
        except Exception:
            pass
    return client.get_or_create_collection(COLLECTION, metadata={"hnsw:space": "cosine", "embedding_model": MODEL})


def open_collection(server=None, reset=False):
    """적재·점검이 같은 DB를 열도록 한 곳에서 연다: server 주소가 있으면 ChromaDB 서버, 없으면 data/chroma_db 폴더."""
    import chromadb
    if server:
        from urllib.parse import urlparse
        u = urlparse(server)
        try:
            client = chromadb.HttpClient(host=u.hostname or "localhost", port=u.port or 8000)
            client.heartbeat()
        except Exception as e:
            raise SystemExit(f"ChromaDB 서버({server})에 연결할 수 없습니다. 먼저 "
                             f"'chroma run --path data/chroma_db --port 8000' 으로 서버를 켜세요. ({e})")
        return get_collection(client, reset), f"ChromaDB 서버 {server}"
    return get_collection(chromadb.PersistentClient(path=str(DB_PATH)), reset), str(DB_PATH)


def load(fake=False, reset=False, server=None):
    rows = json.loads((ROOT / "disclosures.json").read_text(encoding="utf-8"))
    col, where_to = open_collection(server, reset)
    vecs = embed([r["document"] for r in rows], fake)
    # 백엔드(ChromaRagService)는 출처 제목을 metadata.title 로 읽는다
    metas = [{**r["metadata"], "title": r["metadata"]["source_title"]} for r in rows]
    col.upsert(ids=[r["id"] for r in rows], documents=[r["document"] for r in rows],
               metadatas=metas, embeddings=vecs)
    print(f"적재 완료: {col.count()}개 문장 → {where_to} / 컬렉션 '{COLLECTION}' ({'fake' if fake else MODEL})")
    return col


SERVER_DEFAULT = os.getenv("CHROMA_URL", "http://localhost:8000")


def main():
    ap = argparse.ArgumentParser(description="근거 문장 48개를 임베딩해 ChromaDB에 적재")
    ap.add_argument("--fake", action="store_true", help="API 키 없이 해시 벡터로 적재(CI용)")
    ap.add_argument("--reset", action="store_true", help="컬렉션을 지우고 다시 적재")
    ap.add_argument("--server", nargs="?", const=SERVER_DEFAULT,
                    help="실행 중인 ChromaDB 서버에 적재 (기본 CHROMA_URL 또는 http://localhost:8000)")
    a = ap.parse_args()
    if a.server and a.fake:
        raise SystemExit("--server 에는 --fake 를 쓸 수 없습니다. 시연 DB에는 실제 임베딩만 넣으세요.")
    load(a.fake, a.reset, a.server)
    print("다음: python data/check_db.py" + (" --server" if a.server else "") + (" --fake" if a.fake else ""))


if __name__ == "__main__":
    main()
