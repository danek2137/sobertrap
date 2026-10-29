const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const { Client, Authenticator } = require('minecraft-launcher-core');
const fetch = require('node-fetch');
const { Authflow, Titles } = require('prismarine-auth');

// Only require discord-rpc if it's available
let RPC = null;
try {
  RPC = require('discord-rpc');
} catch (error) {
  console.log('[Discord RPC] Module not available, Discord features disabled');
}

const projectRoot = path.resolve(__dirname, '../../../../');
const gradlePropertiesPath = path.join(projectRoot, 'gradle.properties');
const distIndexPath = path.join(__dirname, '../../dist/index.html');
const configPath = path.join(app.getPath('userData'), 'launcher-config.json');
const microsoftCacheDir = path.join(app.getPath('userData'), 'microsoft-auth-cache');
const defaultConfig = {
  minecraftVersion: '1.21.11',
  loaderVersion: '0.19.2',
  modName: 'Oxevy',
};

// Discord RPC setup with better error handling
let rpcClient = null;
let discordRpcInitialized = false;
let currentActivity = null;
let rpcReconnectTimer = null;
let discordAvailable = true;
const DISCORD_CLIENT_ID = 'YOUR_DISCORD_CLIENT_ID_HERE'; // REPLACE WITH YOUR ACTUAL DISCORD APPLICATION CLIENT ID

// Check if Discord is installed and running (Linux specific)
function isDiscordAvailable() {
  // On Linux, check if Discord process is running
  if (process.platform === 'linux') {
    try {
      const { execSync } = require('child_process');
      const result = execSync('pgrep -x "discord"', { encoding: 'utf8', stdio: 'pipe' });
      return result.trim().length > 0;
    } catch (error) {
      return false;
    }
  }
  // On Windows/Mac, assume Discord might be available
  return true;
}

function initializeDiscordRPC() {
  // Don't try to initialize if RPC module is not available
  if (!RPC) {
    console.log('[Discord RPC] Module not available, skipping initialization');
    discordAvailable = false;
    return;
  }
  
  // Don't re-initialize if already connected
  if (rpcClient && rpcClient.user) {
    console.log('[Discord RPC] Already connected');
    return;
  }
  
  // Check if Discord is running (Linux)
  if (!isDiscordAvailable()) {
    console.log('[Discord RPC] Discord not detected, skipping initialization');
    discordAvailable = false;
    return;
  }
  
  // Clear any existing reconnect timer
  if (rpcReconnectTimer) {
    clearTimeout(rpcReconnectTimer);
    rpcReconnectTimer = null;
  }
  
  try {
    // Set up the RPC client with a timeout
    RPC.register(DISCORD_CLIENT_ID);
    rpcClient = new RPC.Client({ transport: 'ipc' });
    
    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!discordRpcInitialized) {
        console.log('[Discord RPC] Connection timeout');
        if (rpcClient) {
          try {
            rpcClient.destroy();
          } catch (e) {}
          rpcClient = null;
        }
        discordAvailable = false;
      }
    }, 5000);
    
    rpcClient.on('ready', () => {
      clearTimeout(connectionTimeout);
      console.log('[Discord RPC] Connected to Discord successfully');
      discordRpcInitialized = true;
      discordAvailable = true;
      
      // Set default idle activity
      setDiscordActivity({
        details: 'In Oxevy Launcher',
        state: 'Idle',
        largeImageKey: 'oxevy_logo',
        largeImageText: 'Oxevy Launcher',
        startTimestamp: Date.now(),
        instance: false,
      });
    });
    
    rpcClient.on('error', (err) => {
      clearTimeout(connectionTimeout);
      console.error('[Discord RPC] Client error:', err.message);
      discordRpcInitialized = false;
      
      // Don't attempt to reconnect if Discord is not available
      if (err.message.includes('Could not connect')) {
        discordAvailable = false;
      }
    });
    
    rpcClient.on('disconnected', () => {
      console.log('[Discord RPC] Disconnected from Discord');
      discordRpcInitialized = false;
      
      // Only attempt reconnect if we think Discord is available
      if (isDiscordAvailable()) {
        rpcReconnectTimer = setTimeout(() => {
          console.log('[Discord RPC] Attempting to reconnect...');
          if (rpcClient) {
            try {
              rpcClient.destroy();
            } catch (e) {}
            rpcClient = null;
          }
          initializeDiscordRPC();
        }, 60000);
      } else {
        rpcClient = null;
      }
    });
    
    rpcClient.login({ clientId: DISCORD_CLIENT_ID }).catch(err => {
      clearTimeout(connectionTimeout);
      console.error('[Discord RPC] Login failed:', err.message);
      rpcClient = null;
      discordRpcInitialized = false;
      
      if (err.message.includes('Could not connect')) {
        discordAvailable = false;
        console.log('[Discord RPC] Discord not running, RPC disabled');
      } else {
        // Retry after 2 minutes for other errors
        rpcReconnectTimer = setTimeout(() => {
          console.log('[Discord RPC] Retrying login...');
          initializeDiscordRPC();
        }, 120000);
      }
    });
  } catch (error) {
    console.error('[Discord RPC] Failed to initialize:', error.message);
    rpcClient = null;
    discordRpcInitialized = false;
    discordAvailable = false;
  }
}

