# Content Quality SEO Audit -- verbyai.com

**Audit Date:** April 8, 2026
**Auditor:** Content Quality Specialist (Google Sept 2025 QRG Framework)
**Site:** https://verbyai.com
**Pages Audited:** 10 core pages + 11 blog posts


---

## Overall Content Quality Score: 72 / 100

| Category | Score | Weight | Weighted |
|---|---|---|---|
| Experience | 68 / 100 | 20% | 13.6 |
| Expertise | 70 / 100 | 25% | 17.5 |
| Authoritativeness | 58 / 100 | 25% | 14.5 |
| Trustworthiness | 75 / 100 | 30% | 22.5 |
| **Weighted Total** | | | **68.1** |
| AI Citation Readiness | 82 / 100 | -- | -- |
| Content Freshness | 60 / 100 | -- | -- |
| Keyword Optimization | 78 / 100 | -- | -- |

**Composite Score: 72 / 100** (Weighted E-E-A-T + bonuses for citation readiness, freshness, and keyword optimization)


---

## E-E-A-T Breakdown

### Experience: 68 / 100

**Positive signals:**
- Homepage includes specific, realistic demo examples (email to John about API not being ready, habit tracker prompt) showing genuine product usage
- Blog posts include practical speed comparisons with concrete numbers (40 WPM typing vs 120 WPM speech)
- About page names the founder (Stephen Grandy) and company (Syntrix LLC)
- Features page describes exact hotkeys and workflows (Fn on Mac, CapsLock on Windows)
- Blog "type-faster-with-voice-dictation" includes a genuine speed comparison table with drafting vs cleanup time breakdowns

**Gaps:**
- No user testimonials or case studies anywhere on the site
- No screenshots or video demos embedded in any page (all demos are text-based mockups)
- No "real user story" content showing actual Verby output from real users
- The about page claims "500K+ downloads" but provides no external verification (reviews, press mentions, app store ratings)
- Blog posts lack first-person anecdotes from the author despite being authored by Stephen Grandy
- No changelog or version history page showing ongoing development activity


### Expertise: 70 / 100

**Positive signals:**
- Blog content demonstrates genuine technical understanding (Whisper API, AI language models, filler word processing)
- Comparison posts (Verby vs Dragon, Verby vs Otter) show fair, balanced analysis acknowledging competitor strengths
- Help center content is technically specific with exact file paths, permission locations, and troubleshooting steps
- Privacy policy is thorough, naming specific third-party services and linking to their privacy policies
- Features page explains technical details (OpenAI Whisper for transcription, system-level text injection)

**Gaps:**
- Author bio does not appear on any blog post (only schema markup; no visible byline with credentials)
- No author page exists for Stephen Grandy with background, qualifications, or links to other work
- No external citations or references in blog posts (all claims are unsourced)
- Blog posts reference "studies show" type statistics (e.g., "28% of workday on email") without linking to sources
- No guest posts, expert quotes, or co-authored content to establish broader expertise network


### Authoritativeness: 58 / 100

**Positive signals:**
- Strong structured data implementation (SoftwareApplication, FAQPage, Article, BreadcrumbList, Organization, Person schemas)
- llms.txt file explicitly invites AI citation and is well-structured
- robots.txt allows all major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended)
- Canonical URLs correctly set on all pages
- Twitter/X presence referenced (@verbyai)

**Gaps:**
- No external press coverage, reviews, or awards mentioned
- No backlinks from authoritative sources referenced on the site
- No third-party review scores (G2, Capterra, Product Hunt, etc.)
- No industry association memberships or certifications
- Social proof limited to a single "500K+ downloads" claim with no source
- No partner logos, integration badges, or "as seen in" sections
- SameAs schema only includes Twitter -- missing LinkedIn, GitHub, Product Hunt, etc.


### Trustworthiness: 75 / 100

