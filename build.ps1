# Purpose: Build TreeNote from scratch - installs dependencies and creates single portable exe
# Usage: .\build.ps1

$ErrorActionPreference = "Stop"

# Skip code signing (no certificate configured)
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

Write-Host "=== TreeNote Build Script ===" -ForegroundColor Cyan

Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm ci

Write-Host "Patching electron-builder (symlink workaround)..." -ForegroundColor Yellow
node scripts/patch-builder.cjs

Write-Host "Running linter..." -ForegroundColor Yellow
npm run lint

Write-Host "Running type check..." -ForegroundColor Yellow
npm run typecheck

Write-Host "Running unit tests..." -ForegroundColor Yellow
npm run test

Write-Host "Building and packaging..." -ForegroundColor Yellow
npm run package:win

Write-Host "Reverting electron-builder patch..." -ForegroundColor Yellow
node scripts/patch-builder.cjs --revert

Write-Host "=== Build complete ===" -ForegroundColor Green
$exe = Get-ChildItem dist/*.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) {
    Write-Host "Output: $($exe.FullName) ($([math]::Round($exe.Length / 1MB, 1)) MB)" -ForegroundColor Green
} else {
    Write-Host "Executable is in dist/ directory"
}
