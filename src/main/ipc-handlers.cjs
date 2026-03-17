const { ipcMain, clipboard, app } = require('electron');
const path = require('path');
const fs = require('fs');

let whisper, engine, dispatch, db;

// Simple JSON settings store (replaces electron-store)
function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8'));
  } catch {
    return {};
  }
}

function saveSettings(data) {
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2));
}

function getSetting(key, defaultValue = '') {
  const settings = loadSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
}

function setSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  saveSettings(settings);
}

function initServices(settings) {
  const openaiKey = (settings && settings.openaiKey) || getSetting('openaiKey', '') || process.env.OPENAI_API_KEY || '';
  const anthropicKey = (settings && settings.anthropicKey) || getSetting('anthropicKey', '') || process.env.ANTHROPIC_API_KEY || '';
  const defaultProvider = (settings && settings.defaultProvider) || getSetting('defaultProvider', 'claude') || process.env.DEFAULT_PROVIDER || 'claude';

  console.log('[VerbyPrompt] initServices:', {
    hasOpenAI: !!openaiKey,
    hasAnthropic: !!anthropicKey,
    provider: defaultProvider,
  });

  // Whisper
  if (openaiKey) {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: openaiKey });
    whisper = {
      async transcribe(audioBuffer) {
        const fs = require('fs');
        const os = require('os');
        const tmpPath = path.join(os.tmpdir(), `verby-${Date.now()}.webm`);
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer));
        try {
          const transcription = await client.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(tmpPath),
            response_format: 'text',
          });
          return transcription.trim();
        } finally {
          fs.unlinkSync(tmpPath);
        }
      }
    };
  }

  // Prompt engine
  const SYSTEM_PROMPT = `You are VerbyPrompt — an expert prompt engineer. Your job is to take raw, messy speech transcriptions and transform them into perfectly structured AI prompts.

RULES:
1. Detect the user's intent from their raw speech
2. Rewrite into a structured prompt that includes:
   - An appropriate role assignment ("You are an expert...")
   - A clear, specific task definition
   - Relevant constraints or requirements
   - A specified output format when helpful
3. Preserve the user's actual goal
4. Remove filler words, false starts, and verbal tics
5. Add context and specificity
6. Keep it concise

OUTPUT FORMAT:
Return ONLY the optimized prompt text. No explanation, no preamble, no markdown wrapping.`;

  engine = {
    async optimize(rawText, opts = {}) {
      const category = opts.category || 'general';
      const userMessage = category !== 'general' ? `[Category: ${category}]\n\n${rawText}` : rawText;

      if (defaultProvider === 'claude' && anthropicKey) {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: anthropicKey });
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userMessage }],
        });
        return response.content[0].text.trim();
      }

      if (openaiKey) {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userMessage },
          ],
        });
        return response.choices[0].message.content.trim();
      }

      throw new Error('No AI provider configured. Add API keys in Settings.');
    }
  };

  // LLM dispatch
  dispatch = {
    async send(prompt, provider = 'claude') {
      if (provider === 'claude' && anthropicKey) {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: anthropicKey });
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });
        return response.content[0].text;
      }
      if (provider === 'openai' && openaiKey) {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 4096,
          messages: [{ role: 'user', content: prompt }],
        });
        return response.choices[0].message.content;
      }
      throw new Error(`Provider "${provider}" not configured`);
    }
  };

  // Database
  if (!db) {
    const Database = require('better-sqlite3');
    const { app } = require('electron');
    const dbPath = path.join(app.getPath('userData'), 'verbyprompt.db');
    const sqliteDb = new Database(dbPath);
    sqliteDb.pragma('journal_mode = WAL');
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_transcript TEXT NOT NULL,
        optimized_prompt TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);

    db = {
      save(rawTranscript, optimizedPrompt, category) {
        const stmt = sqliteDb.prepare('INSERT INTO prompts (raw_transcript, optimized_prompt, category) VALUES (?, ?, ?)');
        return stmt.run(rawTranscript, optimizedPrompt, category || 'general').lastInsertRowid;
      },
      getHistory(limit = 50) {
        return sqliteDb.prepare('SELECT * FROM prompts ORDER BY created_at DESC LIMIT ?').all(limit);
      },
      search(query) {
        return sqliteDb.prepare("SELECT * FROM prompts WHERE optimized_prompt LIKE ? OR raw_transcript LIKE ? ORDER BY created_at DESC").all(`%${query}%`, `%${query}%`);
      },
      toggleFavorite(id) {
        sqliteDb.prepare('UPDATE prompts SET is_favorite = NOT is_favorite WHERE id = ?').run(id);
        return sqliteDb.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
      },
      delete(id) {
        sqliteDb.prepare('DELETE FROM prompts WHERE id = ?').run(id);
      },
    };
  }
}

