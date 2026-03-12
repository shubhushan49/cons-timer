# Pomodoro Flex – Technical Documentation

## Overview

Pomodoro Flex is an Electron desktop application that provides flexible pomodoro-style timer sequences for work and break intervals. It runs on Linux, macOS, and Windows, with a React frontend and SQLite (via sql.js) for persistence. The app supports multiple concurrent timer sequences, scheduled auto-start within time windows, and system tray integration.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Electron Main Process                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ main.js     │  │ migrations  │  │ sql.js (SQLite in RAM)   │  │
│  │ - Window    │  │ - Schema    │  │ - movetimer.db           │  │
│  │ - Tray      │  │ - Migrate   │  │ - IPC handlers (db:*)   │  │
│  │ - IPC       │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ preload.js → contextBridge
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Renderer Process (React)                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Vite + React + React Router                                   ││
│  │ - Pages: Splash, Onboarding, Dashboard, Sequences, Settings   ││
│  │ - Contexts: TimerProvider, ThemeProvider, PickerContext       ││
│  │ - Components: TimerCard, ScrollPicker, TimerPickerModal, etc. ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Services (src/services/)                                      ││
│  │ - timerEngine.ts   Core timer logic, multi-run state          ││
│  │ - scheduler.ts     Auto-start sequences in time windows       ││
│  │ - notifications.ts Timer-end & start-time notifications      ││
│  │ - sound.ts         Web Audio API timer sounds                 ││
│  └─────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Database Layer (src/db/) – via IPC to main process            ││
│  │ - database.ts   Adapter for electronAPI.db                    ││
│  │ - sequences.ts  CRUD for sequences & timers                   ││
│  │ - timerState.ts active_runs persistence                       ││
│  │ - stats.ts      daily_stats, timer_runs                       ││
│  │ - settings.ts   key-value settings                            ││
│  │ - schema.ts     TypeScript types for SQLite rows              ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
cons-timer/
├── electron/           # Electron main process
│   ├── main.js         # Window, tray, IPC, sql.js init
│   ├── preload.js      # contextBridge for renderer
│   └── migrations.js   # SQL schema migrations
├── src/
│   ├── main.tsx        # React entry point
│   ├── App.tsx         # Routes, providers
│   ├── db/             # Database access (IPC-backed)
│   ├── context/        # React contexts (Timer, Theme, Picker)
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   └── services/       # Core business logic
├── public/             # Static assets (alarm.wav)
├── assets/             # Icons
├── build/               # Generated icons for electron-builder
└── scripts/            # Build & autostart scripts
```

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `sequences` | Timer sequences (name, loop_type, daily_limit_count, start_time, end_time, enabled, sound_id) |
| `timers` | Individual timers in a sequence (duration, label, type, vibration_enabled) |
| `active_runs` | Currently running/paused sequences (one row per sequence, replaces legacy timer_state) |
| `timer_runs` | Historical run completions |
| `daily_stats` | Breaks taken and movement bonus per date |
| `settings` | Key-value app settings (theme, onboarding_done, etc.) |

### Key Types

- **LoopType**: `indefinite` | `daily_limit`
- **TimerType**: `break` | `work`
- **TimerStatus**: `idle` | `running` | `paused` | `snoozed`

---

## Services (src/services/)

### timerEngine.ts

The core timer engine. Manages multiple concurrent runs in memory and persists state to `active_runs`.

**Key exports:**
- `start(sequence, timers)` – Start a sequence
- `pause(sequenceId)` – Pause
- `resume(sequenceId)` – Resume
- `snooze(sequenceId)` – Add 5 minutes and resume
- `stop(sequenceId)` – Stop and remove run
- `subscribe(listener)` – Subscribe to state changes
- `loadPersistedState(getSequence, getTimers)` – Restore runs from DB on app start
- `setOnTimerEnd(cb)` – Callback when a timer ends (sound, notification)
- `setNotificationFns(schedule, cancel)` – Used to schedule/cancel timer-end notifications

**Internal flow:**
- `runs` Map: `sequenceId → RunState`
- `onTick()` every 1 second: decrements `remainingSeconds`, calls `advanceToNextTimer()` when 0
- `advanceToNextTimer()`: records completion, moves to next timer or loops; for `daily_limit`, stops when limit reached
- Persists to `active_runs` every 5 ticks

### scheduler.ts

Auto-starts enabled sequences when the current time falls within their `start_time`–`end_time` window.

**Key exports:**
- `startScheduler()` – Start 30s check interval
- `stopScheduler()` – Stop checks
- `clearAutoStarted(sequenceId)` – Reset per-day auto-start for a sequence (e.g. after edit)
- `runSchedulerCheckNow()` – Manual trigger (Settings dev button)

**Logic:**
- Every 30 seconds, checks `now` against each enabled sequence’s window
- If `start_time <= now < end_time` and not already auto-started today → `TimerEngine.start()`
- If a run is past `end_time` → `TimerEngine.stop()`
- `autoStartedToday` Set prevents re-starting the same sequence on the same day

### notifications.ts

Schedules and shows notifications for timer end and sequence start time.

**Key exports:**
- `scheduleTimerEnd(sequenceId, secondsFromNow, type, label)` – Schedule “Time to Move!” / “Work session over”
- `cancelScheduled(sequenceId)` – Cancel timer-end notification
- `fireTimerEndNow(type, label, nextLabel)` – Show “Break is over” / “Sequence finished”
- `scheduleStartTimeNotification(sequenceId, sequenceName, startTimeMinutes)` – “Time to start X”
- `cancelStartTimeNotification(sequenceId)` – Cancel start-time notification
- `scheduleAllStartTimeNotifications()` – Schedule for all enabled sequences on load

**Implementation:**
- Uses `setTimeout` for scheduling
- In Electron: `electronAPI.showNotification` (main-process Notification)
- In browser: Web `Notification` API

### sound.ts

Plays timer-end sounds via Web Audio API or `alarm.wav` for the custom option.

**Key exports:**
- `playTimerEndSound(overrideId?)` – Play sound; `overrideId` from sequence’s `sound_id`
- `TIMER_SOUND_OPTIONS` – List of sound IDs and labels
- `stopSound()` – Stop custom audio

**Sounds:**
- 10 synthesized tones (chimes, soft_bell, gentle, wind_chime, soft_harp, singing_bowl, morning_bell, crystal, soft_ding, warm_tone)
- `custom` – plays `public/alarm.wav`

---

## Database Layer (src/db/)

### database.ts

Wraps `window.electronAPI.db` (IPC) as a `DatabaseAdapter`. Exposes `execAsync`, `runAsync`, `getFirstAsync`, `getAllAsync`.

### sequences.ts

CRUD for sequences and timers:
- `getSequences()`, `getSequenceById()`, `createSequence()`, `updateSequence()`, `deleteSequence()`, `setSequenceEnabled()`
- `getTimersBySequenceId()`, `createTimer()`, `updateTimer()`, `deleteTimer()`, `reorderTimers()`

### timerState.ts

- `getAllActiveRuns()` – Rows from `active_runs` for running/paused/snoozed
- `saveActiveRun()` – Upsert one run
- `deleteActiveRun()` – Remove run

### stats.ts

- `getTodayStats()` – Breaks and movement bonus for today
- `recordTimerCompletion()` – Increment break count, insert `timer_runs`
- `addMovementBonus()` – Add movement minutes to today

### settings.ts

- `getSetting(key)`, `setSetting(key, value)`, `getAllSettings()`
- Defaults: `theme`, `high_contrast`, `onboarding_done`, `movement_multiplier`, etc.

---

## Contexts (src/context/)

### TimerContext.tsx

- Loads persisted runs via `TimerEngine.loadPersistedState`
- Starts scheduler, wires notification fns and timer-end callback
- Syncs state to Electron tray (if `electronAPI` exists)
- Exposes `runs`, `start`, `pause`, `resume`, `snooze`, `stop`, `todayStats`, `refreshTodayStats`

### ThemeContext.tsx

- Manages `theme` (light/dark/system), `highContrast`
- Persists to settings
- Provides `resolved` (computed light/dark) for UI

### PickerContext.tsx

- Shared state for `TimerPickerModal` (duration vs time mode, open/close)

---

## Build & Distribution

- **Vite** builds the React app to `dist/`
- **electron-builder** packages for Linux (AppImage, deb), macOS (dmg), Windows (nsis)
- **scripts/prepare-icons.js** generates `build/icons/` from `assets/icon-256.png`
- Linux builds use `--no-sandbox` to avoid chrome-sandbox SUID issues

---

## IPC API (preload.js → renderer)

```ts
electronAPI: {
  db: { exec, run, getFirst, getAll },
  showNotification: (title, body) => void,
  setTrayStateGetter: (fn) => void,
  sendTrayState: (state) => void,
}
```

---

## Data Flow Summary

1. **App start**: `TimerContext` → `loadPersistedState` → restore `active_runs` → `startScheduler`
2. **User starts sequence**: `TimerContext.start` → `TimerEngine.start` → add run, start tick interval
3. **Tick**: `onTick` → decrement time → on 0, `advanceToNextTimer` → `onTimerEndCallback` (sound + notification) → persist
4. **Scheduler**: Every 30s → if in window and enabled → `TimerEngine.start`
5. **Timer end**: `playTimerEndSound(sequence.sound_id)`, `fireTimerEndNow()`, schedule next notification
