<p align="center">
  <img src=".github/assets/hero.svg" alt="Buildcaps — Dubai property, decoded" width="100%">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15.5-b76e79?style=for-the-badge&logo=nextdotjs&logoColor=white&labelColor=00173f" alt="Next.js 15.5">
  <img src="https://img.shields.io/badge/React-19-b76e79?style=for-the-badge&logo=react&logoColor=white&labelColor=00173f" alt="React 19">
  <img src="https://img.shields.io/badge/TypeScript-strict-b76e79?style=for-the-badge&logo=typescript&logoColor=white&labelColor=00173f" alt="TypeScript strict">
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20RLS-b76e79?style=for-the-badge&logo=supabase&logoColor=white&labelColor=00173f" alt="Supabase">
  <img src="https://img.shields.io/badge/Tailwind-4-b76e79?style=for-the-badge&logo=tailwindcss&logoColor=white&labelColor=00173f" alt="Tailwind CSS 4">
  <br>
  <img src="https://img.shields.io/badge/Anthropic-API-b76e79?style=for-the-badge&logo=anthropic&logoColor=white&labelColor=00173f" alt="Anthropic API">
  <img src="https://img.shields.io/badge/Vercel-Frankfurt-b76e79?style=for-the-badge&logo=vercel&logoColor=white&labelColor=00173f" alt="Vercel, Frankfurt">
  <img src="https://img.shields.io/badge/Languages-10%20%C2%B7%20RTL-b76e79?style=for-the-badge&logo=googletranslate&logoColor=white&labelColor=00173f" alt="10 languages with RTL">
  <img src="https://img.shields.io/badge/MapLibre-OpenFreeMap-b76e79?style=for-the-badge&logo=maplibre&logoColor=white&labelColor=00173f" alt="MapLibre and OpenFreeMap">
  <img src="https://img.shields.io/badge/Three.js-3D-b76e79?style=for-the-badge&logo=threedotjs&logoColor=white&labelColor=00173f" alt="Three.js">
</p>

<p align="center">
  <b>The investment platform behind <a href="https://buildcaps.vercel.app">Buildcaps Real Estate</a>.</b><br>
  A multilingual Dubai property site, an AI intelligence suite and a complete sales back office:<br>
  listings, off-plan projects, market data, an own booking calendar and a CRM, in one codebase.
</p>

<p align="center">
  <a href="#-at-a-glance"><b>At a glance</b></a> ·
  <a href="#-platform-map"><b>Platform map</b></a> ·
  <a href="#-intelligence-suite"><b>Intelligence</b></a> ·
  <a href="#-architecture"><b>Architecture</b></a> ·
  <a href="#-data-model"><b>Data model</b></a> ·
  <a href="#-security"><b>Security</b></a> ·
  <a href="#-languages"><b>Languages</b></a> ·
  <a href="#-getting-started"><b>Getting started</b></a>
</p>

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ At a glance

<p align="center">
  <img src=".github/assets/metrics.svg" alt="10 languages, 33 page templates, 46 admin screens, 13 AI tools, 8 AI agents, 34 database tables, 67 security policies, 1,506 interface strings" width="100%">
</p>

Buildcaps turns Dubai's open property data into decisions. Visitors search in their own language and see each listing with its DLD permit, payment plan and numbers. They can test it against their own finances with the AI tools, then book a meeting in a few clicks. The team runs the whole business from the admin: content, market data, bookings, the sales pipeline and the AI agents.

<p align="center">
  <img src=".github/assets/journey.svg" alt="The investor journey: discover, understand, decide, book, own" width="100%">
