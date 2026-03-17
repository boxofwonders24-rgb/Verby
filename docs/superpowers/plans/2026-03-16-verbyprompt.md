# VerbyPrompt Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop voice-to-prompt app that captures speech, transcribes it via Whisper API, optimizes it into a structured prompt via Claude/OpenAI, and lets users copy, send, or save the result.

**Architecture:** Electron app with React+Tailwind renderer. Main process handles global hotkeys, audio capture, and API calls via IPC. SQLite stores prompt history locally. Floating overlay window provides the primary UI.

**Tech Stack:** Electron, React 18, Tailwind CSS 3, better-sqlite3, OpenAI SDK (Whisper + GPT), Anthropic SDK (Claude), electron-store, Web Audio API

---

## File Structure

```
verbyprompt/
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── forge.config.js                  # Electron Forge config
├── .env.example                     # API key template
├── src/
│   ├── main/                        # Electron main process
│   │   ├── index.js                 # App lifecycle, tray, global shortcuts
│   │   ├── ipc-handlers.js          # IPC bridge between main & renderer
│   │   ├── audio-recorder.js        # Mic capture and WAV encoding
│   │   ├── services/
│   │   │   ├── whisper.js           # Whisper API STT service
│   │   │   ├── prompt-engine.js     # Prompt optimization via Claude/OpenAI
│   │   │   ├── llm-dispatch.js      # Send prompts to ChatGPT/Claude
│   │   │   └── database.js          # SQLite setup, migrations, queries
│   │   └── preload.js               # Context bridge for renderer
│   ├── renderer/                    # React frontend
│   │   ├── index.html               # HTML entry
│   │   ├── index.jsx                # React root
│   │   ├── App.jsx                  # Main app component + routing
│   │   ├── styles/
│   │   │   └── global.css           # Tailwind imports + custom styles
│   │   ├── components/
│   │   │   ├── Overlay.jsx          # Main floating overlay bar
│   │   │   ├── RecordingIndicator.jsx
│   │   │   ├── PromptCard.jsx       # Displays optimized prompt with actions
│   │   │   ├── HistoryPanel.jsx     # Prompt history list
│   │   │   ├── SettingsPanel.jsx    # API keys, hotkey, theme config
│   │   │   └── ThemeToggle.jsx      # Dark/light mode switch
│   │   ├── hooks/
│   │   │   ├── useRecording.js      # Recording state management
│   │   │   └── usePrompts.js        # Prompt CRUD via IPC
│   │   └── lib/
│   │       └── ipc.js               # Renderer-side IPC helpers
│   └── shared/
│       └── constants.js             # Shared constants (categories, defaults)
└── tests/
    ├── main/
    │   ├── whisper.test.js
    │   ├── prompt-engine.test.js
    │   ├── llm-dispatch.test.js
    │   └── database.test.js
    └── renderer/
        └── components/
            └── Overlay.test.jsx
```

---

## Chunk 1: Project Scaffold & Electron Shell

### Task 1: Initialize project with Electron Forge + React

**Files:**
- Create: `package.json`
- Create: `forge.config.js`
- Create: `src/main/index.js`
- Create: `src/main/preload.js`
- Create: `src/renderer/index.html`
- Create: `src/renderer/index.jsx`
- Create: `src/renderer/App.jsx`

- [ ] **Step 1: Initialize npm project and install dependencies**

```bash
cd /Users/lotsofsocks/Development/verbyprompt
npm init -y
npm install --save-dev @electron-forge/cli @electron-forge/maker-dmg @electron-forge/maker-zip @electron-forge/plugin-vite
npm install --save-dev electron vite @vitejs/plugin-react
npm install react react-dom
npm install --save-dev tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Create forge.config.js**

```js
// forge.config.js
const { VitePlugin } = require('@electron-forge/plugin-vite');

