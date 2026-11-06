-- One church join link for every member login.
-- Pastors and admins raise privilege later. Members cannot change their own role.

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if current_setting('gathrd.allow_role_change', true) = 'on' then
    return new;
  end if;
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  new.role := old.role;
  new.church_id := old.church_id;
  return new;
end;
$$;

drop trigger if exists trg_protect_profile_identity on public.profiles;
create trigger trg_protect_profile_identity
before update on public.profiles
for each row execute function public.protect_profile_identity();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church_id uuid;
  v_invited_church uuid;
begin
  begin
    v_role := coalesce((new.raw_user_meta_data->>'role')::public.church_role, 'member');
  exception when others then
    v_role := 'member';
  end;

  begin
    if coalesce(auth.role(), '') = 'service_role'
       and new.raw_user_meta_data ? 'church_id'
       and coalesce(new.raw_user_meta_data->>'church_id', '') <> '' then
      v_invited_church := (new.raw_user_meta_data->>'church_id')::uuid;
    end if;
  exception when others then
    v_invited_church := null;
  end;

  if v_invited_church is not null
     and exists (
       select 1 from public.churches c
        where c.id = v_invited_church
          and c.deleted_at is null
     ) then
    v_church_id := v_invited_church;
  elsif v_role = 'senior_pastor' and v_invited_church is null then
    insert into public.churches (name)
    values (coalesce(new.raw_user_meta_data->>'church_name', 'My Church'))
    returning id into v_church_id;
  end if;

  insert into public.profiles (id, full_name, role, church_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    v_role,
    v_church_id
  );

  return new;
end;
$$;

create or replace function public.attach_invited_profile(
  p_user_id uuid,
  p_church_id uuid,
  p_role text,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_role public.church_role;
  v_name text;
begin
  if p_user_id is null or p_church_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing');
  end if;

  begin
    v_role := coalesce(nullif(trim(p_role), ''), 'member')::public.church_role;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end;

  v_name := coalesce(nullif(trim(p_full_name), ''), 'New User');

  if not exists (
    select 1 from public.churches c
     where c.id = p_church_id
       and c.deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'church_not_found');
  end if;

  perform set_config('gathrd.allow_role_change', 'on', true);

  update public.profiles
     set church_id = p_church_id,
         role = v_role,
         full_name = case
           when nullif(trim(p_full_name), '') is null then full_name
           else v_name
         end
   where id = p_user_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.profiles (id, church_id, role, full_name)
    values (p_user_id, p_church_id, v_role, v_name);
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.attach_invited_profile(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.attach_invited_profile(uuid, uuid, text, text) to service_role;

create or replace function public.list_church_logins()
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
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_church := public.current_church_id();

  return jsonb_build_object(
    'ok', true,
    'me', (select auth.uid()),
    'can_grant_senior', public.current_role() = 'senior_pastor',
    'rows', coalesce((
      select jsonb_agg(row_to_json(t) order by t.full_name)
      from (
        select
          p.id,
          p.full_name,
          p.role::text as role,
          (
            select m.email
            from public.members m
            where m.profile_id = p.id
              and m.deleted_at is null
            order by m.created_at desc
            limit 1
          ) as email,
          p.created_at
        from public.profiles p
        where p.church_id = v_church
          and p.deleted_at is null
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.list_church_logins() from public, anon;
grant execute on function public.list_church_logins() to authenticated;

create or replace function public.set_church_member_role(
  p_user_id uuid,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := (select auth.uid());
  v_caller_role public.church_role;
  v_church uuid;
  v_target public.profiles%rowtype;
  v_new public.church_role;
  v_senior_count int;
begin
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_user_id is null or p_user_id = v_caller then
    return jsonb_build_object('ok', false, 'error', 'cannot_change_own_role');
  end if;

  begin
    v_new := nullif(trim(p_role), '')::public.church_role;
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end;

  if v_new is null then
    return jsonb_build_object('ok', false, 'error', 'bad_role');
  end if;

  v_caller_role := public.current_role();
  v_church := public.current_church_id();

  select * into v_target
  from public.profiles
  where id = p_user_id
    and church_id = v_church
    and deleted_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_target.role = v_new then
    return jsonb_build_object('ok', true, 'role', v_new::text);
  end if;

  if v_new = 'senior_pastor' or v_target.role = 'senior_pastor' then
    if v_caller_role <> 'senior_pastor' then
      return jsonb_build_object('ok', false, 'error', 'only_senior_pastor');
    end if;
  end if;

  if v_target.role = 'senior_pastor' and v_new <> 'senior_pastor' then
    select count(*) into v_senior_count
    from public.profiles
    where church_id = v_church
      and role = 'senior_pastor'
      and deleted_at is null;
    if coalesce(v_senior_count, 0) <= 1 then
      return jsonb_build_object('ok', false, 'error', 'last_senior_pastor');
    end if;
  end if;

  perform set_config('gathrd.allow_role_change', 'on', true);

  update public.profiles
     set role = v_new
   where id = p_user_id
     and church_id = v_church;

  insert into public.audit_logs (church_id, user_id, action, table_name, record_id, new_value)
  values (
    v_church,
    v_caller,
    'update',
    'profiles',
    p_user_id,
    jsonb_build_object('role', v_new::text, 'previous_role', v_target.role::text)
  );

  return jsonb_build_object('ok', true, 'role', v_new::text);
end;
$$;

revoke all on function public.set_church_member_role(uuid, text) from public, anon;
grant execute on function public.set_church_member_role(uuid, text) to authenticated;

notify pgrst, 'reload schema';
