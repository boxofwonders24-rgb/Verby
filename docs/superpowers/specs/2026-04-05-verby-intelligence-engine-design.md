# Verby Intelligence Engine — Design Spec

**Date:** 2026-04-05
**Status:** Approved
**Summary:** Replace Verby's static prompt generation with an adaptive intelligence engine that uses keyword signals, a memory graph, and dynamic system prompt assembly to produce contextually rich outputs from vague user input.

---

## Problem

Verby currently treats every input the same way:
- Always wraps output as a structured prompt with role assignment ("You are a software engineer...")
- Only distinguishes "email" vs "prompt" intent
- 7 hardcoded categories with no real impact on output quality
- Pattern learning is shallow — frequency counts and examples, no real context awareness
- Users must be explicit about what they want; vague input produces generic output

Users need different output formats depending on what they're doing — sometimes a structured AI prompt, sometimes a raw info dump, sometimes a detailed email. Verby should figure this out from context, not force the user to specify.

---

## Architecture: Hybrid Signal + LLM Fallback

### Overview

A lightweight local keyword scanner runs first on every input (no API call, <1ms). If known signals match, they set the generation mode and pull targeted context from the memory system. If nothing matches (vague input), the full context is passed to the LLM to classify and decide.

This keeps costs down for the 80% of cases where intent is obvious while handling ambiguous input gracefully.

### Pipeline Flow

```
Input (transcript or typed text)
  │
  ├─► Signal Scanner (local, <1ms)
  │     │
  │     ├─ Signals matched ──► Generation Hints
  │     │                        { format, tone, detail, entities[] }
  │     │                              │
  │     │                              ▼
  │     │                     Context Assembly (targeted)
  │     │                        Pull only relevant entities
  │     │                              │
  │     └─ No signals ────────► Context Assembly (broad)
  │                                Pull active project, recent
  │                                history, top entities
  │                                      │
  ▼                                      ▼
  System Prompt Construction (dynamic)
    - Base instructions (no hardcoded role)
    - Format template (matched to mode)
    - Relevant entity context
    - Output preferences (learned)
    - Active project context
    - Foreground app context (macOS)
          │
          ▼
  LLM Call (Claude / GPT)
          │
          ▼
  Post-Generation Learning
    - Extract new entities
    - Record format used
    - Track user behavior (copy/edit/regenerate)
    - Update output preferences
```

---

## 1. Memory System

### New SQLite Tables

Three new tables extend the existing database. The current `patterns` and `context` tables remain for backward compatibility.

#### `entities`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `name` | TEXT | Entity name (e.g., "John", "Homepage Redesign") |
| `type` | TEXT | person / project / tool / company |
| `metadata` | TEXT (JSON) | Flexible details (e.g., `{"role": "client", "tone": "formal"}`) |
| `mention_count` | INTEGER | How often referenced |
| `last_referenced` | TIMESTAMP | Last time this entity appeared in input/output |
| `created_at` | TIMESTAMP | When first detected |

#### `relationships`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `subject_id` | INTEGER FK | References entities.id |
| `verb` | TEXT | Relationship type (e.g., "works on", "prefers", "manages") |
| `object_id` | INTEGER FK | References entities.id |
| `confidence` | REAL | 0.0–1.0, increases with repeated observation |
| `created_at` | TIMESTAMP | When first observed |

#### `output_preferences`

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `context_pattern` | TEXT | What triggered this preference (e.g., "email + client mention") |
| `preferred_format` | TEXT | prompt / email / info_dump / quick_action / communication / document |
| `preferred_tone` | TEXT | professional / casual / technical / concise |
| `preferred_detail` | TEXT | high / medium / low |
| `success_count` | INTEGER | Times user accepted output in this format |
| `reject_count` | INTEGER | Times user regenerated/heavily edited |
| `last_used` | TIMESTAMP | Last time this preference was applied |

### Backup Strategy

- **Storage:** Local SQLite (primary), Supabase (backup)
- **Backup trigger:** On app quit, snapshot `entities`, `relationships`, and `output_preferences` as compressed JSON to Supabase, keyed by user ID
- **Recovery:** On fresh install or data loss, pull latest snapshot from Supabase and hydrate local tables
- **No real-time sync** — backup is periodic, not live

---

## 2. Signal Scanner

### Purpose

Fast, local keyword detection that runs before any API call. Produces generation hints that guide context assembly and system prompt construction.

### Signal Tiers

#### Built-in Signals (~20-30, ship with app)

| Signal Group | Keywords | Mode |
|-------------|----------|------|
| Communication | email, message, slack, text, reply, respond | `email` or `communication` |
| Troubleshooting | fix, debug, error, broken, not working, issue | `prompt` (troubleshooting template) |
| Creation | write, draft, create, build, make, generate | `prompt` or `document` |
| Information | explain, what is, how does, tell me about, summary | `info_dump` |
| Quick | command for, snippet, one-liner, shortcut | `quick_action` |

#### Learned Signals (auto-detected)

- Verby tracks which words/phrases frequently co-occur with specific entities or output formats
- Example: user frequently says "for John" before email-type outputs → "John" becomes a signal that primes email mode and pulls John's entity context
- Requires minimum 3 occurrences before a learned signal activates
- Stored in `output_preferences` table as `context_pattern`

#### User-Defined Signals (power user, optional)

- Configurable in settings panel
- Simple mapping: trigger phrase → behavior description
- Example: "standup" → format: info_dump, tone: concise, pull: recent project activity
- Stored in a new `custom_signals` entry in electron-store settings (not SQLite — these are config, not learned data)

### Signal Output

Each matched signal produces a generation hint:

```json
{
  "format": "email",
  "tone": "professional",
  "detail": "high",
  "entities": ["John", "Homepage Redesign"],
  "confidence": 0.85
}
```

