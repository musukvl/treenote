#!/bin/bash
# Purpose: Build TreeNote from scratch - installs dependencies and creates executable
# Usage: ./build.sh

set -euo pipefail

# Skip code signing (no certificate configured)
export CSC_IDENTITY_AUTO_DISCOVERY=false

echo "=== TreeNote Build Script ==="

echo "Installing dependencies..."
npm ci

echo "Patching electron-builder (symlink workaround)..."
node scripts/patch-builder.cjs

echo "Running linter..."
npm run lint

echo "Running type check..."
npm run typecheck

echo "Running unit tests..."
npm run test

echo "Building and packaging..."
npm run package

echo "Reverting electron-builder patch..."
node scripts/patch-builder.cjs --revert

echo "=== Build complete ==="
echo "Executable is in dist/ directory"
