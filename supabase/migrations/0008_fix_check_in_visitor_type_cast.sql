-- ============================================================
-- GATHRD — Fix: check_in_visitor() had a type mismatch
-- The CASE expression assigning `status` wasn't being cast to the
-- visitor_status enum type, causing every check-in to fail.
-- ============================================================

create or replace function public.check_in_visitor(
  p_church_id uuid,
  p_full_name text,
  p_phone text,
  p_address text,
  p_how_heard text,
  p_assigned_to uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_visitor_id uuid;
  v_visit_count int;
begin
  if p_phone is not null and p_phone <> '' then
    select id into v_visitor_id
    from public.visitors
    where church_id = p_church_id and phone = p_phone and deleted_at is null
    limit 1;
  end if;

  if v_visitor_id is null then
    insert into public.visitors (church_id, full_name, phone, address, how_heard, status)
    values (p_church_id, p_full_name, p_phone, p_address, p_how_heard, 'first_timer')
    returning id into v_visitor_id;
  end if;

  insert into public.visits (visitor_id, church_id, visit_date)
  values (v_visitor_id, p_church_id, current_date);

  select count(*) into v_visit_count from public.visits where visitor_id = v_visitor_id;

  update public.visitors
  set status = (case
    when status = 'convert' then 'convert'
    when v_visit_count >= 2 then 'repeat_visitor'
    else 'first_timer'
  end)::public.visitor_status
  where id = v_visitor_id;

  insert into public.follow_up_tasks (church_id, visitor_id, assigned_to, status, due_at)
  values (p_church_id, v_visitor_id, p_assigned_to, 'pending', now() + interval '24 hours');

  return v_visitor_id;
end;
$$;