function setDiscordActivity(activity) {
  // Don't attempt if Discord is not available or RPC not initialized
  if (!discordAvailable || !rpcClient || !rpcClient.user) {
    return false;
  }
  
  // Don't update if activity hasn't changed
  if (currentActivity && JSON.stringify(currentActivity) === JSON.stringify(activity)) {
    return true;
  }
  
  try {
    rpcClient.setActivity(activity).catch(err => {
      console.error('[Discord RPC] Failed to set activity:', err.message);
    });
    currentActivity = activity;
    return true;
  } catch (error) {
    console.error('[Discord RPC] Error setting activity:', error.message);
    return false;
  }
}

function updateDiscordActivityForGame(username, version) {
  if (!discordAvailable || !rpcClient) {
    return;
  }
  
  setDiscordActivity({
    details: `Playing Minecraft ${version}`,
    state: `Playing as ${username}`,
    largeImageKey: 'minecraft_icon',
    largeImageText: `Minecraft ${version}`,
    smallImageKey: 'oxevy_logo',
    smallImageText: 'Oxevy Mod',
    startTimestamp: Date.now(),
    instance: true,
  });
}

function updateDiscordActivityLauncherIdle() {
  if (!discordAvailable || !rpcClient) {
    return;
  }
  
  setDiscordActivity({
    details: 'In Oxevy Launcher',
    state: 'Idle',
    largeImageKey: 'oxevy_logo',
    largeImageText: 'Oxevy Launcher',
    startTimestamp: Date.now(),
    instance: false,
  });
}

function updateDiscordActivityLaunching(version) {
  if (!discordAvailable || !rpcClient) {
    return;
  }
  
  setDiscordActivity({
    details: 'Launching Minecraft',
    state: `Preparing ${version}`,
    largeImageKey: 'oxevy_logo',
    largeImageText: 'Oxevy Launcher',
    instance: false,
  });
}

function clearDiscordActivity() {
  if (!discordAvailable || !rpcClient || !rpcClient.user) {
    return;
  }
  
  try {
    rpcClient.clearActivity().catch(err => {
      console.error('[Discord RPC] Failed to clear activity:', err.message);
    });
    currentActivity = null;
  } catch (error) {
    console.error('[Discord RPC] Error clearing activity:', error.message);
  }
}

function shutdownDiscordRPC() {
  if (rpcReconnectTimer) {
    clearTimeout(rpcReconnectTimer);
    rpcReconnectTimer = null;
  }
  
  if (rpcClient) {
    try {
      rpcClient.destroy();
    } catch (error) {
      // Ignore destroy errors
    }
    rpcClient = null;
  }
  discordRpcInitialized = false;
  currentActivity = null;
}

let gameProcess = null;
let mainWindow = null;

function getLauncherConfigPath() {
  return configPath;
}

function loadLauncherConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Failed to load launcher config:', error);
  }
  return {
    username: 'Player',
    memory: '4G',
    windowWidth: 960,
    windowHeight: 640,
    lastBuild: null,
    hoursPlayed: 0,
    settings: {
      autoLogin: true,
      closeOnLaunch: false,
      hardwareAcceleration: true,
      showFps: true,
      discordRichPresence: false,
    },
  };
}

function saveLauncherConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error('Failed to save launcher config:', error);
    return false;
  }
}

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function clearDirectory(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (_) {}
}

