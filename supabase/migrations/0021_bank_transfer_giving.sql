-- Bank-transfer giving for EVERY church (current and future signups).
-- Does not drop giving_records (cash / old Paystack log).
-- Does not hard-code any church id.

create or replace function public.lock_church_id()
returns trigger
language plpgsql
as $$
begin
  if new.church_id is distinct from old.church_id then
    raise exception 'church_id cannot be changed';
  end if;
  return new;
end;
$$;

alter table public.giving
  add column if not exists given_by_name text,
  add column if not exists given_by_phone text,
  add column if not exists given_by_email text,
  add column if not exists verified_by uuid references auth.users(id),
  add column if not exists verified_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

update public.giving
set church_id = (
  select m.church_id from public.members m where m.id = giving.member_id limit 1
)
where church_id is null and member_id is not null;

do $$
begin
  if exists (select 1 from public.giving where church_id is null) then
    raise exception 'giving.church_id still has null rows; will not force NOT NULL';
  end if;
end $$;

alter table public.giving
  alter column church_id set not null;

alter table public.giving
  drop constraint if exists giving_status_check;
alter table public.giving
  add constraint giving_status_check
  check (status in ('pending', 'verified', 'rejected'));

alter table public.giving
  drop constraint if exists giving_amount_positive;
alter table public.giving
  add constraint giving_amount_positive
  check (amount > 0);

create index if not exists idx_giving_church on public.giving(church_id) where deleted_at is null;
create index if not exists idx_giving_created_by on public.giving(created_by) where deleted_at is null;
create index if not exists idx_giving_status on public.giving(church_id, status) where deleted_at is null;

drop trigger if exists trg_giving_church_id_lock on public.giving;
create trigger trg_giving_church_id_lock
  before update of church_id on public.giving
  for each row execute function public.lock_church_id();

alter table public.giving enable row level security;
alter table public.giving force row level security;

drop policy if exists "giving_member_read_own" on public.giving;
drop policy if exists "giving_finance_read_church" on public.giving;
drop policy if exists "giving_member_insert" on public.giving;
drop policy if exists "giving_finance_update" on public.giving;

create policy "giving_member_read_own"
on public.giving for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
  and created_by = auth.uid()
);

create policy "giving_finance_read_church"
on public.giving for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
  and public.current_role() in ('senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin')
);

revoke all on public.giving from anon, public;
grant select on public.giving to authenticated;

create or replace function public.can_review_giving()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in (
    'senior_pastor', 'assistant_pastor', 'church_admin', 'finance_admin'
  );
$$;

create or replace function public.get_my_church_give_accounts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_name text;
begin
  v_church := public.current_church_id();
  if v_church is null or auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  select name into v_name from public.churches where id = v_church and deleted_at is null;

  return jsonb_build_object(
    'ok', true,
    'church_id', v_church,
    'church_name', v_name,
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id,
        'label', coalesce(nullif(a.purpose, ''), nullif(a.label, ''), 'Giving'),
        'bank_name', a.bank_name,
        'account_number', a.account_number,
        'account_name', a.account_name
      ) order by a.sort_order, a.created_at)
      from public.church_bank_accounts a
      where a.church_id = v_church
        and a.deleted_at is null
        and coalesce(a.is_active, true) = true
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_bank_transfer(
  p_amount numeric,
  p_fund_type text,
  p_bank_account_id uuid,
  p_receipt_path text,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_profile public.profiles%rowtype;
  v_member_id uuid;
  v_account_church uuid;
  v_id uuid;
  v_duplicate boolean := false;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_signed_in');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'not_in_church');
  end if;

  if p_amount is null or p_amount < 100 then
    return jsonb_build_object('ok', false, 'error', 'amount');
  end if;

  if p_fund_type not in ('tithe', 'offering', 'thanksgiving', 'building_project', 'welfare') then
    return jsonb_build_object('ok', false, 'error', 'fund_type');
  end if;

  if p_receipt_path is null
     or p_receipt_path not like v_church::text || '/' || auth.uid()::text || '/%' then
    return jsonb_build_object('ok', false, 'error', 'receipt');
  end if;

  select church_id into v_account_church
  from public.church_bank_accounts
  where id = p_bank_account_id
    and deleted_at is null
    and coalesce(is_active, true) = true;

  if v_account_church is distinct from v_church then
    return jsonb_build_object('ok', false, 'error', 'bank_account');
  end if;

  select * into v_profile from public.profiles where id = auth.uid();

  select id into v_member_id
  from public.members
  where church_id = v_church
    and profile_id = auth.uid()
    and deleted_at is null
  limit 1;

  select exists (
    select 1 from public.giving g
    where g.church_id = v_church
      and g.deleted_at is null
      and g.created_by = auth.uid()
      and g.amount = p_amount
      and g.bank_account_id = p_bank_account_id
      and g.created_at::date = timezone('Africa/Lagos', now())::date
      and g.status in ('pending', 'verified')
  ) into v_duplicate;

  insert into public.giving (
    church_id, member_id, amount, fund_type, bank_account_id,
    receipt_url, status, notes, payment_method,
    given_by_name, given_by_phone, given_by_email,
    created_by, created_at, updated_at
  ) values (
    v_church, v_member_id, p_amount, p_fund_type, p_bank_account_id,
    p_receipt_path, 'pending', nullif(trim(p_notes), ''), 'bank_transfer',
    v_profile.full_name, v_profile.phone, null,
    auth.uid(), now(), now()
  )
  returning id into v_id;

  begin
    insert into public.audit_logs (church_id, user_id, action, table_name, record_id, new_value)
    values (v_church, auth.uid(), 'insert', 'giving', v_id, jsonb_build_object('status', 'pending', 'amount', p_amount));
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true, 'id', v_id, 'duplicate', v_duplicate);
end;
$$;

