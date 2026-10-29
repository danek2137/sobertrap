const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ASSET_OVERLAY = path.join(
  process.env.HOME,
  '.var/app/org.vinegarhq.Sober/data/sober/asset_overlay'
);
const SHIFTLOCK_TARGET = path.join(ASSET_OVERLAY, 'content', 'textures', 'MouseLockedCursor.png');

const SOBER_CONFIG = path.join(
  process.env.HOME,
  '.var/app/org.vinegarhq.Sober/config/sober/config.json'
);
const BACKUP_DIR = path.join(
  process.env.HOME,
  '.var/app/org.vinegarhq.Sober/config/sober'
);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'SoberTuner',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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

ipcMain.handle('shiftlock-status', async () => {
  try {
    const exists = fs.existsSync(SHIFTLOCK_TARGET);
    let dataUrl = null;
    let size = 0;
    if (exists) {
      const buf = fs.readFileSync(SHIFTLOCK_TARGET);
      size = buf.length;
      dataUrl = 'data:image/png;base64,' + buf.toString('base64');
    }
    const hasBackup = fs.existsSync(SHIFTLOCK_TARGET + '.bak');
    return { success: true, exists, path: SHIFTLOCK_TARGET, dataUrl, size, hasBackup };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('shiftlock-install', async () => {
  try {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select shift lock cursor image',
      filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif'] }],
      properties: ['openFile'],
    });
    if (res.canceled || !res.filePaths || !res.filePaths.length) {
      return { success: false, canceled: true };
    }
    const src = res.filePaths[0];
    const dir = path.dirname(SHIFTLOCK_TARGET);
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(SHIFTLOCK_TARGET)) {
      fs.copyFileSync(SHIFTLOCK_TARGET, SHIFTLOCK_TARGET + '.bak');
    }
    // Convert to PNG to match expected asset name
    try {
      execFileSync('magick', [src, SHIFTLOCK_TARGET], { stdio: 'ignore' });
    } catch (e) {
      try {
        execFileSync('convert', [src, SHIFTLOCK_TARGET], { stdio: 'ignore' });
      } catch (e2) {
        fs.copyFileSync(src, SHIFTLOCK_TARGET);
      }
    }
    return { success: true, path: SHIFTLOCK_TARGET };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('shiftlock-remove', async () => {
  try {
    if (fs.existsSync(SHIFTLOCK_TARGET)) fs.unlinkSync(SHIFTLOCK_TARGET);
    const bak = SHIFTLOCK_TARGET + '.bak';
    if (fs.existsSync(bak)) fs.unlinkSync(bak);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('shiftlock-restore-backup', async () => {
  try {
    const bak = SHIFTLOCK_TARGET + '.bak';
    if (!fs.existsSync(bak)) return { success: false, error: 'No backup found' };
    if (fs.existsSync(SHIFTLOCK_TARGET)) fs.copyFileSync(SHIFTLOCK_TARGET, SHIFTLOCK_TARGET + '.current.bak');
    fs.copyFileSync(bak, SHIFTLOCK_TARGET);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
