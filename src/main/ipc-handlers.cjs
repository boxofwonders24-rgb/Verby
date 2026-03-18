const { ipcMain, clipboard, app } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

let whisper, engine, dispatch, db;
let _autoContext = null; // { appName, windowTitle } — set by main process

// Usage tracking for freemium limits
const FREE_DAILY_LIMIT = 20;
const FREE_ENHANCED_LIMIT = 20; // same as daily for now — tighten later

function getUsageToday() {
  if (!db) return { total: 0, enhanced: 0 };
  const today = new Date().toISOString().split('T')[0];
  const row = db.getUsageForDate(today);
  return row || { total: 0, enhanced: 0 };
}

function checkUsageLimit(isEnhanced) {
  const usage = getUsageToday();
  // TODO: check license key for Pro status
  const isPro = getSetting('licenseKey', '') !== '';
  if (isPro) return { allowed: true, usage, isPro: true };

  if (usage.total >= FREE_DAILY_LIMIT) {
    return { allowed: false, reason: `Daily limit reached (${FREE_DAILY_LIMIT}/day). Upgrade to Pro for unlimited.`, usage, isPro: false };
  }
  if (isEnhanced && usage.enhanced >= FREE_ENHANCED_LIMIT) {
    return { allowed: false, reason: 'AI enhancement is a Pro feature. Upgrade for enhanced writing.', usage, isPro: false };
  }
  return { allowed: true, usage, isPro: false };
}

