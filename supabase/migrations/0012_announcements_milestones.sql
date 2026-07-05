-- ============================================================
-- GATHRD — Week 5 Migration
-- Module 18: Announcements & Communication Hub
-- Module 15: Birthday & Milestone Alerts
-- Blueprint Section 4
-- ============================================================

-- ------------------------------------------------------------
-- 1. Message templates — editable by church_admin (Blueprint:
--    "Custom message templates editable by the church admin")
-- ------------------------------------------------------------
create type public.template_type as enum (
  'birthday', 'wedding_anniversary', 'born_again_anniversary', 'announcement_default'
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  template_type public.template_type not null,
  body_text text not null, -- supports {{name}} and {{church_name}} placeholders

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),

  unique (church_id, template_type)
);

create trigger trg_message_templates_audit
before insert or update on public.message_templates
for each row execute function public.set_audit_fields();

-- ------------------------------------------------------------
-- 2. Announcements
-- ------------------------------------------------------------
create type public.announcement_target as enum (
  'all', 'department', 'cell_group'
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),

  title text not null,
  body text not null,
  target_type public.announcement_target not null default 'all',
  target_department_id uuid references public.departments(id),
  target_cell_group_id uuid references public.cell_groups(id),

  send_via_whatsapp boolean not null default true,
  send_via_in_app boolean not null default true,
  is_emergency boolean not null default false,

  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz
);

create trigger trg_announcements_audit
before insert or update on public.announcements
for each row execute function public.set_audit_fields();

create index idx_announcements_church on public.announcements(church_id);
create index idx_announcements_scheduled on public.announcements(scheduled_at) where sent_at is null;

-- ------------------------------------------------------------
-- 3. Announcement recipients — one row per person targeted,
--    tracks delivery per channel (Blueprint: "Read receipts —
--    admin sees how many members received the announcement")
-- ------------------------------------------------------------
create table public.announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  member_id uuid references public.members(id),
  phone_snapshot text, -- phone at time of sending, in case it changes later
  whatsapp_status text not null default 'pending' check (whatsapp_status in ('pending', 'sent', 'failed', 'not_configured', 'no_phone')),
  in_app_read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_announcement_recipients_announcement on public.announcement_recipients(announcement_id);

-- ------------------------------------------------------------
-- 4. Milestone message log — prevents sending the same birthday
--    message twice in a day, and gives a history of what was sent
-- ------------------------------------------------------------
create type public.milestone_type as enum (
  'birthday', 'wedding_anniversary', 'born_again_anniversary'
);

create table public.milestone_messages_log (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  member_id uuid not null references public.members(id),
  milestone_type public.milestone_type not null,
  sent_on date not null default current_date,
  whatsapp_status text not null default 'pending' check (whatsapp_status in ('pending', 'sent', 'failed', 'not_configured', 'no_phone')),
  sent_by uuid references auth.users(id), -- null if sent by an automated process
  created_at timestamptz not null default now(),

  unique (member_id, milestone_type, sent_on)
);

create index idx_milestone_log_church on public.milestone_messages_log(church_id);

-- ------------------------------------------------------------
-- 5. Helper: resolve which members a milestone type applies to
--    today, so both the dashboard and the send function share
--    one source of truth for "who has a birthday today."
-- ------------------------------------------------------------
create or replace function public.get_members_with_milestone_today(p_church_id uuid, p_milestone public.milestone_type)
returns table (member_id uuid, full_name text, phone text)
language sql
security definer
stable
as $$
  select id, full_name, phone
  from public.members
  where church_id = p_church_id
    and deleted_at is null
    and status = 'active'
    and case p_milestone
      when 'birthday' then
        date_of_birth is not null
        and extract(month from date_of_birth) = extract(month from current_date)
        and extract(day from date_of_birth) = extract(day from current_date)
      when 'wedding_anniversary' then
        wedding_anniversary is not null
        and extract(month from wedding_anniversary) = extract(month from current_date)
        and extract(day from wedding_anniversary) = extract(day from current_date)
      when 'born_again_anniversary' then
        born_again_date is not null
        and extract(month from born_again_date) = extract(month from current_date)
        and extract(day from born_again_date) = extract(day from current_date)
    end;
$$;
