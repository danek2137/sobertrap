const { contextBridge, ipcRenderer } = require('electron');

ipcRenderer.on('update-crosshair', (_event, options) => {
  window.dispatchEvent(new CustomEvent('update-crosshair', { detail: options }));
});

contextBridge.exposeInMainWorld('overlay', {});
