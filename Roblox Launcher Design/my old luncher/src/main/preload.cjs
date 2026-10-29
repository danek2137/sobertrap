const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  close: () => ipcRenderer.send('close-window'),
  minimize: () => ipcRenderer.send('minimize-window'),
  launch: (data) => ipcRenderer.invoke('launch-game', data),
  forceStop: () => ipcRenderer.invoke('force-stop'),
  getLauncherConfig: () => ipcRenderer.invoke('get-launcher-config'),
  checkInstallation: () => ipcRenderer.invoke('check-installation'),
  getUserConfig: () => ipcRenderer.invoke('get-user-config'),
  saveUserConfig: (config) => ipcRenderer.invoke('save-user-config', config),
  beginMicrosoftLogin: (options) => ipcRenderer.invoke('ms-login-begin', options),
  logoutMicrosoft: () => ipcRenderer.invoke('ms-logout'),
  openGameFolder: () => ipcRenderer.invoke('open-game-folder'),
  listMods: () => ipcRenderer.invoke('list-mods'),
  setModEnabled: (payload) => ipcRenderer.invoke('set-mod-enabled', payload),
  ensureDir: (dirPath) => ipcRenderer.invoke('ensure-dir', { dirPath }),
  getGameRootDir: () => ipcRenderer.invoke('get-game-root-dir'),
  closeLauncher: () => ipcRenderer.send('close-window'),
  checkOxevyInstalled: () => ipcRenderer.invoke('check-oxevy-installed'),
  downloadOxevy: () => ipcRenderer.invoke('download-oxevy'),
  listProcesses: () => ipcRenderer.invoke('list-processes'),
  browseDll: () => ipcRenderer.invoke('browse-dll'),
  injectDll: (payload) => ipcRenderer.invoke('inject-dll', payload),
  onProgress: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('launch-progress', listener);
    return () => ipcRenderer.removeListener('launch-progress', listener);
  },
  onLaunchState: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('launch-state', listener);
    return () => ipcRenderer.removeListener('launch-state', listener);
  },
  onMicrosoftLogin: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('ms-login', listener);
    return () => ipcRenderer.removeListener('ms-login', listener);
  },
  getCapeConfig: () => ipcRenderer.invoke('get-cape-config'),
  setCapeConfig: (config) => ipcRenderer.invoke('set-cape-config', config),
  saveCapeImage: (data) => ipcRenderer.invoke('save-cape-image', data),
  getCapeImage: () => ipcRenderer.invoke('get-cape-image'),
  getDiscordUser: () => ipcRenderer.invoke('get-discord-user'),
});
