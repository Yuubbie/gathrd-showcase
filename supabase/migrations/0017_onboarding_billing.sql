-- ============================================================
-- GATHRD — Week 7 Migration
-- Module 21: Onboarding checklist support
-- Module 20: Billing structure (partial — see README)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Onboarding + light branding fields
-- ------------------------------------------------------------
alter table public.churches
  add column logo_url text,
  add column brand_color text,
  add column onboarding_dismissed boolean not null default false;

-- ------------------------------------------------------------
-- 2. Billing/subscription structure
--    Full automated Paystack Subscriptions billing (charging
--    churches monthly, grace periods, auto-suspension) is a
--    separate integration from the giving/tithe Paystack setup
--    built in Week 4 — this lays the groundwork so it can be
--    switched on later without a schema change.
-- ------------------------------------------------------------
create type public.subscription_status as enum (
  'trialing', 'active', 'grace_period', 'read_only', 'suspended'
);

alter table public.churches
  add column subscription_status public.subscription_status not null default 'trialing',
  add column current_period_end date,
  add column grace_period_started_at timestamptz;
