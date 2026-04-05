const { ipcMain, clipboard, app } = require('electron');
const path = require('path');
const fs = require('fs');
const platform = require('./platform');
const { initMemoryTables, memory } = require('./memory.cjs');

const isDev = !app.isPackaged;

let whisper, engine, dispatch, db;
let _autoContext = null; // { appName, windowTitle } — set by main process

// Auth gate — blocks API-consuming operations if user isn't authenticated.
// In dev mode, skip the check so development isn't blocked.
function requireAuth() {
  if (isDev) return; // Skip in dev mode
  const { getAuthState } = require('./auth');
  const auth = getAuthState();
  if (!auth.isAuthenticated) {
    throw new Error('Sign in required. Please sign in to use Verby.');
  }
}

// Usage tracking for freemium limits
const FREE_DAILY_LIMIT = isDev ? 9999 : 20; // unlimited in dev mode
const FREE_ENHANCED_LIMIT = isDev ? 9999 : 20;

function getUsageToday() {
  if (!db) return { total: 0, enhanced: 0 };
  const today = new Date().toISOString().split('T')[0];
  const row = db.getUsageForDate(today);
  return row || { total: 0, enhanced: 0 };
}

let _proStatusCache = { valid: false, checkedAt: 0 };

// Admin Pro emails — always unlimited, no API check needed
const ADMIN_EMAILS = ['boxofwonders24@gmail.com', 'sgrandy@syntrixdev.com'];

