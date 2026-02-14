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
let usageStore = {
  path: '',
  data: {
    total: 0,
    history: {} // Format: "YYYY-MM-DD": { up: 0, down: 0 }
  }
};
let lastSessionStats = { up: 0, down: 0 };

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
    width: 480,
    height: 720,
    minWidth: 420,
    minHeight: 620,
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
  // Try to load icon - prefer SVG (actual design), fallback to PNG
  const isPackaged = app.isPackaged;
  const baseDir = isPackaged ? process.resourcesPath : path.join(__dirname, '..', '..');
  const svgPath = path.join(baseDir, 'resources', 'icon.svg');
  const pngPath = path.join(baseDir, 'resources', 'icon.png');

  let trayIcon;

  // Try SVG first (contains the actual shield+checkmark design)
  if (fs.existsSync(svgPath)) {
    try {
      const svgData = fs.readFileSync(svgPath);
      trayIcon = nativeImage.createFromBuffer(svgData);
      if (trayIcon && !trayIcon.isEmpty()) {
        trayIcon.setTemplateImage(false);
      }
    } catch (e) {
      console.log('SVG icon load failed, trying PNG:', e.message);
    }
  }

  // Fallback to PNG
  if (!trayIcon || trayIcon.isEmpty()) {
    if (fs.existsSync(pngPath)) {
      trayIcon = nativeImage.createFromPath(pngPath);
      if (trayIcon && !trayIcon.isEmpty()) {
        trayIcon.setTemplateImage(false);
      }
    }
  }

  // Final fallback to a solid indigo square matching our brand color
  if (!trayIcon || trayIcon.isEmpty()) {
    const solidBlueBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADhJREFUOE9jZKAQMFKon2HUAIYGBgaG/0D8H4j/A/E/IP6PST6E8X8Yv8HoP4zfYfQfRn8mEAfG/6H4PxSfuAb8Z2D4D8YnrgH/Gf6PST6E8X8Yv8HoP4zfYfQfRn8mEAcA3c0vIdat6r8AAAAASUVORK5CYII=';
    trayIcon = nativeImage.createFromDataURL(solidBlueBase64);
  }

  // Ensure 16x16 for Windows Tray
  const finalIcon = trayIcon.resize({ width: 16, height: 16 });

  try {
    tray = new Tray(finalIcon);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'MTE VPN v1.2.0', enabled: false },
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

// === Usage Data Management ===
function initUsageStore() {
  const userDataPath = app.getPath('userData');
  usageStore.path = path.join(userDataPath, 'usage-stats.json');

  try {
    if (fs.existsSync(usageStore.path)) {
      const raw = fs.readFileSync(usageStore.path);
      const parsed = JSON.parse(raw);
      // Merge with default structure to ensure compatibility
      usageStore.data = { ...usageStore.data, ...parsed };
    } else {
      saveUsageStore();
    }
  } catch (e) {
    console.error('Usage store load error:', e);
  }
}

function saveUsageStore() {
  try {
    fs.writeFileSync(usageStore.path, JSON.stringify(usageStore.data, null, 2));
  } catch (e) {
    console.error('Usage store save error:', e);
  }
}

function processTrafficForStats(data) {
  // data: { upSpeed, downSpeed, totalUp, totalDown, total } from XrayManager
  // XrayManager sends cumulative session totals. We need deltas.

  const deltaUp = Math.max(0, data.totalUp - lastSessionStats.up);
  const deltaDown = Math.max(0, data.totalDown - lastSessionStats.down);

  // Update last session state
  lastSessionStats.up = data.totalUp;
  lastSessionStats.down = data.totalDown;

  if (deltaUp === 0 && deltaDown === 0) return;

  const today = new Date().toISOString().split('T')[0];

  if (!usageStore.data.history[today]) {
    usageStore.data.history[today] = { up: 0, down: 0 };
  }

  usageStore.data.history[today].up += deltaUp;
  usageStore.data.history[today].down += deltaDown;
  usageStore.data.total += (deltaUp + deltaDown);

  // Debounced save could be better, but for now save periodically or on quit?
  // Let's save every time for simplicity but safety, or better: throttle it.
  // For now simple write.
  saveUsageStore();
}

function getUsageStats() {
  const history = usageStore.data.history;
  const now = new Date();
  const todayKey = now.toISOString().split('T')[0];

  let day = 0;
  let week = 0;
  let month = 0;
  let all = usageStore.data.total;

  // Calculate Day
  if (history[todayKey]) {
    day = history[todayKey].up + history[todayKey].down;
  }

  // Calculate Week (Last 7 days) & Month (Last 30 days)
  for (const [dateStr, stat] of Object.entries(history)) {
    const entryDate = new Date(dateStr);
    const diffTime = Math.abs(now - entryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const dailyTotal = stat.up + stat.down;

    if (diffDays <= 7) week += dailyTotal;
    if (diffDays <= 30) month += dailyTotal;
  }

  return { day, week, month, all };
}

app.whenReady().then(() => {
  // Set App User Model ID for Windows Taskbar grouping and notifications
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.mte.vpn');
  }

  xrayManager = new XrayManager();
  proxySettings = new ProxySettings();
  initUsageStore(); // Initialize store

  createWindow();
  createTray();

  ipcMain.handle('vpn:connect', () => {
    // Reset session stats on new connection attempt to sync with XrayManager which resets on start
    lastSessionStats = { up: 0, down: 0 };
    return handleConnect();
  });
  ipcMain.handle('vpn:disconnect', () => handleDisconnect());
  ipcMain.handle('vpn:get-usage', () => getUsageStats()); // Expose usage stats
  ipcMain.handle('vpn:status', () => ({
    connected: xrayManager.isRunning(),
    serverInfo: xrayManager.getServerInfo(),
  }));
  ipcMain.handle('window:minimize', () => { if (mainWindow) mainWindow.minimize(); });
  ipcMain.handle('window:close', () => { if (mainWindow) mainWindow.hide(); });

  xrayManager.on('log', (data) => { if (mainWindow) mainWindow.webContents.send('xray-log', data); });
  xrayManager.on('traffic', (data) => {
    if (mainWindow) mainWindow.webContents.send('traffic-update', data);
    processTrafficForStats(data); // Process persistence
  });
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
