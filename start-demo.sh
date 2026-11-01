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

fail() { echo; echo "실행을 멈췄습니다: $1"; exit 1; }

echo "[0/5] 준비물 확인"
open_env() { if [[ "$(uname)" == "Darwin" ]]; then open -t .env; else xdg-open .env; fi >/dev/null 2>&1 || true; }
if [[ ! -f .env ]]; then
  cp .env.example .env; open_env
  fail ".env 를 만들었습니다. 열린 파일의 OPENAI_API_KEY= 뒤에 키를 넣고 저장한 뒤 다시 실행하세요."
fi
set -a; # .env 값을 환경 변수로 (아래에서 띄우는 프로세스가 물려받음)
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env | grep '=' | sed 's/\r$//')
set +a
[[ -n "${OPENAI_API_KEY:-}" ]] || { open_env; fail ".env 에 OPENAI_API_KEY 가 비어 있습니다. 키를 넣고 저장한 뒤 다시 실행하세요."; }

# ---------- 준비물 자동 설치 (macOS: Homebrew) ----------
# 없거나 버전이 낮으면 설치합니다: Python 3.10+, Node.js 18+, Java 21
py_ok()   { "$1" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' >/dev/null 2>&1; }
node_ok() { command -v node >/dev/null && node -e 'process.exit(+process.versions.node.split(".")[0] >= 18 ? 0 : 1)' >/dev/null 2>&1 && command -v npm >/dev/null; }
java_major() { java -version 2>&1 | awk -F'"' '/version/ {split($2, v, "."); print (v[1] == "1" ? v[2] : v[1]); exit}'; }
java_ok() { local m; m=$(java_major 2>/dev/null || true); [[ "$m" =~ ^[0-9]+$ ]] && (( m >= 21 )); }

ensure_brew() {
  command -v brew >/dev/null && return 0
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [[ -x "$b" ]] && { eval "$("$b" shellenv)"; return 0; }
  done
  [[ "$(uname)" == "Darwin" ]] || fail "자동 설치는 macOS만 지원합니다. Python 3.10+, Node.js 18+, Java 21 을 직접 설치하세요."
  echo "  Homebrew 설치 (Mac 로그인 비밀번호를 물을 수 있습니다)"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || fail "Homebrew 설치 실패"
  for b in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    [[ -x "$b" ]] && { eval "$("$b" shellenv)"; return 0; }
  done
  fail "Homebrew 설치 후에도 brew 를 찾지 못했습니다. 터미널을 새로 열고 다시 실행하세요."
}

# Python
PY=""
for c in python3 python; do
  if command -v "$c" >/dev/null && py_ok "$c"; then PY=$(command -v "$c"); break; fi
done
if [[ -z "$PY" ]]; then
  echo "  Python 3.10 이상이 없어 설치합니다 (brew install python@3.12)"
  ensure_brew; brew install python@3.12 || fail "Python 설치 실패"
  PY="$(brew --prefix python@3.12)/bin/python3.12"
fi

# Node.js
if ! node_ok; then
  echo "  Node.js 18 이상이 없어 설치합니다 (brew install node)"
  ensure_brew; brew install node || fail "Node.js 설치 실패"
  node_ok || fail "Node.js 설치 후에도 node/npm 을 찾지 못했습니다. 터미널을 새로 열고 다시 실행하세요."
fi

# Java 21 (기본 java 가 다른 버전이면 설치된 21 을 먼저 찾음)
if ! java_ok; then
  JH=""
  [[ -x /usr/libexec/java_home ]] && JH=$(/usr/libexec/java_home -v 21 2>/dev/null || true)
  if [[ -z "$JH" ]]; then
    echo "  Java 21 이 없어 설치합니다 (brew install openjdk@21)"
    ensure_brew; brew install openjdk@21 || fail "Java 21 설치 실패"
    JH="$(brew --prefix openjdk@21)/libexec/openjdk.jdk/Contents/Home"
  fi
  export JAVA_HOME="$JH"; export PATH="$JAVA_HOME/bin:$PATH"
  java_ok || fail "Java 21 을 찾지 못했습니다 (JAVA_HOME=$JAVA_HOME)."
fi

# Python 라이브러리는 레포 안 .venv 에 설치 (Homebrew Python 의 pip 설치 제한을 피함)
if [[ ! -x .venv/bin/python ]]; then
  echo "  Python 가상환경 만들기 (.venv)"
  "$PY" -m venv .venv || fail "가상환경을 만들지 못했습니다. (Linux 는 python3-venv 패키지 필요)"
fi
PY="$ROOT/.venv/bin/python"
"$PY" -c "import chromadb, openai" 2>/dev/null || {
  echo "  chromadb·openai 설치: pip install -r data/requirements.txt"
  "$PY" -m pip install -q --upgrade pip && "$PY" -m pip install -r data/requirements.txt || fail "Python 라이브러리 설치 실패"
}
echo "  준비 완료: $("$PY" --version), Node $(node -v), Java $(java_major)"

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

# ---------- Ollama (LLM_PROVIDER=ollama 일 때: 설치 → 서버 켜기 → 모델 내려받기) ----------
if [[ "${LLM_PROVIDER:-openai}" == "ollama" ]]; then
  export OLLAMA_CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3:4b-instruct}"
  echo; echo "[0/5] Ollama 준비 (대화 모델: $OLLAMA_CHAT_MODEL)"
  if ! command -v ollama >/dev/null; then
    [[ "$(uname)" == "Darwin" ]] || fail "Ollama 가 없습니다. https://ollama.com/download 에서 설치하세요."
    echo "  Ollama 가 없어 설치합니다 (brew install ollama)"
    ensure_brew; brew install ollama || fail "Ollama 설치 실패"
  fi
  if ! curl -s -o /dev/null http://localhost:11434/api/version; then
    echo "  Ollama 서버 켜기 (:11434, 로그: logs/ollama.log)"
    ollama serve > logs/ollama.log 2>&1 & PIDS+=($!)
    wait_for http://localhost:11434/api/version 30 Ollama
  fi
  m="$OLLAMA_CHAT_MODEL"; [[ "$m" == *:* ]] || m="$m:latest"
  if ! ollama list 2>/dev/null | awk 'NR > 1 {print $1}' | grep -qxF "$m"; then
    echo "  모델 내려받기: $OLLAMA_CHAT_MODEL (수 GB, 처음 한 번만)"
    ollama pull "$OLLAMA_CHAT_MODEL" || fail "모델을 내려받지 못했습니다: $OLLAMA_CHAT_MODEL"
  fi
fi

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

echo; echo "백엔드를 기다립니다 (첫 실행은 Gradle·라이브러리 다운로드로 5분 넘게 걸릴 수 있음, 진행 상황: logs/backend.log)"
wait_for http://localhost:8080 900 백엔드
wait_for http://localhost:5173 300 프론트
( command -v open >/dev/null && open http://localhost:5173 ) || ( command -v xdg-open >/dev/null && xdg-open http://localhost:5173 ) || true
echo; echo "완료! http://localhost:5173  (끄려면 Ctrl+C)"
wait
