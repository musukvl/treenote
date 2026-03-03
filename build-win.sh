#!/bin/bash
# Purpose: Build TreeNote single-file Windows executable
# Usage: ./build-win.sh

set -euo pipefail

export CSC_IDENTITY_AUTO_DISCOVERY=false

echo "=== TreeNote Windows Build ==="

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Packaging Windows executable..."
npx electron-builder --win --config electron-builder.yml --config.directories.output=out

echo "=== Build complete ==="
echo "Executable is in out/ directory"
