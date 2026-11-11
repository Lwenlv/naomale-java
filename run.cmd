@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0release"

where java >nul 2>nul
if errorlevel 1 (
  echo.
  echo   Java not found. Please install JDK 17+ and add it to PATH.
  pause
  exit /b 1
)

if not exist naomale-java.jar (
  echo.
  echo   release\naomale-java.jar not found.
  echo   Please run build.cmd first.
  pause
  exit /b 1
)

if not exist application.yml (
  echo.
  echo   release\application.yml not found.
  pause
  exit /b 1
)

echo.
echo   Starting Naomale ...
echo   Open http://localhost:3000
echo   Press Ctrl+C or close this window to stop.
echo.

java -jar naomale-java.jar --spring.config.additional-location=file:./application.yml
echo.
echo   Server stopped.
pause
