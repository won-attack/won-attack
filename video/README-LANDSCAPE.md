# 삼성전자·현대차 가로형 영상

두 편 모두 1920×1080(16:9), 30fps, 900프레임, 30초입니다. 하이닉스 쇼츠는 `out/hynix-30s-v2.mp4`로 유지합니다.

| 영상 | 진행자 | 로컬 음성 | 출력 |
|---|---|---|---|
| 삼성전자 | 정대리 | macOS Reed 한국어 | `out/samsung-30s-landscape-v1.mp4` |
| 현대자동차 | 이채원 | macOS Yuna | `out/hyundai-30s-landscape-v1.mp4` |

이미지는 Codex 내장 imagegen으로 만들었고, 음성·입 움직임 분석·렌더링은 로컬에서 실행했습니다. 유료 API 호출은 없습니다. 제공받은 CLOVA 음원은 아직 없습니다.

## 재실행

프로젝트의 `video/`에서 실행합니다. 음성 준비는 macOS의 설치된 한국어 음성을 사용합니다.

```bash
npm run prepare:landscape
npm run check
npm run render:landscape
```

한 편만 출력하거나 정지 화면만 확인할 수도 있습니다.

```bash
node scripts/render_landscape.mjs --kind samsung
node scripts/render_landscape.mjs --kind hyundai
npm run stills:landscape
```

## 추가한 파일

- `src/LandscapeVideo.tsx`: 두 영상의 가로형 장면, 그래프, 자막, 전환.
- `src/AnimatedPresenter.tsx`: 정대리·이채원의 입 열림/닫힘과 눈 깜빡임. 기존 하이닉스용 얼굴 코드는 그대로 유지합니다.
- `src/index.tsx`: `SamsungLandscape30`, `HyundaiLandscape30` 구성 등록.
- `scripts/prepare_landscape.py`: 대사·발음 검증, 로컬 WAV 생성, 30초 타임라인·자막·입 움직임 계산.
- `scripts/render_landscape.mjs`: 두 가로형 영상의 정지 화면과 MP4 출력.
- `scenes/samsung.json`, `hyundai.json`: 실측 장면 타이밍.
- `scenes/samsung-motion.json`, `hyundai-motion.json`: 오디오 기반 입 움직임과 눈 깜빡임 시점.
- `scenes/samsung.srt`, `hyundai.srt`: 별도 자막.
- `public/assets/audio/samsung/`, `audio/hyundai/`: 장면별 로컬 음성.
- `public/assets/characters/jeong-mouth-open-v1.png`, `jeong-blink-v1.png`: 정대리 얼굴 변형. 이채원은 기존 자산 재사용.
- `public/assets/backgrounds/studio-landscape-v1.png`: 신규 가로형 스튜디오.
- `public/assets/automotive/assembly-landscape-v1.png`: 신규 자동차 생산 라인 개념 일러스트.
- `references/LANDSCAPE-GENERATION.md`: 내장 생성 프롬프트.
- `out/samsung-landscape-stills/`, `hyundai-landscape-stills/`: 장면별 검수 이미지.

## 데이터와 검수

대본 원본은 `../data/build_data.py`입니다. 두 편의 형식을 가로형으로 바꾸고 현대차 진행자를 이채원으로 수정했습니다. 내레이션 원문, 검증 대상 주장, 공식 근거와 기대 판정 JSON은 변경하지 않았습니다. 대본 시점은 초안이고 실제 타이밍은 각 영상의 `scenes/*.json`을 기준으로 합니다.

화면은 좌우 진행자·정보 배치, 이미지 컷, 전체 화면 그래프, 작은 진행자 창과 와이프 전환을 사용합니다. 그래프는 가상 채널의 주장을 시각화하며, 검증 시연을 위한 의도적인 오류를 포함합니다. 반도체·자동차 이미지는 실제 회사 제품이나 공장 사진이 아닌 연출용 개념 이미지입니다.

입 움직임은 음성 크기에 반응하는 열림/닫힘 방식이며 발음별 정밀 립싱크는 아닙니다. 자막은 문장 단위 타이밍 초안입니다. 영상 길이는 30초이고 AAC 오디오 패킷 패딩으로 MP4 컨테이너 길이는 약 30.016초로 보일 수 있습니다.

타입 검사, 12개 장면 시각 검수, 원문 대사 일치, 오디오 비잘림, 900프레임 타임라인, 데이터 재생성 일치와 완성 MP4의 비디오·오디오 디코딩을 검사합니다. 최종 보고서는 `out/landscape-verification.json`입니다.
