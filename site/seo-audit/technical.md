# Technical SEO Audit: verbyai.com

**Date:** 2026-04-08
**Auditor:** Automated Technical SEO Analysis
**Site Type:** Static HTML/CSS/JS on Vercel
**Pages Audited:** 22 (11 core + 11 blog articles)
**Overall Score: 82 / 100**

---

## Executive Summary

verbyai.com is a well-structured static site with strong fundamentals: proper HTTPS enforcement, comprehensive security headers, clean URL structure, valid canonical tags, and rich structured data across all pages. The site is server-rendered HTML with no JavaScript rendering dependency, making it fully crawlable. Key issues center around three missing OG images (404), the /account page lacking noindex, inconsistent Meta Pixel IDs across pages, Supabase blocked by the Content Security Policy, and the /creators page missing its font preload. No critical issues were found.

---

## 1. Crawlability

**Status: PASS**

### robots.txt
- Location: https://verbyai.com/robots.txt
- `User-agent: *` with `Allow: /` -- fully open
- AI crawlers explicitly allowed: GPTBot, ChatGPT-User, Google-Extended, ClaudeBot, PerplexityBot, Applebot-Extended
- Sitemap directive present and correct: `Sitemap: https://verbyai.com/sitemap.xml`
- Proper `Cache-Control: public, max-age=86400` header via vercel.json

### sitemap.xml
- Valid XML sitemap with 21 URLs
- All `<loc>` entries use consistent `https://verbyai.com` (no trailing slashes, no www)
- `<lastmod>`, `<changefreq>`, and `<priority>` present on all entries
- All sitemap URLs return HTTP 200

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Medium | /account missing from sitemap | The /account page exists on disk and is linked from the homepage footer, but is not in the sitemap. This is acceptable IF noindex is added (see Indexability section). Currently it is indexed. |
| Low | llms.txt missing newer blog posts | llms.txt lists 8 blog articles but the site now has 11. The 3 newest (voice-dictation-reddit-comments, voice-dictation-email-productivity, best-voice-apps-content-creators-2026) are missing. |

### AI Crawler Management
- llms.txt present at /llms.txt with structured product info and explicit permission for AI citation
- Bing verification: BingSiteAuth.xml present
- IndexNow key file: 65ea802718f954579ad591fceecd8315.txt present

---

## 2. Indexability

**Status: PASS (with caveats)**

### Canonical Tags
All 22 HTML pages have a `<link rel="canonical">` tag. Every canonical URL:
- Uses `https://` (no http)
- Uses `verbyai.com` (no www)
- Has no trailing slash (except the homepage which correctly uses `/`)
- Matches the page's actual URL path

Canonical-to-og:url consistency: All pages match. The homepage has a minor mismatch where canonical is `https://verbyai.com/` (with trailing slash) but og:url is `https://verbyai.com` (without). This is cosmetic and not a crawl issue, but standardizing is recommended.

### noindex Directives
- 404.html: Correctly has `<meta name="robots" content="noindex">`
- All other pages: No noindex (all indexable)

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Medium | /account page should have noindex | This is a user account management page. It has no meaningful indexable content, and indexing it could create a thin content signal. Add `<meta name="robots" content="noindex">` |
| Low | Homepage og:url missing trailing slash | canonical = `https://verbyai.com/` but og:url = `https://verbyai.com`. Should be identical. |

### Duplicate Content Risk
- No duplicate content risk detected. All pages have unique titles, descriptions, and canonical tags.
- Trailing slash redirect configured in vercel.json (`/:path+/` -> `/:path+` with 301). Correct.

---

## 3. Security

**Status: PASS**

### HTTPS
- HTTP -> HTTPS redirect: 308 Permanent Redirect (correct)
- HSTS: `strict-transport-security: max-age=63072000` (2 years, strong)

### Security Headers (all pages via vercel.json)

| Header | Value | Status |
|--------|-------|--------|
| Content-Security-Policy | Comprehensive policy with default-src, script-src, style-src, font-src, img-src, connect-src, frame-src, object-src, base-uri | PASS |
| X-Frame-Options | DENY | PASS |
| X-Content-Type-Options | nosniff | PASS |
| Referrer-Policy | strict-origin-when-cross-origin | PASS |
| Permissions-Policy | camera=(), geolocation=(), microphone=() | PASS |

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| High | CSP blocks Supabase tracker (t.js) | The page view tracker at /t.js sends data to `xixefdlmnfpyxopzotne.supabase.co` but `connect-src` only allows `'self' https://*.vercel-insights.com https://www.facebook.com https://alb.reddit.com`. Supabase requests are silently blocked by the browser. The email capture form on mobile also POSTs to Supabase and is blocked. |
| Low | HSTS missing includeSubDomains and preload | Current header is `max-age=63072000`. Adding `includeSubDomains; preload` and submitting to the HSTS preload list would strengthen security. |

