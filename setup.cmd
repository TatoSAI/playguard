@echo off
REM ========================================
REM PlayGuard - Project Setup Script
REM ========================================

echo.
echo ========================================
echo   PlayGuard Development Setup
echo ========================================
echo.

REM Check Node.js installation
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo [OK] Node.js found: %NODE_VERSION%

REM Check npm installation
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm is not installed
    pause
    exit /b 1
)

REM Check npm version
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo [OK] npm found: %NPM_VERSION%

REM Check ADB installation
where adb >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] ADB (Android Debug Bridge) not found in PATH
    echo You'll need ADB for Android device testing
    echo Download from: https://developer.android.com/studio/releases/platform-tools
    echo.
) else (
    for /f "tokens=*" %%i in ('adb version ^| findstr "Version"') do set ADB_VERSION=%%i
    echo [OK] ADB found: %ADB_VERSION%
)

echo.
echo ========================================
echo   Installing Dependencies
echo ========================================
echo.

REM Navigate to electron-app directory
cd electron-app

REM Install dependencies
echo Installing npm packages...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully
echo.

REM Go back to root
cd ..

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo To start development:
echo   1. cd electron-app
echo   2. Run: Launch-PlayGuard.cmd
echo      Or:  npm run dev
echo.
echo For more information, see README.md
echo.

pause
