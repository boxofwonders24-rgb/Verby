# GEO (Generative Engine Optimization) Audit — verbyai.com

**Audit Date:** April 8, 2026  
**Auditor:** Automated GEO Analysis  
**Site:** https://verbyai.com  
**Source:** /Users/lotsofsocks/Development/verbyprompt/site/

---

## GEO Readiness Score: 62 / 100

| Dimension                    | Weight | Score | Weighted |
|------------------------------|--------|-------|----------|
| Citability                   | 25%    | 58    | 14.5     |
| Structural Readability       | 20%    | 75    | 15.0     |
| Multi-Modal Content          | 15%    | 30    | 4.5      |
| Authority & Brand Signals    | 20%    | 45    | 9.0     |
| Technical Accessibility      | 20%    | 95    | 19.0     |
| **TOTAL**                    |        |       | **62.0** |

---

## 1. AI Crawler Access Status

### robots.txt — EXCELLENT

| Crawler            | Purpose              | Status    |
|--------------------|----------------------|-----------|
| GPTBot             | ChatGPT search       | ALLOWED   |
| ChatGPT-User       | ChatGPT browsing     | ALLOWED   |
| Google-Extended    | Google AI Overviews   | ALLOWED   |
| ClaudeBot          | Claude AI search      | ALLOWED   |
| PerplexityBot      | Perplexity search     | ALLOWED   |
| Applebot-Extended  | Apple Intelligence    | ALLOWED   |
| * (wildcard)       | All other crawlers    | ALLOWED   |

### Missing Crawlers (should add explicitly)

| Crawler            | Purpose                        | Status    |
|--------------------|--------------------------------|-----------|
| OAI-SearchBot      | OpenAI search (distinct from GPTBot) | NOT LISTED |
| Bingbot            | Bing Copilot source            | NOT LISTED (allowed by wildcard) |
| cohere-ai          | Cohere models                  | NOT LISTED |
| CCBot              | Common Crawl (training)        | NOT LISTED |
| anthropic-ai       | Anthropic training             | NOT LISTED |

**Recommendation:** Add explicit `OAI-SearchBot: Allow: /` entry. Consider adding `CCBot: Disallow: /` and `anthropic-ai: Disallow: /` to block training-only crawlers while keeping search crawlers open. Bingbot is allowed by the wildcard but an explicit entry signals intent.

---

## 2. llms.txt Compliance

**Status:** PRESENT and well-formed.

**Location:** `/llms.txt` (43 lines)

### Compliance Checklist

| Element                     | Present | Quality |
|-----------------------------|---------|---------|
| Product name + description  | Yes     | Strong  |
| Key facts (developer, URL, pricing) | Yes | Strong |
| Core features list          | Yes     | Strong  |
| Key pages with URLs         | Yes     | Strong  |
| Blog articles with URLs     | Yes     | Strong  |
| Permissions/licensing block | Yes     | Strong  |
| Content freshness date      | Yes     | "March 2026" |
| RSL 1.0 license declaration | No      | Missing |

### llms.txt Gaps

1. **No RSL 1.0 (Responsible Source License) declaration.** The permissions section says "AI models may cite, quote, and reference content from this site" which is good intent, but formalizing this with `License: RSL-1.0` would be clearer to AI systems that parse licensing headers.
2. **Content freshness date is March 2026**, but latest blog posts are from April 2026 and the sitemap shows April 7-8 updates. Update to "April 2026" to match reality.
3. **Missing newer blog articles.** The llms.txt lists 8 blog posts but the sitemap shows 11 (missing: voice-dictation-reddit-comments, voice-dictation-email-productivity, best-voice-apps-content-creators-2026).
4. **No `llms-full.txt` companion file** that provides the full content in plain text for deep parsing by LLMs. This is an emerging standard where `llms.txt` is the summary and `llms-full.txt` is the complete content dump.

---

## 3. Citability Analysis (Score: 58/100)

### 3a. Passage Length

Optimal passage length for AI citation is 134-167 words per extractable block.

