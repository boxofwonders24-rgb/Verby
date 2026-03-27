// Load .env — in dev it's at the project root, in packaged builds it's in Resources/
const path_env = require('path');
const { app: _app } = require('electron');
const _envPaths = [
  path_env.join(process.resourcesPath || '', '.env'),  // Packaged: Resources/.env
  path_env.join(__dirname, '..', '..', '.env'),          // Dev: project root
];
for (const p of _envPaths) {
  const result = require('dotenv').config({ path: p });
  if (!result.error) break;
}

const platform = require('./platform');

// Force process name to 'Verby' — fixes "Electron" in macOS menu bar during dev
if (platform.isMac) {
  try { process.title = 'Verby'; } catch {}
}

// File-based logging so we can debug when launched via Finder / Explorer
const _fs = require('fs');
const _logPath = platform.getLogPath();
_fs.writeFileSync(_logPath, `=== Verby started ${new Date().toISOString()} ===\n`);
const _origLog = console.log;
const _origErr = console.error;
console.log = (...args) => { _origLog(...args); _fs.appendFileSync(_logPath, args.join(' ') + '\n'); };
console.error = (...args) => { _origErr(...args); _fs.appendFileSync(_logPath, 'ERR: ' + args.join(' ') + '\n'); };

const { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, ipcMain, systemPreferences } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { initAutoUpdater, stopAutoUpdater } = require('./auto-updater');
const { initAuth, handleAuthCallback } = require('./auth');

let mainWindow = null;
let tray = null;
let fnProcess = null;

const isDev = !app.isPackaged;
const DEV_URL = 'http://localhost:5173';

// Ensure single instance — required for Windows deep link handling via 'second-instance' event.
// On macOS this also prevents duplicate instances.
// If the lock is stale (previous crash), Electron will acquire it on retry.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is running — quitting');
  app.quit();
}

