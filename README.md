# Gathrd

**Church management for Nigerian churches.** Know your people, follow up every visitor, count the offering honestly, and keep everyone informed, from one app that works on a phone.

- **Live app:** [gathrd.com.ng](https://gathrd.com.ng)
- **Watch the 9-minute guide:** [youtu.be/1Yg3MzRHuko](https://youtu.be/1Yg3MzRHuko)
- **Contact:** yubbiepen.pixel@gmail.com

## Why it exists

Most churches in Nigeria run on paper registers, notebooks and WhatsApp groups. First-timers go uncalled, offering counts disagree, and nobody notices when a regular stops coming. Gathrd puts those jobs in one place, priced in Naira and built for how Nigerian churches actually work: midweek services, cell groups, bank-transfer giving, and patchy data on a phone.

## What it does

| Area | What you can do |
|---|---|
| **People** | Member records, children's list (kept separate), departments, one join link so people sign up themselves, role-based team |
| **Attendance** | Start a service, show a QR code and 6-digit code, members check in from their phone, ushers check in manually, "missed three Sundays" list |
| **Visitors and follow-up** | Log first-timers, a 1/3/7/30-day welcome queue with pre-filled WhatsApp, SMS and call buttons, converts moving through discipleship stages |
| **Cell groups** | Groups with leaders and zones, weekly reports with attendance, new faces, prayer points and testimonies |
| **Giving** | Bank-transfer giving with a required receipt, a finance verification queue, two-counter offering sheets that flag a mismatch, cash log, top givers |
| **Communication** | Announcements to everyone, a department or a cell group; per-church service reminders; daily birthday notice; phone push alerts |
| **Planning** | Calendar with repeating events, service roster (order of service and duties) |
| **Reports** | Monthly report filled in automatically, with notes added by department heads |
| **Branches** | Districts and zones invite branch churches and see an oversight dashboard |

A 26-chapter onboarding script that walks through every screen is in [`marketing/onboarding-video-script.md`](marketing/onboarding-video-script.md).

## How it is built

```
Browser / installed phone app (React, PWA)
        |
        |  Supabase JS client (login, queries, file uploads)
        v
Supabase  ---  Postgres with row-level security on every table
          ---  Auth, Storage
          ---  Edge Functions (Deno): emails, push alerts, payments, scheduled alerts
          ---  pg_cron + pg_net + Vault: runs the reminder job every 15 minutes
Vercel    ---  hosts the website and one serverless email route
Resend, Paystack, Web Push (VAPID)  ---  email, subscription payments, phone alerts
```

**Multi-tenant by design.** Every church's data is separated by Postgres row-level security, not by application code. A church cannot read another church's records, and roles (senior pastor, admin, finance, cell leader, children's teacher and others) see only what they need.

### Tech stack

- **Frontend:** React 18, Vite 5, React Router 6, Tailwind CSS 3.4, lucide-react, qrcode.react
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions), pg_cron, pg_net
- **Services:** Vercel (hosting), Resend (email), Paystack (subscription payments, being connected), Web Push with VAPID keys (the standard browser push, with no extra push-service account)
- **PWA:** installable, service worker, lock-screen alerts

## Security and privacy choices

- Row-level security is enabled on every table. Access rules were checked with rolled-back SQL tests that act as different users.
- No secrets are in the repository. Server keys live only in Supabase and Vercel settings.
- The platform owner is stored in a `platform_admins` table and checked by one database function (`is_platform_admin()`), not hard-coded in the code. It can require two-step login once an authenticator is enrolled.
- Gathrd never holds church money: members transfer to the church's own bank account and upload a receipt for the church's finance team to verify.
- Privacy Policy and Terms (written for the Nigeria Data Protection Act 2023) are in the app at `/privacy` and `/terms`. Medical details are optional and recorded only with consent.

## Project layout

```
frontend/            React app (pages, components, lib), plus api/send-email.ts (Vercel route)
supabase/migrations/ Database schema, rules and scheduled jobs (numbered 0001 to 0044; 0041, the billing rework, is not published yet)
supabase/functions/  Edge Functions (Deno)
supabase/seed/       demo_grace_chapel.sql: realistic demo data for one church
scripts/             create-demo-staff.mjs: demo logins for the demo church
marketing/           Demo and onboarding video scripts
```

## Run it locally

You need Node 18 or newer and a Supabase project (free tier is fine).

```bash
git clone <this repo>
cd <repo folder>/frontend
npm install
cp .env.example .env      # then fill in the values below
npm run dev               # http://localhost:5173
```

In `frontend/.env`:

| Variable | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your project's public (anon) key |
| `VITE_VAPID_PUBLIC_KEY` | Public key for phone alerts (optional) |

Database: apply the files in `supabase/migrations/` in order to your Supabase project (`supabase link`, then `supabase db push`, or paste them into the SQL editor).

Edge Functions read these secrets (set them with `supabase secrets set`): `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM`, `FRONTEND_URL`, `PAYSTACK_SECRET_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, and optionally `TERMII_API_KEY` and `TERMII_SENDER_ID`. The reminder job also needs two Vault secrets, `cron_secret` and `cron_anon_key`.

### Demo data

`supabase/seed/demo_grace_chapel.sql` fills one church with about 150 fictional members, 12 weeks of attendance, visitors, giving, cell groups and more. All phone numbers and emails are fake. Create a church named "Grace Chapel Demo" and put its id in the script before running it. It only ever touches that church.

## Status and honest limits

- **In progress:** subscription billing. Paystack is being set up to receive church subscription payments. The billing code in this repository is an earlier version and is switched off; the finished version will be published once billing is live.
- **Not switched on:** WhatsApp sending from the server. The WhatsApp and SMS buttons open the user's own phone with the message ready.
- **Not built yet:** bulk member import, offline check-in, two-step login screen for the platform owner.
- **No automated tests yet.** Database rules were verified by hand with SQL; the app has been tested manually.
- Some early database changes were made by hand, so a clean replay of every migration on a blank project has not been verified. Treat the migrations as the reference for the schema.

## Built with Claude

Gathrd is built by one person working with [Claude](https://claude.com) from Anthropic, mainly through [Claude Code](https://claude.com/claude-code). The builder decides what to build, reviews the changes and runs the product; Claude helps write, test and document the code.

## License

Not yet chosen. Until a license is added, all rights are reserved.