function toDashedUuid(raw) {
  const compact = String(raw || '').replace(/-/g, '');
  if (!/^[0-9a-fA-F]{32}$/.test(compact)) return String(raw || '');
  return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`.toLowerCase();
}

function randomUuidV4() {
  try {
    const { randomUUID } = require('crypto');
    if (typeof randomUUID === 'function') return randomUUID();
  } catch (_) {}
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getMicrosoftAuthflow(options = {}) {
  ensureDirectory(microsoftCacheDir);
  const userIdentifier = 'oxevy-launcher';
  const { onMsaCode, ...authOptions } = options || {};
  return new Authflow(
    userIdentifier,
    microsoftCacheDir,
    { flow: 'live', authTitle: Titles.MinecraftNintendoSwitch, deviceType: 'Nintendo', ...authOptions },
    onMsaCode
  );
}

function readGradleProperties() {
  if (!fs.existsSync(gradlePropertiesPath)) {
    return {};
  }

  return fs
    .readFileSync(gradlePropertiesPath, 'utf8')
    .split(/\r?\n/)
    .reduce((properties, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        return properties;
      }

      const separatorIndex = trimmed.indexOf('=');
      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();
      properties[key] = value;
      return properties;
    }, {});
}

function getProjectConfig() {
  const properties = readGradleProperties();

  return {
    minecraftVersion: properties.minecraft_version || defaultConfig.minecraftVersion,
    loaderVersion: properties.loader_version || defaultConfig.loaderVersion,
    modName: properties.mod_name || defaultConfig.modName,
  };
}

function resolveModJar() {
  const buildLibs = path.join(projectRoot, 'build/libs');
  if (!fs.existsSync(buildLibs)) {
    return null;
  }

  const jars = fs
    .readdirSync(buildLibs)
    .filter((file) => file.endsWith('.jar') && !file.includes('-sources') && !file.includes('-dev'))
    .map((file) => path.join(buildLibs, file))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);

  return jars[0] || null;
}

function getGameRootDir() {
  return path.join(app.getPath('userData'), 'game');
}

function getModsDir() {
  return path.join(getGameRootDir(), 'mods');
}

function isSafeFilename(candidate) {
  if (!candidate) return false;
  const base = path.basename(String(candidate));
  return base === candidate && !base.includes('..') && base.length <= 255;
}

function getLauncherConfig() {
  const projectConfig = getProjectConfig();
  const modJarPath = resolveModJar();

  return {
    ...projectConfig,
    modJarPath,
    modJarReady: Boolean(modJarPath),
    projectRoot,
    dataDirectory: getGameRootDir(),
    isRunning: Boolean(gameProcess && !gameProcess.killed),
  };
}

async function ensureFabricProfile(rootDir, minecraftVersion, loaderVersion) {
  const fabricVersion = `fabric-loader-${loaderVersion}-${minecraftVersion}`;
  const versionDirectory = path.join(rootDir, 'versions', fabricVersion);
  const versionJsonPath = path.join(versionDirectory, `${fabricVersion}.json`);

  if (fs.existsSync(versionJsonPath)) {
    return fabricVersion;
  }

  fs.mkdirSync(versionDirectory, { recursive: true });

  const response = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${minecraftVersion}/${loaderVersion}/profile/json`);
  if (!response.ok) {
    throw new Error(`Fabric metadata request failed with status ${response.status}.`);
  }

  const profileJson = await response.json();
  fs.writeFileSync(versionJsonPath, JSON.stringify(profileJson, null, 2));

  return fabricVersion;
}

async function deployModJar(modJarPath, modsDirectory, minecraftVersion, loaderVersion, rootDir) {
  if (!modJarPath) {
    throw new Error('No built mod jar found in build/libs. Run ./gradlew build first.');
  }

  fs.mkdirSync(modsDirectory, { recursive: true });
  fs.copyFileSync(modJarPath, path.join(modsDirectory, 'oxevy.jar'));

  const fabricApiPath = path.join(modsDirectory, 'fabric-api.jar');
  
  const fabricApiUrl = `https://cdn.modrinth.com/data/P7dR8mSH/versions/i5tSkVBH/fabric-api-0.141.3+1.21.11.jar`;
  
  try {
    console.log(`[launcher] Downloading Fabric API from: ${fabricApiUrl}`);
    const response = await fetch(fabricApiUrl);
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(fabricApiPath, Buffer.from(buffer));
      console.log('[launcher] Fabric API installed successfully');
    } else {
      console.log(`[launcher] Failed to download Fabric API: ${response.status}`);
    }
  } catch (error) {
    console.log(`[launcher] Could not download Fabric API: ${error.message}`);
  }
}

function isValidZipArchive(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size <= 0) {
    return false;
  }

  const descriptorLength = Math.min(stat.size, 65557);
  const file = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(descriptorLength);
    fs.readSync(file, buffer, 0, descriptorLength, stat.size - descriptorLength);

    for (let index = buffer.length - 4; index >= 0; index -= 1) {
      if (
        buffer[index] === 0x50 &&
        buffer[index + 1] === 0x4b &&
        buffer[index + 2] === 0x05 &&
        buffer[index + 3] === 0x06
      ) {
        return true;
      }
    }

    return false;
  } finally {
    fs.closeSync(file);
  }
}

