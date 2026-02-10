@echo off
echo ========================================
echo PlayGuard - Screenshot Testing
echo ========================================
echo.

REM Unset ELECTRON_RUN_AS_NODE to prevent issues
set ELECTRON_RUN_AS_NODE=

echo Starting PlayGuard with screenshot viewer...
cd electron-app
call npm run dev

pause
