# frontend

React 웹 — 스크롤 가능한 시연 영상 목록, 유튜브 영상 화면, 공유 모달(WON MTS 선택), WON MTS 결과 화면.

- API 기준: `../docs/api/analyze_request.json`, `analyze_response.json`, `analyze_error.json`
- 백엔드 완성 전에는 세 시연 영상에 맞춘 프론트엔드 Mock 결과를 사용
- 상태: 로딩 · 성공(검증 카드 · 출처 링크 · 개인화 카드) · 오류/재시도 · 대본 없음
- API 전환: `frontend/.env`의 `VITE_USE_MOCK=false`와 Vite의 `/api` 프록시

## 실행

```bash
cd frontend
npm install
npm run dev
```

`npm run build`는 TypeScript 검사와 Vite 프로덕션 빌드를 함께 실행합니다.

## 시연 계정

데스크톱에서는 아이폰 화면 바깥 왼쪽 위의 **시연 계정** 버튼을 눌러 가상 사용자 5명 중 한 명을
선택합니다. 계정 목록에는 이름과 투자유형만 표시됩니다. 아이폰 화면에는 계정 선택기가 없으며, 선택한 계정은 다른 영상을 열어도
유지됩니다. 결과 화면에서 계정을 바꾸면 같은 영상을 다시 분석합니다.

- S1 삼성전자: `demo_user_03` 이도윤
- S2 SK하이닉스: `demo_user_01` 박서연 → `demo_user_02` 김도현
- S3 현대자동차: `demo_user_04` 한지은 → `demo_user_05` 정영호

모바일처럼 패널이 표시되지 않는 화면에서는 URL에 `?demo_user=demo_user_01`을
붙여 시연 계정을 지정할 수 있습니다. 기본 계정은 `demo_user_03`입니다.

## API 연결

기본값은 시연용 Mock 분석입니다. 실제 백엔드를 사용하려면 `frontend/.env`에
`VITE_USE_MOCK=false`를 설정하고 Vite를 다시 시작하세요. 요청 형식은
`POST /api/analyze`의 `{video_url,user_id}`이며, 기본 개발 프록시는
`http://localhost:8080`(Spring Boot)을 가리킵니다. 백엔드 주소가 다르면
`frontend/vite.config.ts`의 프록시 대상만 변경하면 됩니다.

첫 화면에서 `../data/transcripts.json`에 등록된 삼성전자·SK하이닉스·현대자동차
시연 영상 3개 중 하나를 선택합니다. 현재 URL의 영상 ID는 사전 준비 대본 조회용
시연 ID입니다. 실제 영상 업로드 후에는 해당 영상의 URL과 데이터의 ID를 함께 갱신해야 합니다.
