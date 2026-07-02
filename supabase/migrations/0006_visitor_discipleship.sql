-- ============================================================
-- GATHRD — Week 3 Migration
-- Module 2: Visitor Log & First Timer Tracker
-- Module 2B: New Convert Discipleship Tracker
-- Blueprint Section 4
-- ============================================================

-- ------------------------------------------------------------
-- 1. visitors — one row per unique person (deduplicated by phone)
-- ------------------------------------------------------------
create type public.visitor_status as enum (
  'first_timer', 'repeat_visitor', 'convert', 'inactive'
);

create table public.visitors (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),

  full_name text not null,
  phone text,
  address text,
  how_heard text, -- "how they heard about the church"
  status public.visitor_status not null default 'first_timer',
  first_visit_date date not null default current_date,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_visitors_audit
before insert or update on public.visitors
for each row execute function public.set_audit_fields();

create index idx_visitors_church on public.visitors(church_id);
create index idx_visitors_phone on public.visitors(church_id, phone);
create index idx_visitors_status on public.visitors(status);

-- ------------------------------------------------------------
-- 2. visits — full history, one row per attendance
--    (this is what lets us auto-tag "repeat visitor" on visit #2)
-- ------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  church_id uuid not null references public.churches(id),
  visit_date date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_visits_visitor on public.visits(visitor_id);

-- ------------------------------------------------------------
-- 3. Check-in function — creates or finds the visitor by phone,
--    logs the visit, auto-tags status, and creates the 24hr
--    follow-up task, all in one transaction.
-- ------------------------------------------------------------
create table public.follow_up_tasks (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  assigned_to uuid references public.profiles(id),
  status text not null default 'pending' check (status in ('pending', 'contacted', 'visited', 'converted', 'inactive')),
  due_at timestamptz not null,
  reminder_sent_at timestamptz,
  notes text,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create trigger trg_follow_up_tasks_audit
before insert or update on public.follow_up_tasks
for each row execute function public.set_audit_fields();

create index idx_follow_up_tasks_church on public.follow_up_tasks(church_id);
create index idx_follow_up_tasks_assigned on public.follow_up_tasks(assigned_to);
create index idx_follow_up_tasks_status on public.follow_up_tasks(status);

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
  -- Find existing visitor by phone within this church, if phone given
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

  -- Auto-tag: 2nd+ visit and not already a convert = repeat visitor
  update public.visitors
  set status = case
    when status = 'convert' then 'convert'
    when v_visit_count >= 2 then 'repeat_visitor'
    else 'first_timer'
  end
  where id = v_visitor_id;

  -- Auto-create the 24-hour follow-up task (Blueprint: "auto-assigned
  -- to designated worker within 24 hours of first visit")
  insert into public.follow_up_tasks (church_id, visitor_id, assigned_to, status, due_at)
  values (p_church_id, v_visitor_id, p_assigned_to, 'pending', now() + interval '24 hours');

  return v_visitor_id;
end;
$$;

-- ------------------------------------------------------------
-- 4. Discipleship tracker (Module 2B)
-- ------------------------------------------------------------
create type public.discipleship_stage as enum (
  'salvation', 'water_baptism', 'holy_spirit_baptism',
  'new_convert_class', 'membership_class', 'worker_consecration'
);

create table public.discipleship_records (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  visitor_id uuid references public.visitors(id), -- links back to their original visitor record
  member_id uuid references public.members(id),    -- set once promoted to full member

  current_stage public.discipleship_stage not null default 'salvation',
  stage_entered_at timestamptz not null default now(), -- for the 30-day stall check
  salvation_date date not null default current_date,
  assigned_pastor_id uuid references public.profiles(id),

  water_baptism_scheduled_date date,
  water_baptism_completed_date date,
  holy_spirit_baptism_date date,
  new_convert_class_completed_date date,
  membership_class_completed_date date,
  membership_card_issued boolean not null default false,
  worker_consecration_date date,
  worker_department_id uuid references public.departments(id),

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_discipleship_records_audit
before insert or update on public.discipleship_records
for each row execute function public.set_audit_fields();

create index idx_discipleship_church on public.discipleship_records(church_id);
create index idx_discipleship_stage on public.discipleship_records(current_stage);

-- Stage completion history — "logged with date and the name of the
-- minister who administered it"
create table public.discipleship_stage_log (
  id uuid primary key default gen_random_uuid(),
  discipleship_record_id uuid not null references public.discipleship_records(id) on delete cascade,
  stage public.discipleship_stage not null,
  completed_at timestamptz not null default now(),
  administered_by uuid references public.profiles(id),
  notes text
);

-- ------------------------------------------------------------
-- 5. "Mark as Convert" function — moves a visitor into the
--    discipleship tracker, per the blueprint's defined flow
-- ------------------------------------------------------------
create or replace function public.convert_visitor(
  p_visitor_id uuid,
  p_assigned_pastor_id uuid
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_church_id uuid;
  v_record_id uuid;
begin
  select church_id into v_church_id from public.visitors where id = p_visitor_id;

  update public.visitors set status = 'convert' where id = p_visitor_id;

  insert into public.discipleship_records (church_id, visitor_id, current_stage, assigned_pastor_id)
  values (v_church_id, p_visitor_id, 'salvation', p_assigned_pastor_id)
  returning id into v_record_id;

  insert into public.discipleship_stage_log (discipleship_record_id, stage, administered_by)
  values (v_record_id, 'salvation', p_assigned_pastor_id);

  return v_record_id;
end;
$$;

grant execute on function public.check_in_visitor to authenticated;
grant execute on function public.convert_visitor to authenticated;
