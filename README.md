# Gathrd — Weeks 1-5 + Design Pass: Full Product Build

Built from `Gathrd_Product_Blueprint_v4.docx`, Section 12 Build Timeline.

## What's in this drop

```
gathrd/
├── supabase/
│   └── migrations/
│       ├── 0001_init_core_schema.sql   ← churches, profiles (8 roles), audit_logs
│       └── 0002_rls_policies.sql       ← Row Level Security for all 3 tables
└── frontend/
    ├── src/
    │   ├── lib/supabaseClient.js
    │   ├── context/AuthContext.jsx     ← session + role + church_id, app-wide
    │   ├── components/ProtectedRoute.jsx
    │   ├── pages/Login.jsx
    │   ├── pages/Signup.jsx            ← senior_pastor signup (church creation)
    │   └── pages/Dashboard.jsx         ← Week 1 checkpoint placeholder
    ├── package.json
    ├── .env.example
    └── (vite/tailwind config)
```

## Design Pass — Real Brand Identity, Not Templated Defaults

This wasn't a feature week — it's a full visual overhaul across every screen built so far, prompted by a fair concern: the app was function-first up to this point, using generic Tailwind defaults (`indigo-600`, `gray-50`) with zero connection to your actual logo. Since the live link is already public, this closes that gap properly.

### What changed

```
frontend/tailwind.config.js        ← real brand color tokens + fonts, pulled from your logo
frontend/src/index.css             ← Sora/Inter typography, focus-visible accessibility styles
frontend/src/components/
  ├── AppShell.jsx                 ← NEW: persistent gradient sidebar/nav — the app's spine
  └── ui/
      ├── Button.jsx, Card.jsx, Badge.jsx   ← NEW: shared design primitives
frontend/src/components/ProtectedRoute.jsx  ← now wraps every logged-in page in AppShell automatically
```

Every existing page (Login, Signup, Dashboard, Members, Visitors, Discipleship, Giving, Announcements, Milestones, and the public Join/Give pages) was restyled to use the new brand system — colors, spacing, typography, and border-radius are now consistent everywhere instead of copy-pasted per page.

### The design system, explained

- **Colors, pulled directly from your logo**: Signal (`#6D3FF0`, your brand violet), Signal Deep (`#3D1F8C`), Ink (`#15111F`, a warmer near-black than flat gray), Parchment (`#FAF8FC`, a barely-there violet-tinted background instead of generic gray-50), Sage (money/success states), Amber Flag and Rose (warning/danger).
- **Typography**: Sora for headings (distinctive, not a default template font), Inter for body text and data-dense tables (the standard for legibility at small sizes — chosen deliberately since your users are often on small Android screens over mobile data, where load speed and readability matter more than novelty).
- **The signature move**: your logo's gradient is now the **permanent spine of the app** — a persistent sidebar present on every screen (collapses to a slide-out drawer on mobile), instead of each page being a disconnected standalone screen. This is what actually fixes the "doesn't feel like one product" problem, more than any color change alone would.
- **One new dependency**: `lucide-react`, a lightweight icon library, used for the sidebar navigation icons.

### A structural bug caught and fixed during this pass

The Dashboard's stat cards originally tried to build Tailwind class names dynamically at runtime (e.g. `` `bg-${color}-50` ``) — this is a classic Tailwind trap: since Tailwind scans source code at build time for literal class names, dynamically-constructed ones get silently dropped in production even though they "work" in a live dev preview. Fixed with a static lookup table instead. Worth knowing about for any future work — always write full class names literally, never build them from variables.

### Setup steps

