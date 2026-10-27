# frontend

React 웹 — 시연용 유튜브 화면, 공유 모달(WON MTS 선택), WON MTS 결과 화면.

- API 기준: `../docs/api/analyze_request.json`, `analyze_response.json`, `analyze_error.json`
- 백엔드 완성 전에는 `analyze_response.json`을 목업으로 사용
- 상태: 로딩 · 성공(검증 카드 · 출처 링크 · 개인화 카드) · 오류/재시도 · 대본 없음
- API 전환: `frontend/.env`의 `VITE_USE_MOCK=false`와 Vite의 `/api` 프록시

## 실행

```bash
cd frontend
npm install
npm run dev
```

`npm run build`는 TypeScript 검사와 Vite 프로덕션 빌드를 함께 실행합니다.

## API 연결

기본값은 시연용 Mock 분석입니다. 실제 백엔드를 사용하려면 `frontend/.env`에
`VITE_USE_MOCK=false`를 설정하고 Vite를 다시 시작하세요. 요청 형식은
`POST /api/analyze`의 `{video_url,user_id}`이며, 기본 개발 프록시는
`http://localhost:8000`을 가리킵니다. 백엔드 주소가 다르면
`frontend/vite.config.ts`의 프록시 대상만 변경하면 됩니다.

현재 화면의 영상 ID는 프런트엔드 시연용 자리표시자입니다. 실제 API 연동 시에는
`../data/transcripts.json`에 등록된 영상 ID와 일치시키세요.
