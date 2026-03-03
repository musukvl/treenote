#!/bin/bash
# Purpose: Build TreeNote from scratch - installs dependencies and creates executable
# Usage: ./build.sh

set -euo pipefail

# Skip code signing (no certificate configured)
export CSC_IDENTITY_AUTO_DISCOVERY=false

echo "=== TreeNote Build Script ==="

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "=== Build complete ==="