**Positive signals:**
- Transparent pricing with clear free vs Pro comparison
- Privacy policy is comprehensive, specific, and recently updated (April 7, 2026)
- Multiple contact methods: support@verbyai.com, hello@verbyai.com, privacy@verbyai.com, creators@verbyai.com
- SSL/HTTPS evident in all canonical URLs
- Clear data flow explanation in privacy policy
- Stripe payment processing (trusted, well-known processor)
- 14-day refund policy clearly stated
- Children's privacy statement included (COPPA)
- Cookie/tracking pixel disclosure with opt-out instructions

**Gaps:**
- CRITICAL: Inconsistent support email addresses across pages
  - Help center uses: verbysupport@syntrixdev.com
  - Contact page uses: support@verbyai.com
  - This creates confusion about which email to use
- Two different Meta Pixel IDs used across pages (954496757306032 on homepage/download; 2467011763754760 on features/pricing/contact)
- No Terms of Service page
- No physical address or phone number listed anywhere
- No SSL certificate details or security badges visible
- "500K+ downloads" claim is unverifiable


---

## Page-by-Page Analysis

### Homepage (/)
- **Word count:** 1,199 (minimum 500 -- PASS)
- **Content depth:** Strong. Multiple demo examples, feature grid, pricing preview, FAQ section, social proof
- **H1:** "AI Voice-to-Text App for Mac & Windows" -- keyword-rich, appropriate
- **Keyword density:** "verby" at 1.9% -- acceptable, not over-optimized
- **Issues:** None major. Well-structured for both users and search engines
- **Schema:** SoftwareApplication, FAQPage, Organization, WebSite, BreadcrumbList -- excellent

### Features (/features)
- **Word count:** 989 (service page minimum 800 -- PASS)
- **Content depth:** Strong. 9 distinct feature sections with explanations, hotkeys, and technical details
- **H1:** "Everything Verby can do" -- good for brand queries, weak for keyword targeting
- **Issues:** H1 could incorporate "AI dictation features" or similar keyword phrase
- **Schema:** SoftwareApplication with featureList, BreadcrumbList -- good

### Pricing (/pricing)
- **Word count:** 300 (product page minimum 300 -- BORDERLINE PASS)
- **Content depth:** Adequate for a pricing page. Clear Free vs Pro comparison, 6 FAQ items
- **H1:** "Simple, transparent pricing" -- generic, no keywords
- **Issues:**
  - H1 should include product name and keyword (e.g., "Verby Pricing: Free AI Dictation & Pro Plans")
  - No comparison table showing feature differences between Free and Pro
  - FAQ answers are short; could expand with more detail
- **Schema:** FAQPage, SoftwareApplication with Offer details, BreadcrumbList -- excellent

### Blog Index (/blog)
- **Word count:** 460 (hub page -- adequate)
- **Content depth:** Good listing of 11 posts with dates, tags, and excerpts
- **Issues:** No category filtering, no pagination structure, no featured/pinned post
- **Schema:** BreadcrumbList only -- missing Blog schema or CollectionPage schema

### Help Center (/help)
- **Word count:** 76 in HTML shell + 1,510 in JSON = ~1,586 total (PASS)
- **Content depth:** Strong. 4 categories, 20 articles covering setup, transcription, app behavior, and billing
- **Issues:**
  - CRITICAL: All help content loads from JSON via JavaScript. Search engines may not render this content. The HTML source contains almost no indexable text (76 words)
  - Help page is essentially a JavaScript single-page app for content -- Google may not index the FAQ answers
  - Should render help content server-side or include it directly in HTML
- **Schema:** FAQPage with 5 items -- good, but only covers 5 of 20 questions

### Download (/download)
- **Word count:** 181 (download page -- adequate for conversion page)
- **Content depth:** Focused and conversion-oriented. Setup guides for both platforms, system requirements
- **Issues:**
  - Very thin on text content. Could add a brief "What is Verby" paragraph for search context
  - No download count or version changelog to signal freshness
- **Schema:** SoftwareApplication with version and downloadUrl, BreadcrumbList -- good