**CSP Fix Required** -- Add Supabase to connect-src in vercel.json:
```
connect-src 'self' https://*.vercel-insights.com https://www.facebook.com https://alb.reddit.com https://xixefdlmnfpyxopzotne.supabase.co
```

---

## 4. URL Structure

**Status: PASS**

### URL Patterns
- Clean, lowercase, hyphenated paths: /features, /pricing, /blog/verby-vs-dragon
- No query parameters or session IDs in URLs
- No file extensions (.html) in URLs (Vercel handles index.html routing)
- Blog URLs are descriptive and keyword-rich

### Redirects
- www -> non-www: www.verbyai.com serves the same content as verbyai.com (HTTP 200, not a redirect). Vercel handles this at the DNS/edge level.
- HTTP -> HTTPS: 308 permanent redirect. Correct.
- Trailing slash -> non-trailing: 301 permanent redirect via vercel.json. Correct.

### 404 Handling
- Custom 404.html with proper HTTP 404 status code
- 404 page has `noindex` meta tag. Correct.
- 404 page includes navigation links back to homepage, blog, and download

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| None | -- | URL structure is clean and well-implemented. |

---

## 5. Meta Tags

**Status: PASS**

### Coverage Matrix

| Page | title | description | viewport | og:title | og:desc | og:image | twitter:card | canonical |
|------|-------|-------------|----------|----------|---------|----------|--------------|-----------|
| / | Y | Y | Y | Y | Y | Y | Y | Y |
| /features | Y | Y | Y | Y | Y | Y | Y | Y |
| /pricing | Y | Y | Y | Y | Y | Y | Y | Y |
| /download | Y | Y | Y | Y | Y | Y | Y | Y |
| /blog | Y | Y | Y | Y | Y | Y | Y | Y |
| /help | Y | Y | Y | Y | Y | Y | Y | Y |
| /about | Y | Y | Y | Y | Y | Y | Y | Y |
| /contact | Y | Y | Y | Y | Y | Y | Y | Y |
| /privacy | Y | Y | Y | Y | Y | Y | Y | Y |
| /creators | Y | Y | Y | Y | Y | Y | Y | Y |
| /account | Y | Y | Y | Y | N (og:desc missing) | N (og:image missing) | N (twitter tags missing) | Y |
| All blog posts | Y | Y | Y | Y | Y | Y | Y | Y |

### Global Tags Present
- `<html lang="en">` on all 22 pages
- `<meta charset="UTF-8">` on all pages
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` on all pages
- `<meta name="theme-color" content="#050508">` on all pages

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Medium | /account missing og:description, og:image, twitter:card | The account page only has og:title, og:type, og:url, og:site_name. Missing og:description, og:image, og:image:width, og:image:height, and all twitter:card tags. |
| Low | /about page missing Meta Pixel | The about page has no Facebook Meta Pixel code (fbq). All other pages have it. |
| Low | apple-touch-icon only on homepage | Only index.html has `<link rel="apple-touch-icon">`. Other pages lack it. |

---

## 6. Mobile Responsiveness

**Status: PASS**

### Viewport
- All pages have `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- No `user-scalable=no` or `maximum-scale=1.0` (accessibility-correct)

### CSS Responsive Design
- Global stylesheet has `@media (max-width: 600px)` breakpoint
- Grid layouts collapse to single column: `.tool-grid`, `.example-pair`, `.pros-cons`
- `clamp()` used for responsive typography: `font-size: clamp(36px, 6vw, 56px)`
- `overflow-x: hidden` on body prevents horizontal scroll
- `.container` has `max-width: 800px` with `padding: 0 24px` for mobile margins

### Mobile-Specific Features
- Mobile email capture popup for mobile visitors (cannot download desktop app on mobile)
- Mobile detection via user-agent regex in inline script

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Low | Only one breakpoint at 600px | Consider adding a tablet breakpoint (768px-1024px) for better intermediate screen experience. |

---

## 7. Core Web Vitals (Source Code Signals)

**Status: PASS (Likely Good)**

