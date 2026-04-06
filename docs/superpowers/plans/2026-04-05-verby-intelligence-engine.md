# Verby Intelligence Engine — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Verby's static prompt generation with an adaptive intelligence engine that uses keyword signals, a memory graph, and dynamic system prompt assembly to produce contextually rich outputs from vague user input.

**Architecture:** Hybrid Signal + LLM Fallback. A local keyword scanner runs first (<1ms, no API call). If signals match, they set the generation mode and pull targeted context. If nothing matches, the LLM classifies with broad context. All behind a feature flag — existing pipeline untouched until toggled on.

**Tech Stack:** Electron 33, Better SQLite3, React 18, Tailwind CSS, OpenAI/Anthropic APIs

**Spec:** `docs/superpowers/specs/2026-04-05-verby-intelligence-engine-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| New: `src/main/memory.cjs` | SQLite table creation for entities/relationships/output_preferences, CRUD methods, entity extraction, relationship inference |
| New: `src/main/signals.cjs` | Signal registry (built-in + learned + custom), scanner function, hint merging |
| New: `src/main/context-assembler.cjs` | Dynamic system prompt construction from modular sections and format templates |
| New: `src/main/intelligence-engine.cjs` | Unified `generate()` pipeline — orchestrates signals → context → LLM → post-learning |
| Modify: `src/main/ipc-handlers.cjs` | Register new IPC handlers for intelligence engine, memory inspector, wire up feature flag |
| Modify: `src/main/preload.js` | Expose new IPC methods to renderer (generate, memory inspector, etc.) |
| Modify: `src/renderer/lib/ipc.js` | Add safe wrappers for new preload methods |
| Modify: `src/renderer/components/Overlay.jsx` | Wire chat input to new engine when flag is on, add format override |
| Modify: `src/renderer/components/SettingsPanel.jsx` | Intelligence engine toggle, custom signals config |
| New: `src/renderer/components/MemoryInspector.jsx` | Dev panel showing entities, signals fired, context assembled |

---

## Task 1: Memory System — SQLite Tables

**Files:**
- Create: `src/main/memory.cjs`
- Modify: `src/main/ipc-handlers.cjs:559-596` (call memory init alongside existing table creation)

- [ ] **Step 1: Create `src/main/memory.cjs` with table initialization**

```javascript
// src/main/memory.cjs
'use strict';

let db = null;

