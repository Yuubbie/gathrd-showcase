# Gathrd — Weeks 1-2: Auth, Roles, and Member Registry

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
