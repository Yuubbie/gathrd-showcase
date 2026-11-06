-- Fix Security Advisor critical errors on admin_churches_overview
-- and Auth RLS Initialization Plan warnings on core tables.

drop view if exists public.admin_churches_overview;

create or replace function public.current_role()
returns public.church_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create or replace function public.current_church_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select church_id from public.profiles where id = (select auth.uid());
$$;

create or replace function public.is_pastor_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('senior_pastor', 'assistant_pastor', 'church_admin');
$$;

create or replace function public.current_cell_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cell_group_id from public.profiles where id = (select auth.uid());
$$;

drop policy if exists "read_own_profile" on public.profiles;
create policy "read_own_profile"
on public.profiles for select
using (id = (select auth.uid()));

drop policy if exists "update_own_profile" on public.profiles;
create policy "update_own_profile"
on public.profiles for update
using (id = (select auth.uid()));

drop policy if exists "member_read_own_record" on public.members;
create policy "member_read_own_record"
on public.members for select
using (profile_id = (select auth.uid()));

drop policy if exists "assigned_worker_read_own_tasks" on public.follow_up_tasks;
create policy "assigned_worker_read_own_tasks"
on public.follow_up_tasks for select
using (assigned_to = (select auth.uid()));

drop policy if exists "assigned_worker_update_own_tasks" on public.follow_up_tasks;
create policy "assigned_worker_update_own_tasks"
on public.follow_up_tasks for update
using (assigned_to = (select auth.uid()))
with check (assigned_to = (select auth.uid()));

drop policy if exists "assigned_pastor_read_own_converts" on public.discipleship_records;
create policy "assigned_pastor_read_own_converts"
on public.discipleship_records for select
using (assigned_pastor_id = (select auth.uid()));

drop policy if exists "assigned_pastor_update_own_converts" on public.discipleship_records;
create policy "assigned_pastor_update_own_converts"
on public.discipleship_records for update
using (assigned_pastor_id = (select auth.uid()))
with check (assigned_pastor_id = (select auth.uid()));

drop policy if exists "read_stage_log" on public.discipleship_stage_log;
create policy "read_stage_log"
on public.discipleship_stage_log for select
using (
  exists (
    select 1 from public.discipleship_records d
    where d.id = discipleship_stage_log.discipleship_record_id
    and (
      d.church_id = public.current_church_id()
      or d.assigned_pastor_id = (select auth.uid())
    )
  )
);

drop policy if exists "pastors_admins_write_stage_log" on public.discipleship_stage_log;
create policy "pastors_admins_write_stage_log"
on public.discipleship_stage_log for insert
with check (
  exists (
    select 1 from public.discipleship_records d
    where d.id = discipleship_stage_log.discipleship_record_id
    and (
      (d.church_id = public.current_church_id() and public.is_pastor_or_admin())
      or d.assigned_pastor_id = (select auth.uid())
    )
  )
);

create or replace function public.list_platform_churches()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  subscription_status text,
  subscription_tier text,
  pastor_name text,
  pastor_email text,
  pastor_phone text,
  members_count bigint,
  visitors_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if lower(coalesce((select auth.jwt() ->> 'email'), '')) <> 'owner@example.invalid' then
    raise exception 'not allowed';
  end if;

  return query
  select
    c.id,
    c.name,
    c.created_at,
    c.subscription_status::text,
    c.plan,
    p.full_name,
    u.email::text,
    p.phone,
    coalesce((
      select count(*) from public.members m
      where m.church_id = c.id and m.deleted_at is null
    ), 0),
    coalesce((
      select count(*) from public.visitors v
      where v.church_id = c.id and v.deleted_at is null
    ), 0)
  from public.churches c
  left join lateral (
    select pr.full_name, pr.phone, pr.id
    from public.profiles pr
    where pr.church_id = c.id
      and pr.role = 'senior_pastor'
      and pr.deleted_at is null
    order by pr.created_at
    limit 1
  ) p on true
  left join auth.users u on u.id = p.id
  where c.deleted_at is null
  order by c.created_at desc;
end;
$$;

revoke all on function public.list_platform_churches() from public, anon;
grant execute on function public.list_platform_churches() to authenticated;

create or replace function public.can_view_finances()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('senior_pastor', 'assistant_pastor', 'finance_admin');
$$;

create or replace function public.is_leader_of_cell(p_cell_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cell_groups
    where id = p_cell_group_id and leader_profile_id = (select auth.uid())
  );
$$;

drop policy if exists "member_read_own_giving" on public.giving_records;
create policy "member_read_own_giving"
on public.giving_records for select
using (
  member_id in (select id from public.members where profile_id = (select auth.uid()))
);

drop policy if exists "personal_souls_read_own" on public.personal_souls;
create policy "personal_souls_read_own"
on public.personal_souls for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
  and won_by_profile_id = (select auth.uid())
);

drop policy if exists "giving_member_read_own" on public.giving;
create policy "giving_member_read_own"
on public.giving for select
using (
  deleted_at is null
  and church_id = public.current_church_id()
  and created_by = (select auth.uid())
);

drop policy if exists "Anyone can view invitation by token" on public.branch_invitations;
drop policy if exists "Parent church can view their invitations" on public.branch_invitations;
drop policy if exists "System can insert invitations" on public.branch_invitations;
drop policy if exists "Invitee can update status" on public.branch_invitations;

create policy "branch_invitations_read_own_church"
on public.branch_invitations for select
to authenticated
using (
  parent_church_id = public.current_church_id()
  and public.is_pastor_or_admin()
);

create policy "branch_invitations_read_own_email"
on public.branch_invitations for select
to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
);

create policy "invitee_update_branch_invitation"
on public.branch_invitations for update
to authenticated
using (
  lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
)
with check (status in ('accepted', 'revoked'));

drop policy if exists "giving_receipts_insert_own" on storage.objects;
create policy "giving_receipts_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'giving-receipts'
  and (storage.foldername(name))[1] = public.current_church_id()::text
  and (storage.foldername(name))[2] = (select auth.uid())::text
);

drop policy if exists "giving_receipts_select_own_or_finance" on storage.objects;
create policy "giving_receipts_select_own_or_finance"
on storage.objects for select
to authenticated
using (
  bucket_id = 'giving-receipts'
  and (storage.foldername(name))[1] = public.current_church_id()::text
  and (
    (storage.foldername(name))[2] = (select auth.uid())::text
    or public.can_review_giving()
  )
);
