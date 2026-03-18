const { autoUpdater } = require('electron-updater');
const { app, ipcMain } = require('electron');

// Read-only fine-grained GitHub token (contents:read on verby repo only)
// If compromised: revoke on GitHub, embed new token, ship update.
// Users on old version see "download manually at verbyai.com" fallback.
const GH_READ_TOKEN = 'PLACEHOLDER_TOKEN';

let mainWindow = null;
let isRecording = false;
let checkInterval = null;
let errorCount = 0;

function initAutoUpdater(window) {
  mainWindow = window;

  // Configure for private repo
  autoUpdater.requestHeaders = { Authorization: `token ${GH_READ_TOKEN}` };
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // --- Recording state sync ---
  ipcMain.on('recording-started', () => { isRecording = true; });
  ipcMain.on('recording-stopped', () => { isRecording = false; });

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
    // Surface to user only after repeated failures (3+)
    if (errorCount >= 3 && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update-error', { message: err.message });
    }
  });

  // --- Install handler (gated on recording state) ---
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

  // --- IPC: get app version ---
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
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
