# Windows Deployment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve remaining security, correctness, and UX gaps to make VerbyPrompt ready for commercial Windows distribution.

**Architecture:** Most Windows infrastructure is already built (platform abstraction, hotkey capture, text injection, indicator, CI/CD, NSIS installer). This plan addresses 4 targeted fixes: security (hardcoded token), data safety (uninstall behavior), permissions (microphone check), and tray UX (tooltip).

**Tech Stack:** Electron 33, electron-builder, electron-updater, uiohook-napi, @nut-tree-fork/nut-js, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-03-23-windows-deployment-design.md`

**Already verified as complete (no implementation needed):**
- Platform abstraction: `src/main/platform/index.js` (feature flags, window chrome, path helpers)
- Windows hotkey capture: `src/main/platform/hotkey-windows.js` (uiohook-napi, CapsLock + RightCtrl)
- Cross-platform indicator: `src/main/platform/indicator.js` (Electron BrowserWindow)
- Cross-platform text injection: `@nut-tree-fork/nut-js` in `ipc-handlers.cjs:598-660`
- Deep link `second-instance` handler: `src/main/index.js:657-669` (already handles `verbyprompt://auth-callback`)
- Platform-aware onboarding: `src/renderer/components/Onboarding.jsx:19-80` (conditionally adds macOS permission steps, shows Windows hotkeys)
- Platform-aware settings shortcuts: `src/renderer/components/SettingsPanel.jsx:367-386` (CapsLock/RightCtrl on Windows)
- NSIS installer config: `package.json:100-121`
- CI/CD with Windows build: `.github/workflows/build.yml:41-74`

---

### Task 1: Remove Hardcoded GitHub PAT from Auto-Updater

**Files:**
- Modify: `src/main/auto-updater.js:7`

- [ ] **Step 1: Replace hardcoded token with environment variable**

In `src/main/auto-updater.js`, replace line 7:

```js
// BEFORE
const GH_READ_TOKEN = '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';

// AFTER
const GH_READ_TOKEN = process.env.GH_UPDATE_TOKEN || '';
```

- [ ] **Step 2: Update the guard clause to check for empty string**

Line 19 currently checks for `'PLACEHOLDER_TOKEN'`. Update to also handle empty:

```js
// BEFORE
if (GH_READ_TOKEN === 'PLACEHOLDER_TOKEN') {

// AFTER
if (!GH_READ_TOKEN) {
```

- [ ] **Step 3: Add GH_UPDATE_TOKEN to .env.example (if it exists) or document in comments**

Add a comment above the token line:

```js
// Set GH_UPDATE_TOKEN env var for auto-update auth.
// In CI: GitHub Actions secret. In dev: add to .env file.
// If empty, auto-update uses unauthenticated requests (public releases only).
const GH_READ_TOKEN = process.env.GH_UPDATE_TOKEN || '';
```

- [ ] **Step 4: Verify the app still starts in dev mode**

Run: `cd /Users/lotsofsocks/development/verbyprompt && npm start`
Expected: App launches. Auto-updater is only initialized in packaged builds (`!isDev` check at `index.js:74`), so in dev mode no updater log is expected. Verify no startup errors in console or log file at `platform.getLogPath()` (typically `/tmp/verbyprompt-app.log`).

- [ ] **Step 5: Commit**

```bash
git add src/main/auto-updater.js
git commit -m "fix: remove hardcoded GitHub PAT from auto-updater

Token now read from GH_UPDATE_TOKEN env var. Must be set as
GitHub Actions secret for CI builds. Empty token disables
auto-update gracefully."
```

---

### Task 2: Fix NSIS Uninstall Data Deletion

**Files:**
- Modify: `package.json:119`

- [ ] **Step 1: Set deleteAppDataOnUninstall to false**

In `package.json`, inside the `"nsis"` block, change line 119:

```json
// BEFORE
"deleteAppDataOnUninstall": true,

// AFTER
"deleteAppDataOnUninstall": false,
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "fix: preserve user data on Windows uninstall

Setting deleteAppDataOnUninstall to false prevents silent deletion
of SQLite history, settings, and auth tokens in %APPDATA%."
```

---

### Task 3: Fix Windows Microphone Permission Check

**Files:**
- Modify: `src/main/index.js:552-557`

