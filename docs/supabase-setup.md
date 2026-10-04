# Supabase setup

The site runs on built-in sample data until Supabase is connected. These steps switch it to the real database and turn on the admin at `/admin`.

## 1. Create the project
1. Create a project at supabase.com. The free tier is enough to start. Choose **Frankfurt (eu-central-1)**: it's close to Dubai and matches the Vercel region in `vercel.json` (`fra1`). If you pick Mumbai instead, change the Vercel region to `bom1`.
2. Go to **Authentication → Sign In / Providers** and **turn off "Allow new users to sign up"**. Staff accounts are created by an admin. The database gives new accounts no access anyway, but there's no reason to allow sign-ups.
3. **Realtime** (for the Family Decision Room) is on by default. Nothing to configure: rooms use broadcast channels and store nothing.

## 2. Create the schema
In **SQL Editor**, run the files in `supabase/migrations/` in order:

| File | What it creates |
|---|---|
| `20261003000001_init.sql` | Listings, projects, developers, communities, opportunities, posts, leads, staff roles, RLS, the `media` storage bucket |
| `20261003000002_booking.sql` | Advisors' hours, appointments, the atomic `book_appointment` function |
| `20261003000003_ai.sql` | AI agent log, lead follow-up drafts, DLD transactions, listing verification |
| `20261003000004_tools_seo.sql` | DLD monthly history, Promise Ledger, construction progress, Buyer Bloc count, SEO Growth Agent tables |
| `20261003000005_crm_booking.sql` | CRM (contacts, activity timeline, tasks; every enquiry and booking files itself automatically), booking settings, staff bookings and rescheduling, calendar subscription feeds |
| `20261003000006_staff_names.sql` | Staff can see colleagues' names (timeline authors, task owners) |
| `20261003000007_documents.sql` | Reports vs the investor guide, and the private `documents` bucket for their PDFs (sent as signed links) |
| `20261003000008_ai_features.sql` | Meeting briefs and outcomes (Advisor Copilot), Advisor Score and verified reviews, cached Voice Notes, listing surroundings for the lifestyle filters, Translation QA flags |

Then:
- **Run `supabase/wp-posts.sql`** to import the 14 blog posts from the old WordPress site, with their original slugs (the 301 redirects send `/<old-slug>/` to `/insights/<old-slug>`). Re-generate it any time with `node scripts/migrate-wp-posts.mjs`.
- **Optional, for previews only:** run `supabase/seed.sql` to load the sample listings the site shows today. **Don't load it into the live database.** Run `node scripts/generate-seed.mjs` to regenerate it after editing the mock data.

## 3. Connect the site
Copy `.env.example` to `.env.local` and fill in three values from **Project Settings → API**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only, see below)

Restart `npm run dev`. The "Sample data" labels disappear and every page reads from Supabase.

## 4. Create the first admin
1. In **Authentication → Users → Add user**, create your account with an email and password.
2. In **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin', full_name = 'Your Name'
   where id = (select id from auth.users where email = 'you@buildcaps.com');
   ```
3. Sign in at `/admin/login`.

Roles:
- `admin`: everything, including deleting, publishing SEO changes and managing roles.
- `editor`: create and edit listings, opportunities, content, track record and market data.
- `advisor`: read everything and update leads and appointments.

Then add your advisors in **Admin → Team** (with the email that should receive their booking notices) and set their weekly hours, days off and the booking rules in **Admin → Availability**. Online booking stays paused (visitors see WhatsApp and phone instead) until at least one active advisor exists.

## How security works
- **Visitors (anon key)** can only read *published* rows. They can also insert leads and Opportunities clicks, but can never read them back. Buyer Bloc counts come from a function that returns a number, never the leads.
- **Accounts without a role** can do nothing.
- **Every admin save runs as the signed-in user**, so RLS enforces the role even if someone bypasses the UI.
- **The service-role key is used only on the server**, for work no visitor or staff session should be able to do directly: creating bookings through the atomic booking function, the AI agents (lead follow-ups, advisor briefs, Market Intel, Listing Ops), the DLD import and the SEO Growth Agent. It is never sent to the browser: it has no `NEXT_PUBLIC_` prefix and `lib/supabase/admin.ts` is server-only. Keep it out of any client code.
- **Database rules:** a listing can't be saved without a DLD permit, an off-plan unit can't be marked "for rent", two bookings can't overlap an advisor's time (with a 15-minute buffer), and SEO overrides can only be written by the server after an admin check.

These policies were tested against Postgres (PGlite) with anonymous, role-less and editor sessions, including the booking and SEO tables. Before launch, also run Supabase's **Database → Advisors** in the dashboard.

## Caching
Public pages cache Supabase reads for 5 minutes. Saving in the admin, applying an SEO change or importing market data clears that cache straight away.