### About (/about)
- **Word count:** 320 (minimum 500 for an informational page -- BELOW MINIMUM)
- **Content depth:** Thin. Only 3 short sections (The Story, The Product, CTA)
- **Issues:**
  - BELOW MINIMUM word count for an informational page
  - No photo of the founder
  - No company timeline or milestones
  - No mission/vision statement beyond the header
  - "500K+ Downloads" stat displayed without source or date
  - Missing: team section, tech stack details, company values, roadmap
  - No links to external profiles (LinkedIn, GitHub, Twitter for founder)
- **Schema:** Person (Stephen Grandy), BreadcrumbList -- good but sparse

### Contact (/contact)
- **Word count:** 83 (contact page -- thin but functional)
- **Content depth:** Minimal. Three contact cards with email addresses
- **Issues:**
  - Very thin content. No contact form
  - No response time SLA beyond "typically within 24 hours" in subtitle
  - No FAQ section for common contact reasons
  - No physical address (may affect local SEO trust signals)
  - Missing link to Help Center which could deflect support queries

### Privacy (/privacy)
- **Word count:** 927 (legal page -- PASS)
- **Content depth:** Comprehensive and well-structured
- **Issues:** None significant. This is one of the strongest pages on the site from a trust perspective

### Creators (/creators)
- **Word count:** 365 (landing page -- adequate for conversion)
- **Content depth:** Covers perks, how it works, copy-paste descriptions, CTA
- **Issues:**
  - No noindex/nofollow -- this is a recruitment page that may compete with core pages for crawl budget
  - Could add creator success stories or social proof


---

## Blog Post Analysis

| Post | Words | Min 1,500 | Date Signals | Author Schema |
|---|---|---|---|---|
| type-faster-with-voice-dictation | 1,963 | PASS | pub + modified | Yes |
| voice-to-email-never-type-again | 2,637 | PASS | pub + modified | Yes |
| best-voice-to-text-apps-mac-2026 | 3,225 | PASS | pub + modified | Yes |
| voice-dictation-with-chatgpt | 3,298 | PASS | pub + modified | Yes |
| voice-typing-windows-guide | 3,090 | PASS | pub + modified | Yes |
| voice-dictation-for-developers | 3,018 | PASS | pub + modified | Yes |
| verby-vs-dragon | 3,047 | PASS | pub + modified | Yes |
| verby-vs-otter | 3,383 | PASS | pub + modified | Yes |
| voice-dictation-reddit-comments | 2,944 | PASS | pub + modified | Yes |
| voice-dictation-email-productivity | 3,364 | PASS | pub + modified | Yes |
| best-voice-apps-content-creators-2026 | 3,408 | PASS | pub + modified | Yes |

**All 11 blog posts pass the 1,500-word minimum.** Average word count is 2,943 words. Content depth is strong across the board.

**Blog content strengths:**
- Well-structured with H2/H3 hierarchy, callout boxes, comparison tables
- Internal linking between related posts
- Practical, actionable advice (not just feature marketing)
- Balanced competitor comparisons that acknowledge competitor advantages
- Strong use of structured data (Article, FAQ, BreadcrumbList schemas on all posts)

**Blog content issues:**
- No visible author byline on 10 of 11 posts (author data exists only in schema markup, not rendered on page)
- No author photo or bio section at the bottom of posts
- No "Last updated" date visible to users (only in schema)
- No social share buttons
- No comment section or engagement mechanism
- No estimated reading time on most posts (only some show "X min read")


---

## Content Freshness Issues

### CRITICAL: Windows "Coming Soon" vs Available Now

Three blog posts say Windows support is "coming soon":
- `/blog/verby-vs-dragon` -- comparison table says "Coming soon" for Windows
- `/blog/verby-vs-otter` -- comparison table says "Coming soon" for Windows
- `/blog/voice-typing-windows-guide` -- says Windows version "coming soon"

**But the download page already has a live Windows download link** (VerbyPrompt-Setup-0.7.2.exe).

This is a factual inaccuracy that:
1. Undermines trust with users who read the blog and think Windows is not available
2. Signals stale content to search engines
3. Could confuse AI models that cite these pages

