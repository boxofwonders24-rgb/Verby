# Verby Email Intent Detection Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Feature:** Intent-aware email generation via voice

## Overview

Add intent detection to Verby's AI-enhanced (Fn) path so that when a user says something like "email John about the deadline", Verby generates a complete email matching their natural speaking tone and injects it at the cursor. Non-email speech continues through the current prompt enhancement path unchanged.

This is the first "intent" in a framework designed for future expansion (search, message drafting, etc.).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger method | Hybrid natural detection | AI detects email intent from speech; if unsure, falls through to prompt enhancement. No false positives. |
| Output destination | Inject at cursor (option A) | Same as current behavior. User reviews in their email client before sending. |
| Tone style | Match user's voice | Casual speech → casual email, formal speech → formal email. No personality stripping. |
| Architecture | Single LLM call (Approach 1) | Intent detection + generation in one prompt. Simplest, fits existing pipeline. |
| Server vs client detection | Server-side | Easy to update intents without app releases. All intelligence on Vercel. |
| API budget | Server proxy only | Same as current architecture. User's API keys not involved. |

## Server-Side: New Vercel Endpoint

### `/api/generate` (new file: `site/api/generate.js`)

Receives the raw transcript from the Fn (AI-enhanced) path. Performs intent detection and generation in a single LLM call.

**Request:** Same shape as current `/api/optimize` — receives transcript text.

**Response:**
```json
{
  "type": "email" | "prompt",
  "result": "the generated text"
}
```

**Single system prompt handles:**

1. **Intent classification:**
   - Transcript describes wanting to send/write/email someone → email mode
   - Uncertain → default to prompt enhancement (no false positives)

2. **Email generation (when detected):**
   - Extract: recipient, topic, key points from natural speech
   - Mirror the user's speaking tone (casual → casual, formal → formal)
   - Structure: greeting, body, sign-off
   - No subject line in output (email clients handle that)

3. **Prompt enhancement (fallback):**
   - Same behavior as current `/api/optimize` — clean up and enhance the prompt

### Safety Guidelines (Baked Into Prompt)

- Never invent commitments, dates, or facts the user didn't say
- No corporate filler ("per our previous discussion", "I hope this finds you well", "I hope this email finds you well")
- Keep it proportional — 10-second voice note doesn't produce 5-paragraph email
- When user is vague ("email Mike about the thing"), keep email short and general rather than fabricating specifics
- No generic robotic language — preserve the human quality of what was said

### Existing Endpoints

- `/api/optimize` — stays untouched. Still used by any code that calls it directly.
- `/api/transcribe` — unchanged.

## Client-Side: Fn Path Modification

### `useDictation.js` Change

Current Fn flow:
1. Transcribe audio → raw text
2. Call `optimizePrompt(text, 'general')` → enhanced text
3. Inject enhanced text at cursor

New Fn flow:
1. Transcribe audio → raw text
2. Call new `generateSmart(text)` → `{ type, result }`
3. Inject `result` at cursor (same as before)

The only behavioral difference: step 2 calls a different endpoint that may return an email instead of an enhanced prompt. The injection step is identical either way.

### `ipc-handlers.cjs` Change

Add a new IPC handler (`generate-smart`) that calls the Vercel `/api/generate` endpoint (or localhost in dev). Same pattern as existing `optimize-prompt` handler.

### `preload.js` + `ipc.js` Changes

Add `generateSmart` IPC bridge and export, following existing patterns.

### Dictation Log

The `type` field from the response is stored in the dictation log entry so users can see in their history whether a result was an email or a prompt enhancement.

## Intent Detection Framework

The system prompt is structured to support future intents:

```
You are an intent-aware assistant. Analyze the user's speech and determine what they want:

1. EMAIL: They want to send an email/message to someone → generate the email
2. DEFAULT: Anything else → enhance as a prompt

[Future intents can be added here without changing client code]
```

Adding a new intent (e.g., "search") means:
1. Add the intent to the system prompt on Vercel
2. Add a new `type` value to the response
3. Optionally handle the new type differently in the renderer (or just inject as text)

No app update required for steps 1-2. Step 3 only needed if the new intent requires different UI behavior.

## File Changes Summary

### New Files
- `site/api/generate.js` — new Vercel endpoint (~60-80 lines)

### Modified Files
- `src/main/ipc-handlers.cjs` — add `generate-smart` IPC handler
- `src/main/preload.js` — add `generateSmart` bridge
- `src/renderer/lib/ipc.js` — add `generateSmart` export
- `src/renderer/hooks/useDictation.js` — Fn path calls `generateSmart` instead of `optimizePrompt`

### Untouched
- Ctrl (raw dictation) path
- Cmd+Shift+Space toggle path
- `/api/optimize` endpoint
- `/api/transcribe` endpoint
- Native binaries (fn-capture, text-inject, indicator)
- SettingsPanel, auto-update system, Stripe
- useRecording.js

## Rollback

If the new endpoint misbehaves, revert `useDictation.js` to call `optimizePrompt` instead of `generateSmart`. One-line change. The old `/api/optimize` endpoint still exists and is untouched.

## Checkpoint

Current working state tagged as `v0.2.0-stable` (commit `90da657`). Safe to restore at any time.
