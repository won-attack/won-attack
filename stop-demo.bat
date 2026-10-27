@echo off
chcp 65001 >nul
rem WON Check 시연 창 3개(ChromaDB / 백엔드 / 프론트) 끄기
echo WON Check 시연을 끕니다...
taskkill /fi "WINDOWTITLE eq WON Check - ChromaDB :8000*" /t /f >nul 2>nul
taskkill /fi "WINDOWTITLE eq WON Check - Backend :8080*" /t /f >nul 2>nul
taskkill /fi "WINDOWTITLE eq WON Check - Frontend :5173*" /t /f >nul 2>nul
rem 창 제목이 바뀐 경우를 대비해 포트로도 정리
for %%p in (8000 8080 5173) do (
  for /f "tokens=5" %%i in ('netstat -ano ^| findstr /r /c:":%%p .*LISTENING"') do taskkill /pid %%i /t /f >nul 2>nul
)
echo 완료.
timeout /t 2 /nobreak >nul
