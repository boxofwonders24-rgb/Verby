# Windows Deployment Design Spec

**Date:** 2026-03-23
**Status:** Phase 1-2 Complete
**Approach:** Finalize Existing Platform Abstraction + Resolve Gaps

## Completion Log

### Phase 1 (Security & Correctness) — Complete
- [x] Hardcoded GitHub PAT removed from auto-updater.js (-> GH_UPDATE_TOKEN env var)
- [x] deleteAppDataOnUninstall set to false in package.json
- [x] second-instance deep link handler — already existed (index.js:657-669)
- [x] Microphone permission check — now uses systemPreferences.getMediaAccessStatus

### Phase 2 (Feature Completeness) — Partially Complete
- [x] Platform-aware onboarding — already existed (Onboarding.jsx:19-80)
- [x] Platform-aware keyboard shortcuts — already existed (SettingsPanel.jsx:367-386)
- [x] Tray tooltip — now shows platform-specific hotkey
- [ ] Frontmost app detection on Windows — deferred (spec Section 4a)
- [ ] CapsLock toggle suppression while Verby running — deferred

### Phase 3 (Distribution Readiness) — In Progress
- [x] Electron Fuses configured (scripts/afterPack.js)
- [ ] EV code signing certificate — not yet purchased
- [ ] AV vendor submissions — not yet submitted
- [ ] Enterprise deployment documentation — not yet written

---

## Overview

VerbyPrompt already has substantial Windows support infrastructure in place. This spec documents the **current state**, identifies **remaining gaps**, and provides a plan to reach **full Windows feature parity** for commercial distribution.

**Current state (already built):**
- Platform abstraction layer (`src/main/platform/index.js`) with feature flags, path helpers, window chrome
- Windows hotkey capture via `uiohook-napi` (`platform/hotkey-windows.js`) — CapsLock hold-to-talk, RightCtrl raw dictation
- Cross-platform recording indicator via Electron BrowserWindow (`platform/indicator.js`)
- Cross-platform text injection via `@nut-tree-fork/nut-js` (`ipc-handlers.cjs`)
- NSIS installer config in `package.json` (oneClick, x64, icon.ico)
- GitHub Actions CI with Windows build job (`.github/workflows/build.yml`)
- Build scripts: `build:win`, `release:win`

**Remaining gaps (this spec addresses):**
- Security: hardcoded GitHub PAT in `auto-updater.js`
- NSIS config: `deleteAppDataOnUninstall: true` destroys user data
- Microphone permission check returns hardcoded `true` on Windows
- No `second-instance` deep link handler for `verbyprompt://` protocol
- Frontmost app detection not implemented on Windows
- Onboarding not platform-aware
- No code signing certificate purchased
- No Electron Fuses configured for production security
- ARM64 Windows not addressed
- Antivirus false positive strategy incomplete

---

## 1. Current Architecture (Already Built)

### Platform Abstraction (`src/main/platform/`)

```
src/main/platform/
  index.js              # Platform booleans, modifier labels, keyLabel(), window chrome,
                        #   settings URLs, feature flags, forRenderer() serialization
  hotkey-windows.js     # uiohook-napi: CapsLock (AI mode) + RightCtrl (raw dictation)
  indicator.js          # Electron BrowserWindow: transparent, always-on-top, pulsing dot
```

**Feature flags in `platform/index.js`:**
```js
const features = {
  fnKeyCapture: isMac,           // Swift binary — macOS only
  nativeTextInject: isMac,       // Swift binary — macOS only
  nativeIndicator: isMac,        // Swift NSWindow — macOS only (Electron fallback on all)
  appleScript: isMac,            // osascript — macOS only
  dock: isMac,                   // app.dock — macOS only
  accessibilityCheck: isMac,     // isTrustedAccessibilityClient — macOS only
  frontmostAppDetect: isMac,     // TODO: Windows stub (Phase 1)
};
```

### Text Injection Chain (`ipc-handlers.cjs`)

Already cross-platform with correct fallback order:
1. `@nut-tree-fork/nut-js` — clipboard + simulated Ctrl+V/Cmd+V (all platforms)
2. AppleScript keystroke (macOS only)
3. Native Swift binary (macOS only)
4. Clipboard-only fallback (all platforms)

### Windows Hotkey (`hotkey-windows.js`)

- **Library:** `uiohook-napi` (Node native addon, global keyboard hook)
- **Primary key:** CapsLock (hold for AI-enhanced dictation)
- **Secondary key:** RightCtrl (hold for raw dictation)
- **Events:** Emits `fn_down`/`fn_up`/`ctrl_down`/`ctrl_up` — same protocol as macOS fn-capture
- **Configurable:** `configure({ holdToTalkKey, rawDictateKey })` with available keys: CapsLock, RightCtrl, LeftCtrl, F13, F14, F15, ScrollLock, Pause