| Page         | Avg Passage Length | Assessment |
|--------------|--------------------|------------|
| Homepage     | 30-50 words        | TOO SHORT — features are single sentences |
| Features     | 80-150 words       | GOOD — most features hit the sweet spot |
| Blog posts   | 150-300 words      | SLIGHTLY LONG — could be tighter |
| Pricing      | 20-40 words        | TOO SHORT — but pricing data is inherently concise |
| Help/FAQ     | 30-60 words        | ACCEPTABLE — FAQ format is naturally short |

### 3b. Direct Answer Placement

**MIXED.** The first 40-60 words of each section should directly answer the implied question.

- **Homepage hero:** GOOD. "Hold a key and speak naturally. Verby writes emails, crafts prompts, replies to Reddit and social comments, and cleans up your speech" — direct and extractable.
- **Blog posts:** WEAK. The "Best Voice-to-Text Apps" article opens with historical context ("A few years ago...") instead of immediately naming the best apps. AI models extracting answers will not find the answer in the opening.
- **Features page:** GOOD. Each feature section opens with a direct description.
- **Pricing page:** GOOD. Prices are immediately visible.

### 3c. Question-Based Headings

**ABSENT on core pages, PRESENT in FAQ schemas.**

Current headings are declarative:
- "Email Generation" (not "How does Verby generate emails?")
- "Smart Prompt Crafting" (not "What is Verby's smart prompt feature?")
- "How it works" (close, but too generic)

FAQ schema headings ARE question-based and well-formed:
- "What is Verby?" — Good
- "Is Verby free?" — Good
- "Does Verby work on Windows?" — Good

**Gap:** The visible page headings are not question-based. AI models weigh visible headings more than schema-only content.

### 3d. Self-Contained Answer Blocks

**PARTIALLY.** The homepage relies heavily on interactive mockup demonstrations (CSS-rendered app windows) rather than text paragraphs. These mockups contain excellent demo content but are embedded in deeply nested HTML `<div>` structures with inline styles, making them harder for crawlers to parse as coherent answer blocks.

Blog articles are much better — each app review in the comparison post is a self-contained block with pros, cons, and a verdict.

### 3e. Statistics and Source Attribution

**WEAK — CRITICAL GAP.**

Unattributed claims found:
- "500,000+ downloads" — no source, no date, no verification link
- "save 27%" — math is correct ($9x12=$108 vs $79) but not spelled out
- "AI models have pushed transcription accuracy past 95%" — no citation
- "3x faster" typing claim — no study referenced

None of the statistics on the site carry external source attribution. This significantly weakens citability because AI models preferentially cite claims with verifiable sources.

---

## 4. Authority & Brand Signals (Score: 45/100)

### 4a. Entity Presence

| Platform      | Status   | Impact on AI Citation |
|---------------|----------|----------------------|
| Wikipedia     | ABSENT   | HIGH negative — no entity page |
| YouTube       | ABSENT   | HIGHEST negative (~0.737 correlation) |
| Reddit        | PARTIAL  | Running Reddit ads; no organic r/Verby community |
| LinkedIn      | ABSENT   | No company page detected |
| GitHub        | PRESENT  | Releases hosted on github.com/boxofwonders24-rgb/Verby |
| Product Hunt  | UNKNOWN  | Not detected in site content |
| Twitter/X     | PRESENT  | @verbyai referenced in schema |
| Crunchbase    | UNKNOWN  | Not detected |

### 4b. Schema.org Signals — STRONG

48 structured data blocks across 21 pages. Types used:
- `SoftwareApplication` (homepage)
- `FAQPage` (homepage, pricing, help, blog comparison posts)
- `Organization` (homepage)
- `WebSite` (homepage)
- `Person` (about page — Stephen Grandy)
- `Article` (all blog posts with author, dates, publisher)
- `BreadcrumbList` (all pages)
- `ItemList` (comparison blog posts)

This is above-average structured data implementation.

### 4c. Author Signals

- **Author identified:** Stephen Grandy (in schema, meta tags, about page)
- **Visible byline on blog posts:** ABSENT — author appears only in meta tags and schema, not in the visible page content. AI crawlers that render pages will miss this.
- **Author bio/credentials:** The about page exists but does not include professional credentials, expertise markers, or links to external profiles that establish E-E-A-T.

