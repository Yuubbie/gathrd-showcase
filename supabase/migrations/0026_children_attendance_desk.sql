-- Children's teachers can add children by name, mark them present on an
-- open service, and backfill names onto a past service (same church).
-- Pastors and Admin see children separately from adults.

create or replace function public.add_child_member(
  p_full_name text,
  p_gender text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_name text;
  v_gender text;
  v_existing uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_name := nullif(btrim(p_full_name), '');
  if v_name is null then
    return jsonb_build_object('ok', false, 'status', 'invalid_name');
  end if;

  v_gender := case
    when p_gender in ('male', 'female') then p_gender
    else null
  end;

  select id into v_existing
    from public.members
   where church_id = v_church
     and deleted_at is null
     and lower(full_name) = lower(v_name)
     and age_group = 'child'
   limit 1;

  if v_existing is not null then
    return jsonb_build_object('ok', true, 'status', 'exists', 'id', v_existing, 'full_name', v_name);
  end if;

  insert into public.members (
    church_id, full_name, gender, status, source, age_group, date_joined
  ) values (
    v_church, v_name, v_gender, 'active', 'admin_added', 'child', current_date
  )
  returning id into v_id;

  return jsonb_build_object('ok', true, 'status', 'created', 'id', v_id, 'full_name', v_name, 'gender', v_gender);
end;
$$;

create or replace function public.list_recent_services(p_limit int default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_limit int;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_limit := greatest(1, least(coalesce(p_limit, 14), 30));

  return jsonb_build_object(
    'ok', true,
    'services', coalesce((
      select jsonb_agg(jsonb_build_object(
        'session_id', s.id,
        'service_name', s.service_name,
        'service_date', s.service_date,
        'ended_at', s.ended_at,
        'open', s.ended_at is null,
        'adults_present', (
          select count(*)::int
            from public.attendance_records a
            join public.members m on m.id = a.member_id
           where a.service_session_id = s.id
             and a.deleted_at is null
             and m.church_id = v_church
             and coalesce(m.age_group, 'adult') <> 'child'
             and m.deleted_at is null
        ),
        'adults_absent', (
          select count(*)::int
            from public.members m
           where m.church_id = v_church
             and coalesce(m.age_group, 'adult') <> 'child'
             and m.status = 'active'
             and m.deleted_at is null
             and not exists (
               select 1
                 from public.attendance_records a
                where a.service_session_id = s.id
                  and a.member_id = m.id
                  and a.deleted_at is null
             )
        ),
        'children_present', (
          select count(*)::int
            from public.attendance_records a
            join public.members m on m.id = a.member_id
           where a.service_session_id = s.id
             and a.deleted_at is null
             and m.church_id = v_church
             and m.age_group = 'child'
             and m.deleted_at is null
        ),
        'children_absent', (
          select count(*)::int
            from public.members m
           where m.church_id = v_church
             and m.age_group = 'child'
             and m.status = 'active'
             and m.deleted_at is null
             and not exists (
               select 1
                 from public.attendance_records a
                where a.service_session_id = s.id
                  and a.member_id = m.id
                  and a.deleted_at is null
             )
        )
      ) order by s.service_date desc, s.ended_at desc nulls first)
      from (
        select *
          from public.service_sessions
         where church_id = v_church
           and deleted_at is null
         order by service_date desc, ended_at desc nulls first
         limit v_limit
      ) s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.record_children_for_session(
  p_session_id uuid,
  p_names text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_session uuid;
  v_when timestamptz;
  v_name text;
  v_raw text;
  v_member uuid;
  v_created int := 0;
  v_checked int := 0;
  v_already int := 0;
  v_results jsonb := '[]'::jsonb;
  v_existing_att uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  if p_session_id is null or p_names is null or cardinality(p_names) = 0 then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  if cardinality(p_names) > 100 then
    return jsonb_build_object('ok', false, 'status', 'too_many');
  end if;

  select id, coalesce(ended_at, created_at, now())
    into v_session, v_when
    from public.service_sessions
   where id = p_session_id
     and church_id = v_church
     and deleted_at is null;

  if v_session is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  foreach v_raw in array p_names loop
    v_name := nullif(btrim(v_raw), '');
    if v_name is null then
      continue;
    end if;

    v_member := null;

    select id into v_member
      from public.members
     where church_id = v_church
       and deleted_at is null
       and lower(full_name) = lower(v_name)
       and age_group = 'child'
     limit 1;

    if v_member is null then
      insert into public.members (
        church_id, full_name, status, source, age_group, date_joined
      ) values (
        v_church, v_name, 'active', 'admin_added', 'child', coalesce(v_when::date, current_date)
      )
      returning id into v_member;
      v_created := v_created + 1;
    end if;

    select id into v_existing_att
      from public.attendance_records
     where service_session_id = v_session
       and member_id = v_member
       and deleted_at is null
     limit 1;

    if v_existing_att is not null then
      v_already := v_already + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'name', v_name, 'status', 'already_checked_in', 'member_id', v_member
      ));
    else
      insert into public.attendance_records (
        church_id, service_session_id, member_id, check_in_method, checked_in_at
      ) values (
        v_church, v_session, v_member, 'manual', v_when
      );
      v_checked := v_checked + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'name', v_name, 'status', 'checked_in', 'member_id', v_member
      ));
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'status', 'recorded',
    'created', v_created,
    'checked_in', v_checked,
    'already_checked_in', v_already,
    'results', v_results
  );
end;
$$;

create or replace function public.get_session_children_attendance(p_session_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_session uuid;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  v_role := public.current_role();
  v_church := public.current_church_id();
  if v_church is null or v_role not in ('senior_pastor', 'assistant_pastor', 'church_admin', 'childrens_teacher') then
    return jsonb_build_object('ok', false, 'status', 'not_allowed');
  end if;

  if p_session_id is null then
    return jsonb_build_object('ok', false, 'status', 'invalid');
  end if;

  select id into v_session
    from public.service_sessions
   where id = p_session_id
     and church_id = v_church
     and deleted_at is null;

  if v_session is null then
    return jsonb_build_object('ok', false, 'status', 'not_found');
  end if;

  return jsonb_build_object(
    'ok', true,
    'status', 'ok',
    'present', coalesce((
      select jsonb_agg(jsonb_build_object(
        'member_id', m.id,
        'full_name', m.full_name,
        'gender', m.gender,
        'method', a.check_in_method
      ) order by m.full_name)
      from public.attendance_records a
      join public.members m on m.id = a.member_id
      where a.service_session_id = v_session
        and a.deleted_at is null
        and m.church_id = v_church
        and m.age_group = 'child'
        and m.deleted_at is null
    ), '[]'::jsonb),
    'roster', coalesce((
      select jsonb_agg(jsonb_build_object(
        'member_id', m.id,
        'full_name', m.full_name,
        'gender', m.gender
      ) order by m.full_name)
      from public.members m
      where m.church_id = v_church
        and m.age_group = 'child'
        and m.status = 'active'
        and m.deleted_at is null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.check_in_child_for_session(
  p_session_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
  v_session uuid;
  v_when timestamptz;
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

  if p_session_id is null or p_member_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  select id, coalesce(ended_at, created_at, now())
    into v_session, v_when
    from public.service_sessions
   where id = p_session_id
     and church_id = v_church
     and deleted_at is null;

  if v_session is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  select age_group into v_age
    from public.members
   where id = p_member_id
     and church_id = v_church
     and deleted_at is null;

  if v_age is null then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_age is distinct from 'child' then
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
    v_church, v_session, p_member_id, 'manual', v_when
  );

  return jsonb_build_object('status', 'checked_in');
end;
$$;

create or replace function public.undo_child_for_session(
  p_session_id uuid,
  p_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.church_role;
  v_church uuid;
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

  select id into v_session
    from public.service_sessions
   where id = p_session_id
     and church_id = v_church
     and deleted_at is null;

  if v_session is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not exists (
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

grant execute on function public.add_child_member(text, text) to authenticated;
grant execute on function public.list_recent_services(int) to authenticated;
grant execute on function public.record_children_for_session(uuid, text[]) to authenticated;
grant execute on function public.get_session_children_attendance(uuid) to authenticated;
grant execute on function public.check_in_child_for_session(uuid, uuid) to authenticated;
grant execute on function public.undo_child_for_session(uuid, uuid) to authenticated;
