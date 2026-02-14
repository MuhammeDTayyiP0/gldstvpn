const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const XrayManager = require('./xray-manager');
const ProxySettings = require('./proxy-settings');

let mainWindow;
let tray;
let xrayManager;
let proxySettings;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 600,
    resizable: true,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '..', '..', 'resources', 'icon.png'),
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
  const iconPath = path.join(__dirname, '..', '..', 'resources', 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'GeldeSat VPN',
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Göster',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Bağlan',
      click: () => handleConnect(),
    },
    {
      label: 'Bağlantıyı Kes',
      click: () => handleDisconnect(),
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        app.isQuitting = true;
        handleDisconnect().then(() => app.quit());
      },
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
}

async function handleConnect() {
  try {
    if (mainWindow) {
      mainWindow.webContents.send('connection-status', 'connecting');
    }

    await xrayManager.start();
    await proxySettings.enable('127.0.0.1', 10808);

    if (mainWindow) {
      mainWindow.webContents.send('connection-status', 'connected');
    }
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

    if (mainWindow) {
      mainWindow.webContents.send('connection-status', 'disconnected');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

app.whenReady().then(() => {
  xrayManager = new XrayManager();
  proxySettings = new ProxySettings();

  createWindow();
  createTray();

  // IPC Handlers
  ipcMain.handle('vpn:connect', async () => {
    return await handleConnect();
  });

  ipcMain.handle('vpn:disconnect', async () => {
    return await handleDisconnect();
  });

  ipcMain.handle('vpn:status', async () => {
    return {
      connected: xrayManager.isRunning(),
      serverInfo: xrayManager.getServerInfo(),
    };
  });

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.hide();
  });

  // Xray-core log forwarding
  xrayManager.on('log', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('xray-log', data);
    }
  });

  xrayManager.on('error', (error) => {
    if (mainWindow) {
      mainWindow.webContents.send('connection-error', error);
      mainWindow.webContents.send('connection-status', 'disconnected');
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Don't quit, keep in tray
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async () => {
  app.isQuitting = true;
  await handleDisconnect();
});