function initMemoryTables(database) {
  db = database;

  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'unknown',
      metadata TEXT DEFAULT '{}',
      mention_count INTEGER DEFAULT 1,
      last_referenced TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      verb TEXT NOT NULL,
      object_id INTEGER NOT NULL,
      confidence REAL DEFAULT 0.5,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (subject_id) REFERENCES entities(id),
      FOREIGN KEY (object_id) REFERENCES entities(id),
      UNIQUE(subject_id, verb, object_id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS output_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      context_pattern TEXT NOT NULL UNIQUE,
      preferred_format TEXT DEFAULT 'prompt',
      preferred_tone TEXT DEFAULT 'professional',
      preferred_detail TEXT DEFAULT 'medium',
      success_count INTEGER DEFAULT 0,
      reject_count INTEGER DEFAULT 0,
      last_used TEXT DEFAULT (datetime('now'))
    )
  `);
}

module.exports = { initMemoryTables };
```

- [ ] **Step 2: Wire memory init into existing database setup**

In `src/main/ipc-handlers.cjs`, after the existing table creation block (around line 595), add the memory initialization call:

```javascript
// Add at top of file with other requires
const { initMemoryTables } = require('./memory.cjs');

// Add after line 595 (after CREATE TABLE usage)
initMemoryTables(database);
```

- [ ] **Step 3: Verify app starts without errors**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`
Expected: App launches normally, no SQLite errors. Check dev console (Cmd+Option+I) for any errors.

- [ ] **Step 4: Commit**

```bash
git add src/main/memory.cjs src/main/ipc-handlers.cjs
git commit -m "feat: add memory system SQLite tables (entities, relationships, output_preferences)"
```

---

## Task 2: Memory System — CRUD Methods

**Files:**
- Modify: `src/main/memory.cjs`

- [ ] **Step 1: Add entity CRUD methods to `memory.cjs`**

Append after `initMemoryTables`:

```javascript
const memory = {
  // --- Entities ---
  upsertEntity(name, type, metadata = {}) {
    const existing = db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
    if (existing) {
      db.prepare(`
        UPDATE entities
        SET mention_count = mention_count + 1,
            last_referenced = datetime('now'),
            type = CASE WHEN type = 'unknown' THEN ? ELSE type END,
            metadata = json_patch(metadata, ?)
        WHERE name = ?
      `).run(type, JSON.stringify(metadata), name);
      return db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
    }
    db.prepare(`
      INSERT INTO entities (name, type, metadata)
      VALUES (?, ?, ?)
    `).run(name, type, JSON.stringify(metadata));
    return db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
  },

  getEntity(name) {
    return db.prepare('SELECT * FROM entities WHERE name = ?').get(name);
  },

  getTopEntities(limit = 10) {
    return db.prepare(`
      SELECT * FROM entities
      ORDER BY mention_count DESC, last_referenced DESC
      LIMIT ?
    `).all(limit);
  },

  getEntitiesByType(type) {
    return db.prepare('SELECT * FROM entities WHERE type = ?').all(type);
  },

  // --- Relationships ---
  upsertRelationship(subjectId, verb, objectId) {
    const existing = db.prepare(
      'SELECT * FROM relationships WHERE subject_id = ? AND verb = ? AND object_id = ?'
    ).get(subjectId, verb, objectId);
    if (existing) {
      const newConfidence = Math.min(1.0, existing.confidence + 0.1);
      db.prepare(
        'UPDATE relationships SET confidence = ? WHERE id = ?'
      ).run(newConfidence, existing.id);
      return;
    }
    db.prepare(`
      INSERT INTO relationships (subject_id, verb, object_id)
      VALUES (?, ?, ?)
    `).run(subjectId, verb, objectId);
  },

  getRelationshipsFor(entityId) {
    return db.prepare(`
      SELECT r.*, e1.name as subject_name, e2.name as object_name
      FROM relationships r
      JOIN entities e1 ON r.subject_id = e1.id
      JOIN entities e2 ON r.object_id = e2.id
      WHERE r.subject_id = ? OR r.object_id = ?
      ORDER BY r.confidence DESC
    `).all(entityId, entityId);
  },

  // --- Output Preferences ---
  recordPreference(contextPattern, format, tone, detail) {
    const existing = db.prepare(
      'SELECT * FROM output_preferences WHERE context_pattern = ?'
    ).get(contextPattern);
    if (existing) {
      db.prepare(`
        UPDATE output_preferences
        SET preferred_format = ?, preferred_tone = ?, preferred_detail = ?,
            last_used = datetime('now')
        WHERE context_pattern = ?
      `).run(format, tone, detail, contextPattern);
      return;
    }
    db.prepare(`
      INSERT INTO output_preferences (context_pattern, preferred_format, preferred_tone, preferred_detail)
      VALUES (?, ?, ?, ?)
    `).run(contextPattern, format, tone, detail);
  },

  recordSuccess(contextPattern) {
    db.prepare(`
      UPDATE output_preferences
      SET success_count = success_count + 1, last_used = datetime('now')
      WHERE context_pattern = ?
    `).run(contextPattern);
  },

  recordReject(contextPattern) {
    db.prepare(`
      UPDATE output_preferences
      SET reject_count = reject_count + 1, last_used = datetime('now')
      WHERE context_pattern = ?
    `).run(contextPattern);
  },

  getPreference(contextPattern) {
    return db.prepare(
      'SELECT * FROM output_preferences WHERE context_pattern = ?'
    ).get(contextPattern);
  },

  getTopPreferences(limit = 5) {
    return db.prepare(`
      SELECT * FROM output_preferences
      ORDER BY success_count DESC, last_used DESC
      LIMIT ?
    `).all(limit);
  },

  // --- Bulk export for backup ---
  exportAll() {
    return {
      entities: db.prepare('SELECT * FROM entities').all(),
      relationships: db.prepare('SELECT * FROM relationships').all(),
      output_preferences: db.prepare('SELECT * FROM output_preferences').all(),
    };
  },
};

module.exports = { initMemoryTables, memory };
```

- [ ] **Step 2: Update the require in `ipc-handlers.cjs`**

Change the existing require to import `memory` too:

```javascript
const { initMemoryTables, memory } = require('./memory.cjs');
```

- [ ] **Step 3: Verify app starts and no regressions**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`
Expected: App launches normally. Existing dictation/optimization workflow unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/main/memory.cjs src/main/ipc-handlers.cjs
git commit -m "feat: add memory CRUD methods for entities, relationships, and output preferences"
```

---

## Task 3: Signal Scanner

**Files:**
- Create: `src/main/signals.cjs`

- [ ] **Step 1: Create `src/main/signals.cjs` with built-in signal registry**

```javascript
// src/main/signals.cjs
'use strict';

// Built-in signal definitions
// Each signal group maps keywords to a generation hint
const BUILT_IN_SIGNALS = [
  {
    group: 'communication',
    keywords: ['email', 'message', 'slack', 'text', 'reply', 'respond', 'write to', 'tell'],
    hint: { format: 'email', tone: 'professional', detail: 'high' },
    confidence: 0.8,
  },
  {
    group: 'troubleshooting',
    keywords: ['fix', 'debug', 'error', 'broken', 'not working', 'issue', 'bug', 'crash'],
    hint: { format: 'prompt', tone: 'technical', detail: 'high' },
    confidence: 0.85,
  },
  {
    group: 'creation',
    keywords: ['write', 'draft', 'create', 'build', 'make', 'generate', 'design'],
    hint: { format: 'prompt', tone: 'professional', detail: 'medium' },
    confidence: 0.6,
  },
  {
    group: 'information',
    keywords: ['explain', 'what is', 'how does', 'tell me about', 'summary', 'summarize', 'overview', 'describe'],
    hint: { format: 'info_dump', tone: 'concise', detail: 'medium' },
    confidence: 0.8,
  },
  {
    group: 'quick',
    keywords: ['command for', 'snippet', 'one-liner', 'shortcut', 'quick', 'just give me'],
    hint: { format: 'quick_action', tone: 'concise', detail: 'low' },
    confidence: 0.85,
  },
  {
    group: 'document',
    keywords: ['document', 'article', 'blog post', 'report', 'proposal', 'outline'],
    hint: { format: 'document', tone: 'professional', detail: 'high' },
    confidence: 0.75,
  },
  {
    group: 'casual_communication',
    keywords: ['text message', 'dm', 'casual message', 'quick message', 'chat'],
    hint: { format: 'communication', tone: 'casual', detail: 'low' },
    confidence: 0.75,
  },
];

/**
 * Scan input text for matching signals.
 * Returns an array of matched signal hints, sorted by confidence (highest first).
 */
function scanSignals(input, customSignals = [], learnedSignals = []) {
  const lowerInput = input.toLowerCase();
  const matches = [];

  // Check built-in signals
  for (const signal of BUILT_IN_SIGNALS) {
    for (const keyword of signal.keywords) {
      if (lowerInput.includes(keyword)) {
        matches.push({
          group: signal.group,
          keyword,
          hint: { ...signal.hint },
          confidence: signal.confidence,
          source: 'built_in',
        });
        break; // one match per group is enough
      }
    }
  }

  // Check user-defined custom signals
  for (const custom of customSignals) {
    if (lowerInput.includes(custom.trigger.toLowerCase())) {
      matches.push({
        group: 'custom',
        keyword: custom.trigger,
        hint: {
          format: custom.format || 'prompt',
          tone: custom.tone || 'professional',
          detail: custom.detail || 'medium',
        },
        confidence: 0.9, // user-defined = high confidence
        source: 'custom',
      });
    }
  }

  // Check learned signals (from output_preferences patterns)
  for (const learned of learnedSignals) {
    if (lowerInput.includes(learned.trigger.toLowerCase())) {
      matches.push({
        group: 'learned',
        keyword: learned.trigger,
        hint: {
          format: learned.format,
          tone: learned.tone || 'professional',
          detail: learned.detail || 'medium',
        },
        confidence: Math.min(0.85, 0.5 + (learned.successCount * 0.05)),
        source: 'learned',
      });
    }
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Merge multiple signal matches into a single generation hint.
 * Higher-confidence signals override lower ones.
 * Entity names are collected from all matches.
 */
function mergeHints(matches) {
  if (matches.length === 0) {
    return null;
  }

  // Start with the highest-confidence match
  const primary = matches[0];
  const merged = {
    format: primary.hint.format,
    tone: primary.hint.tone,
    detail: primary.hint.detail,
    confidence: primary.confidence,
    signals: matches.map(m => ({ group: m.group, keyword: m.keyword, source: m.source })),
    entities: [],
  };

  // Communication signals override creation signals for format
  // (e.g., "write email" → email, not generic creation)
  const commMatch = matches.find(m => m.group === 'communication');
  const casualCommMatch = matches.find(m => m.group === 'casual_communication');
  if (commMatch && primary.group !== 'communication') {
    merged.format = commMatch.hint.format;
    merged.tone = commMatch.hint.tone;
    merged.detail = commMatch.hint.detail;
  }
  if (casualCommMatch) {
    merged.format = casualCommMatch.hint.format;
    merged.tone = casualCommMatch.hint.tone;
    merged.detail = casualCommMatch.hint.detail;
  }

  // Custom signals always win (user intent is explicit)
  const customMatch = matches.find(m => m.source === 'custom');
  if (customMatch) {
    merged.format = customMatch.hint.format;
    merged.tone = customMatch.hint.tone;
    merged.detail = customMatch.hint.detail;
    merged.confidence = customMatch.confidence;
  }

  return merged;
}

/**
 * Extract potential entity names from input text.
 * Returns an array of capitalized words/phrases that look like names or projects.
 * This is a simple heuristic — the LLM refines later.
 */
function extractPotentialEntities(input) {
  const entities = [];

  // Match capitalized words that aren't at sentence start
  // Pattern: word after lowercase word, or word after "for", "to", "with", "about"
  const prepositionPattern = /(?:for|to|with|about|from|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  let match;
  while ((match = prepositionPattern.exec(input)) !== null) {
    entities.push(match[1]);
  }

  // Match multi-word capitalized phrases (e.g., "Homepage Redesign")
  const multiWordPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g;
  while ((match = multiWordPattern.exec(input)) !== null) {
    if (!entities.includes(match[1])) {
      entities.push(match[1]);
    }
  }

  return entities;
}

module.exports = { scanSignals, mergeHints, extractPotentialEntities, BUILT_IN_SIGNALS };
```

- [ ] **Step 2: Verify module loads without errors**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && node -e "const s = require('./src/main/signals.cjs'); console.log('Loaded', s.BUILT_IN_SIGNALS.length, 'signal groups'); const r = s.scanSignals('email John about the homepage fix'); console.log('Matches:', r.length, r.map(m => m.group)); const h = s.mergeHints(r); console.log('Merged hint:', h);"`

Expected: Prints signal groups count, matches for the test input, and merged hint with format "email".

- [ ] **Step 3: Commit**

```bash
git add src/main/signals.cjs
git commit -m "feat: add signal scanner with built-in, learned, and custom signal support"
```

---

## Task 4: Context Assembler

**Files:**
- Create: `src/main/context-assembler.cjs`

- [ ] **Step 1: Create `src/main/context-assembler.cjs`**

```javascript
// src/main/context-assembler.cjs
'use strict';

/**
 * Format-specific system prompt templates.
 * Each returns instructions the LLM follows to produce the right output shape.
 */
const FORMAT_TEMPLATES = {
  prompt: `OUTPUT FORMAT: Generate a structured AI prompt.
Include: role assignment, clear deliverables, constraints, and output specification.
Only use this format — the user wants a prompt they can feed into another AI.`,

  email: `OUTPUT FORMAT: Generate a complete, ready-to-send email.
Match the appropriate tone and detail level based on context.
Include a natural greeting, well-developed body (not just 2-3 generic sentences), and sign-off.
Do NOT include a subject line unless explicitly asked.
Do NOT use corporate clichés ("I hope this email finds you well", "per our conversation").`,

  info_dump: `OUTPUT FORMAT: Generate organized information.
Use bullet points, sections, or numbered lists as appropriate.
Present facts, specs, and details clearly.
Do NOT wrap this as a prompt — the user wants raw information, not a prompt template.`,

  quick_action: `OUTPUT FORMAT: Give the shortest possible answer.
One-liner, command, snippet, or brief instruction.
No preamble, no explanation unless the user asked for one.`,

  communication: `OUTPUT FORMAT: Generate a casual message (Slack, text, DM).
Match the platform's norms — short, conversational, no formality.
No greeting or sign-off unless it fits the context.`,

  document: `OUTPUT FORMAT: Generate structured long-form content.
Use headers, sections, and clear organization.
Develop ideas fully — this is not a quick response.`,
};

/**
 * Build a dynamic system prompt from modular sections.
 *
 * @param {object} options
 * @param {object|null} options.hint - Merged generation hint from signal scanner
 * @param {object[]} options.entities - Relevant entities from memory
 * @param {object[]} options.relationships - Relevant relationships from memory
 * @param {object|null} options.preference - Output preference from memory
 * @param {object|null} options.activeProject - Active project context
 * @param {string|null} options.foregroundApp - Currently focused macOS app
 * @param {object[]} options.recentPrompts - Last N prompts for continuity
 * @param {string|null} options.emailSignOffName - User's sign-off name for emails
 * @returns {string} The assembled system prompt
 */
function assembleSystemPrompt({
  hint = null,
  entities = [],
  relationships = [],
  preference = null,
  activeProject = null,
  foregroundApp = null,
  recentPrompts = [],
  emailSignOffName = null,
}) {
  const sections = [];

  // 1. Base instructions
  sections.push(`You are Verby, an intelligent assistant that transforms voice input and text into polished, contextually aware output. Adapt your response format, tone, and detail level to what the user actually needs right now.`);

  // 2. Format template
  const format = hint?.format || preference?.preferred_format || 'prompt';
  const template = FORMAT_TEMPLATES[format] || FORMAT_TEMPLATES.prompt;
  sections.push(template);

  // 3. Tone and detail guidance
  const tone = hint?.tone || preference?.preferred_tone || 'professional';
  const detail = hint?.detail || preference?.preferred_detail || 'medium';
  sections.push(`TONE: ${tone}. DETAIL LEVEL: ${detail}.`);

  // 4. Email sign-off name
  if (format === 'email' && emailSignOffName) {
    sections.push(`Sign off emails with the name: ${emailSignOffName}`);
  }

  // 5. Entity context
  if (entities.length > 0) {
    const entityLines = entities.map(e => {
      const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
      const metaStr = Object.keys(meta).length > 0
        ? ` (${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : '';
      return `- ${e.name} [${e.type}]${metaStr}`;
    });
    sections.push(`KNOWN CONTEXT — People, projects, and tools the user works with:\n${entityLines.join('\n')}`);
  }

  // 6. Relationships
  if (relationships.length > 0) {
    const relLines = relationships.map(r =>
      `- ${r.subject_name} ${r.verb} ${r.object_name}`
    );
    sections.push(`RELATIONSHIPS:\n${relLines.join('\n')}`);
  }

  // 7. Active project
  if (activeProject) {
    sections.push(`ACTIVE PROJECT: ${activeProject.project_name}\nDescription: ${activeProject.description}`);
  }

  // 8. Foreground app context
  if (foregroundApp) {
    sections.push(`USER'S CURRENT APP: ${foregroundApp} — adjust output to be relevant to what they're doing in this app.`);
  }

  // 9. Recent history for continuity
  if (recentPrompts.length > 0) {
    const recentLines = recentPrompts.map(p =>
      `- "${p.raw_transcript}" → [${p.category}]`
    );
    sections.push(`RECENT CONTEXT (last ${recentPrompts.length} interactions):\n${recentLines.join('\n')}`);
  }

  return sections.join('\n\n');
}

/**
 * Build a fallback system prompt for LLM classification.
 * Used when the signal scanner doesn't match anything.
 * Asks the LLM to classify the input AND generate the output in one pass.
 */
function assembleFallbackPrompt({
  entities = [],
  relationships = [],
  activeProject = null,
  foregroundApp = null,
  recentPrompts = [],
  emailSignOffName = null,
}) {
  const sections = [];

  sections.push(`You are Verby, an intelligent assistant. The user's input is vague or doesn't match any known pattern. Your job:

1. CLASSIFY the input into one of these formats: prompt, email, info_dump, quick_action, communication, document
2. GENERATE the output in that format

Choose the format that best serves what the user seems to need. When in doubt, prefer "prompt" for AI-related requests and "info_dump" for general questions.`);

  // Include all available context so the LLM can make a good decision
  if (entities.length > 0) {
    const entityLines = entities.map(e => {
      const meta = typeof e.metadata === 'string' ? JSON.parse(e.metadata) : e.metadata;
      const metaStr = Object.keys(meta).length > 0
        ? ` (${Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(', ')})`
        : '';
      return `- ${e.name} [${e.type}]${metaStr}`;
    });
    sections.push(`KNOWN CONTEXT:\n${entityLines.join('\n')}`);
  }

  if (relationships.length > 0) {
    const relLines = relationships.map(r =>
      `- ${r.subject_name} ${r.verb} ${r.object_name}`
    );
    sections.push(`RELATIONSHIPS:\n${relLines.join('\n')}`);
  }

  if (activeProject) {
    sections.push(`ACTIVE PROJECT: ${activeProject.project_name}\nDescription: ${activeProject.description}`);
  }

  if (foregroundApp) {
    sections.push(`USER'S CURRENT APP: ${foregroundApp}`);
  }

  if (recentPrompts.length > 0) {
    const recentLines = recentPrompts.map(p =>
      `- "${p.raw_transcript}" → [${p.category}]`
    );
    sections.push(`RECENT CONTEXT:\n${recentLines.join('\n')}`);
  }

  if (emailSignOffName) {
    sections.push(`If generating an email, sign off with: ${emailSignOffName}`);
  }

  return sections.join('\n\n');
}

module.exports = { assembleSystemPrompt, assembleFallbackPrompt, FORMAT_TEMPLATES };
```

- [ ] **Step 2: Verify module loads**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && node -e "const ca = require('./src/main/context-assembler.cjs'); const prompt = ca.assembleSystemPrompt({ hint: { format: 'email', tone: 'professional', detail: 'high' }, entities: [{ name: 'John', type: 'person', metadata: '{\"role\": \"client\"}' }], relationships: [{ subject_name: 'John', verb: 'works on', object_name: 'Homepage' }] }); console.log(prompt);"`

Expected: Prints a system prompt with email format template, John entity context, and the relationship.

- [ ] **Step 3: Commit**

```bash
git add src/main/context-assembler.cjs
git commit -m "feat: add context assembler with dynamic system prompt construction and format templates"
```

---

## Task 5: Intelligence Engine — Core Pipeline

**Files:**
- Create: `src/main/intelligence-engine.cjs`

- [ ] **Step 1: Create `src/main/intelligence-engine.cjs`**

```javascript
// src/main/intelligence-engine.cjs
'use strict';

const { scanSignals, mergeHints, extractPotentialEntities } = require('./signals.cjs');
const { memory } = require('./memory.cjs');
const { assembleSystemPrompt, assembleFallbackPrompt } = require('./context-assembler.cjs');

// Provider-specific API call functions — injected at init
let callLLM = null;
let getActiveContextFn = null;
let getRecentPromptsFn = null;
let getSettingFn = null;
let getForegroundAppFn = null;

function initEngine({ callLLMFn, getActiveContext, getRecentPrompts, getSetting, getForegroundApp }) {
  callLLM = callLLMFn;
  getActiveContextFn = getActiveContext;
  getRecentPromptsFn = getRecentPrompts;
  getSettingFn = getSetting;
  getForegroundAppFn = getForegroundApp;
}

/**
 * The unified generation pipeline.
 * Replaces generateSmart() and optimize() when the feature flag is on.
 *
 * @param {string} input - Raw transcript or typed text
 * @param {string} provider - 'claude' or 'openai'
 * @returns {object} { output, hint, entities, format, debugInfo }
 */
async function generate(input, provider) {
  const debugInfo = { signals: [], hint: null, entities: [], contextMode: null };

  // 1. Load custom and learned signals
  const customSignals = getSettingFn('customSignals') || [];
  const learnedSignals = buildLearnedSignals();

  // 2. Run signal scanner
  const matches = scanSignals(input, customSignals, learnedSignals);
  debugInfo.signals = matches;

  // 3. Merge hints
  const hint = mergeHints(matches);
  debugInfo.hint = hint;

  // 4. Extract potential entity names from input
  const potentialEntities = extractPotentialEntities(input);
  debugInfo.entities = potentialEntities;

  // 5. Gather context
  const activeProject = getActiveContextFn();
  const recentPrompts = getRecentPromptsFn(5);
  const foregroundApp = getForegroundAppFn ? getForegroundAppFn() : null;
  const emailSignOffName = getSettingFn('emailSignOffName') || null;

  let systemPrompt;
  let resolvedEntities = [];
  let resolvedRelationships = [];

  if (hint && hint.confidence >= 0.5) {
    // Signal-driven path: pull targeted context
    debugInfo.contextMode = 'targeted';

    // Look up known entities mentioned in input
    for (const name of potentialEntities) {
      const entity = memory.getEntity(name);
      if (entity) {
        resolvedEntities.push(entity);
        const rels = memory.getRelationshipsFor(entity.id);
        resolvedRelationships.push(...rels);
      }
    }

    // Add entities from hint if any
    if (hint.entities) {
      for (const name of hint.entities) {
        const entity = memory.getEntity(name);
        if (entity && !resolvedEntities.find(e => e.id === entity.id)) {
          resolvedEntities.push(entity);
          const rels = memory.getRelationshipsFor(entity.id);
          resolvedRelationships.push(...rels);
        }
      }
    }

    // If no specific entities found, pull top entities for general context
    if (resolvedEntities.length === 0) {
      resolvedEntities = memory.getTopEntities(5);
    }

    systemPrompt = assembleSystemPrompt({
      hint,
      entities: resolvedEntities,
      relationships: resolvedRelationships,
      preference: memory.getTopPreferences(1)[0] || null,
      activeProject,
      foregroundApp,
      recentPrompts,
      emailSignOffName,
    });
  } else {
    // LLM fallback path: broad context
    debugInfo.contextMode = 'broad';

    resolvedEntities = memory.getTopEntities(10);
    for (const entity of resolvedEntities) {
      const rels = memory.getRelationshipsFor(entity.id);
      resolvedRelationships.push(...rels);
    }

    systemPrompt = assembleFallbackPrompt({
      entities: resolvedEntities,
      relationships: resolvedRelationships,
      activeProject,
      foregroundApp,
      recentPrompts,
      emailSignOffName,
    });
  }

  // 6. Call LLM
  const output = await callLLM(systemPrompt, input, provider);

  // 7. Post-generation learning (async, non-blocking)
  postGenerationLearn(input, output, hint, potentialEntities).catch(err => {
    console.error('[Intelligence Engine] Post-generation learning error:', err);
  });

  return {
    output,
    hint,
    entities: potentialEntities,
    format: hint?.format || 'auto',
    debugInfo,
  };
}

/**
 * Build learned signals from output_preferences table.
 * Only includes patterns with 3+ successes (minimum threshold).
 */
function buildLearnedSignals() {
  const prefs = memory.getTopPreferences(20);
  return prefs
    .filter(p => p.success_count >= 3)
    .map(p => ({
      trigger: p.context_pattern,
      format: p.preferred_format,
      tone: p.preferred_tone,
      detail: p.preferred_detail,
      successCount: p.success_count,
    }));
}

/**
 * Post-generation learning pass.
 * Extracts entities, infers relationships, records preferences.
 */
async function postGenerationLearn(input, output, hint, potentialEntities) {
  // Upsert any detected entities
  for (const name of potentialEntities) {
    memory.upsertEntity(name, 'unknown');
  }

  // If multiple entities co-occur, strengthen relationships
  if (potentialEntities.length >= 2) {
    for (let i = 0; i < potentialEntities.length; i++) {
      for (let j = i + 1; j < potentialEntities.length; j++) {
        const e1 = memory.getEntity(potentialEntities[i]);
        const e2 = memory.getEntity(potentialEntities[j]);
        if (e1 && e2) {
          memory.upsertRelationship(e1.id, 'mentioned with', e2.id);
        }
      }
    }
  }

  // Record the output format preference
  if (hint) {
    const pattern = hint.signals.map(s => s.keyword).join(' + ');
    if (pattern) {
      memory.recordPreference(
        pattern,
        hint.format,
        hint.tone,
        hint.detail
      );
    }
  }
}

/**
 * Called when user copies output (success signal).
 */
function recordCopy(hint) {
  if (!hint) return;
  const pattern = hint.signals?.map(s => s.keyword).join(' + ');
  if (pattern) {
    memory.recordSuccess(pattern);
  }
}

/**
 * Called when user regenerates (reject signal).
 */
function recordRegenerate(hint) {
  if (!hint) return;
  const pattern = hint.signals?.map(s => s.keyword).join(' + ');
  if (pattern) {
    memory.recordReject(pattern);
  }
}

/**
 * Get full debug info for the memory inspector.
 */
function getInspectorData() {
  return {
    entities: memory.getTopEntities(50),
    preferences: memory.getTopPreferences(20),
    learnedSignals: buildLearnedSignals(),
  };
}

module.exports = { initEngine, generate, recordCopy, recordRegenerate, getInspectorData };
```

- [ ] **Step 2: Verify module loads**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && node -e "const ie = require('./src/main/intelligence-engine.cjs'); console.log('Loaded. Exports:', Object.keys(ie));"`

Expected: `Loaded. Exports: [ 'initEngine', 'generate', 'recordCopy', 'recordRegenerate', 'getInspectorData' ]`

- [ ] **Step 3: Commit**

```bash
git add src/main/intelligence-engine.cjs
git commit -m "feat: add intelligence engine with unified generate pipeline, signal routing, and post-generation learning"
```

---

## Task 6: Wire Intelligence Engine into IPC Handlers

**Files:**
- Modify: `src/main/ipc-handlers.cjs`

- [ ] **Step 1: Add requires and init call**

At the top of `ipc-handlers.cjs`, add the intelligence engine require alongside the existing memory require:

```javascript
const { initEngine, generate, recordCopy, recordRegenerate, getInspectorData } = require('./intelligence-engine.cjs');
```

After `initMemoryTables(database)` (added in Task 1), add the engine initialization. This needs to happen inside the function that has access to the database and engine objects. Add after the memory init:

```javascript
// Initialize intelligence engine with app dependencies
initEngine({
  callLLMFn: async (systemPrompt, userMessage, provider) => {
    // Reuse existing LLM call logic from engine.optimize
    const apiKey = provider === 'claude'
      ? getSetting('anthropicKey')
      : getSetting('openaiKey');

    if (provider === 'claude') {
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });
      return response.content[0].text;
    } else {
      const OpenAI = require('openai');
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      });
      return response.choices[0].message.content;
    }
  },
  getActiveContext: () => db.getActiveContext(),
  getRecentPrompts: (n) => db.getHistory(n),
  getSetting: getSetting,
  getForegroundApp: () => null, // existing foreground detection wired separately
});
```

- [ ] **Step 2: Add new IPC handlers inside `registerHandlers()`**

Add these handlers after the existing ones (after line ~1024):

```javascript
  // --- Intelligence Engine handlers ---

  ipcMain.handle('intelligence-generate', async (event, { text, provider }) => {
    const useEngine = getSetting('useIntelligenceEngine');
    if (!useEngine) {
      // Fallback to existing optimize path
      return engine.optimize(text, provider || getSetting('defaultProvider'));
    }
    const result = await generate(text, provider || getSetting('defaultProvider'));
    // Save to prompts DB like existing flow
    db.save(text, result.output, result.format);
    return result;
  });

  ipcMain.handle('intelligence-record-copy', (event, { hint }) => {
    recordCopy(hint);
  });

  ipcMain.handle('intelligence-record-regenerate', (event, { hint }) => {
    recordRegenerate(hint);
  });

  ipcMain.handle('intelligence-inspector', () => {
    return getInspectorData();
  });

  ipcMain.handle('memory-get-entities', () => {
    return memory.getTopEntities(50);
  });

  ipcMain.handle('memory-upsert-entity', (event, { name, type, metadata }) => {
    return memory.upsertEntity(name, type, metadata);
  });

  ipcMain.handle('memory-export', () => {
    return memory.exportAll();
  });
