const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 780,
    height: 620,
    backgroundColor: '#050508',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const toggleWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
};

const createTray = () => {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('VerbyPrompt');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show/Hide', click: toggleWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
};

app.whenReady().then(() => {
  const { registerHandlers } = require('./ipc-handlers.cjs');

  createWindow();
  registerHandlers(mainWindow);
  createTray();

  // Hold-to-talk: Alt+Space toggles recording
  // keydown = start, next keydown = stop (toggle)
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
      mainWindow.webContents.send('toggle-recording');
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
