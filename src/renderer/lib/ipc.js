const verby = window.verby || {};
const noop = () => {};
const noopAsync = () => Promise.resolve(null);

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
export const injectText = (text) => (verby.injectText || noopAsync)(text);
export const onToggleDictation = (cb) => (verby.onToggleDictation || noop)(cb);
