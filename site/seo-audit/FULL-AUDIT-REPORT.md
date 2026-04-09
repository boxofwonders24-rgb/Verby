# verbyai.com Full SEO Audit Report

**Date:** April 9, 2026
**Overall SEO Health Score: 74 / 100**

---

## Executive Summary

verbyai.com is a well-built static site with strong technical fundamentals (82/100), good blog content depth (avg 2,943 words across 11 posts), and solid structured data. The main weaknesses are in content authority signals (no visible author bylines, no testimonials), keyword optimization (generic H1s on key pages), and a critical CSP misconfiguration silently blocking your Supabase analytics.

### Top 5 Critical Issues

1. **CSP blocks Supabase** -- Page view tracking and mobile email capture are silently failing. You're losing all analytics data.
2. **Help page content is JS-only** -- Only 76 words indexable by Google. The 1,510 words of FAQ content load via JavaScript from JSON.
3. **3 blog posts say "Windows coming soon"** but Windows is already live -- factual inaccuracy hurting trust.
4. **Contact page still uses old email** (`support@verbyai.com`) -- inconsistent with help page (`verbysupport@syntrixdev.com`).
5. **Generic H1 tags** on help ("How can we help?"), pricing ("Simple, transparent pricing"), and features ("Everything Verby can do") -- zero keyword value.

### Top 5 Quick Wins

1. **Fix help page title/H1/keywords** -- Single biggest keyword gap on the site. 10 minutes of work.
2. **Fix features H1** -- Change to "AI Voice Dictation Features & Capabilities". 30 seconds.
3. **Fix pricing H1** -- Change to "Voice Dictation Pricing -- Free & Pro Plans". 30 seconds.
4. **Add Supabase to CSP connect-src** -- One line in vercel.json. Restores all tracking.
5. **Fix meta description lengths** -- 4 pages are over 160 chars and get truncated by Google.

---

## Scores by Category

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical SEO | 82 | 22% | 18.0 |
| Content Quality | 72 | 23% | 16.6 |
| On-Page SEO (Keywords) | 62 | 20% | 12.4 |
| Schema / Structured Data | 80 | 10% | 8.0 |
| Performance (CWV) | 85 | 10% | 8.5 |
| AI Search Readiness (GEO) | 62 | 10% | 6.2 |
| Images | 55 | 5% | 2.8 |
| **Total** | | **100%** | **72.5 -> 74** |

---

## CRITICAL Fixes (Do Immediately)

### 1. Fix CSP to Allow Supabase
**File:** `site/vercel.json`
**Issue:** `connect-src` doesn't include your Supabase URL. Page views and email captures silently fail.
**Fix:** Add `https://xixefdlmnfpyxopzotne.supabase.co` to the connect-src directive.

### 2. Server-Side Render Help Content
**File:** `site/help/index.html`
**Issue:** Only 76 words in the HTML. All 1,510 words of help content load from JSON via JavaScript. Google may not fully index this.
**Fix:** Inline the help content directly in the HTML, or add a `<noscript>` fallback with full content.

### 3. Fix "Windows Coming Soon" in Blog Posts
**Files:** `blog/verby-vs-dragon`, `blog/verby-vs-otter`, `blog/voice-typing-windows-guide`
**Issue:** These posts say Windows is "coming soon" but the download page has a live Windows installer.
**Fix:** Update all three to reflect Windows availability.

### 4. Fix Support Email Inconsistency
**Files:** `site/contact/index.html`, `site/privacy/index.html`
**Issue:** Contact page uses `support@verbyai.com`, help page uses `verbysupport@syntrixdev.com`.
**Fix:** Standardize to `verbysupport@syntrixdev.com` everywhere.

---

## HIGH Priority Fixes (This Week)

### 5. Keyword-Optimize H1 Tags
| Page | Current H1 | Recommended H1 |
|------|-----------|----------------|
| Help | "How can we help?" | "Verby Help Center -- Setup, Troubleshooting & FAQ" |
| Features | "Everything Verby can do" | "AI Voice Dictation Features & Capabilities" |
| Pricing | "Simple, transparent pricing" | "Voice Dictation Pricing -- Free & Pro Plans" |

### 6. Keyword-Optimize Title Tags
| Page | Current Title | Recommended Title |
|------|--------------|-------------------|
| Help | "Help Center -- Verby" | "Verby Help -- Voice Dictation Setup, Troubleshooting & FAQ" |
| Features | "Verby Features -- AI Dictation, Email Generation, Voice Prompts" | "Verby Features -- AI Voice Dictation, Email Generation & Speech-to-Text" |
| Homepage | "Verby -- Free AI Voice-to-Text App for Mac & Windows" | "Verby -- Free AI Voice Dictation & Speech-to-Text App for Mac & Windows" |

