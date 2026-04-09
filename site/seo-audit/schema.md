# Schema.org Structured Data Audit — verbyai.com

**Audit date:** 2026-04-08
**Auditor:** Schema.org markup specialist (automated)
**Format:** All schema detected is JSON-LD

---

## Executive Summary

The site has strong schema coverage overall. Every page has at least a BreadcrumbList, the homepage has 5 schema blocks (SoftwareApplication, FAQPage, BreadcrumbList, Organization, WebSite), blog posts consistently have Article + BreadcrumbList, and comparison posts add FAQPage. The pricing page has well-structured Offer data.

**Key findings:**
- 3 validation issues (CRITICAL/HIGH) that could block rich results
- 5 FAQPage blocks on a commercial site (INFO -- no Google rich results since August 2023, but still useful for AI/LLM citations)
- 4 pages missing schema that would benefit from additions
- Blog posts use `Article` instead of `BlogPosting` (minor optimization opportunity)
- Homepage `Organization.logo` uses SVG (Google prefers raster formats)

---

## Page-by-Page Audit

### 1. Homepage (`/`)

**Existing schema blocks (5):**

| # | @type | Status |
|---|-------|--------|
| 1 | SoftwareApplication | PASS with notes |
| 2 | FAQPage | INFO |
| 3 | BreadcrumbList | PASS |
| 4 | Organization | PASS with notes |
| 5 | WebSite | PASS with notes |

**Validation details:**

**SoftwareApplication** -- PASS with notes
- `@context`: `https://schema.org` -- correct
- Required properties present: name, offers, applicationCategory, operatingSystem
- `offers` array includes Free ($0) and Pro ($9/mo) with UnitPriceSpecification -- good
- `downloadUrl` present -- good
- `softwareVersion` "0.7.2" -- good
- Note: `operatingSystem` value "macOS, Windows" is a comma-separated string. Google recommends separate values or an array. Low priority.
- Note: Missing `aggregateRating` (recommended if reviews exist)
- Note: Missing `screenshot` property (recommended for SoftwareApplication rich results)

**FAQPage** -- INFO
- Structurally valid with 3 Q&A pairs
- All Questions have `acceptedAnswer` with `text` -- correct
- Since August 2023, Google restricts FAQPage rich results to government and healthcare sites. Verby is a commercial site, so this will NOT generate Google FAQ rich results
- However, FAQPage markup still benefits AI/LLM citations and knowledge extraction. Keep it for GEO (Generative Engine Optimization)

**BreadcrumbList** -- PASS
- Single-item list for homepage (position 1: Home) -- valid but minimal
- Breadcrumbs on the homepage are technically correct but provide no navigation hierarchy. Consider removing since there is nothing above Home

**Organization** -- PASS with notes
- `name`, `url`, `description`, `founder`, `parentOrganization`, `sameAs`, `contactPoint` all present -- excellent
- `logo` value is `https://verbyai.com/favicon.svg` -- **HIGH: Google requires logo to be a raster image (PNG, JPG, GIF, WebP). SVG is not supported for Organization logo in Knowledge Panel eligibility.** Provide a PNG/JPG version (112x112px minimum, 1:1 aspect ratio recommended)
- `sameAs` only includes Twitter. Add any other official profiles (GitHub, LinkedIn, etc.)

**WebSite** -- PASS with notes
- `name`, `url`, `description`, `publisher` present
- Missing `potentialAction` with `SearchAction` -- this enables the Google Sitelinks search box. Not critical since the site is small, but useful for brand queries

---

### 2. Features (`/features`)

**Existing schema blocks (2):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |
| 2 | SoftwareApplication | PASS with notes |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > Features -- correct 2-item hierarchy

**SoftwareApplication** -- PASS with notes
- Has `featureList` array (9 items) -- good for this page
- Missing `offers` -- not strictly required since it is on the pricing page, but Google may not connect them
- Missing `url` property -- wait, it does have `"url": "https://verbyai.com"`. Correct.
- No `description` property -- add for completeness

---

### 3. Pricing (`/pricing`)

**Existing schema blocks (3):**

| # | @type | Status |
|---|-------|--------|
| 1 | FAQPage | INFO |
| 2 | BreadcrumbList | PASS |
| 3 | SoftwareApplication | PASS |

**Validation details:**

**FAQPage** -- INFO
- 6 well-structured Q&A pairs -- structurally valid
- Same note as homepage: no Google rich results for commercial sites, but good for AI/LLM citations

**BreadcrumbList** -- PASS
- Home > Pricing -- correct

**SoftwareApplication** -- PASS
- 3 Offer variants (Free, Pro Monthly, Pro Annual) with `UnitPriceSpecification` and `billingDuration` -- excellent implementation
- `name`, `url`, `applicationCategory`, `operatingSystem` all present

---

