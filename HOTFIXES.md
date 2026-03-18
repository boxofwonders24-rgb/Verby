# Verby Hotfixes — v0.1.1

## 1. Fn Key Not Working for Some Users
- Current: fn-capture runs via launchd agent, requires Input Monitoring permission
- Problem: Users don't know they need to grant Input Monitoring, and the permission flow is confusing
- Fix needed:
  - First-run onboarding that walks users through permissions
  - Detect when fn-capture isn't receiving events and show a clear notification
  - Fallback to a keyboard shortcut (Cmd+Shift+Space?) if Fn doesn't work
  - Also: Globe key setting ("Press Globe key to → Do Nothing") isn't obvious

## 2. API Key Errors on Free Tier
- Current: Free users get 20 dictations/day but the app still requires OpenAI key for Whisper
- Problem: Users without API keys can't use the app AT ALL — even the free tier
- Fix needed:
  - Bundle API keys for free tier (use YOUR keys, rate-limited)
  - Or: use a proxy server that handles Whisper calls for free-tier users
  - Or: offer a local speech-to-text option (macOS built-in dictation API)
  - The 20 free prompts should work out of the box with zero setup

## 3. App Icon — Square Instead of Rounded
- Current: Icon renders as a hard square — no rounded corners like native macOS apps
- Problem: The .icns has rounded corners baked into the SVG (rx="112"), but macOS expects a FULL SQUARE icon and applies its OWN superellipse mask on top
- Fix needed:
  - Remove rx/ry from the SVG background rect — make it a full 512x512 square
  - macOS will clip it to the rounded superellipse shape automatically
  - This is why it looks square — the dark background fills the square, and macOS sees no reason to clip it differently
  - Regenerate .icns, rebuild DMGs, re-notarize, redeploy

## 4. Hotkey to Toggle Enhanced vs Raw Mode
- Add a keyboard shortcut to switch between:
  - **Enhanced mode**: AI optimizes your speech into structured prompts
  - **Raw mode**: Exact transcription, just types what you say
- Suggested shortcut: Cmd+E or Fn double-tap
- Should show a brief indicator ("Enhanced ON" / "Raw Mode") when toggled
- Persistent — remembers the setting between sessions

## 5. Other Potential Issues to Audit
- [ ] Text injection not working without Accessibility permission — need clear error message
- [ ] App shows "Electron" in menu bar in some contexts
- [ ] First launch experience — no guidance on what to do
- [ ] Enhanced mode uses Claude/GPT but free users have no API key — need fallback
- [ ] Settings panel references permissions but doesn't detect if they're actually granted
- [ ] No error handling if Whisper API fails (network down, key invalid, etc.)
- [ ] The launchd agent plist stays after app is uninstalled
- [ ] No way to report bugs or get help from within the app