// Set app name (overrides "Electron" in dev mode)
app.setName('Verby');
if (platform.isMac) {
  app.setAboutPanelOptions({
    applicationName: 'Verby',
    applicationVersion: app.getVersion(),
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
    ...platform.getWindowChrome(),
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
    if (!isDev) initAutoUpdater(mainWindow);
  });

  // Fallback: if ready-to-show doesn't fire within 5s, show anyway
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.log('ready-to-show timeout — forcing window visible');
      mainWindow.show();
      mainWindow.focus();
    }
  }, 5000);

  // Log renderer errors
  mainWindow.webContents.on('did-fail-load', (_e, code, desc) => {
    console.error(`Renderer failed to load: ${code} ${desc}`);
  });
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('Renderer crashed:', details.reason);
  });

  // Hide on close if tray mode is active, otherwise quit normally
  mainWindow.on('close', (e) => {
    if (!app.isQuitting && tray) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
};

// === Recording Indicator ===
// macOS: uses native Swift NSWindow for best transparency (falls back to Electron window)
// Windows/Linux: uses Electron BrowserWindow with transparent pulsing dot
const crossPlatformIndicator = require('./platform/indicator');
let nativeIndicatorProcess = null;

function startNativeIndicatorProcess() {
  if (!platform.features.nativeIndicator) return false;
  if (nativeIndicatorProcess) return true;
  const indicatorBin = isDev
    ? path.join(__dirname, '..', '..', 'native', 'indicator')
    : path.join(process.resourcesPath, 'native', 'indicator');

  try {
    nativeIndicatorProcess = spawn(indicatorBin, [], { stdio: ['pipe', 'pipe', 'pipe'] });
    nativeIndicatorProcess.stdin.on('error', (err) => {
      console.error('Indicator stdin error:', err.message);
      nativeIndicatorProcess = null;
    });
    nativeIndicatorProcess.stdout.on('data', (d) => {
      const msg = d.toString().trim();
      if (msg === 'indicator_ready') console.log('Native indicator ready');
    });
    nativeIndicatorProcess.stderr.on('data', (d) => console.error('indicator:', d.toString().trim()));
    nativeIndicatorProcess.on('close', () => { nativeIndicatorProcess = null; });
    return true;
  } catch {
    return false;
  }
}

function sendNativeIndicatorCmd(cmd) {
  if (nativeIndicatorProcess && nativeIndicatorProcess.stdin.writable) {
    try {
      nativeIndicatorProcess.stdin.write(cmd + '\n');
    } catch (err) {
      console.error('Indicator write failed:', err.message);
      nativeIndicatorProcess = null;
    }
  }
}

const showIndicator = () => {
  if (platform.features.nativeIndicator && startNativeIndicatorProcess()) {
    setTimeout(() => sendNativeIndicatorCmd('show #6366F1'), nativeIndicatorProcess ? 0 : 500);
  } else {
    crossPlatformIndicator.show('#6366F1');
  }
};

const hideIndicator = () => {
  if (nativeIndicatorProcess) {
    sendNativeIndicatorCmd('hide');
  }
  crossPlatformIndicator.hide();
};

const setIndicatorProcessing = () => {
  if (nativeIndicatorProcess) {
    sendNativeIndicatorCmd('color #14B8A6');
  }
  crossPlatformIndicator.setColor('#14B8A6');
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
  // Use @2x version for retina on macOS, with full color (not template)
  const trayIcon2xPath = trayIconPath.replace('tray-icon.png', 'tray-icon@2x.png');
  const iconPath = (platform.isMac && require('fs').existsSync(trayIcon2xPath))
    ? trayIcon2xPath
    : trayIconPath;
  if (require('fs').existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
    icon = icon.resize({ width: platform.trayIconSize, height: platform.trayIconSize });
  } else {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);
  tray.setToolTip(platform.isMac ? 'Verby — Hold Fn to record' : 'Verby — Hold CapsLock to record');

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
  if (!platform.features.frontmostAppDetect) return; // TODO: Windows implementation in Phase 1

  exec(`osascript -e 'tell application "System Events" to get {name, title of first window} of first application process whose frontmost is true' 2>/dev/null`, (err, stdout) => {
    if (err || !stdout) return;
    const raw = stdout.trim();
    if (raw === lastDetectedApp) return;
    lastDetectedApp = raw;

    const parts = raw.split(', ');
    const appName = parts[0] || '';
    const windowTitle = parts.slice(1).join(', ') || '';

    console.log(`>>> Auto-context: ${appName} — ${windowTitle}`);

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auto-context', { appName, windowTitle });
    }
    const { setAutoContext } = require('./ipc-handlers.cjs');
    setAutoContext({ appName, windowTitle });
  });
}

// === Fn Key Capture (macOS only) ===
// fn-capture needs Input Monitoring permission on macOS.
// On Windows, global shortcuts are handled via Electron's globalShortcut API
// and a configurable hotkey (Phase 1).

const fs = require('fs');
const { exec, execSync } = require('child_process');

// macOS-specific constants — only used when platform.features.fnKeyCapture is true
const FN_PIPE_PATH = platform.isMac ? '/tmp/verbyprompt-fn-events' : null;
const AGENT_LABEL = 'com.verby.fn-capture';
const AGENT_PLIST = platform.isMac
  ? path.join(app.getPath('home'), 'Library', 'LaunchAgents', `${AGENT_LABEL}.plist`)
  : null;

function getFnBinaryPath() {
  return isDev
    ? path.join(__dirname, '..', '..', 'native', 'fn-capture')
    : path.join(process.resourcesPath, 'native', 'fn-capture');
}

