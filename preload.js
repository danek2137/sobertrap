const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadConfig: () => ipcRenderer.invoke('load-config'),
  saveConfig: (c) => ipcRenderer.invoke('save-config', c),
  backupConfig: () => ipcRenderer.invoke('backup-config'),
  listBackups: () => ipcRenderer.invoke('list-backups'),
  restoreBackup: (f) => ipcRenderer.invoke('restore-backup', f),
  shiftlockStatus: () => ipcRenderer.invoke('shiftlock-status'),
  shiftlockInstall: () => ipcRenderer.invoke('shiftlock-install'),
  shiftlockRemove: () => ipcRenderer.invoke('shiftlock-remove'),
  shiftlockRestoreBackup: () => ipcRenderer.invoke('shiftlock-restore-backup'),
});