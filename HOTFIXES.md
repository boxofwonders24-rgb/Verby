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

## 3. App Icon Issues
- Current: Icon sometimes shows as generic/white square
- Fix needed:
  - Verify icon renders correctly on fresh install (both Intel and ARM)
  - Test on different macOS versions (13, 14, 15)
  - Ensure DMG volume icon is also set

## 4. Other Potential Issues to Audit
- [ ] Text injection not working without Accessibility permission — need clear error message
- [ ] App shows "Electron" in menu bar in some contexts
- [ ] First launch experience — no guidance on what to do
- [ ] Enhanced mode uses Claude/GPT but free users have no API key — need fallback
- [ ] Settings panel references permissions but doesn't detect if they're actually granted
- [ ] No error handling if Whisper API fails (network down, key invalid, etc.)
- [ ] The launchd agent plist stays after app is uninstalled
- [ ] No way to report bugs or get help from within the app
