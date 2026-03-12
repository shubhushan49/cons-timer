const { app, BrowserWindow, ipcMain, Tray, Menu, Notification: ElectronNotification, nativeImage } = require('electron');
const { createPanel, getPanelRef, destroyPanel } = require('./panel');
const path = require('path');
const fs = require('fs');

app.setName('Pomodoro Flex');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let trayTimerState = { runs: [] };
let db = null;
let dbInitPromise = null;

function getDbPath() {
  return path.join(app.getPath('userData'), 'movetimer.db');
}

async function initDb() {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    const dbPath = getDbPath();
    let data;
    try {
      data = new Uint8Array(fs.readFileSync(dbPath));
    } catch {
      data = null;
    }
    db = data ? new SQL.Database(data) : new SQL.Database();
    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');

    const { MIGRATIONS } = require('./migrations');
    for (const sql of MIGRATIONS) {
      try {
        db.run(sql);
      } catch (e) {
        if (!e?.message?.includes('duplicate column name')) {
          console.warn('Migration warning:', sql.slice(0, 60), e);
        }
      }
    }
    // Ensure enabled column exists (safeguard if migrations were cached)
    try {
      const info = db.exec("SELECT COUNT(*) as n FROM pragma_table_info('sequences') WHERE name='enabled'");
      if (info[0]?.values[0]?.[0] === 0) {
        db.run('ALTER TABLE sequences ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1');
      }
    } catch (e) {
      console.warn('Migration safeguard (enabled column):', e);
    }
    // Ensure active_runs table exists and migrate from timer_state if needed
    try {
      const tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='active_runs'");
      if (tableCheck.length === 0 || !tableCheck[0].values.length) {
        db.run(`CREATE TABLE IF NOT EXISTS active_runs (
          sequence_id INTEGER PRIMARY KEY,
          current_timer_index INTEGER NOT NULL DEFAULT 0,
          remaining_seconds INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'running',
          run_started_at TEXT,
          FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE
        )`);
      }
      const ar = db.exec('SELECT COUNT(*) as n FROM active_runs');
      const ts = db.exec('SELECT sequence_id, current_timer_index, remaining_seconds, status, run_started_at FROM timer_state WHERE id = 1 AND sequence_id IS NOT NULL AND status != "idle"');
      if (ar[0]?.values?.[0]?.[0] === 0 && ts[0]?.values?.[0]) {
        const row = ts[0].values[0];
        db.run('INSERT OR REPLACE INTO active_runs (sequence_id, current_timer_index, remaining_seconds, status, run_started_at) VALUES (?, ?, ?, ?, ?)', row);
      }
    } catch (e) {
      console.warn('Migration safeguard (active_runs):', e);
    }
    saveDb();
    return db;
  })();

  return dbInitPromise;
}

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(getDbPath(), Buffer.from(data));
  } catch (e) {
    console.warn('Failed to save db:', e);
  }
}

function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ]);
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon-256.png');
  let icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) return;
  const trayIcon = icon.getSize().width > 32 ? icon.resize({ width: 32, height: 32 }) : icon;
  tray = new Tray(trayIcon);
  tray.setToolTip('Pomodoro Flex – gentle reminders to stretch and walk');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', () => {
    mainWindow?.webContents?.send('tray:request-state');
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 360,
    minHeight: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
    icon: path.join(__dirname, '../assets/icon-256.png'),
    show: false,
  });

  const isDev = process.env.NODE_ENV !== 'production' || process.defaultApp;
  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setTitle('Pomodoro Flex');
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    destroyPanel();
    if (tray) tray.destroy();
    tray = null;
    if (db) {
      saveDb();
      db.close();
      db = null;
    }
  });

  createTray();
  createPanel(() => mainWindow, initDb, () => trayTimerState);
}

function applyTrayState(state, popMenu = false) {
  trayTimerState = {
    runs: Array.isArray(state?.runs) ? state.runs : (state?.sequenceId != null ? [{
      status: state.status || 'idle',
      label: state.label || '',
      remainingSeconds: state.remainingSeconds ?? 0,
      sequenceName: state.sequenceName || '',
      sequenceId: state.sequenceId ?? null,
    }] : []),
  };
  if (tray) {
    tray.setContextMenu(buildTrayMenu());
    if (popMenu) tray.popUpContextMenu();
  }
  const panel = getPanelRef();
  if (panel?.webContents && !panel.webContents.isDestroyed()) {
    panel.webContents.send('panel:timer-state', trayTimerState);
  }
}

ipcMain.on('tray:state-response', (_, state) => applyTrayState(state, true));
ipcMain.on('tray:state', (_, state) => applyTrayState(state, false));

// IPC: panel requests to open main window at sequence editor
ipcMain.on('panel:show-sequence-editor', (_, sequenceId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send('app:navigate-to', `/sequence/${sequenceId}`);
  }
});

// IPC: panel timer actions (forward to main window renderer)
ipcMain.on('panel:timer-pause', (_, sequenceId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send('app:timer-pause', sequenceId);
  }
});
ipcMain.on('panel:timer-snooze', (_, sequenceId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send('app:timer-snooze', sequenceId);
  }
});
ipcMain.on('panel:timer-stop', (_, sequenceId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send('app:timer-stop', sequenceId);
  }
});
ipcMain.on('panel:timer-resume', (_, sequenceId) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.webContents.send('app:timer-resume', sequenceId);
  }
});

// IPC: show notification from main process (reliable when app is backgrounded)
ipcMain.handle('show-notification', (_, { title, body }) => {
  if (ElectronNotification.isSupported()) {
    new ElectronNotification({ title, body }).show();
  }
});

// IPC handlers for database (sql.js in main process)
ipcMain.handle('db:exec', async (_, sql) => {
  const database = await initDb();
  database.run(sql);
  saveDb();
});

ipcMain.handle('db:run', async (_, sql, params = []) => {
  const database = await initDb();
  database.run(sql, params);
  const info = database.exec('SELECT last_insert_rowid() as id, changes() as ch');
  saveDb();
  const row = info[0]?.values[0];
  return {
    lastInsertRowId: row ? Number(row[0]) : 0,
    changes: row ? Number(row[1]) : 0,
  };
});

ipcMain.handle('db:getFirst', async (_, sql, params = []) => {
  const database = await initDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
});

ipcMain.handle('db:getAll', async (_, sql, params = []) => {
  const database = await initDb();
  const stmt = database.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
