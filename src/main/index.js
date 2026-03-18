require('dotenv').config();

// Force process name to 'Verby' — fixes "Electron" in macOS menu bar during dev
if (process.platform === 'darwin') {
  try { process.setTitle && process.setTitle('Verby'); } catch {}
}

// File-based logging so we can debug when launched via Finder
const _fs = require('fs');
const _logPath = '/tmp/verbyprompt-app.log';
_fs.writeFileSync(_logPath, `=== Verby started ${new Date().toISOString()} ===\n`);
const _origLog = console.log;
const _origErr = console.error;
console.log = (...args) => { _origLog(...args); _fs.appendFileSync(_logPath, args.join(' ') + '\n'); };
console.error = (...args) => { _origErr(...args); _fs.appendFileSync(_logPath, 'ERR: ' + args.join(' ') + '\n'); };

const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
// indicatorWindow removed — using tray icon for recording state instead
let tray = null;
let fnProcess = null;

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

// Set app name (overrides "Electron" in dev mode)
app.setName('Verby');
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'Verby',
    applicationVersion: '0.1.0',
    copyright: 'Stephen Grandy',
  });
}

// === Main Window ===
const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 780,
    height: 620,
    backgroundColor: '#050508',
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 14 },
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

// === Native macOS Indicator ===
// Uses a Swift NSWindow for true transparency — no Electron BrowserWindow artifacts
// Pulsing dot with glow, top-center of screen, animated natively
let indicatorProcess = null;

function startIndicatorProcess() {
  if (indicatorProcess) return;
  const indicatorBin = isDev
    ? path.join(__dirname, '..', '..', 'native', 'indicator')
    : path.join(process.resourcesPath, 'native', 'indicator');

  indicatorProcess = spawn(indicatorBin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
  indicatorProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg === 'indicator_ready') console.log('Native indicator ready');
  });
  indicatorProcess.stderr.on('data', (d) => console.error('indicator:', d.toString().trim()));
  indicatorProcess.on('close', () => { indicatorProcess = null; });
}

function sendIndicatorCmd(cmd) {
  if (indicatorProcess && indicatorProcess.stdin.writable) {
    indicatorProcess.stdin.write(cmd + '\n');
  }
}

const showIndicator = () => {
  startIndicatorProcess();
  // Small delay for process to init on first call
  setTimeout(() => sendIndicatorCmd('show #6366F1'), indicatorProcess ? 0 : 500);
};

const hideIndicator = () => {
  sendIndicatorCmd('hide');
};

const setIndicatorProcessing = () => {
  sendIndicatorCmd('color #14B8A6');
};

// === Toggle Main Window ===
const toggleWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) { createWindow(); return; }
  if (mainWindow.isVisible()) { mainWindow.hide(); }
  else { mainWindow.show(); mainWindow.focus(); }
};

// === Tray ===
const createTray = () => {
  const trayIconPath = isDev
    ? path.join(__dirname, '..', '..', 'assets', 'tray-icon.png')
    : path.join(process.resourcesPath, 'tray-icon.png');

  let icon;
  if (require('fs').existsSync(trayIconPath)) {
    icon = nativeImage.createFromPath(trayIconPath);
    icon = icon.resize({ width: 18, height: 18 });
    icon.setTemplateImage(true); // adapts to dark/light menu bar
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip('Verby');

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Verby', enabled: false },
    { type: 'separator' },
    { label: 'Show Window', accelerator: 'Alt+Space', click: () => {
      if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); }
    }},
    { label: 'Settings', click: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('open-settings');
      }
    }},
    { type: 'separator' },
    { label: 'Dictation Mode', type: 'checkbox', checked: true, click: (item) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('toggle-dictation');
      }
    }},
    { type: 'separator' },
    { label: 'Quit Verby', accelerator: 'CmdOrCtrl+Q', click: () => {
      app.isQuitting = true;
      app.quit();
    }},
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
};

// === Auto-detect frontmost app for context ===
let lastDetectedApp = '';

function detectFrontmostApp() {
  exec(`osascript -e 'tell application "System Events" to get {name, title of first window} of first application process whose frontmost is true' 2>/dev/null`, (err, stdout) => {
    if (err || !stdout) return;
    const raw = stdout.trim();
    // Output looks like: "Google Chrome, My Page - Google Chrome"
    // or "Code, main.js — verbyprompt"
    if (raw === lastDetectedApp) return;
    lastDetectedApp = raw;

    const parts = raw.split(', ');
    const appName = parts[0] || '';
    const windowTitle = parts.slice(1).join(', ') || '';

    console.log(`>>> Auto-context: ${appName} — ${windowTitle}`);

    // Send to renderer for display
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auto-context', { appName, windowTitle });
    }
    // Push to ipc-handlers for system prompt injection
    const { setAutoContext } = require('./ipc-handlers.cjs');
    setAutoContext({ appName, windowTitle });
  });
}

// === Fn Key Capture ===
// fn-capture needs Input Monitoring permission on macOS.
// We run it as a launchd agent so it has its own identity —
// the user grants Input Monitoring to fn-capture once, and it works
// regardless of how Verby is launched.

const fs = require('fs');
const { exec, execSync } = require('child_process');

