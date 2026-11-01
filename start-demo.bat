@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
rem ======================================================================
rem  WON Check 시연 한 번에 실행 (Windows)
rem    더블클릭 또는:  start-demo.bat           (실행할 때 모델을 고름)
rem                   start-demo.bat openai    (OpenAI 로 바로 실행)
rem                   start-demo.bat ollama    (Ollama 로 바로 실행)
rem                   start-demo.bat reset     (근거 DB 다시 적재, 위와 함께 써도 됨)
rem  창 3개가 열립니다: ChromaDB(:8000) / 백엔드(:8080) / 프론트(:5173)
rem  끌 때는 stop-demo.bat 또는 각 창에서 Ctrl+C
rem ======================================================================
cd /d "%~dp0"
set "ROOT=%CD%"

set "RESET=0"
set "ARG_MODEL="
for %%a in (%*) do (
  if /i "%%~a"=="reset" set "RESET=1"
  if /i "%%~a"=="openai" set "ARG_MODEL=openai"
  if /i "%%~a"=="ollama" set "ARG_MODEL=ollama"
)

echo.
echo [0/5] 준비물 확인
if not exist ".env" (
  copy /y ".env.example" ".env" >nul
  echo   .env 가 없어 .env.example 로 만들었습니다.
)
rem .env 의 값을 환경 변수로 읽기 (# 줄은 건너뜀). 이 창에서 연 창들이 그대로 물려받음
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%b"=="" set "%%a=%%b"
)
if not defined OLLAMA_CHAT_MODEL set "OLLAMA_CHAT_MODEL=qwen3:4b-instruct"
if not defined OLLAMA_EMBEDDING_MODEL set "OLLAMA_EMBEDDING_MODEL=embeddinggemma"
if not defined OPENAI_CHAT_MODEL set "OPENAI_CHAT_MODEL=gpt-4o-mini"
if not defined EMBEDDING_MODEL set "EMBEDDING_MODEL=text-embedding-3-small"

rem ---------- AI 모델 고르기: 대화 모델과 임베딩을 함께 맞춤 ----------
rem   1 ollama : 로컬 LLM + Ollama 임베딩 (테스트용, 무료)
rem   2 openai : GPT + OpenAI 임베딩 (시연용, 유료, OPENAI_API_KEY 필요)
if defined ARG_MODEL (
  set "LLM_PROVIDER=!ARG_MODEL!"
  goto :model_chosen
)
set "DEF_PICK=1"
if /i "%LLM_PROVIDER%"=="openai" set "DEF_PICK=2"
:ask_model
echo.
echo 어떤 모델을 사용하시겠습니까?
echo   1^> Ollama ^(로컬 실행, %OLLAMA_CHAT_MODEL%, 무료^)
echo   2^> OpenAI ^(%OPENAI_CHAT_MODEL%, 유료^)
set "PICK="
set /p "PICK=입력 [Enter = %DEF_PICK%]: "
if not defined PICK set "PICK=%DEF_PICK%"
if "%PICK%"=="1" (
  set "LLM_PROVIDER=ollama"
  goto :model_chosen
)
if "%PICK%"=="2" (
  set "LLM_PROVIDER=openai"
  goto :model_chosen
)
echo   1 또는 2 를 입력하세요.
goto :ask_model
:model_chosen
set "EMBEDDING_PROVIDER=%LLM_PROVIDER%"

if "%LLM_PROVIDER%"=="ollama" goto :model_ollama
rem OpenAI: 키가 없으면 입력받아 .env 에 저장
if defined OPENAI_API_KEY goto :model_openai
echo.
echo   .env 에 OpenAI API 키가 없습니다. 키를 붙여 넣고 Enter 를 누르세요 ^(sk- 로 시작, .env 에만 저장됨^).
:ask_key
set "NEWKEY="
set /p "NEWKEY=OpenAI API 키: "
if not defined NEWKEY (
  echo   키를 입력하세요. 그만두려면 창을 닫으세요.
  goto :ask_key
)
set "NEWKEY=!NEWKEY: =!"
if not "!NEWKEY:~0,3!"=="sk-" (
  echo   OpenAI API 키는 sk- 로 시작합니다. 다시 입력하세요.
  goto :ask_key
)
set "OPENAI_API_KEY=!NEWKEY!"
call :set_env OPENAI_API_KEY !NEWKEY! || goto :fail
echo   키를 .env 에 저장했습니다.
:model_openai
echo   AI 모델: OpenAI ^(대화 %OPENAI_CHAT_MODEL%, 임베딩 %EMBEDDING_MODEL%^)
goto :model_done
:model_ollama
echo   AI 모델: Ollama ^(대화 %OLLAMA_CHAT_MODEL%, 임베딩 %OLLAMA_EMBEDDING_MODEL%^)
:model_done
rem 고른 모델을 .env 에 저장 (다음 실행의 기본값)
call :set_env LLM_PROVIDER %LLM_PROVIDER% || goto :fail
call :set_env EMBEDDING_PROVIDER %LLM_PROVIDER% || goto :fail

