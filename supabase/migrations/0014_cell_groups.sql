-- ============================================================
-- GATHRD — Week 6 Migration
-- Module 4: Cell Group Management
-- Blueprint Section 4
-- ============================================================

-- ------------------------------------------------------------
-- 1. Expand cell_groups (created back in Week 2) with the
--    accountability fields this module actually needs
-- ------------------------------------------------------------
alter table public.cell_groups
  add column zone text,
  add column meeting_day text check (meeting_day in ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
  add column meeting_time text,
  add column location text;

-- ------------------------------------------------------------
-- 2. Weekly meeting reports — submitted by the cell leader
-- ------------------------------------------------------------
create type public.cell_report_status as enum ('on_time', 'late', 'missing');

create table public.cell_group_meeting_reports (
  id uuid primary key default gen_random_uuid(),
  cell_group_id uuid not null references public.cell_groups(id),
  church_id uuid not null references public.churches(id),
  meeting_date date not null default current_date,

  attendance_count int not null default 0,
  new_faces_count int not null default 0,
  prayer_points text,
  testimonies text,

  status public.cell_report_status not null default 'on_time',

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),

  unique (cell_group_id, meeting_date)
);

create trigger trg_cell_reports_audit
before insert or update on public.cell_group_meeting_reports
for each row execute function public.set_audit_fields();

create index idx_cell_reports_cell_group on public.cell_group_meeting_reports(cell_group_id);
create index idx_cell_reports_church on public.cell_group_meeting_reports(church_id);

-- ------------------------------------------------------------
-- 3. Per-member attendance within a meeting — this is what lets
--    us compute "absent 3+ weeks" accurately per person, not just
--    a headcount.
-- ------------------------------------------------------------
create table public.cell_meeting_attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_report_id uuid not null references public.cell_group_meeting_reports(id) on delete cascade,
  member_id uuid not null references public.members(id),
  present boolean not null default true,

  unique (meeting_report_id, member_id)
);

create index idx_cell_attendance_member on public.cell_meeting_attendance(member_id);
create index idx_cell_attendance_report on public.cell_meeting_attendance(meeting_report_id);

-- ------------------------------------------------------------
-- 4. Helper: which members have been absent from their cell
--    group for 3+ consecutive recorded meetings — feeds both
--    the Follow-Up Dashboard and the cell group's own view.
-- ------------------------------------------------------------
create or replace function public.get_cell_absentees(p_cell_group_id uuid, p_consecutive_threshold int default 3)
returns table (member_id uuid, full_name text, consecutive_absences int)
language sql
security definer
stable
as $$
  with recent_meetings as (
    select id, meeting_date
    from public.cell_group_meeting_reports
    where cell_group_id = p_cell_group_id
    order by meeting_date desc
    limit 10
  ),
  member_attendance as (
    select
      m.id as member_id,
      m.full_name,
      rm.meeting_date,
      coalesce(ca.present, false) as present,
      row_number() over (partition by m.id order by rm.meeting_date desc) as rn
    from public.members m
    cross join recent_meetings rm
    left join public.cell_meeting_attendance ca
      on ca.meeting_report_id = rm.id and ca.member_id = m.id
    where m.cell_group_id = p_cell_group_id
      and m.deleted_at is null
      and m.status = 'active'
  ),
  consecutive_counts as (
    select member_id, full_name,
      count(*) filter (where present = false and rn <= p_consecutive_threshold) as recent_absences
    from member_attendance
    group by member_id, full_name
  )
  select member_id, full_name, recent_absences::int
  from consecutive_counts
  where recent_absences >= p_consecutive_threshold;
$$;