### LCP Analysis (Target: < 2.5s)
- **LCP candidate**: The `<h1>` text element in the hero section (largest above-fold element). No large hero images.
- Homepage is 56KB HTML. No images above the fold except the SVG logo (inline).
- Self-hosted Inter font with `font-display: swap` prevents FOIT
- CSS is a single 14KB file (not minified but small)
- Google Fonts (Outfit, Sora) loaded via external stylesheet -- render-blocking

**Risk**: The Google Fonts `<link>` at line 205 of index.html is render-blocking. The browser must download and parse this CSS before rendering text styled with Outfit/Sora fonts. Combined with the Meta Pixel and Reddit Pixel scripts in `<head>` (synchronous, though they inject async scripts), this could push LCP.

### INP Analysis (Target: < 200ms)
- Very lightweight JavaScript: particles.js (3.3KB, deferred), t.js (737B, deferred), sw.js (1.7KB)
- No heavy framework (React, Vue, Angular). Pure vanilla JS.
- Minimal event listeners (form submit on mobile capture, button clicks)
- No long tasks expected from the code

**Assessment**: INP should be well within the "Good" threshold.

### CLS Analysis (Target: < 0.1)
- Self-hosted Inter font uses `font-display: swap` -- potential minor CLS during font swap
- Google Fonts also use `display=swap` -- additional swap event
- No images without explicit dimensions (only the Meta Pixel 1x1 `<noscript>` images, which have `height="1" width="1"`)
- Aurora background is `position: fixed` with `pointer-events: none` -- no layout impact
- No dynamically injected ads or banners above the fold
- Mobile email capture popup is `position: fixed; bottom: 0` -- does not shift layout

**Assessment**: CLS should be "Good". The font-swap from two sources (local Inter + Google Outfit/Sora) is the only risk.

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Medium | Google Fonts stylesheet is render-blocking | The `<link href="https://fonts.googleapis.com/css2?family=Outfit...&display=swap" rel="stylesheet">` blocks rendering. Consider using `<link rel="preload" as="style">` with onload swap pattern, or self-host Outfit and Sora alongside Inter. |
| Medium | Meta Pixel and Reddit Pixel scripts in `<head>` | These are synchronous script tags in `<head>` (lines 7-28 of index.html). While they inject async scripts, the initial parsing blocks head processing. Consider moving to `<body>` bottom or using `async`/`defer`. |
| Low | CSS and JS not minified | styles.css (14KB), particles.js (3.3KB) could be ~30-40% smaller with minification. Vercel may gzip/brotli these, mitigating the impact. |
| Low | Two font-swap events possible | Inter (self-hosted) and Outfit/Sora (Google Fonts) both use `font-display: swap`. Two swap events could cause a subtle CLS. Self-hosting all fonts from one source would eliminate the Google Fonts round-trip and reduce to one swap. |

---

## 8. Structured Data

**Status: PASS**

### Coverage

| Page | Schema Types |
|------|-------------|
| / (homepage) | SoftwareApplication, FAQPage, BreadcrumbList, Organization, WebSite |
| /pricing | FAQPage |
| /features | (none detected beyond common) |
| /help | BreadcrumbList, FAQPage |
| /about | BreadcrumbList, Person |
| /contact | BreadcrumbList |
| /privacy | BreadcrumbList |
| /creators | BreadcrumbList |
| /download | SoftwareApplication |
| /blog (hub) | BreadcrumbList |
| Blog articles | Article, BreadcrumbList |

### Quality Assessment
- SoftwareApplication schema on homepage includes offers (Free + Pro), featureList, downloadUrl, operatingSystem, author -- comprehensive
- FAQPage schema on homepage has 3 Q&As -- valid
- BreadcrumbList schemas use correct `itemListElement` structure with position, name, item
- Organization schema includes logo, contactPoint, sameAs, founder, parentOrganization
- WebSite schema present for sitelinks search box potential

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Low | /features and /pricing missing BreadcrumbList | Most pages have BreadcrumbList schema but /features and /pricing do not. Add for consistency. |
| Low | No AggregateRating on SoftwareApplication | Adding aggregateRating (if reviews exist) would enable star ratings in SERPs. |

---

## 9. JavaScript Rendering

**Status: PASS**

### Rendering Strategy
- **Server-Side Rendered (SSR)**: All pages are static HTML files. Content is fully in the HTML source.
- **No JavaScript frameworks**: No React, Vue, Angular, Next.js, etc.
- **No client-side routing**: Standard `<a href>` links, full page loads
- **No dynamic content injection**: All text content is in the static HTML

