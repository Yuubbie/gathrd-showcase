-- Per-church scheduled alerts (service/activity reminders, birthday celebrants)
-- and an in-app notifications feed for the bell.
--
-- Everything is OFF until a church admin sets it up under Settings > Alerts.
-- Times are West Africa Time (Africa/Lagos).

-- 1. Church-level alert settings -------------------------------------------------
create table if not exists public.church_alert_settings (
  church_id uuid primary key references public.churches(id),
  birthday_enabled boolean not null default false,
  birthday_hour smallint not null default 7 check (birthday_hour between 0 and 23),
  updated_at timestamptz not null default now()
);

-- 2. Activities a church wants reminders for -----------------------------------
create table if not exists public.church_alert_activities (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  name text not null check (length(btrim(name)) between 1 and 80),
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  alert_1_minutes_before integer check (alert_1_minutes_before between 10 and 1440),
  alert_2_minutes_before integer check (alert_2_minutes_before between 10 and 1440),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_church_alert_activities_church
  on public.church_alert_activities(church_id)
  where deleted_at is null;

-- 3. Church-wide alert feed shown in the bell (separate from the per-member
--    public.notifications table used for duty/event reminders) ---------------------------------------
create table if not exists public.church_notifications (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  kind text not null,
  title text not null,
  body text not null,
  url text not null default '/dashboard',
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  constraint church_notifications_dedupe unique (church_id, dedupe_key)
);

create index if not exists idx_church_notifications_church_created
  on public.church_notifications(church_id, created_at desc);

create table if not exists public.church_notification_reads (
  profile_id uuid not null references public.profiles(id),
  notification_id uuid not null references public.church_notifications(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (profile_id, notification_id)
);

-- 4. Row level security ---------------------------------------------------------
alter table public.church_alert_settings enable row level security;
alter table public.church_alert_activities enable row level security;
alter table public.church_notifications enable row level security;
alter table public.church_notification_reads enable row level security;

revoke all on public.church_alert_settings from public, anon, authenticated;
revoke all on public.church_alert_activities from public, anon, authenticated;
revoke all on public.church_notifications from public, anon, authenticated;
revoke all on public.church_notification_reads from public, anon, authenticated;

grant select on public.church_alert_settings to authenticated;
grant select on public.church_alert_activities to authenticated;
grant select on public.church_notifications to authenticated;
grant select on public.church_notification_reads to authenticated;

drop policy if exists "alert_settings_staff_read" on public.church_alert_settings;
create policy "alert_settings_staff_read"
on public.church_alert_settings for select
using (church_id = public.current_church_id() and public.is_pastor_or_admin());

drop policy if exists "alert_activities_staff_read" on public.church_alert_activities;
create policy "alert_activities_staff_read"
on public.church_alert_activities for select
using (church_id = public.current_church_id() and public.is_pastor_or_admin() and deleted_at is null);

drop policy if exists "church_notifications_church_read" on public.church_notifications;
create policy "church_notifications_church_read"
on public.church_notifications for select
using (church_id = public.current_church_id());

drop policy if exists "church_notification_reads_own" on public.church_notification_reads;
create policy "church_notification_reads_own"
on public.church_notification_reads for select
using (profile_id = (select auth.uid()));

-- 5. Writes go through functions that check the caller's role -------------------
create or replace function public.save_alert_settings(
  p_birthday_enabled boolean,
  p_birthday_hour integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid := public.current_church_id();
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_church is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if p_birthday_hour is null or p_birthday_hour < 0 or p_birthday_hour > 23 then
    return jsonb_build_object('ok', false, 'error', 'bad_hour');
  end if;

  insert into public.church_alert_settings (church_id, birthday_enabled, birthday_hour, updated_at)
  values (v_church, coalesce(p_birthday_enabled, false), p_birthday_hour, now())
  on conflict (church_id) do update
    set birthday_enabled = excluded.birthday_enabled,
        birthday_hour = excluded.birthday_hour,
        updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.save_alert_activity(
  p_id uuid,
  p_name text,
  p_weekday integer,
  p_start_time time,
  p_alert_1 integer,
  p_alert_2 integer,
  p_enabled boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid := public.current_church_id();
  v_id uuid;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_church is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;
  if p_name is null or length(btrim(p_name)) = 0 or length(btrim(p_name)) > 80
     or p_weekday is null or p_weekday < 0 or p_weekday > 6
     or p_start_time is null
     or (p_alert_1 is not null and (p_alert_1 < 10 or p_alert_1 > 1440))
     or (p_alert_2 is not null and (p_alert_2 < 10 or p_alert_2 > 1440)) then
    return jsonb_build_object('ok', false, 'error', 'bad_input');
  end if;

  if p_id is null then
    if (select count(*) from public.church_alert_activities
         where church_id = v_church and deleted_at is null) >= 30 then
      return jsonb_build_object('ok', false, 'error', 'too_many');
    end if;
    insert into public.church_alert_activities
      (church_id, name, weekday, start_time, alert_1_minutes_before, alert_2_minutes_before, enabled)
    values
      (v_church, btrim(p_name), p_weekday, p_start_time, p_alert_1, p_alert_2, coalesce(p_enabled, true))
    returning id into v_id;
  else
    update public.church_alert_activities
       set name = btrim(p_name),
           weekday = p_weekday,
           start_time = p_start_time,
           alert_1_minutes_before = p_alert_1,
           alert_2_minutes_before = p_alert_2,
           enabled = coalesce(p_enabled, true),
           updated_at = now()
     where id = p_id and church_id = v_church and deleted_at is null
    returning id into v_id;
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'not_found');
    end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.delete_alert_activity(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid := public.current_church_id();
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if v_church is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  update public.church_alert_activities
     set deleted_at = now(), updated_at = now()
   where id = p_id and church_id = v_church and deleted_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.mark_church_notifications_read(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  insert into public.church_notification_reads (profile_id, notification_id)
  select v_uid, n.id
    from public.church_notifications n
   where n.id = any(coalesce(p_ids, '{}'::uuid[]))
     and n.church_id = public.current_church_id()
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

-- 6. Birthday lookup for the scheduler (service role only) ----------------------
create or replace function public.birthday_members(p_church_id uuid, p_month integer, p_day integer)
returns table (full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select m.full_name
    from public.members m
   where m.church_id = p_church_id
     and m.deleted_at is null
     and m.status = 'active'
     and m.age_group = 'adult'
     and m.date_of_birth is not null
     and extract(month from m.date_of_birth) = p_month
     and extract(day from m.date_of_birth) = p_day
   order by m.full_name;
$$;

revoke all on function public.birthday_members(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.birthday_members(uuid, integer, integer) to service_role;

revoke all on function public.save_alert_settings(boolean, integer) from public, anon;
grant execute on function public.save_alert_settings(boolean, integer) to authenticated;
revoke all on function public.save_alert_activity(uuid, text, integer, time, integer, integer, boolean) from public, anon;
grant execute on function public.save_alert_activity(uuid, text, integer, time, integer, integer, boolean) to authenticated;
revoke all on function public.delete_alert_activity(uuid) from public, anon;
grant execute on function public.delete_alert_activity(uuid) to authenticated;
revoke all on function public.mark_church_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_church_notifications_read(uuid[]) to authenticated;

notify pgrst, 'reload schema';