echo.
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

rem Ollama (Ollama 를 골랐을 때만: 설치 → 서버 켜기 → 모델 내려받기)
if "%LLM_PROVIDER%"=="ollama" (
  call :ensure_ollama || goto :fail
)

echo.
echo [1/5] 근거 DB 적재 ^(%EMBEDDING_PROVIDER% 임베딩^)
rem OpenAI·Ollama 근거는 data\chroma_db 안에 컬렉션을 나눠 저장 (disclosures / disclosures_ollama)
rem 지금 모델용 컬렉션이 비었거나 임베딩 설정이 바뀌었으면 적재
set "NEED_INIT=%RESET%"
if "!NEED_INIT!"=="0" python -c "import sys; sys.path.insert(0, 'data'); from init_db import open_collection; sys.exit(0 if open_collection()[0].count() else 1)" >nul 2>nul || set "NEED_INIT=1"
if "!NEED_INIT!"=="1" (
  python data\init_db.py --reset || goto :fail
) else (
  echo   이미 적재된 근거 DB 를 그대로 씁니다. 다시 적재하려면: start-demo.bat reset
)

echo.
echo [2/5] ChromaDB 서버 켜기 ^(새 창, :8000^)
start "WON Check - ChromaDB :8000" cmd /k python -c "from chromadb.cli.cli import app; app()" run --path "%ROOT%\data\chroma_db" --port 8000
set /a TRY=0
:wait_chroma
set /a TRY+=1
curl -s http://localhost:8000/api/v2/heartbeat >nul 2>nul && goto :chroma_ok
if !TRY! GEQ 30 (echo   ChromaDB 가 30초 안에 켜지지 않았습니다. ChromaDB 창의 오류를 확인하세요. & goto :fail)
timeout /t 1 /nobreak >nul
goto :wait_chroma
:chroma_ok
echo   ChromaDB 준비 완료

echo.
if "%LLM_PROVIDER%"=="openai" (
  echo [3/5] 근거 검색 점검 ^(7/7 이어야 정상^)
  set "CHECK_ARGS=--server --strict"
) else (
  echo [3/5] 근거 검색 점검 ^(Ollama 테스트 모드: 7/7 이 아니어도 계속 진행^)
  set "CHECK_ARGS=--server"
)
python data\check_db.py !CHECK_ARGS! || (
  echo   점검 실패: 데이터 쪽 문제입니다. start-demo.bat reset 으로 다시 적재해 보세요.
  goto :fail
)

echo.
echo [4/5] 백엔드 켜기 ^(새 창, :8080, live 모드^)
set "WONCHECK_MODE=live"
set "WONCHECK_DATA_PATH=%ROOT%\data"
set "CHROMA_URL=http://localhost:8000"
start "WON Check - Backend :8080" cmd /k "cd /d "%BACKEND%" && gradlew.bat bootRun"

echo.
echo [5/5] 프론트 켜기 ^(새 창, :5173, 실제 백엔드 사용^)
set "VITE_USE_MOCK=false"
start "WON Check - Frontend :5173" cmd /k "cd /d "%ROOT%\frontend" && (if not exist node_modules npm install) && npm run dev"

echo.
echo 백엔드가 뜰 때까지 기다린 뒤 브라우저를 엽니다 ^(최대 15분^).
echo 첫 실행은 Gradle·라이브러리 다운로드로 5분 넘게 걸릴 수 있습니다. 진행 상황은 백엔드 창에서 보세요.
set /a TRY=0
:wait_backend
set /a TRY+=1
curl -s -o nul http://localhost:8080 >nul 2>nul && goto :open
if !TRY! GEQ 900 goto :open
timeout /t 1 /nobreak >nul
goto :wait_backend
:open
start "" http://localhost:5173
echo.
echo 완료! 브라우저에서 http://localhost:5173 을 확인하세요.
echo 끌 때: stop-demo.bat
echo.
pause
exit /b 0

:fail
echo.
echo 실행을 멈췄습니다. 위 메시지를 확인하세요.
pause
exit /b 1