function walkFiles(rootDir, visitor) {
  if (!fs.existsSync(rootDir)) {
    return;
  }

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const resolved = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(resolved, visitor);
      continue;
    }

    visitor(resolved);
  }
}

function repairGameArchives(rootDir) {
  const candidateDirs = ['libraries', 'versions']
    .map((segment) => path.join(rootDir, segment))
    .filter((candidate) => fs.existsSync(candidate));

  const repaired = [];
  for (const candidateDir of candidateDirs) {
    walkFiles(candidateDir, (filePath) => {
      if (!filePath.endsWith('.jar')) {
        return;
      }

      try {
        if (!isValidZipArchive(filePath)) {
          fs.rmSync(filePath, { force: true });
          repaired.push(filePath);
        }
      } catch (error) {
        console.warn(`[launcher] Failed to inspect archive ${filePath}:`, error.message);
      }
    });
  }

  return repaired;
}

function sendToRenderer(webContents, channel, payload) {
  if (!webContents.isDestroyed()) {
    webContents.send(channel, payload);
  }
}

function createWindow() {
  const devServerArg = process.argv.find((argument) => argument.startsWith('--dev-server='));
  const devServerUrl = devServerArg ? devServerArg.replace('--dev-server=', '') : null;
  const win = new BrowserWindow({
    width: 960,
    height: 640,
    frame: false,
    resizable: false,
    transparent: true,
    backgroundColor: '#00000000',
    borderRadius: 16,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (!app.isPackaged) {
    if (devServerUrl) {
      win.loadURL(devServerUrl);
      addDebugHandlers(win);
      return;
    }

    if (fs.existsSync(distIndexPath)) {
      win.loadFile(distIndexPath);
      addDebugHandlers(win);
      return;
    }

    win.loadURL('http://127.0.0.1:3000');
    addDebugHandlers(win);
    return;
  }

  win.loadFile(distIndexPath);
  addDebugHandlers(win);
}

function addDebugHandlers(win) {
  process.stderr.write('[MAIN] Debug logging enabled\n');
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const prefix = ['', 'INFO', 'WARN', 'ERROR'][level] || 'LOG';
    process.stderr.write(`[RENDERER:${prefix}] ${message} (source:${sourceId}:${line})\n`);
  });
  win.webContents.on('did-finish-load', () => process.stderr.write('[MAIN] Page loaded\n'));
  win.webContents.on('did-fail-load', (_, code, desc) => process.stderr.write(`[MAIN] Load failed: ${code} ${desc}\n`));
  win.webContents.on('crashed', () => process.stderr.write('[MAIN] Renderer CRASHED!\n'));
  win.webContents.on('unresponsive', () => process.stderr.write('[MAIN] Renderer unresponsive!\n'));
  process.stderr.write('[MAIN] Window created\n');
}

app.whenReady().then(() => {
  createWindow();
});

const OXEVY_RELEASES_API = 'https://api.github.com/repos/danek123321/oxevy-2.0/releases/latest';
const MOD_FILENAME = 'oxevy.jar';

function isOxevyInstalled() {
  const rootDir = getGameRootDir();
  const modPath = path.join(rootDir, 'mods', MOD_FILENAME);
  return fs.existsSync(modPath);
}

async function downloadOxevyMod(rootDir) {
  const modsDir = path.join(rootDir, 'mods');
  fs.mkdirSync(modsDir, { recursive: true });

  const response = await fetch(OXEVY_RELEASES_API);
  if (!response.ok) {
    throw new Error(`Failed to fetch Oxevy releases: ${response.status} ${response.statusText}`);
  }
  const release = await response.json();

  const jarAsset = release.assets?.find((a) => a.name.endsWith('.jar'));
  if (!jarAsset) {
    throw new Error('No jar asset found in the latest Oxevy release.');
  }

  const modPath = path.join(modsDir, MOD_FILENAME);
  const jarResponse = await fetch(jarAsset.browser_download_url);
  if (!jarResponse.ok) {
    throw new Error(`Failed to download Oxevy: ${jarResponse.status} ${jarResponse.statusText}`);
  }
  const buffer = await jarResponse.arrayBuffer();
  fs.writeFileSync(modPath, Buffer.from(buffer));
  return { modPath, release };
}

ipcMain.handle('get-launcher-config', async () => getLauncherConfig());
ipcMain.handle('check-installation', async () => getLauncherConfig());

ipcMain.handle('check-oxevy-installed', async () => {
  return { installed: isOxevyInstalled() };
});

