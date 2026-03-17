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
});
