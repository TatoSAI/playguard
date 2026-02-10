@echo off
echo ========================================
echo   PlayGuard - Development Mode
echo ========================================
echo.

REM Remove the problematic environment variable
set ELECTRON_RUN_AS_NODE=

REM Verify it's removed
if defined ELECTRON_RUN_AS_NODE (
    echo [ERROR] Failed to clear ELECTRON_RUN_AS_NODE
    pause
    exit /b 1
) else (
    echo [OK] Environment is clean
)

echo.
echo Starting PlayGuard in development mode...
echo Hot reload enabled - changes will reflect automatically
echo.

REM Change to script directory
cd /d "%~dp0"

REM Run npm dev
call npm run dev

pause
