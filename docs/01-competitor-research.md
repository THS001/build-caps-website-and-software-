# 01 — Competitor Research (live, October 2026)

How this was gathered: live homepages were read directly and targeted web searches were run.

**Coverage**
- **Audited directly:** AX Capital, Betterhomes, Allsopp & Allsopp, fäm Properties, Provident, Espace, Exclusive Links, Driven Properties, haus & haus.
- **Covered through news and search** (the sites blocked automated fetch, or were portal/global benchmarks): Metropolitan, Unique Properties, Property Finder, Bayut, Zillow, Redfin, Compass, Rightmove.
- **Not individually audited yet:** Engel & Völkers Dubai, Dubai Sotheby's, Knight Frank UAE, Savills UAE. These are luxury and global brands with similar broker patterns. I'll audit them in M11 if needed.

---

## 1. Dubai brokers: feature matrix

| Broker | Hero message | Languages | AI | Tools | Off-plan UX | Trust signals | WhatsApp / booking |
|---|---|---|---|---|---|---|---|
| **AX Capital** (closest competitor: investor-led) | "Invest in Dubai real estate… Due Diligence at Your service" | **30+** | None | None | 4 exclusive projects with ROI forecast (7–10%), payment plans | 500+ specialists, 10k deals, 40+ nationalities, 100+ developers | WhatsApp, consultation form |
| **Betterhomes** | "Homes that move you" | EN + AR | None | None | Exclusive projects (AED 1.3–4M) | 40 yrs, **2,500+ 5★ Google reviews**, 250k homes | Form only |
| **Allsopp & Allsopp** | "Find your place" | EN | Only mentioned in marketing copy | Mortgage, Buy-vs-Rent | WhatsApp channel giving early access | ISO since 2009, **RERA office #1815**, Forbes / PF / Bayut awards | WhatsApp channel, "Book valuation" |
| **fäm Properties** (UX benchmark) | "The Life You Want ✦ Has An Address" | EN + separate RU site | None | Mortgage, valuation, **area price tracker map** | **20/55/25 payment-plan display**, launches map, plan filter | 900+ agents, **4.9★ / 15,000 reviews**, Arabian Property Awards | WhatsApp per agent, 24/7 |
| **Provident** | "Find your home in Dubai" | EN | **30-second AI matching quiz** | None | 4,000+ projects, **roadshows** | **ORN 1933**, Great Place to Work, 80+ countries | WhatsApp per listing, **"Book a Viewing"** |
| **Driven Properties** | "Find the Perfect Property with the Best Agency in Dubai" | **25+ spoken** | None | None | Area guides, Tier-1 City Index | Forbes Global Properties member, 750+ agents, 6+6 offices | Not seen |
| **haus & haus** | "Thinking about investing in Dubai?" | EN | None | None | **Investment Playbook** lead magnet | 289 experts, 100+ communities | Not seen |
| **Espace** | "Dubai's award-winning agency" | EN | None | (Knowledge Centre) | Off-plan section | 4.7★ Google, PF awards since 2014 | WhatsApp in header |
| **Exclusive Links** | "Sometimes the best advice is wait" | Flag icon | None | None | Off-plan section | 4/5 from 400 reviews | WhatsApp |
| **Unique Properties** | Luxury | — | **"AIR" platform**: AIR Brain (Dubai real estate LLM), AIR Match (lifestyle/emotional matching) | — | — | — | — |
| **Buildcaps (today)** | "Build Wealth With Buildcaps!" | EN | None | None | Stale listings ("1 year ago") | 15+ yrs, no ORN shown, generic reviews | Form, WhatsApp number |

### What every serious broker has (table stakes)
- Buy / Rent / Off-plan / Sell navigation
- Area (community) guides
- Developer pages
- Quarterly market reports as a gated lead magnet ("Q2 2026 report", "Investment Playbook", "Market memo")
- "List your property" and "Book a valuation" CTAs
- WhatsApp everywhere
- Newsletter or property alerts
- Google review count shown prominently
- Awards
- RERA ORN on the page
- Mortgage calculator
- Off-plan payment-plan display

### Where brokers are weak, which is Buildcaps' opening
1. **Almost no real AI.** Only Provident (a quiz) and Unique Properties (AIR) attempt it. The AI arms race is happening on the **portals**, not at the brokers.
2. **No proper booking.** Only Provident has "Book a Viewing". Nobody has a branded, calendar-backed, timezone-aware booking flow.
3. **Multilingual is shallow.** AX Capital claims 30+ languages and fäm runs a separate RU site. Nobody does true RTL across Arabic, Urdu and Persian.
4. **Transparency is claimed, not shown.** No broker shows evidence of construction progress or developer delivery track records. Driven publishes a *guide* to Trakheesi QR checks but doesn't put the QR front and centre.
5. **Motion and design are generic.** They're WordPress or Elementor-style template sites, and the Katachi-level craft is absent everywhere.

---

## 2. Portals and global leaders: the AI bar

