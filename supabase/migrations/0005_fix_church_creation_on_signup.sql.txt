-- ============================================================
-- GATHRD — Fix: signup never created a church
-- Previously, handle_new_user() created a `profiles` row but left
-- church_id null, and nothing ever created a `churches` row for a
-- new senior_pastor. This replaces the trigger function so that
-- signing up as a senior_pastor now also creates their church and
-- links it immediately.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role public.church_role;
  v_church_id uuid;
begin
  v_role := coalesce((new.raw_user_meta_data->>'role')::public.church_role, 'member');

  -- Only the person creating the account (senior_pastor) triggers
  -- creation of a new church. Everyone else gets invited into an
  -- existing church later (Module 21, Week 7) with church_id set then.
  if v_role = 'senior_pastor' then
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
$$ language plpgsql security definer;