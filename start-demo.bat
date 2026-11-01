@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
rem ======================================================================
rem  WON Check 시연 한 번에 실행 (Windows)
rem    더블클릭 또는:  start-demo.bat          (DB 있으면 그대로 사용)
rem                   start-demo.bat reset    (근거 DB 다시 적재)
rem  창 3개가 열립니다: ChromaDB(:8000) / 백엔드(:8080) / 프론트(:5173)
rem  끌 때는 stop-demo.bat 또는 각 창에서 Ctrl+C
rem ======================================================================
cd /d "%~dp0"
set "ROOT=%CD%"

echo.
echo [0/5] 준비물 확인
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  start "" notepad ".env"
  echo   .env 를 만들었습니다. 테스트^(Ollama^)는 그대로 저장, 시연^(OpenAI^)은 LLM_PROVIDER=openai 와 OPENAI_API_KEY 를 넣고 저장한 뒤 다시 실행하세요.
  goto :fail
)
rem .env 의 값을 환경 변수로 읽기 (# 줄은 건너뜀). 이 창에서 연 창들이 그대로 물려받음
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%b"=="" set "%%a=%%b"
)
rem AI 모델: .env 의 LLM_PROVIDER 하나로 대화 모델과 임베딩을 함께 맞춤
rem   openai : GPT + OpenAI 임베딩 (시연용, OPENAI_API_KEY 필요)
rem   ollama : 로컬 LLM + Ollama 임베딩 (테스트용, 키 불필요)
if not defined LLM_PROVIDER set "LLM_PROVIDER=openai"
if /i "%LLM_PROVIDER%"=="openai" goto :mode_openai
if /i "%LLM_PROVIDER%"=="ollama" goto :mode_ollama
echo   .env 의 LLM_PROVIDER 는 openai 또는 ollama 여야 합니다 ^(지금 값: %LLM_PROVIDER%^).
goto :fail
:mode_openai
set "LLM_PROVIDER=openai"
set "EMBEDDING_PROVIDER=openai"
if "%OPENAI_API_KEY%"=="" (
  start "" notepad ".env"
  echo   OpenAI 모드인데 .env 에 OPENAI_API_KEY 가 비어 있습니다. 열린 메모장에서 키를 넣고 저장한 뒤 다시 실행하세요.
  goto :fail
)
if not defined OPENAI_CHAT_MODEL set "OPENAI_CHAT_MODEL=gpt-4o-mini"
if not defined EMBEDDING_MODEL set "EMBEDDING_MODEL=text-embedding-3-small"
echo   AI 모델: OpenAI ^(대화 %OPENAI_CHAT_MODEL%, 임베딩 %EMBEDDING_MODEL%^)
goto :mode_done
:mode_ollama
set "LLM_PROVIDER=ollama"
set "EMBEDDING_PROVIDER=ollama"
if not defined OLLAMA_CHAT_MODEL set "OLLAMA_CHAT_MODEL=qwen3:4b-instruct"
if not defined OLLAMA_EMBEDDING_MODEL set "OLLAMA_EMBEDDING_MODEL=embeddinggemma"
echo   AI 모델: Ollama ^(대화 %OLLAMA_CHAT_MODEL%, 임베딩 %OLLAMA_EMBEDDING_MODEL%^)
:mode_done
rem 준비물 자동 설치 (winget): 없거나 버전이 낮으면 Python 3.10+, Node.js 18+, Java 21 을 설치
call :ensure_python || goto :fail
call :ensure_node || goto :fail
call :ensure_java || goto :fail
python -c "import chromadb, openai" >nul 2>nul || (
  echo   chromadb·openai 가 없어 설치합니다: pip install -r data\requirements.txt
  python -m pip install -r data\requirements.txt || goto :fail
)
call :java_major
for /f "delims=" %%v in ('python --version') do set "PYV=%%v"
for /f "delims=" %%v in ('node -v') do set "NODEV=%%v"
echo   준비 완료: %PYV%, Node %NODEV%, Java %JMAJ%

rem 백엔드 폴더 찾기 (backend\ 또는 backend\won-check-backend\)
set "BACKEND="
if exist "backend\gradlew.bat" set "BACKEND=%ROOT%\backend"
if not defined BACKEND if exist "backend\won-check-backend\gradlew.bat" set "BACKEND=%ROOT%\backend\won-check-backend"
if not defined BACKEND (
  echo   백엔드 코드^(gradlew.bat^)가 없습니다. 백엔드 브랜치가 main 에 합쳐졌는지 확인하세요.
  goto :fail
)

rem Ollama (LLM_PROVIDER=ollama 일 때만: 설치 → 서버 켜기 → 모델 내려받기)
if "%LLM_PROVIDER%"=="ollama" (
  call :ensure_ollama
echo.
echo [0/5] Ollama 준비
where ollama >nul 2>nul || set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
where ollama >nul 2>nul && goto :ollama_serve
call :need_winget || exit /b 1
echo   Ollama 가 없어 설치합니다 ^(winget: Ollama^)
winget install -e --id Ollama.Ollama --silent --accept-package-agreements --accept-source-agreements
set "PATH=%LOCALAPPDATA%\Programs\Ollama;%PATH%"
where ollama >nul 2>nul && goto :ollama_serve
echo   Ollama 설치 후에도 ollama 를 찾지 못했습니다. 이 창을 닫고 다시 실행하세요.
exit /b 1
:ollama_serve
curl -s -o nul http://localhost:11434/api/version >nul 2>nul && goto :ollama_models
echo   Ollama 서버 켜기 ^(새 창, :11434^)
start "WON Check - Ollama :11434" /min cmd /k ollama serve
set /a OTRY=0
:wait_ollama
set /a OTRY+=1
curl -s -o nul http://localhost:11434/api/version >nul 2>nul && goto :ollama_models
if !OTRY! GEQ 30 (echo   Ollama 서버가 30초 안에 켜지지 않았습니다. Ollama 창의 오류를 확인하세요.& exit /b 1)
timeout /t 1 /nobreak >nul
goto :wait_ollama
:ollama_models
call :pull_model %OLLAMA_CHAT_MODEL% || exit /b 1
call :pull_model %OLLAMA_EMBEDDING_MODEL% || exit /b 1
exit /b 0

:pull_model
set "OMODEL=%~1"
echo %OMODEL%| find ":" >nul || set "OMODEL=%OMODEL%:latest"
ollama list 2>nul | findstr /b /i /c:"%OMODEL% " /c:"%~1 " >nul && exit /b 0
echo   모델 내려받기: %~1 ^(처음 한 번만^)
ollama pull %~1 || (echo   모델을 내려받지 못했습니다: %~1& exit /b 1)
exit /b 0
