#!/usr/bin/env bash
# WON Check 시연 한 번에 실행 (macOS / Linux)
#   ./start-demo.sh          (DB 있으면 그대로 사용)
#   ./start-demo.sh reset    (근거 DB 다시 적재)
# ChromaDB(:8000) / 백엔드(:8080) / 프론트(:5173)를 이 터미널에서 함께 띄우고, Ctrl+C 한 번에 모두 끕니다.
# 로그: logs/chroma.log, logs/backend.log, logs/frontend.log
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
mkdir -p logs
PY=$(command -v python3 || command -v python || true)

fail() { echo; echo "실행을 멈췄습니다: $1"; exit 1; }

echo "[0/5] 준비물 확인"
[[ -f .env ]] || fail ".env 가 없습니다. cp .env.example .env 후 OPENAI_API_KEY 를 넣으세요."
set -a; # .env 값을 환경 변수로 (아래에서 띄우는 프로세스가 물려받음)
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env | grep '=' | sed 's/\r$//')
set +a
[[ -n "${OPENAI_API_KEY:-}" ]] || fail ".env 에 OPENAI_API_KEY 가 비어 있습니다."
[[ -n "$PY" ]] || fail "python 이 없습니다 (3.10 이상)."
command -v npm >/dev/null || fail "npm 이 없습니다 (Node.js 18 이상)."
command -v java >/dev/null || fail "java 가 없습니다 (Java 21)."
"$PY" -c "import chromadb, openai" 2>/dev/null || { echo "  chromadb·openai 설치: pip install -r data/requirements.txt"; "$PY" -m pip install -r data/requirements.txt; }

if [[ -x backend/gradlew ]]; then BACKEND="$ROOT/backend"
elif [[ -x backend/won-check-backend/gradlew ]]; then BACKEND="$ROOT/backend/won-check-backend"
else fail "백엔드 코드(gradlew)가 없습니다. 백엔드 브랜치가 main 에 합쳐졌는지 확인하세요."; fi

PIDS=()
cleanup() { echo; echo "모두 끕니다..."; for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; wait 2>/dev/null || true; }
trap cleanup EXIT INT TERM

wait_for() { # url 초 이름
  for _ in $(seq 1 "$2"); do curl -s -o /dev/null "$1" && return 0; sleep 1; done
  fail "$3 가 $2초 안에 켜지지 않았습니다. logs/ 를 확인하세요."
}

echo; echo "[1/5] 근거 DB 적재"
if [[ "${1:-}" == "reset" || ! -d data/chroma_db ]]; then "$PY" data/init_db.py --reset
else echo "  data/chroma_db 가 이미 있어 그대로 씁니다. 다시 적재: ./start-demo.sh reset"; fi

echo; echo "[2/5] ChromaDB 서버 (:8000)"
"$PY" -c "from chromadb.cli.cli import app; app()" run --path "$ROOT/data/chroma_db" --port 8000 > logs/chroma.log 2>&1 & PIDS+=($!)
wait_for http://localhost:8000/api/v2/heartbeat 30 ChromaDB

echo; echo "[3/5] 근거 검색 점검 (7/7 이어야 정상)"
"$PY" data/check_db.py --server || fail "점검 실패: 데이터 쪽 문제입니다. ./start-demo.sh reset 으로 다시 적재해 보세요."

echo; echo "[4/5] 백엔드 (:8080, live)"
( cd "$BACKEND" && WONCHECK_MODE=live WONCHECK_DATA_PATH="$ROOT/data" CHROMA_URL=http://localhost:8000 ./gradlew bootRun ) > logs/backend.log 2>&1 & PIDS+=($!)

echo; echo "[5/5] 프론트 (:5173, 실제 백엔드 사용)"
( cd frontend && [[ -d node_modules ]] || npm install; VITE_USE_MOCK=false npm run dev ) > logs/frontend.log 2>&1 & PIDS+=($!)

wait_for http://localhost:8080 180 백엔드
wait_for http://localhost:5173 60 프론트
( command -v open >/dev/null && open http://localhost:5173 ) || ( command -v xdg-open >/dev/null && xdg-open http://localhost:5173 ) || true
echo; echo "완료! http://localhost:5173  (끄려면 Ctrl+C)"
wait
