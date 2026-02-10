#!/bin/bash

# ========================================
# PlayGuard - Project Setup Script
# ========================================

echo ""
echo "========================================"
echo "  PlayGuard Development Setup"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}[OK]${NC} Node.js found: $NODE_VERSION"

# Check npm installation
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}[OK]${NC} npm found: v$NPM_VERSION"

# Check ADB installation
if ! command -v adb &> /dev/null; then
    echo -e "${YELLOW}[WARN]${NC} ADB (Android Debug Bridge) not found in PATH"
    echo "You'll need ADB for Android device testing"
    echo "Download from: https://developer.android.com/studio/releases/platform-tools"
    echo ""
else
    ADB_VERSION=$(adb version | grep "Version" | head -n 1)
    echo -e "${GREEN}[OK]${NC} ADB found: $ADB_VERSION"
fi

echo ""
echo "========================================"
echo "  Installing Dependencies"
echo "========================================"
echo ""

# Navigate to electron-app directory
cd electron-app || exit 1

# Install dependencies
echo "Installing npm packages..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}[ERROR]${NC} Failed to install dependencies"
    exit 1
fi

echo ""
echo -e "${GREEN}[OK]${NC} Dependencies installed successfully"
echo ""

# Go back to root
cd ..

echo ""
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo ""
echo "To start development:"
echo "  1. cd electron-app"
echo "  2. Run: npm run dev"
echo ""
echo "For more information, see README.md"
echo ""