```

- [ ] **Step 3: Add `useIntelligenceEngine` to settings defaults**

In the `get-settings` handler (around line 901), add the new setting to the returned object:

```javascript
useIntelligenceEngine: getSetting('useIntelligenceEngine') || false,
```

- [ ] **Step 4: Verify app starts and existing workflow still works**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`
Expected: App launches. Existing dictation and optimization work exactly as before (feature flag is off by default).

- [ ] **Step 5: Commit**

```bash
git add src/main/ipc-handlers.cjs
git commit -m "feat: wire intelligence engine into IPC handlers with feature flag"
```

---

## Task 7: Expose New IPC Methods to Renderer

**Files:**
- Modify: `src/main/preload.js`
- Modify: `src/renderer/lib/ipc.js`

- [ ] **Step 1: Add intelligence engine methods to preload.js**

In `src/main/preload.js`, add these inside the `contextBridge.exposeInMainWorld('verby', { ... })` block:

```javascript
    // Intelligence Engine
    intelligenceGenerate: (data) => ipcRenderer.invoke('intelligence-generate', data),
    intelligenceRecordCopy: (data) => ipcRenderer.invoke('intelligence-record-copy', data),
    intelligenceRecordRegenerate: (data) => ipcRenderer.invoke('intelligence-record-regenerate', data),
    intelligenceInspector: () => ipcRenderer.invoke('intelligence-inspector'),
    memoryGetEntities: () => ipcRenderer.invoke('memory-get-entities'),
    memoryUpsertEntity: (data) => ipcRenderer.invoke('memory-upsert-entity', data),
    memoryExport: () => ipcRenderer.invoke('memory-export'),
```

