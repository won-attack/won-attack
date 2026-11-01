#!/usr/bin/env bash
# WON Check 시연 한 번에 실행 (macOS / Linux)
#   ./start-demo.sh          (실행할 때 모델을 고름)
#   ./start-demo.sh openai   (OpenAI 로 바로 실행)
#   ./start-demo.sh ollama   (Ollama 로 바로 실행)
#   ./start-demo.sh reset    (근거 DB 다시 적재, 위와 함께 써도 됨)
# ChromaDB(:8000) / 백엔드(:8080) / 프론트(:5173)를 이 터미널에서 함께 띄우고, Ctrl+C 한 번에 모두 끕니다.
# 로그: logs/chroma.log, logs/backend.log, logs/frontend.log
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
mkdir -p logs

fail() { echo; echo "실행을 멈췄습니다: $1"; exit 1; }

RESET=0; ARG_MODEL=""
for a in "$@"; do
  case "$(echo "$a" | tr '[:upper:]' '[:lower:]')" in
    reset) RESET=1 ;;
    openai|ollama) ARG_MODEL=$(echo "$a" | tr '[:upper:]' '[:lower:]') ;;
  esac
done

# .env 의 KEY=값 한 줄 바꾸기 (없으면 추가)
set_env() {
  local tmp; tmp=$(mktemp)
  awk -v k="$1" -v v="$2" 'BEGIN { f = 0 } index($0, k "=") == 1 { print k "=" v; f = 1; next } { print } END { if (!f) print k "=" v }' .env > "$tmp" \
    && cat "$tmp" > .env && rm -f "$tmp" || fail ".env 를 저장하지 못했습니다: $1"
}

echo "[0/5] 준비물 확인"
if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "  .env 가 없어 .env.example 로 만들었습니다."
fi
set -a; # .env 값을 환경 변수로 (아래에서 띄우는 프로세스가 물려받음)
# shellcheck disable=SC1091
source <(grep -v '^\s*#' .env | grep '=' | sed 's/\r$//')
set +a
OLLAMA_CHAT_MODEL="${OLLAMA_CHAT_MODEL:-qwen3:4b-instruct}"
OLLAMA_EMBEDDING_MODEL="${OLLAMA_EMBEDDING_MODEL:-embeddinggemma}"
OPENAI_CHAT_MODEL="${OPENAI_CHAT_MODEL:-gpt-4o-mini}"
EMBEDDING_MODEL="${EMBEDDING_MODEL:-text-embedding-3-small}"

# ---------- AI 모델 고르기: 대화 모델과 임베딩을 함께 맞춤 ----------
#   1 ollama → 로컬 LLM + Ollama 임베딩 (테스트용, 무료)
#   2 openai → GPT + OpenAI 임베딩 (시연용, 유료, OPENAI_API_KEY 필요)
if [[ -n "$ARG_MODEL" ]]; then
  LLM_PROVIDER="$ARG_MODEL"
elif [[ -t 0 ]]; then
  def=1; [[ "$(echo "${LLM_PROVIDER:-}" | tr '[:upper:]' '[:lower:]')" == "openai" ]] && def=2
  while true; do
    echo
    echo "어떤 모델을 사용하시겠습니까?"
    echo "  1> Ollama (로컬 실행, $OLLAMA_CHAT_MODEL, 무료)"
    echo "  2> OpenAI ($OPENAI_CHAT_MODEL, 유료)"
    read -r -p "입력 [Enter = $def]: " pick
    case "${pick:-$def}" in
      1) LLM_PROVIDER=ollama; break ;;
      2) LLM_PROVIDER=openai; break ;;
      *) echo "  1 또는 2 를 입력하세요." ;;
    esac
  done
else
  # 터미널이 아닌 곳에서 실행하면 묻지 않고 .env 값을 씀
  LLM_PROVIDER=$(echo "${LLM_PROVIDER:-openai}" | tr '[:upper:]' '[:lower:]')
  [[ "$LLM_PROVIDER" == "openai" || "$LLM_PROVIDER" == "ollama" ]] \
    || fail ".env 의 LLM_PROVIDER 는 openai 또는 ollama 여야 합니다 (지금 값: $LLM_PROVIDER)."