**Fix:** Update all three blog posts to reflect that Verby is now available on Windows. Update the comparison tables, body text, and FAQ schema accordingly.

### Other Freshness Concerns
- All blog posts show dates in March-April 2026 range, which is fresh
- Sitemap lastmod dates are recent (April 7-8, 2026)
- Software version (0.7.2) is referenced consistently in download page and schema


---

## AI Citation Readiness: 82 / 100

**Strong signals:**
- llms.txt file exists with well-structured product facts, features, and page links
- Explicit permission statement: "AI models may cite, quote, and reference content from this site"
- robots.txt allows all major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, Applebot-Extended)
- Rich structured data across all pages (SoftwareApplication, FAQPage, Article, Organization, Person)
- Clear, quotable facts: pricing ($0 free, $9/mo Pro, $79/yr), platforms (Mac + Windows), founder (Stephen Grandy)
- FAQ schema on homepage, pricing, help, and comparison posts makes answers directly extractable
- Content uses clear, declarative sentences that AI models can cite directly

**Gaps:**
- llms.txt says "as of March 2026" but it is now April 2026 -- should update
- llms.txt lists "Windows (coming soon)" but Windows is now available
- No structured comparison data that AI models could use for "Verby vs X" queries
- Blog posts lack a TL;DR or key takeaways section that AI models could extract as summaries
- No data tables with alt text or structured table markup beyond inline HTML tables


---

## Keyword Optimization: 78 / 100

**Homepage keyword density (natural, not stuffed):**
- "verby" 1.9% -- appropriate for brand
- "voice" 0.6% -- could be slightly higher
- "email" 0.9% -- good for feature keyword
- "cursor" 0.7% -- unique differentiator keyword
- "mac" / "windows" 0.6% each -- balanced

**Title tag optimization:**
- All 10 pages have unique, keyword-relevant title tags
- Most include the brand name "Verby"
- No title truncation issues (all under 60 chars or appropriately structured)

**Meta description optimization:**
- All 10 pages have unique meta descriptions
- Descriptions include CTAs ("Try it now," "Download free")
- Good length (120-160 characters)

**H1 optimization issues:**
- Homepage H1 missing "Verby" brand name
- Pricing H1 ("Simple, transparent pricing") is generic -- no keywords
- Help H1 ("How can we help?") is generic -- no keywords
- Contact H1 ("Get in touch") is generic -- no keywords
- These dilute topical relevance for their target queries

**Keyword gaps (missing target pages):**
- No "voice to text" or "speech to text" standalone landing page
- No "AI dictation" category page
- No comparison hub page listing all vs pages
- No "free voice dictation" landing page optimized for that high-intent query


---

## Duplicate Content Issues

**No duplicate meta descriptions or titles found.** All 10 pages and 11 blog posts have unique title tags and meta descriptions. This is well-executed.

**Near-duplicate content concerns:**
- Homepage pricing section duplicates content from the pricing page (similar feature lists, same pricing)
- This is normal and expected for SaaS sites; not a penalty risk

**Internal cannibalization risk:**
- `/blog/voice-to-email-never-type-again` and `/blog/voice-dictation-email-productivity` target overlapping keywords (voice + email + dictation). These could cannibalize each other for email-related queries. Consider differentiating their target queries more clearly or adding a canonical hint.


---

## Technical Content Issues

### Inconsistent Support Email Addresses
- Help center: verbysupport@syntrixdev.com
- Contact page: support@verbyai.com
- Privacy page: support@verbyai.com, privacy@verbyai.com
- Creators page: creators@verbyai.com

**Fix:** Standardize all support references to support@verbyai.com. The syntrixdev.com domain creates brand confusion.

### Two Different Meta Pixel IDs
- Homepage + Download: 954496757306032
- Features + Pricing + Contact: 2467011763754760
- About page: No pixel at all

**Fix:** Use a single pixel ID across all pages, or if two are intentional (different ad accounts), document this. The about page should have the pixel.

