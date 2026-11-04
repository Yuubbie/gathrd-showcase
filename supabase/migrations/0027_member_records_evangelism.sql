-- Members can see their own attendance and giving history.
-- Any logged-in person can record souls they won and follow them up.
-- Pastors, assistant pastors, and Admin see church-wide evangelism.

create table if not exists public.personal_souls (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  won_by_profile_id uuid not null references public.profiles(id),
  full_name text not null,
  phone text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'visited', 'converted', 'inactive')),
  last_contacted_at timestamptz,
  follow_up_notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

drop trigger if exists trg_personal_souls_audit on public.personal_souls;
create trigger trg_personal_souls_audit
before insert or update on public.personal_souls
for each row execute function public.set_audit_fields();

create index if not exists idx_personal_souls_church on public.personal_souls(church_id);
create index if not exists idx_personal_souls_won_by on public.personal_souls(won_by_profile_id);
create index if not exists idx_personal_souls_status on public.personal_souls(church_id, status);

alter table public.personal_souls enable row level security;

drop policy if exists "personal_souls_read_own" on public.personal_souls;
create policy "personal_souls_read_own"
on public.personal_souls for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
  and won_by_profile_id = auth.uid()
);

drop policy if exists "personal_souls_read_church" on public.personal_souls;
create policy "personal_souls_read_church"
on public.personal_souls for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
  and public.is_pastor_or_admin()
);