### 4d. sameAs / Social Proof Graph

The Organization schema's `sameAs` array contains only:
```json
"sameAs": ["https://twitter.com/verbyai"]
```

This is extremely thin. Should include LinkedIn, GitHub, YouTube, Product Hunt, and any other verified profiles.

---

## 5. Structural Readability (Score: 75/100)

### 5a. HTML Semantics

- `<article>` tags used in blog posts — GOOD
- `<nav>` used for navigation — GOOD
- `<header>` used for article headers — GOOD
- `<section>` used for page sections — GOOD
- `<footer>` present — GOOD

### 5b. Heading Hierarchy

- Homepage: H1 -> H2 -> H3 hierarchy is clean
- Blog posts: Proper H1 -> H2 -> H3 nesting with ID anchors
- Features page: H1 -> H2 -> H3 hierarchy maintained

### 5c. Table of Contents

Present in blog posts with anchor links. This significantly improves AI model navigation of long-form content.

### 5d. Content-to-Code Ratio

**CONCERN.** The homepage has extensive inline CSS (~470 lines of `<style>`) and inline style attributes throughout the HTML. This inflates the HTML document size relative to actual content, which can reduce the signal-to-noise ratio for AI crawlers.

### 5e. Comparison Tables

Present in blog posts ("Side-by-Side Comparison" in best-apps article). Tables are an extremely high-signal format for AI citation — models love structured tabular data.

---

## 6. Multi-Modal Content (Score: 30/100)

### 6a. Images

- **No `<img>` tags on homepage.** The entire homepage uses CSS-rendered mockups and SVG icons instead of actual screenshots.
- **OG images exist** for social sharing (homepage.png, features.png, etc.)
- **Blog post screenshots** exist in `/images/` directory but their usage in actual pages was not confirmed in the HTML.
- **Alt text:** Because there are no `<img>` tags on the homepage, there is no alt text for AI crawlers to parse.

### 6b. Video

- **No video content anywhere on the site.** No product demos, no YouTube embeds, no video schema.
- This is the single biggest authority gap. YouTube presence has a ~0.737 correlation with AI citation — the strongest individual signal.

### 6c. Audio

- No audio samples or podcast content.

### 6d. Downloadable Assets

- DMG and EXE download links are present and functional.
- No PDF guides, whitepapers, or downloadable resources that could be indexed.

---

## 7. Technical Accessibility (Score: 95/100)

### 7a. Server-Side Rendering

**EXCELLENT.** The site is static HTML deployed on Vercel. All content is server-rendered and immediately available to crawlers without JavaScript execution. This is the gold standard for AI crawler accessibility.

### 7b. JavaScript Dependencies

- `particles.js` — decorative only, does not affect content
- `sw.js` — service worker for caching, does not block content
- `t.js` — appears to be a tracking/telemetry script
- Meta Pixel and Reddit Pixel — tracking only
- Vercel Analytics — tracking only

**No content is JavaScript-dependent.** All text, headings, links, and structured data are in the initial HTML response. EXCELLENT.

### 7c. Sitemap

Present at `/sitemap.xml` with 20 URLs, all with `<lastmod>` dates (April 2026), `<changefreq>`, and `<priority>` values. Well-formed and comprehensive.

### 7d. Performance Signals

- Font preloading configured
- CSS is inlined (no render-blocking external stylesheets beyond fonts)
- Images use caching headers (1 week for OG images, 1 year for fonts)
- Service worker for offline caching

### 7e. Bing Site Auth

`BingSiteAuth.xml` present — site is verified with Bing Webmaster Tools.

### 7f. Security Headers

Strong security headers configured in vercel.json:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Content-Security-Policy: configured

---

## 8. Platform-Specific Optimization

### Google AI Overviews — Score: 65/100

**Strengths:**
- Google-Extended explicitly allowed
- FAQPage schema on multiple pages (high AIO correlation)
- Comparison tables in blog posts
- SoftwareApplication schema with pricing

**Weaknesses:**
- No visible author bylines (E-E-A-T gap)
- Statistics without sources
- Homepage feature descriptions too short for citation blocks
- No review/rating schema

