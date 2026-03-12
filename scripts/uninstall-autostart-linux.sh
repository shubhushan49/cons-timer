#!/usr/bin/env bash
# Remove Pomodoro Flex from automatic startup (Linux)

AUTOSTART_FILE="$HOME/.config/autostart/pomodoroflex.desktop"

if [ -f "$AUTOSTART_FILE" ]; then
  rm "$AUTOSTART_FILE"
  echo "Removed autostart: $AUTOSTART_FILE"
else
  echo "Autostart file not found (already removed?)"
fi
