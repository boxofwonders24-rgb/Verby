const { contextBridge, ipcRenderer } = require('electron');

// Platform info — synchronous for immediate access in components.
// Populated once via IPC, cached in a closure.
let _platformCache = null;

contextBridge.exposeInMainWorld('verby', {
  // Platform detection (async, cached after first call)
  getPlatform: async () => {
    if (!_platformCache) {
      _platformCache = await ipcRenderer.invoke('get-platform');
    }
    return _platformCache;
  },

  // Recording
  onToggleRecording: (callback) => {
    ipcRenderer.on('toggle-recording', () => callback());
    return () => ipcRenderer.removeAllListeners('toggle-recording');
  },
  sendAudio: (audioData) => ipcRenderer.invoke('send-audio', audioData),

  // Prompt processing
  optimizePrompt: (text, mode) => ipcRenderer.invoke('optimize-prompt', text, mode),
  sendToLLM: (prompt, provider) => ipcRenderer.invoke('send-to-llm', prompt, provider),

  // History
  getHistory: (filter) => ipcRenderer.invoke('get-history', filter),
  savePrompt: (prompt) => ipcRenderer.invoke('save-prompt', prompt),
  toggleFavorite: (id) => ipcRenderer.invoke('toggle-favorite', id),
  deletePrompt: (id) => ipcRenderer.invoke('delete-prompt', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),

  // Utilities
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  hideWindow: () => ipcRenderer.invoke('hide-window'),

  // Dictation — system-wide text injection
  injectText: (text, options) => ipcRenderer.invoke('inject-text', text, options),
  onToggleDictation: (callback) => {
    ipcRenderer.on('toggle-dictation', () => callback());
    return () => ipcRenderer.removeAllListeners('toggle-dictation');
  },

  // Fn key hold-to-talk events
  onFnDown: (callback) => {
    ipcRenderer.on('fn-down', () => callback());
    return () => ipcRenderer.removeAllListeners('fn-down');
  },
  onFnUp: (callback) => {
    ipcRenderer.on('fn-up', () => callback());
    return () => ipcRenderer.removeAllListeners('fn-up');
  },

  // Ctrl key hold-to-dictate (raw, no AI)
  onCtrlDown: (callback) => {
    ipcRenderer.on('ctrl-down', () => callback());
    return () => ipcRenderer.removeAllListeners('ctrl-down');
  },
  onCtrlUp: (callback) => {
    ipcRenderer.on('ctrl-up', () => callback());
    return () => ipcRenderer.removeAllListeners('ctrl-up');
  },

  // Indicator control
  showProcessing: () => ipcRenderer.send('indicator-processing'),
  hideIndicator: () => ipcRenderer.send('indicator-hide'),

  // Usage + licensing
  getUsage: () => ipcRenderer.invoke('get-usage'),
  activateLicense: (email) => ipcRenderer.invoke('activate-license', email),
  getUpgradeUrl: () => ipcRenderer.invoke('get-upgrade-url'),

  // Chat — type-to-prompt
  chatOptimize: (text) => ipcRenderer.invoke('chat-optimize', text),

  // Context — project awareness
  setContext: (name, desc) => ipcRenderer.invoke('set-context', name, desc),
  getContext: () => ipcRenderer.invoke('get-context'),
  getAllContexts: () => ipcRenderer.invoke('get-all-contexts'),

  // Patterns — learned usage
  getPatterns: () => ipcRenderer.invoke('get-patterns'),

  // Auto-detected app context
  onAutoContext: (callback) => {
    ipcRenderer.on('auto-context', (_e, data) => callback(data));
    return () => ipcRenderer.removeAllListeners('auto-context');
  },

  // Settings navigation from tray
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', () => callback());
    return () => ipcRenderer.removeAllListeners('open-settings');
  },

  // Debug logging
  log: (msg) => ipcRenderer.send('renderer-log', msg),

  // Intent-aware generation (email or prompt)
  generateSmart: (text) => ipcRenderer.invoke('generate-smart', text),

  // Light speech cleanup (Ctrl path)
  cleanupSpeech: (text) => ipcRenderer.invoke('cleanup-speech', text),

  // Auto-updates (use removeListener with specific handler to avoid wiping other listeners)
  onUpdateAvailable: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateProgress: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on('update-progress', handler);
    return () => ipcRenderer.removeListener('update-progress', handler);
  },
  onUpdateDownloaded: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on('update-downloaded', handler);
    return () => ipcRenderer.removeListener('update-downloaded', handler);
  },
  onUpdateError: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('update-error', handler);
    return () => ipcRenderer.removeListener('update-error', handler);
  },
  onUpdateBlockedRecording: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('update-blocked-recording', handler);
    return () => ipcRenderer.removeListener('update-blocked-recording', handler);
  },
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),

  // Recording state sync (for update safety)
  notifyRecordingStarted: () => ipcRenderer.send('recording-started'),
  notifyRecordingStopped: () => ipcRenderer.send('recording-stopped'),

  // Auth
  authSendMagicLink: (email) => ipcRenderer.invoke('auth-send-magic-link', email),
  authVerifyOtp: (email, token) => ipcRenderer.invoke('auth-verify-otp', email, token),
  authGetState: () => ipcRenderer.invoke('auth-get-state'),
  authSignInOAuth: (provider) => ipcRenderer.invoke('auth-sign-in-oauth', provider),
  authSignOut: () => ipcRenderer.invoke('auth-sign-out'),
  authRefresh: () => ipcRenderer.invoke('auth-refresh'),
  onAuthStateChanged: (callback) => {
    const handler = (_e, data) => callback(data);
    ipcRenderer.on('auth-state-changed', handler);
    return () => ipcRenderer.removeListener('auth-state-changed', handler);
  },

  // Permission checks (onboarding)
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  requestMicrophone: () => ipcRenderer.invoke('request-microphone'),
  openSystemPrefs: (section) => ipcRenderer.invoke('open-system-prefs', section),

  // Fn permission status
  onFnPermissionNeeded: (callback) => {
    ipcRenderer.on('fn-permission-needed', () => callback());
    return () => ipcRenderer.removeAllListeners('fn-permission-needed');
  },

  // Intelligence Engine
  intelligenceGenerate: (data) => ipcRenderer.invoke('intelligence-generate', data),
  intelligenceRecordCopy: (data) => ipcRenderer.invoke('intelligence-record-copy', data),
  intelligenceRecordRegenerate: (data) => ipcRenderer.invoke('intelligence-record-regenerate', data),
  intelligenceInspector: () => ipcRenderer.invoke('intelligence-inspector'),
  memoryGetEntities: () => ipcRenderer.invoke('memory-get-entities'),
  memoryUpsertEntity: (data) => ipcRenderer.invoke('memory-upsert-entity', data),
  memoryExport: () => ipcRenderer.invoke('memory-export'),
});
