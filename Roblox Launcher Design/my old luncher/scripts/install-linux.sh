#!/bin/bash
set -e

APP_NAME="Oxevy Launcher"
APP_ID="oxevy-launcher"
VERSION="1.0.0"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist-electron"

# Colors
GREEN='\033[0;32m'
DIM='\033[2m'
NC='\033[0m'

echo "============================================="
echo "  Oxevy Launcher - Linux Installer"
echo "============================================="
echo ""

# Find AppImage
APPIMAGE=$(ls "$DIST_DIR"/*.AppImage 2>/dev/null | head -1)
if [ -z "$APPIMAGE" ]; then
  echo "Building AppImage first..."
  cd "$PROJECT_DIR"
  npm run build
  npx electron-builder --linux
  APPIMAGE=$(ls "$DIST_DIR"/*.AppImage 2>/dev/null | head -1)
fi

if [ -z "$APPIMAGE" ]; then
  echo "Error: no AppImage found in $DIST_DIR"
  exit 1
fi

echo "AppImage: $(basename "$APPIMAGE")"

# Install targets
INSTALL_DIR="${HOME}/.local/share/${APP_ID}"
BIN_DIR="${HOME}/.local/bin"
APP_DIRS="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/256x256/apps"

mkdir -p "$INSTALL_DIR" "$BIN_DIR" "$APP_DIRS" "$ICON_DIR"

# Copy AppImage
echo ""
echo "Installing to $INSTALL_DIR..."
cp "$APPIMAGE" "$INSTALL_DIR/${APP_ID}.AppImage"
chmod +x "$INSTALL_DIR/${APP_ID}.AppImage"

# Symlink to PATH
ln -sf "$INSTALL_DIR/${APP_ID}.AppImage" "$BIN_DIR/${APP_ID}"
echo "  → $BIN_DIR/${APP_ID}"

# Desktop entry
DESKTOP_FILE="$APP_DIRS/${APP_ID}.desktop"
cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Name=Oxevy Launcher
Comment=Oxevy Minecraft Launcher with Fabric support
Exec=${INSTALL_DIR}/${APP_ID}.AppImage
Icon=${APP_ID}
Categories=Game;
Type=Application
Terminal=false
StartupNotify=true
EOF

# Extract icon from AppImage
EXTRACT_DIR=$(mktemp -d)
"$INSTALL_DIR/${APP_ID}.AppImage" --appimage-extract "*.png" 2>/dev/null || true
if [ -f "$EXTRACT_DIR/icon.png" ]; then
  cp "$EXTRACT_DIR/icon.png" "$ICON_DIR/${APP_ID}.png"
fi
rm -rf "$EXTRACT_DIR"

# Fallback: use build icon if extraction failed
if [ ! -f "$ICON_DIR/${APP_ID}.png" ] && [ -f "$PROJECT_DIR/build/icon.png" ]; then
  cp "$PROJECT_DIR/build/icon.png" "$ICON_DIR/${APP_ID}.png"
fi

echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo "You can now run:"
echo "  ${DIM}${BIN_DIR}/${APP_ID}${NC}"
echo ""
echo "Or launch from your application menu."
echo ""
