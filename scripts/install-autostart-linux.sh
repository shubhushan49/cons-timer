#!/usr/bin/env bash
# Install Pomodoro Flex to run automatically at user login (Linux)
# Usage: ./scripts/install-autostart-linux.sh [path-to-executable]
#
# For deb install:   ./scripts/install-autostart-linux.sh /opt/PomodoroFlex/PomodoroFlex
# For AppImage:      ./scripts/install-autostart-linux.sh /path/to/PomodoroFlex-1.0.0.AppImage

set -e

EXEC_PATH="${1:-}"

if [ -z "$EXEC_PATH" ]; then
  echo "Usage: $0 <path-to-executable>"
  echo ""
  echo "Examples:"
  echo "  Deb:     $0 /opt/PomodoroFlex/PomodoroFlex"
  echo "  AppImage: $0 \$HOME/Applications/PomodoroFlex-1.0.0.AppImage"
  exit 1
fi

if [ ! -f "$EXEC_PATH" ] && [ ! -x "$EXEC_PATH" ]; then
  echo "Error: $EXEC_PATH not found or not executable"
  exit 1
fi

AUTOSTART_DIR="$HOME/.config/autostart"
mkdir -p "$AUTOSTART_DIR"

DESKTOP_FILE="$AUTOSTART_DIR/pomodoroflex.desktop"

# AppImage needs --no-sandbox; deb may need it too
if [[ "$EXEC_PATH" == *.AppImage ]]; then
  EXEC_LINE="Exec=\"$EXEC_PATH\" --no-sandbox"
else
  EXEC_LINE="Exec=\"$EXEC_PATH\" --no-sandbox"
fi

cat > "$DESKTOP_FILE" << EOF
[Desktop Entry]
Type=Application
Name=Pomodoro Flex
Comment=Gentle reminders to stretch and walk
$EXEC_LINE
Terminal=false
Hidden=false
X-GNOME-Autostart-enabled=true
X-GNOME-Autostart-Delay=5
EOF

echo "Installed autostart: $DESKTOP_FILE"
echo "Pomodoro Flex will start when you log in."
echo ""
echo "To disable: rm $DESKTOP_FILE"
