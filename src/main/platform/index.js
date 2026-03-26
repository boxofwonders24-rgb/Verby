/**
 * Platform abstraction layer for Verby.
 *
 * Centralises every OS-specific branch so the rest of the codebase
 * can call `platform.isMac`, `platform.keyLabel('Cmd')`, etc.
 * without littering `process.platform` checks everywhere.
 */

const os = require('os');
const path = require('path');
const { app } = require('electron');

// ── Platform booleans ────────────────────────────────────────────
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';

// ── Modifier key labels (for UI display) ─────────────────────────
const modifiers = isMac
  ? { mod: '⌘', alt: '⌥', ctrl: '⌃', shift: '⇧' }
  : { mod: 'Ctrl', alt: 'Alt', ctrl: 'Ctrl', shift: 'Shift' };

/**
 * Translate a macOS-style shortcut label to a platform-appropriate one.
 *   keyLabel('Cmd+Shift+Space')  →  'Ctrl+Shift+Space' on Windows
 *   keyLabel('Cmd+V')            →  'Ctrl+V'            on Windows
 */
function keyLabel(macLabel) {
  if (isMac) return macLabel;
  return macLabel
    .replace(/Cmd/g, 'Ctrl')
    .replace(/⌘/g, 'Ctrl')
    .replace(/⌥/g, 'Alt')
    .replace(/⇧/g, 'Shift');
}

// ── Paths ────────────────────────────────────────────────────────
function getTempDir() {
  return app.isReady ? app.getPath('temp') : os.tmpdir();
}

function getLogPath() {
  return path.join(getTempDir(), 'verbyprompt-app.log');
}

// ── BrowserWindow defaults ───────────────────────────────────────
/**
 * Returns platform-appropriate BrowserWindow constructor options
 * for the main window chrome / title bar.
 */
function getWindowChrome() {
  if (isMac) {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 16, y: 14 },
    };
  }
  // Windows / Linux: custom title bar overlay
  return {
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#050508',
      symbolColor: '#e5e5e5',
      height: 36,
    },
  };
}

// ── System settings deep links ───────────────────────────────────
const settingsUrls = {
  microphone: isMac
    ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
    : 'ms-settings:privacy-microphone',
  accessibility: isMac
    ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility'
    : null, // No equivalent on Windows
  inputMonitoring: isMac
    ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'
    : null, // No equivalent on Windows
};

// ── Tray icon sizing ─────────────────────────────────────────────
const trayIconSize = isMac ? 22 : 16;

// ── Process cleanup helpers ──────────────────────────────────────
/**
 * Kill a process by image name, cross-platform.
 * Returns a shell command string. Errors are silenced.
 */
function killCommand(processName) {
  if (isWindows) {
    return `taskkill /F /IM "${processName}.exe" 2>NUL`;
  }
  return `pkill -f "${processName}" 2>/dev/null`;
}

/**
 * Null device for silencing stderr in shell commands.
 */
const devNull = isWindows ? 'NUL' : '/dev/null';

// ── Feature flags ────────────────────────────────────────────────
// These indicate which native features are available on the current OS.
const features = {
  /** Native Fn-key capture via Swift binary */
  fnKeyCapture: isMac,
  /** Native text injection via Swift binary */
  nativeTextInject: isMac,
  /** Native floating indicator via Swift NSWindow (macOS only; Electron fallback on all platforms) */
  nativeIndicator: isMac,
  /** AppleScript automation */
  appleScript: isMac,
  /** macOS dock API */
  dock: isMac,
  /** macOS Accessibility trust check */
  accessibilityCheck: isMac,
  /** Frontmost app detection via osascript */
  frontmostAppDetect: isMac, // Windows stub TODO (Phase 1)
};

// ── Serialisable subset for the renderer ─────────────────────────
/**
 * Returns a plain object safe to send via IPC / contextBridge.
 * No functions, no Node modules.
 */
function forRenderer() {
  return {
    isMac,
    isWindows,
    isLinux,
    modifiers,
    features: { ...features },
    settingsUrls: { ...settingsUrls },
  };
}

module.exports = {
  isMac,
  isWindows,
  isLinux,
  modifiers,
  keyLabel,
  getTempDir,
  getLogPath,
  getWindowChrome,
  settingsUrls,
  trayIconSize,
  killCommand,
  devNull,
  features,
  forRenderer,
};