</p>

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Platform map

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "primaryColor": "#00173f", "primaryTextColor": "#ffffff", "primaryBorderColor": "#b76e79", "lineColor": "#b76e79", "cScale0": "#00173f", "cScale1": "#b76e79", "cScale2": "#2f5f9e", "cScale3": "#8f4f5a", "cScale4": "#004274", "cScale5": "#d4a1a8", "cScale6": "#4a78b5", "cScaleLabel0": "#ffffff", "cScaleLabel1": "#ffffff", "cScaleLabel2": "#ffffff", "cScaleLabel3": "#ffffff", "cScaleLabel4": "#ffffff", "cScaleLabel5": "#00173f", "cScaleLabel6": "#ffffff"}}}%%
mindmap
  root((BUILDCAPS))
    Public site
      33 page templates
      Properties and off-plan
      Communities and developers
      Insights and market reports
      Booking and self-service
    Intelligence suite
      13 AI tools
      6 calculators
      Ask Buildcaps search
      Lifestyle filters
    AI agents
      Concierge
      Listing Ops
      Market Intel
      Lead Nurture
      Advisor Copilot
      SEO Growth
      Translation QA
    Sales back office
      CRM pipeline
      Own booking calendar
      Availability and feeds
      Team and advisor score
    Content studio
      Listings and projects
      Track record
      Market data import
      Portal XML feeds
    Platform
      10 languages with RTL
      Postgres with RLS
      Vercel edge in Frankfurt
