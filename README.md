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
