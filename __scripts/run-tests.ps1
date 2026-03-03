# Purpose: Run unit tests then e2e tests in sequence
# Usage: .\__scripts\run-tests.ps1

$ErrorActionPreference = "Stop"

Write-Host "Running unit tests..." -ForegroundColor Yellow
npm run test

Write-Host "Running e2e tests..." -ForegroundColor Yellow
npm run test:e2e

Write-Host "All tests passed." -ForegroundColor Green
