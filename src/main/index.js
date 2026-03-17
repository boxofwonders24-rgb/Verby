const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let tray = null;
let fnProcess = null;

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

// === Fn Key Capture via native Swift helper ===
function startFnCapture() {
  const fnBinary = isDev
    ? path.join(__dirname, '..', '..', 'native', 'fn-capture')
    : path.join(process.resourcesPath, 'native', 'fn-capture');

  try {
    fnProcess = spawn(fnBinary, [], { stdio: ['ignore', 'pipe', 'pipe'] });

    let buffer = '';
    fnProcess.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        const event = line.trim();
        if (event === 'fn_down') {
          // Fn pressed — start dictation
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('toggle-dictation');
          }
        }
        // fn_up can be used later for hold-to-talk (stop on release)
      }
    });

    fnProcess.stderr.on('data', (data) => {
      console.error('fn-capture error:', data.toString());
    });

    fnProcess.on('close', (code) => {
      console.log('fn-capture exited with code', code);
      fnProcess = null;
    });

    console.log('Fn key capture started');
  } catch (err) {
    console.error('Failed to start fn-capture:', err.message);
    console.log('Fn key capture unavailable — use Alt+Space or Ctrl+Alt+Space instead');
  }
}

app.whenReady().then(() => {
  const { registerHandlers } = require('./ipc-handlers.cjs');

  createWindow();
  registerHandlers(mainWindow);
  createTray();

  // Start native Fn key listener
  startFnCapture();

  // Alt+Space = toggle prompt mode recording (shows window)
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) {
        mainWindow.show();
        mainWindow.focus();
      }
      mainWindow.webContents.send('toggle-recording');
    }
  });

  // Ctrl+Alt+Space = toggle dictation mode (type anywhere)
  globalShortcut.register('Control+Alt+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-dictation');
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  // Kill the fn-capture process
  if (fnProcess) {
    fnProcess.kill();
    fnProcess = null;
  }
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