create or replace function public.get_my_attendance(p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_limit int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 200);

  return jsonb_build_object(
    'ok', true,
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.checked_in_at desc)
      from (
        select
          ar.id,
          ar.checked_in_at,
          ar.check_in_method as method,
          ss.id as session_id,
          ss.service_name,
          coalesce(ss.service_date, (ar.checked_in_at at time zone 'Africa/Lagos')::date) as service_date
        from public.attendance_records ar
        join public.members m
          on m.id = ar.member_id
         and m.church_id = v_church
         and m.profile_id = auth.uid()
         and m.deleted_at is null
        join public.service_sessions ss
          on ss.id = ar.service_session_id
         and ss.church_id = v_church
         and ss.deleted_at is null
        where ar.church_id = v_church
          and ar.deleted_at is null
        order by ar.checked_in_at desc
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_member_attendance(p_member_id uuid, p_limit int default 50)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_limit int;
  v_name text;
begin
  if auth.uid() is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null or p_member_id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  select full_name into v_name
    from public.members
   where id = p_member_id
     and church_id = v_church
     and deleted_at is null;

  if v_name is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  v_limit := least(greatest(coalesce(p_limit, 50), 1), 200);

  return jsonb_build_object(
    'ok', true,
    'member_id', p_member_id,
    'full_name', v_name,
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.checked_in_at desc)
      from (
        select
          ar.id,
          ar.checked_in_at,
          ar.check_in_method as method,
          ss.id as session_id,
          ss.service_name,
          coalesce(ss.service_date, (ar.checked_in_at at time zone 'Africa/Lagos')::date) as service_date
        from public.attendance_records ar
        join public.service_sessions ss
          on ss.id = ar.service_session_id
         and ss.church_id = v_church
         and ss.deleted_at is null
        where ar.member_id = p_member_id
          and ar.church_id = v_church
          and ar.deleted_at is null
        order by ar.checked_in_at desc
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_my_giving_history()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.given_at desc)
      from (
        select
          gr.id,
          'recorded'::text as source,
          gr.category::text as category,
          gr.amount,
          gr.status,
          gr.payment_method,
          gr.given_at
        from public.giving_records gr
        join public.members m
          on m.id = gr.member_id
         and m.church_id = v_church
         and m.profile_id = auth.uid()
         and m.deleted_at is null
        where gr.church_id = v_church
          and gr.deleted_at is null
          and gr.status = 'success'
        union all
        select
          g.id,
          'transfer'::text as source,
          g.fund_type as category,
          g.amount,
          g.status,
          'bank_transfer'::text as payment_method,
          g.created_at as given_at
        from public.giving g
        where g.church_id = v_church
          and g.created_by = auth.uid()
          and g.deleted_at is null
        order by given_at desc
        limit 200
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.add_personal_soul(
  p_full_name text,
  p_phone text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_name text;
  v_phone text;
  v_notes text;
  v_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_name := nullif(btrim(p_full_name), '');
  if v_name is null then
    return jsonb_build_object('ok', false, 'status', 'invalid_name');
  end if;
  if char_length(v_name) > 120 then
    return jsonb_build_object('ok', false, 'status', 'invalid_name');
  end if;

  v_phone := nullif(btrim(coalesce(p_phone, '')), '');
  if v_phone is not null and char_length(v_phone) > 40 then
    return jsonb_build_object('ok', false, 'status', 'invalid_phone');
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 500 then
    v_notes := left(v_notes, 500);
  end if;

  insert into public.personal_souls (
    church_id, won_by_profile_id, full_name, phone, notes, status
  ) values (
    v_church, auth.uid(), v_name, v_phone, v_notes, 'pending'
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'status', 'created', 'id', v_id);
end;
$$;

create or replace function public.list_my_souls()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select
          s.id,
          s.full_name,
          s.phone,
          s.notes,
          s.status,
          s.follow_up_notes,
          s.last_contacted_at,
          s.created_at
        from public.personal_souls s
        where s.church_id = v_church
          and s.won_by_profile_id = auth.uid()
          and s.deleted_at is null
        order by s.created_at desc
        limit 200
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.update_soul_follow_up(
  p_id uuid,
  p_status text,
  p_follow_up_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_row public.personal_souls%rowtype;
  v_status text;
  v_notes text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null or p_id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  v_status := nullif(btrim(coalesce(p_status, '')), '');
  if v_status not in ('pending', 'contacted', 'visited', 'converted', 'inactive') then
    return jsonb_build_object('ok', false, 'status', 'invalid_status');
  end if;

  v_notes := nullif(btrim(coalesce(p_follow_up_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 500 then
    v_notes := left(v_notes, 500);
  end if;

  select * into v_row
    from public.personal_souls
   where id = p_id
     and church_id = v_church
     and deleted_at is null;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_row.won_by_profile_id is distinct from auth.uid()
     and not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  update public.personal_souls
     set status = v_status,
         follow_up_notes = coalesce(v_notes, follow_up_notes),
         last_contacted_at = case
           when v_status in ('contacted', 'visited', 'converted') then now()
           else last_contacted_at
         end,
         updated_by = auth.uid(),
         updated_at = now()
   where id = p_id
     and church_id = v_church;

  return jsonb_build_object('ok', true, 'status', 'updated');
end;
$$;

create or replace function public.list_church_evangelism()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
begin
  if auth.uid() is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  return jsonb_build_object(
    'ok', true,
    'total', (
      select count(*) from public.personal_souls
      where church_id = v_church and deleted_at is null
    ),
    'pending', (
      select count(*) from public.personal_souls
      where church_id = v_church and deleted_at is null and status = 'pending'
    ),
    'converted', (
      select count(*) from public.personal_souls
      where church_id = v_church and deleted_at is null and status = 'converted'
    ),
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.created_at desc)
      from (
        select
          s.id,
          s.full_name,
          s.phone,
          s.notes,
          s.status,
          s.follow_up_notes,
          s.last_contacted_at,
          s.created_at,
          s.won_by_profile_id,
          coalesce(p.full_name, 'Unknown') as won_by_name
        from public.personal_souls s
        left join public.profiles p on p.id = s.won_by_profile_id
        where s.church_id = v_church
          and s.deleted_at is null
        order by s.created_at desc
        limit 300
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_my_attendance(int) to authenticated;
grant execute on function public.get_member_attendance(uuid, int) to authenticated;
grant execute on function public.get_my_giving_history() to authenticated;
grant execute on function public.add_personal_soul(text, text, text) to authenticated;
grant execute on function public.list_my_souls() to authenticated;
grant execute on function public.update_soul_follow_up(uuid, text, text) to authenticated;
grant execute on function public.list_church_evangelism() to authenticated;