function registerHandlers(mainWindow) {
  initServices({});

  ipcMain.handle('send-audio', async (_event, arrayBuffer) => {
    if (!whisper) throw new Error('OpenAI API key not set. Add it in Settings to enable voice transcription.');
    return await whisper.transcribe(arrayBuffer);
  });

  ipcMain.handle('optimize-prompt', async (_event, rawText, category) => {
    if (!engine) throw new Error('No AI provider configured. Add API keys in Settings.');
    const optimized = await engine.optimize(rawText, { category });
    if (!db) throw new Error('Database not initialized.');
    const id = db.save(rawText, optimized, category || 'general');
    return { id, optimized };
  });

  ipcMain.handle('send-to-llm', async (_event, prompt, provider) => {
    if (!dispatch) throw new Error('No AI provider configured. Add API keys in Settings.');
    return await dispatch.send(prompt, provider);
  });

  ipcMain.handle('get-history', async () => {
    return db.getHistory();
  });

  ipcMain.handle('toggle-favorite', async (_event, id) => {
    return db.toggleFavorite(id);
  });

  ipcMain.handle('delete-prompt', async (_event, id) => {
    db.delete(id);
  });

  ipcMain.handle('copy-to-clipboard', async (_event, text) => {
    clipboard.writeText(text);
  });

  ipcMain.handle('hide-window', async () => {
    mainWindow.hide();
  });

  ipcMain.handle('search-prompts', async (_event, query) => {
    return db.search(query);
  });

  ipcMain.handle('get-settings', async () => {
    return {
      openaiKey: getSetting('openaiKey', ''),
      anthropicKey: getSetting('anthropicKey', ''),
      defaultProvider: getSetting('defaultProvider', 'claude'),
      hotkey: getSetting('hotkey', 'Alt+Space'),
      theme: getSetting('theme', 'dark'),
    };
  });

  ipcMain.handle('set-setting', async (_event, key, value) => {
    setSetting(key, value);
    if (['openaiKey', 'anthropicKey', 'defaultProvider'].includes(key)) {
      initServices({
        openaiKey: getSetting('openaiKey'),
        anthropicKey: getSetting('anthropicKey'),
        defaultProvider: getSetting('defaultProvider', 'claude'),
      });
    }
  });

  // === System-wide text injection ===
  // Saves old clipboard, sets new text, simulates Cmd+V, restores old clipboard
  ipcMain.handle('inject-text', async (_event, text) => {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    // Process voice commands
    let processed = text;
    processed = processed.replace(/\bnew line\b/gi, '\n');
    processed = processed.replace(/\bnew paragraph\b/gi, '\n\n');
    processed = processed.replace(/\bperiod\b/gi, '.');
    processed = processed.replace(/\bcomma\b/gi, ',');
    processed = processed.replace(/\bquestion mark\b/gi, '?');
    processed = processed.replace(/\bexclamation point\b/gi, '!');
    processed = processed.replace(/\bcolon\b/gi, ':');
    processed = processed.replace(/\bsemicolon\b/gi, ';');
    processed = processed.replace(/\bopen quote\b/gi, '"');
    processed = processed.replace(/\bclose quote\b/gi, '"');

    // Save current clipboard
    const oldClipboard = clipboard.readText();

    // Set text to clipboard
    clipboard.writeText(processed);

    // Simulate Cmd+V via AppleScript
    try {
      await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
    } catch (err) {
      console.error('Injection failed, VerbyPrompt needs Accessibility permissions:', err.message);
      throw new Error('Enable Accessibility permissions: System Settings → Privacy & Security → Accessibility → Enable VerbyPrompt');
    }

    // Restore old clipboard after a short delay
    setTimeout(() => {
      clipboard.writeText(oldClipboard);
    }, 300);

    // Handle "send message" command
    if (/\bsend message\b/gi.test(text)) {
      setTimeout(async () => {
        try {
          await execAsync(`osascript -e 'tell application "System Events" to keystroke return'`);
        } catch (e) { /* ignore */ }
      }, 150);
    }

    return processed;
  });
}

module.exports = { registerHandlers };
