-- Pastors can remove a demo/unwanted service from history.
-- Children's teachers can see and manage child members, invite other
-- teachers, and mark children present while a service is open.

create or replace function public.delete_service_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_updated int;
begin
  if auth.uid() is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  v_church := public.current_church_id();
  if v_church is null or p_session_id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  update public.attendance_records
     set deleted_at = now()
   where service_session_id = p_session_id
     and deleted_at is null
     and exists (
       select 1
         from public.service_sessions s
        where s.id = p_session_id
          and s.church_id = v_church
     );

  update public.service_sessions
     set deleted_at = now(),
         ended_at = coalesce(ended_at, now())
   where id = p_session_id
     and church_id = v_church
     and deleted_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'deleted');
end;
$$;

grant execute on function public.delete_service_session(uuid) to authenticated;

drop policy if exists "childrens_teacher_read_children" on public.members;
create policy "childrens_teacher_read_children"
on public.members for select
using (
  church_id = public.current_church_id()
  and public.current_role() = 'childrens_teacher'
  and age_group = 'child'
  and deleted_at is null
);

drop policy if exists "childrens_teacher_insert_children" on public.members;
create policy "childrens_teacher_insert_children"
on public.members for insert
with check (
  church_id = public.current_church_id()
  and public.current_role() = 'childrens_teacher'
  and age_group = 'child'
);

drop policy if exists "childrens_teacher_update_children" on public.members;
create policy "childrens_teacher_update_children"
on public.members for update
using (
  church_id = public.current_church_id()
  and public.current_role() = 'childrens_teacher'
  and age_group = 'child'
)
with check (
  church_id = public.current_church_id()
  and public.current_role() = 'childrens_teacher'
  and age_group = 'child'
);

create or replace function public.teacher_check_in(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_open jsonb;
  v_session uuid;
  v_age text;
  v_existing uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  v_open := public.get_open_service();
  if v_open is null or coalesce(v_open->>'open', 'false') <> 'true' then
    return jsonb_build_object('status', 'closed');
  end if;
  v_session := (v_open->>'session_id')::uuid;

  select age_group into v_age
    from public.members
   where id = p_member_id
     and church_id = v_church
     and deleted_at is null;

  if v_age is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_role = 'childrens_teacher' and v_age is distinct from 'child' then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  select id into v_existing
    from public.attendance_records
   where service_session_id = v_session
     and member_id = p_member_id
     and deleted_at is null
   limit 1;

  if v_existing is not null then
    return jsonb_build_object('status', 'already_checked_in');
  end if;

  insert into public.attendance_records (
    church_id, service_session_id, member_id, check_in_method, checked_in_at
  ) values (
    v_church, v_session, p_member_id, 'manual', now()
  );

  return jsonb_build_object('status', 'checked_in');
end;
$$;

create or replace function public.teacher_undo_check_in(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_open jsonb;
  v_session uuid;
  v_updated int;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  v_open := public.get_open_service();
  if v_open is null or coalesce(v_open->>'open', 'false') <> 'true' then
    return jsonb_build_object('status', 'closed');
  end if;
  v_session := (v_open->>'session_id')::uuid;

  if v_role = 'childrens_teacher' and not exists (
    select 1 from public.members
     where id = p_member_id
       and church_id = v_church
       and age_group = 'child'
       and deleted_at is null
  ) then
    return jsonb_build_object('status', 'not_allowed');
  end if;

  update public.attendance_records
     set deleted_at = now()
   where service_session_id = v_session
     and member_id = p_member_id
     and deleted_at is null;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'undone');
end;
$$;

grant execute on function public.teacher_check_in(uuid) to authenticated;
grant execute on function public.teacher_undo_check_in(uuid) to authenticated;

drop policy if exists "childrens_teacher_read_teachers" on public.profiles;
create policy "childrens_teacher_read_teachers"
on public.profiles for select
using (
  church_id = public.current_church_id()
  and public.current_role() = 'childrens_teacher'
  and role = 'childrens_teacher'
  and deleted_at is null
);

create or replace function public.get_children_desk()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_open jsonb;
  v_session uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('ok', false, 'error', 'not_allowed');
  end if;

  v_open := public.get_open_service();
  if v_open is not null and coalesce(v_open->>'open', 'false') = 'true' then
    v_session := (v_open->>'session_id')::uuid;
  end if;

  return jsonb_build_object(
    'ok', true,
    'service', case when v_session is null then null else v_open end,
    'children', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'full_name', m.full_name,
        'phone', m.phone,
        'gender', m.gender,
        'status', m.status
      ) order by m.full_name)
      from public.members m
      where m.church_id = v_church
        and m.age_group = 'child'
        and m.status = 'active'
        and m.deleted_at is null
    ), '[]'::jsonb),
    'teachers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', p.full_name
      ) order by p.full_name)
      from public.profiles p
      where p.church_id = v_church
        and p.role = 'childrens_teacher'
        and p.deleted_at is null
    ), '[]'::jsonb),
    'present_ids', coalesce((
      select jsonb_agg(a.member_id)
      from public.attendance_records a
      join public.members m on m.id = a.member_id
      where v_session is not null
        and a.service_session_id = v_session
        and a.deleted_at is null
        and m.church_id = v_church
        and m.age_group = 'child'
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_children_desk() to authenticated;
