# YouTube 전사 MVP

`pipeline.py`는 `video_inputs.json`의 URL을 받아 yt-dlp로 음성을 확보하고, FFmpeg로 16kHz mono PCM WAV를 만든 뒤 OpenAI whisper-1 구간 타임스탬프와 Responses API Structured Outputs로 결과를 만듭니다.

## 설치와 실행

Python 3.10 이상에서 프로젝트 루트를 기준으로 실행합니다. 기존 시연 의존성과 분리한 전사 전용 목록입니다.

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-transcription.txt
python pipeline.py
```

Windows에서는 `.venv\Scripts\activate`로 가상환경을 활성화합니다. 루트 `.env`의 `OPENAI_API_KEY`를 읽으며 이미 설정한 환경 변수가 우선합니다. 텍스트 모델은 `OPENAI_TEXT_MODEL` → `OPENAI_CHAT_MODEL` → `gpt-4o-mini` 순으로 선택합니다. `--model`로 직접 지정할 수 있습니다.

시스템 FFmpeg가 없으면 imageio-ffmpeg의 포함 실행 파일을 사용합니다. ffprobe는 필요하지 않습니다. 기본 언어는 한국어이며 `--language`로 변경합니다.

## 파일과 원본 보존

| 경로 | 역할 |
|---|---|
| `video_inputs.json` | URL 입력, 요청 영상 48WVf1ijerc 포함 |
| `pipeline.py` | 다운로드 → 음성 변환 → 전사 → 요약·기업명 생성 → 검증·저장 |
| `data/transcripts.json` | 기존 시연 예제, 읽기 전용으로 보존 |
| `data/disclosures.json` | 기존 공시, metadata.company만 표준 기업명 목록으로 사용 |
| `data/youtube_transcripts.json` | 새 영상 결과, 기존 파일을 덮어쓰지 않음 |
| `docs/youtube_transcripts.schema.json` | 기존 대본 예제에서 도출한 출력 검증 스키마 |
| `runs/<실행ID>/` | 음성·메타데이터·Whisper/Responses 응답·run_report.json, Git 제외 |

재실행하려면 `python pipeline.py --output data/youtube_transcripts_02.json`처럼 새 경로를 지정합니다. 결과가 이미 있으면 API 호출 전에 중단합니다. `--inputs`, `--disclosures`, `--runs-dir`로 입력·중간 경로를 변경할 수 있습니다.

## 키 없이 음성만 준비

```bash
python pipeline.py --prepare-only
```

YouTube 접근이 막히면 로컬 음성을 사용할 수 있습니다.

```bash
python pipeline.py --audio-file /path/to/audio.webm --metadata-file /path/to/metadata.json
```

로컬 메타데이터의 필수 키는 video_id, url, title, channel, published_at입니다. URL과 ID는 입력 파일과 일치해야 하며 로컬 처리는 한 번에 영상 한 개입니다. 알 수 없는 문자열 메타데이터는 빈 문자열로 명시합니다. YouTube가 추출 방식을 바꾸면 `python -m pip install -U yt-dlp`로 업데이트하세요.

## 출력과 한계

최상위는 영상 ID를 키로 하는 객체이며 기존 영상 필드와 segments의 time/text/caption을 유지합니다. transcript_source는 OPENAI_WHISPER_1입니다. time은 시작 초를 내림한 분:초이고, 원래 소수 시작/끝 시간은 speech_segments.json에 남깁니다.

600초마다 PCM 샘플 수로 분할해 청크별 약 19.2MB로 Whisper의 25MB 업로드 제한 이내로 만듭니다. 기본 최대 영상 길이는 900초이며 --max-seconds로 조정합니다. 분할 경계의 문장이 잘릴 수 있고 화자 분리는 하지 않습니다.

caption은 실제 화면 자막이 아니라 음성 요약입니다. 기업명과 요약만 모델이 생성하며 전사문·시간은 코드에서 보존합니다. 공시의 수치와 문장은 모델에 전달하지 않고 원 발언을 사실 교정하지 않습니다. 형식 준수와 내용의 정확성은 별개이므로 실제 결과는 확인해야 합니다.

거절·불완전 응답, 빈 요약, 구간 누락·중복, 잘못된 시간은 실패 처리합니다. 여러 영상 중 하나라도 실패하면 최종 합본은 쓰지 않고 중간 자료와 run_report.json의 stage/error_type을 남깁니다.

새 JSON의 API 분석 조회 연동은 다른 팀원이 별도로 진행합니다. 이 변경은 전사 결과 생성과 구간별 요약 보존에 한정합니다.

## 테스트

```bash
python -m unittest discover -s tests -p 'test_youtube_pipeline.py' -v
```

API 키 없이 URL·출력 형식·덮어쓰기 방지·구간 매핑·오류 처리를 검증하고, 실제 FFmpeg 601초 합성음 분할과 OpenAI SDK 모의 HTTP 직렬화/파싱을 확인합니다. 실제 영상의 결과는 모의 데이터와 분리합니다.

## 공식 문서

- [Speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text)
- [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses)

## 이번 반영의 검증 상태 (2026-10-27)

- 실제 won-check 체크아웃에서 오프라인 테스트 18개 전체 통과.
- 기존 data/transcripts.json과 data/disclosures.json은 반영 전 SHA-256과 일치.
- 확보한 SBS 뉴스 영상(48WVf1ijerc, 117초)의 실제 음성을 사용해 WAV 변환까지 재검증.
- 최초 실행은 키의 음성 요청 권한(api.model.audio.request) 부족으로 AuthenticationError/missing_scope 발생.
- 키를 All 권한으로 변경한 뒤 실제 whisper-1 전사와 Responses 요약까지 완료.
- 실제 영상의 data/youtube_transcripts.json 생성 완료: 영상 ID 48WVf1ijerc, 24개 구간, 언급 기업 삼성전자. 모의 응답을 사용하지 않음.
- 실제 응답에서 요약 모델이 구간을 합치는 문제를 확인해 배치별 요약 개수를 Structured Outputs 스키마의 minItems/maxItems로 강제하고 구간 보존 프롬프트를 보강. 기존 18개 테스트 통과 및 요약 배열 길이 제한 회귀 검사 포함.
- 최종 실행 기록: runs/20261027T101359Z_d6aef0f5/run_report.json, status=completed. 기존 대본·공시 SHA-256 불변 확인.
- 다운로드 음성과 중간 응답, 키는 커밋 대상에서 제외. 최종 생성 JSON과 처리 코드·테스트·안내 문서만 변경 대상으로 관리.