```

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ What's inside

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🏙️ Public experience</h3>
      <ul>
        <li><b>Properties and off-plan:</b> every listing with its DLD (Trakheesi) permit, payment plan, yield and surroundings</li>
        <li><b>Communities and developers:</b> prices, yields, schools and transport, plus each developer's verified track record</li>
        <li><b>Ask Buildcaps:</b> natural-language search such as "2-bed near a British school under 2M"</li>
        <li><b>Lifestyle filters:</b> real drive times, schools, metro and monthly cost</li>
        <li><b>Booking:</b> a timezone-aware booking flow, with self-service reschedule and cancel</li>
        <li><b>Insights, market reports and the investor guide</b></li>
      </ul>
    </td>
    <td width="50%" valign="top">
      <h3>🗂️ Sales back office</h3>
      <ul>
        <li><b>CRM:</b> one contact per person. Every enquiry and booking files itself; a drag-and-drop pipeline, tasks, a timeline and CSV export</li>
        <li><b>Own booking calendar:</b> a week view per advisor; staff bookings, reschedule and reassign, all with clash checks</li>
        <li><b>Availability:</b> weekly hours, time off, booking rules and private iCal feeds</li>
        <li><b>Video calls:</b> each advisor's own Zoom, Teams or Meet room, or a free Jitsi room</li>
        <li><b>Content studio:</b> listings, projects, communities, opportunities, articles, reports and careers</li>
        <li><b>Roles:</b> admin, editor and advisor, enforced in the database</li>
      </ul>
    </td>
  </tr>
</table>

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Intelligence suite

Thirteen AI tools turn open data into answers. Each one runs on Dubai Land Department transactions, OpenStreetMap and our own models, and the AI explains each result in the visitor's language.

| | Tool | What it does |
|:-:|---|---|
| 📈 | **Buildcaps Estimate** | An instant value range for any Dubai property, from DLD transactions |
| 🗺️ | **Dubai Data Room** | Price maps, transactions and community insights, updated from DLD data |
| 🎯 | **Match Me** | Six questions. Your best-fit properties, each with the reason why |
| 💹 | **Wealth Twin** | Your net worth in 5, 10 and 20 years: Dubai versus keeping your money at home |
| 🧭 | **Regret Radar** | What past buyers earned here, and which option you're least likely to regret |
| 🏗️ | **Portfolio Architect** | Splits a budget into a diversified Dubai portfolio balancing growth and income |
| 🚗 | **Day in Your Life** | Your real commute, school run and weekend from any address, in your language |
| 👨‍👩‍👧 | **Family Decision Room** | Decide together from different countries, with live translation and one shortlist |
| 📜 | **Promise Ledger** | What developers promised in their brochures, and what they actually delivered |
| ⏱️ | **Handover Truth Score** | How likely an off-plan project is to hand over on time |
| 👻 | **Ghost Tenant Market** | A simulated market of tenants and buyers predicts rent, vacancy and the best time to sell |
| 🌆 | **Future Skyline View** | Your view today, and in five years once announced towers are built (Three.js + sun path) |
| 🤝 | **Buyer Bloc** | Investors worldwide join forces for block pricing on a new launch |

Six classic calculators cover the rest, with no AI cost: **ROI**, **mortgage**, **payment plan**, **buying costs**, **Golden Visa eligibility** and **currency**.

### Agents that do the work

| Agent | Trigger | What it does | Human control |
|---|---|---|---|
| **Concierge** | Chat or voice on any page | Searches listings, works out costs, checks free slots and hands over a booking link or a WhatsApp brief | The visitor confirms in the booking flow |
| **Listing Ops** | Brochure PDF upload | Reads the brochure and drafts the listing in 10 languages, with keywords and payment plan | Saved as an unpublished draft |
| **Market Intel** | Weekly, and on demand | Refreshes community figures from DLD data and drafts the market note | Posts need approval |
| **Lead Nurture** | New enquiry | Scores the lead and drafts a personal follow-up | An advisor sends it |
| **Advisor Copilot** | Before and after each meeting | Writes the pre-meeting brief, then the summary, tasks and follow-up | The advisor edits |
| **Verified Listing** | On request | Checks listing photos for duplicates, watermarks and mismatches | An editor confirms the badge |
| **SEO Growth** | Weekly | Proposes title, description, FAQ and internal-link changes from Search Console data | Low-risk changes go live with rollback; content needs approval |
| **Translation QA** | On publish | Compares each translation with the English and checks numbers, dates and brand names | Flags only |

Every agent run is logged. AI assistants such as ChatGPT can search listings, check free slots and get a booking link through the Buildcaps **MCP server** (`/api/mcp`).

### Parity with the region's leading portals

| Leading portals offer | Buildcaps answer |
|---|---|
| Bayut **TruEstimate** | **Buildcaps Estimate**: a value range from DLD comparables, explained in plain words |
| Bayut **TruCheck** | **Verified Listing**: an AI photo check plus an advisor's confirmation |
| Property Finder **Data Guru** | **Dubai Data Room**: price map, community insights and transactions |
| Property Finder **SuperAgent** | **Advisor Score**: response time, show rate, verified reviews and deals |
| Zillow commute and school search | **Lifestyle filters**: real drive times, schools and monthly cost |
| Portal apps inside AI assistants | **MCP connector**: search, listing details, costs and booking links for AI assistants |
| Compass AI assistant for agents | **Advisor Copilot**: briefs, summaries, follow-ups and lead scores |

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Architecture

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "primaryColor": "#00173f", "primaryTextColor": "#ffffff", "primaryBorderColor": "#b76e79", "lineColor": "#b76e79", "clusterBkg": "#f6e9eb", "clusterBorder": "#d4a1a8", "titleColor": "#00173f", "edgeLabelBackground": "#f0ede7"}}}%%
flowchart LR
    subgraph C["Clients"]
        BR["Browser<br/>10 languages · RTL"]
        AS["AI assistants<br/>MCP"]
        PO["Property portals<br/>XML feeds"]
    end
    subgraph E["Vercel edge · Frankfurt"]
        MW["Middleware<br/>locale routing · staff session refresh"]
    end
    subgraph A["Next.js 15 App Router"]
        RSC["Server components<br/>cached by content tag"]
        ACT["Server actions<br/>validated with Zod"]
        API["API routes<br/>concierge · search · iCal · feeds · MCP"]
        CRON["Cron jobs<br/>booking · market · SEO"]
    end
    subgraph S["Supabase"]
        PG[("Postgres<br/>34 tables · 67 RLS policies")]
        AUTH["Auth<br/>staff roles"]
        STO["Storage<br/>media · private documents"]
        RT["Realtime<br/>Family Decision Room"]
    end
    subgraph X["Services"]
        LLM["Anthropic API<br/>tool use · structured output"]
        GEO["OpenFreeMap · OSRM<br/>Overpass · Nominatim"]
        DLD["Dubai Pulse<br/>DLD open data"]
        MSG["Email · WhatsApp<br/>Turnstile"]
    end
    BR --> MW --> RSC
    MW --> ACT
    AS --> API
    PO --> API
    RSC --> PG
    ACT --> PG
    ACT --> AUTH
    ACT --> STO
    API --> PG
    CRON --> PG
    BR -.-> RT
    ACT --> LLM
    API --> LLM
    CRON --> LLM
    ACT --> GEO
    BR -.-> GEO
    CRON --> DLD
    ACT --> MSG
```

**Design principles**

- **Database-enforced security.** Every staff write runs as the signed-in user, so row-level security enforces their role even if someone bypasses the UI. The service key is used only on the server, for work no session should do directly.
- **Atomic bookings.** `book_appointment()` takes a per-advisor advisory lock, then checks bookings (with buffer) and time off in a single transaction. Double bookings can't happen.
- **Errors staff can act on.** Server actions return their errors instead of throwing, so production builds show "That advisor is busy at that time" instead of a generic failure.
- **Free and open data first.** The maps, routing, places and market data are open. The Anthropic API is the only paid AI service.