function startFnCapture() {
  // Windows: use uiohook-napi based hold-to-talk
  if (platform.isWindows) {
    try {
      const windowsHotkey = require('./platform/hotkey-windows');
      windowsHotkey.start((event) => {
        // Route events the same way as the macOS pipe handler
        if (event === 'fn_down') {
          console.log('>>> Hold-to-talk DOWN detected');
          showIndicator();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('fn-down');
          }
        } else if (event === 'fn_up') {
          console.log('>>> Hold-to-talk UP detected');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('fn-up');
          }
        } else if (event === 'ctrl_down') {
          console.log('>>> Raw dictation DOWN detected');
          showIndicator();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ctrl-down');
          }
        } else if (event === 'ctrl_up') {
          console.log('>>> Raw dictation UP detected');
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('ctrl-up');
          }
        } else if (event === 'fn_ready') {
          console.log('Windows hotkey capture ready');
        }
      });
    } catch (err) {
      console.error('Windows hotkey failed:', err.message);
    }
    return;
  }

  if (!platform.features.fnKeyCapture) {
    console.log('Fn key capture not available on this platform');
    return;
  }

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
            setTimeout(() => {
              if (!fnEventReceived && !app.isQuitting) {
                console.log('No Fn events detected — prompting user for permissions');
                const { Notification, shell } = require('electron');
                const settingsUrl = platform.settingsUrls.inputMonitoring;
                if (Notification.isSupported()) {
                  const notif = new Notification({
                    title: 'Verby — Fn Key Setup',
                    body: 'Hold Fn to dictate. If it\'s not working, click here to grant Input Monitoring permission.',
                  });
                  if (settingsUrl) {
                    notif.on('click', () => shell.openExternal(settingsUrl));
                  }
                  notif.show();
                }
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.webContents.send('fn-permission-needed');
                }
              }
            }, 15000);
          } else if (event === 'fn_requesting_permission') {
            console.log('Fn key: requesting Input Monitoring permission...');
            const { Notification, shell } = require('electron');
            const settingsUrl = platform.settingsUrls.inputMonitoring;
            if (Notification.isSupported()) {
              const notif = new Notification({
                title: 'Verby — Grant Permission',
                body: 'Verby needs Input Monitoring to detect the Fn key. Click to open Settings.',
              });
              if (settingsUrl) {
                notif.on('click', () => shell.openExternal(settingsUrl));
              }
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

// === IPC: expose platform info to renderer ===
ipcMain.handle('get-platform', () => platform.forRenderer());

// === Debug: forward renderer logs ===
ipcMain.on('renderer-log', (_event, msg) => {
  console.log('[renderer]', msg);
});

// === App Lifecycle ===
app.whenReady().then(() => {
  const { registerHandlers } = require('./ipc-handlers.cjs');

  // Build platform-appropriate app menu
  const appMenuTemplate = [];

  if (platform.isMac) {
    // macOS: first menu item replaces "Electron" with "Verby" in top-left
    appMenuTemplate.push({
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
    });
  } else {
    // Windows / Linux: simpler File menu
    appMenuTemplate.push({
      label: 'File',
      submenu: [
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.show();
            mainWindow.focus();
            mainWindow.webContents.send('open-settings');
          }
        }},
        { type: 'separator' },
        { label: 'Quit Verby', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } },
      ],
    });
  }

  appMenuTemplate.push(
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
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(appMenuTemplate));

  // Set dock icon (macOS only)
  if (app.dock) {
    const iconPng = isDev
      ? path.join(__dirname, '..', '..', 'assets', 'icon-512.png')
      : path.join(process.resourcesPath, 'icon-512.png');
    const iconIcns = isDev
      ? path.join(__dirname, '..', '..', 'assets', 'icon.icns')
      : path.join(process.resourcesPath, 'icon.icns');
    const iconFile = require('fs').existsSync(iconPng) ? iconPng : iconIcns;
    const icon = nativeImage.createFromPath(iconFile);
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
      console.log('Dock icon set from:', iconFile);
    } else {
      console.log('Dock icon failed to load from:', iconFile);
    }

    // Show in dock by default so users can always find the app.
    // Power users can hide via Settings.
    const { getSetting: getSettingValue } = require('./ipc-handlers.cjs');
    const showInDock = getSettingValue('showInDock', true);
    if (!showInDock) {
      app.dock.hide();
      console.log('Dock hidden — menu-bar only mode');
    } else {
      console.log('Dock visible');
    }
  }

  // Apply launch-at-login setting (only works in packaged app, not dev mode)
  const { getSetting: getSettingForLogin } = require('./ipc-handlers.cjs');
  const launchAtLogin = getSettingForLogin('launchAtLogin', false);
  try {
    app.setLoginItemSettings({ openAtLogin: launchAtLogin });
    console.log('Launch at login:', launchAtLogin);
  } catch (err) {
    console.log('Login item not available in dev mode');
  }

  // Register custom protocol for auth callbacks
  app.setAsDefaultProtocolClient('verbyprompt');

  createWindow();
  registerHandlers(mainWindow);
  initAuth(mainWindow);
  createTray();
  startFnCapture();

  // === Permission check IPC (platform-aware) ===
  ipcMain.handle('check-permissions', async () => {
    if (platform.isMac) {
      const mic = systemPreferences.getMediaAccessStatus('microphone');
      const accessibility = systemPreferences.isTrustedAccessibilityClient(false);
      return {
        microphone: mic === 'granted',
        accessibility,
      };
    }
    // Windows: check actual mic permission status via Electron API.
    // No Accessibility or Input Monitoring equivalents on Windows.
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    return {
      microphone: micStatus === 'granted',
      accessibility: true,
    };
  });

  ipcMain.handle('request-microphone', async () => {
    if (platform.isMac) {
      return await systemPreferences.askForMediaAccess('microphone');
    }
    // Windows: OS prompts automatically; return true
    return true;
  });

  ipcMain.handle('open-system-prefs', async (_event, section) => {
    const { shell } = require('electron');
    // Map legacy macOS section names to platform.settingsUrls keys
    const sectionToKey = {
      'Privacy_Microphone': 'microphone',
      'Privacy_Accessibility': 'accessibility',
      'Privacy_ListenEvent': 'inputMonitoring',
    };
    const key = sectionToKey[section] || section;
    const url = platform.settingsUrls[key];
    if (url) {
      shell.openExternal(url);
    } else if (platform.isMac) {
      // Fallback: open the macOS section directly
      shell.openExternal(`x-apple.systempreferences:com.apple.preference.security?${section}`);
    }
  });


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

  // Cmd+Shift+Space (macOS) / Ctrl+Shift+Space (Windows) = fallback dictation toggle
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
  stopAutoUpdater();
  globalShortcut.unregisterAll();

  // Clean up platform-specific resources
  if (platform.isMac) {
    try { execSync(`launchctl stop ${AGENT_LABEL} 2>/dev/null`); } catch {}
    try { execSync(`launchctl unload "${AGENT_PLIST}" 2>/dev/null`); } catch {}
    try { execSync('pkill -f "fn-capture" 2>/dev/null'); } catch {}
    if (FN_PIPE_PATH) {
      try { fs.unlinkSync(FN_PIPE_PATH); } catch {}
    }
  } else if (platform.isWindows) {
    try {
      const windowsHotkey = require('./platform/hotkey-windows');
      windowsHotkey.stop();
    } catch {}
  }

  if (nativeIndicatorProcess) { nativeIndicatorProcess.kill(); nativeIndicatorProcess = null; }
  crossPlatformIndicator.destroy();
  if (fnProcess) { fnProcess.kill(); fnProcess = null; }
});

app.on('window-all-closed', () => {
  if (!platform.isMac) app.quit();
});

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) createWindow();
  else mainWindow.show();
});

// Handle deep link for auth callback (verbyprompt://auth-callback#...)
// macOS: fires 'open-url' event
app.on('open-url', (event, url) => {
  event.preventDefault();
  if (url.startsWith('verbyprompt://auth-callback')) {
    handleAuthCallback(url);
  }
});

// Windows: deep links arrive via second-instance (protocol URL is in argv)
app.on('second-instance', (_event, argv) => {
  // Find the deep link URL in argv
  const deepLink = argv.find((arg) => arg.startsWith('verbyprompt://'));
  if (deepLink && deepLink.startsWith('verbyprompt://auth-callback')) {
    handleAuthCallback(deepLink);
  }
  // Focus the existing window
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});
