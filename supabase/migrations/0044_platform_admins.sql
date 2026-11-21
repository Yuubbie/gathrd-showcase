-- Platform administrators, stored in the database instead of an email written into the code.
--
-- Until now, "who is the platform owner" was an email address written in the code and in
-- seven database rules. This moves it into a table of account IDs, checked by one function.
--
-- To add an administrator (run in the Supabase SQL editor, never in the app):
--   insert into public.platform_admins (user_id, note)
--   select id, 'platform owner' from auth.users where email = '<their login email>';
--
-- Two-step login: after an administrator has set up an authenticator app, require it with
--   update public.platform_admins set require_mfa = true where user_id = '<their user id>';
-- From then on, the admin powers only work in a session that passed the second step.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  require_mfa boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

-- Nobody can read or change this list through the app. Only the database owner can.
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.platform_admins a
     where a.user_id = (select auth.uid())
       and (not a.require_mfa or (select auth.jwt() ->> 'aal') = 'aal2')
  );
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Replace the six rules that checked an email. (select ...) makes the check run once per query.
drop policy if exists "Superadmin can view all churches" on public.churches;
drop policy if exists "Superadmin can update all churches" on public.churches;
drop policy if exists "Superadmin can delete churches" on public.churches;
drop policy if exists "Superadmin can view all members" on public.members;
drop policy if exists "Superadmin can view all profiles" on public.profiles;
drop policy if exists "Superadmin can view all visitors" on public.visitors;
drop policy if exists "Platform admin can view all churches" on public.churches;
drop policy if exists "Platform admin can update all churches" on public.churches;
drop policy if exists "Platform admin can delete churches" on public.churches;
drop policy if exists "Platform admin can view all members" on public.members;
drop policy if exists "Platform admin can view all profiles" on public.profiles;
drop policy if exists "Platform admin can view all visitors" on public.visitors;

create policy "Platform admin can view all churches" on public.churches
  for select to authenticated using ((select public.is_platform_admin()));
create policy "Platform admin can update all churches" on public.churches
  for update to authenticated using ((select public.is_platform_admin())) with check ((select public.is_platform_admin()));
create policy "Platform admin can delete churches" on public.churches
  for delete to authenticated using ((select public.is_platform_admin()));
create policy "Platform admin can view all members" on public.members
  for select to authenticated using ((select public.is_platform_admin()));
create policy "Platform admin can view all profiles" on public.profiles
  for select to authenticated using ((select public.is_platform_admin()));
create policy "Platform admin can view all visitors" on public.visitors
  for select to authenticated using ((select public.is_platform_admin()));

-- The platform overview function: same result as before, new check.
create or replace function public.list_platform_churches()
 returns table(id uuid, name text, created_at timestamp with time zone, subscription_status text, subscription_tier text, pastor_name text, pastor_email text, pastor_phone text, members_count bigint, visitors_count bigint)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_platform_admin() then
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
$function$;
