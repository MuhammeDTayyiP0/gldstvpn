const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const XrayManager = require('./xray-manager');
const ProxySettings = require('./proxy-settings');

// Global references
let mainWindow;
let tray;
let xrayManager;
let proxySettings;

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 600,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: 'MTE VPN',
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  // Try to load the icon.png with specific settings for Windows
  const isPackaged = app.isPackaged;
  const baseDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..', '..');
  const iconPath = path.join(baseDir, 'resources', 'icon.png');

  let trayIcon;
  if (fs.existsSync(iconPath)) {
    // createFromPath and ensure it's NOT a template image (which can cause transparency on Windows)
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon.setTemplateImage(false);
  }

  // Final fallback to a very solid 16x16 blue square if file is missing or invalid
  if (!trayIcon || trayIcon.isEmpty()) {
    const solidBlueBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADhJREFUOE9jZKAQMFKon2HUAIYGBgaG/0D8H4j/A/E/IP6PST6E8X8Yv8HoP4zfYfQfRn8mEAfG/6H4PxSfuAb8Z2D4D8YnrgH/Gf6PST6E8X8Yv8HoP4zfYfQfRn8mEAcA3c0vIdat6r8AAAAASUVORK5CYII=';
    trayIcon = nativeImage.createFromDataURL(solidBlueBase64);
  }

  // Ensure 16x16 for Windows Tray
  const finalIcon = trayIcon.resize({ width: 16, height: 16 });

  try {
    tray = new Tray(finalIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MTE VPN v1.1.1', enabled: false },
      { type: 'separator' },
      { label: 'Uygulamayı Göster', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Bağlan', click: () => handleConnect() },
      { label: 'Bağlantıyı Kes', click: () => handleDisconnect() },
      { type: 'separator' },
      {
        label: 'Çıkış',
        click: () => {
          app.isQuitting = true;
          handleDisconnect().then(() => app.quit());
        }
      },
    ]);

    tray.setToolTip('MTE VPN');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (err) {
    console.error('Tray creation error:', err.message);
  }
}

async function handleConnect() {
  try {
    if (mainWindow) mainWindow.webContents.send('connection-status', 'connecting');
    await xrayManager.start();
    await proxySettings.enable('127.0.0.1', 10808);
    if (mainWindow) mainWindow.webContents.send('connection-status', 'connected');
    return { success: true };
  } catch (error) {
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', 'disconnected');
      mainWindow.webContents.send('connection-error', error.message);
    }
    return { success: false, error: error.message };
  }
}

async function handleDisconnect() {
  try {
    await proxySettings.disable();
    await xrayManager.stop();
    if (mainWindow) mainWindow.webContents.send('connection-status', 'disconnected');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

app.whenReady().then(() => {
  // Set App User Model ID for Windows Taskbar grouping and notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.mte.vpn');
  }

  xrayManager = new XrayManager();
  proxySettings = new ProxySettings();
  createWindow();
  createTray();

  ipcMain.handle('vpn:connect', () => handleConnect());
  ipcMain.handle('vpn:disconnect', () => handleDisconnect());
  ipcMain.handle('vpn:status', () => ({
    connected: xrayManager.isRunning(),
    serverInfo: xrayManager.getServerInfo(),
  }));
  ipcMain.handle('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.handle('window:close', () => { if (mainWindow) mainWindow.hide(); });

  xrayManager.on('log', (data) => { if (mainWindow) mainWindow.webContents.send('xray-log', data); });
  xrayManager.on('traffic', (data) => { if (mainWindow) mainWindow.webContents.send('traffic-update', data); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running
  }
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  await handleDisconnect();
});
