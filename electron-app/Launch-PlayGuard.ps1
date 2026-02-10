# PlayGuard Launcher - Development Mode
Write-Host "========================================"
Write-Host "  PlayGuard - Development Mode"
Write-Host "========================================"
Write-Host ""

# Remove the problematic environment variable
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue

# Verify it's removed
if (Test-Path Env:ELECTRON_RUN_AS_NODE) {
    Write-Host "[ERROR] Failed to clear ELECTRON_RUN_AS_NODE"
    pause
    exit 1
} else {
    Write-Host "[OK] Environment is clean"
}

Write-Host ""
Write-Host "Starting PlayGuard in development mode..."
Write-Host "Hot reload enabled - changes will reflect automatically"
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Run npm dev
npm run dev
