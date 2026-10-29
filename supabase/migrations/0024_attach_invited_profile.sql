-- Invited people must join the church that sent the invite.
-- Never create a new church for an invite. Re-invite attaches an
-- existing login to this church.

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
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.church_role, 'member');

  begin
    if new.raw_user_meta_data ? 'church_id'
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
  p_role public.church_role,
  p_full_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_user_id is null or p_church_id is null then
    return jsonb_build_object('ok', false, 'error', 'missing');
  end if;

  if not exists (
    select 1 from public.churches c
     where c.id = p_church_id
       and c.deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'church_not_found');
  end if;

  update public.profiles
     set church_id = p_church_id,
         role = p_role,
         full_name = coalesce(nullif(trim(p_full_name), ''), full_name)
   where id = p_user_id;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    insert into public.profiles (id, church_id, role, full_name)
    values (
      p_user_id,
      p_church_id,
      p_role,
      coalesce(nullif(trim(p_full_name), ''), 'New User')
    );
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.attach_invited_profile(uuid, uuid, public.church_role, text) from public, anon, authenticated;
grant execute on function public.attach_invited_profile(uuid, uuid, public.church_role, text) to service_role;
