# Pomodoro Flex – User Manual

A desktop app for gentle, flexible timer sequences to remind you when to take breaks and move.

---

## Installing Pomodoro Flex

### Linux

**Deb package (recommended):**
```bash
sudo dpkg -i pomodoroflex_1.0.0_amd64.deb
```

**AppImage:**
1. Download `PomodoroFlex-1.0.0.AppImage`
2. Right‑click → Properties → Permissions → check "Allow executing file as program"
3. Double‑click to run, or: `./PomodoroFlex-1.0.0.AppImage --no-sandbox`

You may need: `sudo apt install libfuse2`

### macOS

1. Open the downloaded `.dmg`
2. Drag Pomodoro Flex into Applications

### Windows

1. Run the `.exe` installer
2. Accept defaults or choose an install folder

---

## First Run

On first launch, you’ll see a short onboarding:

1. Accept notifications when prompted
2. Complete the short intro flow, then you’re on the main dashboard

---

## Main Screen (Dashboard)

- **“No sequence running”** – Start one from the Sequences tab.
- **Running sequences** – Each card shows:
  - Sequence name
  - Current timer label (e.g. “Break”, “Focus”)
  - Countdown
  - Progress bar
  - **Pause** – Pause timers
  - **Snooze** – Add 5 minutes
  - **Stop** – Stop the sequence
- **Card click** – Opens the sequence editor for that sequence.

---

## Sequences Tab

Create and manage timer sequences.

### Creating a Sequence

1. Tap **+ New sequence**
2. Enter a name (e.g. “Office Default”)
3. Choose **Loop**:
   - **Indefinite** – Repeats until you stop it
   - **Daily limit** – Stops after X cycles per day
4. Set **Schedule** (optional):
   - **Start time** – When the sequence can start
   - **End time** – When it stops
   - If both are set, only enabled sequences can auto‑start in that window
5. Choose **Sound** – Plays when a timer ends
6. Under **Timers**, add work and break steps:
   - Tap **+ Add**
   - Name each timer (e.g. “Break”, “Focus”)
   - Set duration (tap to edit)
   - Use **Vibration** to toggle vibration on/off
7. Tap **Save**

### Editing a Sequence

- **From dashboard** – Click the sequence card
- **From Sequences tab** – Click the sequence row

Edit fields, add/remove timers, reorder with ▲/▼, then **Save**.

### Enabling / Disabling Sequences

- Use the toggle on each sequence card in the Sequences tab
- Only **enabled** sequences can auto‑start at their scheduled times

---

## Starting a Sequence

1. Open the **Sequences** tab
2. Click the sequence you want
3. Use **Start** or **▶** to begin
4. The app will run in the background; use the system tray icon or dock to bring it back

---

## System Tray (Linux / Windows)

In the tray you’ll see:
- Current timer label and remaining time
- **Show** – Open the app window
- **Quit** – Exit Pomodoro Flex

---

## Settings

Open via the **Settings** tab.

- **Appearance** – Dark mode, follow system theme, high contrast
- **Data** – Export sequences (for backup or sharing)

---

## Tips

- **Multiple sequences** – You can run more than one at the same time
- **Scheduled sequences** – With Start/End times set and the sequence enabled, it can auto‑start in that window
- **Sound** – Set per sequence in the sequence editor
- **Snooze** – Adds 5 minutes if you need a bit more time

---

## Troubleshooting

**No notifications**
- Check that notifications are allowed for Pomodoro Flex in system settings
- On Linux, ensure libnotify is installed

**App won’t start**
- **Deb/AppImage on Linux** – Run with `--no-sandbox` if you see a sandbox error
- Reinstall or use the other format (AppImage vs deb) if one fails

**Sequence doesn’t auto‑start**
- Make sure the sequence is **enabled** (toggle on in Sequences)
- Ensure Start time and End time are both set
- Check that current time is between Start and End

---

## Data and Privacy

- All data is stored **locally** on your device
- No accounts or cloud sync
- Export from Settings if you need a backup
