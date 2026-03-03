# Purpose: Remove all build artifacts and node_modules for a fresh start
# Usage: .\__scripts\clean-build.ps1

$ErrorActionPreference = "Stop"

$dirs = @("node_modules", "out", "dist")

foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "Removing $dir..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force $dir
    }
}

Write-Host "Clean complete." -ForegroundColor Green
