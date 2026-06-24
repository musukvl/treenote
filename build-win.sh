#!/bin/bash
# Purpose: Build TreeNote single-file Windows executable
# Usage: ./build-win.sh

set -euo pipefail

export CSC_IDENTITY_AUTO_DISCOVERY=false
PACKAGE_OUTPUT_DIR="dist"

echo "=== TreeNote Windows Build ==="

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Cleaning stale package artifacts..."
rm -f out/*.exe
rm -rf out/win-unpacked

echo "Packaging Windows executable..."
npx electron-builder --win --config electron-builder.yml --config.directories.output="$PACKAGE_OUTPUT_DIR"

echo "=== Build complete ==="
echo "Executable is in $PACKAGE_OUTPUT_DIR/ directory"
