@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found. Please install Node.js 22.12+ to build the frontend.
  pause
  exit /b 1
)
where mvn >nul 2>nul
if errorlevel 1 (
  echo Maven not found. Please install Maven 3.9+.
  pause
  exit /b 1
)

echo [1/4] Installing frontend dependencies...
pushd frontend
call npm install --ignore-scripts --no-audit --no-fund
if errorlevel 1 (popd & pause & exit /b 1)

echo [2/4] Building frontend...
call npm run build
if errorlevel 1 (popd & pause & exit /b 1)
popd

echo [3/4] Copying frontend into backend resources...
if exist backend\src\main\resources\static rmdir /s /q backend\src\main\resources\static
mkdir backend\src\main\resources\static
xcopy frontend\dist\* backend\src\main\resources\static\ /E /I /Y >nul

echo [4/4] Packaging single jar...
pushd backend
call mvn clean package -DskipTests
if errorlevel 1 (popd & pause & exit /b 1)
popd

if not exist release mkdir release
copy /Y backend\target\naomale-java.jar release\naomale-java.jar >nul

echo.
echo   Build finished: release\naomale-java.jar
echo   Linux package: release\ (jar + application.yml + start.sh + stop.sh)
pause
