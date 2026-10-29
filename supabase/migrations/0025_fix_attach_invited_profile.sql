-- Re-invite must attach an existing login to this church.
-- p_role is text so Edge Functions can call it without enum overload errors.
-- Do not lock profiles.church_id (invites must be able to set it).

drop trigger if exists trg_profiles_church_id_lock on public.profiles;

drop function if exists public.attach_invited_profile(uuid, uuid, public.church_role, text);
drop function if exists public.attach_invited_profile(uuid, uuid, text, text);

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

notify pgrst, 'reload schema';
