const { contextBridge, ipcRenderer } = require('electron');

let trayStateGetter = null;

ipcRenderer.on('tray:request-state', () => {
  if (trayStateGetter) {
    try {
      ipcRenderer.send('tray:state-response', trayStateGetter());
    } catch (_) {
      ipcRenderer.send('tray:state-response', { status: 'idle', label: '', type: 'work', remainingSeconds: 0, sequenceName: '' });
    }
  } else {
    ipcRenderer.send('tray:state-response', { status: 'idle', label: '', type: 'work', remainingSeconds: 0, sequenceName: '' });
  }
});

contextBridge.exposeInMainWorld('electronAPI', {
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  setTrayStateGetter: (fn) => { trayStateGetter = fn; },
  sendTrayState: (state) => ipcRenderer.send('tray:state', state),
  db: {
    exec: (sql) => ipcRenderer.invoke('db:exec', sql),
    run: (sql, params) => ipcRenderer.invoke('db:run', sql, params || []),
    getFirst: (sql, params) => ipcRenderer.invoke('db:getFirst', sql, params || []),
    getAll: (sql, params) => ipcRenderer.invoke('db:getAll', sql, params || []),
  },
});
