# Verby — Meta Ads Strategy

## Business Context

| Detail | Value |
|--------|-------|
| Product | VerbyPrompt — voice-to-prompt desktop app |
| Model | Freemium: 20 prompts/day free, Pro = unlimited (Stripe subscription) |
| Platform | Mac + Windows (v0.5.10) |
| Website | verbyai.com |
| Payment | Stripe subscription (live link) |
| Target | AI power users — anyone using ChatGPT, Claude, or AI tools daily |
| Existing Creative | 2 UGC split-screen videos (Charlotte 37s, Thomas 49s) |

## Platform Strategy

| Platform | Role | Budget % | Rationale |
|----------|------|----------|-----------|
| Meta (FB/IG) | Primary | 80% | Video-first platform, UGC content crushes here, interest targeting for AI/tech users |
| TikTok | Testing | 20% | Same UGC format works natively, younger tech-savvy audience |

**Why Meta primary for Verby:**
- Interest targeting: ChatGPT, Artificial Intelligence, Productivity apps, Mac users
- Video-first algorithm rewards UGC content (you already have 2 ads ready)
- Reels placement is effectively free reach right now
- Lead-to-download funnel is proven for desktop software
- Can retarget website visitors who didn't download

**Why NOT Google Search:**
- Nobody searches "voice to prompt app" — this is a discovery product
- Category creation requires awareness ads, not search capture
- Save Google for later when brand searches pick up

## Campaign Architecture

```
Verby Meta Ads Account
├── META_CONV_Prospecting_US_2026Q2
│   ├── Ad Set 1: AI Power Users
│   │   ├── Interests: ChatGPT, Claude AI, Artificial Intelligence, OpenAI
│   │   ├── Age: 22-55, Mac users
│   │   └── Creatives: Charlotte split, Thomas split, new static
│   ├── Ad Set 2: Productivity / Remote Workers
│   │   ├── Interests: Productivity, Remote work, Notion, Slack
│   │   ├── Behaviors: Mac users, Early tech adopters
│   │   └── Creatives: Same mix, different copy angles
│   └── Ad Set 3: Content Creators / Writers
│       ├── Interests: Content creation, Copywriting, Blogging, Freelancing
│       └── Creatives: Writer-focused messaging
├── META_CONV_Retargeting_US_2026Q2
│   ├── Ad Set 1: Website visitors who didn't download (14 days)
│   ├── Ad Set 2: Video viewers 50%+ (30 days)
│   └── Ad Set 3: Page/IG engagers (60 days)
└── META_CONV_Lookalike_US_2026Q2 (Phase 2)
    ├── Ad Set 1: 1% LAL of downloaders
    └── Ad Set 2: 3% LAL of website visitors
```

**Naming Convention:** `[PLATFORM]_[OBJECTIVE]_[Audience]_[Geo]_[Period]`

## Creative Strategy

### Ready to Launch (Existing)
| Asset | Format | Duration | Status |
|-------|--------|----------|--------|
| Charlotte Split-Screen | UGC video (split) | 37s | Done — `charlotte-split-ad-music.mp4` |
| Thomas Split-Screen | UGC video (split) | 49s | Done — in verby-ad project |

### Needed (Produce ASAP)
| Priority | Asset | Format | Purpose |
|----------|-------|--------|---------|
| P1 | 15s Reel cut of Charlotte | Short UGC | Reels/Stories placement (best CPM) |
| P1 | 15s Reel cut of Thomas | Short UGC | Reels/Stories placement |
| P2 | Static image — "Stop typing prompts" | Image + copy | Feed placement, cheaper to test |
| P2 | Static image — "Talk to AI, literally" | Image + copy | Different angle |
| P3 | Carousel — 3 use cases | Carousel | Email, code, marketing prompts |
| P3 | New UGC creator (different face) | Split-screen video | Creative diversity |

### Ad Copy

**Hook Lines (first 3 seconds — make or break):**
- "I stopped typing prompts 3 weeks ago."
- "This app turns your voice into perfect AI prompts."
- "ChatGPT users — you're doing it wrong."
- "I talk to my Mac and it writes my prompts for me."

**Primary Text (under 125 chars):**
- "Press a key. Talk. Get a perfect prompt. Verby turns your voice into structured AI prompts in seconds. Free to try."
- "Stop spending 5 minutes typing the perfect prompt. Just say it. Verby does the rest. 20 free prompts/day."
- "Your voice → perfect AI prompts. Works with ChatGPT, Claude, any AI. Free for Mac. No credit card."

**Headline (under 40 chars):**
- "Talk to AI. Literally."
- "Voice → Perfect Prompts"
- "Stop Typing. Start Talking."
- "Free for Mac — Try Now"

**CTA Button:** "Download" → verbyai.com

### Trust Signals
- "Free — 20 prompts/day, no credit card"
- "Works with ChatGPT, Claude & any AI"
- "Mac app — installs in 30 seconds"
- Social proof (download count when available)

## Targeting Strategy

### Prospecting — US only (Mac penetration is highest)
| Parameter | Value |
|-----------|-------|
| Location | United States (expand to CA, UK, AU in Phase 2) |
| Age | 22-55 |
| Gender | All |
| Device | Mac users only (critical — app is Mac only) |
| Interests | ChatGPT, Claude AI, OpenAI, Artificial Intelligence, Productivity apps |
| Behaviors | Early technology adopters, Mac users |
| Exclusions | Existing customers (upload email list), Android-only users |
| Placement | Advantage+ (but monitor — Reels will likely win) |

