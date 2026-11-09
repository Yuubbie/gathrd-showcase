-- Extra notes and custom items on monthly reports.
-- Admins (and pastors) fill these in. Pastors receive them with the Gathrd numbers.

create table if not exists public.monthly_report_additions (
  id uuid primary key default gen_random_uuid(),
  church_id uuid not null references public.churches(id),
  report_year int not null,
  report_month int not null,
  department_id uuid references public.departments(id),
  notes text not null default '',
  extras jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz,
  constraint monthly_report_additions_period check (
    report_month between 1 and 12
    and report_year between 2000 and 2100
  )
);

create trigger trg_monthly_report_additions_audit
before insert or update on public.monthly_report_additions
for each row execute function public.set_audit_fields();

create unique index if not exists idx_monthly_report_additions_church
  on public.monthly_report_additions (church_id, report_year, report_month)
  where department_id is null and deleted_at is null;

create unique index if not exists idx_monthly_report_additions_dept
  on public.monthly_report_additions (church_id, report_year, report_month, department_id)
  where department_id is not null and deleted_at is null;

alter table public.monthly_report_additions enable row level security;

revoke all on public.monthly_report_additions from public, anon, authenticated;

create or replace function public._clean_report_extras(p_extras jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce((
    select jsonb_agg(x.obj order by x.ord)
    from (
      select
        e.ordinality as ord,
        jsonb_build_object(
          'title', left(trim(coalesce(e.value->>'title', '')), 120),
          'body', left(trim(coalesce(e.value->>'body', '')), 2000)
        ) as obj
      from jsonb_array_elements(case when jsonb_typeof(p_extras) = 'array' then p_extras else '[]'::jsonb end)
        with ordinality e
      where trim(coalesce(e.value->>'title', '')) <> ''
         or trim(coalesce(e.value->>'body', '')) <> ''
      limit 20
    ) x
  ), '[]'::jsonb);
$$;

create or replace function public.get_monthly_report_additions(
  p_year int,
  p_month int,
  p_department_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_church uuid;
  v_can_edit boolean := false;
  v_row public.monthly_report_additions%rowtype;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_year is null or p_month is null or p_month < 1 or p_month > 12 or p_year < 2000 or p_year > 2100 then
    return jsonb_build_object('ok', false, 'error', 'bad_period');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_department_id is null then
    if not public.is_pastor_or_admin() then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
    v_can_edit := true;
  else
    if not public.is_pastor_or_admin()
       and not public.is_head_of_department(p_department_id) then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
    v_can_edit := public.is_pastor_or_admin()
      or public.is_head_of_department(p_department_id);
  end if;

  select * into v_row
    from public.monthly_report_additions
   where church_id = v_church
     and report_year = p_year
     and report_month = p_month
     and deleted_at is null
     and department_id is not distinct from p_department_id;

  return jsonb_build_object(
    'ok', true,
    'can_edit', v_can_edit,
    'notes', coalesce(v_row.notes, ''),
    'extras', coalesce(v_row.extras, '[]'::jsonb),
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.save_monthly_report_additions(
  p_year int,
  p_month int,
  p_department_id uuid,
  p_notes text,
  p_extras jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_church uuid;
  v_notes text;
  v_extras jsonb;
  v_id uuid;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;

  if p_year is null or p_month is null or p_month < 1 or p_month > 12 or p_year < 2000 or p_year > 2100 then
    return jsonb_build_object('ok', false, 'error', 'bad_period');
  end if;

  v_church := public.current_church_id();
  if v_church is null then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  if p_department_id is null then
    if not public.is_pastor_or_admin() then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
  else
    if not public.is_pastor_or_admin()
       and not public.is_head_of_department(p_department_id) then
      return jsonb_build_object('ok', false, 'error', 'forbidden');
    end if;
  end if;

  v_notes := left(trim(coalesce(p_notes, '')), 8000);
  v_extras := public._clean_report_extras(p_extras);

  select id into v_id
    from public.monthly_report_additions
   where church_id = v_church
     and report_year = p_year
     and report_month = p_month
     and deleted_at is null
     and department_id is not distinct from p_department_id;

  if v_id is null then
    insert into public.monthly_report_additions (
      church_id, report_year, report_month, department_id, notes, extras
    ) values (
      v_church, p_year, p_month, p_department_id, v_notes, v_extras
    );
  else
    update public.monthly_report_additions
       set notes = v_notes,
           extras = v_extras
     where id = v_id;
  end if;

  return jsonb_build_object('ok', true, 'notes', v_notes, 'extras', v_extras);
end;
$$;

revoke all on function public._clean_report_extras(jsonb) from public, anon;
grant execute on function public._clean_report_extras(jsonb) to authenticated;
revoke all on function public.get_monthly_report_additions(int, int, uuid) from public, anon;
grant execute on function public.get_monthly_report_additions(int, int, uuid) to authenticated;
revoke all on function public.save_monthly_report_additions(int, int, uuid, text, jsonb) from public, anon;
grant execute on function public.save_monthly_report_additions(int, int, uuid, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