### How a booking works

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "actorBkg": "#00173f", "actorBorder": "#b76e79", "actorTextColor": "#ffffff", "actorLineColor": "#d4a1a8", "signalColor": "#b76e79", "signalTextColor": "#b76e79", "labelBoxBkgColor": "#00173f", "labelTextColor": "#ffffff", "loopTextColor": "#b76e79", "noteBkgColor": "#f6e9eb", "noteTextColor": "#00173f", "noteBorderColor": "#d4a1a8", "sequenceNumberColor": "#ffffff", "activationBkgColor": "#004274", "activationBorderColor": "#b76e79"}}}%%
sequenceDiagram
    autonumber
    actor V as Visitor
    participant W as Booking wizard
    participant S as Server action
    participant DB as Postgres
    participant N as Notifications
    V->>W: Purpose, meeting type and language
    W->>S: Free slots for a day
    S->>DB: agent_busy for each matching advisor
    DB-->>S: Bookings with buffer, and time off
    S-->>W: Free slots in the visitor's timezone
    V->>W: Confirms a slot
    W->>S: createBooking
    Note over S: Turnstile check and rate limit
    S->>DB: book_appointment with advisory lock
    DB-->>S: Appointment with reference and manage token
    S->>DB: Meeting link, the advisor's room or Jitsi
    S->>N: Email with .ics invite, team alert, WhatsApp
    S-->>V: Reference and self-service link
