require('dotenv').config();

// File-based logging so we can debug when launched via Finder
const _fs = require('fs');
const _logPath = '/tmp/verbyprompt-app.log';
_fs.writeFileSync(_logPath, `=== VerbyPrompt started ${new Date().toISOString()} ===\n`);
const _origLog = console.log;
const _origErr = console.error;
console.log = (...args) => { _origLog(...args); _fs.appendFileSync(_logPath, args.join(' ') + '\n'); };
console.error = (...args) => { _origErr(...args); _fs.appendFileSync(_logPath, 'ERR: ' + args.join(' ') + '\n'); };

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
    mainWindow.loadFile(path.join(app.getAppPath(), 'dist', 'renderer', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    // mainWindow.webContents.openDevTools({ mode: 'detach' });
  });

  // Hide instead of close — keeps renderer alive for Fn key recording
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
};

// === Floating Recording Indicator ===
// Tiny pill that appears near the cursor while holding Fn — never steals focus
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
        window.resetPill = () => {
          document.getElementById('pill').classList.remove('processing');
          document.getElementById('label').textContent = 'Listening...';
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
    indicatorWindow.webContents.executeJavaScript('window.resetPill && window.resetPill()').catch(() => {});
    indicatorWindow.showInactive(); // showInactive = never steals focus
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
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
};

// === Fn Key Capture ===
// fn-capture needs Input Monitoring permission on macOS.
// We run it as a launchd agent so it has its own identity —
// the user grants Input Monitoring to fn-capture once, and it works
// regardless of how VerbyPrompt is launched.

const fs = require('fs');
const { exec, execSync } = require('child_process');

const FN_PIPE_PATH = '/tmp/verbyprompt-fn-events';
const AGENT_LABEL = 'com.verby.fn-capture';
const AGENT_PLIST = path.join(
  app.getPath('home'), 'Library', 'LaunchAgents', `${AGENT_LABEL}.plist`
);

function getFnBinaryPath() {
  // Use the binary the user granted Input Monitoring permission to.
  // Check dev path first (already approved), then fall back.
  const devBinary = '/Users/lotsofsocks/Development/verbyprompt/native/fn-capture';
  if (fs.existsSync(devBinary)) return devBinary;

  return isDev
    ? path.join(__dirname, '..', '..', 'native', 'fn-capture')
    : path.join(process.resourcesPath, 'native', 'fn-capture');
}

function startFnCapture() {
  const fnBinary = getFnBinaryPath();
  console.log('Fn binary path:', fnBinary);

  try {
    // Clean up
    try { execSync(`launchctl stop ${AGENT_LABEL} 2>/dev/null`); } catch {}
    try { execSync(`launchctl unload "${AGENT_PLIST}" 2>/dev/null`); } catch {}
    try { fs.unlinkSync(FN_PIPE_PATH); } catch {}
    try { execSync('pkill -f "fn-capture" 2>/dev/null'); } catch {}

    // Create named pipe
    execSync(`mkfifo "${FN_PIPE_PATH}"`);

    // Write launchd agent plist
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${AGENT_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${fnBinary}</string>
    <string>--pipe</string>
    <string>${FN_PIPE_PATH}</string>
  </array>
  <key>RunAtLoad</key>
  <false/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>`;
    fs.writeFileSync(AGENT_PLIST, plist);

    // Load and start the agent
    execSync(`launchctl load "${AGENT_PLIST}"`);
    execSync(`launchctl start ${AGENT_LABEL}`);

    // Read events from named pipe
    let retries = 0;
    let fnEventReceived = false;

    function connectPipe() {
      const pipeStream = fs.createReadStream(FN_PIPE_PATH, { encoding: 'utf8' });
      let buffer = '';

      pipeStream.on('data', (data) => {
        buffer += data;
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          const event = line.trim();
          if (event === 'fn_down') {
            console.log('>>> Fn DOWN detected');
            fnEventReceived = true;
            showIndicator();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('fn-down');
            }
          } else if (event === 'fn_up') {
            console.log('>>> Fn UP detected');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('fn-up');
            }
          } else if (event === 'fn_ready') {
            console.log('Fn key capture ready');
          } else if (event === 'fn_requesting_permission') {
            console.log('Fn key: requesting Input Monitoring permission...');
            // Notify user
            const { Notification } = require('electron');
            if (Notification.isSupported()) {
              new Notification({
                title: 'VerbyPrompt — Grant Permission',
                body: 'Allow fn-capture in Input Monitoring (System Settings → Privacy → Input Monitoring)',
              }).show();
            }
          }
        }
      });

      pipeStream.on('error', (err) => {
        if (retries < 5 && !app.isQuitting) {
          retries++;
          setTimeout(connectPipe, 1000);
        } else {
          console.error('Fn pipe error:', err.message);
        }
      });

      pipeStream.on('close', () => {
        if (!app.isQuitting) {
          setTimeout(connectPipe, 2000);
        }
      });
    }

    setTimeout(connectPipe, 500);
    console.log('Fn key capture started (via launchd)');
  } catch (err) {
    console.error('fn-capture unavailable:', err.message);
  }
}

// === IPC for indicator control ===
ipcMain.on('indicator-processing', () => setIndicatorProcessing());
ipcMain.on('indicator-hide', () => hideIndicator());

// === Debug: forward renderer logs ===
ipcMain.on('renderer-log', (_event, msg) => {
  console.log('[renderer]', msg);
});

// === App Lifecycle ===
app.whenReady().then(() => {
  const { registerHandlers } = require('./ipc-handlers.cjs');

  // Set dock icon
  const iconPath = isDev
    ? path.join(__dirname, '..', '..', 'assets', 'icon.icns')
    : path.join(process.resourcesPath, 'icon.icns');
  if (require('fs').existsSync(iconPath) && app.dock) {
    app.dock.setIcon(nativeImage.createFromPath(iconPath));
  }

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

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  // Stop launchd agent and clean up
  try { execSync(`launchctl stop ${AGENT_LABEL} 2>/dev/null`); } catch {}
  try { execSync(`launchctl unload "${AGENT_PLIST}" 2>/dev/null`); } catch {}
  try { execSync('pkill -f "fn-capture" 2>/dev/null'); } catch {}
  try { fs.unlinkSync(FN_PIPE_PATH); } catch {}
  if (fnProcess) { fnProcess.kill(); fnProcess = null; }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  else mainWindow.show();
});
