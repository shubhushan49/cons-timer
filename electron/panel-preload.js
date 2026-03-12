const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('panelAPI', {
  getSchedules: () => ipcRenderer.invoke('panel:get-schedules'),
  getTimerState: () => ipcRenderer.invoke('panel:get-timer-state'),
  showMainWindow: () => ipcRenderer.send('panel:show-main'),
  showSequenceEditor: (sequenceId) => ipcRenderer.send('panel:show-sequence-editor', sequenceId),
  timerPause: (sequenceId) => ipcRenderer.send('panel:timer-pause', sequenceId),
  timerSnooze: (sequenceId) => ipcRenderer.send('panel:timer-snooze', sequenceId),
  timerStop: (sequenceId) => ipcRenderer.send('panel:timer-stop', sequenceId),
  timerResume: (sequenceId) => ipcRenderer.send('panel:timer-resume', sequenceId),
  onTimerState: (callback) => {
    ipcRenderer.on('panel:timer-state', (_, state) => callback(state));
  },
});
