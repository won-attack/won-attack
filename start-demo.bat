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
  echo   .env 파일이 없습니다. .env.example 을 복사해 .env 를 만들고 OPENAI_API_KEY 를 넣으세요.
  goto :fail
)
rem .env 의 값을 환경 변수로 읽기 (# 줄은 건너뜀). 이 창에서 연 창들이 그대로 물려받음
for /f "usebackq eol=# tokens=1,* delims==" %%a in (".env") do (
  if not "%%b"=="" set "%%a=%%b"
)
if "%OPENAI_API_KEY%"=="" (
  echo   .env 에 OPENAI_API_KEY 가 비어 있습니다.
  goto :fail
)
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

echo.
echo [1/5] 근거 DB 적재
if /i "%~1"=="reset" (
  python data\init_db.py --reset || goto :fail
) else if not exist "data\chroma_db" (
  python data\init_db.py --reset || goto :fail
) else (
  echo   data\chroma_db 가 이미 있어 그대로 씁니다. 다시 적재하려면: start-demo.bat reset
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
echo [3/5] 근거 검색 점검 ^(7/7 이어야 정상^)
python data\check_db.py --server || (
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
echo 백엔드가 뜰 때까지 기다린 뒤 브라우저를 엽니다 ^(최대 2분^)...
set /a TRY=0
:wait_backend
set /a TRY+=1
curl -s -o nul http://localhost:8080 >nul 2>nul && goto :open
if !TRY! GEQ 120 goto :open
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
