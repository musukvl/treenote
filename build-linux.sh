#!/bin/bash
# Purpose: Build TreeNote Linux AppImage and install the treenote CLI on PATH
# Usage: ./build-linux.sh

set -euo pipefail

APP_NAME="TreeNote"
CLI_NAME="treenote"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_BUILD_DIR="$ROOT_DIR/out"
PACKAGE_OUTPUT_DIR="$ROOT_DIR/dist"
INSTALL_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/treenote"
BIN_DIR="$HOME/.local/bin"

# Skip code signing (no certificate configured)
export CSC_IDENTITY_AUTO_DISCOVERY=false

echo "=== TreeNote Linux Build ==="

echo "Installing dependencies..."
npm ci

echo "Building..."
npm run build

echo "Cleaning stale package artifacts..."
rm -f "$APP_BUILD_DIR"/*.AppImage
rm -rf "$APP_BUILD_DIR"/linux-unpacked
rm -f "$PACKAGE_OUTPUT_DIR"/*.AppImage
rm -rf "$PACKAGE_OUTPUT_DIR"/linux-unpacked

echo "Packaging Linux AppImage..."
npx electron-builder --linux AppImage --config electron-builder.yml --config.directories.output="$PACKAGE_OUTPUT_DIR"

shopt -s nullglob
appimages=("$PACKAGE_OUTPUT_DIR"/"$APP_NAME"-*.AppImage "$PACKAGE_OUTPUT_DIR"/*.AppImage)
shopt -u nullglob

if [[ ${#appimages[@]} -eq 0 ]]; then
  echo "No AppImage was created in $PACKAGE_OUTPUT_DIR" >&2
  exit 1
fi

APPIMAGE="${appimages[0]}"
for candidate in "${appimages[@]}"; do
  if [[ "$candidate" -nt "$APPIMAGE" ]]; then
    APPIMAGE="$candidate"
  fi
done

echo "Installing AppImage..."
mkdir -p "$INSTALL_DIR" "$BIN_DIR"
cp "$APPIMAGE" "$INSTALL_DIR/$APP_NAME.AppImage"
chmod +x "$INSTALL_DIR/$APP_NAME.AppImage"

echo "Creating CLI launcher..."
cat > "$BIN_DIR/$CLI_NAME" <<EOF
#!/bin/bash
exec "$INSTALL_DIR/$APP_NAME.AppImage" --no-sandbox "\$@"
EOF
chmod +x "$BIN_DIR/$CLI_NAME"

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
  shell_name="$(basename "${SHELL:-}")"
  rc_file="$HOME/.profile"

  case "$shell_name" in
    zsh)
      rc_file="$HOME/.zshrc"
      ;;
    bash)
      rc_file="$HOME/.bashrc"
      ;;
  esac

  if [[ ! -f "$rc_file" ]] || ! grep -Fq "# TreeNote CLI path" "$rc_file"; then
    {
      echo ""
      echo "# TreeNote CLI path"
      echo 'export PATH="$HOME/.local/bin:$PATH"'
    } >> "$rc_file"
  fi

  echo "Added $BIN_DIR to PATH in $rc_file"
  echo "Restart your terminal or run: source $rc_file"
else
  echo "$BIN_DIR is already on PATH"
fi

echo "=== Build complete ==="
echo "Run TreeNote from the CLI with: $CLI_NAME"
