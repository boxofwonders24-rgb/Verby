const { autoUpdater } = require('electron-updater');
const { app, ipcMain } = require('electron');

// Read-only fine-grained token (contents:read on verby repo only).
// Injected via .env at build time. Falls back to disabled if missing.
const GH_READ_TOKEN = process.env.GH_UPDATE_TOKEN || null;

let mainWindow = null;
let isRecording = false;
let checkInterval = null;
let errorCount = 0;
let handlersRegistered = false;
let updaterReady = false;

function initAutoUpdater(window) {
  mainWindow = window;

  // --- IPC handlers (register once, regardless of token) ---
  if (!handlersRegistered) {
    handlersRegistered = true;

    ipcMain.on('recording-started', () => { isRecording = true; });
    ipcMain.on('recording-stopped', () => { isRecording = false; });

    ipcMain.handle('install-update', () => {
      if (isRecording) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('update-blocked-recording');
        }
        return { blocked: true };
      }
      autoUpdater.quitAndInstall();
      return { blocked: false };
    });

    ipcMain.handle('get-app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('check-for-updates', async () => {
      if (!updaterReady) {
        return { error: 'Auto-updater not configured' };
      }
      try {
        await autoUpdater.checkForUpdates();
        return { checking: true };
      } catch (err) {
        console.error('[updater] Manual check failed:', err.message);
        return { error: err.message };
      }
    });
  }

  // Guard: skip auto-update setup if token not set
  if (!GH_READ_TOKEN) {
    console.error('[updater] No GH_READ_TOKEN set — auto-update disabled');
    return;
  }

  // Configure for private repo
  autoUpdater.requestHeaders = { Authorization: `token ${GH_READ_TOKEN}` };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  updaterReady = true;

  // --- Update events ---
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for update...');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Update available:', info.version);
    errorCount = 0;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-available', { version: info.version });
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[updater] Up to date');
    errorCount = 0;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-progress', { percent: Math.round(progress.percent) });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] Update downloaded:', info.version);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-downloaded', { version: info.version });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Error:', err.message);
    errorCount++;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error');
    }
  });

  // Initial check after window is ready
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] Initial check failed:', err.message);
  });

  // Periodic check every 4 hours
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  checkInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('[updater] Periodic check failed:', err.message);
    });
  }, FOUR_HOURS);
}

function stopAutoUpdater() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

module.exports = { initAutoUpdater, stopAutoUpdater };