ipcMain.handle('download-oxevy', async () => {
  try {
    const rootDir = getGameRootDir();
    const { modPath, release } = await downloadOxevyMod(rootDir);

    const currentConfig = loadLauncherConfig();
    const updatedConfig = {
      ...currentConfig,
      oxevyMod: {
        ...(currentConfig.oxevyMod || {}),
        tag: release?.tag_name || null,
        publishedAt: release?.published_at || null,
        updatedAt: new Date().toISOString(),
      },
    };
    saveLauncherConfig(updatedConfig);

    return { success: true, path: modPath, tag: release?.tag_name || null };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-user-config', async () => loadLauncherConfig());

ipcMain.handle('save-user-config', async (event, config) => {
  const currentConfig = loadLauncherConfig();
  const updatedConfig = { ...currentConfig, ...config };
  const result = saveLauncherConfig(updatedConfig);
  
  // Handle Discord RPC based on settings
  const discordEnabled = updatedConfig.settings?.discordRichPresence === true;
  
  if (discordEnabled && !rpcClient && RPC) {
    // Small delay to ensure Discord is ready
    setTimeout(() => initializeDiscordRPC(), 1000);
  } else if (!discordEnabled && rpcClient) {
    clearDiscordActivity();
    shutdownDiscordRPC();
  }
  
  return result;
});

ipcMain.handle('ms-login-begin', async (event, options) => {
  const userConfig = loadLauncherConfig();
  const force = options?.force !== false;
  if (force) clearDirectory(microsoftCacheDir);

  let codePayload = null;
  try {
    shell.openExternal('https://www.microsoft.com/link').catch(() => {});

    const flow = getMicrosoftAuthflow({
      forceRefresh: force,
      onMsaCode: (data) => {
        codePayload = {
          verificationUri: data.verification_uri || data.verificationUri,
          userCode: data.user_code || data.userCode,
          expiresIn: data.expires_in || data.expiresIn,
          message: data.message,
        };
        sendToRenderer(event.sender, 'ms-login', { state: 'code', ...codePayload });
        shell
          .openExternal(codePayload.verificationUri || 'https://www.microsoft.com/link')
          .catch(() => {});
      },
    });

    (async () => {
      try {
        const result = await flow.getMinecraftJavaToken({ fetchProfile: true });
        const profile = result?.profile || null;
        const token = result?.token || null;
        if (!profile?.id || !profile?.name || !token) {
          throw new Error('Microsoft login did not return a valid Minecraft profile/token.');
        }

        let xuid = null;
        try {
          const xbox = await flow.getXboxToken();
          xuid = xbox?.userXUID || null;
        } catch (_) {}

        const updatedConfig = {
          ...userConfig,
          authType: 'microsoft',
          microsoft: {
            profile,
            xuid,
            clientToken: userConfig?.microsoft?.clientToken || randomUuidV4(),
            updatedAt: new Date().toISOString(),
          },
          username: profile?.name || userConfig.username || 'Player',
        };
        saveLauncherConfig(updatedConfig);
        sendToRenderer(event.sender, 'ms-login', { state: 'success', profile });
      } catch (error) {
        const message = String(error?.message || error || 'Unknown error');
        console.error('[ms-login] Failed:', error);
        sendToRenderer(event.sender, 'ms-login', {
          state: 'error',
          message,
          details: String(error?.stack || message),
        });
      }
    })();

    return { success: true, ...(codePayload || {}) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ms-logout', async () => {
  clearDirectory(microsoftCacheDir);
  const currentConfig = loadLauncherConfig();
  const updatedConfig = {
    ...currentConfig,
    authType: 'offline',
    microsoft: null,
  };
  saveLauncherConfig(updatedConfig);
  return { success: true };
});

ipcMain.handle('open-game-folder', async () => {
  const rootDir = getGameRootDir();
  try {
    await shell.openPath(rootDir);
    return { success: true, path: rootDir };
  } catch (error) {
    return { success: false, error: error.message, path: rootDir };
  }
});

ipcMain.handle('list-mods', async () => {
  const modsDir = getModsDir();
  try {
    fs.mkdirSync(modsDir, { recursive: true });
    const entries = fs.readdirSync(modsDir, { withFileTypes: true });
    const mods = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => name.endsWith('.jar') || name.endsWith('.jar.disabled'))
      .map((name) => {
        const enabled = name.endsWith('.jar');
        const baseName = enabled ? name : name.replace(/\.disabled$/, '');
        return {
          file: name,
          baseFile: baseName,
          enabled,
        };
      })
      .sort((a, b) => a.baseFile.localeCompare(b.baseFile));
    return { success: true, mods, path: modsDir };
  } catch (error) {
    return { success: false, error: error.message, mods: [], path: modsDir };
  }
});

ipcMain.handle('set-mod-enabled', async (event, payload) => {
  const modsDir = getModsDir();
  try {
    fs.mkdirSync(modsDir, { recursive: true });
    const file = payload?.file;
    const enabled = Boolean(payload?.enabled);
    if (!isSafeFilename(file)) {
      return { success: false, error: 'Invalid filename.' };
    }

    const sourcePath = path.join(modsDir, file);
    if (!fs.existsSync(sourcePath)) {
      return { success: false, error: 'Mod file not found.' };
    }

    let targetFile = file;
    if (enabled) {
      targetFile = file.endsWith('.disabled') ? file.replace(/\.disabled$/, '') : file;
    } else {
      targetFile = file.endsWith('.disabled') ? file : `${file}.disabled`;
    }
    if (!isSafeFilename(targetFile)) {
      return { success: false, error: 'Invalid target filename.' };
    }

    const targetPath = path.join(modsDir, targetFile);
    if (sourcePath === targetPath) {
      return { success: true, file: targetFile, enabled };
    }

    if (fs.existsSync(targetPath)) {
      return { success: false, error: 'Target file already exists.' };
    }

    fs.renameSync(sourcePath, targetPath);
    return { success: true, file: targetFile, enabled };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('launch-game', async (event, { username, memory, authType }) => {
  if (gameProcess && !gameProcess.killed) {
    return { success: false, error: 'Minecraft is already running.' };
  }

  const userConfig = loadLauncherConfig();
  const finalUsername = username || userConfig.username || 'Player';
  const finalMemory = memory || userConfig.memory || '4G';
  const effectiveAuthType = authType || userConfig.authType || 'offline';
  
  // Check if Discord RPC is enabled and initialize
  const discordEnabled = userConfig.settings?.discordRichPresence === true;
  if (discordEnabled && !rpcClient && RPC) {
    initializeDiscordRPC();
    // Give Discord a moment to connect
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Update Discord activity to show launching
  if (discordEnabled && rpcClient) {
    updateDiscordActivityLaunching(getProjectConfig().minecraftVersion);
  }

  const rootDir = getGameRootDir();
  const modsDir = path.join(rootDir, 'mods');
  const projectConfig = getProjectConfig();
  let modJarPath = resolveModJar();

  if (!modJarPath) {
    const downloadedModPath = path.join(modsDir, MOD_FILENAME);
    if (fs.existsSync(downloadedModPath)) {
      modJarPath = downloadedModPath;
    }
  }

  if (!modJarPath) {
    return { success: false, error: 'No built mod jar found in build/libs. Run ./gradlew build first, or install the Oxevy mod from the home tab.' };
  }

  try {
    sendToRenderer(event.sender, 'launch-state', { state: 'preparing' });

    const oxevyDir = path.join(rootDir, 'oxevy');
    fs.mkdirSync(oxevyDir, { recursive: true });

    const defaultConfigFiles = {
      'commands.json': '[]',
      'modules.json': '{}',
      'friends.json': '[]'
    };

    for (const [filename, defaultContent] of Object.entries(defaultConfigFiles)) {
      const filePath = path.join(oxevyDir, filename);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, defaultContent);
        console.log(`[launcher] Created ${filename}`);
      }
    }

    if (modJarPath !== path.join(modsDir, MOD_FILENAME)) {
      await deployModJar(modJarPath, modsDir, projectConfig.minecraftVersion, projectConfig.loaderVersion, rootDir);
    } else {
      const fabricApiPath = path.join(modsDir, 'fabric-api.jar');
      const fabricApiUrl = `https://cdn.modrinth.com/data/P7dR8mSH/versions/i5tSkVBH/fabric-api-0.141.3+1.21.11.jar`;
      if (!fs.existsSync(fabricApiPath)) {
        try {
          console.log(`[launcher] Downloading Fabric API from: ${fabricApiUrl}`);
          const response = await fetch(fabricApiUrl);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            fs.writeFileSync(fabricApiPath, Buffer.from(buffer));
            console.log('[launcher] Fabric API installed successfully');
          } else {
            console.log(`[launcher] Failed to download Fabric API: ${response.status}`);
          }
        } catch (error) {
          console.log(`[launcher] Could not download Fabric API: ${error.message}`);
        }
      }
    }

    const repairedArchives = repairGameArchives(rootDir);
    if (repairedArchives.length > 0) {
      console.log('[launcher] Removed invalid game archives:', repairedArchives);
      sendToRenderer(event.sender, 'launch-progress', {
        task: 0,
        total: 0,
        type: 'repair',
        repairedArchives,
      });
    }

    const fabricVersion = await ensureFabricProfile(
      rootDir,
      projectConfig.minecraftVersion,
      projectConfig.loaderVersion
    );

    let auth = null;
    if (effectiveAuthType === 'microsoft') {
      const flow = getMicrosoftAuthflow();
      const result = await flow.getMinecraftJavaToken({ fetchProfile: true });
      const profile = result?.profile;
      if (!profile?.id || !profile?.name || !result?.token) {
        throw new Error('Microsoft login did not return a valid Minecraft profile/token. Please sign in again.');
      }

      let xuid = userConfig?.microsoft?.xuid || null;
      if (!xuid) {
        try {
          const xbox = await flow.getXboxToken();
          xuid = xbox?.userXUID || null;
        } catch (_) {}
      }
      const clientToken = userConfig?.microsoft?.clientToken || randomUuidV4();

      auth = {
        access_token: result.token,
        client_token: clientToken,
        uuid: toDashedUuid(profile.id),
        name: profile.name,
        user_properties: '{}',
        meta: {
          type: 'msa',
          xuid: xuid || undefined,
          clientId: clientToken,
        },
      };

      saveLauncherConfig({
        ...userConfig,
        username: profile.name,
        authType: 'microsoft',
        microsoft: {
          profile,
          xuid,
          clientToken,
          updatedAt: new Date().toISOString(),
        },
      });
    } else {
      auth = await Authenticator.getAuth(String(finalUsername).trim() || 'Player');
    }
    const launcher = new Client();

    launcher.on('progress', (payload) => sendToRenderer(event.sender, 'launch-progress', payload));
    launcher.on('debug', (message) => console.log('[DEBUG]', message));
    launcher.on('data', (message) => console.log('[DATA]', message));
    launcher.on('close', (code) => {
      gameProcess = null;
      sendToRenderer(event.sender, 'launch-state', { state: 'closed', code });
      
      // Clear Discord activity when game closes
      if (discordEnabled && rpcClient) {
        clearDiscordActivity();
        // Set idle activity after clearing
        setTimeout(() => {
          if (discordEnabled && rpcClient) {
            updateDiscordActivityLauncherIdle();
          }
        }, 1000);
      }
    });

    const launchedProcess = await launcher.launch({
      authorization: auth,
      root: rootDir,
      version: {
        number: projectConfig.minecraftVersion,
        type: 'release',
        custom: fabricVersion,
      },
      memory: { max: finalMemory, min: '2G' },
      overrides: { detached: false },
    });
    
    // Update Discord activity when game launches
    if (discordEnabled && rpcClient) {
      updateDiscordActivityForGame(finalUsername, projectConfig.minecraftVersion);
    }

    if (!launchedProcess) {
      throw new Error('Minecraft did not start. Confirm that Java 21 is installed and available on PATH.');
    }

    gameProcess = launchedProcess;
    sendToRenderer(event.sender, 'launch-state', { state: 'running' });

    return { success: true };
  } catch (error) {
    gameProcess = null;
    console.error('Launch failed:', error);
    sendToRenderer(event.sender, 'launch-state', { state: 'error', message: error.message });
    
    // Reset Discord activity on launch error
    if (discordEnabled && rpcClient) {
      updateDiscordActivityLauncherIdle();
    }
    
    return { success: false, error: error.message };
  }
});

ipcMain.handle('force-stop', async () => {
  if (!gameProcess || gameProcess.killed) {
    return { success: false, error: 'Minecraft is not running.' };
  }

  gameProcess.kill('SIGTERM');
  return { success: true };
});

ipcMain.on('close-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.close();
  }
  app.quit();
});

app.on('will-quit', () => {
  shutdownDiscordRPC();
  app.exit(0);
});

ipcMain.on('minimize-window', () => BrowserWindow.getFocusedWindow()?.minimize());

// Cape config handlers
function getCapeConfigPath() {
  const rootDir = getGameRootDir();
  return path.join(rootDir, 'oxevy', 'launcher_cape.json');
}

ipcMain.handle('get-cape-config', async () => {
  try {
    const capePath = getCapeConfigPath();
    if (fs.existsSync(capePath)) {
      return { success: true, config: JSON.parse(fs.readFileSync(capePath, 'utf8')) };
    }
    return { success: true, config: { mode: 'NONE' } };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-cape-config', async (event, config) => {
  try {
    const capePath = getCapeConfigPath();
    fs.mkdirSync(path.dirname(capePath), { recursive: true });
    fs.writeFileSync(capePath, JSON.stringify(config, null, 2));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-cape-image', async (event, { dataUrl }) => {
  try {
    const rootDir = getGameRootDir();
    const capeDir = path.join(rootDir, 'oxevy');
    fs.mkdirSync(capeDir, { recursive: true });
    const matches = dataUrl.match(/^data:image\/(png|jpg|jpeg);base64,(.+)$/);
    if (!matches) return { success: false, error: 'Invalid image data' };
    const ext = matches[1] === 'png' ? 'png' : 'jpg';
    const fileName = `custom_cape.${ext}`;
    const filePath = path.join(capeDir, fileName);
    fs.writeFileSync(filePath, matches[2], 'base64');
    return { success: true, filePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-cape-image', async () => {
  try {
    const rootDir = getGameRootDir();
    const pngPath = path.join(rootDir, 'oxevy', 'custom_cape.png');
    const jpgPath = path.join(rootDir, 'oxevy', 'custom_cape.jpg');
    let filePath = null;
    if (fs.existsSync(pngPath)) filePath = pngPath;
    else if (fs.existsSync(jpgPath)) filePath = jpgPath;
    if (!filePath) return { success: false, error: 'No custom cape' };
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).slice(1);
    const dataUrl = `data:image/${ext};base64,${data.toString('base64')}`;
    return { success: true, dataUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-discord-user', async () => {
  try {
    if (rpcClient && rpcClient.user) {
      const user = rpcClient.user;
      let avatar = null;
      if (user.avatar) {
        avatar = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`;
      } else {
        const defaultIndex = user.discriminator ? Number(user.discriminator) % 5 : 0;
        avatar = `https://cdn.discordapp.com/embed/avatars/${defaultIndex}.png`;
      }
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          avatar,
        },
      };
    }
    return { success: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ensure-dir', async (event, { dirPath }) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-game-root-dir', async () => {
  try {
    const rootDir = getGameRootDir();
    return { success: true, path: rootDir };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Injector IPC handlers
function getInjectorPath() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const candidates = [
    path.join(__dirname, '../injector', `inject${ext}`),
    path.join(process.resourcesPath || '', 'injector', `inject${ext}`),
    path.join(__dirname, '../../../../injector/inject', ext),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

function isWindows() {
  return process.platform === 'win32';
}

ipcMain.handle('list-processes', async () => {
  try {
    if (isWindows()) {
      const injectorPath = getInjectorPath();
      if (fs.existsSync(injectorPath)) {
        const output = execSync(`"${injectorPath}" list`, { encoding: 'utf8', timeout: 5000 });
        const processes = output.trim().split('\n').filter(Boolean).map(line => {
          const [pid, ...nameParts] = line.split('|');
          return { pid: parseInt(pid, 10), name: nameParts.join('|') };
        });
        return { success: true, processes };
      }
      const output = execSync('tasklist /fo csv /nh', { encoding: 'utf8', timeout: 5000 });
      const processes = output.trim().split('\n').filter(Boolean).map(line => {
        const match = line.match(/"([^"]+)","(\d+)"/);
        if (match) return { name: match[1], pid: parseInt(match[2], 10) };
        return null;
      }).filter(Boolean);
      return { success: true, processes };
    }
    if (process.platform === 'linux') {
      const output = execSync('ps -e -o pid,comm --no-headers', { encoding: 'utf8', timeout: 5000 });
      const processes = output.trim().split('\n').filter(Boolean).map(line => {
        const [pid, ...nameParts] = line.trim().split(/\s+/);
        return { pid: parseInt(pid, 10), name: nameParts.join(' ') };
      });
      return { success: true, processes };
    }
    return { success: false, error: 'Unsupported platform' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('browse-dll', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'DLL Files', extensions: ['dll'] }, { name: 'All Files', extensions: ['*'] }],
    });
    if (result.canceled || !result.filePaths.length) {
      return { success: false, canceled: true };
    }
    return { success: true, path: result.filePaths[0] };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('inject-dll', async (event, { processName, dllPath }) => {
  if (!isWindows()) {
    return { success: false, error: 'DLL injection is only supported on Windows.' };
  }
  try {
    const injectorPath = getInjectorPath();
    if (fs.existsSync(injectorPath)) {
      return new Promise((resolve) => {
        const child = spawn(injectorPath, ['inject', processName, dllPath], {
          windowsHide: true,
          timeout: 30000,
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (data) => { stdout += data.toString(); });
        child.stderr.on('data', (data) => { stderr += data.toString(); });
        child.on('close', (code) => {
          if (code === 0 && stdout.includes('SUCCESS')) {
            resolve({ success: true, message: stdout.trim() });
          } else {
            resolve({ success: false, error: stderr.trim() || stdout.trim() || 'Injection failed' });
          }
        });
        child.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    }
    return { success: false, error: 'Injector binary not found. Build it with: scripts\\compile-injector.bat' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});