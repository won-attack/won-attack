# 기여 가이드

WON Check 팀의 브랜치·커밋·PR 규칙입니다. 해커톤 일정이 짧으니 **규칙은 가볍게, 대신 반드시 지키기**가 원칙입니다.

## 1. 폴더 = 담당자

| 폴더 | 담당 | 다른 사람이 고칠 때 |
|---|---|---|
| `frontend/` | 프론트엔드 | 담당에게 먼저 알리기 |
| `backend/` | 백엔드 | 담당에게 먼저 알리기 |
| `data/` | 데이터·벡터 DB | **PR로만** 수정 (근거 문장과 기대 판정이 함께 움직여야 함) |
| `docs/api/` | 공동 | 바꾸면 **프론트·백엔드 모두에게 즉시 공유** |
| `README.md`, `CONTRIBUTING.md`, `.github/` | 공동 | PR로 수정 |

## 2. 브랜치

- `main`: 항상 실행되는 상태. 시연은 `main`으로 합니다.
- 작업 브랜치: `종류/영역-요약` (영문 소문자, 하이픈)

| 예 | 용도 |
|---|---|
| `feat/frontend-result-card` | 결과 카드 화면 |
| `feat/backend-analyze-api` | `/api/analyze` 구현 |
| `fix/backend-period-filter` | 기간 필터 버그 |
| `data/q3-confirmed-results` | 3분기 확정 실적 반영 |
| `docs/readme-run-guide` | 실행 방법 문서 |

```bash
git switch main && git pull
git switch -c feat/frontend-result-card
```

**수요일(10/28) 09:00 이후에는 `main`에 새 기능을 넣지 않습니다.** 버그 수정과 발표 준비만 합니다. 제출 마감은 12:30입니다.

## 3. 커밋 메시지

```
종류(범위): 요약
```

- 범위는 선택이며 `frontend`, `backend`, `data`, `prompt`, `docs` 중 하나를 씁니다.
- 요약은 한국어로, 무엇을 했는지 72자 이내로 씁니다. 끝에 마침표를 찍지 않습니다.

| 종류 | 언제 | 예 |
|---|---|---|
| `feat` | 새 기능 | `feat(frontend): 검증 결과 카드 추가` |
| `fix` | 버그 수정 | `fix(backend): 여러 분기 주장의 근거 누락 수정` |
| `data` | 근거 문장·대본·사용자 데이터 변경 | `data: 3분기 확정 실적으로 근거 갱신` |
| `prompt` | LLM 프롬프트 변경 | `prompt: 주장 추출 시 기간 표기 규칙 추가` |
| `refactor` | 동작 변화 없는 구조 개선 | `refactor(backend): 검색 로직을 rag 모듈로 분리` |
| `style` | 포맷·공백 등 | `style(frontend): Prettier 적용` |
| `docs` | 문서 | `docs: 실행 방법 보완` |
| `test` | 테스트 | `test(backend): 오류 응답 테스트 추가` |
| `chore`·`build`·`ci` | 설정·의존성·CI | `ci: 프론트 빌드 검사 추가` |

CI가 PR의 모든 커밋 메시지를 검사합니다. 형식이 틀리면 ❌가 뜹니다.

### 커밋 메시지 고치기

```bash
# 마지막 커밋 하나
git commit --amend -m "fix(backend): 기간 필터 누락 수정"
git push --force-with-lease

# 최근 커밋 여러 개 (예: 3개)
git rebase -i HEAD~3      # 고칠 줄의 pick → reword 로 바꾸고 저장
git push --force-with-lease
```

`--force-with-lease`는 **내 작업 브랜치에서만** 씁니다. `main`에는 절대 강제 푸시하지 않습니다.

## 4. Pull Request

1. 작업 브랜치를 푸시하고 `main`으로 PR을 엽니다. 템플릿 항목을 채웁니다.
2. 관련 이슈가 있으면 본문에 `Closes #번호`를 적습니다.
3. 리뷰어 1명이 훑어보고 승인하면 **Squash and merge** 합니다. 해커톤 중에는 리뷰가 10분 이상 밀리면 작성자가 직접 병합해도 됩니다.
4. 병합 후 브랜치는 삭제합니다.

PR은 작게 유지합니다. 화면 하나, API 하나, 데이터 변경 하나 단위가 적당합니다.

## 5. 절대 커밋하지 않는 것

- `.env`와 API 키 — 키가 올라갔다면 **바로 운영매니저에게 알리고 키를 폐기·재발급**합니다. 커밋을 지워도 기록에 남습니다.
- `data/chroma_db/` — `python data/init_db.py --reset`으로 각자 만듭니다.
- 실제 개인정보 — 시연 사용자는 모두 가상입니다.

## 6. 데이터 수정 규칙

- `data/*.json`은 직접 고치지 말고 `data/build_data.py`를 수정한 뒤 `python data/build_data.py`로 다시 만듭니다. CI가 두 결과가 같은지 검사합니다.
- 근거 문장의 숫자는 **공식 출처와 대조한 값만** 넣고, `source_url`을 반드시 채웁니다.
- 근거를 바꾸면 `python data/init_db.py --reset`으로 기대 근거가 Top 3에 들어오는지 확인합니다.

## 7. 문제가 생겼을 때

| 상황 | 대응 |
|---|---|
| CI 커밋 메시지 ❌ | 3장 "커밋 메시지 고치기" |
| CI 데이터 ❌ | JSON을 손으로 고쳤는지 확인 → `build_data.py` 수정 후 재생성 |
| CI 비밀 값 ❌ | 해당 파일 삭제 커밋 + 키 재발급 |
| `main`이 깨졌을 때 | 마지막 정상 커밋으로 되돌리는 PR: `git revert <커밋>` |
| 30분 넘게 막혔을 때 | 기술 멘토에게 바로 가져가기 (해커톤 안내 자료) |

## 8. 이슈

이슈는 템플릿(🐞 버그 · ✨ 기능 제안 · 📋 작업)으로만 만들 수 있습니다. 제목은 한 줄 요약, 해커톤 범위 밖 아이디어는 기능 제안에서 "추후 확장"을 고르면 발표 자료의 확장 계획으로 모읍니다.
