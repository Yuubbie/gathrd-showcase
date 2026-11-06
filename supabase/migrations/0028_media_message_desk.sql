-- Media team can post a short summary of the pastor's message.
-- Everyone in the church can read today's or yesterday's highlight.

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'church_role'
  ) and not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'church_role'
      and e.enumlabel = 'media_team'
  ) then
    alter type public.church_role add value 'media_team';
  end if;
end $$;

create table if not exists public.message_highlights (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  service_date date not null,
  title text not null,
  summary text not null,
  preacher_name text,
  scripture text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

drop trigger if exists trg_message_highlights_audit on public.message_highlights;
create trigger trg_message_highlights_audit
before insert or update on public.message_highlights
for each row execute function public.set_audit_fields();

create unique index if not exists idx_message_highlights_church_date
  on public.message_highlights(church_id, service_date)
  where deleted_at is null;

create index if not exists idx_message_highlights_church
  on public.message_highlights(church_id, service_date desc);

alter table public.message_highlights enable row level security;

drop policy if exists "message_highlights_read_church" on public.message_highlights;
create policy "message_highlights_read_church"
on public.message_highlights for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
);

create or replace function public.can_post_message_highlight()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role()::text in (
    'senior_pastor', 'assistant_pastor', 'church_admin', 'media_team'
  );
$$;

create or replace function public.upsert_message_highlight(
  p_service_date date,
  p_title text,
  p_summary text,
  p_preacher_name text default null,
  p_scripture text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_title text;
  v_summary text;
  v_preacher text;
  v_scripture text;
  v_id uuid;
begin
  if auth.uid() is null or not public.can_post_message_highlight() then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  if p_service_date is null then
    return jsonb_build_object('ok', false, 'status', 'invalid_date');
  end if;
  if p_service_date > (timezone('Africa/Lagos', now()))::date then
    return jsonb_build_object('ok', false, 'status', 'invalid_date');
  end if;
  if p_service_date < (timezone('Africa/Lagos', now()))::date - 30 then
    return jsonb_build_object('ok', false, 'status', 'invalid_date');
  end if;

  v_title := nullif(btrim(coalesce(p_title, '')), '');
  v_summary := nullif(btrim(coalesce(p_summary, '')), '');
  if v_title is null or char_length(v_title) > 160 then
    return jsonb_build_object('ok', false, 'status', 'invalid_title');
  end if;
  if v_summary is null or char_length(v_summary) > 4000 then
    return jsonb_build_object('ok', false, 'status', 'invalid_summary');
  end if;

  v_preacher := nullif(btrim(coalesce(p_preacher_name, '')), '');
  if v_preacher is not null and char_length(v_preacher) > 120 then
    return jsonb_build_object('ok', false, 'status', 'invalid_preacher');
  end if;

  v_scripture := nullif(btrim(coalesce(p_scripture, '')), '');
  if v_scripture is not null and char_length(v_scripture) > 160 then
    return jsonb_build_object('ok', false, 'status', 'invalid_scripture');
  end if;

  update public.message_highlights
  set
    title = v_title,
    summary = v_summary,
    preacher_name = v_preacher,
    scripture = v_scripture,
    deleted_at = null,
    deleted_by = null
  where church_id = v_church
    and service_date = p_service_date
    and deleted_at is null
  returning id into v_id;

  if v_id is null then
    insert into public.message_highlights (
      church_id, service_date, title, summary, preacher_name, scripture
    ) values (
      v_church, p_service_date, v_title, v_summary, v_preacher, v_scripture
    )
    returning id into v_id;
  end if;

  return jsonb_build_object('ok', true, 'status', 'saved', 'id', v_id);
end;
$$;

create or replace function public.list_message_highlights(p_limit int default 20)
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

  v_limit := least(greatest(coalesce(p_limit, 20), 1), 50);

  return jsonb_build_object(
    'ok', true,
    'can_post', public.can_post_message_highlight(),
    'today', (timezone('Africa/Lagos', now()))::date,
    'yesterday', (timezone('Africa/Lagos', now()))::date - 1,
    'rows', coalesce((
      select jsonb_agg(row_to_json(x) order by x.service_date desc)
      from (
        select
          h.id,
          h.service_date,
          h.title,
          h.summary,
          h.preacher_name,
          h.scripture,
          h.updated_at,
          p.full_name as posted_by
        from public.message_highlights h
        left join public.profiles p on p.id = h.updated_by
        where h.church_id = v_church
          and h.deleted_at is null
        order by h.service_date desc
        limit v_limit
      ) x
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_latest_message_highlights()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_today jsonb;
  v_yesterday jsonb;
  v_today_date date;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_today_date := (timezone('Africa/Lagos', now()))::date;

  select jsonb_build_object(
    'id', h.id,
    'service_date', h.service_date,
    'title', h.title,
    'summary', h.summary,
    'preacher_name', h.preacher_name,
    'scripture', h.scripture,
    'updated_at', h.updated_at
  )
  into v_today
  from public.message_highlights h
  where h.church_id = v_church
    and h.service_date = v_today_date
    and h.deleted_at is null
  limit 1;

  select jsonb_build_object(
    'id', h.id,
    'service_date', h.service_date,
    'title', h.title,
    'summary', h.summary,
    'preacher_name', h.preacher_name,
    'scripture', h.scripture,
    'updated_at', h.updated_at
  )
  into v_yesterday
  from public.message_highlights h
  where h.church_id = v_church
    and h.service_date = v_today_date - 1
    and h.deleted_at is null
  limit 1;

  return jsonb_build_object(
    'ok', true,
    'can_post', public.can_post_message_highlight(),
    'today', v_today,
    'yesterday', v_yesterday
  );
end;
$$;

grant select on public.message_highlights to authenticated;
grant execute on function public.can_post_message_highlight() to authenticated;
grant execute on function public.upsert_message_highlight(date, text, text, text, text) to authenticated;
grant execute on function public.list_message_highlights(int) to authenticated;
grant execute on function public.get_latest_message_highlights() to authenticated;