### ChatGPT (Search + Browsing) — Score: 60/100

**Strengths:**
- GPTBot and ChatGPT-User both allowed
- llms.txt present and well-formed
- Clean static HTML, easy to parse

**Weaknesses:**
- No YouTube presence (strongest correlation signal)
- No Wikipedia entity
- sameAs schema only has Twitter
- Blog intros do not lead with direct answers

### Perplexity — Score: 65/100

**Strengths:**
- PerplexityBot explicitly allowed
- Comparison blog posts align with Perplexity's preference for listicles
- Schema.org ItemList on comparison posts
- Clear pricing data

**Weaknesses:**
- No external citation network (no other sites citing Verby)
- Unattributed statistics reduce trust scoring
- No video content to pull from

### Bing Copilot — Score: 55/100

**Strengths:**
- Bingbot allowed by wildcard
- BingSiteAuth.xml verified
- Clean HTML structure

**Weaknesses:**
- OAI-SearchBot not explicitly listed in robots.txt
- No LinkedIn company presence
- No external review sites or app store listings referenced
- Thin sameAs social graph

---

## 9. Top 5 Highest-Impact Changes

### 1. Create YouTube Content (Impact: CRITICAL | Effort: HIGH)

YouTube mentions have a ~0.737 correlation with AI citations — the single strongest signal. Create:
- A 2-minute product demo video showing Verby in action
- A comparison video (Verby vs Dragon, Verby vs Otter)
- A "how to set up Verby" tutorial

Embed these on the homepage and relevant blog posts. Add `VideoObject` schema. Add YouTube channel URL to the `sameAs` array.

**Expected impact:** +15-20 points on GEO score, significant ChatGPT and Perplexity citation improvement.

### 2. Add Question-Based Headings + Direct-Answer Opening Paragraphs (Impact: HIGH | Effort: LOW)

Rewrite key headings to question format and restructure opening paragraphs:

**Before:**
```
## Email Generation
Say "email John about..." and get a ready-to-send email.
```

**After:**
```
## How Does Verby Generate Emails from Voice?
Verby generates complete, ready-to-send emails from natural speech. Say "email John about pushing the meeting to Friday" and Verby produces a professional email with greeting, body, and sign-off — then injects it at your cursor in Gmail, Outlook, or any email client. The free tier includes speech cleanup; Pro ($9/month) adds full AI email generation.
```

The "after" version is 58 words (within the 40-60 word direct-answer window) and contains the product name, feature name, example, and pricing — all in one extractable block.

Apply this pattern to:
- Every feature section on /features
- The opening paragraph of every blog post (lead with the answer, not context)
- The homepage feature cards (expand from 1 sentence to 134-167 word blocks)

**Expected impact:** +8-12 points on citability score.

### 3. Add Visible Author Bylines + Credentials (Impact: HIGH | Effort: LOW)

Currently author information exists only in meta tags and schema. Add visible bylines to all blog posts:

```html
<div class="author-byline">
  <img src="/images/stephen-grandy.jpg" alt="Stephen Grandy" width="40" height="40">
  <div>
    <strong>Stephen Grandy</strong>
    <span>Founder, Syntrix LLC | Building AI productivity tools since 2024</span>
  </div>
</div>
```

This directly strengthens E-E-A-T signals that Google AI Overviews weight heavily.

**Expected impact:** +5-8 points on authority score.

### 4. Source All Statistics + Add External Citations (Impact: HIGH | Effort: MEDIUM)

Every claim needs a source:

- "500,000+ downloads" — link to GitHub releases or app analytics dashboard
- "3x faster typing" — cite a study or create your own benchmark with methodology
- "95% transcription accuracy" — cite the OpenAI Whisper paper or your own test results
- "save 27%" — show the math explicitly: "$9/mo x 12 = $108/yr vs $79/yr = 27% savings"

Add a "Sources" or "Methodology" section to blog posts. AI models strongly prefer claims with linked evidence.

**Expected impact:** +6-10 points on citability score.

