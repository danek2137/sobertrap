const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (c) => ipcRenderer.invoke('save-config', c),
  backupConfig: () => ipcRenderer.invoke('backup-config'),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (f) => ipcRenderer.invoke('restore-backup', f),
  launchSober: () => ipcRenderer.invoke('launch-sober'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  showCrosshair: (o) => ipcRenderer.send('show-crosshair', o),
  hideCrosshair: () => ipcRenderer.send('hide-crosshair'),
  updateCrosshair: (o) => ipcRenderer.send('update-crosshair', o),
  loadTunerConfig: () => ipcRenderer.invoke('load-tuner-config'),
  saveTunerConfig: (c) => ipcRenderer.invoke('save-tuner-config', c),
});
