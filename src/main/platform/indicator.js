/**
 * Cross-platform recording indicator using an Electron BrowserWindow.
 *
 * Renders a small transparent, always-on-top, non-focusable window
 * with a pulsing dot. Replaces the native Swift indicator on macOS
 * and provides the same functionality on Windows/Linux.
 *
 * Commands: show(color), hide(), setColor(color)
 */

const { BrowserWindow, screen } = require('electron');

let indicatorWindow = null;
let currentColor = '#6366F1';

const INDICATOR_HTML = `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body {
    background: transparent;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    -webkit-app-region: no-drag;
  }
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--color, #6366F1);
    box-shadow: 0 0 12px 4px var(--color, #6366F1);
    animation: pulse 1.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.3); opacity: 1; }
  }
</style>
</head>
<body>
  <div class="dot" id="dot"></div>
  <script>
    const { ipcRenderer } = require('electron');
    ipcRenderer.on('set-color', (_, color) => {
      document.getElementById('dot').style.setProperty('--color', color);
    });
  </script>
</body>
</html>`;

function createIndicatorWindow() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  indicatorWindow = new BrowserWindow({
    width: 40,
    height: 40,
    x: Math.round(width / 2 - 20),
    y: 8,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    hasShadow: false,
    roundedCorners: false,
    type: 'panel', // macOS: doesn't steal focus; Windows: treated as toolbox window
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
    },
    show: false,
  });

  // Prevent the indicator from intercepting mouse events
  indicatorWindow.setIgnoreMouseEvents(true);

  // Load inline HTML
  indicatorWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(INDICATOR_HTML)}`);

  indicatorWindow.on('closed', () => {
    indicatorWindow = null;
  });
}

function show(color) {
  currentColor = color || '#6366F1';
  createIndicatorWindow();
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.webContents.send('set-color', currentColor);
    indicatorWindow.showInactive();
  }
}

function hide() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.hide();
  }
}

function setColor(color) {
  currentColor = color || '#6366F1';
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.webContents.send('set-color', currentColor);
  }
}

function destroy() {
  if (indicatorWindow && !indicatorWindow.isDestroyed()) {
    indicatorWindow.destroy();
    indicatorWindow = null;
  }
}

module.exports = { show, hide, setColor, destroy };
