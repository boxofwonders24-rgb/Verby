const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('verby', {
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
  injectText: (text) => ipcRenderer.invoke('inject-text', text),
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

  // Indicator control
  showProcessing: () => ipcRenderer.send('indicator-processing'),
  hideIndicator: () => ipcRenderer.send('indicator-hide'),

  // Usage
  getUsage: () => ipcRenderer.invoke('get-usage'),

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
});
