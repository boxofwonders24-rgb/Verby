# Sitemap Audit Report -- verbyai.com

**Date**: 2026-04-08
**Source**: `/Users/lotsofsocks/Development/verbyprompt/site/`
**Live URL**: https://verbyai.com/sitemap.xml

---

## Validation Summary

| Check | Status | Notes |
|-------|--------|-------|
| XML syntax valid | PASS | xmllint reports no errors |
| URL count (<50,000 limit) | PASS | 21 URLs -- well under limit |
| All URLs return 200 | PASS | Every sitemap URL returns HTTP 200 |
| No noindexed URLs in sitemap | PASS | Only 404.html has noindex, not in sitemap |
| No redirected URLs | PASS | No 3xx responses detected |
| robots.txt references sitemap | PASS | Line: `Sitemap: https://verbyai.com/sitemap.xml` |
| Canonical URLs consistent | PASS | All pages have canonical tags matching sitemap `<loc>` values |
| Trailing slash handling | PASS | vercel.json strips trailing slashes; sitemap uses no trailing slashes |
| Deprecated tags present | FAIL | All 21 entries use `<changefreq>` and `<priority>` -- both ignored by Google |
| lastmod accuracy | FAIL | 16 of 21 entries have stale lastmod dates (see details below) |
| Missing page: /account | INFO | Page exists but is absent from sitemap -- likely correct for an auth page |

---

## Critical Issues

### None

No critical issues found. XML is well-formed, under the 50k limit, and all URLs resolve.

---

## High-Severity Issues

### None

No noindexed or non-200 URLs appear in the sitemap.

---

## Medium-Severity Issues

### 1. Deprecated Tags: `<changefreq>` and `<priority>` (all 21 entries)

Google has publicly stated it ignores both `<changefreq>` and `<priority>`. These tags add noise and increase file size for no benefit. They should be removed.

**Affected**: Every `<url>` entry in the sitemap.

### 2. Stale `<lastmod>` Dates (16 of 21 entries)

When `<lastmod>` is inaccurate, Google learns to distrust it and may ignore it entirely for this sitemap. The following entries have sitemap dates older than the actual file modification date:

| Sitemap lastmod | Actual file date | URL |
|-----------------|-----------------|-----|
| 2026-04-07 | 2026-04-08 | https://verbyai.com/ |
| 2026-04-07 | 2026-04-09 | https://verbyai.com/features |
| 2026-04-07 | 2026-04-09 | https://verbyai.com/pricing |
| 2026-04-01 | 2026-04-09 | https://verbyai.com/download |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/type-faster-with-voice-dictation |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/voice-to-email-never-type-again |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/best-voice-to-text-apps-mac-2026 |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/voice-dictation-with-chatgpt |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/voice-dictation-for-developers |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/voice-typing-windows-guide |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/verby-vs-dragon |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/blog/verby-vs-otter |
| 2026-04-07 | 2026-04-08 | https://verbyai.com/privacy |
| 2026-04-01 | 2026-04-07 | https://verbyai.com/contact |
| 2026-04-07 | 2026-04-09 | https://verbyai.com/help |

Only 5 of 21 entries have accurate lastmod: `/blog`, `/blog/voice-dictation-reddit-comments`, `/blog/voice-dictation-email-productivity`, `/blog/best-voice-apps-content-creators-2026`, `/about`, `/creators`.

---

## Informational

### 3. `/account` Page Not in Sitemap

The `/account` page exists on disk and returns HTTP 200, but is not included in the sitemap. This is likely intentional since it is a user-authenticated page. However, it also has no `<meta name="robots" content="noindex">` tag. If this page should not be indexed, add a noindex directive.

**Recommendation**: Add `<meta name="robots" content="noindex">` to `/account/index.html`.

### 4. llms.txt Out of Sync

The `llms.txt` file is missing 7 pages that appear in the sitemap:

- https://verbyai.com/blog/voice-dictation-reddit-comments
- https://verbyai.com/blog/voice-dictation-email-productivity
- https://verbyai.com/blog/best-voice-apps-content-creators-2026
- https://verbyai.com/about
- https://verbyai.com/creators
- https://verbyai.com/contact
- https://verbyai.com/help

Consider updating llms.txt to keep it aligned with the sitemap.

---

## Coverage Analysis

### Pages in sitemap (21 total)

1. https://verbyai.com/
2. https://verbyai.com/features
3. https://verbyai.com/pricing
4. https://verbyai.com/download
5. https://verbyai.com/blog
6. https://verbyai.com/blog/type-faster-with-voice-dictation
7. https://verbyai.com/blog/voice-to-email-never-type-again
8. https://verbyai.com/blog/best-voice-to-text-apps-mac-2026
9. https://verbyai.com/blog/voice-dictation-with-chatgpt
10. https://verbyai.com/blog/voice-dictation-for-developers
11. https://verbyai.com/blog/voice-typing-windows-guide
12. https://verbyai.com/blog/verby-vs-dragon
13. https://verbyai.com/blog/verby-vs-otter
14. https://verbyai.com/blog/voice-dictation-reddit-comments
15. https://verbyai.com/blog/voice-dictation-email-productivity
16. https://verbyai.com/blog/best-voice-apps-content-creators-2026
17. https://verbyai.com/about
18. https://verbyai.com/creators
19. https://verbyai.com/privacy
20. https://verbyai.com/contact
21. https://verbyai.com/help

### Pages on disk but NOT in sitemap (1)

- `/account` -- authenticated user page, likely intentionally excluded

### Pages in sitemap but NOT on disk (0)

None. All sitemap URLs have corresponding files.

### Quality Gate: Location Pages

No location/city pages detected. No doorway page risk.

---

## Recommended Fixed Sitemap

The corrected sitemap below removes deprecated tags (`changefreq`, `priority`) and uses accurate lastmod dates based on actual file modification times.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://verbyai.com/</loc>
    <lastmod>2026-04-08</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/features</loc>
    <lastmod>2026-04-09</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/pricing</loc>
    <lastmod>2026-04-09</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/download</loc>
    <lastmod>2026-04-09</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog</loc>
    <lastmod>2026-04-08</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/type-faster-with-voice-dictation</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/voice-to-email-never-type-again</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/best-voice-to-text-apps-mac-2026</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/voice-dictation-with-chatgpt</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/voice-dictation-for-developers</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/voice-typing-windows-guide</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/verby-vs-dragon</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/verby-vs-otter</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/voice-dictation-reddit-comments</loc>
    <lastmod>2026-04-08</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/voice-dictation-email-productivity</loc>
    <lastmod>2026-04-08</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/blog/best-voice-apps-content-creators-2026</loc>
    <lastmod>2026-04-08</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/about</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/creators</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/privacy</loc>
    <lastmod>2026-04-08</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/contact</loc>
    <lastmod>2026-04-07</lastmod>
  </url>
  <url>
    <loc>https://verbyai.com/help</loc>
    <lastmod>2026-04-09</lastmod>
  </url>
</urlset>
```

---

## Action Items

| Priority | Action | File |
|----------|--------|------|
| Medium | Remove `<changefreq>` and `<priority>` from all entries | sitemap.xml |
| Medium | Update all `<lastmod>` dates to match actual file modification dates | sitemap.xml |
| Low | Add `<meta name="robots" content="noindex">` to /account page | account/index.html |
| Low | Update llms.txt with 7 missing pages | llms.txt |
| Ongoing | Automate lastmod updates on deploy (build script or CI hook) | build pipeline |