fi
if [[ "$LLM_PROVIDER" == "openai" ]]; then
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    [[ -t 0 ]] || fail ".env 에 OPENAI_API_KEY 가 없습니다. 키를 넣거나 터미널에서 실행해 입력하세요."
    echo
    echo "  .env 에 OpenAI API 키가 없습니다. 키를 붙여 넣고 Enter 를 누르세요 (sk- 로 시작, 화면에 보이지 않음, .env 에만 저장됨)."
    while true; do
      read -r -s -p "OpenAI API 키: " key; echo
      key="${key// /}"
      if [[ "$key" == sk-* ]]; then break; fi
      echo "  OpenAI API 키는 sk- 로 시작합니다. 다시 입력하세요. (그만두려면 Ctrl+C)"
    done
    OPENAI_API_KEY="$key"
    set_env OPENAI_API_KEY "$OPENAI_API_KEY"
    echo "  키를 .env 에 저장했습니다."
  fi
  echo "  AI 모델: OpenAI (대화 $OPENAI_CHAT_MODEL, 임베딩 $EMBEDDING_MODEL)"
else
  echo "  AI 모델: Ollama (대화 $OLLAMA_CHAT_MODEL, 임베딩 $OLLAMA_EMBEDDING_MODEL)"
fi
# 고른 모델을 .env 에 저장 (다음 실행의 기본값)
set_env LLM_PROVIDER "$LLM_PROVIDER"
set_env EMBEDDING_PROVIDER "$LLM_PROVIDER"
export LLM_PROVIDER OPENAI_API_KEY OPENAI_CHAT_MODEL EMBEDDING_MODEL OLLAMA_CHAT_MODEL OLLAMA_EMBEDDING_MODEL
export EMBEDDING_PROVIDER="$LLM_PROVIDER"

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

# ---------- Ollama (LLM_PROVIDER=ollama 일 때만: 설치 → 서버 켜기 → 모델 내려받기) ----------
pull_model() { # 이름
  local m="$1"; [[ "$m" == *:* ]] || m="$m:latest"
  if ! ollama list 2>/dev/null | awk 'NR > 1 {print $1}' | grep -xF -e "$m" -e "$1" >/dev/null; then
    echo "  모델 내려받기: $1 (처음 한 번만)"
    ollama pull "$1" || fail "모델을 내려받지 못했습니다: $1"
  fi
}
if [[ "$LLM_PROVIDER" == "ollama" ]]; then
  echo; echo "[0/5] Ollama 준비"
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
  pull_model "$OLLAMA_CHAT_MODEL"
  pull_model "$OLLAMA_EMBEDDING_MODEL"
fi

echo; echo "[1/5] 근거 DB 적재 ($EMBEDDING_PROVIDER 임베딩)"
# OpenAI·Ollama 근거는 data/chroma_db 안에 컬렉션을 나눠 저장 (disclosures / disclosures_ollama)
# 지금 모델용 컬렉션이 비었거나 임베딩 설정이 바뀌었으면 적재
has_db() { "$PY" -c "import sys; sys.path.insert(0, 'data'); from init_db import open_collection; sys.exit(0 if open_collection()[0].count() else 1)" >/dev/null 2>&1; }
if [[ "$RESET" == 1 ]] || ! has_db; then "$PY" data/init_db.py --reset || fail "근거 DB 적재 실패"
else echo "  이미 적재된 근거 DB 를 그대로 씁니다. 다시 적재: ./start-demo.sh reset"; fi

echo; echo "[2/5] ChromaDB 서버 (:8000)"
"$PY" -c "from chromadb.cli.cli import app; app()" run --path "$ROOT/data/chroma_db" --port 8000 > logs/chroma.log 2>&1 & PIDS+=($!)
wait_for http://localhost:8000/api/v2/heartbeat 30 ChromaDB

if [[ "$LLM_PROVIDER" == "openai" ]]; then
  echo; echo "[3/5] 근거 검색 점검 (7/7 이어야 정상)"
  "$PY" data/check_db.py --server --strict || fail "점검 실패: 데이터 쪽 문제입니다. ./start-demo.sh reset 으로 다시 적재해 보세요."
else
  echo; echo "[3/5] 근거 검색 점검 (Ollama 테스트 모드: 7/7 이 아니어도 계속 진행)"
  "$PY" data/check_db.py --server || fail "점검 실패: ./start-demo.sh reset 으로 다시 적재해 보세요."
fi

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