**Important:** Filter for Mac users. Every Android/Windows click is wasted spend until Windows ships.

### Retargeting
| Audience | Window | Creative Angle |
|----------|--------|----------------|
| verbyai.com visitors (no download) | 14 days | "Still typing prompts?" + demo |
| Video viewers 50%+ | 30 days | Social proof + direct CTA |
| FB/IG engagers | 60 days | Different creator UGC |

## Conversion Funnel

```
Meta Ad (UGC video / static)
  → verbyai.com (landing page)
    → Download DMG (primary conversion event)
      → Open app, sign up (free)
        → Hit 20/day limit organically
          → Upgrade to Pro (Stripe)
```

### Conversion Events to Track
| Event | Type | Trigger |
|-------|------|---------|
| ViewContent | Standard | Land on verbyai.com |
| Lead | Standard | Click "Download" button |
| CompleteRegistration | Standard | App opened + account created (if trackable) |
| Purchase | Standard | Stripe subscription started |

**Optimize for:** Lead (download clicks) initially. Switch to Purchase once you have 50+ purchases/week.

## Budget Plan

### Starting Budget: $15/day ($450/month)

| Campaign | Daily | Monthly | % |
|----------|-------|---------|---|
| Prospecting | $12 | $360 | 80% |
| Retargeting | $3 | $90 | 20% |

### Unit Economics
| Metric | Target | Notes |
|--------|--------|-------|
| CPM | $10-18 | Tech/AI audience, US targeting |
| CTR (video) | 1.5-3.0% | UGC video typically higher CTR |
| CPC | $0.50-1.50 | Video clicks are cheap |
| Cost per download click | $1-3 | Landing page → download |
| Downloads/month | 150-450 | At $450/month spend |
| Free → Pro conversion | 5-10% | Industry standard for freemium |
| Paying users/month | 8-45 | From ad-driven downloads |
| Subscription revenue | Depends on Pro price | Monthly recurring |

### Scaling Milestones
| Trigger | Action |
|---------|--------|
| CPC stable < $1.50 for 2 weeks | Increase budget 20% |
| 100+ downloads tracked | Create Lookalike audiences |
| 15s Reel cuts ready | Test Reels-only placement |
| Windows version ships | Expand targeting to all devices, double budget |
| Pro conversion rate > 8% | Scale aggressively — unit economics proven |

### 3x Kill Rule
- If any ad set spends 3x target cost-per-download ($3-9) with zero downloads → pause immediately

## Bidding Strategy

| Phase | Strategy | Rationale |
|-------|----------|-----------|
| Month 1 | Lowest Cost (no cap) | Gather data, let Meta learn |
| Month 2+ | Cost Cap at $2/download click | Control CPC once data is in |
| Scale | Lowest Cost | Maximize volume when unit economics work |

## Tracking Setup

### Required Before Launch
- [ ] Meta Pixel installed on verbyai.com (all pages)
- [ ] ViewContent event on landing page load
- [ ] Lead event on "Download" button click
- [ ] Custom Audience: website visitors (14 days)
- [ ] Custom Audience: video viewers 50%+ (30 days)
- [ ] Custom Audience: FB/IG engagers (60 days)
- [ ] Domain verified in Meta Business Manager
- [ ] Facebook Page + Instagram connected

### Phase 2 (After Launch)
- [ ] CAPI integration for server-side events
- [ ] Stripe webhook → Meta Purchase event (Pro upgrades)
- [ ] Offline conversion import for in-app signups
- [ ] UTM parameters on all ad URLs for GA4 tracking

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [ ] Set up Meta Business Manager + Ad Account
- [ ] Install Meta Pixel on verbyai.com
- [ ] Set up conversion events (ViewContent, Lead)
- [ ] Verify domain
- [ ] Create audiences (website visitors, video viewers, engagers)
- [ ] Upload Charlotte + Thomas videos to Ads Manager
- [ ] Cut 15s Reel versions of both videos
- [ ] Write 3-4 ad copy variations
- [ ] Build campaign structure

### Phase 2: Launch (Week 2)
- [ ] Launch Prospecting campaign with 3 ad sets ($12/day total)
- [ ] Monitor daily — check delivery, CPM, CTR, link clicks
- [ ] Verify Pixel fires on verbyai.com
- [ ] Track downloads in GA4 or custom analytics
- [ ] Respond to comments on ads (builds social proof)

### Phase 3: Optimize (Weeks 3-6)
- [ ] Kill underperforming ad sets (3x rule)
- [ ] Double down on winning creative
- [ ] Launch Retargeting ($3/day)
- [ ] Test static image ads vs video
- [ ] A/B test landing page (if possible)
- [ ] Cut new 15s variations from existing footage
- [ ] Track free → Pro conversion rate

### Phase 4: Scale (Weeks 7-12)
- [ ] Create Lookalike audiences from downloaders
- [ ] Test TikTok with same UGC content (20% budget)
- [ ] Commission new UGC creator for creative diversity
- [ ] Increase budget on winners (20% increments)
- [ ] Expand geo: Canada, UK, Australia
- [ ] When Windows ships: remove Mac-only filter, 2x budget

## Quick Wins (Do These First)

1. **Cut 15s Reels** from Charlotte + Thomas videos (cheapest impressions)
2. **Install Meta Pixel** on verbyai.com
3. **Create 2 static ads** — screenshot of app + hook text
4. **Launch at $12/day** — start learning immediately
5. **Set up download tracking** — you need to know cost-per-download
