# WON Check 영상 제작

현재 출력은 SK하이닉스 v2 쇼츠와 삼성전자·현대차 가로형 영상입니다. 시연 영상 1편을 로컬 Remotion과 macOS 음성으로 제작합니다. 1080×1920, 30fps, 900프레임, 30초. 기존 이채원 기본 이미지와 금융 스튜디오 배경을 재사용합니다.

## 실행

Node.js 22 이상과 macOS가 필요합니다. 음성 재생성은 macOS에 설치된 한국어 `Yuna` 음성을 사용합니다. 생성된 WAV가 있으면 영상 렌더링은 해당 파일을 재사용합니다.

```bash
cd /Users/jeong-yeongjun/won-check/video
npm ci
npm run prepare:hynix
npm run check
npm run render:hynix
```

`npm run studio`는 편집 미리보기를 엽니다. `npm run stills:hynix`는 영상 인코딩 없이 장면별 정지 화면만 생성합니다. 최초 패키지 설치와 Chrome 렌더러 다운로드에는 인터넷이 필요하지만 유료 API는 호출하지 않습니다.

## 프로젝트 폴더 기준 파일 위치

```text
won-check/
├── data/
│   ├── build_data.py                 # 대본의 원본 정의
│   ├── scripts/WCdemoS2V02.md        # 사람이 읽는 하이닉스 대본
│   └── transcripts.json             # 분석 서버용 대본
└── video/
    ├── package.json / package-lock.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.tsx                # Hynix30 구성 등록
    │   └── HynixVideo.tsx           # 5개 장면·그래프·자막·캐릭터·고지
    ├── scenes/
    │   ├── hynix.json               # 실측 음성·프레임·자막 타이밍
    │   └── hynix.srt                # 별도 자막 파일
    ├── scripts/
    │   ├── prepare_hynix.py         # macOS say → WAV → 30초 타임라인
    │   └── render.mjs               # 정지 화면 및 H.264/AAC MP4 렌더링
    ├── public/assets/
    │   ├── characters/chaewon-base-v1.png
    │   ├── backgrounds/studio-bg-v1.png
    │   └── audio/hynix/scene-01.wav … scene-05.wav
    ├── references/                  # 캐릭터 참조·내장 생성 기록
    ├── design/                      # 기존 정지 화면 시안
    ├── .cache/speech/               # 로컬 음성 캐시, Git 제외
    └── out/                         # 출력물, Git 제외
        ├── hynix-30s-v1.mp4
        ├── stills/hynix-scene-1.png … hynix-scene-5.png
        ├── render-report.json
        └── verification.json
```

## 음성과 타이밍

기본 음성은 `Yuna`, 속도 인자는 `85`입니다. 이 환경에서 총 발화는 약 27.09초이며, 앞뒤 여백을 포함해 30초로 배치합니다. 음성 속도 인자와 실제 발화 속도는 언어·시스템에 따라 다르므로 재생성 시 실측합니다. API 키나 `.env`는 읽지 않습니다.

```bash
python3 scripts/prepare_hynix.py --voice Yuna --rate 85
```

대본의 `SK`, 숫자와 `%`는 음성 입력에서만 한국어 발음으로 풀어 씁니다. 예: `77조` → `칠십칠 조`, `76%` → `칠십육 퍼센트`. 원래 대사와 발음용 문자열을 `scenes/hynix.json`에 함께 기록합니다. 생성 스크립트는 분석용 원문이 바뀌면 중단하므로, 대본 수정 뒤에는 발음·자막도 검토해야 합니다. 장면별 WAV를 잘라내거나 재생 속도로 압축하지 않습니다. 음성이 30초를 넘으면 오류로 종료합니다.

자막 구간은 문장 묶음 기준으로 음성 길이에 비례해 배분한 초안입니다. 단어 단위 강제 정렬은 적용하지 않았습니다. v2 캐릭터는 오디오 RMS에 따라 입을 열고 닫으며, 눈 감음 레이어를 일정 간격으로 겹칩니다. 발음별 정밀 립싱크는 아닙니다. 배경음과 효과음은 넣지 않았습니다.

## 데이터와 검증