- [ ] **Step 2: Add safe wrappers in `src/renderer/lib/ipc.js`**

Add corresponding safe wrapper functions following the existing pattern in the file:

```javascript
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
```

- [ ] **Step 3: Verify app starts**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`
Expected: No errors. Existing functionality unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/main/preload.js src/renderer/lib/ipc.js
git commit -m "feat: expose intelligence engine IPC methods to renderer"
```

---

## Task 8: Settings Panel — Intelligence Engine Toggle

**Files:**
- Modify: `src/renderer/components/SettingsPanel.jsx`

- [ ] **Step 1: Add intelligence engine toggle to SettingsPanel**

In `SettingsPanel.jsx`, add a new section after the existing email settings section (around line 401). Follow the same toggle pattern used for `autoInject`, `soundFeedback`, etc:

```jsx
{/* Intelligence Engine Section */}
<div className="settings-section">
  <h3 className="settings-heading">Intelligence Engine (Beta)</h3>
  <p className="settings-description" style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '12px' }}>
    Adaptive prompt generation that learns your style, detects keywords, and picks the right output format automatically.
  </p>
  <label className="setting-toggle">
    <span>Enable Intelligence Engine</span>
    <input
      type="checkbox"
      checked={settings.useIntelligenceEngine || false}
      onChange={(e) => updateSetting('useIntelligenceEngine', e.target.checked)}
    />
  </label>
</div>
```