### Build Configuration (`package.json`)

Already configured:
```json
"win": {
  "target": [{ "target": "nsis", "arch": ["x64"] }],
  "icon": "assets/icon.ico",
  "publisherName": "Syntrix",
  "signingHashAlgorithms": ["sha256"],
  "sign": "./scripts/sign-windows.js"
},
"nsis": {
  "oneClick": true,
  "perMachine": false,
  "deleteAppDataOnUninstall": true,
  "shortcutName": "Verby"
}
```

### CI/CD (`.github/workflows/build.yml`)

Already configured with:
- `build-mac` job (macos-latest)
- `build-windows` job (windows-latest) with signing secrets
- `release` job (ubuntu-latest) — creates draft GitHub Release with both platform artifacts
- Triggered on version tags (`v*`) and manual dispatch

---

## 2. Security Fixes (CRITICAL — Before First Windows Release)

### 2a. Remove Hardcoded GitHub PAT

**File:** `src/main/auto-updater.js:7`

The GitHub PAT (`github_pat_11B726MWY0...`) is hardcoded in source and ships inside the ASAR bundle. Anyone can extract it with `npx asar extract`. Windows distribution amplifies this risk because NSIS installers are routinely inspected by security researchers.

**Fix:** Inject the token at build time via environment variable.

```js
// BEFORE (line 7)
const GH_READ_TOKEN = 'github_pat_11B726MWY0UtXdaI3eiJTY_...';

// AFTER
const GH_READ_TOKEN = process.env.GH_UPDATE_TOKEN || '';
```

- CI: Set `GH_UPDATE_TOKEN` as a GitHub Actions secret, injected via `env:` in the build step
- Local dev: Add to `.env` (already gitignored)
- Fallback: If token is empty, auto-updater uses unauthenticated requests (works for public releases) or shows "download manually at verbyai.com"
- **Action required:** Revoke the current token on GitHub and generate a new one stored only in CI secrets

### 2b. Configure Electron Fuses

Disable dangerous Electron fuses in production builds to prevent RCE:

```js
// In electron-builder afterPack hook or via @electron/fuses
import { flipFuses, FuseVersion, FuseV1Options } from '@electron/fuses';

await flipFuses(pathToElectron, {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,              // Prevent ELECTRON_RUN_AS_NODE exploit
  [FuseV1Options.EnableNodeCliInspectArguments]: false,  // Prevent --inspect attach
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
});
```

This matters more on Windows where users commonly inspect installed app directories.

---

## 3. NSIS Installer Fixes (HIGH)

### 3a. Preserve User Data on Uninstall