Multiple signals merge. Conflicts resolve by highest confidence. If overall confidence is below 0.5, fall back to LLM classification.

---

## 3. Generation Engine

### Replaces

- `generateSmart()` — current intent detection (email vs prompt)
- `optimize()` — current classification (conversational/task/fix/rewrite)

### New Unified Function: `generate()`

Located in `ipc-handlers.cjs`, replaces the existing generation path when the feature flag is enabled.

### Dynamic System Prompt Assembly

The system prompt is no longer static. It's constructed per-request from modular sections:

1. **Base instructions** — universal rules (no hardcoded "You are a..." role)
2. **Format template** — matched to the detected mode:

| Format | Template Focus |
|--------|---------------|
| `prompt` | Structured AI prompt with role, deliverables, constraints — only when the user actually wants to generate a prompt for an AI |
| `email` | Full message with context-aware tone, appropriate length, sign-off |
| `info_dump` | Organized facts, specs, bullet points, no prompt wrapper |
| `quick_action` | One-liner, command, snippet — minimal explanation |
| `communication` | Casual message (Slack, text) — match platform norms |
| `document` | Longer-form structured content with sections |

3. **Entity context** — relevant entities and relationships pulled from memory (targeted if signals fired, broad if LLM fallback)
4. **Output preferences** — learned tone/detail/format preferences for this context
5. **Active project** — from `context` table (existing)
6. **Foreground app** — macOS app detection (existing)
7. **Recent history** — last 5 prompts (existing, but now format-aware)

### Post-Generation Learning

After every output delivery, run a background learning pass:

1. **Entity extraction** — scan input and output for new names, projects, tools. Add to `entities` table or increment `mention_count`
2. **Relationship inference** — if two entities co-occur repeatedly, create/strengthen a relationship
3. **Behavior tracking** — did the user:
   - Copy the output? → `success_count++` on the output preference
   - Regenerate? → `reject_count++`, note what was different
   - Edit heavily after copy? → Partial success, adjust preference confidence
4. **Signal learning** — if a new word/phrase consistently precedes a specific format, promote it to a learned signal

---

## 4. Testing & Rollout

### Feature Flag

The entire intelligence engine sits behind a boolean toggle:
- `useIntelligenceEngine` in electron-store settings
- Default: `false` (existing pipeline unchanged)
- Toggled via settings panel or dev shortcut

### Phase 1 — Internal Testing

- **A/B comparison mode**: Both old and new pipelines run on the same input. Results shown side by side for direct comparison. Activated via dev setting.
- **Memory inspector**: Hidden dev panel (keyboard shortcut) showing:
  - Entities Verby has learned
  - Signals that fired on last input
  - Context that was assembled
  - Why the format was chosen
  - Generation hints with confidence scores
- **Manual override**: If the new system picks the wrong format, user corrects it. Correction feeds back into `output_preferences` immediately.
- **No public-facing changes** during this phase.

### Phase 2 — Soft Rollout

- Intelligence engine becomes default for Pro users
- Old system available as fallback toggle in settings
- Monitor metrics:
  - Regeneration rate (lower = better)
  - Copy rate (higher = better)
  - Edit-after-copy rate (lower = better)

### Phase 3 — Full Rollout

- Remove old pipeline once metrics confirm improvement
- Keep feature flag for emergency rollback
- Old `generateSmart()` and `optimize()` code removed in a cleanup pass

---

## Data Flow Summary

```
User speaks: "write something for John about the thing"
  │
  ▼
Signal Scanner detects:
  - "write" → creation signal (format: prompt or document)
  - "John" → learned signal (entity: John, type: person, primes: email mode)
  │
  ▼
Signals merge:
  - "John" overrides "write" for format (email > generic creation)
  - Hint: { format: email, tone: professional, detail: high, entities: [John] }
  │
  ▼
Context Assembly:
  - Pull John entity: { role: client, tone: formal, company: Acme }
  - Pull John relationships: works on → Homepage Redesign (status: delayed)
  - Pull output preference: email + client → professional, detailed
  - Pull active project: Homepage Redesign (if set)
  │
  ▼
System Prompt:
  "Generate a professional email. The recipient is John, a client at Acme.
   Relevant context: The Homepage Redesign project is currently delayed.
   Use a professional, detailed tone. Include specific next steps."
  │
  ▼
LLM generates a contextually rich email about the homepage timeline
  │
  ▼
Post-generation:
  - Confirm John entity exists, update last_referenced
  - Confirm Homepage Redesign entity, update last_referenced
  - Strengthen relationship: John ↔ Homepage Redesign
  - Wait for user behavior (copy/edit/regenerate)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/main/ipc-handlers.cjs` | New `generate()` function, signal scanner, context assembly, post-generation learning, memory inspector IPC handlers |
| `src/main/db.cjs` (or equivalent) | New table schemas, entity CRUD, relationship queries, preference tracking |
| `src/renderer/components/Overlay.jsx` | A/B comparison UI (dev mode), format override control |
| `src/renderer/components/SettingsPanel.jsx` | Intelligence engine toggle, custom signals config, memory inspector shortcut |
| New: `src/main/signals.cjs` | Signal registry, scanner logic, hint merging |
| New: `src/main/memory.cjs` | Entity extraction, relationship inference, preference learning |
| New: `src/main/context-assembler.cjs` | Dynamic system prompt construction from modular sections |
| New: `src/renderer/components/MemoryInspector.jsx` | Dev panel for viewing entities, signals, context decisions |

---

## Out of Scope

- Real-time cloud sync (backup only)
- User-facing learning/education features (flashcards, quizzes)
- Changes to the audio/transcription pipeline
- Changes to auth, billing, or freemium limits
- UI redesign (existing layout stays, new components are additive)