### JavaScript Inventory
| File | Size | Loading | Purpose |
|------|------|---------|---------|
| Meta Pixel (inline) | ~500B | sync in head | Facebook tracking |
| Reddit Pixel (inline) | ~300B | sync in head | Reddit tracking |
| particles.js | 3.3KB | defer | Visual particle animation |
| t.js | 737B | defer | Supabase page view tracker |
| sw.js | 1.7KB | registered async | Service worker for offline caching |
| /_vercel/insights/script.js | external | defer | Vercel analytics |
| Mobile capture (inline) | ~1KB | inline at bottom | Email capture form for mobile users |

**Assessment**: Zero JavaScript dependency for content rendering. Googlebot, Bingbot, and all crawlers will see 100% of the content without JS execution.

---

## 10. IndexNow Protocol

**Status: PARTIAL**

- IndexNow key file present: `/65ea802718f954579ad591fceecd8315.txt` containing key `65ea802718f954579ad591fceecd8315`
- Bing site verification: `BingSiteAuth.xml` present
- No automated IndexNow submission detected (no IndexNow ping in deployment pipeline)

### Recommendation
Add an IndexNow submission to the Vercel deployment pipeline or a post-deploy script:
```bash
curl -X POST "https://api.indexnow.org/IndexNow" \
  -H "Content-Type: application/json" \
  -d '{"host":"verbyai.com","key":"65ea802718f954579ad591fceecd8315","urlList":["https://verbyai.com/","https://verbyai.com/blog/..."]}'
```

---

## 11. Internal Link Structure

**Status: PASS**

### Navigation
- Consistent navigation across all pages: Features, Pricing, Blog, Help, Download (CTA button)
- Footer contains comprehensive link structure with 3 columns: Product, Resources, Company
- Homepage footer links to: /features, /pricing, /download, /creators, /blog, specific blog posts, /contact, /help, /account, /privacy, https://syntrixdev.com

### Link Distribution
- Homepage links to all key pages and 5 blog articles
- Blog hub page links to all 11 blog articles
- Blog articles have Related Articles sections with internal cross-links
- All internal links use relative paths (e.g., `/features`) -- correct for single-domain

### Issues Found

| Severity | Issue | Detail |
|----------|-------|--------|
| Low | /about page not linked from primary navigation | The about page is in the sitemap but not in the top nav or footer of the homepage. It is only accessible if users find it directly. Consider adding to footer. |

---

## 12. Broken Link / 404 Risk

**Status: WARNING**

### OG Image 404s (3 Missing)

| Image URL | Referenced By | HTTP Status |
|-----------|--------------|-------------|
| /og/blog-reddit-comments.png | blog/voice-dictation-reddit-comments | 404 |
| /og/blog-email-productivity.png | blog/voice-dictation-email-productivity | 404 |
| /og/blog-voice-apps-creators.png | blog/best-voice-apps-content-creators-2026 | 404 |

These 3 newer blog posts reference OG images that do not exist. Only SVG source files exist in /og/ for these (blog-reddit-comments.svg, blog-email-productivity.svg, blog-voice-apps-creators.svg). The PNGs were never generated. This means social media shares for these 3 articles will not show preview images.

**Fix**: Run the OG image generation script (`/og/generate_og.py`) to create the missing PNGs, or manually export the SVGs to 1200x630 PNGs.

### Download Links
- GitHub release links (v0.7.2 ARM64 DMG, Intel DMG, Windows EXE) point to `github.com/boxofwonders24-rgb/Verby/releases/download/v0.7.2/...` -- these should be verified after each release to prevent 404s.

---

## 13. Additional Findings

### Meta Pixel ID Inconsistency

Two different Facebook Pixel IDs are in use across the site:

| Pixel ID | Pages Using It |
|----------|---------------|
| 954496757306032 | / (homepage), /download, /account |
| 2467011763754760 | /features, /pricing, /blog, /help, /contact, /privacy, /creators, /404, all blog articles |

This means conversion tracking is split across two pixels. If both are intentional (e.g., brand pixel vs. campaign pixel), this is fine. If not, consolidate to one pixel.

### Reddit Pixel
Only 3 pages have the Reddit Pixel: / (homepage), /download, /account. All other pages lack it. If Reddit ads are active, conversions from blog or features page visits will not be tracked.

### Service Worker
- sw.js implements network-first for HTML, cache-first for static assets
- Precaches: /, /styles.css, /fonts/Inter-Variable.woff2, /favicon.svg, /features, /pricing, /download, /blog
- Good strategy for a static site -- enables offline access to key pages