async function checkProStatus() {
  // Cache for 1 hour
  if (Date.now() - _proStatusCache.checkedAt < 3600000) return _proStatusCache.valid;

  // Check admin list first (instant, no network)
  try {
    const { getAuthState } = require('./auth');
    const auth = getAuthState();
    if (auth.isAuthenticated && ADMIN_EMAILS.includes(auth.email)) {
      _proStatusCache = { valid: true, checkedAt: Date.now() };
      return true;
    }
  } catch {}

  // Check Supabase profile (set via admin)
  try {
    const { getAuthState, getAccessToken } = require('./auth');
    const auth = getAuthState();
    if (auth.isAuthenticated) {
      const token = getAccessToken();
      const supabaseUrl = process.env.SUPABASE_URL;
      if (token && supabaseUrl) {
        const resp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${auth.userId}&select=is_pro`, {
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (resp.ok) {
          const profiles = await resp.json();
          if (profiles[0]?.is_pro) {
            _proStatusCache = { valid: true, checkedAt: Date.now() };
            return true;
          }
        }
      }
    }
  } catch (err) {
    console.error('Supabase pro check failed:', err.message);
  }

  // Fallback: check Stripe
  const email = getSetting('licenseEmail', '');
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!email || !stripeKey) {
    _proStatusCache = { valid: false, checkedAt: Date.now() };
    return false;
  }

  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.stripe.com',
        path: `/v1/customers/search?query=email:'${encodeURIComponent(email)}'`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${stripeKey}` },
      }, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => resolve(JSON.parse(body)));
      });
      req.on('error', reject);
      req.end();
    });

    if (data.data && data.data.length > 0) {
      const customerId = data.data[0].id;
      // Check for active subscriptions
      const subs = await new Promise((resolve, reject) => {
        const req = https.request({
          hostname: 'api.stripe.com',
          path: `/v1/subscriptions?customer=${customerId}&status=active&limit=1`,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeKey}` },
        }, (res) => {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => resolve(JSON.parse(body)));
        });
        req.on('error', reject);
        req.end();
      });

      const isActive = subs.data && subs.data.length > 0;
      _proStatusCache = { valid: isActive, checkedAt: Date.now() };
      return isActive;
    }
  } catch (err) {
    console.error('Stripe check failed:', err.message);
  }

  _proStatusCache = { valid: false, checkedAt: Date.now() };
  return false;
}

function checkUsageLimit(isEnhanced) {
  const usage = getUsageToday();
  // Pro status is cached — checked async on app start and after license email change
  if (_proStatusCache.valid) return { allowed: true, usage, isPro: true };

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

// API keys resolved at runtime. Priority:
// 1. User's own key from Settings (highest)
// 2. OPENAI_API_KEY / ANTHROPIC_API_KEY env vars (.env in dev, injected by CI in packaged builds)
// 3. Empty (falls through to Vercel proxy for authenticated users)
function initServices(settings) {
  const openaiKey = (settings && settings.openaiKey) || getSetting('openaiKey', '') || process.env.OPENAI_API_KEY || '';
  const anthropicKey = (settings && settings.anthropicKey) || getSetting('anthropicKey', '') || process.env.ANTHROPIC_API_KEY || '';
  const defaultProvider = (settings && settings.defaultProvider) || getSetting('defaultProvider', 'openai') || process.env.DEFAULT_PROVIDER || 'openai';

  console.log('[VerbyPrompt] initServices:', {
    hasOpenAI: !!openaiKey,
    hasAnthropic: !!anthropicKey,
    provider: defaultProvider,
  });

  // Whisper — use local key if available, otherwise proxy through verbyai.com
  const PROXY_BASE = 'https://verbyai.com/api';
  const { getAccessToken } = require('./auth');

  function getAuthHeaders() {
    const token = getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  if (openaiKey) {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: openaiKey });
    whisper = {
      async transcribe(audioBuffer) {
        const os = require('os');
        const tmpPath = path.join(os.tmpdir(), `verby-${Date.now()}.webm`);
        fs.writeFileSync(tmpPath, Buffer.from(audioBuffer));
        console.log(`>>> Whisper: sending ${audioBuffer.byteLength} bytes`);
        try {
          const transcription = await client.audio.transcriptions.create({
            model: 'whisper-1',
            file: fs.createReadStream(tmpPath),
            response_format: 'text',
            language: 'en',
          });
          console.log(`>>> Whisper result: "${(transcription || '').substring(0, 50)}"`);
          return transcription.trim();
        } catch (err) {
          console.error(`>>> Whisper error: ${err.message}`);
          throw err;
        } finally {
          try { fs.unlinkSync(tmpPath); } catch {}
        }
      }
    };
  } else {
    // No local key — use server proxy
    whisper = {
      async transcribe(audioBuffer) {
        const resp = await fetch(`${PROXY_BASE}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'audio/webm', ...getAuthHeaders() },
          body: Buffer.from(audioBuffer),
        });
        if (!resp.ok) throw new Error('Transcription failed — server error');
        const data = await resp.json();
        return data.text?.trim() || '';
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
        // No local keys — use server proxy
        const resp = await fetch(`${PROXY_BASE}/optimize`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ text: userMessage, category: hintCategory }),
        });
        if (!resp.ok) throw new Error('Server optimization failed');
        const data = await resp.json();
        return { optimized: data.optimized, detectedCategory: data.category || hintCategory, type: data.type || 'task' };
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
    ,
    // Intent detection + generation (keep system prompt in sync with site/api/generate.js)
    async generateSmart(rawText) {
      const systemPrompt = `You are Verby — an intent-aware voice assistant. The user spoke into a microphone and their speech was transcribed. Analyze what they want and respond accordingly.

STEP 1 — DETECT INTENT:
- EMAIL: The user wants you to write an actual email they can send. Look for:
  - Direct: "email [person] about...", "send a message to...", "write to [person]..."
  - Indirect: "write me an email about...", "draft an email to...", "write a resignation email", "reply to [person]", "tell [person] about..."
  - Key signal: if the user wants a ready-to-send email as the OUTPUT, this is EMAIL intent
- PROMPT: The user wants a prompt, question, code, or other non-email content. This is the default.

If the user says "write me an email" or "draft an email" — that IS email intent, even without naming a specific recipient. Use a generic greeting like "Hi [Name]," if no recipient is specified.

If you are genuinely unsure whether the user wants an email or a prompt, choose PROMPT.

STEP 2 — GENERATE:

If EMAIL:
- Extract the recipient name, topic, and key points from their speech
- Write a complete, well-developed email: greeting, body (2-3 paragraphs for substantive topics), sign-off
- CRITICAL TONE RULE: Mirror how the user spoke. If they were casual ("hey can you tell Mike we're pushing back"), write casually. If they were formal ("please inform the client of the schedule adjustment"), write formally. The user's words ARE the tone guide.
- FLESH IT OUT: The user gave you the gist — your job is to expand it into a proper email. Add appropriate context, transitions, and professional courtesy. A one-sentence request like "email John about pushing the meeting" should become a 3-5 sentence email, not a 1-sentence email.
- Make it sound like a real person wrote it — natural, warm, human
- Include a clear call to action or next step when appropriate (e.g., "Let me know if that works for you", "Happy to discuss further")
- Do NOT add a subject line
- Do NOT invent specific facts, dates, numbers, or commitments the user did not mention — but DO add reasonable conversational filler like acknowledging the situation or being polite
- Do NOT use corporate cliches: "I hope this email finds you well", "per our previous discussion", "as per", "please do not hesitate", "circle back", "touch base"
- When the user is vague about details, keep those parts general but still write a complete-sounding email
- Sign off with just a first name placeholder like "Best,\\n[Your name]"

If PROMPT:
First classify the prompt type:
- "conversational": Questions, brainstorming, thinking out loud ("hey", "what if", "can you", "I need help with")
- "task": Create something new — code, document, content ("write me", "create a", "build", "draft", "make a")
- "fix": Debug or troubleshoot ("not working", "error", "broken", "how do I fix")
- "rewrite": Transform existing content ("make this more", "shorten", "rewrite", "simplify")

Then optimize based on type:
- CONVERSATIONAL: Clean up speech, keep natural tone, add specificity, restructure as a clear question
- TASK: Full structured prompt with role assignment ("You are an expert..."), clear deliverables, constraints, format, output specification. Ready to paste into any AI.
- FIX: Frame as debugging prompt — what's happening, what was expected, ask AI to diagnose root cause then suggest fixes with explanations
- REWRITE: Identify content to transform, specify the transformation (tone, length, audience), preserve original meaning

Rules for all prompt types:
1. Preserve the user's actual goal
2. Remove filler words, false starts, verbal tics
3. Add context and specificity
4. Keep it concise but complete
5. The result should be a BETTER version of what the user asked for, not a literal transcription

OUTPUT FORMAT:
Return a JSON object:
{"type": "email" or "prompt", "result": "the generated text"}
Return ONLY the JSON. No explanation, no markdown fences.`;

      let raw;

      if (defaultProvider === 'claude' && anthropicKey) {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: anthropicKey });
        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: rawText }],
        });
        raw = response.content[0].text.trim();
      } else if (openaiKey) {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4o',
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText },
          ],
        });
        raw = response.choices[0].message.content.trim();
      } else {
        // No local keys — use server proxy
        const resp = await fetch(`${PROXY_BASE}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ text: rawText }),
        });
        if (!resp.ok) throw new Error('Server generation failed');
        const data = await resp.json();
        return { type: data.type || 'prompt', result: data.result || '' };
      }

      try {
        const parsed = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, ''));
        return { type: parsed.type || 'prompt', result: parsed.result || raw };
      } catch {
        return { type: 'prompt', result: raw };
      }
    },

    async cleanupSpeech(rawText) {
      const systemPrompt = `You are a speech cleanup assistant. The user dictated text via microphone. Clean it up naturally:

- Fix grammar, punctuation, and capitalization
- Remove filler words (um, uh, like, you know, so, basically)
- Remove false starts and repetitions
- Keep the user's natural tone and meaning — do NOT rephrase or rewrite
- Do NOT add anything the user didn't say
- Do NOT turn it into a formal prompt or structured output
- Just make it read like clean, natural written text

Return ONLY the cleaned text. No JSON, no explanation.`;

      // Use cheaper models for simple cleanup — Haiku/GPT-4o-mini (90% cost savings)
      if (defaultProvider === 'claude' && anthropicKey) {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey: anthropicKey });
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: rawText }],
        });
        return response.content[0].text.trim();
      } else if (openaiKey) {
        const OpenAI = require('openai');
        const client = new OpenAI({ apiKey: openaiKey });
        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: rawText },
          ],
        });
        return response.choices[0].message.content.trim();
      } else {
        // No local keys — just return the raw text (cleanup is a nice-to-have)
        return rawText;
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

    initMemoryTables(sqliteDb);

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
        sqliteDb.prepare('UPDATE context SET active = 0').run();
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

// === Cross-platform text injection via @nut-tree-fork/nut-js ===
// Lazy-loaded so the app still starts if the native module fails to load.
let _nutKeyboard = null;
let _nutKey = null;
let _nutLoaded = false;

function loadNutJs() {
  if (_nutLoaded) return !!_nutKeyboard;
  _nutLoaded = true;
  try {
    const nut = require('@nut-tree-fork/nut-js');
    _nutKeyboard = nut.keyboard;
    _nutKey = nut.Key;
    console.log('nut-js loaded successfully');
    return true;
  } catch (err) {
    console.error('nut-js failed to load:', err.message);
    return false;
  }
}

/**
 * Primary injection: clipboard + simulated paste via nut-js.
 * Works on macOS, Windows, and Linux.
 */
async function injectTextNutJs(text) {
  if (!loadNutJs()) return false;

  const oldClipboard = clipboard.readText();
  clipboard.writeText(text);

  try {
    // Delay to ensure clipboard is ready — longer for reliability on Intel Macs
    await new Promise((r) => setTimeout(r, 150));

    const modKey = platform.isMac ? _nutKey.LeftSuper : _nutKey.LeftControl;
    await _nutKeyboard.pressKey(modKey, _nutKey.V);
    await new Promise((r) => setTimeout(r, 50));
    await _nutKeyboard.releaseKey(modKey, _nutKey.V);

    // Restore clipboard after paste completes
    setTimeout(() => clipboard.writeText(oldClipboard), 800);
    return true;
  } catch (err) {
    clipboard.writeText(oldClipboard);
    console.error('nut-js inject failed:', err.message);
    return false;
  }
}

/**
 * Simulate pressing Enter via nut-js (for "send message" voice command).
 */
async function pressEnterNutJs() {
  if (!loadNutJs()) return false;
  try {
    await _nutKeyboard.pressKey(_nutKey.Return);
    await _nutKeyboard.releaseKey(_nutKey.Return);
    return true;
  } catch (err) {
    console.error('nut-js Enter failed:', err.message);
    return false;
  }
}

// === Fallback: AppleScript-based injection (macOS only) ===
async function injectTextAppleScript(text) {
  if (!platform.features.appleScript) return false;

  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);

  const oldClipboard = clipboard.readText();
  clipboard.writeText(text);

  try {
    await execAsync(`osascript -e 'delay 0.05' -e 'tell application "System Events" to keystroke "v" using command down'`);
    setTimeout(() => clipboard.writeText(oldClipboard), 300);
    return true;
  } catch (err) {
    clipboard.writeText(oldClipboard);
    console.error('AppleScript inject failed:', err.message);
  }
  return false;
}

// === Fallback: native Swift binary (macOS only) ===
async function injectTextNative(text) {
  if (!platform.features.nativeTextInject) return false;

  const { execFile } = require('child_process');
  const util = require('util');
  const execFileAsync = util.promisify(execFile);

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

function registerHandlers(mainWindow) {
  initServices({});

  ipcMain.handle('send-audio', async (_event, arrayBuffer) => {
    requireAuth();
    if (!whisper) throw new Error('OpenAI API key not set. Add it in Settings to enable voice transcription.');
    const limit = checkUsageLimit(false);
    if (!limit.allowed) throw new Error(limit.reason);
    const result = await whisper.transcribe(arrayBuffer);
    db.incrementUsage(false);
    return result;
  });

  ipcMain.handle('optimize-prompt', async (_event, rawText, category) => {
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

  ipcMain.handle('generate-smart', async (_event, rawText) => {
    requireAuth();
    const limit = checkUsageLimit(true);
    if (!limit.allowed) throw new Error(limit.reason);
    try {
      const result = await engine.generateSmart(rawText);
      if (!db) throw new Error('Database not initialized.');
      db.save(rawText, result.result, result.type === 'email' ? 'email' : 'general');
      db.incrementUsage(true);
      return result;
    } catch (err) {
      console.error('[generate-smart] Failed:', err.message);
      throw err;
    }
  });

  ipcMain.handle('cleanup-speech', async (_event, rawText) => {
    requireAuth();
    const limit = checkUsageLimit(false);
    if (!limit.allowed) throw new Error(limit.reason);
    try {
      const cleaned = await engine.cleanupSpeech(rawText);
      if (db) {
        db.save(rawText, cleaned, 'dictation');
        db.incrementUsage(false);
      }
      return cleaned;
    } catch (err) {
      console.error('[cleanup-speech] Failed:', err.message);
      return rawText; // fallback to raw on error
    }
  });

  // Chat — type a prompt directly instead of voice
  ipcMain.handle('chat-optimize', async (_event, text) => {
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
  // Check Pro status after a delay to allow auth session to restore
  setTimeout(() => {
    checkProStatus().then((isPro) => console.log('Pro status:', isPro));
  }, 3000);

  ipcMain.handle('get-usage', async () => {
    const usage = getUsageToday();
    return {
      total: usage.total || 0,
      enhanced: usage.enhanced || 0,
      limit: _proStatusCache.valid ? Infinity : FREE_DAILY_LIMIT,
      isPro: _proStatusCache.valid,
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
      licenseEmail: getSetting('licenseEmail', ''),
      autoInject: getSetting('autoInject', true),
      soundFeedback: getSetting('soundFeedback', true),
      minDuration: getSetting('minDuration', '0.5'),
      launchAtLogin: getSetting('launchAtLogin', false),
      showInDock: getSetting('showInDock', false),
      saveHistory: getSetting('saveHistory', true),
      sendAnalytics: getSetting('sendAnalytics', false),
      onboardingComplete: getSetting('onboardingComplete', false),
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
    // Handle launchAtLogin directly (only works in packaged app)
    if (key === 'launchAtLogin') {
      try {
        app.setLoginItemSettings({ openAtLogin: !!value });
        console.log('Launch at login updated:', !!value);
      } catch (err) {
        console.log('Login item not available in dev mode');
      }
    }
    // Handle showInDock directly (macOS only)
    if (key === 'showInDock' && platform.features.dock) {
      if (app.dock) {
        if (value) { app.dock.show(); } else { app.dock.hide(); }
        console.log('Dock visibility:', !!value);
      }
    }
  });

  // === System-wide text injection ===
  // Chain: nut-js (cross-platform) → AppleScript (macOS) → native binary (macOS) → clipboard-only
  ipcMain.handle('inject-text', async (_event, text, options) => {
    let processed = text;

    // Process voice commands (skip for AI-generated content like emails)
    if (!options || !options.skipVoiceCommands) {
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
    } // end if !skipVoiceCommands

    console.log('>>> Injecting text:', processed.substring(0, 50) + '...');
    console.log('>>> Architecture:', process.arch, '| Platform:', process.platform);

    // Try nut-js first (works on all platforms)
    let injected = await injectTextNutJs(processed);
    if (injected) {
      console.log('>>> nut-js inject: success');
    } else {
      console.log('>>> nut-js inject: FAILED — trying fallbacks');
    }

    // macOS fallbacks if nut-js failed
    if (!injected && platform.isMac) {
      injected = await injectTextAppleScript(processed);
      if (injected) {
        console.log('>>> AppleScript inject: success');
      } else {
        console.log('>>> AppleScript inject: FAILED (check Accessibility permission)');
        injected = await injectTextNative(processed);
        console.log('>>> Native binary inject result:', injected);
      }
    }

    if (!injected) {
      const pasteKey = platform.isMac ? 'Cmd+V' : 'Ctrl+V';
      console.log(`>>> All injection failed. Text left on clipboard — press ${pasteKey}.`);
      clipboard.writeText(processed);

      // Notify the user so they know their text is on the clipboard
      const { Notification } = require('electron');
      if (Notification.isSupported()) {
        new Notification({
          title: 'Verby — Text on clipboard',
          body: `Paste failed. Press ${pasteKey} to paste your text.`,
        }).show();
      }
    }

    // Handle "send message" voice command — press Enter after injection
    if ((!options || !options.skipVoiceCommands) && /\bsend message\b/gi.test(text)) {
      setTimeout(async () => {
        const sent = await pressEnterNutJs();
        if (!sent) {
          console.log('>>> Enter key fallback not available');
        }
      }, 300);
    }

    return processed;
  });

  ipcMain.handle('activate-license', async (_event, email) => {
    setSetting('licenseEmail', email);
    _proStatusCache = { valid: false, checkedAt: 0 };
    const isPro = await checkProStatus();
    return { isPro, email };
  });

  ipcMain.handle('get-upgrade-url', async () => {
    return process.env.STRIPE_PAYMENT_LINK || 'https://buy.stripe.com/aFafZhgFpa0k4edfDm2Nq00';
  });
}

function setAutoContext(ctx) {
  _autoContext = ctx;
}

module.exports = { registerHandlers, setAutoContext, getSetting };
