# MoveTimer

Desktop timer app: consecutive break/work timers with scheduled sequences. Built with Electron, React, and Tailwind CSS.

## Running the app

```bash
npm install
npm run dev
```

This starts the Vite dev server and opens the Electron window. The timer keeps running when the window is minimized.

## Building

```bash
npm run build
```

Outputs go to `release/` (AppImage/deb on Linux, exe/nsis on Windows, dmg on macOS).

### macOS DMG: "App is damaged" or "can't be opened"

The app is not code-signed, so macOS Gatekeeper may block it with a "damaged" or "can't be opened" message. Remove the quarantine attribute and try again:

```bash
xattr -cr /Applications/PomodoroFlex.app
```

(If the app is elsewhere, use its path instead, e.g. `xattr -cr ~/Downloads/PomodoroFlex.app`.)

Alternatively: right‑click the app → **Open** → confirm "Open" in the dialog.

For a quicker unpacked build (no installers):

```bash
npm run build:dir
```

## Features

- Create sequences of work/break timers
- Schedule sequences by start/end time (auto-start)
- Dark mode and high-contrast support
- Export sequences to clipboard
- System notifications when timers end

## Optional: Timer end sound

Place `alarm.wav` in the `public/` folder for a sound when a timer completes. The app will work without it (notifications will still show).