// Simple JSON settings store
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
        const os = require('os');
        const tmpPath = path.join(os.tmpdir(), `verby-${Date.now()}.webm`);
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer));
        try {
          const transcription = await client.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(tmpPath),
            response_format: 'text',
            language: 'en',
          });
          return transcription.trim();
        } finally {
          fs.unlinkSync(tmpPath);
        }
      }
    };
  }

  // Prompt engine
  function buildSystemPrompt() {
    let prompt = `You are Verby — an intelligent prompt engineer that detects how the user is speaking and responds accordingly.

STEP 1 — CLASSIFY THE INPUT TYPE:
Analyze the raw input and classify it as one of:
- "conversational": Questions, brainstorming, thinking out loud. Phrases like "hey", "so", "I think", "what if", "can you", "I need help with"
- "task": Create something new — email, document, code, content. Phrases like "write me", "create a", "build", "draft", "make a"
- "fix": Debug or troubleshoot a problem. Phrases like "this isn't working", "I'm getting an error", "why isn't", "it's broken", "how do I fix", "not showing up"
- "rewrite": Transform existing content. Phrases like "make this more", "shorten this", "rewrite", "translate", "simplify", "clean up", "improve this"

STEP 2 — OPTIMIZE BASED ON TYPE:

If CONVERSATIONAL:
- Clean up speech, restructure as a clear question
- Keep natural tone — don't over-formalize
- Add specificity where vague
- No role assignment unless it genuinely helps

If TASK:
- Full structured prompt with:
  - Role assignment ("You are an expert...")
  - Clear deliverables and requirements
  - Constraints, format, tone/style
  - Output format specification
- Ready to paste into any AI

If FIX:
- Frame as a debugging/troubleshooting prompt
- Include: what's happening, what was expected, environment context
- Ask the AI to diagnose root cause then suggest fixes
- Include "explain why" so the user learns
- If code-related, specify the language/framework from context

If REWRITE:
- Identify what content the user wants transformed
- Specify the transformation (tone, length, audience, language)
- Preserve the original meaning
- Include "maintain the core message" constraint
- Output should be the rewritten content directly

RULES FOR ALL TYPES:
1. Preserve the user's actual goal
2. Remove filler words, false starts, verbal tics
3. Add context and specificity from detected app/project
4. Keep it concise but complete`;

    // Inject active project context if available
    if (db) {
      const ctx = db.getActiveContext();
      if (ctx) {
        prompt += `\n\nACTIVE PROJECT CONTEXT:
Project: ${ctx.project_name}
Description: ${ctx.description}
Use this context to make prompts more relevant and specific to the user's current work.`;
      }

      // Inject auto-detected app context
      if (_autoContext && _autoContext.appName) {
        prompt += `\n\nCURRENT APP (auto-detected):
App: ${_autoContext.appName}
Window: ${_autoContext.windowTitle}
The user is currently working in this app. Tailor the prompt to be useful in this context.`;
      }

      // Inject learned patterns
      const patterns = db.getTopPatterns(3);
      if (patterns.length > 0) {
        prompt += `\n\nUSER'S COMMON PROMPT PATTERNS (learn from these):`;
        for (const p of patterns) {
          prompt += `\n- Category "${p.category}" (used ${p.frequency}x): "${p.example_raw}" → "${p.example_optimized}"`;
        }
      }

      // Inject recent prompts for recency awareness
      const recent = db.getHistory(5);
      if (recent.length > 0) {
        prompt += `\n\nRECENT PROMPTS (for continuity — the user may be building on these):`;
        for (const r of recent) {
          prompt += `\n- [${r.category}] "${r.raw_transcript.substring(0, 80)}" → "${r.optimized_prompt.substring(0, 100)}"`;
        }
      }
    }

    prompt += `\n\nOUTPUT FORMAT:
Return a JSON object with exactly these fields:
{"optimized": "the optimized prompt text", "type": "conversational|task|fix|rewrite", "category": "one of: coding|business|marketing|creative|research|automation|general"}

Return ONLY the JSON. No explanation, no markdown.`;

    return prompt;
  }

  engine = {
    async optimize(rawText, opts = {}) {
      const hintCategory = opts.category || 'general';
      const userMessage = hintCategory !== 'general'
        ? `[Hint: user selected "${hintCategory}" category]\n\n${rawText}`
        : rawText;

      const systemPrompt = buildSystemPrompt();
      let raw;

      if (defaultProvider === 'claude' && anthropicKey) {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: anthropicKey });
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        });
        raw = response.content[0].text.trim();
      } else if (openaiKey) {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
        });
        raw = response.choices[0].message.content.trim();
      } else {
        throw new Error('No AI provider configured. Add API keys in Settings.');
      }

      // Parse structured response
      try {
        const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, ''));
        return { optimized: parsed.optimized, detectedCategory: parsed.category || hintCategory, type: parsed.type || 'task' };
      } catch {
        // Fallback: treat entire response as the optimized text
        return { optimized: raw, detectedCategory: hintCategory, type: 'task' };
      }
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

      CREATE TABLE IF NOT EXISTS patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        frequency INTEGER DEFAULT 1,
        example_raw TEXT,
        example_optimized TEXT,
        last_used TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS context (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_name TEXT,
        description TEXT,
        active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usage (
        date TEXT PRIMARY KEY,
        total INTEGER DEFAULT 0,
        enhanced INTEGER DEFAULT 0
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
      // Pattern learning
      recordPattern(category, raw, optimized) {
        const existing = sqliteDb.prepare('SELECT * FROM patterns WHERE category = ?').get(category);
        if (existing) {
          sqliteDb.prepare('UPDATE patterns SET frequency = frequency + 1, last_used = datetime(\'now\'), example_raw = ?, example_optimized = ? WHERE id = ?')
            .run(raw, optimized, existing.id);
        } else {
          sqliteDb.prepare('INSERT INTO patterns (category, example_raw, example_optimized) VALUES (?, ?, ?)')
            .run(category, raw, optimized);
        }
      },
      getTopPatterns(limit = 5) {
        return sqliteDb.prepare('SELECT * FROM patterns ORDER BY frequency DESC LIMIT ?').all(limit);
      },
      // Context management
      setContext(projectName, description) {
        sqliteDb.prepare('UPDATE context SET active = 0');
        sqliteDb.prepare('INSERT INTO context (project_name, description, active) VALUES (?, ?, 1)')
          .run(projectName, description);
      },
      getActiveContext() {
        return sqliteDb.prepare('SELECT * FROM context WHERE active = 1 ORDER BY id DESC LIMIT 1').get();
      },
      getAllContexts() {
        return sqliteDb.prepare('SELECT * FROM context ORDER BY created_at DESC LIMIT 20').all();
      },
      // Usage tracking
      getUsageForDate(date) {
        return sqliteDb.prepare('SELECT * FROM usage WHERE date = ?').get(date);
      },
      incrementUsage(isEnhanced) {
        const today = new Date().toISOString().split('T')[0];
        const existing = sqliteDb.prepare('SELECT * FROM usage WHERE date = ?').get(today);
        if (existing) {
          sqliteDb.prepare('UPDATE usage SET total = total + 1' + (isEnhanced ? ', enhanced = enhanced + 1' : '') + ' WHERE date = ?').run(today);
        } else {
          sqliteDb.prepare('INSERT INTO usage (date, total, enhanced) VALUES (?, 1, ?)').run(today, isEnhanced ? 1 : 0);
        }
      },
    };
  }
}

// === Text injection via native CGEventPost binary ===
async function injectTextNative(text) {
  const { execFile } = require('child_process');
  const util = require('util');
  const execFileAsync = util.promisify(execFile);

  // Use the dev binary — it has Accessibility permission from the user's grant
  const injectBinary = isDev
    ? path.join(__dirname, '..', '..', 'native', 'text-inject')
    : path.join(process.resourcesPath, 'native', 'text-inject');

  try {
    const { stdout } = await execFileAsync(injectBinary, [text], { timeout: 5000 });
    if (stdout.trim() === 'ok') return true;
  } catch (err) {
    console.error('Native inject failed:', err.message);
  }
  return false;
}

