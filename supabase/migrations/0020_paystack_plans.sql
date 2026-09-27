-- ============================================================
-- GATHRD — Paystack Plans table
-- Stores the mapping between our plan tiers and Paystack plan codes
-- ============================================================

create table public.paystack_plans (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null unique,        -- basic | advanced | premium
  plan_code text not null,             -- Paystack plan code (e.g., PLN_xxx)
  name text not null,
  amount int not null,                 -- in kobo (₦1 = 100 kobo)
  interval text not null default 'monthly',
  currency text not null default 'NGN',
  created_at timestamptz not null default now()
);

-- Seed with placeholder rows (plan_code will be filled after running create-paystack-plan)
insert into public.paystack_plans (plan_id, plan_code, name, amount) values
  ('basic',    'PLACEHOLDER', 'Basic',    1000000),  -- ₦10,000 in kobo
  ('advanced', 'PLACEHOLDER', 'Advanced', 2000000),  -- ₦20,000 in kobo
  ('premium',  'PLACEHOLDER', 'Premium',  5000000);  -- ₦50,000 in kobo
