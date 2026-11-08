-- Soul follow-up: count every reach-out. Winner and pastor both see it.

alter table public.personal_souls
  add column if not exists times_reached integer not null default 0;

create table if not exists public.personal_soul_outreach (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  soul_id uuid not null references public.personal_souls(id),
  reached_by uuid not null references public.profiles(id),
  step_number integer not null check (step_number >= 1 and step_number <= 4),
  channel text not null default 'whatsapp'
    check (channel in ('whatsapp', 'call', 'sms', 'in_person')),
  created_at timestamptz not null default now()
);

create index if not exists idx_soul_outreach_soul
  on public.personal_soul_outreach(soul_id, created_at desc);
create index if not exists idx_soul_outreach_church
  on public.personal_soul_outreach(church_id, created_at desc);

alter table public.personal_soul_outreach enable row level security;

drop policy if exists "soul_outreach_read_own" on public.personal_soul_outreach;
create policy "soul_outreach_read_own"
on public.personal_soul_outreach for select
using (
  church_id = public.current_church_id()
  and reached_by = (select auth.uid())
);

drop policy if exists "soul_outreach_read_church" on public.personal_soul_outreach;
create policy "soul_outreach_read_church"
on public.personal_soul_outreach for select
using (
  church_id = public.current_church_id()
  and public.is_pastor_or_admin()
);

create or replace function public.record_soul_outreach(
  p_id uuid,
  p_channel text default 'whatsapp'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_row public.personal_souls%rowtype;
  v_channel text;
  v_step int;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null or p_id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  v_channel := coalesce(nullif(btrim(p_channel), ''), 'whatsapp');
  if v_channel not in ('whatsapp', 'call', 'sms', 'in_person') then
    return jsonb_build_object('ok', false, 'status', 'invalid_channel');
  end if;

  select * into v_row
    from public.personal_souls
   where id = p_id
     and church_id = v_church
     and deleted_at is null;

  if v_row.id is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  if v_row.won_by_profile_id is distinct from (select auth.uid())
     and not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_step := least(coalesce(v_row.times_reached, 0) + 1, 4);

  insert into public.personal_soul_outreach (
    church_id, soul_id, reached_by, step_number, channel
  ) values (
    v_church, p_id, (select auth.uid()), v_step, v_channel
  );

  update public.personal_souls
     set times_reached = coalesce(times_reached, 0) + 1,
         last_contacted_at = now(),
         status = case
           when status = 'pending' then 'contacted'
           else status
         end,
         updated_by = (select auth.uid()),
         updated_at = now()
   where id = p_id
     and church_id = v_church;

  return jsonb_build_object(
    'ok', true,
    'status', 'recorded',
    'times_reached', coalesce(v_row.times_reached, 0) + 1,
    'step_number', v_step
  );
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
  if (select auth.uid()) is null then
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
          s.times_reached,
          s.created_at
        from public.personal_souls s
        where s.church_id = v_church
          and s.won_by_profile_id = (select auth.uid())
          and s.deleted_at is null
        order by s.created_at desc
        limit 200
      ) x
    ), '[]'::jsonb)
  );
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
  if (select auth.uid()) is null or not public.is_pastor_or_admin() then
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
          s.times_reached,
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

revoke all on function public.record_soul_outreach(uuid, text) from public, anon;
grant execute on function public.record_soul_outreach(uuid, text) to authenticated;
grant execute on function public.list_my_souls() to authenticated;
grant execute on function public.list_church_evangelism() to authenticated;

notify pgrst, 'reload schema';
