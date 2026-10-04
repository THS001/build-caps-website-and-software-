# BUILDCAPS — Master Workflow (WORKFLOW.md)

---

## Decisions locked
- **Languages:** 10 (EN, AR, RU, ZH, HI, FR, DE, IT, UR, FA), three of them right-to-left
- **Backend:** Supabase plus a custom admin
- **Booking:** custom flow on our own calendar (Google Calendar dropped 2026-10-04 at the client's request)
- **SEO agent:** hybrid. Small changes auto-publish with rollback; content changes need approval.

- **Cost rule:** the **Anthropic API is the only paid AI service**. Everything else uses free or open-source tools:
  - MapLibre + OpenFreeMap instead of Mapbox
  - OSRM + OpenStreetMap for routing
  - Claude's web search tool plus Search Console instead of DataForSEO
  - Web Speech API for voice
  - Three.js and suncalc for 3D and sun paths
- **Infrastructure free tiers** (not AI, but worth flagging honestly):
  - Supabase free tier
  - Google Search Console API: free
  - Email: Resend free tier (3,000 a month) or your own SMTP
  - WhatsApp: free `wa.me` click-to-chat. Meta's Cloud API charges per conversation, so it's optional.
  - **Hosting:** Vercel Hobby doesn't allow commercial use. We'll decide in M11 between Cloudflare (free tier allows commercial use), a small VPS, or Vercel Pro.

**What you'll need to provide:**
- **Accounts and keys** (requested at the milestone where each is needed):
  - Supabase project
  - Anthropic API key
  - Google Cloud project with the Search Console API (SEO agent only)
  - Email sender (Resend or SMTP)
  - Hosting account (M11)
- **Content:**
  - Real company stats
  - Photos of the team and office
  - Trakheesi permit numbers and RERA ORN/BRN numbers
  - Brand assets

## 0. Context

Buildcaps Real Estate LLC (Dubai, 15+ yrs, off-plan investment focus, international buyers) has a dated WordPress site at buildcaps.com. Its content has problems: typos, a USD budget filter on AED listings, stale "1 year ago" listings, generic testimonials, and no AI or modern booking.
We're rebuilding it on the **Katachi template** (Next.js 15, React 19, Tailwind v4, framer-motion, full shadcn/ui kit), which is already running locally at `F:\buildcaps website`.

**The goal** is a multi-page, multilingual, AI-first real estate site that:
1. beats every Dubai competitor and matches global leaders on UX and features,
2. converts visitors into **booked appointments**,
3. has two separate commercial hubs: **Our Properties** (listings) and **Opportunities** (cards that send visitors to external funnels),
4. ships **10 new AI features**, plus an **autonomous SEO Growth Agent** with safe guardrails.

### What we reuse from the template
| Template piece | Becomes |
|---|---|
| `components/hero-section.tsx` (scroll parallax, letter-by-letter headline) | Home hero with a Dubai skyline video or image |
| `components/product-card.tsx` (layered blur info panel) | `PropertyCard` (price AED + currency switch, beds/baths/sqft, developer, handover) |
| `components/quick-look-modal.tsx` | Property Quick-Look (gallery, key facts, "Book viewing" CTA) |
| `components/collection-strip.tsx` (drag + scroll-x strip) | Communities strip and Developers strip |
| `components/materials-section.tsx` | "Why Dubai / Why Buildcaps" storytelling section |
| `components/newsletter-section.tsx` | Lead magnet: "2026 Dubai Investor Guide" |
| `reveal.tsx`, `parallax-image.tsx`, `blur-panel.tsx`, `animated-text.tsx` | Motion primitives that the new animations build on |
| `components/ui/*` (calendar, form, dialog, drawer, tabs, select, carousel, chart, input-otp, sonner) | Booking flow, calculators, admin UI |
| `react-hook-form` + `zod`, `react-day-picker`, `recharts`, `embla-carousel` | Forms, booking calendar, ROI charts, galleries |

**Template issues to fix in Phase 0:**
- `next.config.mjs` has `ignoreBuildErrors: true` and `images.unoptimized: true`. Turn the first off and enable image optimisation.
- `framer-motion` and `@emotion/is-prop-valid` are set to `"latest"`. Pin both.
- `AnimatedText` is duplicated inside `hero-section.tsx`. Use the shared component instead.
- The header has no navigation.
- The project is not a git repo yet.

---

## 1. Phase 1 — Live competitor research (worldwide, done inline)

**Method:** I use WebSearch, WebFetch and the browser pane, one site at a time.
**Output:** `docs/01-competitor-research.md` with a feature matrix.

**Targets**
- **Dubai brokers (direct competitors):** AX Capital, Betterhomes, Allsopp & Allsopp, haus & haus, fäm Properties, Driven Properties, Metropolitan Premium Properties, Espace, Provident, Exclusive Links, D&B Properties, Engel & Völkers Dubai, Dubai Sotheby's Realty, Knight Frank UAE, Savills UAE, Unique Properties.
- **UAE portals (AI-heavy):** Property Finder (SuperAgent, Data Guru), Bayut (TruCheck, TruBroker, transactions data), Dubizzle.
- **Developers:** Emaar, DAMAC, Sobha (for their off-plan UX).
- **Global benchmarks:** Zillow, Redfin, Compass, Realtor.com, Rightmove, Sotheby's International, Knight Frank global, Juwai (China outbound).

**What I capture for each:**
- Sitemap and page types
- Hero message and value proposition
- CTAs and lead capture
- Booking or contact flow
- Languages and RTL support
- Search and filters
- AI features (chat, natural-language search, valuations, recommendations, voice)
- Calculators (mortgage, ROI, Golden Visa)
- Off-plan tooling
- Trust signals (RERA numbers, reviews, awards)
- WhatsApp usage
- Animation quality
- SEO basics: titles, schema, hreflang, blog cadence, ranking keywords

**Deliverables:**
- The feature matrix
- A "table stakes vs. differentiators" list
- A gap list that confirms the 10 AI features below don't already exist. I'll rename or replace any that do.

---

## 2. Phase 2 — Content strategy (marketing-savvy)

**Output:** `docs/02-content-strategy.md`, plus the final copy, stored as translation keys.

**Positioning:** *"Dubai, decoded."* Buildcaps is the data-led investment partner for global buyers. It offers transparent numbers, early access to off-plan launches, and the purchase handled end-to-end remotely, in your language.

**Message pillars, each backed by proof:**
1. **Transparency.** Real DLD data, published yields, no hidden fees. Proof: the RERA ORN and permit numbers shown on every listing.
2. **Access.** Priority allocations from Emaar, DAMAC, Sobha and BNW. Proof: developer partner logos and awards.
3. **Returns.** Tax-free rental income, Golden Visa at AED 2M+, a USD-pegged currency. Proof: calculators and case studies.
4. **Global, personal service.** Advisors in your language and a fully remote purchase. Proof: the languages each advisor speaks, plus verified reviews by country.

**Conversion architecture:**
- **Primary CTA:** "Book a free strategy call" (goes into the booking flow).
- **Secondary CTA:** "Get the 2026 Dubai Investor Guide" (gated lead magnet).
- **Persistent CTA:** WhatsApp.
- **Micro-CTAs:** "Check my Golden Visa eligibility" and "Calculate my ROI".

**Copywriting rules:**
- Lead with outcomes ("Earn 7–9% tax-free"), not features.
- Use specific numbers.
- Address objections in FAQs: escrow safety, off-plan risk, buying remotely, financing for non-residents.
- Add social proof near every CTA.
- Add urgency only where it's real (launch dates, limited allocations).
- Every compliance claim must be accurate.

**Draft hero options**, to be A/B tested later:
- "Build wealth in the world's most tax-efficient skyline."
- "Dubai, decoded. Invest with data, not guesswork."

**Content fixes carried over from the audit:**
- Fix the typos ("Buildc taps", "Newletter", "CEO'S", "Advisory").
- Remove the duplicated "People First".
- Remove the "Miss" option from the inquiry form.
- Use AED budgets with currency switching.
- Use one price format everywhere ("AED 1.81M").
- Use real size units.
- Replace the stale "1 year ago" labels with a launch or handover status.

**I need from the client:**
- Real stats: number of deals, AED transacted, nationalities served
- Awards list
- RERA ORN and BRN numbers
- Trakheesi permits
- Photos of the team and office
- Languages each advisor speaks
- Real, verifiable reviews (Google reviews)

---

## 3. Phase 3 — Multilingual architecture

- **Library:** `next-intl` with routes under `app/[locale]/...`, a locale switcher, and locale-aware formatting for currency, dates and numbers.
- **Launch languages (decided, 10):** English, Arabic, Russian, Simplified Chinese, Hindi, French, German, Italian, Urdu, Persian. **Three of them are right-to-left: Arabic, Urdu and Persian.**
- **RTL:** set `dir="rtl"` for `ar`, `ur` and `fa`. Use Tailwind logical properties (`ms-`/`me-`/`ps-`) everywhere and mirror the directional animations (slide-ins, horizontal scroll, drag strips).
- **Fonts (loaded per locale with `next/font`):**
  - Inter for Latin and Cyrillic (EN, RU, FR, DE, IT)
  - IBM Plex Sans Arabic for Arabic
  - Vazirmatn for Persian
  - Noto Nastaliq Urdu for Urdu headings, with Noto Naskh Arabic for Urdu body text
  - Noto Sans SC for Chinese
  - Noto Sans Devanagari for Hindi
- **Translation pipeline:**
  - Interface text goes in `messages/{locale}.json`.
  - Database content (listings, funnels, posts) is stored as JSONB keyed by locale (`{"en": "...", "ar": "..."}`), falling back to EN.
  - Claude drafts every translation. The admin has a "translate missing locales" button.
  - A native speaker reviews AR, UR and FA before launch, since right-to-left languages and legal claims are highest risk.
- **SEO:** `hreflang` alternates, a sitemap per locale, translated slugs where useful.

---

## 4. Phase 4 — Sitemap (multi-page)

| Route (`/[locale]/…`) | Purpose |
|---|---|
| `/` | Home: hero, smart search, featured properties, Opportunities, communities strip, why-Dubai story, AI tools teaser, proof (awards, reviews, developer logos), insights, booking CTA |
| `/properties` | Our listings: filters (status, type, community, beds, AED budget, handover year, developer), grid/map toggle, natural-language search |
| `/properties/[slug]` | Property detail: gallery, key facts, payment plan, floor plans, map, AI panels (Handover Truth Score, Wealth Twin…), RERA permit QR, "Book viewing" |
| `/opportunities` | **Funnels hub**: cards that redirect via `/go/[slug]` to external funnels |
| `/off-plan` and `/off-plan/[project]` | New launches, payment plans, construction progress |
| `/communities` and `/communities/[slug]` | Area guides: yields, schools, lifestyle, listings in the area |
| `/developers` and `/developers/[slug]` | Emaar, DAMAC, Sobha, BNW… with track record and projects |
| `/invest` | Why Dubai, Golden Visa, taxes, buying remotely, financing |
| `/tools` | ROI, mortgage and Golden Visa calculators, currency converter, plus the AI tools hub |
| `/services/{buy,sell,rent,property-management,mortgage,valuation}` | Service pages |
| `/about`, `/team`, `/team/[slug]` | Story, CEO and Sales Director messages, advisor profiles with languages and booking links |
| `/awards`, `/careers` (+ job detail), `/faq` | Trust and recruiting pages |
| `/insights`, `/insights/[slug]`, `/market-reports` | Blog (old posts migrated) and gated reports |
| `/book` | **Appointment booking flow** |
| `/contact` | Office map, WhatsApp, phones, form |
| `/privacy`, `/terms`, `/cookies`, `404` | Legal pages |
| `/admin` | CMS: properties, funnels, agents, appointments, posts, SEO-agent approval queue |

---

## 5. Phase 5 — Motion and interaction design

All animation is built on framer-motion (already installed), with **Lenis** for smooth scrolling. GSAP ScrollTrigger is used only for the 2–3 complex pinned sequences. Everything respects `prefers-reduced-motion` and stays mobile-safe.

**Card animations**
- 3D tilt with a light glare that follows the cursor
- Magnetic CTAs
- Image clip-path reveal on enter
- Stacked "deck" cards that fan out on scroll
- Hover gallery scrub, where cursor X position changes the photo
- Price counting up
- Badge shimmer for "New launch"
- Opportunity cards flip to show the offer's key numbers

**Shared-element transitions**
- The card image morphs into the detail-page hero (`layoutId` plus the View Transitions API).

**Scroll-driven behaviour**
- Home hero: the skyline parallax layers separate on scroll, and the headline uses a masked text reveal.
- **"Rise of Dubai" pinned story:** the skyline builds floor by floor as you scroll, and stats count up per milestone (2004 → 2040 plan).
- Pinned horizontal scroll through off-plan launches.
- Communities section: a sticky map where markers light up as each community card scrolls by.
- A progress bar for the section and a scroll-linked header that shrinks and gains a backdrop.
- Text-scrub paragraphs, where words light up as you read.
- Number tickers when sections enter the viewport.

**Micro-interactions**
- Cursor follower on media
- Button ripple
- Skeleton shimmer while loading
- Toast confirmations
- Animated step transitions in the booking wizard
- Confetti on a confirmed booking (subtle, on brand)

**Page transitions**
- A soft fade and blur between routes, plus a branded intro loader on the first visit only.

---

## 6. Phase 6 — Two commercial hubs

### A. Our Properties
- A `properties` table in Supabase with these fields: localized title and description, status (off-plan, ready, sale, rent), type, community, developer, AED price, beds, baths, sqft/sqm, handover date, payment plan, gallery, floor plans, geo, amenities, **Trakheesi permit number and QR code**, assigned agent, featured flag, SEO fields.
- Price format is shown consistently. A currency switch covers AED, USD, GBP, EUR, INR, RUB and CNY, and a unit switch covers sqft and sqm.
- An XML feed export for Property Finder, Bayut and Dubizzle, so you list once and publish everywhere.

### B. Opportunities (funnels)
- A `funnels` table in Supabase with these fields: title, image, short pitch, key numbers, tag, target locale, external URL, start and end dates, active flag, sort order.
- Cards link to `/go/[slug]`. That route logs the click (source page, locale, UTM), adds UTM parameters, and does a 302 redirect to the funnel. Expired funnels are hidden automatically.
- Click analytics appear in the admin view.

---

## 7. Phase 7 — Appointment booking flow (`/book`, also opens as a modal from any CTA)

1. **Purpose:** property viewing, investment strategy call, valuation, mortgage consult, or Golden Visa consult.
2. **Context:** the property is pre-filled when coming from a listing. Budget and timeline chips are optional.
3. **Mode:** office visit (Conrad Tower), on-site viewing, video call (Google Meet or Zoom link generated), or WhatsApp call.
4. **Advisor:** "Best match", picked automatically by language, specialty and availability, or the visitor chooses an advisor themselves.
5. **Date and time:** slots shown in the **visitor's timezone** and converted to Dubai time. Availability comes from advisor calendars, with buffer times, working hours, holidays and Friday rules.
6. **Details:** name, email, and phone with country code. Phone is verified by OTP (`input-otp` is already in the kit). Plus a consent checkbox.
7. **Confirmation:** an animated success screen, an `.ics` file, add-to-Google/Outlook links, and email plus WhatsApp confirmations.
8. **Lifecycle:** reminders at 24 hours and 1 hour, self-service reschedule and cancel links, a no-show follow-up, and a post-meeting feedback request.
9. **Admin:** calendar view of bookings, reassigning advisors, status changes, sync to the CRM.

- **Tech:** custom booking UI (shadcn plus react-day-picker), with Google Calendar or Microsoft Graph for availability and events, Resend for email, WhatsApp Business Cloud API, and Cloudflare Turnstile for spam protection.

---

## 8. Phase 8 — Baseline AI (table stakes competitors already have)

- **Buildcaps Concierge:** a multilingual chat and voice assistant on every page. It knows the listings and FAQs, qualifies leads, books appointments directly in chat, and hands off to WhatsApp or a human advisor with a written brief.
- **Natural-language search:** e.g. "3-bed sea view under 3M near a British school, handover 2027", parsed into filters.
- **Smart recommendations:** "similar properties" plus recently viewed.
- **AI valuation estimate:** an instant estimate range from DLD comparables, leading to "Book a valuation". This matches Bayut's TruEstimate at broker level.
- **"Buildcaps inside ChatGPT and Claude":** a connector (MCP server) exposing our listings and booking. Bayut, Zillow, Redfin and Rightmove have this. No Dubai broker does.

- **Models:** Claude via the Vercel AI SDK. `claude-sonnet-5-5` for chat, search parsing and SEO; `claude-opus-5-5` for deep analysis; `claude-haiku-4-5` for classification and translation drafts.

### 8b. Portal-parity AI, built in-house (cost rule: **only the Anthropic API is paid**)
Every AI feature found on the portals and global leaders (see `docs/01` §2) is rebuilt on our own stack. Data and libraries are free or open-source. The intelligence comes from Claude.

| Their feature | Ours | How it's built (no paid services) |
|---|---|---|
| Bayut **AI Search**, Zillow **AI mode**, Redfin / Rightmove conversational search | **Ask Buildcaps**: conversational search across the whole journey, in all 10 languages | Claude tool-use parses the request into SQL filters on Supabase; follow-up questions keep context |
| Zillow search **by commute, affordability and schools** | Lifestyle filters: "≤25 min to DIFC at 8am", "near a British-curriculum school", "monthly cost under X" | Self-hosted **OSRM** routing on OpenStreetMap data, **Overpass** POIs, KHDA school list (public), our affordability formula |
| Bayut **TruEstimate** | **Buildcaps Estimate**: a value range plus price history plus ROI per unit | DLD open transactions (Dubai Pulse, free) give comparables. A median/regression model produces the range. Claude explains it in plain language |
| Bayut **TruCheck** | **Verified Listing** badge | Claude **vision** checks each listing's photos: duplicates, watermarks, mismatched room counts, quality. An advisor confirms in the admin, and the badge shows a verified date |
| Property Finder **Data Guru** | **Dubai Data Room**: price map, community insights, transactions feed, rent-vs-buy | DLD open data ingested daily into Supabase, a **MapLibre + OpenFreeMap** map (free tiles), Recharts. Claude writes the insights |
| Property Finder **SuperAgent** | **Advisor Score** on each advisor profile | Our own data: response time, booking show-rate, verified reviews, deals. Claude summarises strengths |
| Property Finder **AI avatars** | **Advisor Voice Notes**: personalised listing intros in the buyer's language | Claude writes the script; the browser **Web Speech API** reads it (free). *Photoreal video avatars need a paid video model, so they're optional later* |
| Bayut / Zillow / Redfin / Rightmove **apps inside ChatGPT** | **Buildcaps connector for Claude and ChatGPT** | An open-source **MCP server** (`/api/mcp`) exposing search, property details and booking tools. Both ChatGPT Apps and Claude connectors speak MCP |
| Rightmove **AI Keywords** | Smart keyword chips on every listing ("sea view", "chiller-free", "high floor") | Claude extracts them from descriptions and photos at publish time |
| Rightmove **Style with AI** | **Style Moodboard**: a design direction for the unit | Claude proposes a style, palette and furniture list matched to curated photos. *Generating new images needs a paid image model, so that's optional later* |
| Compass **AI Assistant** (for agents) | **Advisor Copilot** in the admin | Claude writes listing copy in 10 languages, briefs advisors before each meeting, summarises after, drafts follow-ups, scores leads |
| realttyAI developer reliability and construction risk | **Developer Track Record** pages | DLD project registry plus our recorded handover history; Claude writes the narrative (feeds Handover Truth Score #1) |
| OffPlanSimulator ROI / EMI / payment-plan / DLD-fee calculators | **Tools hub** calculators | Plain TypeScript, no AI cost |
| Housebell 3D sunlight simulation | **Sun & View** viewer (feeds Future Skyline #4) | **Three.js** with OSM building footprints and heights, plus **suncalc** (free) |
| Unique Properties AIR Match, Provident quiz | **Match Me** quiz | A 6-question adaptive quiz; Claude ranks listings and explains each pick |

### 8c. Agentic AI layer
These agents actually **do work**, not just chat. They're built with Anthropic tool-use and the **Claude Agent SDK** (TypeScript). Every agent logs its actions to an `agent_runs` table, and risky actions need human approval.

| Agent | Trigger | Tools it can use | Human gate |
|---|---|---|---|
| **Concierge Agent** (visitor-facing) | Chat or voice on any page | search_properties, get_property, estimate_value, calc_roi, check_slots, **book_appointment**, create_lead, handoff_to_advisor | None for booking, since the visitor confirms in the UI |
| **Listing Ops Agent** | Admin uploads a developer brochure PDF | Claude PDF reading → extract project, units, payment plan → write the listing in 10 languages → SEO meta → keyword chips → flag missing Trakheesi permit | Draft only; an admin publishes |
| **Market Intel Agent** | Daily cron | Ingest DLD open data → update the price map and community stats → draft weekly insight posts and the quarterly report | Posts need approval |
| **Lead Nurture Agent** | New lead or booking event | Score the lead, pick the matching advisor, draft personalised follow-ups (email and WhatsApp click-to-chat), schedule reminders | Advisor approves outbound messages until trust is established |
| **Booking Agent** | Booking lifecycle | Reminders, handling reschedule replies, no-show follow-ups, post-meeting feedback | Automatic |
| **Advisor Copilot Agent** | 30 min before each appointment | Lead history, preferences, suggested listings → brief; after the meeting, summary and next steps | Advisor edits |
| **SEO Growth Agent** | Weekly cron | See §10 | Hybrid (as decided) |
| **Translation QA Agent** | On publish | Back-translation checks, RTL formatting checks, glossary enforcement (project and developer names stay untranslated) | Flags only |

- All agents share a tool registry in `lib/ai/tools/*` and one MCP server, so the website, the admin and external assistants use the same tools.

---

## 9. Phase 9 — 10 new AI features

These were validated in M1 (see `docs/01-competitor-research.md` §3).
- **No match found anywhere:** #2, #6, #7 and the new #3.
- **Partial overlaps that we differentiate from:** #1, #4, #5, #8, #9 and #10.
- **Replaced:** the original #3, which already existed.

Each ships as an MVP first, then a full version.

| # | Feature | What it does | Why it wins | Data / tech |
|---|---|---|---|---|
| 1 | **Handover Truth Score** | Predicts the delay probability for each off-plan project and shows a live "construction pulse" | Off-plan buyers' #1 fear is delay; nobody quantifies it | Satellite/drone time-series of the site, RERA progress %, escrow status, developer delivery history |
| 2 | **Wealth Twin** | Monte-Carlo simulation of *your* net worth over 5, 10 and 20 years: buying this unit vs. keeping money at home | Personal, in home currency, includes home-country tax and Golden Visa value | DLD prices and rents, FX, user inputs, Claude explanation |
| 3 | **Buyer Bloc** *(replaces Cashflow-Fit, which already exists at OffPlanSimulator and realttyAI; it's now folded into Wealth Twin as an FX-aware instalment planner)* | AI groups compatible global investors into a buying bloc for one launch. A live progress bar shows how close the bloc is to unlocking block pricing or terms, which Buildcaps negotiates with the developer. Each buyer keeps their own SPA | Real negotiating power, honest urgency and social proof; more deals per launch | Lead preferences, launch inventory, developer agreements (needs legal and RERA review) |
| 4 | **Future Skyline View** | Shows the view from your specific unit today and in 5 years, with "view-blocked risk", sun hours and an estimated AC cost | Views are priced in, but nobody shows if they will last | Dubai 2040 master plan, announced projects, 3D massing, sun path |
| 5 | **Ghost Tenant Market** | A swarm of synthetic tenant and buyer agents calibrated on DLD data "bids" on the unit, giving rent, vacancy days, short-let vs. long-let yield, and the best exit window | Market simulation instead of a static yield number | DLD rental/sales data, short-let comps, agent-based simulation |
| 6 | **Family Decision Room** | A shared live room for family members in different countries: real-time translation, each person's must-haves captured, a consensus shortlist, then books a viewing | International purchases are family decisions | Realtime multilingual voice, shared state, Claude summarisation |
| 7 | **Promise Ledger** | Extracts every promise from developer brochures and tracks whether it was delivered, giving a "promises kept %" per developer. It also explains the SPA contract in your language and flags unusual clauses | Trust layer for a market with a reputation risk | Document AI over brochures and contracts, evidence tracking |
| 8 | **Day-in-Your-Life** | Enter your office, school, gym and place of worship to get a personalised narrated "day living here": real rush-hour commutes, nearby spots, monthly cost of living | Sells lifestyle with real facts, per buyer | Maps and traffic APIs, POI data, TTS in the visitor's language |
| 9 | **Regret Radar** | Counterfactual engine: "had you bought here in 2019…" plus the probability of regretting each current option against alternatives at the same budget | Reframes the decision around avoiding loss, which is a powerful motivator | Historical DLD transactions, scenario modelling |
| 10 | **Portfolio Architect** | Splits a budget (e.g. AED 5M) into a diversified multi-unit Dubai portfolio across areas, types and risk levels, with correlation and income-smoothing analysis | Applies portfolio theory to individual buyers, which increases deal size | DLD data by area, risk modelling, Claude explanation |

**Honest constraints:**
- I can't guarantee that "nobody has ever built" any of these. Phase 1 checks the competitors listed above.
- **All data sources are free.** Within the free-data limits, these features are built as "the best possible estimate", clearly labelled as such.
  - **#1:** ESA **Sentinel-2** satellite imagery (Copernicus, free). At 10 m resolution it detects site footprint and activity changes, but it can't count floors. Combined with DLD progress % and developer handover history.
  - **#4:** **OpenStreetMap** building footprints and heights, plus announced projects entered in the admin. OSM heights are incomplete in places.
  - **#2, #5, #9, #10:** DLD open transactions and the Smart Rental Index (Dubai Pulse, free).
  - **#8:** OSRM routing on OSM data plus Overpass POIs (free). Voice uses the browser's Web Speech API.
  - **#6:** Supabase Realtime (free tier) for the shared room, and Claude for translation and summaries. Live voice input uses browser speech recognition, which works best in Chrome and Edge.
- Every AI output carries a "not financial advice" disclaimer.

---

## 10. Phase 10 — Autonomous SEO Growth Agent

**Loop, run on a schedule (weekly by default):**
1. **Monitor:** Google Search Console API (free; our rankings, clicks, CTR) plus **Claude's built-in web search tool** (billed through the Anthropic API) to see who ranks for our target keywords in each language. No direct Google scraping, which breaks Google's terms.
2. **Competitor scan:** crawl the competitor pages that rank for our keywords, respecting robots.txt. Extract titles, headings, schema, word count, FAQs and internal links.
3. **Analyse:** Claude finds the gaps: missing topics, weak meta tags, missing schema, thin pages, keywords with high impressions and low CTR.
4. **Propose changes** as drafts in the CMS: rewritten titles and meta descriptions, FAQ blocks, schema, internal links, new article drafts, community-page updates.
5. **Guardrails:**
   - Low-risk changes (meta tags, schema, internal links) can auto-publish, with a snapshot so they can be rolled back.
   - Content changes and new pages go to an **approval queue** in `/admin`.
   - It never copies competitor text.
   - It fact-checks against our own data.
   - It respects RERA advertising rules.
6. **Measure:** compare before and after for 14–28 days per change, automatically roll back losers, and keep winners. A weekly report is emailed to the team.

- **Tech:** a scheduled job (cron), plus Search Console (free), Claude with its web search tool, and Supabase. Proposals are stored in the `seo_proposals` table and snapshots in `seo_snapshots`.

---

## 11. Things you hadn't mentioned (added)

- **Dubai compliance:**
  - RERA/DLD **Trakheesi advertising permit number and QR on every listing** (legally required).
  - Agency ORN and agent BRN numbers.
  - UAE PDPL and GDPR consent and privacy policy.
  - Cookie consent.
  - AI "not financial advice" disclaimers.
- **SEO migration:** 301-redirect every old buildcaps.com URL so the existing rankings carry over. Migrate the existing blog posts.
- **Technical SEO:** schema (RealEstateAgent, RealEstateListing, Organization, FAQPage, BreadcrumbList, Article), hreflang, sitemaps, OG images per page, Core Web Vitals.
- **CRM:** every lead and booking goes into the CRM, with source and UTM attribution.
- **WhatsApp:** a WhatsApp Business API integration (the main channel in the UAE).
- **Portal feeds:** an XML feed to Property Finder, Bayut and Dubizzle.
- **Tools:**
  - Mortgage, ROI and Golden Visa calculators
  - Currency and unit switch
  - Map search (MapLibre + OpenFreeMap, free)
- **Lead magnets:** investor guide and quarterly market reports, gated.
- **Analytics:** GA4, Meta and TikTok pixels, conversion events, heatmaps (Clarity).
- **Trust:** verified Google reviews widget, a gallery of awards and press mentions, video testimonials.
- **Performance and accessibility:** image optimisation, a Lighthouse score of 90+, WCAG 2.2 AA, reduced-motion support.
- **Security:** rate limiting, Turnstile, an admin role system, secrets kept in env vars.
- **Content needed from you:** real stats, photos, team bios, permit numbers, brand assets (logo, colours).

---

## 12. Tech architecture

- **Framework:** Next.js 15 App Router (the existing template) and TypeScript, using `next-intl` with routes under `app/[locale]`.
- **Backend (decided): Supabase**
  - Postgres database
  - Auth for admin logins, with roles: admin, advisor, editor
  - Storage for property images and floor plans, served through `next/image`
  - Row Level Security: public reads only published rows, writes require an admin role
  - SQL migrations in `supabase/migrations/`
  - Tables: properties, projects, developers, communities, funnels, funnel_clicks, agents, agent_availability, appointments, posts, testimonials, awards, jobs, faqs, leads, seo_proposals, seo_snapshots
- **Custom admin at `/[locale]/admin`** (EN only for staff), built with the template's shadcn kit (`sidebar`, `table`, `form`, `dialog`, `tabs`, `chart`):
  - Properties: create and edit, with image uploads, localized fields and "AI translate"
  - Funnels: create and edit, with click stats
  - Appointments: calendar, plus assigning and changing status
  - Agents: profiles and working hours
  - Posts
  - Leads
  - SEO approval queue
  - Dashboard: bookings, leads, funnel clicks, rankings
- **AI:** Vercel AI SDK with the Anthropic provider.
- **Integrations:** Search Console API, email (Resend free tier or SMTP), WhatsApp click-to-chat (Cloud API optional), Cloudflare Turnstile (free), MapLibre + OpenFreeMap, OSRM + OpenStreetMap, Dubai Pulse open data. All free; Anthropic API is the only paid service.
- **Hosting:** Vercel, with Vercel Cron for the SEO agent and booking reminders.
- **New folders:** `app/[locale]/(site)/…`, `app/[locale]/admin/…`, `app/api/…`, `supabase/migrations/`, `lib/supabase/*`, `app/go/[slug]`, `messages/*.json`, `lib/ai/*`, `lib/booking/*`, `lib/seo-agent/*`, `components/motion/*`, `components/property/*`, `components/booking/*`, `docs/*`.

---

## 13. Execution order (milestones)

| # | Milestone | Done when |
|---|---|---|
| M0 ✅ | Setup: copy this plan to `WORKFLOW.md`, git init, fix the config, pin dependencies, folder structure, Buildcaps brand tokens. *Header navigation moved to M3, so it's built once, locale-aware* | Builds cleanly with no ignored errors |
| M1 ✅ | Competitor research doc | Matrix and gap list written; AI features validated (`docs/01-competitor-research.md`) |
| M2 ✅ | Content strategy and English copy for all pages | `docs/02` plus `messages/en.json` complete (29 namespaces, 593 strings) |
| M3 ✅ | i18n scaffolding and RTL support (10 locales) | All 10 locales route; AR, UR and FA render correctly right-to-left with the right fonts. *Done: routing + per-page hreflang (`lib/seo.ts`), RTL-safe UI kit (logical properties, Radix `DirectionProvider`), per-script font and line-height rules, locale-aware formatting + AED-first currency/unit switch (`lib/format.ts`, `components/price.tsx`), translated header/footer shell. **Open:** the full catalogue is 13% translated (shell only); run `npm run i18n:translate` once an `ANTHROPIC_API_KEY` is provided, after M5 freezes the copy* |
| M4 ✅ | Motion primitives library | Tilt, reveal, pinned story, horizontal scroll and page transitions working. *Done in `components/motion/*` (Lenis, View Transitions route + shared-element morphs, tilt+glare, magnetic, clip reveal, count-up, text scrub, pinned story, RTL-aware horizontal scroll, stacked deck, flip card, hover scrub, media cursor, ripple, step transition, confetti, first-visit intro) plus the "Rise of Dubai" skyline (`components/home/rise-of-dubai.tsx`). Dev-only showcase at `/motion-lab`. GSAP was not needed: framer-motion + sticky covers the pinned sequences. React `<ViewTransition>` is still experimental in Next 15.5, so transitions use the native API with instant fallback* |
| M5 ✅ | All pages built with mock data | Every route in §4 renders in every locale. *Done: 76 routes × 10 locales = 760 URLs, all 200 with no missing messages (crawled from `/sitemap.xml` on a production build). Data layer `lib/data` (sample data, same API Supabase will implement), filters in the URL, MapLibre maps (self-hosted worker), Ask Buildcaps rule-based search, 6 working calculators, booking wizard UI (mock slots, real calendar links), `/go/[slug]` UTM redirector, sitemap + robots, JSON-LD (RealEstateAgent, RealEstateListing, BreadcrumbList, FAQPage, Article, JobPosting). Procedural skyline art stands in for photography; sample figures are labelled "Sample data". Unconfirmed client facts (awards, ratings, ORN, partner logos) stay hidden. Template furniture assets moved to `_archive/`. `/admin` is part of M6* |
| M6 🟡 | Supabase schema, custom admin, Properties and Opportunities (funnels) | Admin logs in, adds a listing and a funnel; `/go/[slug]` tracks and redirects. *Code complete, waiting for the Supabase project to verify end to end (setup: `docs/supabase-setup.md`). Done: migration + RLS + storage policies (`supabase/migrations/`), tested in Postgres/PGlite as anon, role-less user and editor; sample seed generator; data layer switches from sample data to Supabase when keys exist; leads from every form and `/go` click logging; admin at `/admin` (login, dashboard, listings CRUD with photo/QR upload, opportunities CRUD with 30-day click stats, leads inbox). Public pages moved into the `app/[locale]/(site)` route group so the admin has its own chrome* |
| M7 🟡 | Booking flow end to end | A booking creates a calendar event, sends an email, and reschedule and cancel work. *Code complete, waiting for keys (`docs/launch-checklist.md`). Atomic `book_appointment` (advisory lock, 15-minute buffer, tested in PGlite), Google Calendar free/busy + events via a hand-signed service-account JWT (Workspace delegation → Meet links; otherwise Jitsi), emails via Resend or SMTP with `.ics`, manage/reschedule/cancel by token, 24 h/1 h reminders and no-show follow-up (`/api/cron/booking`), optional WhatsApp Cloud template, Turnstile + rate limits on every form* |
| M8 🟡 | Baseline AI, portal-parity AI (§8b) and agentic layer (§8c): Concierge, Ask Buildcaps, Estimate, Verified Listing, Data Room, MCP connector, Listing Ops / Market Intel / Lead Nurture / Booking / Copilot agents | Answers and books in all languages; a brochure PDF becomes a 10-language draft listing; the MCP connector works in Claude. *Code complete, waiting for `ANTHROPIC_API_KEY`. Anthropic SDK directly (not the AI SDK): shared tool registry (`lib/ai/tools.ts`) for the streaming Concierge, the MCP server (`/api/mcp`) and agents; every run logged in `agent_runs`. Estimate (DLD comparables, community fallback), Data Room (MapLibre, Recharts, transactions feed, rent vs buy), Match Me, Verified Listing (Claude vision + advisor confirm), Listing Ops (brochure → 10-language draft + Promise Ledger entries, blocked until a real permit), Market Intel (DLD ingest + monthly history + draft note), Lead Nurture (score + draft, advisor sends), Advisor Copilot (pre-meeting brief)* |
| M9 🟡 | SEO Growth Agent (dry-run first, then live with the approval queue) | Weekly report and proposals appear in the admin. *Code complete, waiting for Google + Anthropic keys. `lib/seo-agent/*`: Search Console metrics, our-page audit, Claude web-search research + robots.txt-respecting crawl, guarded proposals (our paths only, RERA wording, no competitor text), live mode auto-applies meta/internal links with snapshots, content and article drafts wait in `/admin/seo`, 14–28-day measurement with automatic rollback, weekly email. Overrides render through `pageMetadata` and `SeoExtras`* |
| M10 🟡 | 10 AI features as MVPs (priority order: 2, 9, 10, 8, 6, 7, 3, 5, 1, 4; Buyer Bloc goes later because it needs developer agreements and a legal review) | Each live on property or tools pages. *All 10 built at `/tools/<slug>` and linked from listings: Wealth Twin (2,000-path Monte Carlo, home currency, tax, FX, residency), Regret Radar (hindsight + regret probability), Portfolio Architect (beam search, correlation risk), Day in Your Life (OSRM + Overpass + narrated day + costs), Family Decision Room (Supabase Realtime, live translation, shared votes, AI compromise; nothing stored), Promise Ledger (verified ledger + "explain my SPA" PDF check), Buyer Bloc (pilot interest list with live counts), Ghost Tenant Market (simulated tenant swarm, short vs long let, earliest exit), Handover Truth Score (transparent factor model + construction pulse), Future Skyline View (Three.js OSM massing, announced towers, sun hours, view-blocked risk). Simulations run in the browser on seeded RNG; Claude only explains. Sentinel-2 imagery for #1 is a later addition* |
| M11 🟡 | Compliance, SEO migration and redirects, analytics, performance, accessibility, QA, deploy | Lighthouse 90+, redirects verified, deployed. *Done in code: cookie consent (reject as prominent as accept) gating GA4/Clarity/Meta/TikTok/Vercel Analytics with conversion events, 301 map from every old WordPress URL (`lib/redirects.mjs`) and the 14 blog posts migrated with their slugs, favicons/manifest/default share image, CSP and security headers, `vercel.json` crons. Remaining: deploy, Lighthouse on the live site, legal review of policies, native-speaker check of translations* |
| M12 🟡 | Own booking system in the admin, and a CRM (added 2026-10-03 at the client's request) | Staff manage bookings, hours and leads without Google. *Built and tested on the live database: admin Calendar (week view by advisor, side panel to reschedule/reassign/change status, manual phone and walk-in bookings with free-slot suggestions and optional overlap), Availability (booking rules: slot length, buffer, notice, bookable days; weekly hours per advisor; time off and office holidays; private iCal subscription links), Team (advisors with photo, languages, booking email, BRN, linked login). CRM: one contact per person (enquiries and bookings file themselves by email via database triggers), pipeline board with drag-and-drop, list with filters and CSV export, contact page with timeline (notes, calls, WhatsApp, emails), tasks and follow-ups, meetings, AI follow-up drafts and lead score. Remaining: walk through the admin with the first staff login. 2026-10-04: Google Calendar removed; video calls use each advisor's own meeting link (Admin → Team) or a Jitsi room, availability comes only from hours, time off and bookings; advisor email and meeting link hidden from visitors (migration 09)*
| M13 🟡 | Content admin, the remaining AI features, empty states (added 2026-10-04) | Every page and AI feature works with real data or says clearly why not. *Admin pages for communities, developers, off-plan projects, reports/guide (private PDF, emailed signed link) and careers, with map geocoding. Empty states: AI tools show "live data is on its way" with an advisor form and the calculators; list pages and home sections hide or explain empty lists. Advisor Copilot: brief kept on the appointment, after-meeting notes (typed or dictated) → summary, needs, tasks and a follow-up in the client's language, saved to the CRM on approval. Advisor Score (daily, from CRM response times, show rate, deals and verified reviews; public once 5 meetings or 3 reviews) with verified reviews collected from the booking link after the meeting and approved in Admin → Team. Advisor Voice Notes (Claude script per listing and language, cached, read by the browser). Style Moodboard on listings. Lifestyle filters (8am commute, school/metro nearby, all-in monthly cost) in search, Ask Buildcaps and the Concierge, from OSM surroundings filled on save. Portal XML feeds for Property Finder, Bayut and dubizzle (private token). Translation QA on publish (Admin → Translation QA). The 14 Insights articles translated into the 9 other languages. Shared fixes: structured outputs accept nullable enums, and short AI tasks no longer spend their budget on thinking. Home hero rebuilt in the Mjazo style at the client’s request: real Dubai drone video (Pexels; 1080p on desktop, a 0.7 MB clip on phones) in a frame that shrinks and rounds on scroll, a giant BUILDCAPS wordmark, a serif headline that comes into focus letter by letter (word by word for Arabic-script and Devanagari), no pink text, and an AI search bar. Site-wide AI search (⌘K / Ctrl K, "/", the header icon or the hero): instant results across listings, areas, projects, developers, articles, tools and pages (`/api/search`, cached index), "Ask Buildcaps AI" streaming an answer inline, "Find listings that match", and handoff to the Concierge. Real licensed photography (Unsplash) replaces the drawn skyline art in page headers, area, article and opportunity cards and banners (`lib/media.ts`); listing pages now show their own photos, with the area photo (labelled) only when a listing has none. Remaining: first real communities/listings, native review of AR/UR/FA, deploy*

---

## 14. Verification (each milestone)

- `npm run build` passes with type checking enabled.
- `npm run dev`, then the browser pane: check every page in EN plus the three right-to-left languages (AR, UR, FA) and one CJK language (ZH), at desktop and at mobile width (375px), and read the console for errors.
- **Supabase RLS:** an anonymous user can't read drafts or write to any table; an admin can.
- **Booking:** create, reschedule, reassign and cancel a test booking. Check the meeting link, the `.ics` file and the email.
- **Funnels:** clicking a card hits `/go/[slug]`, logs the click, and redirects with UTM parameters.
- **SEO agent:** a dry-run produces proposals and nothing is published. Rollback works.
- **AI features:** test prompts in 3 languages; outputs carry disclaimers.
- **Lighthouse and accessibility** audits before launch, plus a redirect map test against the old buildcaps.com URLs.
