# Verby Email Intent Detection Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Feature:** Intent-aware email generation via voice

## Overview

Add intent detection to Verby's AI-enhanced (Fn) path so that when a user says something like "email John about the deadline", Verby generates a complete email matching their natural speaking tone and injects it at the cursor. Non-email speech continues through the current prompt enhancement path unchanged.

This is the first "intent" — the system prompt can be extended with new intent types in the future without client changes, as long as the response shape remains `{ type, result }`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Trigger method | Hybrid natural detection | AI detects email intent from speech; if unsure, falls through to prompt enhancement. No false positives. |
| Output destination | Inject at cursor (option A) | Same as current behavior. User reviews in their email client before sending. |
| Tone style | Match user's voice | Casual speech → casual email, formal speech → formal email. No personality stripping. |
| Architecture | Single LLM call (Approach 1) | Intent detection + generation in one prompt. Simplest, fits existing pipeline. |
| Server vs client detection | Server-side | Easy to update intents without app releases. All intelligence on Vercel. |
| API path | Dual-path (same as optimize-prompt) | Uses local API keys if configured; falls back to Vercel proxy. Matches existing architecture. |

## Server-Side: New Vercel Endpoint

### `/api/generate` (new file: `site/api/generate.js`)

Vercel proxy fallback endpoint. Only called when the user has no local API keys configured.

**Request:** Same shape as current `/api/optimize` — receives transcript text.

**Response:**
```json
{
  "type": "email" | "prompt",
  "result": "the generated text"
}
```

**`maxDuration: 45`** — email generation with intent classification is slower than plain optimization. 45 seconds provides headroom over the current 30s on `/api/optimize`.

**Single system prompt handles:**

1. **Intent classification:**
   - Transcript describes wanting to send/write/email someone → email mode
   - Uncertain → default to prompt enhancement (no false positives)

2. **Email generation (when detected):**
   - Extract: recipient, topic, key points from natural speech
   - Mirror the user's speaking tone (casual → casual, formal → formal)
   - Structure: greeting, body, sign-off
   - No subject line in output (user adds subject manually in their email client)

3. **Prompt enhancement (fallback):**
   - Same behavior as current `/api/optimize` — clean up and enhance the prompt

### Safety Guidelines (Baked Into Prompt)

- Never invent commitments, dates, or facts the user didn't say
- No corporate filler ("per our previous discussion", "I hope this finds you well")
- Keep it proportional — 10-second voice note doesn't produce 5-paragraph email
- When user is vague ("email Mike about the thing"), keep email short and general rather than fabricating specifics
- No generic robotic language — preserve the human quality of what was said

### Existing Endpoints

- `/api/optimize` — stays untouched. Still used by any code that calls it directly.
- `/api/transcribe` — unchanged.

## Client-Side: IPC Handler

### `ipc-handlers.cjs` — New `generate-smart` Handler

Follows the **same dual-path pattern** as existing `optimize-prompt`:
1. Check if user has local API keys (Anthropic or OpenAI)
2. If yes: build the intent-detection + generation prompt locally and call the API directly
3. If no: proxy to Vercel `/api/generate`

**Usage accounting (same as optimize-prompt):**
- Check `checkUsageLimit(true)` before calling — enforces freemium daily limit
- Call `db.incrementUsage(true)` after — counts as an enhanced usage
- Call `db.save()` to persist the result to history
- Do NOT call `db.recordPattern()` — email outputs are not meaningful for pattern learning

**Response shape:** `{ type: 'email' | 'prompt', result: '...' }` — same whether local or proxied.

## Client-Side: Fn Path Modification

### `useDictation.js` Change

Current Fn flow:
1. Transcribe audio → raw text
2. **If `enhancedMode` is on AND not raw mode:** call `optimizePrompt(text, 'general')` → read `result.optimized`
3. Inject text at cursor via `injectText()`

New Fn flow:
1. Transcribe audio → raw text
2. **If `enhancedMode` is on AND not raw mode:** call `generateSmart(text)` → read `response.result`
3. If `response.type === 'email'`: inject via `injectText()` with `skipVoiceCommands: true` flag
4. If `response.type === 'prompt'` or fallback: inject via `injectText()` as normal

**Critical: the `enhancedMode && !isRawMode.current` guard must be preserved.** When enhanced mode is off, raw transcript is injected unchanged (current behavior).

**Note:** The `toggleDictation` (Cmd+Shift+Space) path shares the same `onstop` handler, so it will also use `generateSmart` when enhanced mode is on. This is intentional — all AI-enhanced paths should benefit from intent detection.

### Voice Command Substitution Fix

The existing `inject-text` handler in `ipc-handlers.cjs` applies voice command substitutions (e.g., "period" → `.`, "new line" → `\n`). These substitutions will corrupt AI-generated email prose — "The deadline is end of period." would become "The deadline is end of .."

**Fix:** Add a `skipVoiceCommands` parameter to `inject-text`. When true, skip all voice command substitutions. The renderer passes this flag when injecting email output (`type === 'email'`). Prompt-enhanced output and raw dictation continue to use voice commands as before.

### Error Handling

The current `optimizePrompt` call has a bare `catch {}` that silently falls back to raw transcript. For email intent, this means the user's raw speech ("email John about the deadline") would be injected as literal text.

**Fix:** On error, log the failure and fall through to injecting the raw transcript (same as current), but prefix with a brief note in the console log. The user sees their raw text and can re-try. No UI error needed — this matches current error behavior and the raw fallback is acceptable.

### `preload.js` + `ipc.js` Changes

Add `generateSmart` IPC bridge and export, following existing patterns.

### Dictation Log

Add `intentType` field to the dictation log entry: `{ raw, final, enhanced, intentType, time }`. Value is `'email'`, `'prompt'`, or omitted for raw dictation.

**Unknown future types:** If the server returns an unrecognized `type` value, treat it as `'prompt'` — inject `result` as text. This ensures server-side intent additions don't break older clients.

## File Changes Summary

### New Files
- `site/api/generate.js` — Vercel proxy endpoint (~60-80 lines)

### Modified Files
- `src/main/ipc-handlers.cjs` — add `generate-smart` handler (dual-path: local keys or Vercel proxy), add `skipVoiceCommands` param to `inject-text`
- `src/main/preload.js` — add `generateSmart` bridge
- `src/renderer/lib/ipc.js` — add `generateSmart` export, update `injectText` to accept options
- `src/renderer/hooks/useDictation.js` — Fn path calls `generateSmart` instead of `optimizePrompt`, passes `skipVoiceCommands` for email type

### Untouched
- Ctrl (raw dictation) path — unchanged (uses raw transcript, no AI)
- `/api/optimize` endpoint — stays as-is
- `/api/transcribe` endpoint — unchanged
- Native binaries (fn-capture, text-inject, indicator) — NOT recompiled
- SettingsPanel, auto-update system, Stripe — untouched
- useRecording.js — untouched

## Rollback

If the new endpoint misbehaves, revert `useDictation.js` to call `optimizePrompt` instead of `generateSmart`. One-line change. The old `/api/optimize` endpoint still exists and is untouched.

## Checkpoint

Current working state tagged as `v0.2.0-stable` (commit `90da657`). Safe to restore at any time.
