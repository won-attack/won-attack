#!/usr/bin/env bash
# 커밋 메시지 첫 줄이 "종류: 요약" 또는 "종류(범위): 요약" 형식인지 검사한다.
# 사용: check_commits.sh <FROM_SHA> <TO_SHA>
set -euo pipefail

FROM="${1:-}"
TO="${2:-HEAD}"
TYPES="feat|fix|docs|style|refactor|test|chore|data|prompt|ci|build|perf|revert"
PATTERN="^(${TYPES})(\([a-z0-9-]+\))?!?: .{2,72}$"

# 첫 push(이전 커밋 없음)이면 전체 기록을 검사한다
if [[ -z "$FROM" || "$FROM" =~ ^0+$ ]]; then
  RANGE="$TO"
else
  RANGE="$FROM..$TO"
fi

fail=0
while IFS=$'\t' read -r sha subject; do
  [[ -z "$sha" ]] && continue
  if [[ "$subject" =~ ^Merge\  ]] || [[ "$subject" =~ ^Revert\ \" ]]; then
    continue
  fi
  if [[ "$subject" =~ $PATTERN ]]; then
    echo "✅ ${sha:0:7} $subject"
  else
    echo "❌ ${sha:0:7} $subject"
    fail=1
  fi
done < <(git log --no-merges --format='%H%x09%s' "$RANGE")

if [[ $fail -ne 0 ]]; then
  echo ""
  echo "커밋 메시지 형식이 맞지 않습니다. 예: feat(frontend): 검증 카드 컴포넌트 추가"
  echo "고치는 방법은 CONTRIBUTING.md의 '커밋 메시지 고치기'를 참고하세요."
  exit 1
fi
