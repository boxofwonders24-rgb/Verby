const verby = window.verby || {};
const noop = () => {};
const noopAsync = () => Promise.resolve(null);

// Platform info — cached after first call
let _platformCache = null;
const defaultPlatform = { isMac: false, isWindows: false, isLinux: false, modifiers: { mod: 'Ctrl', alt: 'Alt', ctrl: 'Ctrl', shift: 'Shift' }, features: {}, settingsUrls: {} };
export const getPlatform = async () => {
  if (_platformCache) return _platformCache;
  _platformCache = await (verby.getPlatform || (() => Promise.resolve(defaultPlatform)))();
  return _platformCache;
};

export const transcribeAudio = (buffer) => (verby.sendAudio || noopAsync)(buffer);
export const optimizePrompt = (text, category) => (verby.optimizePrompt || noopAsync)(text, category);
export const sendToLLM = (prompt, provider) => (verby.sendToLLM || noopAsync)(prompt, provider);
export const getHistory = () => (verby.getHistory || (() => Promise.resolve([])))();
export const toggleFavorite = (id) => (verby.toggleFavorite || noopAsync)(id);
export const deletePrompt = (id) => (verby.deletePrompt || noopAsync)(id);
export const copyToClipboard = (text) => (verby.copyToClipboard || noop)(text);
export const hideWindow = () => (verby.hideWindow || noop)();
export const onToggleRecording = (cb) => (verby.onToggleRecording || noop)(cb);
export const getSettings = () => (verby.getSettings || (() => Promise.resolve({})))();
export const setSetting = (key, value) => (verby.setSetting || noopAsync)(key, value);

// Dictation
export const injectText = (text, options) => (verby.injectText || noopAsync)(text, options);
export const onToggleDictation = (cb) => (verby.onToggleDictation || noop)(cb);

// Fn key hold-to-talk
export const onFnDown = (cb) => (verby.onFnDown || noop)(cb);
export const onFnUp = (cb) => (verby.onFnUp || noop)(cb);

// Ctrl key hold-to-dictate (raw)
export const onCtrlDown = (cb) => (verby.onCtrlDown || noop)(cb);
export const onCtrlUp = (cb) => (verby.onCtrlUp || noop)(cb);

// Indicator control
export const showProcessing = () => (verby.showProcessing || noop)();
export const hideIndicator = () => (verby.hideIndicator || noop)();

// Usage + licensing
export const getUsage = () => (verby.getUsage || (() => Promise.resolve({ total: 0, limit: 20, isPro: false })))();
export const activateLicense = (email) => (verby.activateLicense || noopAsync)(email);
export const getUpgradeUrl = () => (verby.getUpgradeUrl || (() => Promise.resolve('')))();

// Chat — type-to-prompt
export const chatOptimize = (text) => (verby.chatOptimize || noopAsync)(text);

// Context — project awareness
export const setContext = (name, desc) => (verby.setContext || noopAsync)(name, desc);
export const getContext = () => (verby.getContext || noopAsync)();
export const getAllContexts = () => (verby.getAllContexts || (() => Promise.resolve([])))();

// Patterns
export const getPatterns = () => (verby.getPatterns || (() => Promise.resolve([])))();

// Auto-detected context
export const onAutoContext = (cb) => (verby.onAutoContext || noop)(cb);

// Settings nav
export const onOpenSettings = (cb) => (verby.onOpenSettings || noop)(cb);

// Intent-aware generation
export const generateSmart = (text) => (verby.generateSmart || noopAsync)(text);

// Light speech cleanup (Ctrl path)
export const cleanupSpeech = (text) => (verby.cleanupSpeech || noopAsync)(text);

// Auto-updates
export const onUpdateAvailable = (cb) => (verby.onUpdateAvailable || noop)(cb);
export const onUpdateProgress = (cb) => (verby.onUpdateProgress || noop)(cb);
export const onUpdateDownloaded = (cb) => (verby.onUpdateDownloaded || noop)(cb);
export const onUpdateError = (cb) => (verby.onUpdateError || noop)(cb);
export const onUpdateBlockedRecording = (cb) => (verby.onUpdateBlockedRecording || noop)(cb);
export const onUpdateChecking = (cb) => (verby.onUpdateChecking || noop)(cb);
export const onUpdateNotAvailable = (cb) => (verby.onUpdateNotAvailable || noop)(cb);
export const installUpdate = () => (verby.installUpdate || noopAsync)();
export const getAppVersion = () => (verby.getAppVersion || (() => Promise.resolve('0.0.0')))();
export const checkForUpdates = () => (verby.checkForUpdates || noopAsync)();

// Recording state sync
export const notifyRecordingStarted = () => (verby.notifyRecordingStarted || noop)();
export const notifyRecordingStopped = () => (verby.notifyRecordingStopped || noop)();

// Auth
export const authSendMagicLink = (email) => (verby.authSendMagicLink || noopAsync)(email);
export const authVerifyOtp = (email, token) => (verby.authVerifyOtp || noopAsync)(email, token);
export const authGetState = () => (verby.authGetState || (() => Promise.resolve({ isAuthenticated: false })))();
export const authSignInOAuth = (provider) => (verby.authSignInOAuth || noopAsync)(provider);
export const authSignOut = () => (verby.authSignOut || noopAsync)();
export const authRefresh = () => (verby.authRefresh || noopAsync)();
export const onAuthStateChanged = (cb) => (verby.onAuthStateChanged || noop)(cb);
export const authGetSessionTokens = () => (verby.authGetSessionTokens || (() => Promise.resolve(null)))();

// Permission checks (onboarding)
export const checkPermissions = () => (verby.checkPermissions || (() => Promise.resolve({ microphone: false, accessibility: false })))();
export const requestMicrophone = () => (verby.requestMicrophone || (() => Promise.resolve(false)))();
export const openSystemPrefs = (section) => (verby.openSystemPrefs || noop)(section);
export const onFnPermissionNeeded = (cb) => (verby.onFnPermissionNeeded || noop)(cb);

// Intelligence Engine
export const intelligenceGenerate = (data) =>
  window.verby?.intelligenceGenerate?.(data) ?? Promise.resolve(null);

export const intelligenceRecordCopy = (data) =>
  window.verby?.intelligenceRecordCopy?.(data) ?? Promise.resolve();

export const intelligenceRecordRegenerate = (data) =>
  window.verby?.intelligenceRecordRegenerate?.(data) ?? Promise.resolve();

export const intelligenceInspector = () =>
  window.verby?.intelligenceInspector?.() ?? Promise.resolve(null);

export const memoryGetEntities = () =>
  window.verby?.memoryGetEntities?.() ?? Promise.resolve([]);

export const memoryUpsertEntity = (data) =>
  window.verby?.memoryUpsertEntity?.(data) ?? Promise.resolve(null);

export const memoryExport = () =>
  window.verby?.memoryExport?.() ?? Promise.resolve(null);

// Diagnostics (help system)
export const getDiagnostics = () =>
  (verby.getDiagnostics || (() => Promise.resolve({ appVersion: '0.0.0', osInfo: 'unknown', nodeVersion: '', electronVersion: '' })))();
export const getRecentLogs = () =>
  (verby.getRecentLogs || (() => Promise.resolve([])))();
