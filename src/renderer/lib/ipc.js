const verby = window.verby;

export const transcribeAudio = (buffer) => verby.sendAudio(buffer);
export const optimizePrompt = (text, category) => verby.optimizePrompt(text, category);
export const sendToLLM = (prompt, provider) => verby.sendToLLM(prompt, provider);
export const getHistory = () => verby.getHistory();
export const toggleFavorite = (id) => verby.toggleFavorite(id);
export const deletePrompt = (id) => verby.deletePrompt(id);
export const copyToClipboard = (text) => verby.copyToClipboard(text);
export const hideWindow = () => verby.hideWindow();
export const onToggleRecording = (cb) => verby.onToggleRecording(cb);
