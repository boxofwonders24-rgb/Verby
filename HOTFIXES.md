# Verby Hotfixes — v0.1.1

## 1. Fn Key Not Working for Some Users
- Current: fn-capture runs via launchd agent, requires Input Monitoring permission
- Problem: Users don't know they need to grant Input Monitoring, and the permission flow is confusing
- Fix needed:
  - First-run onboarding that walks users through permissions
  - Detect when fn-capture isn't receiving events and show a clear notification
  - Fallback to a keyboard shortcut (Cmd+Shift+Space?) if Fn doesn't work
  - Also: Globe key setting ("Press Globe key to → Do Nothing") isn't obvious

## 2. Remove API Key Requirement — Use Bundled Keys
- Current: ALL users must enter their own OpenAI + Anthropic API keys
- Problem: Nobody should need to get their own API keys — free OR paid
- Fix needed:
  - Bundle YOUR API keys in the app (or better: proxy through a simple server)
  - Free users: 20 calls/day through your keys
  - Pro users: unlimited calls through your keys, paid for by their $9/month
  - Remove API key input fields from Settings entirely
  - Keep an "Advanced" option for power users who want to use their own keys
  - Cost: ~$3-5/month per active user in API costs (covered by $9 Pro fee)
  - Consider a lightweight proxy (Cloudflare Worker or Vercel Edge Function) to keep keys off the client

## 3. App Icon — Square Instead of Rounded
- Current: Icon renders as a hard square — no rounded corners like native macOS apps
- Problem: The .icns has rounded corners baked into the SVG (rx="112"), but macOS expects a FULL SQUARE icon and applies its OWN superellipse mask on top
- Fix needed:
  - Remove rx/ry from the SVG background rect — make it a full 512x512 square
  - macOS will clip it to the rounded superellipse shape automatically
  - This is why it looks square — the dark background fills the square, and macOS sees no reason to clip it differently
  - Regenerate .icns, rebuild DMGs, re-notarize, redeploy

## 4. Dual Hotkeys — Fn for Prompts, Ctrl for Raw Dictation
- **Hold Fn** → speech is AI-enhanced into a structured prompt, then injected
- **Hold Ctrl** → raw speech-to-text, exactly what you say, injected as-is
- Same flow for both: hold → speak → release → text appears at cursor
- Ctrl needs its own CGEventTap listener in fn-capture.swift (Ctrl modifier flag = 0x40000)
- Indicator dot color difference: indigo for Fn (prompt), teal for Ctrl (raw)

## 5. Other Potential Issues to Audit
- [ ] Text injection not working without Accessibility permission — need clear error message
- [ ] App shows "Electron" in menu bar in some contexts
- [ ] First launch experience — no guidance on what to do
- [ ] Enhanced mode uses Claude/GPT but free users have no API key — need fallback
- [ ] Settings panel references permissions but doesn't detect if they're actually granted
- [ ] No error handling if Whisper API fails (network down, key invalid, etc.)
- [ ] The launchd agent plist stays after app is uninstalled
- [ ] No way to report bugs or get help from within the app