rem ======================================================================
rem  .env 의 한 줄 바꾸기 (없으면 추가). 사용: call :set_env 이름 값
rem ======================================================================
:set_env
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Join-Path '%ROOT%' '.env'; $k = '%~1'; $v = '%~2'; $o = New-Object System.Collections.Generic.List[string]; $f = $false; foreach ($x in [IO.File]::ReadAllLines($p)) { if ($x.StartsWith($k + '=')) { $o.Add($k + '=' + $v); $f = $true } else { $o.Add($x) } }; if (-not $f) { $o.Add($k + '=' + $v) }; [IO.File]::WriteAllLines($p, $o, (New-Object System.Text.UTF8Encoding $false))" || (echo   .env 를 저장하지 못했습니다: %~1& exit /b 1)
exit /b 0

rem ======================================================================
rem  준비물 자동 설치 (winget)
rem ======================================================================
:need_winget
where winget >nul 2>nul && exit /b 0
echo   winget^(앱 설치 관리자^)이 없어 자동 설치를 할 수 없습니다.
echo   Microsoft Store 에서 '앱 설치 관리자'를 설치하거나, Python 3.10+ / Node.js 18+ / Java 21 을 직접 설치하세요.
exit /b 1

:ensure_python
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul && exit /b 0
call :need_winget || exit /b 1
echo   Python 3.10 이상이 없어 설치합니다 ^(winget: Python 3.12^)
winget install -e --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements --override "/quiet InstallAllUsers=0 PrependPath=1 Include_launcher=0"
set "PATH=%LOCALAPPDATA%\Programs\Python\Python312;%LOCALAPPDATA%\Programs\Python\Python312\Scripts;%PATH%"
python -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)" >nul 2>nul && exit /b 0
echo   Python 설치 후에도 python 을 찾지 못했습니다. 이 창을 닫고 다시 실행하세요.
exit /b 1

:ensure_node
node -e "process.exit(+process.versions.node.split('.')[0] >= 18 ? 0 : 1)" >nul 2>nul && where npm >nul 2>nul && exit /b 0
call :need_winget || exit /b 1
echo   Node.js 18 이상이 없어 설치합니다 ^(winget: Node.js LTS, 관리자 승인 창이 뜰 수 있음^)
winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
set "PATH=%ProgramFiles%\nodejs;%PATH%"
node -e "process.exit(+process.versions.node.split('.')[0] >= 18 ? 0 : 1)" >nul 2>nul && where npm >nul 2>nul && exit /b 0
echo   Node.js 설치 후에도 node/npm 을 찾지 못했습니다. 이 창을 닫고 다시 실행하세요.
exit /b 1

:ensure_java
call :java_major
if defined JMAJ if !JMAJ! GEQ 21 exit /b 0
rem 기본 java 가 다른 버전이면, 이미 설치된 JDK 21 을 먼저 찾음
call :find_jdk21 && goto :java_set
call :need_winget || exit /b 1
echo   Java 21 이 없어 설치합니다 ^(winget: Eclipse Temurin 21 JDK, 관리자 승인 창이 뜰 수 있음^)
winget install -e --id EclipseAdoptium.Temurin.21.JDK --silent --accept-package-agreements --accept-source-agreements
call :find_jdk21 || (echo   Java 21 설치 후에도 JDK 폴더를 찾지 못했습니다. 이 창을 닫고 다시 실행하세요.& exit /b 1)
:java_set
set "PATH=%JAVA_HOME%\bin;%PATH%"
call :java_major
if defined JMAJ if !JMAJ! GEQ 21 exit /b 0
echo   Java 21 을 찾지 못했습니다 ^(JAVA_HOME=%JAVA_HOME%^)
exit /b 1

:find_jdk21
set "JAVA_HOME="
for /d %%d in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*" "%ProgramFiles%\Java\jdk-21*" "%ProgramFiles%\Microsoft\jdk-21*" "%ProgramFiles%\Zulu\zulu-21*") do set "JAVA_HOME=%%~d"
if not defined JAVA_HOME exit /b 1
if exist "%JAVA_HOME%\bin\java.exe" exit /b 0
set "JAVA_HOME="
exit /b 1

:java_major
set "JV="
set "JMAJ="
for /f "tokens=3" %%v in ('java -version 2^>^&1 ^| findstr /i "version"') do set "JV=%%~v"
if not defined JV exit /b 0
for /f "delims=." %%m in ("%JV%") do set "JMAJ=%%m"
exit /b 0

:ensure_ollama
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