### Creators Page Missing Font Preload
- `/creators/index.html` does not have `<link rel="preload" href="/fonts/Inter-Variable.woff2">`. All other pages do. This causes a FOIT/FOUT flash on that page.

---

## Prioritized Action Items

### Critical (0 items)
None.

### High (2 items)

1. **Fix CSP to allow Supabase** -- Page view tracking (t.js) and mobile email capture are silently failing because `connect-src` in vercel.json does not include `https://xixefdlmnfpyxopzotne.supabase.co`. Add it to the CSP connect-src directive.

2. **Generate 3 missing OG image PNGs** -- blog-reddit-comments.png, blog-email-productivity.png, and blog-voice-apps-creators.png are 404. Run generate_og.py or export SVGs to PNG at 1200x630.

### Medium (4 items)

3. **Add noindex to /account page** -- User account pages should not be indexed. Add `<meta name="robots" content="noindex">` and optionally remove from any future sitemap inclusion.

4. **Self-host Outfit and Sora fonts** -- Eliminate the render-blocking Google Fonts stylesheet by downloading the WOFF2 files and serving them alongside Inter. This removes a third-party dependency, reduces LCP, and prevents a second font-swap CLS event.

5. **Move tracking pixels to body bottom** -- The Meta Pixel and Reddit Pixel synchronous `<script>` blocks in `<head>` delay parsing. Move them to just before `</body>` or load them with `defer`.

6. **Consolidate Meta Pixel IDs** -- Decide whether the two Facebook Pixel IDs (954496757306032 and 2467011763754760) are intentional. If not, unify to one pixel across all pages.

### Low (7 items)

7. **Add font preload to /creators page** -- Missing `<link rel="preload" href="/fonts/Inter-Variable.woff2" as="font" type="font/woff2" crossorigin>`.

8. **Add Meta Pixel to /about page** -- Only page missing Facebook tracking (not counting 404).

9. **Update llms.txt** -- Add 3 newest blog articles.

10. **Add BreadcrumbList schema to /features and /pricing** -- For consistency with other pages.

11. **Add apple-touch-icon to all pages** -- Currently only on homepage.

12. **Link /about from footer navigation** -- Page exists in sitemap but has no discoverable link path from navigation.

13. **Consider HSTS preload submission** -- Add `includeSubDomains; preload` to the Strict-Transport-Security header and submit to hstspreload.org.

---

## Score Breakdown

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Crawlability | 95 | 15% | 14.3 |
| Indexability | 85 | 15% | 12.8 |
| Security | 80 | 10% | 8.0 |
| URL Structure | 98 | 10% | 9.8 |
| Meta Tags | 85 | 10% | 8.5 |
| Mobile | 90 | 10% | 9.0 |
| Core Web Vitals | 78 | 15% | 11.7 |
| Structured Data | 85 | 5% | 4.3 |
| JS Rendering | 100 | 5% | 5.0 |
| Internal Links | 88 | 5% | 4.4 |
| **Total** | | **100%** | **87.8 -> 82** |

**Adjusted score: 82/100** (penalty for CSP blocking active tracking and 3 broken OG images)

---

## Files Referenced

- `/Users/lotsofsocks/Development/verbyprompt/site/vercel.json` -- security headers and redirect config
- `/Users/lotsofsocks/Development/verbyprompt/site/robots.txt` -- crawler directives
- `/Users/lotsofsocks/Development/verbyprompt/site/sitemap.xml` -- 21-URL sitemap
- `/Users/lotsofsocks/Development/verbyprompt/site/index.html` -- homepage (56KB)
- `/Users/lotsofsocks/Development/verbyprompt/site/styles.css` -- global stylesheet (14KB)
- `/Users/lotsofsocks/Development/verbyprompt/site/t.js` -- Supabase page view tracker
- `/Users/lotsofsocks/Development/verbyprompt/site/sw.js` -- service worker
- `/Users/lotsofsocks/Development/verbyprompt/site/llms.txt` -- AI crawler content file
- `/Users/lotsofsocks/Development/verbyprompt/site/og/` -- OG image directory (3 PNGs missing)
- `/Users/lotsofsocks/Development/verbyprompt/site/account/index.html` -- missing noindex
- `/Users/lotsofsocks/Development/verbyprompt/site/creators/index.html` -- missing font preload
- `/Users/lotsofsocks/Development/verbyprompt/site/about/index.html` -- missing Meta Pixel
