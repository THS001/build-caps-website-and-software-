# Launch checklist: accounts, keys and go-live

Everything in the site is built. Each integration switches on when its keys are added and falls back safely without them (sample data, console email, Jitsi links, rule-based search, no analytics). This is the list of what to set up, in order. All of it is free except the Anthropic API.

Put every value in **Vercel → Project → Settings → Environment Variables** (Production and Preview) and in `.env.local` for local work. `.env.example` lists them all with comments.

## 1. Required to launch

| What | Where to get it | Env vars |
|---|---|---|
| **Supabase** project (database, admin logins, storage, realtime) | supabase.com → New project (Frankfurt). Follow `docs/supabase-setup.md` | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Anthropic API key** (the only paid service) | console.anthropic.com → API keys. Set a monthly spend limit | `ANTHROPIC_API_KEY` |
| **Email sending** | Either Resend (resend.com, free 3,000/month; verify `buildcaps.com` with the DNS records it gives you) or SMTP from your mail provider | `RESEND_API_KEY` **or** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`; plus `EMAIL_FROM`, `EMAIL_TEAM` |
| **Cloudflare Turnstile** (bot protection on all forms) | dash.cloudflare.com → Turnstile → Add site (`buildcaps.com`, managed mode) | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` |
| **Cron secret** | Any long random string (e.g. `openssl rand -hex 32`) | `CRON_SECRET` |
| **Portal feed token** (Property Finder, Bayut, dubizzle import your listings from it) | Any long random string. The three feed links appear in Admin → Properties → Portal feeds; send each portal only its own link | `FEED_TOKEN` |
| **Site URL** | Your domain | `NEXT_PUBLIC_SITE_URL=https://buildcaps.com` |

## 2. Bookings and Google Search Console

**Bookings run on the site's own calendar, with no Google account.** Advisors, hours, time off and booking rules live in Admin → Team and Admin → Availability, and the admin calendar shows every booking. Each advisor can see their bookings on their phone by subscribing to the private link in Admin → Availability from Google Calendar, Apple Calendar or Outlook. Clients get the booking as a calendar file (.ics) with their confirmation email.

**Video calls:** put each advisor's own Zoom, Teams or Meet room link in Admin → Team → *Video meeting link*. Advisors without one get a free Jitsi room per booking (the advisor signs in at meet.jit.si to open it).

**Search Console (SEO agent only):** one Google service account.
1. console.cloud.google.com → create a project → enable the **Google Search Console API**.
2. IAM → Service accounts → Create → Keys → Add key → JSON. Copy `client_email` and `private_key` into `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_KEY` (keep the `\n` escapes).
3. Verify `buildcaps.com` as a Domain property in Search Console, then Settings → Users and permissions → Add user → the service account email (Restricted is enough). Set `GSC_SITE_URL=sc-domain:buildcaps.com`.

## 3. Optional but recommended

| What | Where | Env vars |
|---|---|---|
| Google Analytics 4 | analytics.google.com → Admin → Data streams → Web → Measurement ID | `NEXT_PUBLIC_GA_ID` |
| Microsoft Clarity (heatmaps) | clarity.microsoft.com → New project → Settings → Project ID | `NEXT_PUBLIC_CLARITY_ID` |
| Meta Pixel | business.facebook.com → Events Manager → Pixel ID | `NEXT_PUBLIC_META_PIXEL_ID` |
| TikTok Pixel | ads.tiktok.com → Assets → Events → Web events → Pixel ID | `NEXT_PUBLIC_TIKTOK_PIXEL_ID` |
| WhatsApp Business Cloud API (automatic booking confirmations; click-to-chat works without it) | developers.facebook.com → WhatsApp → API setup: permanent token, phone number ID, an approved template | `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE` |
| DLD transactions feed (Estimate, Data Room, Regret Radar, Market Intel) | dubaipulse.gov.ae → "DLD Transactions" dataset → CSV download link. Or upload the CSV in Admin → Market data | `DLD_TRANSACTIONS_CSV_URL` |

Analytics and pixels only load after a visitor accepts cookies.

## 4. Deploy on Vercel

1. Push the repository to GitHub and import it in Vercel (framework: Next.js; no build settings to change).
2. Add the environment variables above.
3. **Crons** (`vercel.json`): booking reminders run daily at 09:00 Dubai, Market Intel and the SEO agent weekly on Monday. The 24-hour and 1-hour reminders and the advisor's 30-minute brief need the booking job **every 15 minutes**:
   - on **Vercel Pro**, change its schedule in `vercel.json` to `*/15 * * * *`;
   - on the free **Hobby** plan (daily crons only), add a free job at cron-job.org that calls `https://buildcaps.com/api/cron/booking` every 15 minutes with the header `Authorization: Bearer <CRON_SECRET>`.
4. Domain: Vercel → Domains → add `buildcaps.com` and `www.buildcaps.com`, then point DNS as Vercel shows. The old WordPress URLs are 301-redirected automatically (`lib/redirects.mjs`).
5. After the first deploy: submit `https://buildcaps.com/sitemap.xml` in Search Console, and run Lighthouse on the home page, a listing and a tool page.

## 5. Content and facts only you can provide

The site never shows unverified claims, so these stay hidden until you add them:
- **RERA ORN** (agency) and each advisor's **BRN**, plus the **DLD/Trakheesi permit number and QR** for every listing (a listing can't be published without a permit).
- Real **communities, developers, off-plan projects and listings**, with photos (Admin → Communities, Developers, Off-plan projects, Properties). Until the first ones are published, the AI tools show a "live data is on its way" panel with an advisor form. Add each community's DLD area names so its market figures come from Dubai Land Department sales.
- The **market report and investor guide PDFs** (Admin → Reports and guide). Visitors get a download link after leaving their email.
- **Portal onboarding**: give Property Finder, Bayut and dubizzle their feed link and ask them to confirm the community mapping.
- **Team** photos and bios, advisors' working hours and emails.
- Company **stats**, **awards**, press mentions, Google reviews link, partner logos.
- **Developer track records** (Admin → Track record): verified promises and construction progress readings power the Promise Ledger and Handover Truth Score.
- Legal review of the privacy, cookie and terms pages, and of Buyer Bloc before taking it beyond the interest list.

## 6. After launch

- All interface copy and the 14 Insights articles are already translated into the nine other languages. Have native speakers spot-check Arabic, Urdu and Farsi; Admin → Translation QA lists anything the automatic check flagged. New strings: `npm run i18n:translate`; new articles: `node --env-file=.env.local scripts/translate-posts.mjs`.
- Ask clients for a review after each meeting (the follow-up email links to the form) and approve reviews in Admin → Team; an advisor's Advisor Score goes public after 5 meetings or 3 approved reviews.
- Keep the SEO agent in `SEO_AGENT_MODE=dry_run` for the first few weeks; review proposals in Admin → SEO agent, then switch to `live`.
- Set Anthropic and Supabase usage alerts.