- [ ] **Step 2: Verify the toggle appears in settings**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`
Navigate to Settings panel. Expected: "Intelligence Engine (Beta)" section with toggle, defaulting to off.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/SettingsPanel.jsx
git commit -m "feat: add intelligence engine toggle to settings panel"
```

---

## Task 9: Wire Overlay to Intelligence Engine

**Files:**
- Modify: `src/renderer/components/Overlay.jsx`

- [ ] **Step 1: Add intelligence engine path to chat submit**

In `Overlay.jsx`, modify the chat form submit handler (around lines 223-266). The current handler calls `chatOptimize` — add a branch that checks the feature flag:

```jsx
// Add import at top
import { intelligenceGenerate, intelligenceRecordCopy } from '../lib/ipc';

// Inside the component, add state for tracking the last hint
const [lastHint, setLastHint] = useState(null);
```

In the form submit handler, add the intelligence engine branch before the existing `chatOptimize` call:

```jsx
// Check if intelligence engine is enabled
const settings = await window.verby.getSettings();
if (settings.useIntelligenceEngine) {
  setStatus('optimizing');
  const result = await intelligenceGenerate({
    text: inputText,
    provider: settings.defaultProvider,
  });
  if (result) {
    setLastHint(result.hint);
    // Use result.output the same way the existing flow uses the optimized text
    setResult(result.output);
    setStatus('done');
  }
  return;
}
// ... existing chatOptimize flow continues below
```