const FN_PIPE_PATH = '/tmp/verbyprompt-fn-events';
const AGENT_LABEL = 'com.verby.fn-capture';
const AGENT_PLIST = path.join(
  app.getPath('home'), 'Library', 'LaunchAgents', `${AGENT_LABEL}.plist`
);

function getFnBinaryPath() {
  return isDev
    ? path.join(__dirname, '..', '..', 'native', 'fn-capture')
    : path.join(process.resourcesPath, 'native', 'fn-capture');
}

function startFnCapture() {
  const fnBinary = getFnBinaryPath();
  console.log('Fn binary path:', fnBinary);

  try {
    // Clean up any old launchd agents and processes
    try { execSync(`launchctl stop ${AGENT_LABEL} 2>/dev/null`); } catch {}
    try { execSync(`launchctl unload "${AGENT_PLIST}" 2>/dev/null`); } catch {}
    try { fs.unlinkSync(FN_PIPE_PATH); } catch {}
    try { fs.unlinkSync(AGENT_PLIST); } catch {}
    try { execSync('pkill -f "fn-capture" 2>/dev/null'); } catch {}

    // Create named pipe
    execSync(`mkfifo "${FN_PIPE_PATH}"`);

    // Spawn fn-capture as a direct child process writing to the pipe
    // In dev mode this inherits iTerm's Input Monitoring permission
    // In production the .app needs Input Monitoring granted
    const fnChild = spawn(fnBinary, ['--pipe', FN_PIPE_PATH], {
      stdio: ['ignore', 'ignore', 'pipe'],
      detached: true,
    });
    fnChild.unref();
    fnChild.stderr.on('data', (d) => console.error('fn-capture:', d.toString().trim()));
    fnChild.on('close', (code, signal) => {
      console.log(`fn-capture exited: code=${code} signal=${signal}`);
    });

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
            // Detect frontmost app for auto-context
            detectFrontmostApp();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('fn-down');
            }
          } else if (event === 'fn_up') {
            console.log('>>> Fn UP detected');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('fn-up');
            }
          } else if (event === 'ctrl_down') {
            console.log('>>> Ctrl DOWN detected (raw dictation)');
            showIndicator();
            detectFrontmostApp();
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ctrl-down');
            }
          } else if (event === 'ctrl_up') {
            console.log('>>> Ctrl UP detected');
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('ctrl-up');
            }
          } else if (event === 'fn_ready') {
            console.log('Fn key capture ready');
            // If no Fn events after 15 seconds, user probably needs permissions
            setTimeout(() => {
              if (!fnEventReceived && !app.isQuitting) {
                console.log('No Fn events detected — prompting user for permissions');
                const { Notification, shell } = require('electron');
                if (Notification.isSupported()) {
                  const notif = new Notification({
                    title: 'Verby — Fn Key Setup',
                    body: 'Hold Fn to dictate. If it\'s not working, click here to grant Input Monitoring permission.',
                  });
                  notif.on('click', () => {
                    shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent');
                  });
                  notif.show();
                }
                // Also notify renderer to show in-app guidance
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('fn-permission-needed');
                }
              }
            }, 15000);
          } else if (event === 'fn_requesting_permission') {
            console.log('Fn key: requesting Input Monitoring permission...');
            const { Notification, shell } = require('electron');
            if (Notification.isSupported()) {
              const notif = new Notification({
                title: 'Verby — Grant Permission',
                body: 'Verby needs Input Monitoring to detect the Fn key. Click to open Settings.',
              });
              notif.on('click', () => {
                shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent');
              });
              notif.show();
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

  // Override macOS app menu — replaces "Electron" with "Verby" in top-left
  const appMenu = Menu.buildFromTemplate([
    {
      label: 'Verby',
      submenu: [
        { role: 'about', label: 'About Verby' },
        { type: 'separator' },
        { label: 'Settings...', accelerator: 'CmdOrCtrl+,', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('open-settings');
          }
        }},
        { type: 'separator' },
        { role: 'hide', label: 'Hide Verby' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit Verby', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' }, { role: 'redo' }, { type: 'separator' },
        { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' }, { role: 'close' },
      ],
    },
  ]);
  Menu.setApplicationMenu(appMenu);

  // Set dock icon (use PNG for reliable nativeImage loading)
  const iconPng = isDev
    ? path.join(__dirname, '..', '..', 'assets', 'icon-512.png')
    : path.join(process.resourcesPath, 'icon-512.png');
  const iconIcns = isDev
    ? path.join(__dirname, '..', '..', 'assets', 'icon.icns')
    : path.join(process.resourcesPath, 'icon.icns');
  if (app.dock) {
    const iconFile = require('fs').existsSync(iconPng) ? iconPng : iconIcns;
    const icon = nativeImage.createFromPath(iconFile);
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
      console.log('Dock icon set from:', iconFile);
    } else {
      console.log('Dock icon failed to load from:', iconFile);
    }
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

  // Cmd+Shift+Space = fallback for Fn key (enhanced dictation toggle)
  // Works without Input Monitoring — for users who can't get Fn working
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
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
  if (indicatorProcess) { indicatorProcess.kill(); indicatorProcess = null; }
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