// === Fallback: AppleScript-based injection ===
async function injectTextAppleScript(text) {
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  const oldClipboard = clipboard.readText();
  clipboard.writeText(text);

  try {
    await execAsync(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
    setTimeout(() => clipboard.writeText(oldClipboard), 300);
    return true;
  } catch (err) {
    clipboard.writeText(oldClipboard);
    console.error('AppleScript inject failed:', err.message);
  }
  return false;
}

function registerHandlers(mainWindow) {
  initServices({});

  ipcMain.handle('send-audio', async (_event, arrayBuffer) => {
    if (!whisper) throw new Error('OpenAI API key not set. Add it in Settings to enable voice transcription.');
    const limit = checkUsageLimit(false);
    if (!limit.allowed) throw new Error(limit.reason);
    const result = await whisper.transcribe(arrayBuffer);
    db.incrementUsage(false);
    return result;
  });

  ipcMain.handle('optimize-prompt', async (_event, rawText, category) => {
    if (!engine) throw new Error('No AI provider configured. Add API keys in Settings.');
    // Check usage limits
    const limit = checkUsageLimit(true);
    if (!limit.allowed) throw new Error(limit.reason);
    const result = await engine.optimize(rawText, { category });
    if (!db) throw new Error('Database not initialized.');
    const detectedCat = result.detectedCategory || category || 'general';
    const id = db.save(rawText, result.optimized, detectedCat);
    db.recordPattern(detectedCat, rawText.substring(0, 200), result.optimized.substring(0, 200));
    db.incrementUsage(true);
    return { id, optimized: result.optimized, category: detectedCat };
  });

  // Chat — type a prompt directly instead of voice
  ipcMain.handle('chat-optimize', async (_event, text) => {
    if (!engine) throw new Error('No AI provider configured.');
    const limit = checkUsageLimit(true);
    if (!limit.allowed) throw new Error(limit.reason);
    const result = await engine.optimize(text, {});
    if (!db) throw new Error('Database not initialized.');
    const cat = result.detectedCategory || 'general';
    const id = db.save(text, result.optimized, cat);
    db.recordPattern(cat, text.substring(0, 200), result.optimized.substring(0, 200));
    db.incrementUsage(true);
    return { id, optimized: result.optimized, category: cat };
  });

  // Context management
  ipcMain.handle('set-context', async (_event, projectName, description) => {
    db.setContext(projectName, description);
  });

  ipcMain.handle('get-context', async () => {
    return db.getActiveContext() || null;
  });

  ipcMain.handle('get-all-contexts', async () => {
    return db.getAllContexts();
  });

  ipcMain.handle('get-patterns', async () => {
    return db.getTopPatterns(10);
  });

  // Usage info for renderer
  ipcMain.handle('get-usage', async () => {
    const usage = getUsageToday();
    const isPro = getSetting('licenseKey', '') !== '';
    return {
      total: usage.total || 0,
      enhanced: usage.enhanced || 0,
      limit: isPro ? Infinity : FREE_DAILY_LIMIT,
      isPro,
    };
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
  // Tries native CGEventPost first, falls back to AppleScript, then clipboard-only
  ipcMain.handle('inject-text', async (_event, text) => {
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

    console.log('>>> Injecting text:', processed.substring(0, 50) + '...');

    // Save old clipboard, set new text
    const oldClipboard = clipboard.readText();
    clipboard.writeText(processed);

    // Try AppleScript keystroke first (uses parent app's Accessibility)
    let injected = false;
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      await execAsync(`osascript -e 'delay 0.05' -e 'tell application "System Events" to keystroke "v" using command down'`);
      injected = true;
      console.log('>>> AppleScript inject: success');
    } catch (e1) {
      console.log('>>> AppleScript failed:', e1.message);
      // Fallback to native binary
      injected = await injectTextNative(processed);
      console.log('>>> Native inject result:', injected);
    }

    // Restore clipboard after paste completes
    setTimeout(() => clipboard.writeText(oldClipboard), 500);

    if (!injected) {
      console.log('>>> All injection failed. Text left on clipboard — press Cmd+V.');
      clipboard.writeText(processed);
    }

    // Handle "send message" voice command — press Enter after injection
    if (/\bsend message\b/gi.test(text)) {
      setTimeout(async () => {
        // Try native Enter key press
        const { execFile } = require('child_process');
        const util = require('util');
        const execFileAsync = util.promisify(execFile);
        try {
          await execFileAsync('osascript', ['-e', 'tell application "System Events" to keystroke return']);
        } catch {
          // ignore
        }
      }, 300);
    }

    return processed;
  });
}

function setAutoContext(ctx) {
  _autoContext = ctx;
}

module.exports = { registerHandlers, setAutoContext };