module.exports = {
  packagerConfig: {
    name: 'VerbyPrompt',
    icon: './assets/icon',
    asar: true,
  },
  makers: [
    { name: '@electron-forge/maker-zip' },
    { name: '@electron-forge/maker-dmg' },
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.js', config: 'vite.main.config.mjs' },
        { entry: 'src/main/preload.js', config: 'vite.preload.config.mjs' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.mjs' },
      ],
    }),
  ],
};
```

- [ ] **Step 3: Create Vite configs**

Create `vite.main.config.mjs`, `vite.preload.config.mjs`, `vite.renderer.config.mjs` for Electron Forge's Vite plugin.

- [ ] **Step 4: Create main process entry**

```js
// src/main/index.js
const { app, BrowserWindow, globalShortcut, Tray, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 680,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  mainWindow.on('blur', () => mainWindow.hide());
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('VerbyPrompt');
  tray.on('click', () => toggleWindow());
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.center();
    mainWindow.show();
    mainWindow.focus();
  }
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    toggleWindow();
    mainWindow.webContents.send('toggle-recording');
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', (e) => e.preventDefault());
```

- [ ] **Step 5: Create preload script**

```js
// src/main/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('verby', {
  onToggleRecording: (cb) => ipcRenderer.on('toggle-recording', cb),
  sendAudio: (buffer) => ipcRenderer.invoke('send-audio', buffer),
  optimizePrompt: (text, category) => ipcRenderer.invoke('optimize-prompt', text, category),
  sendToLLM: (prompt, provider) => ipcRenderer.invoke('send-to-llm', prompt, provider),
  getHistory: () => ipcRenderer.invoke('get-history'),
  savePrompt: (data) => ipcRenderer.invoke('save-prompt', data),
  toggleFavorite: (id) => ipcRenderer.invoke('toggle-favorite', id),
  deletePrompt: (id) => ipcRenderer.invoke('delete-prompt', id),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', key, value),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
});
```

- [ ] **Step 6: Create renderer entry files**

```html
<!-- src/renderer/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>VerbyPrompt</title>
</head>
<body class="bg-transparent">
  <div id="root"></div>
  <script type="module" src="./index.jsx"></script>
</body>
</html>
```

```jsx
// src/renderer/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

createRoot(document.getElementById('root')).render(<App />);
```

```jsx
// src/renderer/App.jsx
import React, { useState } from 'react';
import Overlay from './components/Overlay';

export default function App() {
  return (
    <div className="h-screen w-screen bg-transparent flex items-center justify-center">
      <Overlay />
    </div>
  );
}
```

- [ ] **Step 7: Create Tailwind global CSS**

```css
/* src/renderer/styles/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #0a0a0a;
  --bg-glass: rgba(20, 20, 20, 0.85);
  --accent: #7c5cfc;
  --accent-glow: rgba(124, 92, 252, 0.3);
  --text-primary: #f5f5f5;
  --text-secondary: #888;
  --border: rgba(255, 255, 255, 0.08);
}

.light {
  --bg-primary: #ffffff;
  --bg-glass: rgba(255, 255, 255, 0.85);
  --accent: #6d4aff;
  --accent-glow: rgba(109, 74, 255, 0.2);
  --text-primary: #111;
  --text-secondary: #666;
  --border: rgba(0, 0, 0, 0.08);
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', sans-serif;
  -webkit-font-smoothing: antialiased;
  background: transparent;
  user-select: none;
  -webkit-app-region: no-drag;
}
```

- [ ] **Step 8: Create tailwind.config.js**

```js
// tailwind.config.js
module.exports = {
  content: ['./src/renderer/**/*.{html,jsx,js}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: 'var(--accent)',
        'bg-primary': 'var(--bg-primary)',
        'bg-glass': 'var(--bg-glass)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 9: Verify the app launches**

```bash
npx electron-forge start
```

Expected: Electron window opens (transparent, frameless). Tray icon appears. Cmd+Shift+Space toggles window.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Electron + React + Tailwind project"
```

---

## Chunk 2: Audio Capture & Whisper STT

### Task 2: Audio recording from microphone

**Files:**
- Create: `src/renderer/hooks/useRecording.js`
- Create: `src/renderer/components/RecordingIndicator.jsx`

- [ ] **Step 1: Create useRecording hook**

```jsx
// src/renderer/hooks/useRecording.js
import { useState, useRef, useCallback } from 'react';

export default function useRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    chunks.current = [];

    mediaRecorder.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.current.push(e.data);
    };

    mediaRecorder.current.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      setAudioBlob(blob);
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) stopRecording();
    else startRecording();
  }, [isRecording, startRecording, stopRecording]);

  return { isRecording, audioBlob, toggleRecording, startRecording, stopRecording };
}
```

- [ ] **Step 2: Create RecordingIndicator component**

```jsx
// src/renderer/components/RecordingIndicator.jsx
import React from 'react';