1. Extract into your `gathrd` folder as usual.
2. **New dependency to install**: `cd frontend && npm install` (this pulls in `lucide-react` for the nav icons — already reflected in `package.json` and `package-lock.json`).
3. `npm run dev`, log in, and you should immediately see the new gradient sidebar and the restyled Dashboard.
4. Click through Members, Giving, Visitors, etc. — confirm the sidebar persists across every page and highlights whichever page you're on.
5. Test the mobile drawer: shrink your browser window (or open dev tools' device toolbar), confirm the sidebar collapses into a hamburger menu that slides open correctly.
6. Log out, check Login and Signup — confirm the split-panel gradient treatment shows on desktop, and collapses sensibly on mobile.
7. Open your Join link and Give link in incognito — confirm they now carry your logo and brand colors too.

### What's intentionally not covered in this pass

Deeper polish (custom illustrations, animated transitions, empty-state artwork) was deliberately left out — the goal here was closing the "doesn't look like a real product" gap efficiently and consistently, not maximalist decoration. The disciplined, restrained look is itself part of the design decision: for an app handling church finances and member data, calm competence reads as more trustworthy than flashy — the same instinct that makes banking apps look the way they do.

## Week 5 — Announcements + WhatsApp + Birthday Alerts

New in this drop:
```
supabase/migrations/
  ├── 0012_announcements_milestones.sql     ← announcements, templates, milestone log
  └── 0013_announcements_milestones_rls.sql ← RLS for all of the above

supabase/functions/
  ├── send-announcement/  ← resolves target audience, sends via Termii
  └── send-milestones/    ← checks today's birthdays/anniversaries, sends messages

frontend/src/pages/
  ├── Announcements.jsx  ← create, target audience, schedule, emergency broadcast, send now
  └── Milestones.jsx     ← upcoming birthdays/anniversaries dashboard + template editor
```

### Important scope note: WhatsApp sending needs Termii, which needs setup you do yourself

Every piece of this works today **except actual WhatsApp delivery**, which requires a Termii account and API key — something only you can set up (business details, phone verification, Sender ID approval). Until that's connected:
- Announcements and milestone messages still get created, logged, and tracked correctly
- Every recipient is marked `not_configured` instead of `sent` — an honest status, not a silent failure
- The moment you add your `TERMII_API_KEY`, sending activates immediately — no code changes needed

### Setup steps for Week 5

1. Run `0012_announcements_milestones.sql`, then `0013_announcements_milestones_rls.sql` in Supabase SQL Editor.
2. Deploy the two new functions:
```
supabase functions deploy send-announcement --project-ref <your-project-ref>
supabase functions deploy send-milestones --project-ref <your-project-ref>
```
3. **Once you have your Termii account and API key**, add it as a secret (same pattern as Paystack):
```
supabase secrets set TERMII_API_KEY=your-key-here
supabase secrets set TERMII_SENDER_ID=Gathrd
```
Then redeploy both functions so they pick up the new secret.
4. Test Announcements: create one targeting "Everyone," click **Send Now**, confirm recipients get created (status will show `not_configured` until Termii is connected — that's expected).
5. Test Milestones: temporarily set a test member's date of birth to today's date, go to **Milestones**, click **"Check & Send Today's Milestones"**, confirm they appear in the log. Click the button again — confirm it says "0 sent, 1 already sent today" (no duplicate).
6. Try editing a message template and confirm it saves.

### Design decisions worth knowing

- **Scheduling is manual-trigger today, not fully automatic.** True "fires at 2pm even if nobody's looking at the app" scheduling needs a server-side timer (Supabase supports this via pg_cron), which we deliberately held off on this week to avoid untested infrastructure risk. Today: "Send Now" and emergency broadcasts work immediately; anything scheduled for later needs the pastor to open Announcements and click Send once that time arrives. Automating this fully is a clean, low-risk upgrade for later — the underlying send logic doesn't change at all, just what triggers it.
- **The milestone-sending function is idempotent** — safe to click "Check & Send" as many times as you want in a day. A database-level unique constraint (`member_id`, `milestone_type`, `sent_on`) makes duplicate sends structurally impossible, not just discouraged by application logic.
- **Every WhatsApp send attempt is logged honestly** — `sent`, `failed`, `not_configured`, or `no_phone` — so read-receipt counts always reflect reality, never an inflated "delivered" count.
- **WhatsApp costs money per message once connected** (Meta's fee, not Termii's) — this is a real ongoing cost to factor into your pricing, not a one-time setup fee. Worth deciding deliberately whether it's absorbed into subscription pricing or metered per church.

### Week 5 deliverable checklist (Section 12)

- [x] Announcements: title, body, target audience (all/department/cell group), schedule for later, emergency flag
- [x] Delivery tracking per recipient, with honest "not configured yet" status until Termii is connected
- [x] Birthday/anniversary detection pulled automatically from existing Member Registry fields — no new data entry
- [x] This week / this month milestone dashboard views
- [x] Editable message templates with `{{name}}` / `{{church_name}}` placeholders
- [x] Idempotent sending — safe to trigger repeatedly without duplicate messages
- [ ] **You confirm**: create and send a test announcement, test a milestone message with a fake today's-birthday, edit a template
- [ ] **Pending your action**: create a Termii account, get Sender ID approved, add the API key — then WhatsApp sending goes fully live
- [ ] **Future upgrade** (not urgent): move scheduled announcements and daily milestone checks onto full automatic timing via pg_cron, once the manual version has proven reliable

## Week 4 — Tithe & Giving + Paystack + Offering Counting Sheet

New in this drop:
```
supabase/migrations/
  ├── 0010_giving_schema.sql   ← settlement accounts, giving_records, counting sheets
  └── 0011_giving_rls.sql      ← RLS restricted to pastor/finance_admin roles

supabase/functions/            ← NEW: Edge Functions (hold the Paystack secret key safely)
  ├── create-subaccount/       ← creates a church's Paystack subaccount
  ├── initialize-giving/       ← starts a payment from the public Give page
  └── paystack-webhook/        ← confirms payment success, verified by signature

frontend/src/pages/
  ├── GivingSettings.jsx  ← admin: bank account entry, activate online giving, QR/link
  ├── GivingLog.jsx       ← admin: cash entry, category totals, full record list
  ├── CountingSheet.jsx   ← admin: multi-counter offering reconciliation
  ├── PublicGive.jsx      ← public /give/:slug page, no login required
  └── GiveSuccess.jsx     ← post-payment confirmation page
```

### Why this week needed something new: Edge Functions

Every previous week's logic lived entirely in SQL functions inside Supabase. Money is different: talking to Paystack requires your **secret key**, and a secret key can never be sent to a browser — anyone could open dev tools and steal it. So Week 4 introduces **Supabase Edge Functions**: small pieces of backend code that run on Supabase's servers, hold your secret key safely, and are the only thing that ever talks to Paystack directly.

### One-time setup: Supabase CLI

You need this tool once to deploy Edge Functions. Full guided steps for this are in the conversation, but in short:
```
npm install -g supabase
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxxxxxxx
supabase functions deploy create-subaccount
supabase functions deploy initialize-giving --no-verify-jwt
supabase functions deploy paystack-webhook --no-verify-jwt
```

### Setup steps for Week 4

1. Run `0010_giving_schema.sql`, then `0011_giving_rls.sql` in Supabase SQL Editor.
2. Install the Supabase CLI and deploy the three Edge Functions (above).
3. Register your webhook URL in the Paystack Dashboard: Settings → API Keys & Webhooks → paste your `paystack-webhook` function URL.
4. Log in as your senior_pastor account → **Giving** → **Settings** → enter your test bank details → **Activate Online Giving**.
5. Copy your Give link/QR, open it in an incognito window, and make a test payment using Paystack's test card numbers (never real money in test mode).
6. Confirm the gift shows up in your **Giving** log as "success," and that the amount reflects in the category totals.
7. Test cash entry: **+ Record Cash Gift**, confirm it appears immediately (no Paystack involved for cash).
8. Test the Counting Sheet: create a session, submit two different tallies from two accounts — confirm it flags "Discrepancy." Submit two matching tallies on a new session — confirm it locks as "Confirmed."

### Design decisions worth knowing

- **One settlement account per church, not per category** — per your decision, all five giving types (Tithe, Offering, Thanksgiving, Building/Project, Welfare) settle to the same bank account. Categorization is bookkeeping only; Paystack never sees categories, only Gathrd's own records do.
- **Paystack Subaccounts, not separate Paystack accounts per church** — pastors never sign up for Paystack themselves. They give you their bank details once, and Gathrd creates the subaccount on their behalf via API. Money settles directly to their account; Gathrd's platform fee (currently 2%, adjustable) is deducted automatically by Paystack, not manually by you.
- **Giving data has its own tighter RLS**, separate from general admin access — only senior_pastor, assistant_pastor, and finance_admin can see it, matching the blueprint's explicit rule that even church_admin shouldn't see financial data by default.
- **A pending giving record is created before Paystack is even called**, so if someone starts a payment and abandons it, there's still a "pending" trail rather than the attempt vanishing with no record.

### Week 4 deliverable checklist (Section 12)

- [x] Cash payment entry with giving type, tithe card number, date
- [x] 5 giving types: Tithe, Offering, Thanksgiving, Building/Project, Welfare
- [x] Online giving via Paystack, auto-creates the giving record
- [x] Church giving summary by category
- [x] Offering Counting Sheet: multi-counter tally, auto-confirm on match, auto-flag on mismatch, locked after confirmation
- [x] Giving data restricted to pastor/finance_admin roles only
- [x] Scroll-wheel bug fixed on every amount field (Chrome silently changes number inputs on mouse scroll — closed everywhere)
- [x] Gifts now link to a real member record — cash entries via a searchable dropdown, online gifts auto-matched by phone number
- [x] Member Giving History page with date-range filter and a printable/exportable giving statement (for tax and personal records, per spec)
- [x] Top Givers report, ranked by total given in a date range, restricted to senior_pastor/assistant_pastor/finance_admin only
- [x] **Confirmed working**: activated giving, made a real test payment via Paystack test mode, recorded cash gifts, ran counting sheet reconciliation (both matching and mismatched scenarios)

### New in the stretch-goal update

```
frontend/src/pages/
  ├── MemberGivingHistory.jsx  ← /members/:id/giving — full history + printable statement
  └── TopGivers.jsx            ← /giving/top-givers — ranked report, finance roles only
```

**Setup:** redeploy `initialize-giving` after pulling this update — it now auto-links online gifts to an existing member by matching phone number:
```
supabase functions deploy initialize-giving --no-verify-jwt --project-ref <your-project-ref>
```

**How the statement works:** click "Print / Save Statement" on any member's Giving History page — it opens your browser's print dialog, where choosing "Save as PDF" produces a clean, downloadable statement. No PDF-generation library needed; this uses print-specific CSS (`print:` Tailwind classes hide buttons/navigation and show only the statement content when printing).

## Week 3 — Visitor Log, Follow-Up, and Discipleship Tracker

New in this drop:
```
supabase/migrations/
  ├── 0006_visitor_discipleship.sql     ← visitors, visits, follow_up_tasks, discipleship_records, check_in_visitor + convert_visitor RPCs
  └── 0007_visitor_discipleship_rls.sql ← RLS for all of the above

frontend/src/pages/
  ├── VisitorCheckIn.jsx        ← staff-facing check-in form (fast enough for live service use)
  ├── VisitorLog.jsx            ← visitor list, follow-up status, "Mark as Convert"
  └── DiscipleshipTracker.jsx   ← 6-stage journey view with 30-day stall warnings
```

### Setup steps for Week 3

1. In Supabase SQL Editor, run `0006_visitor_discipleship.sql`, then `0007_visitor_discipleship_rls.sql`, in order.
2. Merge the new frontend files into your project (same as before).
3. `npm run dev`, log in, and you'll see two new buttons on the Dashboard: **Visitor Log** and **Discipleship Tracker**.
4. Test the flow:
   - Click **Visitor Log** → **+ Check In Visitor** → fill in a test visitor, submit
   - Confirm they appear in the log as "First Timer" with a "Pending" follow-up task
   - Check them in again with the same phone number — confirm their status auto-updates to "Repeat Visitor" and their visit history now has 2 entries
   - Click **Mark as Convert** on a visitor — confirm they now show under **Discipleship Tracker** at the "Salvation" stage
   - Click **Advance to Water Baptism →** a few times, watching the progress bar fill in
   - Advance all the way to **Membership Class** — confirm this auto-creates a new entry in your **Members** list (this is the "convert auto-promoted to full Member" rule from the blueprint)

### Design decisions worth knowing

- **Check-in is staff-facing, not a public link.** Unlike Member self-onboarding (Week 2), visitor check-in is done by an usher/welcome team member during the service — this matches how Nigerian churches actually run visitor cards today. If you'd rather visitors self-check-in via their phones too, that's a small extension of what's here, not a rewrite.
- **Repeat-visitor detection is phone-based.** The `check_in_visitor` function looks up an existing visitor by phone number within the same church before creating a new one — so the same person checking in twice becomes one visitor record with two visits logged, not two separate people.
- **The 48-hour "no follow-up" reminder is visual only for now** (an "⚠ Overdue" tag in the Visitor Log). Actually *sending* that reminder via WhatsApp lands naturally in Week 5, once WhatsApp Business API integration is built — wiring it now would mean building notification infrastructure twice.
- **Discipleship data has its own tighter RLS** — even though pastors/admins can see it, a pastor specifically assigned to a convert can also see and update that record even if they don't hold an admin-level role. This matches the blueprint's framing of discipleship as sensitive pastoral care, not general admin data.

### Week 3 deliverable checklist (Section 12)

- [x] Visitor Log with dedicated check-in form, separate from member self-onboarding
- [x] Auto-tagging: First Timer → Repeat Visitor based on phone-matched visit count
- [x] Full visit history per visitor
- [x] Follow-up task auto-created on every check-in, with 24-hour due window
- [x] Follow-up status tracking: Pending, Contacted, Visited, Converted, Inactive
- [x] Overdue flag when a follow-up passes 48 hours without action
- [x] "Mark as Convert" moves a visitor into the Discipleship Tracker
- [x] 6-stage discipleship journey with progress visualization
- [x] 30-day stall warning per the blueprint's automatic reminder rule
- [x] Completing Membership Class auto-promotes the convert to a full Member record
- [ ] **You confirm**: check in a test visitor twice, mark them a convert, walk them through all 6 stages, and see them land in Members

## Week 2 — Member Registry + QR Self-Onboarding

New in this drop:
```
supabase/migrations/
  ├── 0003_member_registry.sql   ← departments, cell_groups, members, self-onboarding RPC
  └── 0004_member_registry_rls.sql  ← RLS for all of the above

frontend/src/pages/
  ├── PublicOnboard.jsx   ← the public QR/link self-registration form (no login)
  ├── Members.jsx         ← admin member list, search/filter, CSV export, invite panel
  └── MemberForm.jsx      ← admin add/edit member (full field spec incl. medical consent gate)
```

### Setup steps for Week 2

1. In Supabase SQL Editor, run `0003_member_registry.sql`, then `0004_member_registry_rls.sql`, in order.
2. Pull the latest code (`git pull` if you're syncing from GitHub, or just make sure these new files are in place).
3. `npm run dev` from the `frontend` folder.
4. Log in as your senior_pastor account → click **Go to Members** on the dashboard.
5. Click **Invite Members** — this shows your church's unique QR code and link.
6. Test the self-onboarding flow: open the link in an incognito window (simulating a visiting member with no login) and submit the form.
7. Confirm the new member shows up in your Members list, tagged "self-registered."

### Design decision worth knowing

`members` is a separate table from `profiles`. `profiles` is for the 8 role-holders who actually log in (pastors, admins, leaders). `members` is the full congregation roster — most of them will never have a login account, they're just records in the registry, added either by an admin or via self-onboarding. A member *can* optionally be linked to a login account later (via `profile_id`), but doesn't need one to exist.

### Security note

Self-onboarding does **not** give anonymous visitors direct write access to the `members` table. Instead, the public form calls a Postgres function (`self_onboard_member`) that validates the church's onboarding slug server-side and inserts on the visitor's behalf. This means even if someone inspected the network requests and tried to call the Supabase API directly, they still couldn't write to any table, insert into another church's data, or bypass the slug check — the only door open to the public is that one function, and it does exactly one thing.

### Week 2 deliverable checklist (Section 12)

- [x] Member Registry schema — all required + optional fields from Section 4
- [x] Departments and Cell Groups as supporting tables
- [x] QR/link self-onboarding via secure RPC, not direct table access
- [x] Medical data (blood group, genotype) gated behind church-level toggle + explicit consent checkbox
- [x] Admin member list with search (name) and filter (status)
- [x] CSV export
- [x] RLS: pastors/admins full access, cell_leader scoped to their own cell, member sees only their own record
- [ ] **You confirm**: share the invite link, submit a test registration, see it appear in your Members list

## Week 1 — Auth + Roles

### 1. Create your Supabase project
Go to [supabase.com](https://supabase.com) → New Project. Free tier is fine per Section 8.

### 2. Run the migrations
In the Supabase SQL Editor, run the two files in order:
1. `supabase/migrations/0001_init_core_schema.sql`
2. `supabase/migrations/0002_rls_policies.sql`

(Or use the Supabase CLI: `supabase db push` if you've linked the project.)

### 3. Get your keys
Supabase Dashboard → Settings → API → copy `Project URL` and `anon public` key.

### 4. Set up the frontend
```bash
cd frontend
npm install
cp .env.example .env
# paste your Project URL and anon key into .env
npm run dev
```

Visit `http://localhost:5173/signup` → creates a `senior_pastor` account for your church → confirm email → log in → you land on the Dashboard showing your role.

## Week 1 deliverable checklist (Section 12)

- [x] Supabase project + migrations
- [x] 8-role enum matching Section 7 exactly
- [x] Every table has all 6 audit columns (created_by/at, updated_by/at, deleted_by/at)
- [x] Audit trigger auto-fills created_by/updated_by — client can't fake these
- [x] `handle_new_user` trigger auto-creates a `profiles` row on signup
- [x] RLS enforced at the database level, not just the frontend
- [x] Login/Signup working end to end
- [ ] **You confirm**: sign up, confirm email, log in, see your role on the dashboard

Once that last box is checked, Week 1 is done — move to Week 2: Member Registry + QR self-onboarding (Module 1, Section 4).

## Notes for next session

- Only `senior_pastor` self-signup is wired right now. The other 7 roles get invited by the pastor/admin — that flow is part of Module 21 (Onboarding Flow), Week 7. Until then, you can manually set a user's role in the `profiles` table via the Supabase table editor for testing.
- `department_id` and `cell_group_id` columns on `profiles` are nullable placeholders — the real `departments` and `cell_groups` tables land in later weeks per the schema in Section 9.
- Every new table you add from Week 2 onward: copy the 6 audit columns + attach `set_audit_fields()` trigger, exactly like `churches` and `profiles` do. Don't skip this — it's a non-negotiable build rule.
