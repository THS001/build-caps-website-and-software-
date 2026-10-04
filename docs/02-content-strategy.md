# 02 — Content Strategy & Messaging

The approved copy itself lives in `messages/en.json`, which is the single source for all 10 languages. This document is the strategy behind it.
It builds on `01-competitor-research.md`.

---

## 1. Brand platform

**Positioning statement**
For global investors who want Dubai's returns without Dubai's guesswork, Buildcaps is the data-led property partner. It shows you the numbers behind every deal, gets you into the best off-plan launches early, and completes your purchase remotely, in your language.

**Brand idea:** *Dubai, decoded.*
**Promise:** *Building your wealth.* This is the existing tagline, which keeps brand equity.
**Primary hero line:** *Build wealth in the world's most tax-efficient skyline.*
**Alternate lines** for the A/B test in M9: *Dubai, decoded. Invest with data, not guesswork.* / *Own a piece of Dubai's next chapter.*

### Why this position wins (from the research)
| Competitor pattern | Buildcaps counter-position |
|---|---|
| "Find your home" (Betterhomes, Allsopp, Provident, fäm) | **Invest and build wealth.** We're for investors, not house-hunters. |
| "Trust us": transparency is claimed | **Check us yourself.** Permit QR, ORN/BRN, DLD data and delivery evidence on every page. |
| Forms, then a callback "soon" | **Book a real slot now,** in your timezone, with an advisor who speaks your language. |
| AI only on the portals | **Portal-grade AI plus 10 exclusives**, at a broker that also closes the deal. |

---

## 2. Voice & tone

| We are | We are not |
|---|---|
| **Precise:** numbers, sources, dates | Hype: "unbelievable", "once in a lifetime", "guaranteed" |
| **Calm and confident:** like a private banker | Pushy: "Hurry!!", fake countdown timers |
| **Warm and personal:** "your advisor", "your family" | Corporate: "our esteemed clientele" |
| **Global:** plain English that translates cleanly | Idioms that break in translation ("hit it out of the park") |

**Writing rules**
1. Lead with the outcome, then the proof, then the action.
2. Headlines are 9 words or fewer. Body sentences are 22 words or fewer.
3. Every number says where it comes from or is labelled as an estimate.
4. Use one price format everywhere: **AED 1.81M**, **AED 950K**. Show converted currencies as "≈ USD 493K".
5. Areas are in **sq ft** by default, with sq m available through the toggle. Never write "Residential Apartments" or "No. of Units" where a size belongs.
6. Listing status is `Off-plan · Handover Q4 2027` or `Ready`. Never use relative dates like "1 year ago".
7. Proper nouns are never translated: project names, developer names, Golden Visa, DLD, RERA, Trakheesi.
8. **Compliance:** no guaranteed returns. Yields and ROI are "estimated" or "typical", with a source. Every listing shows a permit number. All AI output carries a "not financial advice" disclaimer.

---

## 3. Audiences (personas)

| Persona | Share and markets | Goals | Fears and objections | Message that converts | Main CTA |
|---|---|---|---|---|---|
| **1. Global Yield Investor** | India (20.6%), UK (13.3%), US, Australia, Canada · EN / HI | Yield, capital growth, diversification away from the home market | Off-plan delays, buying remotely, hidden fees, currency | "Earn typical 6–8% tax-free yields, with every number shown." | Strategy call, ROI tool |
| **2. Gulf & MENA Family Buyer** | Egypt (12.6%), Saudi (5.7%) · AR | Safe store of value, a family home or second home, prestige | Developer reliability, family consensus | "Trusted developers, evidence of delivery, a decision your whole family can make together." | Family Decision Room, office visit |
| **3. Pakistani / South Asian Investor** | Pakistan (6.9%) · UR / EN | Long-term asset, a family base, the Golden Visa | Paperwork, legitimacy, transferring funds | "Fully regulated, escrow-protected, guided in Urdu from first call to keys." | WhatsApp, strategy call |
| **4. European & CIS Wealth Holder** | DE, FR, IT, RU · and Iran (FA) | Tax efficiency, a safe-haven asset, residency | Legal certainty, liquidity, exit | "Tax-free income, a USD-pegged currency, a 10-year Golden Visa from AED 2M." | Golden Visa check, investor guide |
| **5. Chinese Investor** | ZH | Growth markets, flagship branded residences | Trust, language, remote management | "Mandarin-speaking advisory, verified listings, management after handover." | Investor guide (ZH), video call |
| **6. Dubai Owner (Seller / Landlord)** | Local · EN / AR | Best price, speed, a reliable tenant | Under-valuation, vacancy | "Know your property's real value from DLD data, then sell or let with global reach." | Free valuation |