export default function RecordingIndicator({ isRecording }) {
  if (!isRecording) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
      </span>
      <span className="text-sm text-red-400 font-medium">Listening...</span>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add audio recording hook and indicator"
```

### Task 3: Whisper API transcription service

**Files:**
- Create: `src/main/services/whisper.js`
- Create: `src/main/ipc-handlers.js`
- Create: `tests/main/whisper.test.js`
- Create: `.env.example`

- [ ] **Step 1: Install OpenAI SDK**

```bash
npm install openai dotenv
```

- [ ] **Step 2: Create .env.example**

```
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
DEFAULT_PROVIDER=claude
```

- [ ] **Step 3: Create Whisper service**

```js
// src/main/services/whisper.js
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');

class WhisperService {
  constructor(apiKey) {
    this.client = new OpenAI({ apiKey });
  }

  async transcribe(audioBuffer) {
    const tmpPath = path.join(os.tmpdir(), `verby-${Date.now()}.webm`);
    fs.writeFileSync(tmpPath, Buffer.from(audioBuffer));

    try {
      const transcription = await this.client.audio.transcriptions.create({
        model: 'whisper-1',
        file: fs.createReadStream(tmpPath),
        response_format: 'text',
      });
      return transcription.trim();
    } finally {
      fs.unlinkSync(tmpPath);
    }
  }
}

module.exports = WhisperService;
```

- [ ] **Step 4: Write test for Whisper service**

```js
// tests/main/whisper.test.js
const WhisperService = require('../../src/main/services/whisper');

// Integration test — requires OPENAI_API_KEY
// Run with: OPENAI_API_KEY=sk-xxx npx jest tests/main/whisper.test.js
describe('WhisperService', () => {
  test('constructor creates client', () => {
    const svc = new WhisperService('test-key');
    expect(svc.client).toBeDefined();
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Whisper STT service"
```

---

## Chunk 3: Prompt Optimization Engine

### Task 4: Build the prompt engine

**Files:**
- Create: `src/main/services/prompt-engine.js`
- Create: `src/shared/constants.js`
- Create: `tests/main/prompt-engine.test.js`

- [ ] **Step 1: Create shared constants**

```js
// src/shared/constants.js
const CATEGORIES = {
  GENERAL: 'general',
  BUSINESS: 'business',
  CODING: 'coding',
  MARKETING: 'marketing',
  AUTOMATION: 'automation',
};

const PROVIDERS = {
  CLAUDE: 'claude',
  OPENAI: 'openai',
};

module.exports = { CATEGORIES, PROVIDERS };
```

- [ ] **Step 2: Create prompt engine with meta-prompt**

```js
// src/main/services/prompt-engine.js
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { CATEGORIES, PROVIDERS } = require('../../shared/constants');

const SYSTEM_PROMPT = `You are VerbyPrompt — an expert prompt engineer. Your job is to take raw, messy speech transcriptions and transform them into perfectly structured AI prompts.

RULES:
1. Detect the user's intent from their raw speech
2. Determine the best category: general, business, coding, marketing, or automation
3. Rewrite into a structured prompt that includes:
   - An appropriate role assignment ("You are an expert...")
   - A clear, specific task definition
   - Relevant constraints or requirements
   - A specified output format when helpful
4. Preserve the user's actual goal — don't change what they want, just express it better
5. Remove filler words, false starts, and verbal tics
6. Add context and specificity that makes the prompt more effective
7. Keep it concise — don't pad with unnecessary instructions

OUTPUT FORMAT:
Return ONLY the optimized prompt text. No explanation, no preamble, no markdown wrapping.

EXAMPLES:

Input: "uh help me make money online with no experience"
Output: You are an expert business strategist. Provide a step-by-step plan for a complete beginner to start making money online. Include specific platforms, tools, and actionable first steps. Focus on low-cost, scalable methods that don't require prior experience. Organize by time investment: quick wins (1-2 hours/day) vs. long-term plays.

Input: "write me a python script that like scrapes some websites or whatever"
Output: You are a senior Python developer. Write a clean, well-documented Python web scraping script using the requests and BeautifulSoup libraries. The script should: accept a URL as input, extract all text content and links, handle common errors (timeouts, 404s, rate limiting), and output results as structured JSON. Include a requirements.txt and usage example.

Input: "I need to email my team about the deadline change"
Output: You are a professional communications expert. Draft a clear, concise email to a team informing them of a deadline change. The tone should be direct but empathetic. Include: the original deadline, the new deadline, the reason for the change, any adjusted expectations, and a clear call to action. Keep it under 200 words.`;

class PromptEngine {
  constructor({ anthropicKey, openaiKey, defaultProvider = PROVIDERS.CLAUDE }) {
    this.defaultProvider = defaultProvider;
    if (anthropicKey) {
      this.anthropic = new Anthropic({ apiKey: anthropicKey });
    }
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  async optimize(rawText, { category = CATEGORIES.GENERAL, provider } = {}) {
    const useProvider = provider || this.defaultProvider;
    const userMessage = category !== CATEGORIES.GENERAL
      ? `[Category: ${category}]\n\n${rawText}`
      : rawText;

    if (useProvider === PROVIDERS.CLAUDE && this.anthropic) {
      return this._optimizeWithClaude(userMessage);
    }
    if (useProvider === PROVIDERS.OPENAI && this.openai) {
      return this._optimizeWithOpenAI(userMessage);
    }
    throw new Error(`Provider "${useProvider}" not configured`);
  }

  async _optimizeWithClaude(userMessage) {
    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });
    return response.content[0].text.trim();
  }

  async _optimizeWithOpenAI(userMessage) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
    return response.choices[0].message.content.trim();
  }
}

module.exports = PromptEngine;
```

- [ ] **Step 3: Write test**

```js
// tests/main/prompt-engine.test.js
const PromptEngine = require('../../src/main/services/prompt-engine');

describe('PromptEngine', () => {
  test('constructor sets provider', () => {
    const engine = new PromptEngine({ anthropicKey: 'test', defaultProvider: 'claude' });
    expect(engine.defaultProvider).toBe('claude');
  });

  test('throws when provider not configured', async () => {
    const engine = new PromptEngine({});
    await expect(engine.optimize('test')).rejects.toThrow('not configured');
  });
});
```

- [ ] **Step 4: Install Anthropic SDK**

```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add prompt optimization engine with Claude/OpenAI"
```

---

## Chunk 4: LLM Dispatch & Database

### Task 5: LLM dispatch service (send optimized prompts to LLMs)

**Files:**
- Create: `src/main/services/llm-dispatch.js`
- Create: `tests/main/llm-dispatch.test.js`

- [ ] **Step 1: Create LLM dispatch service**

```js
// src/main/services/llm-dispatch.js
const Anthropic = require('@anthropic-ai/sdk');
const OpenAI = require('openai');
const { PROVIDERS } = require('../../shared/constants');

class LLMDispatch {
  constructor({ anthropicKey, openaiKey }) {
    if (anthropicKey) this.anthropic = new Anthropic({ apiKey: anthropicKey });
    if (openaiKey) this.openai = new OpenAI({ apiKey: openaiKey });
  }

  async send(prompt, provider = PROVIDERS.CLAUDE) {
    if (provider === PROVIDERS.CLAUDE && this.anthropic) {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.content[0].text;
    }

    if (provider === PROVIDERS.OPENAI && this.openai) {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      });
      return response.choices[0].message.content;
    }

    throw new Error(`Provider "${provider}" not configured`);
  }
}

module.exports = LLMDispatch;
```

- [ ] **Step 2: Write test**

```js
// tests/main/llm-dispatch.test.js
const LLMDispatch = require('../../src/main/services/llm-dispatch');

describe('LLMDispatch', () => {
  test('throws when provider not configured', async () => {
    const dispatch = new LLMDispatch({});
    await expect(dispatch.send('test', 'claude')).rejects.toThrow('not configured');
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add LLM dispatch service"
```

### Task 6: SQLite database for prompt history

**Files:**
- Create: `src/main/services/database.js`
- Create: `tests/main/database.test.js`

- [ ] **Step 1: Install better-sqlite3**

```bash
npm install better-sqlite3
npm install --save-dev electron-rebuild
npx electron-rebuild -f -w better-sqlite3
```

- [ ] **Step 2: Create database service**

```js
// src/main/services/database.js
const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

class PromptDB {
  constructor(dbPath) {
    const defaultPath = dbPath || path.join(app.getPath('userData'), 'verbyprompt.db');
    this.db = new Database(defaultPath);
    this.db.pragma('journal_mode = WAL');
    this._migrate();
  }

  _migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_transcript TEXT NOT NULL,
        optimized_prompt TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prompt_tags (
        prompt_id INTEGER REFERENCES prompts(id) ON DELETE CASCADE,
        tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (prompt_id, tag_id)
      );
    `);
  }

  savePrompt({ rawTranscript, optimizedPrompt, category }) {
    const stmt = this.db.prepare(
      'INSERT INTO prompts (raw_transcript, optimized_prompt, category) VALUES (?, ?, ?)'
    );
    const result = stmt.run(rawTranscript, optimizedPrompt, category || 'general');
    return result.lastInsertRowid;
  }

  getHistory(limit = 50, offset = 0) {
    return this.db.prepare(
      'SELECT * FROM prompts ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(limit, offset);
  }

  searchPrompts(query) {
    return this.db.prepare(
      "SELECT * FROM prompts WHERE optimized_prompt LIKE ? OR raw_transcript LIKE ? ORDER BY created_at DESC"
    ).all(`%${query}%`, `%${query}%`);
  }

  toggleFavorite(id) {
    this.db.prepare('UPDATE prompts SET is_favorite = NOT is_favorite WHERE id = ?').run(id);
    return this.db.prepare('SELECT * FROM prompts WHERE id = ?').get(id);
  }

  deletePrompt(id) {
    this.db.prepare('DELETE FROM prompts WHERE id = ?').run(id);
  }

  addTag(promptId, tagName) {
    const tag = this.db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(tagName);
    const tagId = tag.lastInsertRowid || this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName).id;
    this.db.prepare('INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)').run(promptId, tagId);
  }

  getTagsForPrompt(promptId) {
    return this.db.prepare(
      'SELECT t.name FROM tags t JOIN prompt_tags pt ON t.id = pt.tag_id WHERE pt.prompt_id = ?'
    ).all(promptId).map(r => r.name);
  }

  close() {
    this.db.close();
  }
}

module.exports = PromptDB;
```

- [ ] **Step 3: Write test**

```js
// tests/main/database.test.js
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// Test with raw better-sqlite3 to avoid Electron app dependency
describe('PromptDB schema', () => {
  let db;
  const dbPath = path.join(os.tmpdir(), `verby-test-${Date.now()}.db`);

  beforeAll(() => {
    db = new Database(dbPath);
    db.exec(`
      CREATE TABLE IF NOT EXISTS prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        raw_transcript TEXT NOT NULL,
        optimized_prompt TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        is_favorite INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
  });

  afterAll(() => {
    db.close();
    fs.unlinkSync(dbPath);
  });

  test('insert and retrieve prompt', () => {
    db.prepare('INSERT INTO prompts (raw_transcript, optimized_prompt) VALUES (?, ?)').run('raw', 'optimized');
    const row = db.prepare('SELECT * FROM prompts WHERE id = 1').get();
    expect(row.raw_transcript).toBe('raw');
    expect(row.optimized_prompt).toBe('optimized');
  });

  test('toggle favorite', () => {
    db.prepare('UPDATE prompts SET is_favorite = NOT is_favorite WHERE id = 1').run();
    const row = db.prepare('SELECT is_favorite FROM prompts WHERE id = 1').get();
    expect(row.is_favorite).toBe(1);
  });
});
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add SQLite database for prompt history"
```

---

## Chunk 5: IPC Handlers (Wire Everything Together)

### Task 7: Create IPC handlers connecting main process to renderer

**Files:**
- Create: `src/main/ipc-handlers.js`
- Modify: `src/main/index.js` (add IPC handler registration)

- [ ] **Step 1: Create IPC handlers**

```js
// src/main/ipc-handlers.js
const { ipcMain, clipboard } = require('electron');
const WhisperService = require('./services/whisper');
const PromptEngine = require('./services/prompt-engine');
const LLMDispatch = require('./services/llm-dispatch');
const PromptDB = require('./services/database');

let whisper, engine, dispatch, db;

function initServices(settings) {
  const openaiKey = settings.openaiKey || process.env.OPENAI_API_KEY;
  const anthropicKey = settings.anthropicKey || process.env.ANTHROPIC_API_KEY;
  const defaultProvider = settings.defaultProvider || process.env.DEFAULT_PROVIDER || 'claude';

  whisper = new WhisperService(openaiKey);
  engine = new PromptEngine({ anthropicKey, openaiKey, defaultProvider });
  dispatch = new LLMDispatch({ anthropicKey, openaiKey });
  db = new PromptDB();
}

function registerHandlers(mainWindow) {
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
}

module.exports = { registerHandlers };
```

- [ ] **Step 2: Update main/index.js to register IPC handlers**

Add after `createWindow()`:

```js
const { registerHandlers } = require('./ipc-handlers');
// ... inside app.whenReady():
registerHandlers(mainWindow);
```

- [ ] **Step 3: Create renderer IPC helper**

```js
// src/renderer/lib/ipc.js
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
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire IPC handlers connecting services to renderer"
```

---

## Chunk 6: UI — Overlay, Prompt Card, History

### Task 8: Build the main Overlay component

**Files:**
- Create: `src/renderer/components/Overlay.jsx`
- Create: `src/renderer/components/PromptCard.jsx`
- Create: `src/renderer/hooks/usePrompts.js`

- [ ] **Step 1: Create usePrompts hook**

```jsx
// src/renderer/hooks/usePrompts.js
import { useState, useCallback } from 'react';
import { optimizePrompt, getHistory, toggleFavorite, deletePrompt, copyToClipboard, sendToLLM } from '../lib/ipc';

export default function usePrompts() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    const data = await getHistory();
    setHistory(data);
  }, []);

  const optimize = useCallback(async (rawText, category) => {
    setLoading(true);
    try {
      const result = await optimizePrompt(rawText, category);
      await loadHistory();
      return result;
    } finally {
      setLoading(false);
    }
  }, [loadHistory]);

  const toggleFav = useCallback(async (id) => {
    await toggleFavorite(id);
    await loadHistory();
  }, [loadHistory]);

  const remove = useCallback(async (id) => {
    await deletePrompt(id);
    await loadHistory();
  }, [loadHistory]);

  const copy = useCallback((text) => copyToClipboard(text), []);

  const sendLLM = useCallback(async (prompt, provider) => {
    setLoading(true);
    try {
      return await sendToLLM(prompt, provider);
    } finally {
      setLoading(false);
    }
  }, []);

  return { history, loading, loadHistory, optimize, toggleFav, remove, copy, sendLLM };
}
```

- [ ] **Step 2: Create PromptCard component**

```jsx
// src/renderer/components/PromptCard.jsx
import React, { useState } from 'react';

