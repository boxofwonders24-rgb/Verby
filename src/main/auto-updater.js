const { autoUpdater } = require('electron-updater');
const { app, ipcMain } = require('electron');

// Set GH_UPDATE_TOKEN env var for auto-update auth.
// In CI: GitHub Actions secret. In dev: add to .env file.
// If empty, auto-update uses unauthenticated requests (public releases only).
const GH_READ_TOKEN = process.env.GH_UPDATE_TOKEN || '';

let mainWindow = null;
let isRecording = false;
let checkInterval = null;
let errorCount = 0;
let handlersRegistered = false;

function initAutoUpdater(window) {
  mainWindow = window;

  // Guard: skip if token not set (prevents shipping broken builds)
  if (!GH_READ_TOKEN) {
    console.error('[updater] No GH_READ_TOKEN set — auto-update disabled');
    return;
  }

  // Configure for private repo
  autoUpdater.requestHeaders = { Authorization: `token ${GH_READ_TOKEN}` };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // --- IPC handlers (register once to avoid crash on window re-creation) ---
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
  }

  // --- Update events ---
  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] Checking for update...');
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
    // Surface to user only after repeated failures (3+) — no raw error details to renderer
    if (errorCount >= 3 && mainWindow && !mainWindow.isDestroyed()) {
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