- [ ] **Step 1: Replace hardcoded true with actual check**

Note: `systemPreferences` is already imported at `index.js:19` via `const { ..., systemPreferences } = require('electron')`.

In `src/main/index.js`, replace the Windows branch of the `check-permissions` handler (lines 552-557):

```js
// BEFORE
    // Windows: microphone permission is handled by the OS automatically on first access.
    // No Accessibility or Input Monitoring equivalents.
    return {
      microphone: true,  // Windows grants via OS prompt on first use
      accessibility: true,
    };

// AFTER
    // Windows: check actual mic permission status via Electron API.
    // No Accessibility or Input Monitoring equivalents on Windows.
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    return {
      microphone: micStatus === 'granted',
      accessibility: true,
    };
```

- [ ] **Step 2: Commit**

```bash
git add src/main/index.js
git commit -m "fix: check actual microphone permission on Windows

Use systemPreferences.getMediaAccessStatus instead of returning
hardcoded true. Ensures onboarding correctly shows mic step."
```

---

### Task 4: Add Platform-Aware Tray Tooltip

**Files:**
- Modify: `src/main/index.js:170`

- [ ] **Step 1: Update tray tooltip to show platform-correct hotkey**

In `src/main/index.js`, replace line 170:

```js
// BEFORE
  tray.setToolTip('Verby');

// AFTER
  tray.setToolTip(platform.isMac ? 'Verby — Hold Fn to record' : 'Verby — Hold CapsLock to record');
```

- [ ] **Step 2: Commit**

```bash
git add src/main/index.js
git commit -m "feat: show platform-specific hotkey in tray tooltip"
```

---

### Task 5: Configure Electron Fuses for Production Security

**Files:**
- Create: `scripts/afterPack.js`
- Modify: `package.json` (add afterPack hook)

- [ ] **Step 1: Install @electron/fuses**

```bash
cd /Users/lotsofsocks/development/verbyprompt && npm install --save-dev @electron/fuses
```

- [ ] **Step 2: Create afterPack script**

Create `scripts/afterPack.js`:

```js
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');
const path = require('path');

module.exports = async function afterPack(context) {
  const ext = { darwin: '.app', win32: '.exe', linux: '' }[context.electronPlatformName] || '';
  const executableName = context.packager.appInfo.productFilename + ext;
  const electronBinaryPath = path.join(context.appOutDir, executableName);

  await flipFuses(electronBinaryPath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  });

  console.log(`Electron fuses flipped for: ${electronBinaryPath}`);
};
```

- [ ] **Step 3: Add afterPack hook to package.json build config**

In `package.json`, inside the `"build"` block (after `"asar": true`), add:

```json
"afterPack": "./scripts/afterPack.js"
```

- [ ] **Step 4: Commit**

```bash
git add scripts/afterPack.js package.json
git commit -m "feat: configure Electron Fuses for production security

Disables RunAsNode, CLI inspect, and NODE_OPTIONS environment
variable to prevent trivial RCE in distributed builds."
```

---

### Task 6: Verify Windows Build in CI (Post-Implementation)

- [ ] **Step 1: Check recent CI run status**

```bash
cd /Users/lotsofsocks/development/verbyprompt && gh run list --limit 5
```

Verify the `build-windows` job passes. If there are failures, investigate the logs:

```bash
gh run view <run-id> --log-failed
```

- [ ] **Step 2: Test local Windows build (if on Windows, otherwise skip)**

```bash
npm run build:win
```

Expected: Produces `out/VerbyPrompt Setup *.exe`

---

### Task 7: Update Design Spec Status

**Files:**
- Modify: `docs/superpowers/specs/2026-03-23-windows-deployment-design.md`

- [ ] **Step 1: Update the spec to reflect completed Phase 1 and 2 items**

At the top of the spec, change `**Status:** Approved` to `**Status:** Phase 1-2 Complete`. Add a completion log section after the overview:

```markdown
## Completion Log

### Phase 1 (Security & Correctness) — Complete
- [x] Hardcoded GitHub PAT removed from auto-updater.js (→ GH_UPDATE_TOKEN env var)
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-03-23-windows-deployment-design.md
git commit -m "docs: update Windows deployment spec with Phase 1-2 completion status"
```
