#!/bin/bash
# Purpose: Backward-compatible wrapper for the root release script.
# Usage: ./__scripts/release-mac.sh 1.0.3

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "${SCRIPT_DIR}/../release-mac.sh" "$@"