create or replace function public.get_my_bank_transfers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
begin
  v_church := public.current_church_id();
  if auth.uid() is null or v_church is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(x) order by x.created_at desc)
    from (
      select
        g.id,
        g.amount,
        g.fund_type,
        g.status,
        g.receipt_url as receipt_path,
        g.rejection_reason,
        g.created_at,
        g.verified_at,
        a.bank_name,
        a.account_name,
        coalesce(nullif(a.purpose, ''), nullif(a.label, ''), 'Giving') as account_label
      from public.giving g
      left join public.church_bank_accounts a on a.id = g.bank_account_id
      where g.church_id = v_church
        and g.created_by = auth.uid()
        and g.deleted_at is null
      order by g.created_at desc
      limit 100
    ) x
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_church_bank_transfers()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
begin
  v_church := public.current_church_id();
  if auth.uid() is null or v_church is null or not public.can_review_giving() then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'pending_count', (
      select count(*) from public.giving
      where church_id = v_church and deleted_at is null and status = 'pending'
    ),
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select
          g.id,
          g.amount,
          g.fund_type,
          g.status,
          g.receipt_url as receipt_path,
          g.notes,
          g.rejection_reason,
          g.given_by_name,
          g.given_by_phone,
          g.created_at,
          g.verified_at,
          g.verified_by,
          a.bank_name,
          a.account_name,
          coalesce(nullif(a.purpose, ''), nullif(a.label, ''), 'Giving') as account_label
        from public.giving g
        left join public.church_bank_accounts a on a.id = g.bank_account_id
        where g.church_id = v_church
          and g.deleted_at is null
        order by g.created_at desc
        limit 200
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.review_bank_transfer(
  p_id uuid,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_row public.giving%rowtype;
begin
  v_church := public.current_church_id();
  if auth.uid() is null or v_church is null or not public.can_review_giving() then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  if p_action not in ('verified', 'rejected') then
    return jsonb_build_object('ok', false, 'error', 'action');
  end if;

  if p_action = 'rejected' and length(trim(coalesce(p_reason, ''))) < 3 then
    return jsonb_build_object('ok', false, 'error', 'reason');
  end if;

  select * into v_row
  from public.giving
  where id = p_id and church_id = v_church and deleted_at is null;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_row.status is distinct from 'pending' then
    return jsonb_build_object('ok', false, 'error', 'already_reviewed');
  end if;

  update public.giving
  set
    status = p_action,
    verified_by = auth.uid(),
    verified_at = now(),
    rejection_reason = case when p_action = 'rejected' then trim(p_reason) else null end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_id and church_id = v_church;

  begin
    insert into public.audit_logs (church_id, user_id, action, table_name, record_id, new_value)
    values (v_church, auth.uid(), 'update', 'giving', p_id, jsonb_build_object('status', p_action));
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.get_my_church_give_accounts() to authenticated;
grant execute on function public.submit_bank_transfer(numeric, text, uuid, text, text) to authenticated;
grant execute on function public.get_my_bank_transfers() to authenticated;
grant execute on function public.get_church_bank_transfers() to authenticated;
grant execute on function public.review_bank_transfer(uuid, text, text) to authenticated;
grant execute on function public.can_review_giving() to authenticated;

revoke execute on function public.get_my_church_give_accounts() from anon, public;
revoke execute on function public.submit_bank_transfer(numeric, text, uuid, text, text) from anon, public;
revoke execute on function public.get_my_bank_transfers() from anon, public;
revoke execute on function public.get_church_bank_transfers() from anon, public;
revoke execute on function public.review_bank_transfer(uuid, text, text) from anon, public;

update storage.buckets
set public = false
where id = 'giving-receipts';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'giving-receipts',
  'giving-receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

drop policy if exists "Public Read Giving Receipts" on storage.objects;
drop policy if exists "Public Upload Giving Receipts" on storage.objects;
drop policy if exists "giving_receipts_insert_own" on storage.objects;
drop policy if exists "giving_receipts_select_own_or_finance" on storage.objects;

create policy "giving_receipts_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'giving-receipts'
  and (storage.foldername(name))[1] = public.current_church_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "giving_receipts_select_own_or_finance"
on storage.objects for select
to authenticated
using (
  bucket_id = 'giving-receipts'
  and (storage.foldername(name))[1] = public.current_church_id()::text
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.can_review_giving()
  )
);