---

## 4. Message pillars → proof → where they appear

| Pillar | Headline idea | Proof assets | Main pages |
|---|---|---|---|
| **Transparency** | "Every number, shown." | Trakheesi QR and permit on listings; ORN/BRN in footer and team pages; DLD-backed estimates; Promise Ledger; Handover Truth Score | Home, listing, about, off-plan |
| **Access** | "First in line for Dubai's best launches." | Developer partner logos (Emaar, DAMAC, Sobha, BNW…); launch allocations; Buyer Bloc | Home, off-plan, opportunities, developers |
| **Returns** | "Tax-free income. A USD-pegged currency." | Calculators; Wealth Twin; Regret Radar; case studies | Home, invest, tools, listing |
| **Global, personal** | "Your language. Your timezone. Your advisor." | 10 languages; advisor language badges; booking in your timezone; remote purchase process | Home, team, book, contact |

---

## 5. Conversion architecture

```
AWARENESS (SEO, social, portals)  → insights posts, area guides, market data room, AI tools (free value)
CONSIDERATION                     → listing pages, calculators, Wealth Twin, investor guide (gated: email)
DECISION                          → Book a strategy call / viewing (primary) · WhatsApp (persistent) · Opportunities funnels
RETENTION / REFERRAL              → handover updates, property management, Advisor Score reviews, referral offer
```

- **Primary CTA everywhere:** *Book a free strategy call*. It opens the booking flow, pre-filled from wherever the visitor came from.
- **Secondary:** *Get the 2026 Dubai Investor Guide*. Asks for email, language and country, and sends the guide as a PDF in their language.
- **Persistent:** a WhatsApp bubble, plus the Concierge chat bubble.
- **Micro-CTAs:** *Check my Golden Visa eligibility* · *Estimate my returns* · *Value my property*.
- **Social proof next to every primary CTA:** Google rating and count, plus "Advisors speak 10 languages".

---

## 6. Page-by-page content blueprint

Section order per page. The copy for each one is in `messages/en.json` under the namespace shown in brackets.

| Page | Section order |
|---|---|
| **Home** [`home`] | Hero (headline, sub, 2 CTAs, 3-fact strip) → Ask Buildcaps search → Featured properties → **Opportunities** (funnels) → "Why Dubai" pinned scroll story (Rise of Dubai) → Communities strip → AI tools showcase → Proof (developers, awards, reviews) → How buying remotely works (4 steps) → Insights → Final CTA band |
| **Properties** [`properties`] | Title + Ask Buildcaps → filters → grid/map → empty state → lead magnet |
| **Property detail** [`property`] | Gallery → key facts → price + currency → payment plan → AI panels → location and lifestyle → permit QR → advisor card + book |
| **Opportunities** [`opportunities`] | Intro → funnel cards (flip) → disclaimer |
| **Off-plan** [`offPlan`] | Why off-plan → launches pinned horizontal scroll → how escrow protects you → developer track records |
| **Communities** [`communities`] | Map + cards → guide template (overview, yields, schools, lifestyle, listings) |
| **Developers** [`developers`] | Logos grid → profile template (track record, projects, promises kept) |
| **Invest** [`invest`] | Why Dubai (6 reasons) → Golden Visa → taxes → buying remotely → financing → FAQ excerpt → CTA |
| **Tools** [`tools`] | Calculators and AI tools grid |
| **Services** [`services`] | Buy · Sell · Rent · Property management · Mortgage · Valuation (shared template: promise, how it works, CTA) |
| **About / Team** [`about`, `team`] | Story → mission, vision, values → CEO letter → Sales Director letter → team grid → awards → CTA |
| **Careers / Awards / FAQ** [`careers`, `awards`, `faq`] | — |
| **Insights / Reports** [`insights`, `reports`] | Featured post, categories, newsletter; gated reports |
| **Book** [`booking`] | 6-step wizard and confirmation |
| **Contact** [`contact`] | Office, map, channels, form |
| **Shared** [`nav`, `footer`, `common`, `ai`, `leadMagnet`, `cookie`, `notFound`] | — |

