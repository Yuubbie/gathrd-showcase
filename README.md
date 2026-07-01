# Gathrd — Week 1: Supabase Setup + Auth + Role System + Audit Trail

Built from `Gathrd_Product_Blueprint_v4.docx`, Section 12 Build Timeline, Week 1.

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

## Setup steps

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