- [ ] **Step 2: Wire copy button to record success**

In the copy handler for the result card, add the feedback signal:

```jsx
// After the existing copy logic:
if (lastHint) {
  intelligenceRecordCopy({ hint: lastHint });
}
```

- [ ] **Step 3: Test the full flow**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`

1. Go to Settings, enable Intelligence Engine
2. Type "email John about the project update" in the chat input
3. Expected: Output should be a full email (not a structured prompt)
4. Type "explain how React hooks work"
5. Expected: Output should be an info dump (bullet points, not a prompt wrapper)
6. Turn Intelligence Engine off
7. Type the same inputs — should get the old behavior

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/Overlay.jsx
git commit -m "feat: wire overlay chat input to intelligence engine with feature flag"
```

---

## Task 10: Memory Inspector Panel

**Files:**
- Create: `src/renderer/components/MemoryInspector.jsx`
- Modify: `src/renderer/components/Overlay.jsx` (add keyboard shortcut to toggle)

- [ ] **Step 1: Create `src/renderer/components/MemoryInspector.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { intelligenceInspector } from '../lib/ipc';

export default function MemoryInspector({ visible, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('entities');

  useEffect(() => {
    if (visible) {
      intelligenceInspector().then(setData);
    }
  }, [visible]);

  if (!visible || !data) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', flexDirection: 'column', padding: '20px',
      fontFamily: 'monospace', fontSize: '13px', color: '#e0e0e0',
      overflow: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, color: '#14B8A6' }}>Memory Inspector</h2>
        <button onClick={onClose} style={{
          background: 'none', border: '1px solid #555', color: '#aaa',
          padding: '4px 12px', borderRadius: '4px', cursor: 'pointer',
        }}>Close (Esc)</button>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {['entities', 'preferences', 'learnedSignals'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? '#14B8A6' : 'transparent',
            color: tab === t ? '#000' : '#aaa',
            border: '1px solid #555', padding: '6px 14px',
            borderRadius: '4px', cursor: 'pointer',
          }}>{t === 'learnedSignals' ? 'Learned Signals' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'entities' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Mentions</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Last Referenced</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Metadata</th>
              </tr>
            </thead>
            <tbody>
              {data.entities.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px', color: '#6366F1' }}>{e.name}</td>
                  <td style={{ padding: '8px' }}>{e.type}</td>
                  <td style={{ padding: '8px' }}>{e.mention_count}</td>
                  <td style={{ padding: '8px', opacity: 0.7 }}>{e.last_referenced}</td>
                  <td style={{ padding: '8px', opacity: 0.7, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.metadata}</td>
                </tr>
              ))}
              {data.entities.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No entities learned yet. Use Verby with the Intelligence Engine on to start building memory.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'preferences' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Pattern</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Format</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Tone</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Detail</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Success</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Reject</th>
              </tr>
            </thead>
            <tbody>
              {data.preferences.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px', color: '#14B8A6' }}>{p.context_pattern}</td>
                  <td style={{ padding: '8px' }}>{p.preferred_format}</td>
                  <td style={{ padding: '8px' }}>{p.preferred_tone}</td>
                  <td style={{ padding: '8px' }}>{p.preferred_detail}</td>
                  <td style={{ padding: '8px', color: '#22c55e' }}>{p.success_count}</td>
                  <td style={{ padding: '8px', color: '#ef4444' }}>{p.reject_count}</td>
                </tr>
              ))}
              {data.preferences.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No preferences recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'learnedSignals' && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Trigger</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Format</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Tone</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {data.learnedSignals.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #222' }}>
                  <td style={{ padding: '8px', color: '#f59e0b' }}>{s.trigger}</td>
                  <td style={{ padding: '8px' }}>{s.format}</td>
                  <td style={{ padding: '8px' }}>{s.tone}</td>
                  <td style={{ padding: '8px' }}>{(0.5 + s.successCount * 0.05).toFixed(2)}</td>
                </tr>
              ))}
              {data.learnedSignals.length === 0 && (
                <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', opacity: 0.5 }}>No learned signals yet. Signals form after 3+ successful uses of a pattern.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add keyboard shortcut and render in Overlay.jsx**

In `Overlay.jsx`, add the import and state:

```jsx
import MemoryInspector from './MemoryInspector';

