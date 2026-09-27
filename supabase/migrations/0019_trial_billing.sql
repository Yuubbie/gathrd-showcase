-- ============================================================
-- GATHRD — Week 10 Migration
-- Trial tracking + Paystack subscription billing
-- ============================================================

-- ------------------------------------------------------------
-- 1. Trial tracking fields on churches
-- ------------------------------------------------------------
alter table public.churches
  add column trial_started_at timestamptz not null default now(),
  add column trial_ends_at timestamptz not null default (now() + interval '60 days'),
  add column paystack_plan_code text,       -- Paystack plan code for their selected plan
  add column paystack_subscription_code text, -- Paystack subscription code
  add column paystack_email_token text,     -- For Paystack customer authorization
  add column trial_extension_count int not null default 0; -- How many times trial was extended

-- ------------------------------------------------------------
-- 2. Plan pricing update — new 3-tier structure
-- ------------------------------------------------------------
-- Update the plan enum values to match new pricing
-- Basic: ₦10,000/month | Advanced: ₦20,000/month | Premium: ₦50,000/month

-- First, rename existing plans to new structure
update public.churches set plan = 'basic' where plan = 'starter';
update public.churches set plan = 'advanced' where plan in ('growth', 'church');
update public.churches set plan = 'premium' where plan = 'enterprise';

-- ------------------------------------------------------------
-- 3. Billing events log — track every billing action
-- ------------------------------------------------------------
create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  event_type text not null,  -- trial_started, trial_extended, subscription_created, payment_succeeded, payment_failed, plan_changed, trial_expired, suspended, reactivated
  description text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_billing_events_church on public.billing_events(church_id);
create index idx_billing_events_type on public.billing_events(event_type);

-- ------------------------------------------------------------
-- 4. Helper function: get church billing status
-- ------------------------------------------------------------
create or replace function public.get_billing_status(church_id uuid)
returns json as $$
declare
  church_record public.churches%rowtype;
  days_left int;
  trial_active boolean;
begin
  select * into church_record from public.churches where id = church_id;
  
  if not found then
    return json_build_object('error', 'Church not found');
  end if;

  days_left := extract(day from (church_record.trial_ends_at - now()))::int;
  trial_active := days_left > 0 and church_record.subscription_status = 'trialing';

  return json_build_object(
    'plan', church_record.plan,
    'subscription_status', church_record.subscription_status,
    'trial_started_at', church_record.trial_started_at,
    'trial_ends_at', church_record.trial_ends_at,
    'trial_days_left', greatest(days_left, 0),
    'trial_active', trial_active,
    'current_period_end', church_record.current_period_end,
    'grace_period_started_at', church_record.grace_period_started_at,
    'paystack_plan_code', church_record.paystack_plan_code,
    'paystack_subscription_code', church_record.paystack_subscription_code
  );
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 5. Helper function: check if church can access app
--    Returns true if trial is active OR subscription is active
-- ------------------------------------------------------------
create or replace function public.can_access_app(church_id uuid)
returns boolean as $$
declare
  church_record public.churches%rowtype;
begin
  select * into church_record from public.churches where id = church_id;
  
  if not found then
    return false;
  end if;

  -- Active subscription = full access
  if church_record.subscription_status = 'active' then
    return true;
  end if;

  -- Trial still running = full access
  if church_record.subscription_status = 'trialing' and church_record.trial_ends_at > now() then
    return true;
  end if;

  -- Grace period = read-only access (return true but UI shows limited)
  if church_record.subscription_status = 'grace_period' then
    return true;
  end if;

  -- Everything else = no access
  return false;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 6. Auto-expire trial function (called by pg_cron or manually)
-- ------------------------------------------------------------
create or replace function public.expire_trials()
returns int as $$
declare
  expired_count int;
begin
  update public.churches
  set subscription_status = 'suspended'
  where subscription_status = 'trialing'
    and trial_ends_at <= now();

  get diagnostics expired_count = row_count;

  -- Log the events
  insert into public.billing_events (church_id, event_type, description)
  select id, 'trial_expired', 'Trial period ended — church suspended'
  from public.churches
  where subscription_status = 'suspended'
    and trial_ends_at <= now()
    and not exists (
      select 1 from public.billing_events 
      where church_id = churches.id 
        and event_type = 'trial_expired'
        and created_at > now() - interval '1 day'
    );

  return expired_count;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 7. Extend trial function (for manual extensions by admin)
-- ------------------------------------------------------------
create or replace function public.extend_trial(p_church_id uuid, p_days int)
returns boolean as $$
declare
  church_record public.churches%rowtype;
begin
  select * into church_record from public.churches where id = p_church_id;
  
  if not found then
    return false;
  end if;

  if church_record.subscription_status != 'trialing' then
    return false;
  end if;

  update public.churches
  set trial_ends_at = trial_ends_at + (p_days || ' days')::interval,
      trial_extension_count = trial_extension_count + 1
  where id = p_church_id;

  insert into public.billing_events (church_id, event_type, description)
  values (p_church_id, 'trial_extended', 'Trial extended by ' || p_days || ' days');

  return true;
end;
$$ language plpgsql security definer;
