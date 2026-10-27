#!/usr/bin/env bash
# WON Check 시연 끄기 (macOS / Linux)
# start-demo.sh 터미널에서는 Ctrl+C로 꺼지지만, 터미널을 그냥 닫았거나 포트가 남아 있을 때 씁니다.
# ChromaDB(:8000) · 백엔드(:8080) · 프론트(:5173)를 듣고 있는 프로세스를 종료합니다.
echo "WON Check 시연을 끕니다..."
for port in 8000 8080 5173; do
  pids=$(lsof -ti tcp:"$port" -sTCP:LISTEN 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    kill $pids 2>/dev/null || true
    echo "  :$port 종료"
  fi
done
# Gradle 데몬이 남아 있으면 정리 (백엔드 재시작이 느려지는 것 방지)
for g in backend/gradlew backend/won-check-backend/gradlew; do
  [[ -x "$(dirname "$0")/$g" ]] && (cd "$(dirname "$0")/$(dirname "$g")" && ./gradlew --stop >/dev/null 2>&1 || true)
done
echo "완료."
