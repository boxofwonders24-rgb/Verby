# VerbyPrompt — Design Spec

## Overview
VerbyPrompt is a desktop-first (Electron) voice-to-prompt application. Users press a global hotkey, speak naturally, and VerbyPrompt converts their messy speech into a perfectly structured AI prompt — then optionally sends it to Claude or ChatGPT.

## Core User Flow
1. User presses global hotkey (default: Cmd+Shift+Space on macOS)
2. Floating overlay appears with recording indicator
3. User speaks naturally ("help me write an email to my boss about taking Friday off")
4. Release hotkey or press again to stop recording
5. Audio sent to Whisper API → raw transcript
6. Transcript sent to Claude API → optimized, structured prompt
7. User sees the polished prompt in the overlay
8. User can: copy to clipboard, send to ChatGPT/Claude, edit, save, or dismiss

## Architecture
- **Electron** shell for desktop (global hotkeys, tray icon, overlay window)
- **React + Tailwind** frontend inside Electron renderer
- **Node.js** main process handles hotkeys, audio recording, API calls
- **SQLite** (via better-sqlite3) for local prompt history, favorites, tags
- **Whisper API** for speech-to-text
- **Claude API** (default) + OpenAI API for prompt optimization

## Key Components
1. **Main Process** — Electron lifecycle, global shortcuts, tray, IPC
2. **Overlay Window** — frameless, transparent, floating input bar UI
3. **Audio Capture** — system mic access via Electron/Web Audio API
4. **STT Service** — sends audio to Whisper API, returns transcript
5. **Prompt Engine** — sends transcript to Claude/OpenAI, returns optimized prompt
6. **History Store** — SQLite CRUD for prompts, tags, favorites
7. **Settings** — API keys, hotkey config, theme, default AI provider
8. **LLM Dispatch** — sends finalized prompts to ChatGPT/Claude APIs

## Prompt Engine Design
The prompt engine takes raw speech and transforms it using a meta-prompt that:
- Detects user intent (coding, business, marketing, general)
- Assigns appropriate role
- Structures the output with clear task, constraints, and format
- Adapts tone and detail level

## Data Model
- **Prompt**: id, raw_transcript, optimized_prompt, category, created_at, is_favorite
- **Tag**: id, name
- **PromptTag**: prompt_id, tag_id
- **Settings**: key, value (API keys, preferences)

## Tech Stack
- Electron 33+
- React 18+ with Tailwind CSS 3
- better-sqlite3
- OpenAI SDK (for Whisper + GPT)
- Anthropic SDK (for Claude)
- electron-store (for settings)
- Web Audio API (for mic capture)