### 4. Blog Index (`/blog`)

**Existing schema blocks (1):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > Blog -- correct

**Missing opportunities:**
- **CollectionPage or ItemList** -- The blog index lists 11 articles. Adding an `ItemList` schema with each blog post as a `ListItem` (with url and name) would help search engines understand the page structure. Medium priority.

---

### 5. Blog Posts (11 articles)

**All 11 blog posts have:**
- Article schema -- PASS (see notes below)
- BreadcrumbList (3-level: Home > Blog > Article) -- PASS

**4 blog posts additionally have:**
- FAQPage: `verby-vs-dragon`, `verby-vs-otter`, `voice-dictation-email-productivity`, `voice-dictation-reddit-comments` -- INFO (same commercial site note)

**1 blog post additionally has:**
- ItemList: `best-voice-to-text-apps-mac-2026` (7-item ranked list) -- PASS, well structured

**Article schema validation (applies to all 11):**

- `@context`: `https://schema.org` -- correct
- `headline` present -- correct
- `description` present -- correct
- `author`: Person with name and url -- correct
- `publisher`: Organization with name, url, and logo ImageObject -- correct
- `datePublished`: ISO 8601 format (YYYY-MM-DD) -- correct
- `dateModified`: ISO 8601 format -- correct
- `mainEntityOfPage`: absolute URL -- correct
- `url`: absolute URL -- correct
- `image`: absolute URL -- correct

**CRITICAL: `publisher.logo` uses SVG**
- All blog posts set `publisher.logo.url` to `"https://verbyai.com/favicon.svg"`
- Google's Article rich result requires `publisher.logo` to be a raster image format (PNG, JPG, GIF, WebP)
- This may prevent Article rich results from appearing in Google Search
- **Fix:** Create a PNG version of the logo and update all blog post Article schemas

**MEDIUM: Use `BlogPosting` instead of `Article`**
- All posts use `@type: "Article"` which is valid but generic
- `BlogPosting` is a more specific subtype of `Article` that better describes blog content
- Google treats both the same for rich results, but `BlogPosting` provides more semantic precision for AI/LLM systems and other consumers of structured data

**MEDIUM: Missing `wordCount` property**
- Adding `wordCount` to Article schema helps search engines gauge content depth. Easy to add.

---

### 6. Help Center (`/help`)

**Existing schema blocks (2):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |
| 2 | FAQPage | INFO |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > Help Center -- correct

**FAQPage** -- INFO
- 5 Q&A pairs covering setup, transcription, text injection, license activation, cancellation
- Structurally valid
- Same commercial site note for Google rich results
- Help center content is high-value for AI citations -- keep this markup

---

### 7. Download (`/download`)

**Existing schema blocks (2):**

| # | @type | Status |
|---|-------|--------|
| 1 | SoftwareApplication | PASS with notes |
| 2 | BreadcrumbList | PASS |

**Validation details:**

**SoftwareApplication** -- PASS with notes
- Has `offers` (Free, $0) -- correct
- Has `softwareVersion`, `downloadUrl`, `operatingSystem`, `applicationCategory` -- good
- `author` Organization present -- good
- Missing `description` -- add for completeness
- Note: Only shows the Free offer. Consider adding Pro offer as well to match homepage/pricing

**BreadcrumbList** -- PASS
- Home > Download -- correct

---

### 8. About (`/about`)

**Existing schema blocks (2):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |
| 2 | Person | PASS with notes |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > About -- correct

**Person** -- PASS with notes
- `name`: "Stephen Grandy" -- correct
- `jobTitle`: "Founder" -- correct
- `worksFor`: Organization (Syntrix LLC) -- correct
- `url` and `sameAs` present -- correct
- Missing `image` -- adding a headshot URL would strengthen Knowledge Panel signals
- Missing `description` -- recommended

**Missing opportunities:**
- **AboutPage** WebPage type -- Adding `@type: "AboutPage"` schema would give search engines additional context about this page's purpose

---

### 9. Contact (`/contact`)

**Existing schema blocks (1):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > Contact -- correct

**Missing opportunities:**
- **ContactPage** WebPage type -- Adding `@type: "ContactPage"` with `ContactPoint` entries (support@verbyai.com, hello@verbyai.com) would improve how search engines surface contact information

---

### 10. Privacy (`/privacy`)

**Existing schema blocks (1):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > Privacy Policy -- correct

No additional schema needed. Privacy pages rarely benefit from rich results.

---

### 11. Creators (`/creators`)

**Existing schema blocks (1):**

| # | @type | Status |
|---|-------|--------|
| 1 | BreadcrumbList | PASS |

**Validation details:**

**BreadcrumbList** -- PASS
- Home > Creators -- correct

No additional schema needed. This is a niche landing page.

---

### 12. Account (`/account`)

