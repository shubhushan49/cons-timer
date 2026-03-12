const { contextBridge, ipcRenderer } = require('electron');

let trayStateGetter = null;

ipcRenderer.on('tray:request-state', () => {
  if (trayStateGetter) {
    try {
      ipcRenderer.send('tray:state-response', trayStateGetter());
    } catch (_) {
      ipcRenderer.send('tray:state-response', { runs: [] });
    }
  } else {
    ipcRenderer.send('tray:state-response', { runs: [] });
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  setTrayStateGetter: (fn) => { trayStateGetter = fn; },
  sendTrayState: (state) => ipcRenderer.send('tray:state', state),
  onNavigateTo: (callback) => {
    const handler = (_, path) => callback(path);
    ipcRenderer.on('app:navigate-to', handler);
    return () => ipcRenderer.removeListener('app:navigate-to', handler);
  },
  onTimerPause: (callback) => {
    const handler = (_, id) => callback(id);
    ipcRenderer.on('app:timer-pause', handler);
    return () => ipcRenderer.removeListener('app:timer-pause', handler);
  },
  onTimerSnooze: (callback) => {
    const handler = (_, id) => callback(id);
    ipcRenderer.on('app:timer-snooze', handler);
    return () => ipcRenderer.removeListener('app:timer-snooze', handler);
  },
  onTimerStop: (callback) => {
    const handler = (_, id) => callback(id);
    ipcRenderer.on('app:timer-stop', handler);
    return () => ipcRenderer.removeListener('app:timer-stop', handler);
  },
  onTimerResume: (callback) => {
    const handler = (_, id) => callback(id);
    ipcRenderer.on('app:timer-resume', handler);
    return () => ipcRenderer.removeListener('app:timer-resume', handler);
  },
  db: {
    exec: (sql) => ipcRenderer.invoke('db:exec', sql),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params || []),
    getFirst: (sql, params) => ipcRenderer.invoke('db:getFirst', sql, params || []),
    getAll: (sql, params) => ipcRenderer.invoke('db:getAll', sql, params || []),
  },
});
