const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const SOBER_CONFIG = path.join(
  process.env.HOME,
  '.var/app/org.vinegarhq.Sober/config/sober/config.json'
);
const BACKUP_DIR = path.dirname(SOBER_CONFIG);
const DIST = path.join(__dirname, '..', 'dist');
const TUNER_CONFIG = path.join(
  process.env.HOME,
  '.var/app/org.vinegarhq.Sober/config/sober/tuner.json'
);

let mainWindow;
let overlayWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: 'SoberTuner',
    frame: false,
    roundedCorners: true,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(DIST, 'index.html'));
  // mainWindow.webContents.openDevTools();
}

function parseConfig(text) {
  const cleaned = text.replace(/\/\/.*$/gm, '');
  return JSON.parse(cleaned);
}

function serializeConfig(obj) {
  const header = [
    '// !!! STOP !!!',
    '// This file is not meant to be edited by hand unless you know what you are doing.',
    '// -------------------------------------------',
    `// Last edited by SoberTuner at ${new Date().toISOString()}`,
  ];
  return header.map(l => `// ${l}`).join('\n') + '\n' + JSON.stringify(obj, null, 4) + '\n';
}

ipcMain.handle('load-config', async () => {
  try {
    const raw = fs.readFileSync(SOBER_CONFIG, 'utf-8');
    const config = parseConfig(raw);
    return { success: true, config };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('save-config', async (_, config) => {
  try {
    const raw = serializeConfig(config);
    fs.writeFileSync(SOBER_CONFIG, raw, 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('backup-config', async () => {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(BACKUP_DIR, `config.backup.${ts}.json`);
    fs.copyFileSync(SOBER_CONFIG, backupPath);
    return { success: true, path: backupPath };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('list-backups', async () => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('config.backup.'))
      .sort()
      .reverse();
    return { success: true, backups: files };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('restore-backup', async (_, filename) => {
  try {
    const src = path.join(BACKUP_DIR, filename);
    fs.copyFileSync(src, SOBER_CONFIG);
    const raw = fs.readFileSync(SOBER_CONFIG, 'utf-8');
    const config = parseConfig(raw);
    return { success: true, config };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('launch-sober', async () => {
  return new Promise((resolve) => {
    exec('flatpak run org.vinegarhq.Sober', (error) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });
  });
});

ipcMain.on('minimize-window', () => mainWindow?.minimize());
ipcMain.on('close-window', () => mainWindow?.close());

function createOverlay() {
  if (overlayWindow && !overlayWindow.isDestroyed()) return overlayWindow;
  overlayWindow = new BrowserWindow({
    width: 200, height: 200,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    frame: false,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'overlayPreload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  overlayWindow.loadFile(path.join(__dirname, 'overlay.html'));
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.on('closed', () => { overlayWindow = null; });
  return overlayWindow;
}

ipcMain.on('show-crosshair', (_e, options) => {
  const win = createOverlay();
  win.webContents.send('update-crosshair', options);
  if (!win.isVisible()) win.show();
});

ipcMain.on('hide-crosshair', () => {
  if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.hide();
});

ipcMain.on('update-crosshair', (_e, options) => {
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.isVisible()) {
    overlayWindow.webContents.send('update-crosshair', options);
  }
});

ipcMain.handle('load-tuner-config', async () => {
  try {
    if (!fs.existsSync(TUNER_CONFIG)) return { success: true, config: {} };
    const raw = fs.readFileSync(TUNER_CONFIG, 'utf-8');
    return { success: true, config: JSON.parse(raw) };
  } catch (e) {
    return { success: true, config: {} };
  }
});

ipcMain.handle('save-tuner-config', async (_, config) => {
  try {
    fs.writeFileSync(TUNER_CONFIG, JSON.stringify(config, null, 4), 'utf-8');
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