### 5. Expand sameAs + Build External Entity Presence (Impact: HIGH | Effort: MEDIUM-HIGH)

The `sameAs` schema array needs expansion. Create and link:

1. **LinkedIn company page** for Syntrix LLC / Verby
2. **GitHub repository** (already exists — add to sameAs)
3. **Product Hunt launch** — submit Verby
4. **Crunchbase profile** for Syntrix LLC
5. **AlternativeTo listing** for Verby
6. **G2 or Capterra listing**

Update the Organization schema:
```json
"sameAs": [
  "https://twitter.com/verbyai",
  "https://github.com/boxofwonders24-rgb/Verby",
  "https://linkedin.com/company/verbyai",
  "https://youtube.com/@verbyai",
  "https://producthunt.com/products/verby",
  "https://alternativeto.net/software/verby"
]
```

**Expected impact:** +8-12 points on authority score.

---

## 10. Additional Recommendations (Lower Priority)

### 10a. Add OAI-SearchBot to robots.txt

```
User-agent: OAI-SearchBot
Allow: /
```

This is OpenAI's dedicated search crawler, distinct from GPTBot. Adding it explicitly ensures coverage.

### 10b. Create llms-full.txt

A full plain-text version of all site content that LLMs can ingest in a single request. Include all feature descriptions, pricing, FAQ answers, and blog summaries.

### 10c. Add Review/Rating Schema

If you have any user testimonials or app store ratings, add `AggregateRating` schema to the SoftwareApplication:

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.8",
  "ratingCount": "127",
  "bestRating": "5"
}
```

### 10d. Reduce Inline CSS

Move the ~470 lines of inline `<style>` content from the homepage to the external `styles.css`. This improves the content-to-markup ratio that crawlers evaluate.

### 10e. Add `<img>` Tags with Alt Text to Homepage

Replace or supplement the CSS mockups with actual product screenshot images. Each should have descriptive alt text:

```html
<img src="/images/verby-email-generation.png"
     alt="Verby AI converts spoken words into a professional email in Gmail"
     width="600" height="400"
     loading="lazy">
```

The `/images/` directory already contains these screenshots — they just are not used on the homepage.

### 10f. Update llms.txt

- Add the 3 missing blog articles
- Update the freshness date to April 2026
- Add an RSL-1.0 license line
- Add a "Last Updated" timestamp

### 10g. Submit to Wikipedia Notability Pipeline

A Wikipedia article requires third-party reliable sources. Start building this by:
- Getting press coverage (tech blogs, app review sites)
- Getting listed on comparison sites (G2, Capterra, AlternativeTo)
- Contributing to relevant Wikipedia articles as a cited source (not about Verby itself, but about voice-to-text technology)

---

## 11. Security Note

The mobile email capture form on the homepage contains an exposed Supabase anon key in client-side JavaScript. While anon keys are designed to be public, the endpoint `POST /rest/v1/email_leads` should have Row Level Security (RLS) policies to prevent abuse. This is not a GEO issue but was noted during the audit.

---

## Summary

verbyai.com has a **strong technical foundation** for AI search — static HTML, all major AI crawlers allowed, well-formed llms.txt, and comprehensive Schema.org markup across 21 pages. The site is in the top tier for technical accessibility.

The primary gaps are in **external authority signals** (no YouTube, no Wikipedia, no LinkedIn, thin sameAs graph) and **content citability** (no question-based headings, statistics without sources, blog intros that bury the answer, homepage reliance on CSS mockups instead of text).

The single highest-ROI action is creating YouTube content, which has the strongest measured correlation with AI citation across all platforms. The second-highest ROI action is restructuring headings and opening paragraphs for direct-answer extraction, which requires only copywriting changes to existing pages.

Current estimated platform citation probability:
- **Google AI Overviews:** Low-Medium (strong schema, weak authority)
- **ChatGPT:** Low (no YouTube, no Wikipedia, thin entity graph)
- **Perplexity:** Medium (good comparison content, PerplexityBot allowed)
- **Bing Copilot:** Low (OAI-SearchBot not listed, no LinkedIn)

With the top 5 changes implemented, the projected GEO score would rise from **62 to approximately 80-85**.