```

### Sales pipeline

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "primaryColor": "#00173f", "primaryTextColor": "#ffffff", "primaryBorderColor": "#b76e79", "lineColor": "#b76e79", "transitionColor": "#b76e79", "transitionLabelColor": "#00173f", "stateLabelColor": "#ffffff", "labelColor": "#ffffff", "edgeLabelBackground": "#f0ede7", "labelBackgroundColor": "#f0ede7"}}}%%
stateDiagram-v2
    direction LR
    [*] --> New: enquiry, booking or manual entry
    New --> Contacted: first call, email or WhatsApp
    Contacted --> Qualified
    Qualified --> Meeting
    Meeting --> Negotiation
    Negotiation --> Won
    Negotiation --> Lost
    Won --> [*]
```

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Data model

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "primaryColor": "#00173f", "primaryTextColor": "#ffffff", "primaryBorderColor": "#b76e79", "lineColor": "#b76e79", "textColor": "#b76e79", "attributeBackgroundColorOdd": "#0b2a5c", "attributeBackgroundColorEven": "#00173f", "relationColor": "#b76e79", "relationLabelBackground": "#f0ede7", "relationLabelColor": "#00173f", "edgeLabelBackground": "#f0ede7", "tertiaryColor": "#f0ede7"}}}%%
erDiagram
    COMMUNITIES ||--o{ PROJECTS : contains
    DEVELOPERS ||--o{ PROJECTS : builds
    COMMUNITIES ||--o{ PROPERTIES : locates
    PROJECTS ||--o{ PROPERTIES : "has units"
    AGENTS ||--o{ PROPERTIES : lists
    DEVELOPERS ||--o{ DEVELOPER_PROMISES : promised
    PROJECTS ||--o{ PROJECT_PROGRESS : "construction readings"
    AGENTS ||--o{ APPOINTMENTS : takes
    AGENTS ||--o{ AGENT_HOURS : works
    AGENTS ||--o{ ADVISOR_REVIEWS : earns
    CONTACTS ||--o{ APPOINTMENTS : books
    CONTACTS ||--o{ LEADS : sends
    CONTACTS ||--o{ CONTACT_ACTIVITIES : timeline
    CONTACTS ||--o{ CONTACT_TASKS : "follow-ups"
    PROPERTIES {
        uuid id PK
        text slug
        text permit "DLD Trakheesi"
        bigint price_aed
        jsonb payment_plan
        boolean published
    }
    APPOINTMENTS {
        uuid id PK
        text reference
        text agent_slug FK
        timestamptz starts_at
        text mode
        text meeting_url
    }
    CONTACTS {
        uuid id PK
        text email
        crm_stage stage
        text owner FK
        int score
    }
    AGENTS {
        text slug PK
        text name
        text email "staff only"
        text meeting_url "staff only"
        jsonb score
    }
```

Nine migrations define 34 tables, 23 SQL functions and 67 row-level security policies. Content is stored as localized JSON (`{"en": …, "ar": …}`), so one row serves all ten languages.

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Security

| Capability | Visitor | Advisor | Editor | Admin |
|---|:-:|:-:|:-:|:-:|
| Read published content | ✅ | ✅ | ✅ | ✅ |
| Send an enquiry or book a meeting | ✅ | ✅ | ✅ | ✅ |
| Read drafts, contacts and bookings | — | ✅ | ✅ | ✅ |
| Update contacts and appointments | — | ✅ | ✅ | ✅ |
| Create and edit listings and content | — | — | ✅ | ✅ |
| Delete, publish SEO changes, manage staff | — | — | — | ✅ |

- **Row-level security on every table.** Visitors can create enquiries but never read them back.
- **Column-level privacy.** Visitors can't see advisors' email addresses or meeting links.
- **Staff-only admin.** Staff accounts are created by an admin, accounts without a staff role get no access, and the last admin can't be removed.
- **Hardened edge.** Strict Content-Security-Policy, HSTS, `frame-ancestors 'none'`, Cloudflare Turnstile and rate limits on public forms.
- **Compliance by design.** A listing can't be saved without a DLD permit, and an off-plan unit can't be listed for rent.

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Languages

| Language | Code | Direction | Interface coverage |
|---|:-:|:-:|---|
| English | `en` | LTR | `▰▰▰▰▰▰▰▰▰▰` 100% · 1,506 strings |
| العربية | `ar` | **RTL** | `▰▰▰▰▰▰▰▰▰▱` 96% |
| Русский | `ru` | LTR | `▰▰▰▰▰▰▰▰▰▱` 96% |
| 中文 | `zh` | LTR | `▰▰▰▰▰▰▰▰▰▱` 96% |
| हिन्दी | `hi` | LTR | `▰▰▰▰▰▰▰▰▰▱` 96% |
| Français | `fr` | LTR | `▰▰▰▰▰▰▰▰▰▱` 96% |
| Deutsch | `de` | LTR | `▰▰▰▰▰▰▰▰▰▱` 96% |
| Italiano | `it` | LTR | `▰▰▰▰▰▰▰▰▰▱` 96% |
| اردو | `ur` | **RTL** | `▰▰▰▰▰▰▰▰▰▱` 96% |
| فارسی | `fa` | **RTL** | `▰▰▰▰▰▰▰▰▰▱` 96% |

English stays at the root (`/properties`) so old buildcaps.com links keep working. Every other language is prefixed (`/ar/properties`), with `hreflang` alternates and fully mirrored right-to-left layouts. Strings that aren't translated yet fall back to English, and `npm run i18n:check` validates every message's ICU syntax and placeholders.

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Engineering by the numbers

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "xyChart": {"titleColor": "#b76e79", "xAxisLabelColor": "#b76e79", "yAxisLabelColor": "#b76e79", "xAxisTitleColor": "#b76e79", "yAxisTitleColor": "#b76e79", "xAxisLineColor": "#d4a1a8", "yAxisLineColor": "#d4a1a8", "xAxisTickColor": "#d4a1a8", "yAxisTickColor": "#d4a1a8", "plotColorPalette": "#b76e79"}}}}%%
xychart-beta
    title "Platform surface"
    x-axis ["Pages", "Admin", "API", "Tables", "SQL fns", "RLS", "AI tools", "Agents"]
    y-axis "Count" 0 --> 70
    bar [33, 46, 8, 34, 23, 67, 13, 8]
```

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "xyChart": {"titleColor": "#b76e79", "xAxisLabelColor": "#b76e79", "yAxisLabelColor": "#b76e79", "xAxisTitleColor": "#b76e79", "yAxisTitleColor": "#b76e79", "xAxisLineColor": "#d4a1a8", "yAxisLineColor": "#d4a1a8", "xAxisTickColor": "#d4a1a8", "yAxisTickColor": "#d4a1a8", "plotColorPalette": "#004274"}}}}%%
xychart-beta
    title "Lines of code by area"
    x-axis ["UI components", "App routes", "Libraries", "SQL", "Scripts", "Hooks + i18n"]
    y-axis "Lines" 0 --> 21000
    bar [19957, 9295, 6810, 1222, 758, 385]
```

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "pie1": "#b76e79", "pie2": "#004274", "pie3": "#d4a1a8", "pie4": "#00173f", "pieStrokeColor": "#ffffff", "pieSectionTextColor": "#ffffff", "pieTitleTextColor": "#b76e79", "pieLegendTextColor": "#b76e79", "pieOuterStrokeColor": "#d4a1a8"}}}%%
pie showData
    title Language mix
    "TypeScript" : 94.0
    "PLpgSQL" : 2.7
    "JavaScript" : 2.5
    "CSS" : 0.8
```

| | |
|---|---|
| **176** React components | **46** admin screens |
| **11** server-action modules | **8** API routes · **3** scheduled jobs |
| **20,718** lines of translations | **9** SQL migrations |

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15.5 (App Router, React Server Components, server actions) · React 19 |
| **Language** | TypeScript 5 in strict mode · Zod validation at every boundary |
| **Interface** | Tailwind CSS 4 · Radix UI primitives · Framer Motion · Lenis smooth scrolling · Lucide icons |
| **Internationalisation** | next-intl 4 · 10 locales · right-to-left layouts · localized metadata and `hreflang` |
| **Data** | Supabase: Postgres with row-level security, Auth, Storage and Realtime |
| **AI** | Anthropic API: tool use, structured outputs, PDF and image understanding · MCP server |
| **Maps and 3D** | MapLibre GL with OpenFreeMap tiles · OSRM routing · Overpass places · Three.js · suncalc |
| **Charts** | Recharts |
| **Messaging** | Email by Resend or SMTP with `.ics` invites · WhatsApp Cloud API · Web Speech API |
| **Security** | Cloudflare Turnstile · rate limiting · CSP and HSTS headers |
| **Hosting** | Vercel, Frankfurt region (`fra1`) · Vercel Cron |

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Roadmap

```mermaid
%%{init: {"theme": "base", "themeVariables": {"fontFamily": "Inter, Segoe UI, Helvetica, Arial, sans-serif", "cScale0": "#00173f", "cScale1": "#004274", "cScale2": "#b76e79", "cScale3": "#8f4f5a", "cScaleLabel0": "#ffffff", "cScaleLabel1": "#ffffff", "cScaleLabel2": "#ffffff", "cScaleLabel3": "#ffffff", "titleColor": "#b76e79", "textColor": "#b76e79", "lineColor": "#d4a1a8"}}}%%
timeline
    title From plan to production
    section Foundation
        Strategy : Competitor research : Content and copy
        Experience : 10 languages with RTL : Motion library : 33 page templates
    section Platform
        Data : Schema and RLS : Custom admin
        Sales : Own booking calendar : CRM and pipeline
    section Intelligence
        AI : 13 AI tools : 8 agents : SEO Growth Agent
    section Launch
        Live : Vercel in Frankfurt : Admin audit
        Next : Email delivery : Advisor onboarding
```

| Milestone | Scope | Status |
|---|---|:-:|
| **M0 – M5** | Setup, research, content, i18n and RTL, motion library, every page | ✅ Done |
| **M6 – M7** | Schema, admin, properties, opportunities, booking flow | ✅ Live |
| **M8 – M10** | Concierge, portal-parity AI, agents, SEO agent, the 13 AI tools | ✅ Built |
| **M11** | Compliance, redirects, analytics, performance, deployment | 🟡 In progress |
| **M12 – M13** | Own booking and CRM, content admin, remaining AI features | ✅ Live |
| **Next** | Email delivery, the listing catalogue, advisor onboarding | 🔜 Planned |

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ Getting started

**Requirements:** Node.js 20 or later, and a Supabase project (the free tier is enough).

```bash
git clone https://github.com/THS001/build-caps-website-and-software-.git
cd build-caps-website-and-software-
npm install
cp .env.example .env.local    # then fill in the values
npm run dev                   # http://localhost:3000
```

Without Supabase keys the site runs on built-in sample data, so you can explore every page right away. The database setup (migrations, first admin, roles) is in [`docs/supabase-setup.md`](docs/supabase-setup.md), and the launch checklist is in [`docs/launch-checklist.md`](docs/launch-checklist.md).

<details>
<summary><b>Environment variables</b></summary>
<br>

| Variable | Needed for |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical links, sitemap, emails |
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database and staff sign-in |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only jobs: bookings, AI agents, imports |
| `ANTHROPIC_API_KEY` | AI tools, agents and the Concierge |
| `RESEND_API_KEY` *or* `SMTP_HOST` · `SMTP_PORT` · `SMTP_USER` · `SMTP_PASS` | Booking emails and invites |
| `EMAIL_FROM` · `EMAIL_TEAM` | Sender and internal notifications |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` · `TURNSTILE_SECRET_KEY` | Bot protection on forms |
| `CRON_SECRET` | Protects the scheduled jobs |
| `FEED_TOKEN` | Private portal XML feeds |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` · `GOOGLE_SERVICE_ACCOUNT_KEY` · `GSC_SITE_URL` | Search Console data for the SEO agent |
| `SEO_AGENT_MODE` | `dry_run` or `live` |
| `WHATSAPP_TOKEN` · `WHATSAPP_PHONE_NUMBER_ID` · `WHATSAPP_TEMPLATE` | Optional WhatsApp confirmations |
| `DLD_TRANSACTIONS_CSV_URL` | Optional automatic DLD import |
| `NEXT_PUBLIC_GA_ID` · `NEXT_PUBLIC_CLARITY_ID` · `NEXT_PUBLIC_META_PIXEL_ID` · `NEXT_PUBLIC_TIKTOK_PIXEL_ID` | Analytics, loaded only after cookie consent |

</details>

<details>
<summary><b>Scripts</b></summary>
<br>

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` · `npm start` | Production build and server |
| `npm run i18n:check` | Validates every translation (ICU syntax, placeholders, unknown keys) |
| `npm run i18n:translate` | Drafts missing translations |
| `npm run admin:create` | Creates the first admin account |
| `npm run admin:password` | Resets an admin password |

</details>

<details>
<summary><b>Project structure</b></summary>
<br>

```text
app/
├─ [locale]/(site)/      Public site: 33 page templates in 10 languages
├─ [locale]/admin/       Staff admin: 46 screens and their server actions
├─ actions/              Public server actions: booking, enquiries, AI tools
└─ api/                  Concierge, search, iCal feeds, portal feeds, MCP, cron jobs
components/
├─ admin/                Admin forms, calendar, CRM and pipeline board
├─ booking/              Booking wizard and self-service
├─ tools/                13 AI tools and 6 calculators
└─ site/ · ui/ · motion/ Site sections, design system and motion primitives
lib/
├─ ai/                   Model client, tool registry and the agents
├─ booking/              Availability, slots, notifications and calendar files
├─ data/                 Content source: Supabase, or sample data before setup
├─ market/ · geo/        DLD ingestion, estimates, routing and surroundings
└─ seo-agent/            Search Console analysis, proposals and rollback
messages/                Interface strings for the 10 languages
supabase/migrations/     Schema, RLS policies and SQL functions
docs/                    Research, content strategy, setup and launch guides
```

</details>

### Deployment

The site deploys to **Vercel** in the Frankfurt region, close to both Dubai and the database. These scheduled jobs run on Vercel Cron:

| Job | Schedule (UTC) | Work |
|---|---|---|
| `/api/cron/booking` | Daily, 05:00 | Reminders, advisor briefs, feedback requests, Advisor Scores |
| `/api/cron/market` | Mondays, 02:00 | DLD import, community figures, the market note, listing surroundings |
| `/api/cron/seo` | Mondays, 03:00 | SEO Growth Agent run |

### Quality gates

```bash
npx tsc --noEmit        # type safety across the whole codebase
npm run i18n:check      # every translation valid in every language
npm run build           # production build
```

<img src=".github/assets/divider.svg" width="100%" alt="">

## ◆ License

Copyright © 2026 Buildcaps Real Estate LLC. All rights reserved.
This repository is proprietary. No part of it may be copied, modified or distributed without written permission.

<p align="center">
  <img src=".github/assets/footer.svg" alt="Buildcaps Real Estate, Dubai" width="100%">
</p>