export default function PromptCard({ prompt, onCopy, onSendLLM, onToggleFav, onDelete }) {
  const [llmResponse, setLlmResponse] = useState(null);
  const [sending, setSending] = useState(false);

  const handleSend = async (provider) => {
    setSending(true);
    const response = await onSendLLM(prompt.optimized_prompt, provider);
    setLlmResponse(response);
    setSending(false);
  };

  return (
    <div className="rounded-2xl p-4 mb-3 border transition-all duration-200"
      style={{
        background: 'var(--bg-glass)',
        borderColor: 'var(--border)',
        backdropFilter: 'blur(20px)',
      }}>
      {/* Raw transcript */}
      <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
        "{prompt.raw_transcript}"
      </p>

      {/* Optimized prompt */}
      <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
        {prompt.optimized_prompt || prompt}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCopy(prompt.optimized_prompt)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Copy
        </button>
        <button
          onClick={() => handleSend('claude')}
          disabled={sending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {sending ? '...' : 'Send to Claude'}
        </button>
        <button
          onClick={() => handleSend('openai')}
          disabled={sending}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        >
          {sending ? '...' : 'Send to GPT'}
        </button>
        <button
          onClick={() => onToggleFav(prompt.id)}
          className="ml-auto text-lg"
        >
          {prompt.is_favorite ? '★' : '☆'}
        </button>
      </div>

      {/* LLM Response */}
      {llmResponse && (
        <div className="mt-3 p-3 rounded-xl text-sm leading-relaxed"
          style={{ background: 'rgba(124, 92, 252, 0.1)', color: 'var(--text-primary)' }}>
          {llmResponse}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Build the main Overlay component**

```jsx
// src/renderer/components/Overlay.jsx
import React, { useState, useEffect, useCallback } from 'react';
import RecordingIndicator from './RecordingIndicator';
import PromptCard from './PromptCard';
import useRecording from '../hooks/useRecording';
import usePrompts from '../hooks/usePrompts';
import { transcribeAudio, onToggleRecording } from '../lib/ipc';

const CATEGORIES = ['general', 'business', 'coding', 'marketing', 'automation'];

export default function Overlay() {
  const { isRecording, audioBlob, toggleRecording } = useRecording();
  const { history, loading, loadHistory, optimize, toggleFav, remove, copy, sendLLM } = usePrompts();
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [category, setCategory] = useState('general');
  const [view, setView] = useState('main'); // main | history
  const [status, setStatus] = useState('idle'); // idle | recording | transcribing | optimizing

  useEffect(() => {
    onToggleRecording(() => toggleRecording());
  }, [toggleRecording]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // When recording stops and we have audio, process it
  useEffect(() => {
    if (!audioBlob) return;

    const process = async () => {
      setStatus('transcribing');
      const arrayBuffer = await audioBlob.arrayBuffer();
      const raw = await transcribeAudio(arrayBuffer);
      setTranscript(raw);

      setStatus('optimizing');
      const result = await optimize(raw, category);
      setCurrentPrompt({ ...result, raw_transcript: raw, optimized_prompt: result.optimized });
      setStatus('idle');
    };

    process().catch((err) => {
      console.error(err);
      setStatus('idle');
    });
  }, [audioBlob, category, optimize]);

  return (
    <div className="w-[640px] max-h-[480px] rounded-3xl overflow-hidden"
      style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(40px)',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
          <span className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            VerbyPrompt
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setView(view === 'main' ? 'history' : 'main')}
            className="px-2 py-1 rounded-md text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {view === 'main' ? 'History' : 'Back'}
          </button>
        </div>
      </div>

      {view === 'main' ? (
        <div className="p-5">
          {/* Category selector */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-2.5 py-1 rounded-full text-xs font-medium capitalize transition-all"
                style={{
                  background: category === cat ? 'var(--accent)' : 'transparent',
                  color: category === cat ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${category === cat ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Record button / Status */}
          <div className="flex items-center justify-center mb-4">
            {status === 'idle' && !currentPrompt && (
              <button
                onClick={toggleRecording}
                className="group flex items-center gap-3 px-6 py-3 rounded-2xl transition-all duration-200"
                style={{
                  background: isRecording ? 'rgba(239,68,68,0.15)' : 'rgba(124,92,252,0.1)',
                  border: `1px solid ${isRecording ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                }}
              >
                {isRecording ? (
                  <RecordingIndicator isRecording={true} />
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Click or press ⌘⇧Space to speak
                    </span>
                  </>
                )}
              </button>
            )}

            {status === 'transcribing' && (
              <p className="text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
                Transcribing...
              </p>
            )}

            {status === 'optimizing' && (
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  "{transcript}"
                </p>
                <p className="text-sm animate-pulse" style={{ color: 'var(--accent)' }}>
                  Optimizing prompt...
                </p>
              </div>
            )}
          </div>

          {/* Current prompt result */}
          {currentPrompt && status === 'idle' && (
            <div>
              <PromptCard
                prompt={currentPrompt}
                onCopy={copy}
                onSendLLM={sendLLM}
                onToggleFav={toggleFav}
                onDelete={remove}
              />
              <button
                onClick={() => { setCurrentPrompt(null); setTranscript(''); }}
                className="w-full py-2 text-xs rounded-xl mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                New prompt
              </button>
            </div>
          )}
        </div>
      ) : (
        /* History view */
        <div className="p-5 overflow-y-auto max-h-[380px]">
          {history.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>
              No prompts yet. Start speaking!
            </p>
          ) : (
            history.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                onCopy={copy}
                onSendLLM={sendLLM}
                onToggleFav={toggleFav}
                onDelete={remove}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: build overlay UI with recording, prompt display, and history"
```

---

## Chunk 7: Settings Panel & Theme Toggle

### Task 9: Settings panel and dark/light mode

**Files:**
- Create: `src/renderer/components/SettingsPanel.jsx`
- Create: `src/renderer/components/ThemeToggle.jsx`
- Modify: `src/renderer/App.jsx` (add settings view)
- Modify: `src/main/ipc-handlers.js` (add settings handlers)

- [ ] **Step 1: Install electron-store**

```bash
npm install electron-store
```

- [ ] **Step 2: Add settings IPC handlers to ipc-handlers.js**

Add to `registerHandlers`:

```js
const Store = require('electron-store');
const store = new Store({ name: 'verbyprompt-settings' });

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
```

- [ ] **Step 3: Create ThemeToggle component**

```jsx
// src/renderer/components/ThemeToggle.jsx
import React from 'react';

export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="p-1.5 rounded-lg transition-colors"
      style={{ color: 'var(--text-secondary)' }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? '☀' : '☾'}
    </button>
  );
}
```

- [ ] **Step 4: Create SettingsPanel component**

```jsx
// src/renderer/components/SettingsPanel.jsx
import React, { useState, useEffect } from 'react';

export default function SettingsPanel({ onBack }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    window.verby.getSettings().then(setSettings);
  }, []);

  const update = (key, value) => {
    setSettings((s) => ({ ...s, [key]: value }));
    window.verby.setSetting(key, value);
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Settings</h2>
        <button onClick={onBack} className="text-xs" style={{ color: 'var(--text-secondary)' }}>Back</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            OpenAI API Key
          </label>
          <input
            type="password"
            value={settings.openaiKey || ''}
            onChange={(e) => update('openaiKey', e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Anthropic API Key
          </label>
          <input
            type="password"
            value={settings.anthropicKey || ''}
            onChange={(e) => update('anthropicKey', e.target.value)}
            placeholder="sk-ant-..."
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Default AI Provider
          </label>
          <div className="flex gap-2">
            {['claude', 'openai'].map((p) => (
              <button
                key={p}
                onClick={() => update('defaultProvider', p)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize"
                style={{
                  background: settings.defaultProvider === p ? 'var(--accent)' : 'transparent',
                  color: settings.defaultProvider === p ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${settings.defaultProvider === p ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
            Global Hotkey
          </label>
          <input
            type="text"
            value={settings.hotkey || ''}
            onChange={(e) => update('hotkey', e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Restart app after changing hotkey
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Update App.jsx with theme and settings routing**

```jsx
// src/renderer/App.jsx
import React, { useState, useEffect } from 'react';
import Overlay from './components/Overlay';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [view, setView] = useState('main');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    window.verby.getSettings().then((s) => {
      if (s.theme) setTheme(s.theme);
    });
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.verby.setSetting('theme', next);
  };

  return (
    <div className={`h-screen w-screen bg-transparent flex items-center justify-center ${theme === 'light' ? 'light' : ''}`}>
      {view === 'main' && (
        <Overlay
          onOpenSettings={() => setView('settings')}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
      {view === 'settings' && (
        <div className="w-[640px] rounded-3xl overflow-hidden"
          style={{
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(40px)',
            border: '1px solid var(--border)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
          }}>
          <SettingsPanel onBack={() => setView('main')} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add settings panel, theme toggle, and electron-store"
```

---

## Chunk 8: Polish, .env, & README

### Task 10: Final wiring, env template, and setup instructions

**Files:**
- Create: `.env.example`
- Create: `.gitignore`
- Modify: `package.json` (add scripts)

- [ ] **Step 1: Create .gitignore**

```
node_modules/
dist/
out/
.env
*.db
.DS_Store
```

- [ ] **Step 2: Create .env.example**

```
# VerbyPrompt Configuration
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
DEFAULT_PROVIDER=claude
```

- [ ] **Step 3: Verify package.json scripts**

Ensure these scripts exist:
```json
{
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make",
    "test": "jest"
  }
}
```

- [ ] **Step 4: Run the full app and verify**

```bash
cd /Users/lotsofsocks/Development/verbyprompt
npm start
```

Expected:
- Electron window opens with VerbyPrompt overlay
- Cmd+Shift+Space toggles the window
- Tray icon appears
- Category pills are clickable
- Recording button starts mic capture
- Settings panel accessible

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: finalize VerbyPrompt v0.1 — voice-to-prompt desktop app"
```