---

## 7. Fixes carried over from the buildcaps.com audit
| Old | New |
|---|---|
| "Buildc taps", "Newletter", "Message From CEO'S" | Corrected in the rewritten letters |
| "People First" listed twice in the CEO values | Three distinct values: People first · Excellence always · Innovation & growth |
| "Senior Property Advisory" | Senior Property Advisor |
| Inquiry option "Miss" | Removed; options are Buy, Rent, Sell, Valuation, Mortgage, Golden Visa, General |
| USD budget filter on AED listings | AED budget filter with a currency toggle |
| "AED 2.3 Mn." / "AED 1m" / "AED 1.81m" | AED 2.3M · AED 1M · AED 1.81M |
| "For Rent Off-plan" on one listing | Status rules: off-plan listings can't be "For rent" |
| "1 year ago" | Status plus handover quarter |
| Generic testimonials | Verified Google reviews, named by country; current testimonials kept only if the client confirms they're real |

---

## 8. Facts used in the copy (the client must confirm before launch)

**General market facts.** These are standard and widely published, but should still be confirmed by the client or legal:
- **Freehold:** foreigners can own freehold in designated areas (since 2002).
- **Escrow:** off-plan payments go into escrow accounts (Law No. 8 of 2007).
- **Golden Visa:** 10-year visa from AED 2M of property.
- **Tax:** no personal income tax on rental income and no capital gains tax for individuals.
- **Currency:** the AED is pegged to the USD at 3.6725.
- **Fees:** DLD transfer fee of 4%.
- **Mortgages:** non-residents can typically borrow 50–60% of the value.
- **Yields:** typical gross yields of 6–8%, varying by area.
- **Delivery:** off-plan on-time completion was 64% in 2025 (Knight Frank).

**Buildcaps-specific. Needed from the client** (the site hides these blocks until provided):
- Number of deals
- AED transacted
- Countries served
- Google rating and count
- Awards list
- ORN
- BRNs per advisor
- Languages each advisor speaks
- Developer partnerships (logos permission)
- Fee policy (for example "no buyer fee on off-plan"; needs confirmation)
- Which services are actually offered (property management? mortgage partner?)

**Legal pages** (privacy, terms, cookies) are structured placeholders and need review by a UAE lawyer, covering PDPL and GDPR.

---

## 9. SEO content plan (feeds the M9 agent)

**Pillar pages**, one per language:
- Buy property in Dubai
- Off-plan Dubai
- Golden Visa through property
- Dubai rental yields
- Each community guide
- Each developer profile

**Clusters:**
- Off-plan: payment plans · escrow · assignment (selling before handover) · developer comparisons
- Investing from your country: "Buying Dubai property from India / the UK / Pakistan / Egypt / Germany / China"
- Data: monthly DLD transaction recaps per community

**Cadence:**
- Two posts a week, in EN first
- Automatic translation drafts into all 9 other languages, with native review for AR, UR and FA
- A monthly data post per top-10 community
- A quarterly market report (gated)