### Help Center Rendering Risk
All help content is loaded via JavaScript from `/data/help-content.json`. While Googlebot does render JavaScript, this:
- Adds latency to content discovery
- Creates risk of incomplete indexing
- Means the help page HTML has only 76 indexable words

**Fix:** Either server-side render the help content or include a noscript fallback with the full content inline.


---

## Missing Content Opportunities

### HIGH PRIORITY

1. **Author/Team page** -- Create a dedicated page for Stephen Grandy with photo, bio, credentials, social links. Link from all blog post bylines. Critical for E-E-A-T.

2. **Visible author bylines on blog posts** -- Add a rendered author name, photo, and short bio to every blog post. Schema markup alone is not enough for E-E-A-T.

3. **User testimonials/reviews section** -- Add real user quotes to the homepage and a dedicated testimonials page. Even 3-5 genuine testimonials would materially improve Experience signals.

4. **Terms of Service page** -- Missing entirely. Required for Trustworthiness.

5. **Update stale Windows references** -- Fix the 3 blog posts that say Windows is "coming soon."

### MEDIUM PRIORITY

6. **Comparison hub page** -- Create /compare or /alternatives page that links to all comparison posts. Targets "best voice to text" and "voice dictation alternatives" queries.

7. **Changelog/release notes page** -- Demonstrate ongoing development. Current version is 0.7.2 but there is no public changelog.

8. **Video demos** -- Embed a short demo video on the homepage and features page. All current demos are text-based mockups.

9. **Integration pages** -- Create dedicated pages for key integrations (Verby + ChatGPT, Verby + VS Code, Verby + Gmail) to capture long-tail queries.

10. **"Last updated" visible dates on blog posts** -- Show the dateModified date visibly to users, not just in schema.

### LOWER PRIORITY

11. **Social share buttons on blog posts** -- Enable content distribution and social signals.

12. **Related posts section improvements** -- Current related posts are static lists. Add dynamic recommendations.

13. **Blog category pages** -- Create /blog/productivity, /blog/comparisons, /blog/tutorials with category-specific content.

14. **Newsletter signup** -- No email capture mechanism anywhere on the site.

15. **Product Hunt / G2 / Capterra listings** -- Create profiles on software review platforms for external authority signals.


---

## AI-Generated Content Assessment

Per the September 2025 Quality Rater Guidelines, AI content is acceptable if it demonstrates genuine E-E-A-T. Assessment:

**Blog posts show signs of AI assistance but with genuine editorial direction:**
- Content is specific to Verby's actual features and workflows
- Competitor comparisons are balanced and factually grounded
- Technical details (hotkeys, file paths, API names) reflect real product knowledge
- No generic filler or placeholder content detected
- Writing style is consistent but not robotic -- uses varied sentence structure

**Risk areas:**
- The lack of visible author bylines makes it harder for quality raters to assess whether the content was written or reviewed by a subject matter expert
- No first-person anecdotes ("When I built Verby..." or "In my experience...") which would signal genuine authorship
- Blog posts are uniformly well-structured (consistent H2/H3 patterns, callout boxes) which could be flagged as template-generated

**Recommendation:** Add visible author attribution, first-person perspective where appropriate, and "updated by [name] on [date]" notices to demonstrate human editorial oversight.


---

## Summary of Critical Fixes (Priority Order)

1. Update 3 blog posts with stale "Windows coming soon" content -- factual accuracy issue
2. Standardize support email to support@verbyai.com across all pages
3. Add visible author bylines with photo and bio to all blog posts
4. Server-side render help center content (currently JS-only, 76 indexable words)
5. Create Terms of Service page
6. Expand About page to 500+ words with founder photo, mission, timeline
7. Fix Meta Pixel ID inconsistency (two different IDs across pages, one page missing pixel)
8. Add keyword-relevant H1 tags to pricing, help, and contact pages
9. Create an author/team page for Stephen Grandy
10. Add user testimonials or social proof beyond the unverifiable "500K+" claim
