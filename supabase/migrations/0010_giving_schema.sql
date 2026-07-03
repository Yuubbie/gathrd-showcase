-- ============================================================
-- GATHRD — Week 4 Migration
-- Module 5: Tithe & Giving Management + Offering Counting Sheet
-- Blueprint Section 4
-- ============================================================

-- ------------------------------------------------------------
-- 0. Church settlement bank details — needed to create their
--    Paystack subaccount so giving settles directly to them.
-- ------------------------------------------------------------
alter table public.churches
  add column settlement_bank_code text,
  add column settlement_bank_name text,
  add column settlement_account_number text,
  add column settlement_account_name text,
  add column paystack_subaccount_code text,
  add column giving_slug text unique not null default substr(md5(random()::text || clock_timestamp()::text || 'giving'), 1, 10);

-- ------------------------------------------------------------
-- 1. Giving categories — fixed set, per the product owner's decision
-- ------------------------------------------------------------
create type public.giving_category as enum (
  'tithe', 'offering', 'thanksgiving', 'building_project', 'welfare'
);

-- ------------------------------------------------------------
-- 2. giving_records — every gift, cash or online, in one table
-- ------------------------------------------------------------
create table public.giving_records (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  member_id uuid references public.members(id), -- nullable: anonymous/visitor giving

  category public.giving_category not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',

  payment_method text not null check (payment_method in ('cash', 'card', 'bank_transfer', 'ussd', 'other')),
  source text not null check (source in ('paystack', 'manual')),
  paystack_reference text unique,
  status text not null default 'success' check (status in ('pending', 'success', 'failed')),

  -- For cash gifts not linked to a member record
  given_by_name text,
  given_by_phone text,
  tithe_card_number text,
  notes text,

  given_at timestamptz not null default now(),

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_giving_records_audit
before insert or update on public.giving_records
for each row execute function public.set_audit_fields();

create index idx_giving_records_church on public.giving_records(church_id);
create index idx_giving_records_member on public.giving_records(member_id);
create index idx_giving_records_category on public.giving_records(category);
create index idx_giving_records_given_at on public.giving_records(given_at);

-- ------------------------------------------------------------
-- 3. Offering Counting Sheet — multi-counter reconciliation
-- ------------------------------------------------------------
create table public.offering_counting_sessions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  service_name text not null, -- "Sunday Morning", "Sunday Evening", "Midweek", "Special Service"
  service_date date not null default current_date,
  status text not null default 'open' check (status in ('open', 'confirmed', 'discrepancy')),
  confirmed_amount numeric(12,2),
  confirmed_at timestamptz,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create trigger trg_counting_sessions_audit
before insert or update on public.offering_counting_sessions
for each row execute function public.set_audit_fields();

create table public.offering_counting_entries (
  id uuid primary key default gen_random_uuid(),
  counting_session_id uuid not null references public.offering_counting_sessions(id) on delete cascade,
  counted_by uuid not null references public.profiles(id),
  tallied_amount numeric(12,2) not null check (tallied_amount >= 0),
  submitted_at timestamptz not null default now()
);

create index idx_counting_entries_session on public.offering_counting_entries(counting_session_id);

-- ------------------------------------------------------------
-- 5. Public lookup for the Give page — resolves a giving slug to
--    just what's needed to render the page and initiate a payment.
--    Never exposes the church's full row (settlement account
--    number, etc.) to the public.
-- ------------------------------------------------------------
create or replace function public.get_church_giving_info_by_slug(p_slug text)
returns table (church_id uuid, church_name text, has_giving_enabled boolean)
language sql
security definer
stable
as $$
  select id, name, (paystack_subaccount_code is not null)
  from public.churches
  where giving_slug = p_slug and deleted_at is null;
$$;

grant execute on function public.get_church_giving_info_by_slug to anon, authenticated;

create or replace function public.get_giving_status_by_reference(p_reference text)
returns table (status text, amount numeric, category public.giving_category, church_name text)
language sql
security definer
stable
as $$
  select g.status, g.amount, g.category, c.name
  from public.giving_records g
  join public.churches c on c.id = g.church_id
  where g.paystack_reference = p_reference;
$$;

grant execute on function public.get_giving_status_by_reference to anon, authenticated;
--    Blueprint rule: "if amounts match, recording is confirmed and
--    locked. If amounts do not match, system flags discrepancy."
-- ------------------------------------------------------------
create or replace function public.reconcile_counting_session()
returns trigger as $$
declare
  v_session_id uuid;
  v_entry_count int;
  v_distinct_amounts int;
  v_agreed_amount numeric(12,2);
begin
  v_session_id := new.counting_session_id;

  select count(*), count(distinct tallied_amount)
  into v_entry_count, v_distinct_amounts
  from public.offering_counting_entries
  where counting_session_id = v_session_id;

  -- Need at least 2 independent counts before we can reconcile anything
  if v_entry_count >= 2 then
    if v_distinct_amounts = 1 then
      select tallied_amount into v_agreed_amount
      from public.offering_counting_entries
      where counting_session_id = v_session_id
      limit 1;

      update public.offering_counting_sessions
      set status = 'confirmed', confirmed_amount = v_agreed_amount, confirmed_at = now()
      where id = v_session_id;
    else
      update public.offering_counting_sessions
      set status = 'discrepancy', confirmed_amount = null, confirmed_at = null
      where id = v_session_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger trg_reconcile_after_entry
after insert on public.offering_counting_entries
for each row execute function public.reconcile_counting_session();

-- Once a session is confirmed, lock it — no further entries allowed
create or replace function public.block_entries_on_confirmed_session()
returns trigger as $$
declare
  v_status text;
begin
  select status into v_status from public.offering_counting_sessions where id = new.counting_session_id;
  if v_status = 'confirmed' then
    raise exception 'This counting sheet is already confirmed and locked.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_block_entries_on_confirmed
before insert on public.offering_counting_entries
for each row execute function public.block_entries_on_confirmed_session();
