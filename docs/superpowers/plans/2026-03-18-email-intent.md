# Email Intent Detection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intent-aware email generation to Verby's AI-enhanced (Fn) path — detect "email" intent from speech, generate a tone-matched email, and inject at cursor.

**Architecture:** The existing `engine.optimize()` dual-path (local keys → Vercel proxy fallback) is extended with a new `engine.generateSmart()` method that uses an intent-detection system prompt. The Fn path in `useDictation.js` calls this instead of `optimizePrompt`. A new Vercel endpoint `/api/generate` handles the proxy fallback. The `inject-text` handler gains a `skipVoiceCommands` option for email output.

**Tech Stack:** Claude API / OpenAI API (existing), Vercel serverless functions, Electron IPC

**Spec:** `docs/superpowers/specs/2026-03-18-email-intent-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `site/api/generate.js` | Create | Vercel proxy endpoint for intent detection + generation |
| `src/main/ipc-handlers.cjs` | Modify | Add `generate-smart` handler (dual-path), add `skipVoiceCommands` to `inject-text` |
| `src/main/preload.js` | Modify | Add `generateSmart` IPC bridge |
| `src/renderer/lib/ipc.js` | Modify | Add `generateSmart` export, update `injectText` signature |
| `src/renderer/hooks/useDictation.js` | Modify | Fn path calls `generateSmart`, passes `skipVoiceCommands` for email |

---

### Task 1: Create Vercel proxy endpoint `/api/generate`

**Files:**
- Create: `site/api/generate.js`

- [ ] **Step 1: Create site/api/generate.js**

This follows the exact same structure as `site/api/optimize.js` but with the intent-detection system prompt and a different response shape.

```js
// Vercel Serverless Function — intent-aware generation (email or prompt enhancement)
// Proxy fallback for users without local API keys
export const config = { maxDuration: 45 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  if (!ANTHROPIC_KEY && !OPENAI_KEY) {
    return res.status(500).json({ error: 'Server not configured' });
  }

  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text required' });

    // Intent detection + generation prompt (keep in sync with engine.generateSmart in ipc-handlers.cjs)
    const systemPrompt = `You are Verby — an intent-aware voice assistant. The user spoke into a microphone and their speech was transcribed. Analyze what they want and respond accordingly.

STEP 1 — DETECT INTENT:
- EMAIL: The user wants to send an email or message to someone. Look for phrases like "email", "write to", "send a message to", "tell [person] about", "draft an email", "reply to [person]".
- PROMPT: Anything else — questions, tasks, brainstorming, commands. This is the default.

If you are not confident the user wants an email, choose PROMPT. Never guess — false positives are worse than missed emails.

STEP 2 — GENERATE:

If EMAIL:
- Extract the recipient name, topic, and key points from their speech
- Write a complete email: greeting, body, sign-off
- CRITICAL TONE RULE: Mirror how the user spoke. If they were casual ("hey can you tell Mike we're pushing back"), write casually. If they were formal ("please inform the client of the schedule adjustment"), write formally. The user's words ARE the tone guide.
- Do NOT add a subject line (the user will add one in their email client)
- Do NOT invent facts, dates, commitments, or details the user did not mention
- Do NOT use corporate filler: "I hope this email finds you well", "per our previous discussion", "as per", "please do not hesitate"
- Keep length proportional to what the user said — a short request gets a short email
- When the user is vague, keep the email general rather than fabricating specifics
- Sign off with just a first name placeholder like "Best,\\n[Your name]"

If PROMPT:
- Clean up the speech into a well-structured prompt
- Remove filler words, false starts, verbal tics
- Add specificity and structure
- Keep the user's intent and tone

OUTPUT FORMAT:
Return a JSON object:
{"type": "email" or "prompt", "result": "the generated text"}
Return ONLY the JSON. No explanation, no markdown fences.`;

    let result;

    if (ANTHROPIC_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2048,
          system: systemPrompt,
          messages: [{ role: 'user', content: text }],
        }),
      });
      const data = await response.json();
      result = data.content?.[0]?.text?.trim();
    } else if (OPENAI_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          max_tokens: 2048,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
        }),
      });
      const data = await response.json();
      result = data.choices?.[0]?.message?.content?.trim();
    }

    if (!result) return res.status(500).json({ error: 'No AI response' });

    try {
      const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, ''));
      return res.status(200).json({
        type: parsed.type || 'prompt',
        result: parsed.result || result,
      });
    } catch {
      return res.status(200).json({ type: 'prompt', result });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add site/api/generate.js
git commit -m "feat: add /api/generate endpoint for intent-aware email generation"
```

---

### Task 2: Add `generate-smart` IPC handler and `skipVoiceCommands` to `inject-text`

**Files:**
- Modify: `src/main/ipc-handlers.cjs:268-320` (engine section, add `generateSmart` method)
- Modify: `src/main/ipc-handlers.cjs:503-514` (add new handler after `optimize-prompt`)
- Modify: `src/main/ipc-handlers.cjs:612-673` (add `skipVoiceCommands` param to `inject-text`)

- [ ] **Step 1: Add `engine.generateSmart()` method inside `initServices()`**

In `src/main/ipc-handlers.cjs`, after the `engine` object definition (after line 321, after the closing `};` of the `engine = { ... }` block), add a `generateSmart` method to the engine object. Actually, add it inside the engine object before the closing `};`:

After `engine.optimize`'s closing brace (line 320) and before the engine object's closing `};` (line 321), add:

```js
    ,
    async generateSmart(rawText) {
      // Intent detection + generation prompt (keep in sync with site/api/generate.js)
      const systemPrompt = `You are Verby — an intent-aware voice assistant. The user spoke into a microphone and their speech was transcribed. Analyze what they want and respond accordingly.

STEP 1 — DETECT INTENT:
- EMAIL: The user wants to send an email or message to someone. Look for phrases like "email", "write to", "send a message to", "tell [person] about", "draft an email", "reply to [person]".
- PROMPT: Anything else — questions, tasks, brainstorming, commands. This is the default.

If you are not confident the user wants an email, choose PROMPT. Never guess — false positives are worse than missed emails.

STEP 2 — GENERATE:

If EMAIL:
- Extract the recipient name, topic, and key points from their speech
- Write a complete email: greeting, body, sign-off
- CRITICAL TONE RULE: Mirror how the user spoke. If they were casual ("hey can you tell Mike we're pushing back"), write casually. If they were formal ("please inform the client of the schedule adjustment"), write formally. The user's words ARE the tone guide.
- Do NOT add a subject line
- Do NOT invent facts, dates, commitments, or details the user did not mention
- Do NOT use corporate filler: "I hope this email finds you well", "per our previous discussion", "as per", "please do not hesitate"
- Keep length proportional to what the user said
- When the user is vague, keep the email general rather than fabricating specifics
- Sign off with just a first name placeholder like "Best,\\n[Your name]"

If PROMPT:
- Clean up the speech into a well-structured prompt
- Remove filler words, false starts, verbal tics
- Add specificity and structure
- Keep the user's intent and tone

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
          headers: { 'Content-Type': 'application/json' },
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
    }
```

- [ ] **Step 2: Add `generate-smart` IPC handler**

In `src/main/ipc-handlers.cjs`, after the `optimize-prompt` handler (after line 514), add:

```js
  ipcMain.handle('generate-smart', async (_event, rawText) => {
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
```

Note: `'email'` is a new `category` value in the prompts DB. Verify the history panel UI handles arbitrary category values gracefully.

- [ ] **Step 3: Add `skipVoiceCommands` parameter to `inject-text`**

In `src/main/ipc-handlers.cjs`, change the `inject-text` handler (line 612):

From:
```js
  ipcMain.handle('inject-text', async (_event, text) => {
    // Process voice commands
    let processed = text;
    processed = processed.replace(/\bnew line\b/gi, '\n');
```

To:
```js
  ipcMain.handle('inject-text', async (_event, text, options) => {
    let processed = text;

    // Process voice commands (skip for AI-generated content like emails)
    if (!options || !options.skipVoiceCommands) {
      processed = processed.replace(/\bnew line\b/gi, '\n');
```

And add a closing brace `}` after the last voice command replacement (after line 624, after the `close quote` line):

```js
    processed = processed.replace(/\bclose quote\b/gi, '"');
    } // end if !skipVoiceCommands
```

**Also:** At line 658, there's a `"send message"` voice command that presses Enter after injection. This must also be guarded — AI-generated emails should never auto-press Enter. Wrap it:

From:
```js
    // Handle "send message" voice command — press Enter after injection
    if (/\bsend message\b/gi.test(text)) {
```

To:
```js
    // Handle "send message" voice command — press Enter after injection
    // Skip for AI-generated content (email output should never auto-send)
    if ((!options || !options.skipVoiceCommands) && /\bsend message\b/gi.test(text)) {
```

- [ ] **Step 4: Commit**

```bash
git add src/main/ipc-handlers.cjs
git commit -m "feat: add generate-smart IPC handler and skipVoiceCommands for inject-text"
```

---

### Task 3: Add IPC bridges to preload and ipc.js

**Files:**
- Modify: `src/main/preload.js`
- Modify: `src/renderer/lib/ipc.js`

- [ ] **Step 1: Add `generateSmart` bridge to preload.js**

In `src/main/preload.js`, before the auto-updates section comment (before the line `// Auto-updates`), add:

```js
  // Intent-aware generation (email or prompt)
  generateSmart: (text) => ipcRenderer.invoke('generate-smart', text),
```

- [ ] **Step 2: Update `injectText` bridge to pass options**

In `src/main/preload.js`, change the existing `injectText` line:

From:
```js
  injectText: (text) => ipcRenderer.invoke('inject-text', text),
```

To:
```js
  injectText: (text, options) => ipcRenderer.invoke('inject-text', text, options),
```

- [ ] **Step 3: Add exports to ipc.js**

In `src/renderer/lib/ipc.js`, after the existing `export const onOpenSettings` line, add:

```js
// Intent-aware generation
export const generateSmart = (text) => (verby.generateSmart || noopAsync)(text);
```

And update the existing `injectText` export:

From:
```js
export const injectText = (text) => (verby.injectText || noopAsync)(text);
```

To:
```js
export const injectText = (text, options) => (verby.injectText || noopAsync)(text, options);
```

- [ ] **Step 4: Commit**

```bash
git add src/main/preload.js src/renderer/lib/ipc.js
git commit -m "feat: add generateSmart IPC bridge and skipVoiceCommands option for injectText"
```

---

### Task 4: Update useDictation.js to use generateSmart

**Files:**
- Modify: `src/renderer/hooks/useDictation.js:2-13` (imports)
- Modify: `src/renderer/hooks/useDictation.js:121-136` (enhanced mode block)
- Modify: `src/renderer/hooks/useDictation.js:139-147` (dictation log)

- [ ] **Step 1: Add generateSmart to imports**

In `src/renderer/hooks/useDictation.js`, add `generateSmart` to the import block (line 2-13). Add it after `optimizePrompt`:

```js
import {
  transcribeAudio,
  injectText,
  optimizePrompt,
  generateSmart,
  onToggleDictation,
  onFnDown,
  onFnUp,
  onCtrlDown,
  onCtrlUp,
  showProcessing,
  hideIndicator,
  notifyRecordingStarted,
  notifyRecordingStopped,
} from '../lib/ipc';
```

- [ ] **Step 2: Replace the enhanced mode block**

In `src/renderer/hooks/useDictation.js`, replace lines 121-136:

```js
          let finalText = cleaned;

          // If enhanced mode AND not raw mode (Ctrl), run through AI
          if (enhancedMode && !isRawMode.current) {
            try {
              const result = await optimizePrompt(cleaned, 'general');
              if (result && result.optimized) {
                finalText = result.optimized;
              }
            } catch {
              // Fall back to raw transcript
            }
          }

          // Inject into active field
          const injected = await injectText(finalText);
```

With:

```js
          let finalText = cleaned;
          let intentType = null;

          // If enhanced mode AND not raw mode (Ctrl), run through AI
          if (enhancedMode && !isRawMode.current) {
            try {
              const response = await generateSmart(cleaned);
              if (response && response.result) {
                finalText = response.result;
                intentType = response.type || 'prompt';
              }
            } catch (err) {
              console.error('[dictation] generateSmart failed:', err);
              // Fall back to raw transcript
            }
          }

          // Inject into active field (skip voice commands for email output)
          const injectOptions = intentType === 'email' ? { skipVoiceCommands: true } : undefined;
          const injected = await injectText(finalText, injectOptions);
```

- [ ] **Step 3: Update the dictation log entry**

In `src/renderer/hooks/useDictation.js`, replace the log entry (lines 139-147):

```js
          // Log it
          setDictationLog((prev) => [
            {
              raw: cleaned,
              final: injected || finalText,
              enhanced: enhancedMode,
              time: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 50)); // keep last 50
```

With:

```js
          // Log it
          setDictationLog((prev) => [
            {
              raw: cleaned,
              final: injected || finalText,
              enhanced: enhancedMode,
              intentType: intentType,
              time: new Date().toISOString(),
            },
            ...prev,
          ].slice(0, 50)); // keep last 50
```

- [ ] **Step 4: Commit**

```bash
git add src/renderer/hooks/useDictation.js
git commit -m "feat: use generateSmart for Fn path — intent-aware email generation"
```

---

### Task 5: Deploy and test

- [ ] **Step 1: Deploy the new Vercel endpoint**

```bash
cd /Users/lotsofsocks/Development/verbyprompt/site && npx vercel --prod
```

- [ ] **Step 2: Test locally in dev mode**

```bash
cd /Users/lotsofsocks/Development/verbyprompt && npm start
```

Test these scenarios:
1. Hold Fn → say "email John about pushing the meeting to Friday" → should generate a casual email and inject it
2. Hold Fn → say "write a function that sorts an array" → should enhance as a prompt (not email), inject normally
3. Hold Ctrl → say "email John about something" → should inject raw transcript (Ctrl = raw mode, no AI)
4. Hold Fn with enhanced mode OFF → should inject raw transcript (no AI)

- [ ] **Step 3: Push and commit**

```bash
git push origin main
```
