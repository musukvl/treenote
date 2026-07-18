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

echo "Registering .tnyml file type..."
DATA_HOME="${XDG_DATA_HOME:-$HOME/.local/share}"
MIME_DIR="$DATA_HOME/mime/packages"
ICON_DIR="$DATA_HOME/icons/hicolor/256x256/mimetypes"
DESKTOP_DIR="$DATA_HOME/applications"
DESKTOP_FILE="$DESKTOP_DIR/com.treenote.app.desktop"

mkdir -p "$MIME_DIR" "$ICON_DIR" "$DESKTOP_DIR"

cat > "$MIME_DIR/treenote.xml" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
  <mime-type type="application/x-treenote">
    <comment>TreeNote hierarchical notes file</comment>
    <icon name="application-x-treenote"/>
    <glob pattern="*.tnyml"/>
  </mime-type>
</mime-info>
EOF

cp "$ROOT_DIR/resources/file-icon.png" "$ICON_DIR/application-x-treenote.png"

# AppImages are not installed system-wide, so provide a desktop entry that
# launches via the CLI wrapper and declares the mime type.
cat > "$DESKTOP_FILE" <<EOF
[Desktop Entry]
Name=TreeNote
Comment=Hierarchical notes management application
Exec=$BIN_DIR/$CLI_NAME %f
Icon=$INSTALL_DIR/icon.png
Terminal=false
Type=Application
Categories=Office;Utility;
MimeType=application/x-treenote;
StartupWMClass=com.treenote.app
EOF

cp "$ROOT_DIR/resources/icon.png" "$INSTALL_DIR/icon.png"

command -v update-mime-database >/dev/null 2>&1 && update-mime-database "$DATA_HOME/mime" || true
command -v update-desktop-database >/dev/null 2>&1 && update-desktop-database "$DESKTOP_DIR" || true
command -v xdg-mime >/dev/null 2>&1 && xdg-mime default com.treenote.app.desktop application/x-treenote || true

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
