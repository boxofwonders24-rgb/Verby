# Verby Website Update Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Feature:** Update verbyai.com to showcase v0.3.0 features

## Overview

Update the verbyai.com landing page to reflect Verby's expanded capabilities: email generation, speech cleanup, and smart prompts. Broaden positioning from "Voice to Perfect Prompts" to a general-purpose voice AI tool. Add a prominent annual pricing option.

## Changes

### 1. Hero Section

**Badge:** "Voice-to-Prompt AI for macOS" → "Voice-Powered AI for macOS"

**Headline:** "Talk to any app. Verby writes the prompt." → "Talk to any app. **Verby handles the rest.**"

**Subtitle:** "Hold Fn and speak naturally. Verby writes emails, crafts prompts, and cleans up your speech — injected instantly wherever your cursor is. No typing. No copy-paste."

**Meta tags:** Update og:title, og:description, twitter:title, twitter:description, and page description to match broader positioning.

### 2. Demo Section (Replace Existing)

Replace the single demo walkthrough with two stacked demos:

**Demo 1: Email Generation**
- Step 1 (raw): "Hey uh tell John we need to push the meeting to Friday because the API isn't ready yet"
- Step 2 (result): A complete casual email to John about pushing the meeting
- Step 3: "Injected at your cursor in Gmail, Outlook, Apple Mail — anywhere you type."

**Demo 2: Smart Prompts**
- Step 1 (raw): "Hey uh write me an app that tracks my daily habits and shows me a streak calendar"
- Step 2 (result): A structured prompt with role, requirements, tech stack, output spec
- Step 3: "Injected at your cursor in ChatGPT, Claude, VS Code — anywhere you type."

Same visual style (numbered steps, colored example boxes).

### 3. Features Grid (Replace Existing 6 Features)

1. **Three Input Modes** — Fn for AI-enhanced, Ctrl for speech cleanup, Cmd+Shift+Space for toggle. System-wide hotkeys, works in any app.
2. **Email Generation** — Say "email John about..." and get a ready-to-send email matching your natural tone. No templates, no forms.
3. **Context Aware** — Auto-detects your current app and project. Prompts are tailored to what you're working on right now.
4. **Instant Injection** — Text appears at your cursor — ChatGPT, Slack, VS Code, email. No copy-paste.
5. **Speech Cleanup** — Ctrl key cleans up grammar and filler words while keeping your natural voice. Perfect for quick messages.
6. **Auto-Updates** — New versions delivered automatically. No manual downloads needed.

### 4. Pricing Section

**Free tier:**
- 20 dictations per day
- Speech cleanup (Ctrl)
- System-wide hotkeys
- Text injection

**Pro tier — with prominent annual option:**
- Monthly: $9/mo
- Annual: $79/yr (save 27%) — visually highlighted
- Unlimited dictations
- AI email generation
- Smart prompt enhancement
- Context awareness
- Pattern learning
- Auto-updates + priority support

Annual plan should be visually prominent (toggle, badge, or side-by-side comparison showing savings).

### 5. Download Section

Update version: v0.1.0 → v0.3.0

### 6. Meta Tags

- title: "Verby — Voice-Powered AI for macOS"
- og:title: "Verby — Voice-Powered AI for macOS"
- og:description: "Talk to any app. Verby writes emails, crafts prompts, and cleans up your speech — injected at your cursor."
- twitter:title: same
- twitter:description: same
- page meta description: same

## File Changes

### Modified Files
- `site/index.html` — all changes in this single file

### Untouched
- `site/api/*` — all endpoints unchanged
- App code — no changes
- DMGs — already v0.3.0

## Rollback

Revert `site/index.html` to the previous commit. One file change.
