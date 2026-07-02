# Gathrd — Weeks 1-3: Auth, Roles, Member Registry, Visitor Log & Discipleship

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