**Current:** `deleteAppDataOnUninstall: true` silently deletes `%APPDATA%\VerbyPrompt\` (SQLite history, settings, auth tokens).

**Fix:**
```json
"nsis": {
  "oneClick": true,
  "perMachine": false,
  "deleteAppDataOnUninstall": false,
  "shortcutName": "Verby"
}
```

Users who want a clean uninstall can manually delete `%APPDATA%\VerbyPrompt\`. This is standard practice for commercial apps.

### 3b. Enterprise Silent Install

With `oneClick: true`, silent install uses `/S` flag only (no `/D` directory override). Document this:
- **Silent install:** `VerbyPrompt-Setup.exe /S`
- **Install location:** `%LOCALAPPDATA%\Programs\VerbyPrompt\` (default, not changeable with oneClick)
- **GPO deployment:** Compatible with Active Directory software deployment via silent mode

### 3c. Deep Link Protocol — Handle Second Instance

**Current gap:** `app.setAsDefaultProtocolClient('verbyprompt')` is called, but there's no `second-instance` handler to read the deep link URL from `argv` when the app is already running.

**Fix in `index.js`:**
```js
app.on('second-instance', (event, argv) => {
  // Windows passes the deep link URL as the last argv entry
  const url = argv.find(arg => arg.startsWith('verbyprompt://'));
  if (url) {
    handleAuthCallback(url);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});
```

---

## 4. Remaining Feature Gaps

### 4a. Frontmost App Detection (Windows)

**Current:** `features.frontmostAppDetect = isMac` (TODO stub).

macOS uses AppleScript. Windows equivalent options:
1. **PowerShell** (simplest): `(Get-Process | Where-Object {$_.MainWindowHandle -ne 0} | Sort-Object -Property CPU -Descending | Select-Object -First 1).MainWindowTitle`
2. **nut-js** (already a dependency): `@nut-tree-fork/nut-js` has `getActiveWindow()` which returns window title
3. **Node addon**: `active-win` npm package (lightweight, returns app name + title)

**Recommendation:** Use nut-js since it's already installed. Add to `platform/index.js`:
```js
features.frontmostAppDetect = true; // Enable for all platforms
```

And implement in `index.js` where `detectFrontmostApp()` is called:
```js
if (platform.isWindows) {
  const nut = require('@nut-tree-fork/nut-js');
  const win = await nut.getActiveWindow();
  return { appName: '', windowTitle: win.title };
}
```

### 4b. Windows Microphone Permission Check

**Current:** Returns hardcoded `{ microphone: true, accessibility: true }` on Windows.

**Fix:** Use Electron's `systemPreferences.getMediaAccessStatus('microphone')` (supported on Windows since Electron 25):
```js
if (platform.isWindows) {
  return {
    microphone: systemPreferences.getMediaAccessStatus('microphone') === 'granted',
    accessibility: true,  // No equivalent on Windows
  };
}
```

### 4c. Platform-Aware Onboarding

**Current:** `Onboarding.jsx` shows macOS permission steps regardless of platform.

**Fix:** Use `window.verby.isMac` / `window.verby.isWindows` (already exposed via `forRenderer()`) to show:
- **macOS:** Fn key permission → Accessibility → Microphone (3 steps)
- **Windows:** Microphone → Hotkey introduction ("Hold CapsLock to speak") (2 steps)

### 4d. Tray Tooltip

Update tray tooltip to show platform-correct hotkey:
- macOS: "Verby — Hold Fn to record"
- Windows: "Verby — Hold CapsLock to record"

Already have `platform.keyLabel()` for this.

---

## 5. Code Signing Strategy

### EV Certificate (Recommended for Commercial Distribution)

- **Eliminates SmartScreen warnings immediately** — no reputation building needed
- **Providers:** SSL.com (~$350/yr) or DigiCert (~$500/yr)
- **Storage:** HSM-backed (required for EV) — SSL.com offers cloud HSM compatible with CI
- **CI integration:** Already have `scripts/sign-windows.js` and signing secrets in `build.yml`:
  - `WIN_SIGN_MODE`, `WIN_SIGN_CERT_SHA1`
  - `SM_API_KEY`, `SM_CLIENT_CERT_FILE`, `SM_CLIENT_CERT_PASSWORD`, `SM_CERT_ALIAS`

### Alternative: OV Certificate

- Cheaper (~$100/yr) but SmartScreen warnings persist until download reputation builds
- Adequate for early beta releases while building user base

### Antivirus False Positive Mitigation

`uiohook-napi` uses a low-level keyboard hook (`SetWindowsHookEx(WH_KEYBOARD_LL)`) which some antivirus software flags as keylogger behavior.

**Mitigation strategy:**
1. EV code signing (primary — most AV vendors whitelist EV-signed binaries)
2. Submit to Microsoft Defender Intelligence portal for analysis and whitelisting
3. Submit to major AV vendors (Norton, McAfee, Bitdefender) via their false positive reporting forms
4. In-app documentation: if flagged, show instructions to add exception
5. Consider VirusTotal submission before each release to catch issues early

---

## 6. Testing Strategy

### Windows Version Matrix

| Windows Version | Priority | Method |
|---|---|---|
| Windows 11 (23H2+) | Primary | GitHub Actions runner + manual |
| Windows 10 (22H2) | Secondary | GitHub Actions runner |
| Windows 10 LTSC (enterprise) | Tertiary | Manual VM |

### Test Layers

#### A. Native Module Validation
- `uiohook-napi`: verify keyboard hook starts and emits events on Windows runner
- `@nut-tree-fork/nut-js`: verify clipboard + paste injection works
- `better-sqlite3`: verify database opens and writes on Windows

#### B. Electron Integration Tests (Playwright + Electron)
- Platform router returns correct `isWindows` flags
- IPC handlers process hotkey events from `uiohook-napi`
- Settings persistence in `%APPDATA%\VerbyPrompt\`
- Auto-updater detects Windows NSIS updates
- Deep link `verbyprompt://` protocol triggers auth callback
- `second-instance` handler activates existing window

#### C. Installer Tests (NSIS)
- Clean install, upgrade from previous version, uninstall
- Start Menu shortcut created
- App data preserved after uninstall (once fix applied)
- Launch-at-login toggle creates/removes Run registry key

#### D. Manual Testing
- SmartScreen behavior (with and without code signing)
- Common antivirus: keyboard hook false positive detection
- High-DPI (150%, 200%) indicator positioning
- Multi-monitor indicator placement
- Windows Narrator screen reader compatibility
- CapsLock suppression (Verby should suppress the toggle while running)

### CI/CD (Already Configured)

`.github/workflows/build.yml` already handles:
- macOS build → Windows build → Release (uploads both)
- Windows signing secrets configured
- Triggered on version tags and manual dispatch

**Additions needed:**
- Add a smoke test step after Windows build: launch Electron, verify main window opens, exit
- Add `electron-rebuild` explicitly for `uiohook-napi` and `nut-js` if prebuilt binaries aren't available

---

## 7. Documentation & User Onboarding

### In-App Changes

- Platform-aware onboarding flow (Section 4c above)
- Keyboard shortcuts display CapsLock/RightCtrl on Windows (use `platform.keyLabel()`)
- Settings panel: Windows hotkey customization (already have `availableKeys` from `hotkey-windows.js`)
- Tray tooltip: platform-correct hotkey hint

### Website Download Page

- Platform detection via `navigator.userAgentData.platform` (fallback: `navigator.userAgent` string parsing)
- Show Windows or macOS download button based on detected platform
- Both downloads always visible below the fold
- System requirements: Windows 10+ (64-bit), microphone

### Enterprise Documentation

- **Silent install:** `VerbyPrompt-Setup.exe /S`
- **Pre-configured settings:** Place `settings.json` in `%APPDATA%\VerbyPrompt\` before first launch
- **Proxy configuration:** Set `HTTPS_PROXY` environment variable for API calls behind corporate firewalls
- **Antivirus:** Instructions for adding `uiohook-napi` exception if keyboard hook is flagged
- **GPO deployment:** NSIS silent mode compatible with Active Directory

---

## 8. Roadblocks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Hardcoded GitHub PAT in auto-updater | Security vulnerability | Move to env var, revoke current token (Section 2a) |
| `deleteAppDataOnUninstall: true` | User data loss on uninstall | Set to `false` (Section 3a) |
| Antivirus flags `uiohook-napi` hook | Users can't use hotkey | EV code signing + AV vendor submissions (Section 5) |
| SmartScreen blocks unsigned installer | Users abandon install | Purchase EV certificate before release (Section 5) |
| No Fn key on Windows | Different UX | CapsLock is intuitive, already configurable in Settings |
| Enterprise GPO blocks keyboard hooks | Hotkey doesn't work | Detect error, fall back to global shortcut (Alt+Space already registered) |
| ARM64 Windows (Surface Pro X, Snapdragon) | Native addons may not work under x64 emulation | Not a launch blocker; monitor ARM64 support in `uiohook-napi` and `nut-js` |
| `second-instance` deep link dropped | OAuth callback fails when app already running | Add handler (Section 3c) |
| Microphone permission falsely reports `true` | Onboarding skips mic step | Use `systemPreferences.getMediaAccessStatus` (Section 4b) |

---

## 9. Implementation Priority

### Phase 1: Security & Correctness (Before Any Windows Release)
1. Remove hardcoded GitHub PAT from `auto-updater.js`
2. Set `deleteAppDataOnUninstall: false` in `package.json`
3. Add `second-instance` deep link handler
4. Fix microphone permission check on Windows

### Phase 2: Feature Completeness
5. Implement Windows frontmost app detection (via nut-js)
6. Platform-aware onboarding flow
7. Platform-aware keyboard shortcut display throughout UI
8. CapsLock toggle suppression while Verby is running

### Phase 3: Distribution Readiness
9. Purchase and configure EV code signing certificate
10. Submit to AV vendors for whitelisting
11. Configure Electron Fuses for production
12. Add smoke test to CI Windows build
13. Website platform-detection download page
14. Enterprise deployment documentation

---

## Files Summary

### Files Requiring Changes
- `src/main/auto-updater.js` — remove hardcoded token
- `package.json` — fix `deleteAppDataOnUninstall`, verify `electron-rebuild` covers all native modules
- `src/main/index.js` — add `second-instance` handler, Windows frontmost app detection
- `src/main/platform/index.js` — enable `frontmostAppDetect` for Windows, fix microphone check
- `src/renderer/components/Onboarding.jsx` — platform-aware flow
- `src/renderer/hooks/useDictation.js` — platform-aware hotkey labels
- `src/renderer/components/SettingsPanel.jsx` — Windows hotkey display

### Files Already Complete (No Changes Needed)
- `src/main/platform/hotkey-windows.js` — Windows hotkey capture
- `src/main/platform/indicator.js` — cross-platform indicator
- `src/main/ipc-handlers.cjs` — cross-platform text injection via nut-js
- `.github/workflows/build.yml` — CI with Windows build
- `src/main/preload.js` — platform-agnostic bridge

### New Files Needed
- `scripts/afterPack.js` — Electron Fuses configuration
- Enterprise deployment guide (docs or website page)
