-- Tighten anonymous roster signup: require a name, reject blank input,
-- and pin search_path on the security definer function.

create or replace function public.self_onboard_member(
  p_slug text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date,
  p_gender text,
  p_marital_status text,
  p_residential_address text,
  p_state_of_origin text,
  p_lga text,
  p_occupation text,
  p_age_group text default 'adult'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_id uuid;
  v_member_id uuid;
  v_age_group text;
  v_name text;
  v_email text;
begin
  v_name := nullif(trim(p_full_name), '');
  if v_name is null then
    raise exception 'Full name is required.';
  end if;

  v_email := nullif(lower(trim(p_email)), '');
  if v_email is not null and (
    v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    or length(v_email) > 254
  ) then
    raise exception 'Enter a valid email address.';
  end if;

  select id into v_church_id
  from public.churches
  where onboarding_slug = p_slug
    and deleted_at is null;

  if v_church_id is null then
    raise exception 'Invalid onboarding link.';
  end if;

  v_age_group := case when p_age_group = 'child' then 'child' else 'adult' end;

  insert into public.members (
    church_id, full_name, phone, email, date_of_birth, gender,
    marital_status, residential_address, state_of_origin, lga,
    occupation, status, source, age_group
  ) values (
    v_church_id, v_name, nullif(trim(p_phone), ''), v_email, p_date_of_birth, p_gender,
    p_marital_status, p_residential_address, p_state_of_origin, p_lga,
    p_occupation, 'active', 'self_onboarded', v_age_group
  )
  returning id into v_member_id;

  insert into public.audit_logs (church_id, user_id, action, table_name, record_id, new_value)
  values (v_church_id, null, 'insert', 'members', v_member_id,
          jsonb_build_object('source', 'self_onboarded', 'full_name', v_name));

  return v_member_id;
end;
$$;

revoke all on function public.self_onboard_member(
  text, text, text, text, date, text, text, text, text, text, text, text
) from public;
grant execute on function public.self_onboard_member(
  text, text, text, text, date, text, text, text, text, text, text, text
) to anon, authenticated;

notify pgrst, 'reload schema';