영상은 WON Check가 검증할 가상 투자 콘텐츠입니다. 의도적인 불일치·근거 부족 주장과 투자 재촉 표현이 포함되어 있으며, 정답 배지는 원본 영상에 표시하지 않습니다. 시연 고지와 합성 음성 표시를 항상 보여줍니다.

현재 장면은 영업이익 60조·이익률 76%, 매출 80조 돌파, 3분기 77조 확정 주장과 비중 확대 발언을 담습니다. 영상 제작을 위해 근거 수치나 기대 판정을 변경하지 않습니다.

기존 `data/` 수정은 `data/build_data.py`에서 수행하고 재생성합니다. `data/scripts/*.md` 또는 `transcripts.json`만 직접 수정하지 않습니다. 타이밍의 최종 기준은 `scenes/hynix.json`입니다. 프로젝트의 대본에 적힌 시점은 제작 초안으로 남아 있습니다.

타입 검사, 5개 장면 시각 확인, WAV 길이와 타임라인 검사, 출력 MP4의 프레임·크기·오디오 및 전체 디코딩 확인을 수행합니다. 목소리의 자연스러움과 말투에 대한 최종 청취 판단은 사용자 검토가 필요합니다.

추가 이미지가 필요할 때는 사용자 요청대로 Codex 내장 이미지 생성만 사용합니다. 영상 코드·음성 스크립트에 유료 API 호출은 없습니다.

## v2 변경과 파일 위치

- `out/hynix-30s-v2.mp4`: 현재 수정본. 기존 v1 MP4 보관.
- `src/TalkingCharacter.tsx`: 기본 PNG 위에 입·눈만 부드러운 마스크로 겹침. 발화 중 입 열림/쉼에서 닫힘, 눈 깜빡임, 미세한 움직임.
- `scripts/prepare_motion.py`: 기존 WAV의 프레임별 RMS를 분석. 로컬 연산만 수행.
- `scenes/hynix-motion.json`: 900프레임 오디오 강도와 입 상태, 눈 깜빡임 시점.
- `public/assets/semiconductors/wafer-v1.png`, `chip-v1.png`, `hbm-v1.png`: 내장 생성한 반도체 개념 일러스트 3장.
- `public/assets/characters/chaewon-mouth-open-v1.png`, `chaewon-blink-v1.png`: 내장 편집한 얼굴 변형 2장. 기본 이미지와 같은 1312×1199 RGBA.
- `references/HYNIX-V2-GENERATION.md`: 내장 이미지 생성 프롬프트 기록.
- `references/hynix-v1/`: v1 코드 참고본.
- `out/stills-v2/`: 클로즈업·깜빡임·웨이퍼·원그래프·칩·막대그래프·HBM·마무리 확인 화면.
- `out/render-report-v2.json`, `out/verification-v2.json`: 출력·검수 기록.

화면 흐름: 진행자 클로즈업 → 웨이퍼/영업이익 → 전체 화면 이익률 그래프 → 반도체 칩 → 전체 화면 매출 그래프 → HBM/77조 도장 → 진행자 마무리. 진행자 창은 오른쪽/왼쪽으로 바뀌며 전체 화면 진행자와 크기를 달리합니다. 와이프 컷과 느린 이미지 확대를 사용합니다.

`npm run render:hynix`와 `npm run stills:hynix`는 사전 단계에서 입 움직임 데이터를 자동 재생성합니다. `npm run prepare:motion`만 따로 실행해도 됩니다. 음성은 기존 로컬 Yuna를 유지했고 사용자 CLOVA 음원은 아직 받지 않았습니다. `.env` 또는 OpenAI API 키를 읽지 않습니다.

## 삼성전자·현대차 가로형 영상

삼성전자(정대리), 현대차(이채원)는 1920×1080·30초입니다. 실행 방법과 파일 위치는 `README-LANDSCAPE.md`를 참고하세요. 하이닉스는 기존 1080×1920 쇼츠를 유지합니다.

## 팀 공유용 MP4

최종 영상 3개는 로컬 `exports/`에 보관하며 MP4는 Git에서 제외합니다. 팀원에게는 별도로 파일을 전달하거나 제작 코드로 재생성합니다. 재생성·검수용 출력은 `out/`에 보관합니다. Git에는 파일 목록·해시를 담은 `exports/manifest.json`만 포함합니다.
