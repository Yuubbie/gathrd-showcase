-- Notification bell: respect announcement targeting and keep read state per user.

-- 1. Who may see a sent announcement.
--    Pastors/admins see all. Everyone else sees "all church" announcements, plus
--    department / cell-group announcements only when they belong to that group.
create or replace function public.can_read_announcement(
  p_target_type public.announcement_target,
  p_department_id uuid,
  p_cell_group_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_pastor_or_admin()
    or coalesce(p_target_type, 'all') = 'all'
    or (
      p_target_type = 'department'
      and exists (
        select 1
          from public.members m
          join public.member_departments md on md.member_id = m.id
         where m.profile_id = (select auth.uid())
           and m.church_id = public.current_church_id()
           and m.deleted_at is null
           and md.department_id = p_department_id
      )
    )
    or (
      p_target_type = 'cell_group'
      and exists (
        select 1
          from public.members m
         where m.profile_id = (select auth.uid())
           and m.church_id = public.current_church_id()
           and m.deleted_at is null
           and m.cell_group_id = p_cell_group_id
      )
    );
$$;

revoke all on function public.can_read_announcement(public.announcement_target, uuid, uuid) from public, anon;
grant execute on function public.can_read_announcement(public.announcement_target, uuid, uuid) to authenticated;

drop policy if exists "church_members_read_sent_announcements" on public.announcements;
create policy "church_members_read_sent_announcements"
on public.announcements for select
using (
  church_id = public.current_church_id()
  and sent_at is not null
  and deleted_at is null
  and public.can_read_announcement(target_type, target_department_id, target_cell_group_id)
);

-- 2. Read state per user (replaces per-browser localStorage).
create table if not exists public.announcement_reads (
  profile_id uuid not null references public.profiles(id),
  announcement_id uuid not null references public.announcements(id),
  read_at timestamptz not null default now(),
  primary key (profile_id, announcement_id)
);

alter table public.announcement_reads enable row level security;

drop policy if exists "own_announcement_reads_select" on public.announcement_reads;
create policy "own_announcement_reads_select"
on public.announcement_reads for select
using (profile_id = (select auth.uid()));

revoke all on public.announcement_reads from public, anon, authenticated;
grant select on public.announcement_reads to authenticated;

-- Marking as read goes through a function so a user can only mark announcements
-- they are actually allowed to see.
create or replace function public.mark_announcements_read(p_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  insert into public.announcement_reads (profile_id, announcement_id)
  select v_uid, a.id
    from public.announcements a
   where a.id = any(coalesce(p_ids, '{}'::uuid[]))
     and a.church_id = public.current_church_id()
     and a.sent_at is not null
     and a.deleted_at is null
     and public.can_read_announcement(a.target_type, a.target_department_id, a.target_cell_group_id)
  on conflict do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_announcements_read(uuid[]) from public, anon;
grant execute on function public.mark_announcements_read(uuid[]) to authenticated;

notify pgrst, 'reload schema';
