import { ipcMain, clipboard } from 'electron';
import Store from 'electron-store';
import WhisperService from './services/whisper.js';
import PromptEngine from './services/prompt-engine.js';
import LLMDispatch from './services/llm-dispatch.js';
import PromptDB from './services/database.js';

const store = new Store({ name: 'verbyprompt-settings' });
let whisper, engine, dispatch, db;

function initServices(settings) {
  const openaiKey = settings.openaiKey || store.get('openaiKey') || process.env.OPENAI_API_KEY;
  const anthropicKey = settings.anthropicKey || store.get('anthropicKey') || process.env.ANTHROPIC_API_KEY;
  const defaultProvider = settings.defaultProvider || store.get('defaultProvider') || process.env.DEFAULT_PROVIDER || 'claude';

  if (openaiKey) whisper = new WhisperService(openaiKey);
  engine = new PromptEngine({ anthropicKey, openaiKey, defaultProvider });
  dispatch = new LLMDispatch({ anthropicKey, openaiKey });
  db = new PromptDB();
}

export function registerHandlers(mainWindow) {
  initServices({});

  ipcMain.handle('send-audio', async (_event, arrayBuffer) => {
    const transcript = await whisper.transcribe(arrayBuffer);
    return transcript;
  });

  ipcMain.handle('optimize-prompt', async (_event, rawText, category) => {
    const optimized = await engine.optimize(rawText, { category });
    const id = db.savePrompt({
      rawTranscript: rawText,
      optimizedPrompt: optimized,
      category: category || 'general',
    });
    return { id, optimized };
  });

  ipcMain.handle('send-to-llm', async (_event, prompt, provider) => {
    const response = await dispatch.send(prompt, provider);
    return response;
  });

  ipcMain.handle('get-history', async () => {
    return db.getHistory();
  });

  ipcMain.handle('toggle-favorite', async (_event, id) => {
    return db.toggleFavorite(id);
  });

  ipcMain.handle('delete-prompt', async (_event, id) => {
    db.deletePrompt(id);
  });

  ipcMain.handle('copy-to-clipboard', async (_event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('hide-window', async () => {
    mainWindow.hide();
  });

  ipcMain.handle('search-prompts', async (_event, query) => {
    return db.searchPrompts(query);
  });

  ipcMain.handle('get-settings', async () => {
    return {
      openaiKey: store.get('openaiKey', ''),
      anthropicKey: store.get('anthropicKey', ''),
      defaultProvider: store.get('defaultProvider', 'claude'),
      hotkey: store.get('hotkey', 'CommandOrControl+Shift+Space'),
      theme: store.get('theme', 'dark'),
    };
  });

  ipcMain.handle('set-setting', async (_event, key, value) => {
    store.set(key, value);
    if (['openaiKey', 'anthropicKey', 'defaultProvider'].includes(key)) {
      initServices({
        openaiKey: store.get('openaiKey'),
        anthropicKey: store.get('anthropicKey'),
        defaultProvider: store.get('defaultProvider', 'claude'),
      });
    }
  });
}
