-- Adult/child on the member roster, and let everyone in a church
-- read sent announcements so they appear in the notification bell.

alter table public.members
  add column if not exists age_group text not null default 'adult';

alter table public.members
  drop constraint if exists members_age_group_check;

alter table public.members
  add constraint members_age_group_check check (age_group in ('adult', 'child'));

create or replace function public.self_onboard_member(
  p_slug text,
  p_full_name text,
  p_phone text,
  p_email text,
  p_date_of_birth date,
  p_gender text,
  p_marital_status text,
  p_residential_address text,
  p_state_of_origin text,
  p_lga text,
  p_occupation text,
  p_age_group text default 'adult'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_church_id uuid;
  v_member_id uuid;
  v_age_group text;
begin
  select id into v_church_id
  from public.churches
  where onboarding_slug = p_slug
    and deleted_at is null;

  if v_church_id is null then
    raise exception 'Invalid onboarding link.';
  end if;

  v_age_group := case when p_age_group = 'child' then 'child' else 'adult' end;

  insert into public.members (
    church_id, full_name, phone, email, date_of_birth, gender,
    marital_status, residential_address, state_of_origin, lga,
    occupation, status, source, age_group
  ) values (
    v_church_id, p_full_name, p_phone, p_email, p_date_of_birth, p_gender,
    p_marital_status, p_residential_address, p_state_of_origin, p_lga,
    p_occupation, 'active', 'self_onboarded', v_age_group
  )
  returning id into v_member_id;

  insert into public.audit_logs (church_id, user_id, action, table_name, record_id, new_value)
  values (v_church_id, null, 'insert', 'members', v_member_id,
          jsonb_build_object('source', 'self_onboarded', 'full_name', p_full_name));

  return v_member_id;
end;
$$;

drop function if exists public.self_onboard_member(text, text, text, text, date, text, text, text, text, text, text);

grant execute on function public.self_onboard_member(
  text, text, text, text, date, text, text, text, text, text, text, text
) to anon, authenticated;

drop policy if exists "church_members_read_sent_announcements" on public.announcements;
create policy "church_members_read_sent_announcements"
on public.announcements for select
using (
  church_id = public.current_church_id()
  and sent_at is not null
  and deleted_at is null
);