**Existing schema blocks (0):**

No JSON-LD schema found.

**Missing opportunities:**
- **BreadcrumbList** -- This is the only page on the site without BreadcrumbList markup. Add for consistency: Home > My Account

---

## Consolidated Issues

### CRITICAL (blocks rich results)

| Issue | Pages Affected | Fix |
|-------|---------------|-----|
| `publisher.logo` is SVG (not supported by Google for Article rich results) | All 11 blog posts | Create PNG logo (min 112x112px), update `publisher.logo.url` in all Article schemas |
| `Organization.logo` is SVG (not supported for Knowledge Panel) | Homepage (`/`) | Same PNG logo, update Organization schema |

### HIGH

| Issue | Pages Affected | Fix |
|-------|---------------|-----|
| Missing BreadcrumbList | `/account` | Add BreadcrumbList: Home > My Account |

### MEDIUM

| Issue | Pages Affected | Fix |
|-------|---------------|-----|
| Blog posts use `Article` instead of `BlogPosting` | All 11 blog posts | Change `@type` from `"Article"` to `"BlogPosting"` |
| SoftwareApplication missing `description` | `/features`, `/download` | Add `"description"` property |
| Missing `screenshot` on SoftwareApplication | Homepage, `/features`, `/download` | Add `"screenshot"` with URL to app screenshot image |
| Person schema missing `image` | `/about` | Add Stephen Grandy headshot URL |

### LOW

| Issue | Pages Affected | Fix |
|-------|---------------|-----|
| Homepage BreadcrumbList has only 1 item | Homepage | Remove single-item breadcrumb (optional -- not harmful) |
| `operatingSystem` is comma-separated string | Multiple SoftwareApplication blocks | Change to array: `["macOS", "Windows"]` |
| WebSite missing `SearchAction` | Homepage | Add `potentialAction` with SearchAction (low priority for small sites) |
| Organization.sameAs incomplete | Homepage | Add GitHub, LinkedIn if official profiles exist |
| Missing `wordCount` on articles | All 11 blog posts | Add `"wordCount": N` to each Article schema |
| Blog index missing ItemList | `/blog` | Add ItemList schema listing all blog posts |

### INFO (not errors -- awareness only)

| Note | Pages Affected |
|------|---------------|
| FAQPage on commercial site -- no Google rich results since Aug 2023, but benefits AI/LLM citations | Homepage, `/pricing`, `/help`, 4 blog posts |
| Do NOT add HowTo schema -- deprecated September 2023, no rich results | N/A |

---

## Recommended JSON-LD Additions

### 1. Account page -- BreadcrumbList

Add to `/account/index.html` `<head>`:

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://verbyai.com/"},
    {"@type": "ListItem", "position": 2, "name": "My Account", "item": "https://verbyai.com/account"}
  ]
}
</script>
```

### 2. Fix Organization logo (homepage)

Replace the `logo` value in the Organization schema on `/index.html`:

```json
"logo": {
  "@type": "ImageObject",
  "url": "https://verbyai.com/og/verby-logo.png",
  "width": 512,
  "height": 512
}
```

Create and deploy a PNG version of the Verby logo at `/og/verby-logo.png` (minimum 112x112px, recommended 512x512px).

### 3. Fix publisher.logo in all Article schemas (11 blog posts)

In every blog post's Article JSON-LD, change:

```json
"logo": {"@type": "ImageObject", "url": "https://verbyai.com/favicon.svg"}
```

to:

```json
"logo": {"@type": "ImageObject", "url": "https://verbyai.com/og/verby-logo.png", "width": 512, "height": 512}
```

### 4. About page -- AboutPage schema

Add to `/about/index.html` `<head>`:

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About Verby",
  "description": "Verby is an AI voice-to-text desktop app built by Syntrix LLC, founded by Stephen Grandy.",
  "url": "https://verbyai.com/about",
  "mainEntity": {
    "@type": "Organization",
    "name": "Syntrix LLC",
    "url": "https://syntrixdev.com",
    "founder": {
      "@type": "Person",
      "name": "Stephen Grandy"
    }
  }
}
</script>
```

### 5. Contact page -- ContactPage schema

