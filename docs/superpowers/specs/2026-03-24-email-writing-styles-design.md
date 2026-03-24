# Email Writing Styles Design Spec

**Date:** 2026-03-24
**Status:** Approved

## Overview

Add user-configurable email writing styles to Verby's voice-to-email feature. Four modes: **Auto** (default, preserves current tone-mirroring behavior), **Formal**, **Casual**, and **Direct**. Users set a default in Settings and can override per-dictation via voice keywords.

**Approach:** System Prompt Injection — a single tone directive is injected into the existing `generateSmart()` system prompt based on the selected style. No separate templates, no double API calls.

---

## 1. Writing Styles

### Auto (Default)
Preserves existing behavior. The LLM mirrors the user's speaking tone:
> "Mirror how the user spoke. If they were casual ('hey can you tell Mike we're pushing back'), write casually. If they were formal ('please inform the client of the schedule adjustment'), write formally. The user's words ARE the tone guide."

### Formal
> "Write in a formal, professional tone. Use complete sentences, proper titles, and measured language. Avoid contractions and slang."

### Casual
> "Write in a warm, casual tone. Use contractions, conversational language, and a friendly voice. Keep it natural, like texting a colleague."

### Direct
> "Write in a concise, direct tone. Short sentences. No filler, no pleasantries beyond a brief greeting. Get to the point immediately."

---

## 2. Voice Override Detection

Before the email intent detection runs in `generateSmart()`, scan the transcript for style keywords using regex:

| Voice keyword | Style applied |
|---|---|
| "formally email...", "formal email to..." | `formal` |
| "casually email...", "casual email to..." | `casual` |
| "directly email...", "quick email to..." | `direct` |

**Behavior:**
- Strip only the style adverb/adjective from the transcript, preserving the "email" keyword (so "formally email John about the deadline" becomes "email John about the deadline"). The regex captures only the style word; the "email/message/write" word stays so intent detection still works.
- The detected style overrides the user's saved setting for that single dictation only
- If no keyword is detected, use the user's saved `emailStyle` setting
- If no setting saved, default to `auto`

**Implementation:** Simple regex check at the top of `generateSmart()`, before the API call. No new dependencies.

**Regex patterns:**
```js
const styleOverrides = [
  { pattern: /^(formally|formal)\s+(?=email|message|write)/i, style: 'formal' },
  { pattern: /^(casually|casual)\s+(?=email|message|write)/i, style: 'casual' },
  { pattern: /^(directly|direct|quick)\s+(?=email|message|write)/i, style: 'direct' },
];
```

The regex uses a lookahead (`(?=...)`) so only the style word and trailing space are matched/stripped. The "email/message/write" keyword is preserved in the transcript for intent detection. Pass the cleaned text and resolved style to the system prompt builder.

---

## 3. System Prompt Modification

**File:** `src/main/ipc-handlers.cjs` (lines 329-425)

The existing system prompt contains a tone-mirroring paragraph. This paragraph is replaced conditionally based on the resolved `emailStyle`:

```js
function getEmailToneDirective(style) {
  switch (style) {
    case 'formal':
      return 'Write in a formal, professional tone. Use complete sentences, proper titles, and measured language. Avoid contractions and slang.';
    case 'casual':
      return 'Write in a warm, casual tone. Use contractions, conversational language, and a friendly voice. Keep it natural, like texting a colleague.';
    case 'direct':
      return 'Write in a concise, direct tone. Short sentences. No filler, no pleasantries beyond a brief greeting. Get to the point immediately.';
    case 'auto':
    default:
      return "Mirror how the user spoke. If they were casual ('hey can you tell Mike we're pushing back'), write casually. If they were formal ('please inform the client of the schedule adjustment'), write formally. The user's words ARE the tone guide.";
  }
}
```

This function is called when building the system prompt. The existing hardcoded `- CRITICAL TONE RULE: Mirror how the user spoke...` line in the template literal must be replaced with an interpolated call:

```js
// BEFORE (hardcoded in template literal)
- CRITICAL TONE RULE: Mirror how the user spoke...

// AFTER (interpolated)
- CRITICAL TONE RULE: ${getEmailToneDirective(resolvedStyle)}
```

Everything else in the system prompt (intent detection, no clichés, no invented facts, sign-off format, expansion rules) stays identical.

**Important:** `emailStyle` must be read fresh inside `generateSmart()` on each invocation via `getSetting('emailStyle', 'auto')`, NOT captured in the `initServices()` closure. The API keys are captured at init time, but `emailStyle` should reflect the user's current setting.

**Sync warning:** The system prompt exists in two places that must stay in sync:
1. `src/main/ipc-handlers.cjs` (local API path)
2. `site/api/generate.js` (Vercel proxy path)

Both must have the same `getEmailToneDirective()` function and the same interpolation point.

---

## 4. Settings UI

**File:** `src/renderer/components/SettingsPanel.jsx`

Add a dropdown in the Settings panel under a new "Email" subsection (or alongside existing preferences):

```
Email Style: [Auto ▾]
  Auto     — Matches your speaking tone
  Formal   — Professional and polished
  Casual   — Warm and conversational
  Direct   — Concise, no fluff
```

**Storage:** `settings.json` via existing `setSetting('emailStyle', value)` / `getSetting('emailStyle', 'auto')` pattern.

**No new IPC channels needed.** The existing `getSettings()` and `setSetting()` bridge handles this. The `generateSmart()` function reads the setting at call time via `getSetting('emailStyle', 'auto')`.

---

## 5. Vercel Proxy Endpoint

**File:** `site/api/generate.js`

Add `emailStyle` as an optional parameter in the request body. Pass it through to the system prompt builder. Default: `'auto'`.

**Both sides need updating:**
1. **Server (`site/api/generate.js`):** Read `emailStyle` from request body, pass to `getEmailToneDirective()`, interpolate into the system prompt
2. **Client (`src/main/ipc-handlers.cjs`):** The proxy `fetch` call in `generateSmart()` must also send `emailStyle` in the request body:
   ```js
   body: JSON.stringify({ text: rawText, emailStyle: resolvedStyle }),
   ```

This ensures users without local API keys (who go through the Vercel proxy) also get style support.

---

## 6. Data Flow

```
User speaks: "formally email John about the deadline"
    ↓
generateSmart(transcript) called
    ↓
Voice override regex: detects "formally", sets style='formal'
Strip keyword: "email John about the deadline"
    ↓
Read emailStyle setting (used as fallback if no voice override)
    ↓
Build system prompt with getEmailToneDirective('formal')
    ↓
API call to Claude/GPT with modified system prompt
    ↓
Response: { type: 'email', result: '[formal email text]' }
    ↓
Inject at cursor (skipVoiceCommands: true)
```

---

## Files Requiring Changes

| File | Change |
|------|--------|
| `src/main/ipc-handlers.cjs` | Add `getEmailToneDirective()`, voice override regex in `generateSmart()`, read `emailStyle` via `getSetting()` on each call, send `emailStyle` in proxy fetch body, add `emailStyle` to `get-settings` handler return object |
| `src/renderer/components/SettingsPanel.jsx` | Add Email Style dropdown |
| `site/api/generate.js` | Accept `emailStyle` param, add `getEmailToneDirective()`, interpolate into system prompt |

**No changes needed:**
- `preload.js` — existing `getSettings`/`setSetting` bridge works
- `useDictation.js` — no change to dictation flow
- `Overlay.jsx` / `PromptCard.jsx` — no change to display
- Database schema — no change (settings.json only)
