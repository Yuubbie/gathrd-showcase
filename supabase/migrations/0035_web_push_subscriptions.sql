-- Phone lock-screen alerts for installed Gathrd (Web Push).
-- After this SQL, set VAPID keys on the project and deploy send-push.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  profile_id uuid not null references public.profiles(id),
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz,
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

create trigger trg_push_subscriptions_audit
before insert or update on public.push_subscriptions
for each row execute function public.set_audit_fields();

create index if not exists idx_push_subscriptions_profile
  on public.push_subscriptions(profile_id)
  where deleted_at is null;

create index if not exists idx_push_subscriptions_church
  on public.push_subscriptions(church_id)
  where deleted_at is null;

alter table public.push_subscriptions enable row level security;

revoke all on public.push_subscriptions from public, anon, authenticated;

create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_church uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_endpoint is null or length(p_endpoint) < 20 or length(p_endpoint) > 2048
     or p_p256dh is null or p_auth is null
     or length(p_p256dh) > 200 or length(p_auth) > 200 then
    return jsonb_build_object('ok', false, 'error', 'bad_subscription');
  end if;

  insert into public.push_subscriptions (
    church_id, profile_id, endpoint, p256dh, auth, user_agent, deleted_at
  ) values (
    v_church, v_uid, p_endpoint, p_p256dh, p_auth, left(coalesce(p_user_agent, ''), 300), null
  )
  on conflict (endpoint) do update
    set church_id = excluded.church_id,
        profile_id = excluded.profile_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        deleted_at = null,
        deleted_by = null;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
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

  update public.push_subscriptions
     set deleted_at = now(),
         deleted_by = v_uid
   where endpoint = p_endpoint
     and profile_id = v_uid
     and deleted_at is null;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.delete_push_subscription(text) to authenticated;

notify pgrst, 'reload schema';