Add to `/contact/index.html` `<head>`:

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ContactPage",
  "name": "Contact Verby",
  "description": "Contact the Verby team for support, feedback, or partnership inquiries.",
  "url": "https://verbyai.com/contact",
  "mainEntity": {
    "@type": "Organization",
    "name": "Verby",
    "url": "https://verbyai.com",
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "email": "support@verbyai.com",
        "contactType": "customer support"
      },
      {
        "@type": "ContactPoint",
        "email": "hello@verbyai.com",
        "contactType": "sales"
      }
    ]
  }
}
</script>
```

### 6. Blog index -- ItemList schema

Add to `/blog/index.html` `<head>`:

```json
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Verby Blog",
  "description": "Tips, guides, and comparisons on voice-to-text technology and AI dictation.",
  "numberOfItems": 11,
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "How to Reply to Reddit Comments Faster with Voice Dictation", "url": "https://verbyai.com/blog/voice-dictation-reddit-comments"},
    {"@type": "ListItem", "position": 2, "name": "Voice Dictation for Email: Write 10x Faster Without Typing", "url": "https://verbyai.com/blog/voice-dictation-email-productivity"},
    {"@type": "ListItem", "position": 3, "name": "Best AI Voice Apps for Content Creators in 2026", "url": "https://verbyai.com/blog/best-voice-apps-content-creators-2026"},
    {"@type": "ListItem", "position": 4, "name": "Verby vs Dragon NaturallySpeaking: 2026 Comparison", "url": "https://verbyai.com/blog/verby-vs-dragon"},
    {"@type": "ListItem", "position": 5, "name": "Verby vs Otter.ai: Voice Dictation vs Meeting Transcription", "url": "https://verbyai.com/blog/verby-vs-otter"},
    {"@type": "ListItem", "position": 6, "name": "Voice Dictation for Developers: Code Faster Without Typing", "url": "https://verbyai.com/blog/voice-dictation-for-developers"},
    {"@type": "ListItem", "position": 7, "name": "Voice Typing on Windows: Complete Guide 2026", "url": "https://verbyai.com/blog/voice-typing-windows-guide"},
    {"@type": "ListItem", "position": 8, "name": "7 Best Voice-to-Text Apps for Mac in 2026", "url": "https://verbyai.com/blog/best-voice-to-text-apps-mac-2026"},
    {"@type": "ListItem", "position": 9, "name": "How to Use Voice Dictation with ChatGPT, Claude & AI Tools", "url": "https://verbyai.com/blog/voice-dictation-with-chatgpt"},
    {"@type": "ListItem", "position": 10, "name": "Voice to Email: Never Type an Email Again", "url": "https://verbyai.com/blog/voice-to-email-never-type-again"},
    {"@type": "ListItem", "position": 11, "name": "How to Type 3x Faster with Voice Dictation", "url": "https://verbyai.com/blog/type-faster-with-voice-dictation"}
  ]
}
</script>
```

### 7. Upgrade Article to BlogPosting (all 11 blog posts)

In each blog post, change:

```json
"@type": "Article",
```

to:

```json
"@type": "BlogPosting",
```

No other changes needed -- `BlogPosting` inherits all Article properties.

---

## Schema Coverage Matrix

| Page | Breadcrumb | SoftwareApp | Organization | WebSite | Article/BlogPosting | FAQPage | Person | Other |
|------|-----------|-------------|-------------|---------|-------------------|---------|--------|-------|
| `/` | Y | Y | Y | Y | -- | Y (INFO) | -- | -- |
| `/features` | Y | Y | -- | -- | -- | -- | -- | -- |
| `/pricing` | Y | Y | -- | -- | -- | Y (INFO) | -- | -- |
| `/blog` | Y | -- | -- | -- | -- | -- | -- | -- |
| `/blog/*` (11) | Y | -- | -- | -- | Y | 4 have (INFO) | -- | 1 has ItemList |
| `/help` | Y | -- | -- | -- | -- | Y (INFO) | -- | -- |
| `/download` | Y | Y | -- | -- | -- | -- | -- | -- |
| `/about` | Y | -- | -- | -- | -- | -- | Y | -- |
| `/contact` | Y | -- | -- | -- | -- | -- | -- | -- |
| `/privacy` | Y | -- | -- | -- | -- | -- | -- | -- |
| `/creators` | Y | -- | -- | -- | -- | -- | -- | -- |
| `/account` | **NO** | -- | -- | -- | -- | -- | -- | -- |

---

## Priority Action Plan

**Phase 1 -- Fix blockers (do first):**
1. Create PNG version of Verby logo (512x512px) and deploy to `/og/verby-logo.png`
2. Update `Organization.logo` on homepage to use PNG
3. Update `publisher.logo` in all 11 blog post Article schemas to use PNG
4. Add BreadcrumbList to `/account`

**Phase 2 -- Optimize (do next):**
5. Change `@type: "Article"` to `@type: "BlogPosting"` in all 11 blog posts
6. Add `description` to SoftwareApplication on `/features` and `/download`
7. Add `screenshot` property to SoftwareApplication on homepage

**Phase 3 -- Enhance (nice to have):**
8. Add ContactPage schema to `/contact`
9. Add AboutPage schema to `/about`
10. Add ItemList schema to `/blog` index
11. Add `image` to Person schema on `/about`
12. Add `wordCount` to all blog post schemas
13. Change `operatingSystem` from string to array across all SoftwareApplication blocks