| Platform | AI shipped (2025–2026) |
|---|---|
| **Property Finder** (UAE) | SuperAgent (AI agent ranking, 4,000+ agents); **Data Guru** (transactions, price map, community insights, rent-vs-buy); **AI avatars** for agents (+1,000% seller leads); building "agentic AI" next |
| **Bayut** (UAE) | **AI Search**, conversational and launched Sept 2026; **TruEstimate** AI valuation (500k+ valuations, DLD data); **TruCheck** (computer-vision listing verification); **app inside ChatGPT** (June 2026) |
| **Zillow** | **AI mode**: conversational search across the whole journey, search by commute, affordability and schools; ChatGPT app |
| **Redfin** | Conversational search: users view about 2× more homes and are **47% more likely to request tours**; ChatGPT app |
| **Rightmove** | On-site conversational search beta, AI Keywords, **"Style with AI"** (visualise a property's potential), ChatGPT app |
| **Compass** | AI Assistant for agents (listing copy, showing scheduling, buyer-likelihood prediction) |
| **realttyAI / OffPlanSimulator** (Dubai startups) | Off-plan AI reports: developer reliability score, construction risk rating, **payment-plan cash-flow analysis**, ROI/EMI calculators |
| **Housebell** (Singapore) | 3D development model: unit position, spacing, **sunlight simulation** |

**Takeaway:** conversational search, AI valuation and an "app inside ChatGPT" are now **table stakes on portals**, but **absent at brokers**. Buildcaps should ship all three as its baseline, then go beyond them with the 10 features.

---

## 3. Novelty check on the 10 planned AI features

| # | Feature | Verdict | Closest existing | What makes ours different |
|---|---|---|---|---|
| 1 | Handover Truth Score | ⚠️ Partial | realttyAI "construction risk rating"; India RERA geo-tagged photos | **Satellite time-series evidence** plus escrow and DLD progress, shown live per project in Dubai, with a delay **probability** |
| 2 | Wealth Twin | ✅ Not found | Generic ROI calculators | Monte-Carlo **comparison against your home-country alternative**, in your currency, with Golden Visa value |
| 3 | ~~Cashflow-Fit Matcher~~ | ❌ **Replaced** | OffPlanSimulator, realttyAI already do payment-plan cash-flow | Folded into Wealth Twin as an FX-aware instalment planner. **New #3: Buyer Bloc** (below) |
| 4 | Future Skyline View | ⚠️ Partial | Housebell sunlight and spacing; pre-construction view renders | **Time-forward**: the view in 5 years given announced and master-plan projects, plus a view-loss risk score and AC cost |
| 5 | Ghost Tenant Market | ⚠️ Partial | Predictive rent and vacancy tools for property managers; academic agent-based models | **Consumer-facing, pre-purchase** simulation per unit, comparing short-let vs long-let, with an exit window |
| 6 | Family Decision Room | ✅ Not found | Generic translation tools | A multi-country family co-decision room with live translation and consensus scoring |
| 7 | Promise Ledger | ✅ Not found | Manual "check the developer" guides | Automated brochure-promise extraction and tracking that produces a "promises kept %" |
| 8 | Day-in-Your-Life | ⚠️ Partial | Zillow search by commute time | A **personalised narrated day** (rush-hour commutes, POIs, cost of living) in your language |
| 9 | Regret Radar | ⚠️ Partial | Static "if you bought in 2014" articles | Interactive counterfactuals **per listing**, plus a regret probability against same-budget alternatives |
| 10 | Portfolio Architect | ⚠️ Partial | Institutional portfolio AI (for existing owners) | A **retail, purchase-stage** allocator that splits a budget into a diversified multi-unit Dubai portfolio |

### New #3: Buyer Bloc (collective allocation)
AI groups compatible investors from different countries into a buying bloc for the same launch. The investors are matched on budget, unit type and timeline. A live bar shows progress, e.g. "7 of 10 units committed. Bloc pricing unlocks at 10". Buildcaps negotiates a block allocation and better pricing or payment terms with the developer. Each buyer keeps their own unit and SPA.

**Why it wins:**
- It's real negotiating power, not a fake discount.
- It gives honest urgency and social proof.
- It increases deal volume per launch.

I found no Dubai broker or portal doing this.

**Constraint:** it needs developer agreements and a legal and RERA review of how blocs are advertised.

**Honesty note:** "⚠️ Partial" means part of the idea exists somewhere. The combination, and the consumer-facing Dubai execution, did not show up in any source I checked. Nobody can prove that something *has never existed in theory*. What I can say is that none of these exist at any Dubai broker today.

---

## 4. Data available to power the features

- **DLD open data (Dubai Pulse):** a transactions API with daily updates from the land registry system, history back to 1998. Also off-plan projects, licensed developers, an area and community gazetteer with coordinates, and sales, mortgage and gift transactions by area, community or project. This powers #2, #5, #9 and #10.
- **DLD Smart Rental Index 2026:** rental price data. This powers #5 and the yield figures.
- **Knight Frank:** on-time off-plan completion was **64% in 2025, up from 50% in 2024**. This is content proof for #1 and for the "off-plan risk" FAQ.

---

## 5. Audience data (validates the 10-language choice)

**2026 buyer share by nationality:**

| Nationality | Share |
|---|---|
| Indian | 20.6% |
| British | 13.3% |
| Egyptian | 12.6% |
| American | 9% |
| Pakistani | 6.9% |
| Saudi | 5.7% |
| Australian | 5.7% |
| German | 4.2% |
| French | 3.8% |
| Canadian | 3% |

Another source puts Chinese buyers at 14% of international activity. The average Indian buyer spends AED 1.8M, mainly in Business Bay, JVC and Dubai Marina.

**How our languages cover them:**
- **EN:** UK, US, Australia, Canada, India
- **AR:** Egypt, Saudi Arabia
- **UR:** Pakistan
- **HI:** India
- **DE, FR:** Germany, France
- **ZH:** China
- **RU:** Russia and CIS
- **IT, FA:** secondary markets

---

## 6. Strategic conclusions feeding M2 (content) and M5 (build)

1. **Own "transparency you can see".** Put the Trakheesi QR, ORN and BRN on every listing and show delivery evidence. No competitor does this visibly.
2. **Lead with investment outcomes, not "find your home".** Every competitor says "home". AX Capital is the only one leading with "invest", and it has no tools to back that up.
3. **Make booking the hero conversion.** Competitors stop at forms. Our flow books a real calendar slot in the visitor's timezone.
4. **Ship portal-grade AI at broker level:**
   - Conversational search
   - AI valuation estimate
   - Concierge
   - A "Buildcaps in ChatGPT and Claude" connector, which no broker has
5. **Lead magnets matter.** Every top broker gates a report. We gate the "2026 Dubai Investor Guide" and quarterly reports in all 10 languages, which nobody else offers.
6. **Social proof at scale:** a live Google reviews count and verified, named reviews by country. This replaces Buildcaps' current generic testimonials.

---

## Sources
- AX Capital: https://www.axcapital.ae/
- Betterhomes: https://www.bhomes.com/
- Allsopp & Allsopp: https://www.allsoppandallsopp.com/
- fäm Properties: https://famproperties.com/
- Provident: https://www.providentestate.com/
- Espace: https://www.espace.ae/
- Exclusive Links: https://www.exclusive-links.com/
- Driven Properties: https://www.drivenproperties.com/
- haus & haus: https://www.hausandhaus.com/
- Unique Properties AIR: https://uniqueproperties.ae/en/blog/revolutionizing-real-estate-how-unique-properties-ai-platform-is-set-to-transform-the-uae-market
- Property Finder SuperAgent: https://www.propertyfinder.com/news/property-finder-launches-superagent-menas-first-ai-driven-ranking-system-for-agents/
- Property Finder AI avatars: https://campaignme.com/property-finder-drives-1000-surge-in-daily-leads-with-ai-avatars-for-superagents/
- Property Finder AI strategy: https://www.agbi.com/analysis/real-estate/2026/02/property-finders-job-listings-reveal-its-ai-strategy/
- Bayut AI Search: https://www.thenationalnews.com/advertorial/2026/09/28/bayut-expands-conversational-property-discovery-with-new-ai-search/
- Bayut features: https://www.bayut.com/mybayut/bayut-features/
- Zillow AI mode: https://www.zillow.com/news/how-zillows-new-ai-mode-works-throughout-the-real-estate-journey/
- Redfin conversational search: https://nationalmortgageprofessional.com/news/redfin-unveils-conversational-ai-driven-home-search-tool
- Compass AI Assistant: https://www.realestatenews.com/2026/07/21/compass-unveils-ai-assistant-brokerage-comparison-tool-launches
- Rightmove AI: https://propertyindustryeye.com/rightmove-unveils-new-ai-initiative-to-support-estate-agents/
- realttyAI: https://realtty.ai/blogs/off-plan-properties-dubai-ai-investment-guide
- OffPlanSimulator: https://www.offplansimulator.com/
- Housebell: https://www.manilatimes.net/2026/09/24/tmt-newswire/pr-newswire/beyond-floor-plans-housebell-brings-3d-development-models-to-singapore-homebuyers/2431951
- DLD transactions open API: https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open-api
- DLD API gateway: https://dubailand.gov.ae/en/eservices/api-gateway/
- Off-plan delivery data (Knight Frank cited): https://www.bhomes.com/en/blog/definitive-guides/off-plan-vs-ready-property-in-dubai-2026
- Buyer nationalities: https://www.khaleejtimes.com/business/indian-uk-egyptian-investors-top-dubai-property-buyers-in-2026
- Chinese buyer share: https://uniqueproperties.ae/en/blog/top-nationality-buyers-in-dubai-whos-driving-the-market-in-2026
