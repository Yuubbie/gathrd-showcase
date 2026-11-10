-- Re-grant save_push_subscription and relax length checks so phones can subscribe.

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

  select church_id into v_church
    from public.profiles
   where id = v_uid
     and deleted_at is null;

  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_endpoint is null or length(p_endpoint) < 20 or length(p_endpoint) > 4096
     or p_p256dh is null or p_auth is null
     or length(p_p256dh) < 20 or length(p_p256dh) > 512
     or length(p_auth) < 8 or length(p_auth) > 512 then
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

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
