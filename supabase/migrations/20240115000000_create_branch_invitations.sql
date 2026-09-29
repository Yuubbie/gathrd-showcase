create table if not exists public.branch_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token text not null unique,
  parent_church_id uuid not null references public.churches(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  hierarchy_level text not null check (hierarchy_level in ('district', 'zone', 'branch')),
  expires_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null
);

alter table public.branch_invitations enable row level security;

create policy "Anyone can view invitation by token" on public.branch_invitations
for select using (true);

create policy "Parent church can view their invitations" on public.branch_invitations
for select to authenticated
using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
    and p.church_id = branch_invitations.parent_church_id
    and p.role in ('senior_pastor', 'assistant_pastor', 'church_admin')
  )
);

create policy "System can insert invitations" on public.branch_invitations
for insert with check (true);

create policy "Invitee can update status" on public.branch_invitations
for update
using (email = (select email from auth.users where id = auth.uid()))
with check (status in ('accepted', 'revoked'));

create index if not exists idx_branch_invitations_token on public.branch_invitations(token);
create index if not exists idx_branch_invitations_parent_church on public.branch_invitations(parent_church_id);
create index if not exists idx_branch_invitations_email on public.branch_invitations(email);
create index if not exists idx_branch_invitations_status on public.branch_invitations(status);