// Inside the component, add state:
const [showInspector, setShowInspector] = useState(false);

// Add keyboard listener in a useEffect:
useEffect(() => {
  const handleKeyDown = (e) => {
    // Cmd+Shift+M (macOS) or Ctrl+Shift+M (Windows) to toggle inspector
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      setShowInspector(prev => !prev);
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

Add the component render at the end of the JSX, before the closing `</div>`:

```jsx
<MemoryInspector
  visible={showInspector}
  onClose={() => setShowInspector(false)}
/>
```

- [ ] **Step 3: Test the inspector**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`

1. Press Cmd+Shift+M — inspector panel should appear
2. Should show empty tables (no data yet)
3. Press Escape or click Close — should dismiss
4. Enable Intelligence Engine, generate a few prompts, then reopen inspector
5. Should show entities and preferences populating

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/MemoryInspector.jsx src/renderer/components/Overlay.jsx
git commit -m "feat: add memory inspector dev panel with Cmd+Shift+M shortcut"
```

---

## Task 11: Supabase Backup on App Quit

**Files:**
- Modify: `src/main/ipc-handlers.cjs`
- Modify: `src/main/index.js` (add before-quit handler)

- [ ] **Step 1: Add backup function to `ipc-handlers.cjs`**

Add this function after the intelligence engine IPC handlers:

```javascript
async function backupMemoryToSupabase() {
  try {
    const { memory } = require('./memory.cjs');
    const data = memory.exportAll();
    if (data.entities.length === 0) return; // nothing to back up

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return; // no Supabase configured

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const compressed = JSON.stringify(data);
    const { error } = await supabase
      .from('memory_backups')
      .upsert({
        user_id: getSetting('licenseEmail') || 'local',
        backup_data: compressed,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[Memory Backup] Supabase error:', error);
    } else {
      console.log('[Memory Backup] Backed up', data.entities.length, 'entities');
    }
  } catch (err) {
    console.error('[Memory Backup] Failed:', err);
  }
}

// Export it
module.exports = { registerHandlers, setAutoContext, getSetting, backupMemoryToSupabase };
```

- [ ] **Step 2: Call backup on app quit in `index.js`**

In `src/main/index.js`, add a before-quit handler. Find where the app lifecycle events are handled and add:

```javascript
const { backupMemoryToSupabase } = require('./ipc-handlers.cjs');

app.on('before-quit', async (event) => {
  // Attempt memory backup (non-blocking, don't prevent quit)
  backupMemoryToSupabase().catch(err => {
    console.error('[App Quit] Memory backup failed:', err);
  });
});
```

Note: This is a fire-and-forget backup. If the app quits before it completes, data is still safe locally — the backup is insurance, not primary storage.

- [ ] **Step 3: Verify app quits cleanly**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`
Quit the app (Cmd+Q). Expected: No errors, no hang. Check terminal for backup log message (will say "no Supabase configured" if env vars not set, which is fine).

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.cjs src/main/index.js
git commit -m "feat: add memory backup to Supabase on app quit"
```

---

## Task 12: Integration Testing — End to End

**Files:**
- No new files — manual testing in the running app

- [ ] **Step 1: Test with Intelligence Engine OFF (regression check)**

Run: `cd /Users/lotsofsocks/Development/verbyprompt && npm start`

With Intelligence Engine toggle OFF in settings:
1. Hold Fn and speak "write me a quick email to john about the meeting" → should produce email via old `generateSmart()`
2. Type "how do I fix this typescript error" in chat → should produce prompt via old `chatOptimize()`
3. Favorite a prompt, delete a prompt, search history → all existing features work

- [ ] **Step 2: Test with Intelligence Engine ON — signal detection**

Turn Intelligence Engine ON in settings:

| Input | Expected Format | Why |
|-------|----------------|-----|
| "email John about the project deadline" | Email (professional, detailed) | "email" + "John" signals |
| "fix this React rendering bug" | Prompt (troubleshooting) | "fix" + "bug" signals |
| "explain how websockets work" | Info dump (bullets/sections) | "explain" + "how" signals |
| "command for listing docker containers" | Quick action (one-liner) | "command for" signal |
| "draft a blog post about AI trends" | Document (long-form) | "draft" + "blog post" signals |
| "tell the team we're pushing the release" | Communication (casual) | Ambiguous — LLM fallback |

- [ ] **Step 3: Test memory learning**

1. Generate 3-4 prompts mentioning "John"
2. Open Memory Inspector (Cmd+Shift+M)
3. Verify "John" appears in entities table with mention_count > 1
4. Verify output preferences are being recorded
5. Copy a result → verify success_count increments (reopen inspector)

- [ ] **Step 4: Test A/B comparison (manual)**

1. Turn Intelligence Engine OFF
2. Type "write a pitch for our new product" → note the output style
3. Turn Intelligence Engine ON
4. Type the same thing → compare output
5. The new engine should produce a more contextually appropriate response (likely a document/prompt, not wrapped in "You are a...")

- [ ] **Step 5: Document any issues found**

If anything is broken, note the exact input, expected behavior, and actual behavior. Fix before proceeding to final commit.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "feat: Verby Intelligence Engine v1 — complete implementation with signal scanner, memory system, context assembler, and dev inspector"
```

---

## Summary

| Task | What it builds | New files | Modified files |
|------|---------------|-----------|---------------|
| 1 | Memory SQLite tables | `memory.cjs` | `ipc-handlers.cjs` |
| 2 | Memory CRUD methods | — | `memory.cjs` |
| 3 | Signal scanner | `signals.cjs` | — |
| 4 | Context assembler | `context-assembler.cjs` | — |
| 5 | Intelligence engine core | `intelligence-engine.cjs` | — |
| 6 | IPC wiring + feature flag | — | `ipc-handlers.cjs` |
| 7 | Renderer IPC bridge | — | `preload.js`, `ipc.js` |
| 8 | Settings toggle | — | `SettingsPanel.jsx` |
| 9 | Overlay integration | — | `Overlay.jsx` |
| 10 | Memory inspector | `MemoryInspector.jsx` | `Overlay.jsx` |
| 11 | Supabase backup | — | `ipc-handlers.cjs`, `index.js` |
| 12 | Integration testing | — | — |