### 7. Fix Meta Description Lengths (Over 160 chars)
| Page | Current Length | Action |
|------|---------------|--------|
| Homepage | 168 chars | Trim to: "Free AI voice dictation for Mac & Windows. Verby turns speech into emails, AI prompts, and clean text -- injected at your cursor in any app. Try 20 free dictations today." |
| Download | 169 chars | Trim to: "Download Verby free for Mac & Windows. AI voice dictation and speech-to-text at your cursor. 60-second setup, no credit card. 20 free dictations daily." |
| About | 184 chars | Trim to: "Verby is an AI voice dictation app for Mac & Windows, built by Syntrix LLC. Learn about the team and mission behind the fastest voice-to-text tool." |
| Blog | 167 chars | Trim to: "Voice dictation tips, speech-to-text guides, and app comparisons. Learn to type faster, write emails by voice, and boost productivity with AI dictation." |

### 8. Fix Publisher Logo (SVG -> PNG)
**Issue:** All Article schemas and the Organization schema use `favicon.svg` as the logo. Google doesn't support SVG for logo properties in Article rich results.
**Fix:** Create a PNG version (min 112x112px, recommended 512x512px) at `/og/verby-logo.png` and update all schema blocks.

### 9. Generate 3 Missing OG Images
**Files:** `blog-reddit-comments.png`, `blog-email-productivity.png`, `blog-voice-apps-creators.png`
**Issue:** These 3 blog posts reference OG images that return 404. Social shares show no preview.
**Fix:** Export the existing SVG sources in `/og/` to 1200x630 PNGs.

### 10. Fix Sitemap
**Issues:**
- Remove deprecated `<changefreq>` and `<priority>` tags (Google ignores them)
- Update stale `<lastmod>` dates (16 of 21 entries are 1-8 days behind actual file dates)
- Add noindex to `/account` page

---

## MEDIUM Priority Fixes (This Month)

### Keywords & Content
11. **Expand meta keywords** on all pages -- most have 4-6, should have 8-12 with competitor terms like "speech recognition software", "dictation software", "free dictation app", "Whisper dictation"
12. **Update help-content.json category titles** for SEO: "Setup & Permissions" -> "Setup & Installation Guide", "Transcription" -> "Voice Transcription & Accuracy"
13. **Add visible author bylines** to all 11 blog posts with photo, bio, and credentials
14. **Expand About page** to 500+ words with founder photo, timeline, mission
15. **Create Terms of Service page** -- missing entirely, trustworthiness gap
16. **Update llms.txt** -- missing 3 newest blog posts and 4 core pages; "Windows (coming soon)" is stale

### Technical
17. **Self-host Outfit and Sora fonts** -- eliminate render-blocking Google Fonts stylesheet
18. **Move tracking pixels to body bottom** -- Meta/Reddit pixels in `<head>` delay parsing
19. **Consolidate Meta Pixel IDs** -- two different IDs split across pages (954496757306032 vs 2467011763754760)
20. **Add Meta Pixel to /about page** -- only page missing it
21. **Add noindex to /account page** -- user account page shouldn't be indexed

### GEO / AI Search
22. **Rewrite headings to question format** on core pages -- "Email Generation" -> "How Does Verby Generate Emails from Voice?" for better AI extraction
23. **Source all statistics** -- "500K+ downloads", "3x faster" claims need linked evidence
24. **Expand sameAs array** -- only has Twitter. Add LinkedIn, GitHub, Product Hunt, AlternativeTo profiles

---

## LOW Priority / Backlog

25. Add BreadcrumbList schema to /features and /pricing
26. Add font preload to /creators page
27. Add apple-touch-icon to all pages (currently only homepage)
28. Link /about from footer navigation
29. Write comparison blog posts: "Verby vs Wispr Flow", "Verby vs Voicy", "Verby vs Superwhisper"
30. Create dedicated /speech-to-text landing page for high-volume keyword
31. Create /compare alternatives hub page
32. Add YouTube content (demo videos, tutorials) -- strongest AI citation correlation
33. Add user testimonials/social proof section
34. Create author/team page for Stephen Grandy
35. Add social share buttons to blog posts
36. Submit to HSTS preload list

---

## Keyword Opportunities Summary

### Missing High-Value Keywords
| Keyword | Search Volume | Currently Used? |
|---------|--------------|-----------------|
| speech recognition software | Very High | No |
| dictation software | Very High | No |
| voice dictation software | High | No |
| free dictation app | High | No |
| speech to text app | High | In meta keywords only |
| talk to type | Medium | No |
| Whisper dictation app | Medium | No |
| voice to text Mac / Windows | High | Partially |

### Competitor Comparison Gaps
Verby has comparison posts for Dragon and Otter but NOT for:
- Wispr Flow (direct competitor, $15/mo)
- Voicy (direct competitor, $8.49/mo)
- Superwhisper (direct competitor, macOS)
- Apple Dictation (free alternative)
- Windows Voice Typing (free alternative)

---

## Individual Audit Reports

Detailed findings are in:
- `seo-audit/technical.md` -- Technical SEO (82/100)
- `seo-audit/content.md` -- Content Quality (72/100)
- `seo-audit/schema.md` -- Schema Markup
- `seo-audit/sitemap.md` -- Sitemap Analysis
- `seo-audit/geo.md` -- AI Search Readiness (62/100)
- `seo-audit/keywords.md` -- Keyword Optimization
