const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let indicatorWindow = null;
let tray = null;
let fnProcess = null;

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

// === Main Window ===
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

  mainWindow.on('closed', () => { mainWindow = null; });
};

// === Floating Recording Indicator ===
// Tiny pill that appears near the cursor while holding Fn
const createIndicator = () => {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) return;

  indicatorWindow = new BrowserWindow({
    width: 160,
    height: 44,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: true,
    roundedCorners: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  indicatorWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  indicatorWindow.setAlwaysOnTop(true, 'floating', 1);

  // Inline HTML for the indicator — no external file needed
  const html = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html><html><head><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body {
        background: transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        font-family: -apple-system, Inter, sans-serif;
        -webkit-app-region: no-drag;
        user-select: none;
      }
      .pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: rgba(10, 10, 18, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(244, 63, 94, 0.3);
        border-radius: 22px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.4), 0 0 20px rgba(244, 63, 94, 0.15);
      }
      .dot {
        width: 8px; height: 8px;
        border-radius: 50%;
        background: #F43F5E;
        animation: pulse 1s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(0.8); }
      }
      .label {
        font-size: 12px;
        font-weight: 600;
        color: #F1F5F9;
        letter-spacing: 0.3px;
      }
      .processing .dot { background: #6366F1; }
      .processing .label { color: #A5B4FC; }
    </style></head><body>
      <div class="pill" id="pill">
        <div class="dot"></div>
        <div class="label" id="label">Listening...</div>
      </div>
      <script>
        window.setProcessing = () => {
          document.getElementById('pill').classList.add('processing');
          document.getElementById('label').textContent = 'Processing...';
        };
      </script>
    </body></html>
  `)}`;

  indicatorWindow.loadURL(html);
  indicatorWindow.setIgnoreMouseEvents(true);

  // Position near top-center of screen
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const x = Math.round(display.bounds.x + (display.bounds.width - 160) / 2);
  const y = display.bounds.y + 60;
  indicatorWindow.setPosition(x, y);
};

const showIndicator = () => {
  createIndicator();
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.show();
  }
};

const hideIndicator = () => {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.hide();
  }
};

const setIndicatorProcessing = () => {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.webContents.executeJavaScript('window.setProcessing()').catch(() => {});
  }
};

// === Toggle Main Window ===
const toggleWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return; }
  if (mainWindow.isVisible()) { mainWindow.hide(); }
  else { mainWindow.show(); mainWindow.focus(); }
};

// === Tray ===
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

// === Fn Key Capture ===
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
      buffer = lines.pop();

      for (const line of lines) {
        const event = line.trim();
        if (event === 'fn_down') {
          // Fn pressed — show indicator + start recording in renderer
          showIndicator();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('fn-down');
          }
        } else if (event === 'fn_up') {
          // Fn released — stop recording, process, inject
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('fn-up');
          }
        }
      }
    });

    fnProcess.stderr.on('data', (data) => {
      console.error('fn-capture:', data.toString());
    });

    fnProcess.on('close', (code) => {
      console.log('fn-capture exited:', code);
      fnProcess = null;
    });

    console.log('Fn key capture started');
  } catch (err) {
    console.error('fn-capture unavailable:', err.message);
  }
}

// === IPC for indicator control ===
ipcMain.on('indicator-processing', () => setIndicatorProcessing());
ipcMain.on('indicator-hide', () => hideIndicator());

// === App Lifecycle ===
app.whenReady().then(() => {
  const { registerHandlers } = require('./ipc-handlers.cjs');

  createWindow();
  registerHandlers(mainWindow);
  createTray();
  startFnCapture();

  // Alt+Space = prompt mode (show window + toggle recording)
  globalShortcut.register('Alt+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (!mainWindow.isVisible()) { mainWindow.show(); mainWindow.focus(); }
      mainWindow.webContents.send('toggle-recording');
    }
  });

  // Ctrl+Alt+Space = dictation mode toggle (backup for Fn key)
  globalShortcut.register('Control+Alt+Space', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('toggle-dictation');
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (fnProcess) { fnProcess.kill(); fnProcess = null; }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
