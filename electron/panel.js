const { BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let panelWin = null;

function formatTime24(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function createPanel(getMainWindow, initDb, getTrayState) {
  if (panelWin && !panelWin.isDestroyed()) {
    panelWin.show();
    return;
  }

  const { workArea } = screen.getPrimaryDisplay();
  const panelHeight = 32;

  panelWin = new BrowserWindow({
    width: workArea.width,
    height: panelHeight,
    x: workArea.x,
    y: workArea.y + workArea.height - panelHeight,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: false,
    backgroundColor: '#1a1a1e',
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'panel-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  panelWin.setFocusable(true);
  panelWin.setIgnoreMouseEvents(false);
  panelWin.loadFile(path.join(__dirname, 'panel.html'));

  panelWin.webContents.once('did-finish-load', () => {
    const state = typeof getTrayState === 'function' ? getTrayState() : null;
    if (state) panelWin.webContents.send('panel:timer-state', state);
  });

  // Register IPC handlers
  ipcMain.handle('panel:get-timer-state', () => {
    const state = typeof getTrayState === 'function' ? getTrayState() : null;
    return state && Array.isArray(state.runs) ? state : { runs: [] };
  });

  ipcMain.handle('panel:get-schedules', async () => {
    try {
      const database = await initDb();
      const stmt = database.prepare(
        'SELECT id, name, start_time, end_time FROM sequences WHERE enabled = 1 AND start_time IS NOT NULL AND end_time IS NOT NULL ORDER BY start_time'
      );
      stmt.bind([]);
      const rows = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        rows.push({
          id: row.id,
          name: row.name,
          start: formatTime24(row.start_time),
          end: formatTime24(row.end_time),
        });
      }
      stmt.free();
      return rows;
    } catch (e) {
      console.warn('[Panel] Failed to get schedules:', e);
      return [];
    }
  });

  const showMainHandler = () => {
    const win = typeof getMainWindow === 'function' ? getMainWindow() : getMainWindow;
    if (win && !win.isDestroyed()) win.show();
  };
  ipcMain.on('panel:show-main', showMainHandler);

  panelWin.on('closed', () => {
    panelWin = null;
    ipcMain.removeHandler('panel:get-schedules');
    ipcMain.removeHandler('panel:get-timer-state');
    ipcMain.removeAllListeners('panel:show-main');
    ipcMain.removeAllListeners('panel:show-sequence-editor');
    ipcMain.removeAllListeners('panel:timer-pause');
    ipcMain.removeAllListeners('panel:timer-snooze');
    ipcMain.removeAllListeners('panel:timer-stop');
    ipcMain.removeAllListeners('panel:timer-resume');
  });
}

function getPanelRef() {
  return panelWin && !panelWin.isDestroyed() ? panelWin : null;
}

function destroyPanel() {
  if (panelWin) {
    ipcMain.removeHandler('panel:get-schedules');
    ipcMain.removeHandler('panel:get-timer-state');
    ipcMain.removeAllListeners('panel:show-main');
    ipcMain.removeAllListeners('panel:show-sequence-editor');
    ipcMain.removeAllListeners('panel:timer-pause');
    ipcMain.removeAllListeners('panel:timer-snooze');
    ipcMain.removeAllListeners('panel:timer-stop');
    ipcMain.removeAllListeners('panel:timer-resume');
    if (!panelWin.isDestroyed()) panelWin.destroy();
    panelWin = null;
  }
}

module.exports = { createPanel, getPanelRef, destroyPanel };
