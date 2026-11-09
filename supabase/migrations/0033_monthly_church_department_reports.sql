-- Monthly church report for pastors/admins, and department report for heads.
-- Assign a head to each department. Dates use Africa/Lagos.

alter table public.departments
  add column if not exists leader_profile_id uuid references public.profiles(id);

create index if not exists idx_departments_leader
  on public.departments(leader_profile_id)
  where deleted_at is null;

create or replace function public.is_head_of_department(p_department_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.departments d
     where d.id = p_department_id
       and d.church_id = public.current_church_id()
       and d.deleted_at is null
       and d.leader_profile_id = (select auth.uid())
  );
$$;

create or replace function public.set_department_head(
  p_department_id uuid,
  p_leader_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church uuid;
begin
  if (select auth.uid()) is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_church := public.current_church_id();
  if v_church is null or p_department_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if p_leader_id is not null and not exists (
    select 1 from public.profiles
     where id = p_leader_id
       and church_id = v_church
       and deleted_at is null
  ) then
    return jsonb_build_object('ok', false, 'error', 'leader_not_found');
  end if;

  update public.departments
     set leader_profile_id = p_leader_id
   where id = p_department_id
     and church_id = v_church
     and deleted_at is null;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.list_report_departments()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  return jsonb_build_object(
    'ok', true,
    'can_see_church', public.is_pastor_or_admin(),
    'rows', coalesce((
      select jsonb_agg(row_to_json(t) order by t.name)
      from (
        select
          d.id,
          d.name,
          d.leader_profile_id,
          coalesce(p.full_name, '') as leader_name
        from public.departments d
        left join public.profiles p on p.id = d.leader_profile_id
        where d.church_id = v_church
          and d.deleted_at is null
          and (
            public.is_pastor_or_admin()
            or d.leader_profile_id = v_uid
          )
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_church_monthly_report(p_year int, p_month int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_name text;
  v_start date;
  v_end date;
  v_show_giving boolean;
begin
  if (select auth.uid()) is null or not public.is_pastor_or_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_year is null or p_month is null or p_month < 1 or p_month > 12 or p_year < 2000 or p_year > 2100 then
    return jsonb_build_object('ok', false, 'error', 'bad_period');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select name into v_name from public.churches where id = v_church;
  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;
  v_show_giving := public.can_view_finances();

  return jsonb_build_object(
    'ok', true,
    'kind', 'church',
    'church_name', v_name,
    'period', jsonb_build_object(
      'year', p_year,
      'month', p_month,
      'start', v_start,
      'end', v_end
    ),
    'members', jsonb_build_object(
      'active_adults', (
        select count(*) from public.members
        where church_id = v_church and deleted_at is null
          and status = 'active' and coalesce(age_group, 'adult') <> 'child'
      ),
      'active_children', (
        select count(*) from public.members
        where church_id = v_church and deleted_at is null
          and status = 'active' and age_group = 'child'
      ),
      'new_this_month', (
        select count(*) from public.members
        where church_id = v_church and deleted_at is null
          and date_joined >= v_start and date_joined < v_end
      ),
      'by_status', coalesce((
        select jsonb_object_agg(status, n)
        from (
          select status::text, count(*)::int as n
          from public.members
          where church_id = v_church and deleted_at is null
          group by status
        ) s
      ), '{}'::jsonb)
    ),
    'visitors', jsonb_build_object(
      'unique_first_visits', (
        select count(*) from public.visitors
        where church_id = v_church and deleted_at is null
          and first_visit_date >= v_start and first_visit_date < v_end
      ),
      'visit_events', (
        select count(*) from public.visits
        where church_id = v_church
          and visit_date >= v_start and visit_date < v_end
      ),
      'converts', (
        select count(*) from public.visitors
        where church_id = v_church and deleted_at is null
          and status = 'convert'
          and first_visit_date >= v_start and first_visit_date < v_end
      )
    ),
    'attendance', jsonb_build_object(
      'session_count', (
        select count(*) from public.service_sessions
        where church_id = v_church and deleted_at is null
          and service_date >= v_start and service_date < v_end
      ),
      'adults_present_events', (
        select count(*)
        from public.attendance_records a
        join public.members m on m.id = a.member_id
        join public.service_sessions s on s.id = a.service_session_id
        where a.church_id = v_church and a.deleted_at is null
          and s.deleted_at is null
          and s.service_date >= v_start and s.service_date < v_end
          and m.deleted_at is null
          and coalesce(m.age_group, 'adult') <> 'child'
      ),
      'children_present_events', (
        select count(*)
        from public.attendance_records a
        join public.members m on m.id = a.member_id
        join public.service_sessions s on s.id = a.service_session_id
        where a.church_id = v_church and a.deleted_at is null
          and s.deleted_at is null
          and s.service_date >= v_start and s.service_date < v_end
          and m.deleted_at is null
          and m.age_group = 'child'
      ),
      'unique_adults', (
        select count(distinct a.member_id)
        from public.attendance_records a
        join public.members m on m.id = a.member_id
        join public.service_sessions s on s.id = a.service_session_id
        where a.church_id = v_church and a.deleted_at is null
          and s.deleted_at is null
          and s.service_date >= v_start and s.service_date < v_end
          and m.deleted_at is null
          and coalesce(m.age_group, 'adult') <> 'child'
      ),
      'unique_children', (
        select count(distinct a.member_id)
        from public.attendance_records a
        join public.members m on m.id = a.member_id
        join public.service_sessions s on s.id = a.service_session_id
        where a.church_id = v_church and a.deleted_at is null
          and s.deleted_at is null
          and s.service_date >= v_start and s.service_date < v_end
          and m.deleted_at is null
          and m.age_group = 'child'
      ),
      'sessions', coalesce((
        select jsonb_agg(row_to_json(x) order by x.service_date, x.service_name)
        from (
          select
            s.id,
            s.service_date,
            s.service_name,
            (
              select count(*)::int
              from public.attendance_records a
              join public.members m on m.id = a.member_id
              where a.service_session_id = s.id and a.deleted_at is null
                and coalesce(m.age_group, 'adult') <> 'child' and m.deleted_at is null
            ) as adults_present,
            (
              select count(*)::int
              from public.attendance_records a
              join public.members m on m.id = a.member_id
              where a.service_session_id = s.id and a.deleted_at is null
                and m.age_group = 'child' and m.deleted_at is null
            ) as children_present
          from public.service_sessions s
          where s.church_id = v_church and s.deleted_at is null
            and s.service_date >= v_start and s.service_date < v_end
          order by s.service_date, s.service_name
          limit 40
        ) x
      ), '[]'::jsonb)
    ),
    'giving', case when v_show_giving then jsonb_build_object(
      'visible', true,
      'currency', 'NGN',
      'grand_total', coalesce((
        select sum(amount) from public.giving_records
        where church_id = v_church and deleted_at is null and status = 'success'
          and (given_at at time zone 'Africa/Lagos')::date >= v_start
          and (given_at at time zone 'Africa/Lagos')::date < v_end
      ), 0),
      'by_category', coalesce((
        select jsonb_object_agg(category, total)
        from (
          select category::text, sum(amount) as total
          from public.giving_records
          where church_id = v_church and deleted_at is null and status = 'success'
            and (given_at at time zone 'Africa/Lagos')::date >= v_start
            and (given_at at time zone 'Africa/Lagos')::date < v_end
          group by category
        ) g
      ), '{}'::jsonb)
    ) else jsonb_build_object('visible', false) end,
    'evangelism', jsonb_build_object(
      'souls_added', (
        select count(*) from public.personal_souls
        where church_id = v_church and deleted_at is null
          and (created_at at time zone 'Africa/Lagos')::date >= v_start
          and (created_at at time zone 'Africa/Lagos')::date < v_end
      ),
      'converted', (
        select count(*) from public.personal_souls
        where church_id = v_church and deleted_at is null and status = 'converted'
          and (created_at at time zone 'Africa/Lagos')::date >= v_start
          and (created_at at time zone 'Africa/Lagos')::date < v_end
      ),
      'pending', (
        select count(*) from public.personal_souls
        where church_id = v_church and deleted_at is null and status = 'pending'
      ),
      'outreach_events', (
        select count(*) from public.personal_soul_outreach
        where church_id = v_church
          and (created_at at time zone 'Africa/Lagos')::date >= v_start
          and (created_at at time zone 'Africa/Lagos')::date < v_end
      ),
      'by_winner', coalesce((
        select jsonb_agg(row_to_json(w) order by w.souls desc, w.name)
        from (
          select
            coalesce(p.full_name, 'Unknown') as name,
            count(*)::int as souls
          from public.personal_souls s
          left join public.profiles p on p.id = s.won_by_profile_id
          where s.church_id = v_church and s.deleted_at is null
            and (s.created_at at time zone 'Africa/Lagos')::date >= v_start
            and (s.created_at at time zone 'Africa/Lagos')::date < v_end
          group by p.full_name
          order by count(*) desc
          limit 20
        ) w
      ), '[]'::jsonb)
    ),
    'cells', jsonb_build_object(
      'groups', (
        select count(*) from public.cell_groups
        where church_id = v_church and deleted_at is null
      ),
      'reports_submitted', (
        select count(*) from public.cell_group_meeting_reports
        where church_id = v_church
          and meeting_date >= v_start and meeting_date < v_end
      ),
      'total_attendance', coalesce((
        select sum(attendance_count) from public.cell_group_meeting_reports
        where church_id = v_church
          and meeting_date >= v_start and meeting_date < v_end
      ), 0),
      'new_faces', coalesce((
        select sum(new_faces_count) from public.cell_group_meeting_reports
        where church_id = v_church
          and meeting_date >= v_start and meeting_date < v_end
      ), 0)
    ),
    'departments', coalesce((
      select jsonb_agg(row_to_json(d) order by d.name)
      from (
        select
          dep.id,
          dep.name,
          coalesce(pr.full_name, '') as leader_name,
          (
            select count(*)::int
            from public.member_departments md
            join public.members m on m.id = md.member_id
            where md.department_id = dep.id
              and m.deleted_at is null
          ) as member_count
        from public.departments dep
        left join public.profiles pr on pr.id = dep.leader_profile_id
        where dep.church_id = v_church and dep.deleted_at is null
        order by dep.name
      ) d
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_department_monthly_report(
  p_department_id uuid,
  p_year int,
  p_month int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_church uuid;
  v_start date;
  v_end date;
  v_dept public.departments%rowtype;
  v_sessions int;
begin
  if (select auth.uid()) is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_year is null or p_month is null or p_month < 1 or p_month > 12 or p_year < 2000 or p_year > 2100 then
    return jsonb_build_object('ok', false, 'error', 'bad_period');
  end if;

  v_church := public.current_church_id();
  if v_church is null or p_department_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_dept
    from public.departments
   where id = p_department_id
     and church_id = v_church
     and deleted_at is null;

  if v_dept.id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if not public.is_pastor_or_admin()
     and v_dept.leader_profile_id is distinct from (select auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month')::date;

  select count(*) into v_sessions
    from public.service_sessions
   where church_id = v_church and deleted_at is null
     and service_date >= v_start and service_date < v_end;

  return jsonb_build_object(
    'ok', true,
    'kind', 'department',
    'department', jsonb_build_object(
      'id', v_dept.id,
      'name', v_dept.name,
      'leader_name', (
        select full_name from public.profiles where id = v_dept.leader_profile_id
      )
    ),
    'period', jsonb_build_object(
      'year', p_year,
      'month', p_month,
      'start', v_start,
      'end', v_end
    ),
    'roster', jsonb_build_object(
      'count', (
        select count(*)
        from public.member_departments md
        join public.members m on m.id = md.member_id
        where md.department_id = v_dept.id and m.deleted_at is null
      ),
      'new_this_month', (
        select count(*)
        from public.member_departments md
        join public.members m on m.id = md.member_id
        where md.department_id = v_dept.id and m.deleted_at is null
          and m.date_joined >= v_start and m.date_joined < v_end
      ),
      'members', coalesce((
        select jsonb_agg(row_to_json(r) order by r.full_name)
        from (
          select m.id, m.full_name, m.phone, m.status::text, m.date_joined
          from public.member_departments md
          join public.members m on m.id = md.member_id
          where md.department_id = v_dept.id and m.deleted_at is null
          order by m.full_name
          limit 200
        ) r
      ), '[]'::jsonb)
    ),
    'attendance', jsonb_build_object(
      'services_in_month', coalesce(v_sessions, 0),
      'present_events', (
        select count(*)
        from public.attendance_records a
        join public.member_departments md on md.member_id = a.member_id
        join public.service_sessions s on s.id = a.service_session_id
        where md.department_id = v_dept.id
          and a.church_id = v_church and a.deleted_at is null
          and s.deleted_at is null
          and s.service_date >= v_start and s.service_date < v_end
      ),
      'unique_present', (
        select count(distinct a.member_id)
        from public.attendance_records a
        join public.member_departments md on md.member_id = a.member_id
        join public.service_sessions s on s.id = a.service_session_id
        where md.department_id = v_dept.id
          and a.church_id = v_church and a.deleted_at is null
          and s.deleted_at is null
          and s.service_date >= v_start and s.service_date < v_end
      ),
      'by_member', coalesce((
        select jsonb_agg(row_to_json(b) order by b.present desc, b.full_name)
        from (
          select
            m.full_name,
            (
              select count(*)::int
              from public.attendance_records a
              join public.service_sessions s on s.id = a.service_session_id
              where a.member_id = m.id and a.deleted_at is null
                and s.deleted_at is null
                and s.service_date >= v_start and s.service_date < v_end
            ) as present
          from public.member_departments md
          join public.members m on m.id = md.member_id
          where md.department_id = v_dept.id and m.deleted_at is null
          order by 2 desc, m.full_name
          limit 200
        ) b
      ), '[]'::jsonb)
    ),
    'evangelism', jsonb_build_object(
      'souls_won', (
        select count(*)
        from public.personal_souls s
        where s.church_id = v_church and s.deleted_at is null
          and (s.created_at at time zone 'Africa/Lagos')::date >= v_start
          and (s.created_at at time zone 'Africa/Lagos')::date < v_end
          and s.won_by_profile_id in (
            select m.profile_id
            from public.member_departments md
            join public.members m on m.id = md.member_id
            where md.department_id = v_dept.id
              and m.deleted_at is null
              and m.profile_id is not null
          )
      ),
      'by_member', coalesce((
        select jsonb_agg(row_to_json(e) order by e.souls desc, e.full_name)
        from (
          select
            coalesce(p.full_name, m.full_name) as full_name,
            count(*)::int as souls
          from public.personal_souls s
          join public.members m on m.profile_id = s.won_by_profile_id
          join public.member_departments md on md.member_id = m.id
          left join public.profiles p on p.id = s.won_by_profile_id
          where md.department_id = v_dept.id
            and s.church_id = v_church and s.deleted_at is null
            and m.deleted_at is null
            and (s.created_at at time zone 'Africa/Lagos')::date >= v_start
            and (s.created_at at time zone 'Africa/Lagos')::date < v_end
          group by coalesce(p.full_name, m.full_name)
          order by count(*) desc
          limit 50
        ) e
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.is_head_of_department(uuid) from public, anon;
grant execute on function public.is_head_of_department(uuid) to authenticated;
revoke all on function public.set_department_head(uuid, uuid) from public, anon;
grant execute on function public.set_department_head(uuid, uuid) to authenticated;
revoke all on function public.list_report_departments() from public, anon;
grant execute on function public.list_report_departments() to authenticated;
revoke all on function public.get_church_monthly_report(int, int) from public, anon;
grant execute on function public.get_church_monthly_report(int, int) to authenticated;
revoke all on function public.get_department_monthly_report(uuid, int, int) from public, anon;
grant execute on function public.get_department_monthly_report(uuid, int, int) to authenticated;

notify pgrst, 'reload schema';
